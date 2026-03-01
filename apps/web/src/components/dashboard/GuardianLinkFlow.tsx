import { useState } from 'react';
import { UserPlus, Check, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function GuardianLinkFlow({ guardianUserId }: { guardianUserId: string }) {
  const [studentId, setStudentId] = useState('');
  const [relationship, setRelationship] = useState<'PARENT' | 'TEACHER' | 'GUARDIAN'>('PARENT');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    if (!studentId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/guardian/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardianUserId, studentUserId: studentId, relationship }),
      });
      const data = await res.json();
      if (data.success) setSuccess(true);
      else setError(data.error || 'Failed to link');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-300 text-sm">
        <Check className="h-4 w-4" /> Link request sent. Waiting for student approval.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <UserPlus className="h-4 w-4" /> Link to a Student
      </div>
      <input
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        placeholder="Enter student ID"
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
      />
      <select
        value={relationship}
        onChange={(e) => setRelationship(e.target.value as any)}
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
      >
        <option value="PARENT">Parent</option>
        <option value="TEACHER">Teacher</option>
        <option value="GUARDIAN">Guardian</option>
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleLink}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Send Link Request'}
      </button>
    </div>
  );
}
