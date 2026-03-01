import { WifiOff } from 'lucide-react';
import { useOfflineStore } from '../../stores/offlineStore';

export function OfflineBanner() {
  const isOnline = useOfflineStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline — using downloaded content</span>
    </div>
  );
}
