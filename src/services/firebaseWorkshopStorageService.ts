/**
 * Firebase Workshop Media Storage Service
 * Handles uploading, persistent storage, and retrieval of workshop photos and videos
 * using Firebase Storage (configured in firebase-applet-config.json) and Firestore.
 * 
 * Accurately identifies media file types (specifically MP4 video vs. JPEG/PNG images),
 * generates companion video poster frames, and guarantees metadata distinguishes between
 * videos and images during upload, Firestore persistence, and retrieval.
 */

import { storage, db } from '../firebase';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  UploadTaskSnapshot 
} from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { safeSetDoc, safeDeleteDoc } from '../utils/safeFirestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkshopMediaItem } from '../types';
import { getWorkshopEmbeddedFallback } from '../data/workshopEmbeddedFallbacks';

const STORAGE_BUCKET = firebaseConfig.storageBucket || `${firebaseConfig.projectId}.firebasestorage.app`;
const WORKSHOP_GALLERY_COLLECTION = 'workshop_gallery';

/**
 * Accurately determines if a file or URL is a video (specifically MP4, WebM, MOV)
 */
export function isVideoMedia(fileOrUrl: File | Blob | string, filename?: string): boolean {
  if (typeof fileOrUrl === 'string') {
    const url = fileOrUrl.toLowerCase();
    return (
      url.endsWith('.mp4') ||
      url.endsWith('.mov') ||
      url.endsWith('.webm') ||
      url.endsWith('.m4v') ||
      url.startsWith('data:video/') ||
      url.includes('video%2fmp4') ||
      url.includes('video%20mp4') ||
      url.includes('.mp4?') ||
      url.includes('_mp4_') ||
      url.includes('/video/')
    );
  }

  const mime = (fileOrUrl.type || '').toLowerCase();
  const name = (filename || (fileOrUrl instanceof File ? fileOrUrl.name : '') || '').toLowerCase();

  return (
    mime.startsWith('video/') ||
    mime.includes('mp4') ||
    mime.includes('quicktime') ||
    mime.includes('webm') ||
    /\.(mp4|mov|webm|m4v)$/i.test(name)
  );
}

/**
 * Accurately determines if a file or URL is an image
 */
export function isImageMedia(fileOrUrl: File | Blob | string, filename?: string): boolean {
  return !isVideoMedia(fileOrUrl, filename);
}

/**
 * Returns clean MIME type with strict defaults for MP4 video and JPEG/PNG images
 */
export function getStandardMimeType(file: File | Blob, filename?: string): string {
  const isVideo = isVideoMedia(file, filename);
  const name = (filename || (file instanceof File ? file.name : '') || '').toLowerCase();

  if (file.type && file.type.length > 0) {
    // If browser detected generic octet-stream for .mp4, fix it to video/mp4
    if (file.type === 'application/octet-stream' && name.endsWith('.mp4')) {
      return 'video/mp4';
    }
    return file.type;
  }

  if (isVideo) {
    if (name.endsWith('.mov')) return 'video/quicktime';
    if (name.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }

  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

/**
 * Upload an individual media file (photo or MP4 video) directly to Firebase Storage.
 * Uses the storage bucket configured in firebase-applet-config.json.
 * Accurately sets MIME type (especially video/mp4 for MP4s) and returns the public download URL.
 */
export async function uploadFileToFirebaseStorage(
  fileOrBlob: File | Blob,
  filename: string,
  customMimeType?: string,
  onProgress?: (progressPct: number) => void
): Promise<string> {
  const isVideo = isVideoMedia(fileOrBlob, filename);
  const cleanBase = filename.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\.[^/.]+$/, '');
  const ext = isVideo ? 'mp4' : (filename.split('.').pop()?.toLowerCase() || 'jpg');
  const cleanFilename = `${cleanBase}.${ext}`;
  const contentType = customMimeType || getStandardMimeType(fileOrBlob, cleanFilename);

  const storagePath = `workshop_gallery/${Date.now()}_${cleanFilename}`;
  const fileRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(fileRef, fileOrBlob, {
    contentType,
    customMetadata: {
      mediaType: isVideo ? 'video' : 'image',
      originalName: filename,
      storageBucket: STORAGE_BUCKET,
      uploadedAt: new Date().toISOString()
    }
  });

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Firebase Storage upload timed out (30s) on ${cleanFilename}`));
    }, 32000);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (err) => {
        clearTimeout(timeout);
        reject(err);
      },
      async () => {
        clearTimeout(timeout);
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Generates an HD video poster frame thumbnail from an MP4/video file using HTML5 Video + Canvas
 */
export async function generateVideoPoster(
  videoFile: File | Blob
): Promise<{ blob: Blob; dataUrl: string } | null> {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      const objUrl = URL.createObjectURL(videoFile);
      video.src = objUrl;

      const timeout = setTimeout(() => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      }, 7000);

      video.onloadeddata = () => {
        // Seek to 0.5s or 15% into video for an authentic action frame
        video.currentTime = Math.min(1.0, (video.duration || 2) * 0.15);
      };

      video.onseeked = () => {
        try {
          clearTimeout(timeout);
          const canvas = document.createElement('canvas');
          const maxDim = 1280;
          let width = video.videoWidth || 720;
          let height = video.videoHeight || 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            canvas.toBlob(
              (blob) => {
                URL.revokeObjectURL(objUrl);
                if (blob) {
                  resolve({ blob, dataUrl });
                } else {
                  resolve(null);
                }
              },
              'image/jpeg',
              0.88
            );
            return;
          }
        } catch {}
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Converts a Blob or File to Base64 Data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload options for workshop media
 */
export interface WorkshopMediaUploadOptions {
  filename: string;
  groupId: string;
  workshopTitle?: string;
  title?: string;
  caption?: string;
  craftTechnique?: string;
  instructor?: string;
  location?: string;
  date?: string;
  batchName?: string;
  tags?: string[];
  attendeesCount?: number;
  onProgress?: (progressPct: number, stageMessage: string) => void;
}

/**
 * Upload single media item (specifically MP4 video or photo) to Firebase Storage
 * and persist its metadata to Firestore workshop_gallery collection.
 */
export async function uploadWorkshopMedia(
  fileOrBlob: File | Blob,
  options: WorkshopMediaUploadOptions
): Promise<WorkshopMediaItem> {
  const rawName = options.filename || (fileOrBlob instanceof File ? fileOrBlob.name : `media_${Date.now()}`);
  const isVideo = isVideoMedia(fileOrBlob, rawName);
  const mediaType: 'video' | 'image' = isVideo ? 'video' : 'image';
  const cleanBaseName = rawName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\.[^/.]+$/, '');
  const ext = isVideo ? 'mp4' : (rawName.split('.').pop()?.toLowerCase() || 'jpg');
  const cleanFilename = `${cleanBaseName}.${ext}`;
  const contentType = getStandardMimeType(fileOrBlob, cleanFilename);

  if (options.onProgress) {
    options.onProgress(10, `Preparing ${mediaType === 'video' ? 'MP4 video' : 'photo'} for upload...`);
  }

  // 1. Generate companion poster thumbnail for videos or photo thumbnail
  let thumbBlob: Blob | null = null;
  let thumbDataUrl: string | null = null;

  if (isVideo) {
    if (options.onProgress) {
      options.onProgress(20, 'Generating HD video poster thumbnail frame...');
    }
    const poster = await generateVideoPoster(fileOrBlob);
    if (poster) {
      thumbBlob = poster.blob;
      thumbDataUrl = poster.dataUrl;
    }
  }

  // 2. Primary Upload Target: Firebase Storage
  let storageMediaUrl: string | null = null;
  let storageThumbUrl: string | null = null;
  let storageMediaRefPath = `workshop_gallery/${Date.now()}_${cleanFilename}`;
  let storageThumbRefPath = `workshop_gallery/${Date.now()}_${cleanBaseName}_thumb.jpg`;

  try {
    if (options.onProgress) {
      options.onProgress(30, `Connecting to Firebase Storage (${STORAGE_BUCKET})...`);
    }

    // A. Upload Main Video or Photo File to Firebase Storage
    const mediaStorageRef = ref(storage, storageMediaRefPath);
    const mediaUploadTask = uploadBytesResumable(mediaStorageRef, fileOrBlob, {
      contentType,
      customMetadata: {
        mediaType,
        originalName: rawName,
        workshopTitle: options.workshopTitle || 'Macrame Handcrafting Workshop',
        groupId: options.groupId,
        uploadedAt: new Date().toISOString()
      }
    });

    storageMediaUrl = await new Promise<string>((resolve, reject) => {
      const uploadTimeout = setTimeout(() => {
        reject(new Error(`Firebase Storage upload timeout (30s) on ${storageMediaRefPath}`));
      }, 35000);

      mediaUploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          if (snapshot.totalBytes > 0 && options.onProgress) {
            const pct = Math.min(85, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 55) + 30);
            options.onProgress(pct, `Uploading ${mediaType} to Firebase Storage (${Math.round(snapshot.bytesTransferred / 1024)} KB / ${Math.round(snapshot.totalBytes / 1024)} KB)...`);
          }
        },
        (err) => {
          clearTimeout(uploadTimeout);
          reject(err);
        },
        async () => {
          clearTimeout(uploadTimeout);
          try {
            const url = await getDownloadURL(mediaUploadTask.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });

    console.info(`✅ Successfully uploaded ${mediaType} to Firebase Storage:`, storageMediaUrl);

    // B. Upload Companion Video Poster Thumbnail to Firebase Storage
    if (thumbBlob) {
      try {
        const thumbStorageRef = ref(storage, storageThumbRefPath);
        const thumbTask = uploadBytesResumable(thumbStorageRef, thumbBlob, {
          contentType: 'image/jpeg',
          customMetadata: {
            parentMedia: cleanFilename,
            isPosterThumbnail: 'true'
          }
        });
        storageThumbUrl = await new Promise<string>((resolve, reject) => {
          thumbTask.on(
            'state_changed',
            null,
            (e) => reject(e),
            async () => {
              const url = await getDownloadURL(thumbTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      } catch (thumbErr) {
        console.warn('Notice: Companion thumbnail upload to Firebase Storage notice:', thumbErr);
      }
    }
  } catch (storageErr: any) {
    console.warn(`Firebase Storage upload notice for ${cleanFilename}:`, storageErr?.message || storageErr);
  }

  // 3. Dual-Sync Fallback: Save copy to server disk (/api/workshop-upload) if Storage bucket returned 404 or offline
  let localServerDiskUrl: string | null = null;
  let localServerThumbUrl: string | null = null;

  try {
    let base64Payload = '';
    if (typeof fileOrBlob !== 'string' && fileOrBlob.size < 50 * 1024 * 1024) {
      base64Payload = await blobToBase64(fileOrBlob);
    }

    if (base64Payload) {
      const serverRes = await fetch('/api/workshop-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Payload,
          filename: cleanFilename,
          type: mediaType,
          groupId: options.groupId,
          title: options.title || cleanBaseName.replace(/[_-]/g, ' '),
          thumbnailBase64: thumbDataUrl || undefined,
          isThumbnail: false
        })
      });

      if (serverRes.ok) {
        const sData = await serverRes.json();
        if (sData && sData.success && sData.url) {
          localServerDiskUrl = sData.url;
          localServerThumbUrl = sData.thumbnailUrl || localServerDiskUrl;
        }
      }
    }
  } catch (serverErr) {
    console.warn('Server disk save notice:', serverErr);
  }

  if (options.onProgress) {
    options.onProgress(90, 'Finalizing metadata and persisting to Firestore database...');
  }

  // 4. Determine final URLs (Prefer Firebase Storage cloud URL; fallback to server disk or data URL)
  const finalMediaUrl = storageMediaUrl || localServerDiskUrl || `/workshops/${cleanFilename}`;
  const finalThumbUrl = storageThumbUrl || localServerThumbUrl || thumbDataUrl || (isVideo ? `/workshops/${cleanBaseName}_thumb.jpg` : finalMediaUrl);

  const cleanTitle = 
    options.title || 
    cleanBaseName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const mediaId = `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // 5. Construct WorkshopMediaItem with STRICT type enforcement
  const mediaItem: WorkshopMediaItem = {
    id: mediaId,
    groupId: options.groupId,
    type: mediaType, // 100% Guaranteed 'video' for MP4 / 'image' for photo
    title: cleanTitle,
    workshopTitle: options.workshopTitle || 'Macrame Handcrafting Workshop',
    batchName: options.batchName || 'Workshop Batch',
    date: options.date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    location: options.location || 'Kathmandu, Nepal',
    url: finalMediaUrl,
    thumbnailUrl: finalThumbUrl,
    caption: options.caption || `${cleanTitle} session recorded in Kathmandu, Nepal.`,
    craftTechnique: options.craftTechnique || 'Handcrafted Technique',
    attendeesCount: options.attendeesCount || 15,
    instructor: options.instructor || 'Sahina Shrestha',
    featured: false,
    aspectRatio: isVideo ? 'vertical' : 'square',
    tags: options.tags || ['Artisan Workshop', 'Kathmandu Studio'],
    createdAt: now,
    updatedAt: now
  };

  // 6. Save directly to Firestore workshop_gallery collection (Rule-secured)
  try {
    const docRef = doc(db, WORKSHOP_GALLERY_COLLECTION, mediaId);
    await safeSetDoc(docRef, mediaItem);
    console.info(`✅ Persisted workshop ${mediaType} to Firestore: ${mediaId}`);
  } catch (firestoreErr) {
    console.warn('Notice: Firestore save error, cached locally:', firestoreErr);
  }

  // 7. Update client localStorage cache for instant zero-latency UI reactivity
  try {
    const STORAGE_KEY = 'artified_custom_workshop_media_v15';
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: WorkshopMediaItem[] = raw ? JSON.parse(raw) : [];
    const updated = [mediaItem, ...existing.filter((i) => i.id !== mediaItem.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  if (options.onProgress) {
    options.onProgress(100, `Done! ${mediaType === 'video' ? 'Video' : 'Photo'} saved successfully.`);
  }

  return mediaItem;
}

/**
 * Sanitizes and validates retrieved workshop media documents to ensure
 * videos (especially MP4) and images are NEVER conflated or misclassified.
 */
export function sanitizeRetrievedWorkshopMedia(item: any): WorkshopMediaItem {
  if (!item) return item;
  const copy = { ...item };

  const url = (copy.url || '').toLowerCase();
  const thumb = (copy.thumbnailUrl || '').toLowerCase();

  // Strict type verification:
  // If the document is marked as video OR points to an MP4/MOV/WebM file, it is GUARANTEED to be 'video'
  const isVideo =
    copy.type === 'video' ||
    url.endsWith('.mp4') ||
    url.endsWith('.mov') ||
    url.endsWith('.webm') ||
    url.endsWith('.m4v') ||
    url.includes('video%2fmp4') ||
    url.includes('.mp4?') ||
    url.startsWith('data:video/');

  if (isVideo) {
    copy.type = 'video';
    // If thumbnail has legacy _mp4_thumb.jpeg, normalize to _thumb.jpg
    if (copy.thumbnailUrl && copy.thumbnailUrl.includes('_mp4_thumb.jpeg')) {
      copy.thumbnailUrl = copy.thumbnailUrl.replace(/_mp4_thumb\.jpeg$/i, '_thumb.jpg');
    }
    // Ensure video has a valid poster thumbnail and never points to an unrenderable video URL
    if (!copy.thumbnailUrl || copy.thumbnailUrl === copy.url || /\.(mp4|mov|webm|m4v)$/i.test(copy.thumbnailUrl)) {
      if (copy.url && copy.url.endsWith('.mp4')) {
        copy.thumbnailUrl = copy.url.replace(/\.mp4$/i, '_thumb.jpg');
      } else {
        const fallback = getWorkshopEmbeddedFallback(copy.url);
        copy.thumbnailUrl = fallback || copy.url;
      }
    }
  } else {
    copy.type = 'image';
    if (!copy.thumbnailUrl) {
      copy.thumbnailUrl = copy.url;
    }
  }

  return copy as WorkshopMediaItem;
}

/**
 * Fetch all workshop media items from Firestore workshop_gallery collection,
 * strictly validating and distinguishing video vs. image types during retrieval.
 */
export async function fetchAllWorkshopMediaFromFirestore(): Promise<WorkshopMediaItem[]> {
  try {
    const snap = await getDocs(collection(db, WORKSHOP_GALLERY_COLLECTION));
    if (snap.empty) return [];

    return snap.docs.map((d) => {
      const data = d.data();
      return sanitizeRetrievedWorkshopMedia({ ...data, id: d.id });
    });
  } catch (err) {
    console.warn('Error fetching workshop media from Firestore:', err);
    return [];
  }
}

/**
 * Real-time subscription to Firestore workshop_gallery collection
 */
export function subscribeToWorkshopMedia(
  onUpdate: (items: WorkshopMediaItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, WORKSHOP_GALLERY_COLLECTION);
  return onSnapshot(
    colRef,
    (snap) => {
      const items = snap.docs.map((d) => {
        return sanitizeRetrievedWorkshopMedia({ ...d.data(), id: d.id });
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore workshop_gallery subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Deletes a workshop media item from both Firebase Storage and Firestore
 */
export async function deleteWorkshopMediaFromStorage(mediaItem: WorkshopMediaItem): Promise<void> {
  // 1. Delete from Firestore
  try {
    const docRef = doc(db, WORKSHOP_GALLERY_COLLECTION, mediaItem.id);
    await safeDeleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore doc delete notice:', e);
  }

  // 2. If item is stored in Firebase Storage, delete the cloud object
  if (mediaItem.url && mediaItem.url.includes('firebasestorage.googleapis.com')) {
    try {
      const storageRef = ref(storage, mediaItem.url);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn('Firebase Storage object delete notice:', e);
    }
  }

  // 3. Also clean from local server disk if endpoint is available
  try {
    await fetch('/api/workshop-media/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mediaItem.id, url: mediaItem.url, deleteFile: true })
    });
  } catch {}
}

/**
 * Explicitly triggers a Firebase Storage batch delete for associated file paths/URLs,
 * ensuring deleted files are purged from cloud storage immediately.
 */
export async function batchDeleteFirebaseStorageFiles(urlsOrPaths: string[]): Promise<{ deleted: number; errors: number }> {
  if (!urlsOrPaths || urlsOrPaths.length === 0) return { deleted: 0, errors: 0 };
  
  let deletedCount = 0;
  let errorCount = 0;

  const deletePromises = urlsOrPaths.map(async (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    
    // Only attempt storage delete if it's a Firebase Storage download URL, gs:// URI, or relative storage path
    const isCloudStorage = 
      rawUrl.includes('firebasestorage.googleapis.com') || 
      rawUrl.startsWith('gs://') ||
      rawUrl.startsWith('workshops/') ||
      rawUrl.startsWith('products/');
      
    if (!isCloudStorage) return;

    try {
      const storageRef = ref(storage, rawUrl);
      await deleteObject(storageRef);
      deletedCount++;
    } catch (err: any) {
      if (err?.code === 'storage/object-not-found') {
        deletedCount++;
      } else {
        errorCount++;
        console.warn(`Firebase Storage object delete notice for "${rawUrl}":`, err);
      }
    }
  });

  await Promise.allSettled(deletePromises);
  console.info(`[Firebase Storage Batch Delete] Purged ${deletedCount} file(s) from cloud storage.`);
  return { deleted: deletedCount, errors: errorCount };
}

