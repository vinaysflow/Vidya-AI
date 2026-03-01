import { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { Subject } from '../../stores/chatStore';
import { getApiBase, getAuthHeader } from '../../lib/api';

const API_BASE = getApiBase();

interface SkillRadarProps {
  subject: Subject;
}

export function SkillRadar({ subject }: SkillRadarProps) {
  const [data, setData] = useState<Array<{ concept: string; mastery: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/progress/radar/${subject}?userId=anonymous`, {
      headers: getAuthHeader(),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(
            res.concepts.map((c: string, i: number) => ({
              concept: c,
              mastery: Math.round(res.mastery[i]),
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subject]);

  if (loading) return <div className="text-sm text-slate-500 text-center p-4">Loading...</div>;
  if (data.length === 0) return <div className="text-sm text-slate-500 text-center p-4">No progress data yet.</div>;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="concept" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar name="Mastery" dataKey="mastery" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
