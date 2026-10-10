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
  if (!error) return;
  const msg = error.message || String(error);
  const stackStr = error.stack || '';

  // Suppress harmless Vite HMR WebSocket disconnects and quota errors
  const isIgnoredError =
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit') ||
    msg.includes('quota') ||
    msg.includes('WebSocket') ||
    msg.includes('websocket') ||
    msg.includes('vite') ||
    msg.includes('@vite/client') ||
    stackStr.includes('@vite/client') ||
    stackStr.includes('websocket');

  if (isIgnoredError) {
    return;
  }

  try {
    // Construct clean payload without any 'undefined' values (Firestore rejects undefined fields)
    const errorData: Record<string, string> = {
      message: msg,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    if (error.stack) {
      errorData.stack = error.stack;
    }
    if (errorInfo?.componentStack) {
      errorData.componentStack = errorInfo.componentStack;
    }

    // Non-blocking write to error_logs collection
    await addDoc(collection(db, 'error_logs'), errorData).catch(() => {});
  } catch (err) {
    console.warn('Notice: Failed to log error to Firestore:', err);
  }
}

// Global window error & unhandled rejection listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || String(event.error || '');
    if (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('vite') ||
      msg.includes('@vite/client')
    ) {
      return;
    }
    logErrorToFirestore(event.error || new Error(event.message || 'Window Error')).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason || '');
    const reasonMsg = event.reason instanceof Error ? event.reason.message : reasonStr;

    if (
      reasonMsg.includes('WebSocket') ||
      reasonMsg.includes('websocket') ||
      reasonMsg.includes('vite') ||
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('websocket') ||
      reasonStr.includes('@vite/client')
    ) {
      // Suppress Vite HMR WebSocket disconnect noise from browser unhandled rejection console logs
      event.preventDefault();
      return;
    }

    const error = event.reason instanceof Error ? event.reason : new Error(reasonStr);
    logErrorToFirestore(error).catch(() => {});
  });
}

