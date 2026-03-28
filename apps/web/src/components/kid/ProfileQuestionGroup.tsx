/**
 * ProfileQuestionGroup
 *
 * A chip-select group for collecting a single learning profile question.
 * Supports multi-select (parent clicks chips; state lives in parent component).
 *
 * Accessibility: each chip is a <button> with aria-pressed for screen readers.
 */

import { cn } from '../../lib/utils';

interface Option {
  id: string;
  label: string;
  emoji: string;
}

interface ProfileQuestionGroupProps {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
}

export function ProfileQuestionGroup({ label, options, selected, onToggle }: ProfileQuestionGroupProps) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(opt.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all duration-150',
                isSelected
                  ? 'bg-indigo-100 border-indigo-400 text-indigo-800 dark:bg-indigo-900 dark:border-indigo-500 dark:text-indigo-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300',
              )}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
