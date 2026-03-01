import { useState } from 'react';
import { SkipForward, SkipBack } from 'lucide-react';

interface CodeStep {
  line: number;
  variables: Record<string, any>;
  highlight?: boolean;
  output?: string;
}

interface CodeTracerProps {
  code: string;
  steps: CodeStep[];
}

export function CodeTracer({ code, steps }: CodeTracerProps) {
  const [stepIdx, setStepIdx] = useState(0);

  const currentStep = steps[stepIdx];
  const lines = code.split('\n');

  return (
    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
      <div className="flex-1 font-mono text-xs overflow-x-auto">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex px-2 py-0.5 ${
              currentStep?.line === i + 1
                ? 'bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-yellow-500'
                : ''
            }`}
          >
            <span className="w-6 text-right text-slate-400 mr-3 select-none">{i + 1}</span>
            <pre className="text-slate-700 dark:text-slate-300">{line}</pre>
          </div>
        ))}
      </div>

      <div className="w-40 space-y-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase">Variables</div>
        {currentStep &&
          Object.entries(currentStep.variables).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="font-mono text-blue-600 dark:text-blue-400">{k}</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">{JSON.stringify(v)}</span>
            </div>
          ))}
        {currentStep?.output && (
          <div className="mt-2 p-1.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px] font-mono text-green-600 dark:text-green-400">
            {currentStep.output}
          </div>
        )}

        <div className="flex items-center gap-1 pt-2">
          <button onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
            <SkipBack className="h-3 w-3" />
          </button>
          <span className="text-[10px] text-slate-500 flex-1 text-center">
            {stepIdx + 1}/{steps.length}
          </span>
          <button onClick={() => setStepIdx(Math.min(steps.length - 1, stepIdx + 1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
            <SkipForward className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
