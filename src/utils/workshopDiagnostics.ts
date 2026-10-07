import { WorkshopMediaItem } from '../types';
import { storage } from '../firebase';
import { ref, getDownloadURL, getMetadata } from 'firebase/storage';
import { getWorkshopEmbeddedFallback } from '../data/workshopEmbeddedFallbacks';

export interface DiagnosticResult {
  itemId: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  httpStatus?: number;
  mimeType?: string;
  expectedMimeType: string;
  isMimeCorrect: boolean;
  contentLength?: number;
  durationMs?: number;
  firebaseStorageVerified?: boolean;
  errorMessage?: string;
  isPlayable?: boolean;
  repairedUrl?: string;
}

/**
 * Diagnostic Engine for Workshop Masterclass Media
 * Verifies Firebase Storage file paths, logs detailed authentication and fetch telemetry to console,
 * and ensures video MIME types are correctly identified for cross-browser playback.
 */
export async function runWorkshopMediaDiagnostic(
  item: WorkshopMediaItem
): Promise<DiagnosticResult> {
  const startTime = performance.now();
  const expectedMime = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
  const url = item.url;

  console.group(`🩺 [Workshop Media Diagnostic] Testing Item: "${item.title}" (${item.id})`);
  console.info(`📌 Type: ${item.type} | URL: ${url} | Expected MIME: ${expectedMime}`);

  const result: DiagnosticResult = {
    itemId: item.id,
    title: item.title,
    type: item.type,
    url: url,
    status: 'checking',
    expectedMimeType: expectedMime,
    isMimeCorrect: false
  };

  try {
    // 1. Check if it's a Firebase Storage URL or path
    if (url.includes('firebasestorage.googleapis.com') || url.startsWith('gs://') || url.startsWith('workshop_gallery/')) {
      console.info('🔥 Firebase Storage Path detected. Checking Firebase Storage SDK reference...');
      try {
        let storageRef;
        if (url.startsWith('gs://') || url.startsWith('workshop_gallery/')) {
          storageRef = ref(storage, url);
        } else {
          storageRef = ref(storage, url);
        }
        
        const metadata = await getMetadata(storageRef);
        console.info('✅ Firebase Storage Metadata verified:', metadata);
        result.firebaseStorageVerified = true;
        result.mimeType = metadata.contentType;
        result.contentLength = metadata.size;
      } catch (fbErr: any) {
        console.warn('⚠️ Firebase Storage getMetadata notice:', fbErr?.message || fbErr);
        result.errorMessage = `Firebase Storage verify: ${fbErr?.message || 'Check storage rules / tokens'}`;
      }
    }

    // 2. HTTP Network Fetch & MIME Verification
    try {
      const response = await fetch(url, { method: 'HEAD' }).catch(async () => {
        // Fallback to GET with range if HEAD is blocked by server
        return await fetch(url, { headers: { Range: 'bytes=0-1024' } });
      });

      const duration = Math.round(performance.now() - startTime);
      result.durationMs = duration;
      result.httpStatus = response.status;

      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || result.mimeType || '';
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        result.contentLength = parseInt(contentLength, 10);
      }

      result.mimeType = contentType;
      
      if (item.type === 'video') {
        const isVideoMime = contentType.includes('video/') || contentType.includes('mp4') || contentType.includes('webm') || contentType.includes('quicktime');
        result.isMimeCorrect = isVideoMime;
        if (!isVideoMime) {
          console.warn(`⚠️ Warning: Detected Content-Type "${contentType}" may not match video playback requirements.`);
        }
      } else {
        const isImageMime = contentType.includes('image/') || contentType.includes('jpeg') || contentType.includes('png') || contentType.includes('webp');
        result.isMimeCorrect = isImageMime;
      }

      result.isPlayable = response.ok || response.status === 206;
      result.status = result.isPlayable && result.isMimeCorrect ? 'healthy' : 'warning';

      console.info(`✅ HTTP Status: ${response.status} (${duration}ms) | Content-Type: ${contentType} | Size: ${result.contentLength ? Math.round(result.contentLength / 1024) + ' KB' : 'Streaming'}`);
    } catch (httpErr: any) {
      console.error(`❌ HTTP Fetch failed for ${url}:`, httpErr);
      result.status = 'error';
      result.errorMessage = httpErr?.message || 'Network fetch failed / Resource unreachable';
      result.durationMs = Math.round(performance.now() - startTime);
    }

    console.groupEnd();
    return result;
  } catch (err: any) {
    console.error(`❌ Diagnostic uncaught error for ${item.id}:`, err);
    console.groupEnd();
    return {
      ...result,
      status: 'error',
      errorMessage: err?.message || 'Diagnostic failed'
    };
  }
}

import { getStoredMediaBlobUrl } from './workshopMediaStore';

/**
 * Re-fetches fresh URL and verifies from IndexedDB, Server Disk, or Firebase Storage
 */
export async function refetchWorkshopMediaFromStorage(item: WorkshopMediaItem): Promise<string> {
  console.info(`🔄 Re-fetching media for "${item.title}" (${item.id})...`);
  
  // 1. Check embedded fallback first for instant zero-network recovery (photos and posters)
  const embedded = getWorkshopEmbeddedFallback(item.url) || getWorkshopEmbeddedFallback(item.thumbnailUrl);
  if (embedded && item.type === 'image') {
    console.info('✅ Recovered high-fidelity embedded image data:', item.title);
    return embedded;
  }

  // 2. Check IndexedDB persistent local blob store (survives restarts)
  try {
    const idbUrl = await getStoredMediaBlobUrl(item.id);
    if (idbUrl) {
      console.info('✅ Revived fresh live media blob from IndexedDB:', idbUrl);
      return idbUrl;
    }
  } catch {}

  // 3. Normalize legacy .mov URLs to universally compatible web .mp4 or .jpeg
  let cleanUrl = item.url || '';
  if (cleanUrl.endsWith('.mov')) {
    cleanUrl = cleanUrl.includes('snap') ? cleanUrl.replace(/\.mov$/i, '.jpeg') : cleanUrl.replace(/\.mov$/i, '.mp4');
  }

  // 4. Firebase Storage URL refresh
  if (cleanUrl && cleanUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const storageRef = ref(storage, cleanUrl);
      const freshUrl = await getDownloadURL(storageRef);
      console.info('✅ Re-fetched fresh Firebase Storage URL:', freshUrl);
      return freshUrl;
    } catch (e) {
      console.warn('Firebase re-fetch download URL notice:', e);
    }
  }

  // 5. If local /workshops/ URL, check if server has file or add cache buster
  if (cleanUrl && cleanUrl.startsWith('/workshops/')) {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const reloadedUrl = `${cleanUrl.split('?')[0]}${separator}v=${Date.now()}`;
    return reloadedUrl;
  }

  // 6. If thumbnail exists and is valid, use it as fallback
  if (item.thumbnailUrl && !item.thumbnailUrl.startsWith('blob:')) {
    return item.thumbnailUrl;
  }

  if (embedded) {
    return embedded;
  }

  const separator = (cleanUrl || '').includes('?') ? '&' : '?';
  const reloadedUrl = `${(cleanUrl || '').split('?')[0]}${separator}reload=${Date.now()}`;
  return reloadedUrl;
}
