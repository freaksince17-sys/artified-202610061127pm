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

export const WORKSHOP_EVENTS: WorkshopEventSummary[] = [
  {
    id: 'ws-event-batch4',
    title: 'Kathmandu Macrame & Floral Crafting Masterclass',
    batchName: 'Batch 4 (Upcoming Cohort - Open for Enrollment)',
    date: 'Starting Nov 2026',
    location: 'Kathmandu, Nepal',
    description: 'Comprehensive hands-on training on macrame cord knotting, petal shaping, structural rings, and finish sealing led by Sahina Shrestha.',
    technique: 'Macrame Cord Tension & Floral Weaving',
    attendeesCount: 18,
    photosCount: 0,
    videosCount: 0,
    coverImage: '',
    status: 'upcoming'
  },
  {
    id: 'ws-event-batch3',
    title: 'Waste Pipe to Sunflower Making Intensive',
    batchName: 'Batch 3 (Completed Cohort)',
    date: 'Sep 2026',
    location: 'Kathmandu, Nepal',
    description: 'Specialized session on transforming industrial waste pipes into blooming sunflowers with petal binding, seed texturing, and studio craft presentation.',
    technique: 'Upcycled Pipe Ring Sectioning & Petal Binding',
    attendeesCount: 15,
    photosCount: 3,
    videosCount: 1,
    coverImage: '/workshops/pipe sunflower training.jpeg',
    status: 'completed'
  },
  {
    id: 'ws-event-upcoming',
    title: 'Pearl Bag Making Masterclass',
    batchName: 'Batch 5 (Winter Cohort - Open for Enrollment)',
    date: 'Starting Dec 2026',
    location: 'Kathmandu, Nepal',
    description: 'Specialized couture workshop mastering pearl grid cross-weaving, reinforced monofilament tensioning, and sturdy handle construction for bridal and evening bags.',
    technique: 'Pearl Grid Cross-Weaving & Structural Architecture',
    attendeesCount: 12,
    photosCount: 0,
    videosCount: 0,
    coverImage: '',
    status: 'upcoming',
    nextBatchDate: 'December 1, 2026'
  }
];

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

export const WORKSHOP_FOLDER_VIDEOS: WorkshopFolderAsset[] = [
  {
    id: 'pipe-sunflower-video',
    name: 'pipe_sunflower_video.mp4',
    type: 'video',
    url: '/workshops/pipe_sunflower_video.mp4',
    thumbnailUrl: '/workshops/pipe_sunflower_video_thumb.jpg',
    category: 'sunflower',
    title: 'Step-by-Step Waste Pipe to Sunflower Tutorial',
    duration: '0:38',
    description: 'Live tutorial transforming upcycled pipe rings into blooming yellow sunflowers.',
    suggestedCraftTechnique: 'Upcycled Pipe Ring Sectioning & Petal Binding'
  }
];

export const WORKSHOP_FOLDER_PHOTOS: WorkshopFolderAsset[] = [
  {
    id: 'pipe-sunflower-training',
    name: 'pipe sunflower training.jpeg',
    type: 'image',
    url: '/workshops/pipe sunflower training.jpeg',
    thumbnailUrl: '/workshops/pipe sunflower training.jpeg',
    category: 'sunflower',
    title: 'Live Sunflower Training & Mentorship Session',
    description: 'Instructor guiding students on eco-friendly upcycled foundation rings.',
    suggestedCraftTechnique: 'Pipe Ring Core & Bead Wrapping'
  },
  {
    id: 'pipe-sunglower-portrait',
    name: 'pipe sunglower portrait.jpeg',
    type: 'image',
    url: '/workshops/pipe sunglower portrait.jpeg',
    thumbnailUrl: '/workshops/pipe sunglower portrait.jpeg',
    category: 'sunflower',
    title: 'Candidate Holding Completed Blooming Sunflower',
    description: 'Student proudly presenting her handcrafted textured yellow sunflower.',
    suggestedCraftTechnique: 'Petal Layering & Core Binding'
  },
  {
    id: 'pipe-sunflower-table',
    name: 'pipe sunflower table.jpeg',
    type: 'image',
    url: '/workshops/pipe sunflower table.jpeg',
    thumbnailUrl: '/workshops/pipe sunflower table.jpeg',
    category: 'sunflower',
    title: 'Founder and Creator Workshop Worktable with Sunflower Crafts',
    description: 'Studio table display showing completed sunflowers, cord wraps, and student training materials.',
    suggestedCraftTechnique: 'Sunflower Center Texture & Petal Shaping'
  }
];

export const ALL_WORKSHOP_FOLDER_ASSETS: WorkshopFolderAsset[] = [
  ...WORKSHOP_FOLDER_VIDEOS,
  ...WORKSHOP_FOLDER_PHOTOS
];

export const DEFAULT_WORKSHOP_MEDIA: WorkshopMediaItem[] = [];

export const WORKSHOP_GROUPS_METADATA: Omit<WorkshopGroup, 'items'>[] = [
  {
    id: 'ws-group-macrame',
    groupKey: 'macrame',
    title: 'Macrame Handcrafting Masterclass',
    badge: 'Masterclass #01',
    date: 'Starting Nov 2026',
    location: 'Kathmandu, Nepal',
    instructor: 'Sahina Shrestha',
    attendeesCount: 18,
    tagline: 'Macrame Knotting & Fiber Art Cohort',
    description: 'Comprehensive practical training on natural cotton cord tension, spiral knots, wooden ring attachments, and structural plant hangers.',
    keyTechniques: ['Square & Spiral Knots', 'Cord Tensioning', 'Wooden Ring Planters', 'Wrap Knot Tassel Finishes'],
    whatsappMessage: 'Namaste Sahina! I would like to join the Macrame Handcrafting Workshop in Kathmandu.'
  },
  {
    id: 'ws-group-sunflower',
    groupKey: 'wastepipe-sunflower',
    title: 'Waste Pipe to Sunflower Making Workshop',
    badge: 'Masterclass #02',
    date: 'Starting Nov 2026',
    location: 'Kathmandu, Nepal',
    instructor: 'Sahina Shrestha',
    attendeesCount: 15,
    tagline: 'Eco-Upcycling Creative Crafting Cohort',
    description: 'Creative eco-crafting workshop transforming discarded industrial pipes into vibrant blooming sunflowers with fabric wrapping, petal folding, and central seed texturing.',
    keyTechniques: ['Pipe Ring Sectioning', 'Petal Folding & Binding', 'Central Seed Texturing', 'Eco-Bouquet Assembly'],
    whatsappMessage: 'Namaste Sahina! I want to enroll in the Waste Pipe to Sunflower Making Workshop in Kathmandu.'
  },
  {
    id: 'ws-group-pearl-bag',
    groupKey: 'pearl-bag',
    title: 'Pearl Bag Making Masterclass',
    badge: 'Masterclass #03',
    date: 'Starting Dec 2026',
    location: 'Kathmandu, Nepal',
    instructor: 'Sahina Shrestha',
    attendeesCount: 12,
    tagline: 'Bridal Pearl Bag & Monofilament Weaving Cohort',
    description: 'Specialized couture workshop mastering pearl grid cross-weaving, reinforced monofilament tensioning, and sturdy handle construction for bridal and evening bags.',
    keyTechniques: ['Pearl Grid Cross-Weaving', 'Tension Lock Knotting', 'Bridal Bag Architecture', 'Reinforced Handle Wiring'],
    whatsappMessage: 'Namaste Sahina! I want to join the upcoming Pearl Bag Making Workshop in Kathmandu.'
  }
];

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

const CUSTOM_GROUPS_STORAGE_KEY = 'artified_custom_workshop_groups_v7';
const CUSTOM_MEDIA_STORAGE_KEY = 'artified_custom_workshop_media_v7';

// Purge any contaminated legacy cache keys on initial import
if (typeof window !== 'undefined') {
  try {
    [
      'artified_custom_workshop_media_v6',
      'artified_custom_workshop_media_v5',
      'artified_custom_workshop_media_v4',
      'artified_custom_workshop_media_v3',
      'artified_custom_workshop_media_v2',
      'artified_custom_workshop_media_v1',
      'artified_custom_workshop_media',
      'artified_custom_workshop_groups_v6',
      'artified_custom_workshop_groups_v5',
      'artified_custom_workshop_groups_v4',
      'artified_custom_workshop_groups_v3',
      'artified_custom_workshop_groups_v2',
      'artified_custom_workshop_groups_v1',
      'artified_custom_workshop_groups'
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

export const DELETED_GROUP_IDS_STORAGE_KEY = 'artified_deleted_workshop_group_ids';

export function getDeletedWorkshopGroupIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_GROUP_IDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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

  // 3. Mark media items in this group as deleted so they don't persist as orphans
  try {
    const deletedMediaIds = getDeletedWorkshopMediaIds();
    const mediaInGroup = DEFAULT_WORKSHOP_MEDIA.filter(
      (m) => m.groupId === groupId || (groupKey && m.groupId === groupKey)
    );
    mediaInGroup.forEach((m) => {
      if (!deletedMediaIds.includes(m.id)) {
        deletedMediaIds.push(m.id);
      }
    });
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(deletedMediaIds));
  } catch (e) {
    console.warn('Notice: Error clearing associated group media:', e);
  }

  // 4. Delete Firestore document
  try {
    for (const id of idsToDelete) {
      const docRef = doc(db, 'workshop_groups', id);
      await safeDeleteDoc(docRef);
    }
  } catch (err) {
    console.warn('Notice: Firestore safeDeleteDoc error:', err);
  }
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

  return activeMetas.map((groupMeta) => {
    const groupItems = mediaItems.filter((m) => {
      // 1. Must be genuinely related to this masterclass
      if (!isMediaRelatedToGroup(m, groupMeta.groupKey)) {
        return false;
      }

      if (m.groupId) {
        return m.groupId === groupMeta.groupKey || m.groupId === groupMeta.id;
      }
      const titleLower = (m.title + ' ' + (m.craftTechnique || '') + ' ' + (m.workshopTitle || '')).toLowerCase();
      if (groupMeta.groupKey === 'macrame') {
        return titleLower.includes('macrame') || titleLower.includes('knot');
      }
      if (groupMeta.groupKey === 'wastepipe-sunflower') {
        return titleLower.includes('sunflower') || titleLower.includes('pipe') || titleLower.includes('waste');
      }
      if (groupMeta.groupKey === 'pearl-bag') {
        return titleLower.includes('pearl');
      }
      return titleLower.includes(groupMeta.groupKey.toLowerCase()) || titleLower.includes(groupMeta.title.toLowerCase());
    });

    // Fallback to default items if empty and matches group
    const isDefaultGroup = ['macrame', 'wastepipe-sunflower', 'pearl-bag'].includes(groupMeta.groupKey);
    const finalItems = groupItems.length > 0 
      ? groupItems 
      : isDefaultGroup 
      ? DEFAULT_WORKSHOP_MEDIA.filter((m) => m.groupId === groupMeta.groupKey && !deletedGroupIds.includes(m.groupId) && isMediaRelatedToGroup(m, groupMeta.groupKey)) 
      : [];

    return {
      ...groupMeta,
      items: finalItems
    };
  });
}

const DELETED_IDS_STORAGE_KEY = 'artified_deleted_workshop_ids';

export function getDeletedWorkshopMediaIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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

  // Save to Firestore
  const docRef = doc(db, 'workshop_gallery', item.id);
  const now = new Date().toISOString();
  await safeSetDoc(docRef, {
    ...item,
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
  try {
    const res = await fetch('/api/workshop-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.item) {
        await saveWorkshopMediaItem(data.item);
        return data.item;
      }
    }
    throw new Error('Upload failed on server');
  } catch (err) {
    console.error('Error uploading workshop file directly:', err);
    throw err;
  }
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
