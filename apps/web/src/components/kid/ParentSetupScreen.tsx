import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';
import { DiagnosticQuizScreen } from './DiagnosticQuizScreen';
import { getApiBase, getJsonHeaders } from '../../lib/api';

const API_BASE = getApiBase();

const GRADES = [
  { grade: 3, label: 'Grade 3', emoji: '🌟' },
  { grade: 4, label: 'Grade 4', emoji: '🚀' },
  { grade: 5, label: 'Grade 5', emoji: '🏆' },
  { grade: 6, label: 'Grade 6', emoji: '⚡' },
  { grade: 7, label: 'Grade 7', emoji: '👑' },
  { grade: 8, label: 'Grade 8', emoji: '🎯' },
  { grade: 9, label: 'Grade 9', emoji: '🔥' },
];

const INTERESTS = [
  { id: 'space', label: 'Space', emoji: '🚀' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'animals', label: 'Animals', emoji: '🐾' },
  { id: 'cooking', label: 'Cooking', emoji: '🍳' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'youtube', label: 'YouTube', emoji: '📺' },
  { id: 'robots', label: 'Robots', emoji: '🤖' },
  { id: 'money', label: 'Money', emoji: '💰' },
];

const COMPLIANCE_ITEMS = [
  'No account needed — ever',
  'We only send what\u2019s needed for tutoring \u2014 no ads, no tracking',
  'No personal information collected \u2014 fully anonymous',
  'Delete all data anytime in Settings',
];

export function ParentSetupScreen() {
  const { setGrade, setEffectiveGrade, setRsmTrack, setInterests, rsmTrack, grade, voiceEnabled, setVoiceEnabled, interests, userId, apiKey, calmMode, setCalmMode } = useChatStore();
  const [selected, setSelected] = useState<number | null>(grade ?? null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests ?? []);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLetsGo = () => {
    if (selected != null) {
      setInterests(selectedInterests);
      setShowDiagnostic(true);
    }
  };

  const handleDiagnosticComplete = (score: number, suggestedGrade: number, results: Array<{ conceptKey: string; gradeLevel: number; correct: boolean }>) => {
    setGrade(selected!);
    setEffectiveGrade(suggestedGrade);
    console.log(`[Diagnostic] Score: ${score}/5, Suggested grade: ${suggestedGrade}`);

    // Seed BKT priors from diagnostic results (fire-and-forget)
    const effectiveUserId = userId ?? 'anonymous';
    if (effectiveUserId !== 'anonymous') {
      fetch(`${API_BASE}/api/progress/init-from-diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getJsonHeaders(apiKey) },
        body: JSON.stringify({
          userId: effectiveUserId,
          results,
          score,
          suggestedGrade,
          baseGrade: selected!,
        }),
      }).catch(() => {}); // fire-and-forget
    }
  };

  const handleDiagnosticSkip = () => {
    if (selected != null) setGrade(selected);
  };

  if (showDiagnostic && selected != null) {
    return (
      <DiagnosticQuizScreen
        grade={selected}
        subject="MATHEMATICS"
        onComplete={handleDiagnosticComplete}
        onSkip={handleDiagnosticSkip}
      />
    );
  }

  return (
    <div
      data-testid="parent-setup"
      className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 max-w-md mx-auto animate-[screenSlideIn_0.35s_ease-out]"
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Parent Setup</h1>
      <p className="text-sm text-slate-400 mb-4">Set up your child's learning experience</p>

      {/* Value proposition — 5-second differentiator vs IXL/Khan/Duolingo */}
      <div className="w-full rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 px-4 py-3 mb-6">
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-xs text-slate-600">
            <span className="text-violet-500 font-bold shrink-0">✦</span>
            Teaches your child to <strong>think</strong>, not just answer
          </li>
          <li className="flex items-start gap-2 text-xs text-slate-600">
            <span className="text-violet-500 font-bold shrink-0">✦</span>
            No punitive scoring — struggle is celebrated, not penalized
          </li>
          <li className="flex items-start gap-2 text-xs text-slate-600">
            <span className="text-violet-500 font-bold shrink-0">✦</span>
            Built for every learner, including ADHD, dyslexia, and autism
          </li>
        </ul>
      </div>

      {/* Grade selection — highlight only, does not navigate */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 self-start">
        What grade is your child in?
      </p>
      <div className="w-full grid grid-cols-7 gap-2 mb-6">
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

      {/* Enrichment program selector */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 self-start">
        Does your child attend a math enrichment program?
      </p>
      <div className="w-full grid grid-cols-3 gap-2 mb-2">
        {['RSM', 'Kumon', 'Mathnasium', 'AoPS', 'Other', 'None'].map((prog) => (
          <button
            key={prog}
            data-testid={prog === 'RSM' ? 'rsm-toggle' : undefined}
            onClick={() => setRsmTrack(prog === 'None' ? null : prog)}
            className={cn(
              'py-2 rounded-xl border-2 text-xs font-bold transition-all',
              rsmTrack === prog
                ? 'border-violet-400 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-500'
            )}
          >
            {prog}
          </button>
        ))}
      </div>
      {rsmTrack && rsmTrack !== 'None' && (
        <p className="text-xs font-semibold text-violet-600 mb-4 self-start" data-testid="rsm-confirm-text">
          {rsmTrack} mode on — calibrated for enrichment-level math!
        </p>
      )}

      {/* Interest picker */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 self-start mt-2">
        What does your child love? (optional — personalizes quests)
      </p>
      <div className="w-full grid grid-cols-4 gap-2 mb-5">
        {INTERESTS.map((interest) => (
          <button
            key={interest.id}
            onClick={() => toggleInterest(interest.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 rounded-2xl border-2 transition-all text-xs font-semibold',
              selectedInterests.includes(interest.id)
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            )}
          >
            <span className="text-lg">{interest.emoji}</span>
            <span>{interest.label}</span>
          </button>
        ))}
      </div>

      {/* Read aloud (TTS) toggle */}
      <label className="flex items-center gap-2 mb-3 cursor-pointer self-start">
        <input
          type="checkbox"
          checked={voiceEnabled}
          onChange={(e) => setVoiceEnabled(e.target.checked)}
          className="w-5 h-5 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
        />
        <span className="text-sm text-slate-600">Read questions aloud (text-to-speech)</span>
      </label>

      {/* Calm mode toggle */}
      <label className="flex items-center gap-2 mb-4 cursor-pointer self-start">
        <input
          type="checkbox"
          checked={calmMode}
          onChange={(e) => setCalmMode(e.target.checked)}
          className="w-5 h-5 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
        />
        <span className="text-sm text-slate-600">Calmer screens (reduces animations &amp; sounds)</span>
      </label>

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
        <Link to="/privacy" className="mt-2 block text-xs text-blue-500 underline text-right">
          Privacy Notice
        </Link>
      </div>

      {/* CTA */}
      <button
        data-testid="parent-lets-go"
        disabled={selected == null}
        onClick={handleLetsGo}
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
