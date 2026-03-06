import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

const GRADES = [
  { grade: 3, label: 'Grade 3', emoji: '🌟' },
  { grade: 4, label: 'Grade 4', emoji: '🚀' },
  { grade: 5, label: 'Grade 5', emoji: '🏆' },
  { grade: 6, label: 'Grade 6', emoji: '⚡' },
  { grade: 7, label: 'Grade 7', emoji: '👑' },
];

const COMPLIANCE_ITEMS = [
  'No account needed — ever',
  'Nothing leaves this device',
  'No ads, no tracking, no data collection',
  'Sessions stored locally — clear anytime in Settings',
];

export function ParentSetupScreen() {
  const { setGrade, setRsmTrack, rsmTrack, grade } = useChatStore();
  const [selected, setSelected] = useState<number | null>(grade ?? null);

  return (
    <div
      data-testid="parent-setup"
      className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 max-w-md mx-auto animate-[screenSlideIn_0.35s_ease-out]"
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Parent Setup</h1>
      <p className="text-sm text-slate-400 mb-6">Set up your child's learning experience</p>

      {/* Grade selection — highlight only, does not navigate */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 self-start">
        What grade is your child in?
      </p>
      <div className="w-full grid grid-cols-5 gap-2 mb-6">
        {GRADES.map((g, i) => (
          <button
            key={g.grade}
            data-testid={`grade-btn-${g.grade}`}
            onClick={() => setSelected(g.grade)}
            className={[
              'flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all hover:scale-[1.02]',
              'animate-[slideUp_0.3s_ease-out_both]',
              selected === g.grade
                ? 'border-amber-400 bg-amber-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300',
            ].join(' ')}
            style={{ animationDelay: `${i * 50}ms` }}
            aria-pressed={selected === g.grade}
          >
            <span className="text-xl">{g.emoji}</span>
            <span className="text-[10px] font-bold text-slate-600">{g.label}</span>
          </button>
        ))}
      </div>

      {/* RSM toggle */}
      <label className="flex items-center gap-2 mb-2 cursor-pointer self-start" data-testid="rsm-toggle-label">
        <input
          type="checkbox"
          data-testid="rsm-toggle"
          checked={rsmTrack ?? false}
          onChange={(e) => setRsmTrack(e.target.checked)}
          className="w-5 h-5 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
        />
        <span className="text-sm text-slate-600">My child attends Russian School of Mathematics</span>
      </label>
      {rsmTrack && (
        <p className="text-xs font-semibold text-violet-600 mb-4 self-start" data-testid="rsm-confirm-text">
          RSM mode on — harder, multi-step math problems!
        </p>
      )}

      {/* Compliance disclosure */}
      <div
        data-testid="compliance-block"
        className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 mb-6"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Privacy & Safety</span>
        </div>
        <ul className="space-y-1">
          {COMPLIANCE_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-slate-500">
              <span className="mt-0.5 text-emerald-400 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <button
        data-testid="parent-lets-go"
        disabled={selected == null}
        onClick={() => { if (selected != null) setGrade(selected); }}
        className={[
          'w-full py-4 rounded-2xl text-lg font-bold transition-all',
          selected != null
            ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 shadow-md hover:shadow-lg hover:scale-[1.01]'
            : 'bg-slate-100 text-slate-300 cursor-not-allowed',
        ].join(' ')}
      >
        {selected != null ? `Let's go! Grade ${selected}` : 'Pick a grade to continue'}
      </button>
    </div>
  );
}
