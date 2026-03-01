import { useEffect, useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { getApiBase, getAuthHeader } from '../../lib/api';

const API_BASE = getApiBase();

interface DueReview {
  name: string;
  subject: string;
  topic: string;
  mastery: number;
}

interface DueReviewCardProps {
  onStartReview?: (conceptName: string, subject: string) => void;
}

export function DueReviewCard({ onStartReview }: DueReviewCardProps) {
  const [reviews, setReviews] = useState<DueReview[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/progress/due-reviews?userId=anonymous`, {
      headers: getAuthHeader(),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setReviews(res.reviews.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <Clock className="h-4 w-4" />
        <span className="text-xs font-semibold">Time to review</span>
      </div>
      {reviews.map((r) => (
        <button
          key={r.name}
          onClick={() => onStartReview?.(r.name, r.subject)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
        >
          <span className="text-slate-700 dark:text-slate-300">{r.name}</span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      ))}
    </div>
  );
}
