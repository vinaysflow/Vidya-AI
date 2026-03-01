import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScatterPlotProps {
  points: Array<{ x: number; y: number; label?: string }>;
  xLabel?: string;
  yLabel?: string;
}

export function ScatterPlot({ points, xLabel, yLabel }: ScatterPlotProps) {
  return (
    <div className="h-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" name={xLabel || 'X'} tick={{ fontSize: 10 }} />
          <YAxis dataKey="y" name={yLabel || 'Y'} tick={{ fontSize: 10 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={points} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
