import { useEffect, useState } from 'react';
import { Trophy, Zap } from 'lucide-react';
import { getApiBase, getAuthHeader } from '../../lib/api';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  weeklyXp: number;
  level: number;
}

const API_BASE = getApiBase();

export function LeaderboardPanel({ currentUserId: _currentUserId }: { currentUserId?: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/gamification/leaderboard?limit=20`, {
      headers: getAuthHeader(),
    })
      .then((r) => r.json())
      .then((data) => setEntries(data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-slate-500 text-center">Loading leaderboard...</div>;
  }

  if (entries.length === 0) {
    return <div className="p-4 text-sm text-slate-500 text-center">No data yet this week.</div>;
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {entries.map((entry) => (
        <div
          key={entry.rank}
          className={`flex items-center gap-3 px-4 py-2.5 ${
            entry.rank <= 3 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
          }`}
        >
          <span className="w-6 text-center font-bold text-sm text-slate-500 dark:text-slate-400">
            {entry.rank <= 3 ? (
              <Trophy
                className={`h-4 w-4 inline ${
                  entry.rank === 1
                    ? 'text-amber-400'
                    : entry.rank === 2
                    ? 'text-slate-400'
                    : 'text-amber-700'
                }`}
              />
            ) : (
              entry.rank
            )}
          </span>
          <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {entry.displayName}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Lv {entry.level}</span>
          <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Zap className="h-3 w-3" />
            {entry.weeklyXp}
          </span>
        </div>
      ))}
    </div>
  );
}
