import { X } from 'lucide-react';
import { TutorAvatar, type AvatarStyle } from './TutorAvatar';

const STYLES: { id: AvatarStyle; label: string; description: string }[] = [
  { id: 'orb', label: 'Abstract Orb', description: 'A glowing energy orb' },
  { id: 'robot', label: 'Cute Robot', description: 'A friendly robot companion' },
  { id: 'owl', label: 'Wise Owl', description: 'A scholarly owl' },
  { id: 'human', label: 'Friendly Human', description: 'A warm human avatar' },
];

interface AvatarCustomizerProps {
  currentStyle: AvatarStyle;
  onSelect: (style: AvatarStyle) => void;
  onClose: () => void;
}

export function AvatarCustomizer({ currentStyle, onSelect, onClose }: AvatarCustomizerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-80 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Choose Your Tutor</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {STYLES.map(({ id, label, description }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                currentStyle === id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-600 hover:border-blue-300'
              }`}
            >
              <TutorAvatar size="md" style={id} state="idle" />
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
