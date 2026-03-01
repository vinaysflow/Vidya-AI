import { useEffect } from 'react';
import { Download, Trash2, Loader2, Package } from 'lucide-react';
import { useOfflineStore } from '../../stores/offlineStore';
import { SUBJECT_META, type Subject } from '../../stores/chatStore';

const AVAILABLE_SUBJECTS: Subject[] = [
  'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'CODING', 'AI_LEARNING',
];

export function PackManager() {
  const { downloadedSubjects, isDownloading, downloadPack, removePack, loadDownloadedList } =
    useOfflineStore();

  useEffect(() => {
    loadDownloadedList();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <Package className="h-4 w-4" /> Offline Packs
      </div>
      {AVAILABLE_SUBJECTS.map((subject) => {
        const meta = SUBJECT_META.find((s) => s.id === subject);
        const isDownloaded = downloadedSubjects.includes(subject);
        return (
          <div
            key={subject}
            className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {meta?.label.EN ?? subject}
            </span>
            {isDownloaded ? (
              <button
                onClick={() => removePack(subject)}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            ) : (
              <button
                onClick={() => downloadPack(subject)}
                disabled={isDownloading}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Download
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
