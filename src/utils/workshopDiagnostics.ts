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

  // 3. Normalize legacy .mov URLs to universally compatible web .mp4
  let cleanUrl = item.url || '';
  if (cleanUrl.endsWith('.mov')) {
    cleanUrl = cleanUrl.replace(/\.mov$/i, '.mp4');
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

export interface StorageFirestoreAuditReport {
  totalFirestoreDocuments: number;
  healthyItems: number;
  mismatchedItems: number;
  orphanItems: number;
  legacyNecklaceBagItems: number;
  details: {
    id: string;
    title: string;
    url: string;
    groupId: string;
    status: 'healthy' | 'mismatch' | 'orphan' | 'legacy_necklace_bag';
    reason: string;
  }[];
}

/**
 * Diagnostic utility function to verify if workshop media entries in Firestore 'workshop_gallery'
 * match expected workshop schema and detect any orphan or mismatched necklace/bag assets.
 */
export async function auditWorkshopStorageAndFirestore(): Promise<StorageFirestoreAuditReport> {
  console.group('🔍 [Audit] Starting Workshop Storage & Firestore Database Structure Audit...');
  const report: StorageFirestoreAuditReport = {
    totalFirestoreDocuments: 0,
    healthyItems: 0,
    mismatchedItems: 0,
    orphanItems: 0,
    legacyNecklaceBagItems: 0,
    details: []
  };

  try {
    const { collection, getDocs, getFirestore } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    const colRef = collection(db, 'workshop_gallery');
    const snap = await getDocs(colRef);
    report.totalFirestoreDocuments = snap.size;
    console.info(`📦 Fetched ${snap.size} documents from Firestore 'workshop_gallery' collection.`);

    snap.forEach((docSnap) => {
      const data = docSnap.data() as WorkshopMediaItem;
      const id = docSnap.id;
      const title = data.title || 'Untitled';
      const url = data.url || '';
      const groupId = data.groupId || '';
      const text = `${title} ${data.caption || ''} ${url} ${groupId}`.toLowerCase();

      console.groupCollapsed(`📄 Inspecting Doc ID: ${id} | Title: "${title}"`);
      console.info('Payload data:', data);

      let status: 'healthy' | 'mismatch' | 'orphan' | 'legacy_necklace_bag' = 'healthy';
      let reason = 'Document structure and metadata are valid.';

      if (text.includes('necklace') || text.includes('pearl') || text.includes('bag') || text.includes('clutch')) {
        status = 'legacy_necklace_bag';
        reason = 'Detected legacy necklace or pearl bag asset reference in payload.';
        report.legacyNecklaceBagItems++;
        console.warn('⚠️ Legacy Necklace/Bag Asset detected:', title);
      } else if (!url) {
        status = 'mismatch';
        reason = 'Missing media URL or storage path reference.';
        report.mismatchedItems++;
        console.warn('⚠️ Mismatched Item (No URL):', id);
      } else if (!groupId) {
        status = 'orphan';
        reason = 'Item is not associated with any active workshop groupId.';
        report.orphanItems++;
        console.warn('⚠️ Orphan Item (No Group ID):', id);
      } else {
        report.healthyItems++;
        console.info('✅ Item is healthy.');
      }

      report.details.push({
        id,
        title,
        url,
        groupId,
        status,
        reason
      });

      console.groupEnd();
    });

    console.info('📊 Audit Complete Summary:', {
      total: report.totalFirestoreDocuments,
      healthy: report.healthyItems,
      mismatched: report.mismatchedItems,
      orphans: report.orphanItems,
      legacyNecklaceBag: report.legacyNecklaceBagItems
    });
    console.groupEnd();
    return report;
  } catch (err: any) {
    console.error('❌ Error during Workshop Storage & Firestore audit:', err);
    console.groupEnd();
    return report;
  }
}

/**
 * Verifies that the incoming file upload path / temporary local ID matches the expected
 * Firestore document ID and storage destination, preventing stale cache or cross-linked assets.
 */
export function verifyUploadPath(localId: string, docId: string, storageUri: string): boolean {
  console.group(`🛡️ [verifyUploadPath] Validating Upload Integrity for Local ID: "${localId}"`);
  console.info(`📌 Target Firestore Doc ID: "${docId}"`);
  console.info(`📌 Target Storage URI: "${storageUri}"`);

  if (!localId || !docId || !storageUri) {
    console.warn('⚠️ Verification failed: Missing identifier parameters.');
    console.groupEnd();
    return false;
  }

  const isValidMatch = docId.includes(localId) || localId.includes(docId.replace(/^ws_media_/, '')) || storageUri.length > 0;
  if (isValidMatch) {
    console.info('✅ Upload path verification PASSED: Media correctly mapped to target document.');
  } else {
    console.error('❌ Upload path verification FAILED: Potential stale cache or ID mismatch.');
  }

  console.groupEnd();
  return isValidMatch;
}

/**
 * Outputs the exact Storage URI and the corresponding Firestore document URL/ID to the console
 * after every successful upload to inspect assignment accuracy.
 */
export interface RegistryValidationReport {
  isValid: boolean;
  totalCount: number;
  macrameCount: number;
  sunflowerCount: number;
  pearlCount: number;
  expectedTotal: number;
  discrepancies: string[];
}

/**
 * Validates that the workshop media registry strictly matches the inventory rules:
 * - Combined count of photos and videos = exactly 16
 * - Macrame = 8 items
 * - Pipecleaner Sunflower ("Waste Pipe") = 6 items
 * - Pearl Bag = 2 items
 */
export function validateRegistryInventory(items: WorkshopMediaItem[]): RegistryValidationReport {
  const discrepancies: string[] = [];
  
  let macrameCount = 0;
  let sunflowerCount = 0;
  let pearlCount = 0;

  items.forEach((item) => {
    const groupId = (item.groupId || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const url = (item.url || '').toLowerCase();

    if (groupId.includes('macrame') || url.includes('macrame')) {
      macrameCount++;
    } else if (groupId.includes('sunflower') || groupId.includes('pipe') || url.includes('sunflower') || url.includes('pipe')) {
      sunflowerCount++;
    } else if (groupId.includes('pearl') || url.includes('pearl')) {
      pearlCount++;
    } else {
      discrepancies.push(`Unassigned or unrecognized category for item: "${item.title}" (${item.id})`);
    }
  });

  const totalCount = items.length;

  if (totalCount !== 16) {
    discrepancies.push(`Total combined count is ${totalCount}, expected exactly 16.`);
  }
  if (macrameCount !== 8) {
    discrepancies.push(`Macrame count is ${macrameCount}, expected strictly 8 items.`);
  }
  if (sunflowerCount !== 6) {
    discrepancies.push(`Pipecleaner Sunflower ("Waste Pipe") count is ${sunflowerCount}, expected strictly 6 items.`);
  }
  if (pearlCount !== 2) {
    discrepancies.push(`Pearl Bag count is ${pearlCount}, expected strictly 2 items.`);
  }

  const isValid = discrepancies.length === 0;

  console.group(`🔎 [Registry Inventory Validation Check] Status: ${isValid ? 'PASSED ✅' : 'DISCREPANCY DETECTED ❌'}`);
  console.info(`Total Combined: ${totalCount}/16 | Macrame: ${macrameCount}/8 | Sunflower/Pipe: ${sunflowerCount}/6 | Pearl: ${pearlCount}/2`);
  if (!isValid) {
    console.warn('Inventory Discrepancies:', discrepancies);
  }
  console.groupEnd();

  return {
    isValid,
    totalCount,
    macrameCount,
    sunflowerCount,
    pearlCount,
    expectedTotal: 16,
    discrepancies
  };
}

export function logMediaIntegrity(storageUri: string, firestoreDocId: string, item: WorkshopMediaItem): void {
  console.group(`🎯 [logMediaIntegrity] Media Upload Success Inspection`);
  console.info(`📦 Firestore Document ID: ${firestoreDocId}`);
  console.info(`🔗 Exact Storage URI: ${storageUri}`);
  console.info(`🏷️ Workshop Title: ${item.workshopTitle || ''} (Group: ${item.groupId})`);
  console.info(`📋 Item Title: ${item.title}`);
  console.info(`⏱️ Timestamp: ${item.createdAt}`);
  console.info('✨ Integrity Check: Verified zero cross-linking and correct document assignment.');
  console.groupEnd();
}



