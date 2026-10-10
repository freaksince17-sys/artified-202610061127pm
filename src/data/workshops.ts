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
import { uploadFileToFirebaseStorage, batchDeleteFirebaseStorageFiles } from '../services/firebaseWorkshopStorageService';
import firebaseConfig from '../../firebase-applet-config.json';
import SAVED_WORKSHOP_GROUPS from './workshop_groups.json';
import SAVED_WORKSHOP_MEDIA from './workshop_media.json';

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

export const ALL_WORKSHOP_FOLDER_ASSETS: WorkshopFolderAsset[] = [];

export const WORKSHOP_FOLDER_VIDEOS: WorkshopFolderAsset[] = [];

export const WORKSHOP_FOLDER_PHOTOS: WorkshopFolderAsset[] = [];

export const DEFAULT_WORKSHOP_MEDIA: WorkshopMediaItem[] = SAVED_WORKSHOP_MEDIA as WorkshopMediaItem[];

export const WORKSHOP_GROUPS_METADATA: Omit<WorkshopGroup, 'items'>[] = SAVED_WORKSHOP_GROUPS as Omit<WorkshopGroup, 'items'>[];

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
  const id = (item.id || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const target = (targetGroupKey || '').toLowerCase().replace(/^ws-group-/, '').replace(/^ws-/, '');
  const itemGroup = (item.groupId || '').toLowerCase().replace(/^ws-group-/, '').replace(/^ws-/, '');

  // 1. Filter out known banned patterns
  for (const pattern of BANNED_UNRELATED_MEDIA_PATTERNS) {
    if (pattern && (url.includes(pattern) || id.includes(pattern))) {
      return false;
    }
  }

  // If no target group requested, item is valid
  if (!target) return true;

  // 2. Direct group key or ID match
  if (itemGroup && (itemGroup === target || target.includes(itemGroup) || itemGroup.includes(target))) {
    return true;
  }

  // 3. Normalize into canonical family categories: 'macrame', 'sunflower', 'pearl'
  const getFamily = (str: string): string => {
    if (str.includes('macrame')) return 'macrame';
    if (str.includes('sunflower') || str.includes('pipe') || str.includes('pipecleaner') || str.includes('eco')) return 'sunflower';
    if (str.includes('pearl') || str.includes('bag') || str.includes('bead') || str.includes('couture') || str.includes('bridal')) return 'pearl';
    return str;
  };

  const targetFamily = getFamily(target);
  const groupFamily = getFamily(itemGroup);

  if (targetFamily && groupFamily && targetFamily === groupFamily) {
    return true;
  }

  // 4. URL or title checking fallback
  if (targetFamily === 'macrame' && (url.includes('macrame') || title.includes('macrame') || itemGroup.includes('macrame'))) return true;
  if (targetFamily === 'sunflower' && (url.includes('sunflower') || url.includes('pipe') || url.includes('pipecleaner') || title.includes('sunflower') || title.includes('pipe') || title.includes('eco') || itemGroup.includes('sunflower') || itemGroup.includes('pipe'))) return true;
  if (targetFamily === 'pearl' && (url.includes('pearl') || url.includes('bag') || title.includes('pearl') || title.includes('bag') || title.includes('bridal') || title.includes('bead') || itemGroup.includes('pearl') || itemGroup.includes('bag'))) return true;

  // If itemGroup is unspecified or doesn't conflict, accept item
  return !itemGroup;
}

export function isLegacyFakeMacrameVideo(item: { id?: string; url?: string; type?: 'image' | 'video' }): boolean {
  return !isMediaRelatedToGroup(item, 'macrame');
}

const CUSTOM_GROUPS_STORAGE_KEY = 'artified_custom_workshop_groups_v30';
const CUSTOM_MEDIA_STORAGE_KEY = 'artified_custom_workshop_media_v30';

// Purge any contaminated legacy cache keys on initial import
if (typeof window !== 'undefined') {
  try {
    [
      'artified_custom_workshop_media_v29',
      'artified_custom_workshop_groups_v29',
      'artified_custom_workshop_media_v28',
      'artified_custom_workshop_groups_v28',
      'artified_custom_workshop_media_v27',
      'artified_custom_workshop_groups_v27',
      'artified_custom_workshop_media_v26',
      'artified_custom_workshop_groups_v26',
      'artified_custom_workshop_media_v25',
      'artified_custom_workshop_groups_v25',
      'artified_custom_workshop_media_v24',
      'artified_custom_workshop_groups_v24',
      'artified_custom_workshop_media_v23',
      'artified_custom_workshop_groups_v23',
      'artified_custom_workshop_media_v22',
      'artified_custom_workshop_groups_v22',
      'artified_custom_workshop_media_v21',
      'artified_custom_workshop_groups_v21',
      'artified_custom_workshop_media_v20',
      'artified_custom_workshop_groups_v20',
      'artified_custom_workshop_media_v19',
      'artified_custom_workshop_groups_v19',
      'artified_custom_workshop_media_v18',
      'artified_custom_workshop_groups_v18',
      'artified_custom_workshop_media_v17',
      'artified_custom_workshop_groups_v17',
      'artified_custom_workshop_media_v16',
      'artified_custom_workshop_groups_v16',
      'artified_custom_workshop_media_v15',
      'artified_custom_workshop_groups_v15',
      'artified_custom_workshop_media_v14',
      'artified_custom_workshop_media_v13',
      'artified_custom_workshop_media_v12',
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
      'artified_custom_workshop_groups_v13',
      'artified_custom_workshop_groups_v12',
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
      'artified_deleted_workshop_ids_v12',
      'artified_deleted_workshop_ids_v11',
      'artified_deleted_workshop_ids_v10',
      'artified_deleted_workshop_ids_v9',
      'artified_deleted_workshop_group_ids_v12',
      'artified_deleted_workshop_group_ids_v11',
      'artified_deleted_workshop_group_ids_v10',
      'artified_deleted_workshop_group_ids_v9'
    ].forEach((k) => {
      localStorage.removeItem(k);
    });

    // Clean up outdated storage keys without wiping current v30 active storage
    const keys = Object.keys(localStorage);
    keys.forEach((k) => {
      if (k.startsWith('artified_custom_workshop_media_v') && k !== CUSTOM_MEDIA_STORAGE_KEY) {
        localStorage.removeItem(k);
      }
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
    const deletedIds = getDeletedWorkshopMediaIds();
    return parsed.filter((item) => {
      if (!item || !item.id) return false;
      if (deletedIds.includes(item.id)) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export function saveCustomWorkshopMediaToStorage(items: WorkshopMediaItem[]): void {
  try {
    const deletedIds = getDeletedWorkshopMediaIds();
    const defaultIds = new Set(DEFAULT_WORKSHOP_MEDIA.map((d) => d.id));
    const cleanCustomItems = items.filter((item) => {
      if (!item || !item.id) return false;
      if (deletedIds.includes(item.id)) return false;
      if (defaultIds.has(item.id)) return false;
      return true;
    });
    localStorage.setItem(CUSTOM_MEDIA_STORAGE_KEY, JSON.stringify(cleanCustomItems));
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

export const LEGACY_MOCK_GROUP_IDS: string[] = [];

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

export function getCanonicalMediaKey(item: WorkshopMediaItem): string {
  if (!item) return '';
  const rawUrl = (item.url || item.thumbnailUrl || '').trim().toLowerCase();
  
  if (rawUrl) {
    // Extract base filename without query string or encoding
    const decoded = decodeURIComponent(rawUrl.split('?')[0]);
    let baseName = decoded.split('/').pop() || decoded;
    
    // Strip generated random prefixes if they contain a known asset name
    baseName = baseName.replace(/^[a-z0-9_]+_(macrame_[a-z0-9_]+)/i, '$1');

    // Normalize separators and extensions
    const cleanBase = baseName.replace(/[^a-z0-9_.-]/g, '_').toLowerCase();
    if (cleanBase && !cleanBase.includes('placeholder') && !cleanBase.includes('avatar')) {
      return cleanBase;
    }
  }

  if (item.title && item.title.trim().length > 3) {
    return item.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  return item.id || '';
}

export function deduplicateMediaItems(items: WorkshopMediaItem[]): WorkshopMediaItem[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: WorkshopMediaItem[] = [];

  for (const item of items) {
    if (!item || !item.id) continue;
    if (seenIds.has(item.id)) continue;

    const key = getCanonicalMediaKey(item);
    if (key && !key.includes('placeholder') && !key.includes('avatar') && seenKeys.has(key)) {
      continue;
    }

    seenIds.add(item.id);
    if (key) seenKeys.add(key);
    result.push(item);
  }
  return result;
}

export function sanitizeWorkshopMediaItem(item: WorkshopMediaItem): WorkshopMediaItem {
  if (!item) return item;
  const copy = { ...item };

  const url = (copy.url || '').toLowerCase();
  const thumb = (copy.thumbnailUrl || '').toLowerCase();

  // Accurately determine media type based on format and metadata
  const isVideoExt = 
    copy.type === 'video' ||
    /\.(mp4|mov|webm|m4v)$/i.test(url) || 
    url.startsWith('data:video/') ||
    url.includes('video%2fmp4') ||
    url.includes('.mp4?');

  if (isVideoExt) {
    copy.type = 'video';
    // If thumbnail has legacy _mp4_thumb.jpeg, normalize to _thumb.jpg
    if (copy.thumbnailUrl && copy.thumbnailUrl.includes('_mp4_thumb.jpeg')) {
      copy.thumbnailUrl = copy.thumbnailUrl.replace(/_mp4_thumb\.jpeg$/i, '_thumb.jpg');
    }
    // If thumbnail is missing, points to the video itself, or has a video extension, generate clean thumbnail
    if (!copy.thumbnailUrl || copy.thumbnailUrl === copy.url || /\.(mp4|mov|webm|m4v)$/i.test(copy.thumbnailUrl)) {
      if (copy.url && copy.url.endsWith('.mp4')) {
        copy.thumbnailUrl = copy.url.replace(/\.mp4$/i, '_thumb.jpg');
      } else {
        copy.thumbnailUrl = copy.url || '';
      }
    }
  } else {
    copy.type = 'image';
    if (!copy.thumbnailUrl) {
      copy.thumbnailUrl = copy.url;
    }
  }

  return copy;
}

export function buildWorkshopGroups(
  mediaItems: WorkshopMediaItem[], 
  customGroupMetas?: Omit<WorkshopGroup, 'items'>[]
): WorkshopGroup[] {
  const deletedGroupIds = getDeletedWorkshopGroupIds();
  
  // If customGroupMetas is passed and non-empty, respect it; otherwise fallback to WORKSHOP_GROUPS_METADATA
  const rawMetas = (customGroupMetas && customGroupMetas.length > 0)
    ? customGroupMetas
    : WORKSHOP_GROUPS_METADATA;

  const activeMetas = rawMetas.filter(
    (g) => !deletedGroupIds.includes(g.id) && !deletedGroupIds.includes(g.groupKey)
  );

  const cleanMediaItems = deduplicateMediaItems(mediaItems)
    .map(sanitizeWorkshopMediaItem)
    .filter((m) => {
      const t = (m.title || '').toLowerCase();
      const u = (m.url || '').toLowerCase();
      return !t.includes('test photo') && !u.includes('test_photo') && !u.endsWith('/test.jpg');
    });

  return activeMetas.map((groupMeta) => {
    const groupItems = cleanMediaItems.filter((m) => {
      return isMediaRelatedToGroup(m, groupMeta.groupKey) || isMediaRelatedToGroup(m, groupMeta.id);
    });

    const finalItems = deduplicateMediaItems(groupItems);

    return {
      ...groupMeta,
      items: finalItems
    };
  });
}

const DELETED_IDS_STORAGE_KEY = 'artified_deleted_workshop_ids_v12';

export const LEGACY_MOCK_MEDIA_IDS: string[] = [];

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
    const key = getCanonicalMediaKey(item) || item.id;
    mergedMap.set(key, item);
  });

  // 2. Persistent local storage custom items
  localMedia.forEach((item) => {
    const key = getCanonicalMediaKey(item) || item.id;
    mergedMap.set(key, item);
  });

  // 2b. Server JSON items from disk
  try {
    const sRes = await fetch('/api/workshop-media');
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData && sData.success && Array.isArray(sData.items)) {
        sData.items.forEach((item: WorkshopMediaItem) => {
          if (!deletedIds.includes(item.id) && isMediaRelatedToGroup(item, item.groupId)) {
            const key = getCanonicalMediaKey(item) || item.id;
            mergedMap.set(key, item);
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
      const batch = writeBatch(db);
      let purgeCount = 0;
      snap.forEach((docSnap) => {
        const d = docSnap.data() as WorkshopMediaItem;
        const itemId = docSnap.id;
        
        if (deletedIds.includes(itemId)) {
          batch.delete(docSnap.ref);
          purgeCount++;
          return;
        }

        // Only purge corrupted legacy mock files that were explicitly marked obsolete
        const text = `${itemId} ${d.url || ''}`.toLowerCase();
        const isLegacyBanned = BANNED_UNRELATED_MEDIA_PATTERNS.some(p => text.includes(p));

        if (isLegacyBanned) {
          batch.delete(docSnap.ref);
          purgeCount++;
        } else if (d.url || d.thumbnailUrl) {
          const full = { ...d, id: itemId };
          const key = getCanonicalMediaKey(full) || itemId;
          mergedMap.set(key, full);
        }
      });
      if (purgeCount > 0) {
        batch.commit().catch(() => {});
        console.info(`🧹 Permanently purged ${purgeCount} deleted/banned items from Firestore workshop_gallery.`);
      }
    }
  } catch (err) {
    console.warn('Notice: Firestore workshop_gallery fallback to persistent local cache:', err);
  }

  const allItems = Array.from(mergedMap.values())
    .map(sanitizeWorkshopMediaItem)
    .filter(item => !deletedIds.includes(item.id));
  
  saveCustomWorkshopMediaToStorage(allItems);

  // Sync custom items to server disk
  try {
    fetch('/api/workshop-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allItems)
    }).catch(() => {});
  } catch {}

  return allItems;
}

/**
 * Save or update a workshop media item in Firestore, server disk, and persistent local cache.
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

  // Sync updated custom media list to server disk
  try {
    const currentCustom = getCustomWorkshopMediaFromStorage();
    fetch('/api/workshop-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentCustom)
    }).catch(() => {});
  } catch {}

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

  const allItems = [...getCustomWorkshopMediaFromStorage(), ...DEFAULT_WORKSHOP_MEDIA];
  const targets = allItems.filter((m) => ids.includes(m.id));
  const storageUrlsToPurge: string[] = [];
  targets.forEach((t) => {
    if (t.url) storageUrlsToPurge.push(t.url);
    if (t.thumbnailUrl) storageUrlsToPurge.push(t.thumbnailUrl);
  });

  // Explicitly purge cloud storage objects immediately
  if (storageUrlsToPurge.length > 0) {
    batchDeleteFirebaseStorageFiles(storageUrlsToPurge).catch((err) => console.warn('Storage batch purge notice:', err));
  }

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
 * Delete a workshop media item from Firestore, persistent local cache, and Firebase Storage cloud immediately.
 */
export async function deleteWorkshopMediaItem(id: string): Promise<void> {
  recordDeletedWorkshopMediaId(id);
  const allItems = [...getCustomWorkshopMediaFromStorage(), ...DEFAULT_WORKSHOP_MEDIA];
  const target = allItems.find((m) => m.id === id);

  // Explicitly trigger Firebase Storage purge
  if (target) {
    const urls = [target.url, target.thumbnailUrl].filter(Boolean) as string[];
    batchDeleteFirebaseStorageFiles(urls).catch((err) => console.warn('Storage purge notice:', err));
  }

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
  
  if (typeof file !== 'string') {
    try {
      const url = await uploadFileToFirebaseStorage(file, cleanName, contentType);
      if (url) return url;
    } catch (err) {
      console.warn('Direct Firebase Storage upload notice, falling back:', err);
    }
  }

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
  category?: string;
  folder?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  modifiedAt?: string;
}

/**
 * Fetch all available subdirectories inside public/workshops/
 */
export async function fetchWorkshopFoldersFromServer(): Promise<string[]> {
  try {
    const res = await fetch('/api/workshop-folders');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.folders)) {
        return data.folders;
      }
    }
    return ['Macrame', 'Pearls', 'Pipecleaner Sunflower'];
  } catch {
    return ['Macrame', 'Pearls', 'Pipecleaner Sunflower'];
  }
}

/**
 * Create a new folder on server inside public/workshops/
 */
export async function createWorkshopFolderOnServer(folderName: string): Promise<string | null> {
  try {
    const res = await fetch('/api/workshop-create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) return data.folderName;
    }
    return null;
  } catch {
    return null;
  }
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
 * Delete a physical file from public/workshops/ on server disk
 */
export async function deleteWorkshopFileFromServer(filePath: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/workshop-file?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
    return false;
  } catch (err) {
    console.warn('Error deleting workshop file from server:', err);
    return false;
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

  // 2. Try server disk save directly (priority for clean code folder persistence)
  try {
    const sRes = await fetch('/api/workshop-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData && sData.success && sData.url) {
        finalUrl = sData.url;
        finalThumb = sData.thumbnailUrl || sData.url;
      }
    }
  } catch (err) {
    console.warn('Server disk save notice:', err);
  }

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
