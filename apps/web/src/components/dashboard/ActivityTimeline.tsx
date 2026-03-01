import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function ActivityTimeline({ studentId }: { studentId: string }) {
  const [data, setData] = useState<Array<{ date: string; count: number }>>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/student/${studentId}/activity`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.activity); })
      .catch(() => {});
  }, [studentId]);

  if (data.length === 0) return <div className="p-4 text-sm text-slate-500 text-center">No activity data.</div>;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Tooltip labelFormatter={(v) => `Date: ${v}`} />
          <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
