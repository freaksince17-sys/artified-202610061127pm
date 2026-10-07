import { WorkshopMediaItem, WorkshopGroup, WorkshopEventSummary } from '../types';
import { db, storage } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { safeSetDoc, safeDeleteDoc } from '../utils/safeFirestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const BUCKET = firebaseConfig.storageBucket || 'amped-turbine-3mn89.firebasestorage.app';

export const WORKSHOP_EVENTS: WorkshopEventSummary[] = [];

export interface WorkshopFolderAsset {
  id: string;
  name: string;
  type: 'video' | 'image';
  url: string;
  thumbnailUrl: string;
  category: 'macrame' | 'sunflower' | 'pearl';
  title: string;
  duration?: string;
  description: string;
  suggestedCraftTechnique: string;
}

export const WORKSHOP_FOLDER_VIDEOS: WorkshopFolderAsset[] = [];

export const WORKSHOP_FOLDER_PHOTOS: WorkshopFolderAsset[] = [];

export const ALL_WORKSHOP_FOLDER_ASSETS: WorkshopFolderAsset[] = [];

export const DEFAULT_WORKSHOP_MEDIA: WorkshopMediaItem[] = [];

export const WORKSHOP_GROUPS_METADATA: Omit<WorkshopGroup, 'items'>[] = [];

export const BANNED_UNRELATED_MEDIA_PATTERNS = [
  'ws-macrame-vid-fake',
  'instagram_videos',
  'tiktok_videos',
  'artisan_avatar.png',
  'og-image'
];

export function isMediaRelatedToGroup(
  item: { id?: string; url?: string; title?: string; groupId?: string; type?: 'image' | 'video' }, 
  targetGroupKey?: string
): boolean {
  if (!item) return false;
  const url = (item.url || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const id = (item.id || '').toLowerCase();
  const group = targetGroupKey || item.groupId || '';

  // 1. Filter out known demo mock artifacts
  for (const pattern of BANNED_UNRELATED_MEDIA_PATTERNS) {
    if (url.includes(pattern) || id.includes(pattern)) {
      return false;
    }
  }

  // 2. Direct group association
  if (item.groupId && group) {
    const normItem = item.groupId.replace(/^ws-group-/, '');
    const normTarget = group.replace(/^ws-group-/, '');
    if (normItem === normTarget || item.groupId === group || normItem === group || item.groupId === normTarget) {
      return true;
    }
    // Only separate if item belongs to a completely different group
    return false;
  }

  // 3. Sunflower vs Macrame separation if no explicit groupId
  if (group === 'macrame' || group === 'ws-group-macrame') {
    if (url.includes('pipe') && url.includes('sunflower')) {
      return false;
    }
  }

  return true;
}

export function isLegacyFakeMacrameVideo(item: { id?: string; url?: string; type?: 'image' | 'video' }): boolean {
  return !isMediaRelatedToGroup(item, 'macrame');
}

const CUSTOM_GROUPS_STORAGE_KEY = 'artified_custom_workshop_groups_v12';
const CUSTOM_MEDIA_STORAGE_KEY = 'artified_custom_workshop_media_v12';

// Purge any contaminated legacy cache keys on initial import
if (typeof window !== 'undefined') {
  try {
    [
      'artified_custom_workshop_media_v11',
      'artified_custom_workshop_media_v10',
      'artified_custom_workshop_media_v9',
      'artified_custom_workshop_media_v8',
      'artified_custom_workshop_media_v7',
      'artified_custom_workshop_media_v6',
      'artified_custom_workshop_media_v5',
      'artified_custom_workshop_media_v4',
      'artified_custom_workshop_media_v3',
      'artified_custom_workshop_media_v2',
      'artified_custom_workshop_media_v1',
      'artified_custom_workshop_media',
      'artified_custom_workshop_groups_v11',
      'artified_custom_workshop_groups_v10',
      'artified_custom_workshop_groups_v9',
      'artified_custom_workshop_groups_v8',
      'artified_custom_workshop_groups_v7',
      'artified_custom_workshop_groups_v6',
      'artified_custom_workshop_groups_v5',
      'artified_custom_workshop_groups_v4',
      'artified_custom_workshop_groups_v3',
      'artified_custom_workshop_groups_v2',
      'artified_custom_workshop_groups_v1',
      'artified_custom_workshop_groups',
      'artified_deleted_workshop_ids_v11',
      'artified_deleted_workshop_ids_v10',
      'artified_deleted_workshop_ids_v9',
      'artified_deleted_workshop_group_ids_v11',
      'artified_deleted_workshop_group_ids_v10',
      'artified_deleted_workshop_group_ids_v9'
    ].forEach((k) => {
      localStorage.removeItem(k);
    });
  } catch {}
}

export function getCustomWorkshopGroupsFromStorage(): Omit<WorkshopGroup, 'items'>[] {
  try {
    const raw = localStorage.getItem(CUSTOM_GROUPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomWorkshopGroupsToStorage(groups: Omit<WorkshopGroup, 'items'>[]): void {
  try {
    localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.warn(e);
  }
}

export function getCustomWorkshopMediaFromStorage(): WorkshopMediaItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MEDIA_STORAGE_KEY);
    const parsed: WorkshopMediaItem[] = raw ? JSON.parse(raw) : [];
    return parsed.filter((item) => isMediaRelatedToGroup(item, item.groupId));
  } catch {
    return [];
  }
}

export function saveCustomWorkshopMediaToStorage(items: WorkshopMediaItem[]): void {
  try {
    const cleanItems = items.filter((item) => isMediaRelatedToGroup(item, item.groupId));
    localStorage.setItem(CUSTOM_MEDIA_STORAGE_KEY, JSON.stringify(cleanItems));
  } catch (e) {
    console.warn(e);
  }
}

export async function fetchWorkshopGroups(): Promise<Omit<WorkshopGroup, 'items'>[]> {
  const deletedGroupIds = getDeletedWorkshopGroupIds();
  const localCustom = getCustomWorkshopGroupsFromStorage().filter(
    (g) => !deletedGroupIds.includes(g.id) && !deletedGroupIds.includes(g.groupKey)
  );

  const mergedMap = new Map<string, Omit<WorkshopGroup, 'items'>>();

  // 1. Defaults
  const defaultActive = WORKSHOP_GROUPS_METADATA.filter(
    (def) => !deletedGroupIds.includes(def.id) && !deletedGroupIds.includes(def.groupKey)
  );
  defaultActive.forEach((g) => mergedMap.set(g.groupKey, g));

  // 2. Local custom
  localCustom.forEach((g) => mergedMap.set(g.groupKey, g));

  // 2b. Server JSON groups
  try {
    const sRes = await fetch('/api/workshop-groups');
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData && sData.success && Array.isArray(sData.groups)) {
        sData.groups.forEach((g: Omit<WorkshopGroup, 'items'>) => {
          if (!deletedGroupIds.includes(g.id) && !deletedGroupIds.includes(g.groupKey)) {
            mergedMap.set(g.groupKey, g);
          }
        });
      }
    }
  } catch {}

  // 3. Firestore cloud custom
  try {
    const colRef = collection(db, 'workshop_groups');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<WorkshopGroup, 'items'>;
        const id = docSnap.id;
        if (!deletedGroupIds.includes(id) && !deletedGroupIds.includes(d.groupKey)) {
          mergedMap.set(d.groupKey, { ...d, id });
        }
      });
    }
  } catch (err) {
    console.warn('Notice: Firestore workshop_groups fallback to persistent local cache:', err);
  }

  const allGroups = Array.from(mergedMap.values());
  saveCustomWorkshopGroupsToStorage(allGroups.filter((g) => !['macrame', 'wastepipe-sunflower', 'pearl-bag'].includes(g.groupKey)));
  return allGroups;
}

export async function saveWorkshopGroup(group: WorkshopGroup): Promise<void> {
  // Unmark deleted
  try {
    const deleted = getDeletedWorkshopGroupIds().filter((id) => id !== group.id && id !== group.groupKey);
    localStorage.setItem(DELETED_GROUP_IDS_STORAGE_KEY, JSON.stringify(deleted));
  } catch (e) {
    console.warn(e);
  }

  // Save to local storage cache immediately
  const existingLocal = getCustomWorkshopGroupsFromStorage().filter((g) => g.groupKey !== group.groupKey && g.id !== group.id);
  existingLocal.push({
    id: group.id,
    groupKey: group.groupKey,
    title: group.title,
    badge: group.badge,
    date: group.date,
    location: group.location,
    instructor: group.instructor,
    attendeesCount: group.attendeesCount,
    tagline: group.tagline,
    description: group.description,
    keyTechniques: group.keyTechniques,
    whatsappMessage: group.whatsappMessage
  });
  saveCustomWorkshopGroupsToStorage(existingLocal);

  // Save to Firestore
  const docRef = doc(db, 'workshop_groups', group.id);
  const now = new Date().toISOString();
  await safeSetDoc(docRef, {
    id: group.id,
    groupKey: group.groupKey,
    title: group.title,
    badge: group.badge,
    date: group.date,
    location: group.location,
    instructor: group.instructor,
    attendeesCount: group.attendeesCount,
    tagline: group.tagline,
    description: group.description,
    keyTechniques: group.keyTechniques,
    whatsappMessage: group.whatsappMessage,
    updatedAt: now,
    createdAt: now
  }, { merge: true });
}

export const DELETED_GROUP_IDS_STORAGE_KEY = 'artified_deleted_workshop_group_ids_v12';

export const LEGACY_MOCK_GROUP_IDS = [
  'ws-group-macrame',
  'ws-group-sunflower',
  'ws-group-pearl-bag',
  'macrame',
  'wastepipe-sunflower',
  'pearl-bag',
  'new-cohort'
];

export function getDeletedWorkshopGroupIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_GROUP_IDS_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...LEGACY_MOCK_GROUP_IDS, ...saved]));
  } catch {
    return [...LEGACY_MOCK_GROUP_IDS];
  }
}

export function recordDeletedWorkshopGroupId(idOrKey: string): void {
  try {
    const ids = getDeletedWorkshopGroupIds();
    const toAdd = new Set<string>([idOrKey]);

    // Map common aliases so deleting by groupKey or id deletes both
    if (idOrKey === 'macrame' || idOrKey === 'ws-group-macrame') {
      toAdd.add('macrame');
      toAdd.add('ws-group-macrame');
    } else if (idOrKey === 'wastepipe-sunflower' || idOrKey === 'ws-group-sunflower' || idOrKey === 'sunflower') {
      toAdd.add('wastepipe-sunflower');
      toAdd.add('ws-group-sunflower');
      toAdd.add('sunflower');
    } else if (idOrKey === 'pearl-bag' || idOrKey === 'ws-group-pearl' || idOrKey === 'pearl' || idOrKey === 'ws-group-pearl-bag') {
      toAdd.add('pearl-bag');
      toAdd.add('ws-group-pearl');
      toAdd.add('pearl');
      toAdd.add('ws-group-pearl-bag');
    }

    let modified = false;
    toAdd.forEach((val) => {
      if (!ids.includes(val)) {
        ids.push(val);
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem(DELETED_GROUP_IDS_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch (e) {
    console.warn(e);
  }
}

export async function deleteWorkshopGroup(groupId: string, groupKey?: string): Promise<void> {
  const idsToDelete = [groupId];
  if (groupKey && groupKey !== groupId) {
    idsToDelete.push(groupKey);
  }

  // 1. Record in persistent deletion storage
  idsToDelete.forEach((id) => recordDeletedWorkshopGroupId(id));
  const allDeletedGroupIds = getDeletedWorkshopGroupIds();

  // 2. Remove from local storage custom cache
  const localRemaining = getCustomWorkshopGroupsFromStorage().filter(
    (g) => !allDeletedGroupIds.includes(g.id) && !allDeletedGroupIds.includes(g.groupKey)
  );
  saveCustomWorkshopGroupsToStorage(localRemaining);

  // 3. Cascade Delete: Delete ALL media items belonging to this workshop from Firestore & LocalStorage
  try {
    const deletedMediaIds = getDeletedWorkshopMediaIds();
    const currentCustomMedia = getCustomWorkshopMediaFromStorage();
    const mediaToDelete = currentCustomMedia.filter(
      (m) => idsToDelete.includes(m.groupId || '') || m.groupId === groupId || (groupKey && m.groupId === groupKey)
    );

    mediaToDelete.forEach((m) => {
      if (!deletedMediaIds.includes(m.id)) {
        deletedMediaIds.push(m.id);
      }
    });
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(deletedMediaIds));

    // Remove from local custom media storage
    const remainingMedia = currentCustomMedia.filter(
      (m) => !idsToDelete.includes(m.groupId || '') && m.groupId !== groupId && (!groupKey || m.groupId !== groupKey)
    );
    saveCustomWorkshopMediaToStorage(remainingMedia);

    // Delete matching media docs from Firestore workshop_gallery
    try {
      const snap = await getDocs(collection(db, 'workshop_gallery'));
      for (const d of snap.docs) {
        const dData = d.data();
        if (idsToDelete.includes(dData.groupId) || dData.groupId === groupId || (groupKey && dData.groupId === groupKey) || idsToDelete.includes(d.id)) {
          await safeDeleteDoc(doc(db, 'workshop_gallery', d.id));
        }
      }
    } catch (fsMediaErr) {
      console.warn('Firestore workshop_gallery cascade delete notice:', fsMediaErr);
    }
  } catch (e) {
    console.warn('Notice: Error clearing associated group media:', e);
  }

  // 4. Delete workshop_groups Firestore document
  try {
    for (const id of idsToDelete) {
      const docRef = doc(db, 'workshop_groups', id);
      await safeDeleteDoc(docRef);
    }
  } catch (err) {
    console.warn('Notice: Firestore safeDeleteDoc error:', err);
  }
}

export function deduplicateMediaItems(items: WorkshopMediaItem[]): WorkshopMediaItem[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const result: WorkshopMediaItem[] = [];

  for (const item of items) {
    if (!item || !item.id) continue;
    const normUrl = (item.url || item.thumbnailUrl || '').trim().toLowerCase();
    
    // De-duplicate by ID
    if (seenIds.has(item.id)) continue;
    // De-duplicate by URL if not a placeholder
    if (normUrl && !normUrl.includes('artisan_avatar') && !normUrl.includes('placeholder') && seenUrls.has(normUrl)) {
      continue;
    }

    seenIds.add(item.id);
    if (normUrl && !normUrl.includes('artisan_avatar') && !normUrl.includes('placeholder')) {
      seenUrls.add(normUrl);
    }
    result.push(item);
  }
  return result;
}

export function buildWorkshopGroups(
  mediaItems: WorkshopMediaItem[], 
  customGroupMetas?: Omit<WorkshopGroup, 'items'>[]
): WorkshopGroup[] {
  const deletedGroupIds = getDeletedWorkshopGroupIds();
  
  // If customGroupMetas is passed (even if empty []), respect the caller's filtered array.
  // Otherwise, default to WORKSHOP_GROUPS_METADATA excluding deleted groups.
  const activeMetas = customGroupMetas !== undefined 
    ? customGroupMetas.filter((g) => !deletedGroupIds.includes(g.id) && !deletedGroupIds.includes(g.groupKey))
    : WORKSHOP_GROUPS_METADATA.filter((g) => !deletedGroupIds.includes(g.id) && !deletedGroupIds.includes(g.groupKey));

  const cleanMediaItems = deduplicateMediaItems(mediaItems);

  return activeMetas.map((groupMeta) => {
    const groupItems = cleanMediaItems.filter((m) => {
      // 1. Must be genuinely related to this workshop
      if (!isMediaRelatedToGroup(m, groupMeta.groupKey)) {
        return false;
      }

      if (m.groupId) {
        return m.groupId === groupMeta.groupKey || m.groupId === groupMeta.id;
      }
      return false;
    });

    const finalItems = deduplicateMediaItems(groupItems);

    return {
      ...groupMeta,
      items: finalItems
    };
  });
}

const DELETED_IDS_STORAGE_KEY = 'artified_deleted_workshop_ids_v12';

export const LEGACY_MOCK_MEDIA_IDS = [
  'ws-macrame-01',
  'ws-sunflower-01',
  'ws-sunflower-02',
  'pipe-sunflower-video',
  'pipe-sunflower-training',
  'pipe-sunglower-portrait',
  'pipe-sunflower-table'
];

export function getDeletedWorkshopMediaIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...LEGACY_MOCK_MEDIA_IDS, ...saved]));
  } catch {
    return [...LEGACY_MOCK_MEDIA_IDS];
  }
}

export function recordDeletedWorkshopMediaId(id: string): void {
  try {
    const ids = getDeletedWorkshopMediaIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch (e) {
    console.warn('Failed to record deleted workshop ID in localStorage', e);
  }
}

/**
 * Fetch workshop media items from Firestore collection 'workshop_gallery' + persistent local storage.
 */
export async function fetchWorkshopMedia(): Promise<WorkshopMediaItem[]> {
  const deletedIds = getDeletedWorkshopMediaIds();
  const localMedia = getCustomWorkshopMediaFromStorage().filter((m) => !deletedIds.includes(m.id) && isMediaRelatedToGroup(m, m.groupId));

  const mergedMap = new Map<string, WorkshopMediaItem>();

  // 1. Defaults
  DEFAULT_WORKSHOP_MEDIA.filter((item) => !deletedIds.includes(item.id) && isMediaRelatedToGroup(item, item.groupId)).forEach((item) => {
    mergedMap.set(item.id, item);
  });

  // 2. Persistent local storage custom items
  localMedia.forEach((item) => {
    mergedMap.set(item.id, item);
  });

  // 2b. Server JSON items from disk
  try {
    const sRes = await fetch('/api/workshop-media');
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData && sData.success && Array.isArray(sData.items)) {
        sData.items.forEach((item: WorkshopMediaItem) => {
          if (!deletedIds.includes(item.id) && isMediaRelatedToGroup(item, item.groupId)) {
            mergedMap.set(item.id, item);
          }
        });
      }
    }
  } catch {}

  // 3. Firestore cloud items
  try {
    const colRef = collection(db, 'workshop_gallery');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        const d = docSnap.data() as WorkshopMediaItem;
        const itemId = docSnap.id;
        if (!deletedIds.includes(itemId) && isMediaRelatedToGroup({ ...d, id: itemId, type: d.type }, d.groupId) && (d.url || d.thumbnailUrl)) {
          mergedMap.set(itemId, { ...d, id: itemId });
        }
      });
    }
  } catch (err) {
    console.warn('Notice: Firestore workshop_gallery fallback to persistent local cache:', err);
  }

  const allItems = Array.from(mergedMap.values());
  saveCustomWorkshopMediaToStorage(allItems.filter((m) => !m.id.startsWith('ws-macrame') && !m.id.startsWith('ws-sunflower') && !m.id.startsWith('ws-pearl')));
  return allItems;
}

/**
 * Save or update a workshop media item in Firestore and persistent local cache.
 */
export async function saveWorkshopMediaItem(item: WorkshopMediaItem): Promise<void> {
  try {
    const deletedIds = getDeletedWorkshopMediaIds().filter((id) => id !== item.id);
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(deletedIds));
  } catch (e) {
    console.warn(e);
  }

  // Save to persistent local storage immediately
  const existingLocal = getCustomWorkshopMediaFromStorage().filter((m) => m.id !== item.id);
  existingLocal.push(item);
  saveCustomWorkshopMediaToStorage(existingLocal);

  // Save to Firestore with payload size guard
  const docRef = doc(db, 'workshop_gallery', item.id);
  const now = new Date().toISOString();
  
  let firestoreUrl = item.url;
  let firestoreThumb = item.thumbnailUrl;
  if (firestoreUrl && firestoreUrl.startsWith('data:') && firestoreUrl.length > 300000) {
    firestoreUrl = `/workshops/${item.id}.jpg`;
  }
  if (firestoreThumb && firestoreThumb.startsWith('data:') && firestoreThumb.length > 300000) {
    firestoreThumb = firestoreUrl;
  }

  await safeSetDoc(docRef, {
    ...item,
    url: firestoreUrl,
    thumbnailUrl: firestoreThumb,
    updatedAt: now,
    createdAt: item.createdAt || now
  }, { merge: true });
}

/**
 * Delete multiple workshop media items at once from Firestore and persistent local cache.
 */
export async function batchDeleteWorkshopMediaItems(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  
  ids.forEach((id) => recordDeletedWorkshopMediaId(id));

  const localRemaining = getCustomWorkshopMediaFromStorage().filter((m) => !ids.includes(m.id));
  saveCustomWorkshopMediaToStorage(localRemaining);

  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const docRef = doc(db, 'workshop_gallery', id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Batch delete in Firestore fallback:', err);
    // Fallback single delete
    for (const id of ids) {
      const docRef = doc(db, 'workshop_gallery', id);
      await safeDeleteDoc(docRef);
    }
  }
}

/**
 * Delete a workshop media item from Firestore and persistent local cache.
 */
export async function deleteWorkshopMediaItem(id: string): Promise<void> {
  recordDeletedWorkshopMediaId(id);
  const localRemaining = getCustomWorkshopMediaFromStorage().filter((m) => m.id !== id);
  saveCustomWorkshopMediaToStorage(localRemaining);

  const docRef = doc(db, 'workshop_gallery', id);
  await safeDeleteDoc(docRef);
}

/**
 * Upload a media file (photo or video) to Firebase Storage for workshop gallery with fast timeout guard.
 */
export async function uploadWorkshopFileToStorage(
  file: File | Blob | string,
  filename: string,
  contentType: string
): Promise<string> {
  const cleanName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const path = `workshop_gallery/${Date.now()}_${cleanName}`;
  const storageRef = ref(storage, path);

  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(`/workshops/${cleanName}`);
    }, 10000);
  });

  const uploadPromise = (async () => {
    try {
      if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          await uploadString(storageRef, file, 'data_url');
        } else {
          const res = await fetch(file);
          const blob = await res.blob();
          await uploadBytes(storageRef, blob, { contentType });
        }
      } else {
        await uploadBytes(storageRef, file, { contentType });
      }
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.warn('Firebase Storage upload notice, falling back to local public URL:', err);
      return `/workshops/${cleanName}`;
    }
  })();

  return Promise.race([uploadPromise, timeoutPromise]);
}

export interface ServerWorkshopFile {
  filename: string;
  url: string;
  size: number;
  type: 'image' | 'video';
  createdAt?: string;
  modifiedAt?: string;
}

/**
 * Fetch all physical files stored directly in public/workshops/ on server disk
 */
export async function fetchWorkshopFilesFromServer(): Promise<ServerWorkshopFile[]> {
  try {
    const res = await fetch('/api/workshop-files');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.files)) {
        return data.files;
      }
    }
    return [];
  } catch (err) {
    console.warn('Error fetching workshop files from server:', err);
    return [];
  }
}

/**
 * Directly upload photo or video and save into public/workshops/ on server disk
 */
export async function uploadWorkshopFileDirectly(payload: {
  fileBase64: string;
  filename: string;
  type: 'image' | 'video';
  groupId: string;
  title?: string;
  caption?: string;
  craftTechnique?: string;
  thumbnailBase64?: string;
}): Promise<WorkshopMediaItem | null> {
  const cleanName = payload.filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const mediaId = `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let finalUrl = payload.fileBase64;
  let finalThumb = payload.thumbnailBase64 || payload.fileBase64;

  // 1. Try Firebase Storage cloud upload
  if (payload.fileBase64.startsWith('data:')) {
    try {
      const storagePath = `workshop_gallery/${Date.now()}_${cleanName}`;
      const storageRef = ref(storage, storagePath);
      const uploadRes = await uploadString(storageRef, payload.fileBase64, 'data_url');
      const downloadUrl = await getDownloadURL(uploadRes.ref);
      if (downloadUrl) {
        finalUrl = downloadUrl;
        if (!payload.thumbnailBase64) {
          finalThumb = downloadUrl;
        }
      }
    } catch (storageErr) {
      console.warn('Firebase Storage upload notice, using persistent base64 data:', storageErr);
    }
  }

  // 2. Try server disk save in background if API is available (non-blocking)
  try {
    fetch('/api/workshop-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {}

  const newItem: WorkshopMediaItem = {
    id: mediaId,
    groupId: payload.groupId,
    type: payload.type,
    title: payload.title || cleanName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
    workshopTitle: payload.title || 'Artified Workshop',
    url: finalUrl,
    thumbnailUrl: finalThumb,
    caption: payload.caption || `Workshop training highlight in Kathmandu, Nepal.`,
    craftTechnique: payload.craftTechnique || 'Handcrafted Technique',
    location: 'Kathmandu, Nepal',
    date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    instructor: 'Sahina Shrestha',
    tags: ['Kathmandu Workshop', 'Handmade in Nepal'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 3. Save directly to Firestore and persistent local storage
  await saveWorkshopMediaItem(newItem);
  return newItem;
}

/**
 * Delete a workshop media item from server storage, local storage, and optionally disk
 */
export async function deleteWorkshopMediaPermanent(id: string, deletePhysicalFile = true): Promise<void> {
  try {
    await fetch('/api/workshop-media/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, deleteFile: deletePhysicalFile })
    });
  } catch (err) {
    console.warn('Server media delete notice:', err);
  }
  await deleteWorkshopMediaItem(id);
}
