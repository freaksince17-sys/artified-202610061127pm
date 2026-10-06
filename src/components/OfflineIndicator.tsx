import React, { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-24 left-4 md:bottom-8 md:left-8 z-[9999] flex items-center gap-2.5 rounded-xl bg-amber-500 dark:bg-amber-600 px-4 py-3 text-xs font-medium text-white shadow-xl border border-amber-400/20 backdrop-blur-md animate-fade-in">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Offline Mode active in Nepal — Serving cached local artisan assets & product images</span>
    </div>
  );
};
