import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';

const BUCKET = firebaseConfig.storageBucket || 'amped-turbine-3mn89.firebasestorage.app';

/**
 * Returns the public persistent Firebase Storage media download URL for a given video shortcode.
 */
export const getFirebaseStorageVideoUrl = (shortcode: string): string => {
  if (!shortcode) return '';
  const cleanSC = shortcode.replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/instagram_videos%2F${cleanSC}.mp4?alt=media`;
};

/**
 * Returns the public persistent Firebase Storage media download URL for a given reel cover thumbnail.
 */
export const getFirebaseStorageCoverUrl = (shortcode: string): string => {
  if (!shortcode) return '';
  const cleanSC = shortcode.replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/instagram_covers%2F${cleanSC}_cover.jpg?alt=media`;
};

/**
 * Uploads an MP4 video (File, Blob, or Base64 Data URL) directly to Firebase Storage.
 */
export const uploadVideoToFirebaseStorage = async (
  input: File | Blob | string,
  shortcode: string
): Promise<string> => {
  const cleanSC = (shortcode || `vid_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const storageRef = ref(storage, `instagram_videos/${cleanSC}.mp4`);

  try {
    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        await uploadString(storageRef, input, 'data_url');
      } else if (input.startsWith('http')) {
        // Fetch remote video stream and upload as blob to Firebase Storage
        const res = await fetch(input);
        const blob = await res.blob();
        await uploadBytes(storageRef, blob, { contentType: 'video/mp4' });
      }
    } else {
      await uploadBytes(storageRef, input, { contentType: 'video/mp4' });
    }

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Notice: Firebase Storage video upload notice:', err);
    return getFirebaseStorageVideoUrl(cleanSC);
  }
};

/**
 * Uploads a cover photo image (File, Blob, or Base64 Data URL) directly to Firebase Storage.
 */
export const uploadCoverToFirebaseStorage = async (
  input: File | Blob | string,
  shortcode: string
): Promise<string> => {
  const cleanSC = (shortcode || `img_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const storageRef = ref(storage, `instagram_covers/${cleanSC}_cover.jpg`);

  try {
    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        await uploadString(storageRef, input, 'data_url');
      } else if (input.startsWith('http')) {
        const res = await fetch(input);
        const blob = await res.blob();
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      }
    } else {
      await uploadBytes(storageRef, input, { contentType: 'image/jpeg' });
    }

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Notice: Firebase Storage cover upload notice:', err);
    return getFirebaseStorageCoverUrl(cleanSC);
  }
};
