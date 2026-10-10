export interface UploadSessionMetadata {
  sessionId: string;
  createdAt: string;
}

export function createUploadSession(): UploadSessionMetadata {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  console.info(`🔑 [DebugUpload] Initialized upload session UUID: ${sessionId}`);
  return {
    sessionId,
    createdAt: new Date().toISOString()
  };
}

export function attachSessionMetadata<T extends Record<string, any>>(payload: T, sessionId: string): T & { uploadSessionId: string } {
  return {
    ...payload,
    uploadSessionId: sessionId
  };
}
