import { useState } from 'react';
import { Check, Edit3, X } from 'lucide-react';

interface OCRPreviewProps {
  extractedText: string;
  confidence: number;
  onConfirm: (text: string) => void;
  onDiscard: () => void;
}

export function OCRPreview({ extractedText, confidence, onConfirm, onDiscard }: OCRPreviewProps) {
  const [text, setText] = useState(extractedText);
  const [editing, setEditing] = useState(false);

  const confidenceColor =
    confidence >= 0.8 ? 'text-green-500' : confidence >= 0.5 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Vid (Vidya) sees:
        </span>
        <span className={`text-[10px] font-medium ${confidenceColor}`}>
          {Math.round(confidence * 100)}% confident
        </span>
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-24 p-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
          {text}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onConfirm(text)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-500"
        >
          <Check className="h-3 w-3" /> Looks right
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-300"
        >
          <Edit3 className="h-3 w-3" /> {editing ? 'Preview' : 'Edit'}
        </button>
        <button
          onClick={onDiscard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 text-xs hover:text-red-500"
        >
          <X className="h-3 w-3" /> Discard
        </button>
      </div>
    </div>
  );
}
