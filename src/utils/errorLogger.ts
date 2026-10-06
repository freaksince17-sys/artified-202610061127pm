import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
}

export async function logErrorToFirestore(error: Error, errorInfo?: { componentStack?: string | null }): Promise<void> {
  const msg = error?.message || String(error);
  if (msg.includes('resource-exhausted') || msg.includes('Quota limit') || msg.includes('quota')) {
    // Suppress secondary logging loop during Firestore quota exhaustion
    return;
  }
  try {
    const errorData: ErrorLogData = {
      message: msg,
      stack: error.stack || undefined,
      componentStack: errorInfo?.componentStack || undefined,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // Non-blocking write to error_logs collection
    await addDoc(collection(db, 'error_logs'), errorData).catch(() => {});
  } catch (err) {
    console.warn('Notice: Failed to log error to Firestore:', err);
  }
}

// Global window error & unhandled rejection listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logErrorToFirestore(event.error || new Error(event.message)).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    logErrorToFirestore(error).catch(() => {});
  });
}
