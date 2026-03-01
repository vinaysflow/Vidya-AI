import { useState, useEffect } from 'react';
import { MathRenderer } from '../MathRenderer';

interface EquationStepsProps {
  steps: string[];
}

export function EquationSteps({ steps }: EquationStepsProps) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount < steps.length) {
      const t = setTimeout(() => setVisibleCount((c) => c + 1), 600);
      return () => clearTimeout(t);
    }
  }, [visibleCount, steps.length]);

  return (
    <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
      {steps.slice(0, visibleCount).map((step, i) => (
        <div
          key={i}
          className="flex items-center gap-2 message-appear"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <span className="text-[10px] text-slate-400 font-mono w-4 text-right">{i + 1}</span>
          <div className="flex-1">
            <MathRenderer content={`$${step}$`} />
          </div>
          {i < visibleCount - 1 && i < steps.length - 1 && (
            <span className="text-slate-400">↓</span>
          )}
        </div>
      ))}
    </div>
  );
}
