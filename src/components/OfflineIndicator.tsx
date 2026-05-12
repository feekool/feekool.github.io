import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Offline mode - using cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 border border-amber-300 dark:border-amber-700">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">
        Offline mode - viewing cached data
      </span>
    </div>
  );
}
