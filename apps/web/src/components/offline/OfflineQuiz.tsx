import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useOfflineStore } from '../../stores/offlineStore';

interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: string;
  concept: string;
}

export function OfflineQuiz({ subject }: { subject: string }) {
  const { getPack } = useOfflineStore();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    getPack(subject).then((pack) => {
      if (pack) {
        const shuffled = [...pack.quizBank].sort(() => Math.random() - 0.5).slice(0, 5);
        setQuestions(shuffled);
      }
    });
  }, [subject]);

  if (questions.length === 0) {
    return <div className="p-4 text-sm text-slate-500 text-center">No quiz available. Download the pack first.</div>;
  }

  if (finished) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="text-3xl font-bold text-slate-700 dark:text-white">{score}/{questions.length}</div>
        <p className="text-sm text-slate-500">Quiz complete!</p>
        <button
          onClick={() => { setCurrent(0); setScore(0); setSelected(null); setFinished(false); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const q = questions[current];
  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    if (option === q.answer) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-slate-500">Question {current + 1} of {questions.length}</div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{q.prompt}</p>
      <div className="space-y-2">
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
              selected === null
                ? 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                : opt === q.answer
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700'
                : opt === selected
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700'
                : 'border-slate-200 dark:border-slate-600 opacity-50'
            }`}
          >
            <span className="flex items-center gap-2">
              {selected && opt === q.answer && <CheckCircle className="h-4 w-4 text-green-500" />}
              {selected && opt === selected && opt !== q.answer && <XCircle className="h-4 w-4 text-red-500" />}
              {opt}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <button
          onClick={handleNext}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          {current + 1 >= questions.length ? 'See Results' : 'Next'}
        </button>
      )}
    </div>
  );
}
