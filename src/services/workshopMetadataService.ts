import { db } from '../firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { WorkshopMediaItem, WorkshopGroup } from '../types';

export const WORKSHOP_METADATA_COLLECTION = 'workshop_gallery';
export const WORKSHOP_GROUPS_COLLECTION = 'workshop_groups';

/**
 * Service layer to synchronize workshop media metadata directly to Firestore
 */
export async function syncWorkshopMediaMetadataToFirestore(item: WorkshopMediaItem): Promise<void> {
  try {
    if (!item || !item.id) return;
    const docRef = doc(db, WORKSHOP_METADATA_COLLECTION, item.id);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      id: item.id,
      title: item.title || '',
      caption: item.caption || item.description || '',
      description: item.description || item.caption || '',
      craftTechnique: item.craftTechnique || '',
      aspectRatio: item.aspectRatio || 'square',
      type: item.type || 'image',
      url: item.url || '',
      thumbnailUrl: item.thumbnailUrl || '',
      groupId: item.groupId || 'macrame',
      updatedAt: now,
      createdAt: item.createdAt || now
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to sync workshop media metadata to Firestore:', err);
  }
}

/**
 * Fetch workshop media metadata directly from Firestore
 */
export async function fetchWorkshopMediaMetadataFromFirestore(): Promise<WorkshopMediaItem[]> {
  try {
    const colRef = collection(db, WORKSHOP_METADATA_COLLECTION);
    const snap = await getDocs(colRef);
    const items: WorkshopMediaItem[] = [];
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        const d = docSnap.data() as WorkshopMediaItem;
        items.push({
          ...d,
          id: docSnap.id
        });
      });
    }
    return items;
  } catch (err) {
    console.warn('Failed to fetch workshop media metadata from Firestore, falling back:', err);
    return [];
  }
}

/**
 * Synchronize workshop group metadata (title, description, timestamps) directly to Firestore
 */
export async function syncWorkshopGroupMetadataToFirestore(_group: Omit<WorkshopGroup, 'items'>): Promise<void> {
  // No-op: Workshop group metadata is git-authoritative and repository-driven
  return;
}

/**
 * Fetch workshop group metadata directly from Firestore
 */
export async function fetchWorkshopGroupMetadataFromFirestore(): Promise<Omit<WorkshopGroup, 'items'>[]> {
  // Workshop group metadata is git-authoritative and repository-driven
  return [];
}
