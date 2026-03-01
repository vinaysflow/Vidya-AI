import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { SessionQuiz } from '../../stores/chatStore';

interface SessionQuizCardProps {
  quiz: SessionQuiz;
}

export function SessionQuizCard({ quiz }: SessionQuizCardProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm mt-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Quick Quiz
        </h3>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, idx) => (
          <div key={q.id || idx} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              {q.difficulty} • {q.concept}
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200 font-medium">
              {idx + 1}. {q.prompt}
            </div>
            {q.options && q.options.length > 0 && (
              <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                {q.options.map((opt, optIdx) => (
                  <li key={optIdx}>• {opt}</li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setOpenIds((prev) => ({ ...prev, [q.id || String(idx)]: !prev[q.id || String(idx)] }))}
              className="mt-2 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
            >
              {openIds[q.id || String(idx)] ? 'Hide answer' : 'Show answer'}
            </button>
            {openIds[q.id || String(idx)] && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold">Answer:</span> {q.answer}</div>
                <div className="mt-1"><span className="font-semibold">Why:</span> {q.explanation}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
