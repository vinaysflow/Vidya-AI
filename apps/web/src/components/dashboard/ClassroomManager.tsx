import { useState } from 'react';
import { School, Copy, Check, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function ClassroomManager({ teacherId }: { teacherId: string }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createClassroom = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/classroom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, name }),
      });
      const data = await res.json();
      if (data.success) setJoinCode(data.classRoom.joinCode);
    } catch {}
    setLoading(false);
  };

  const copyCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <School className="h-4 w-4" /> Create Classroom
      </div>

      {joinCode ? (
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500">Share this join code with students:</p>
          <div className="flex items-center justify-center gap-2">
            <code className="px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-lg font-mono font-bold tracking-widest">
              {joinCode}
            </code>
            <button onClick={copyCode} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Classroom name (e.g. Physics 101)"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
          />
          <button
            onClick={createClassroom}
            disabled={loading || !name.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create Classroom'}
          </button>
        </>
      )}
    </div>
  );
}
