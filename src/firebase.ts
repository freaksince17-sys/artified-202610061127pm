import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with auto-detected long-polling and ignoreUndefinedProperties so optional fields never fail setDoc
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 30 },
    ignoreUndefinedProperties: true
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);


