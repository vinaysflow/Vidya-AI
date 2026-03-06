import { useChatStore } from '../../stores/chatStore';

export function RoleSelectorScreen() {
  const { setKidModeEnabled } = useChatStore();

  return (
    <div
      data-testid="role-selector"
      className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 max-w-md mx-auto animate-[screenSlideIn_0.35s_ease-out]"
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to Vid!</h1>
        <p className="text-sm text-slate-400">Your personal Socratic tutor</p>
      </div>

      <div className="w-full space-y-4">
        <button
          data-testid="role-kid-mode"
          onClick={() => setKidModeEnabled(true)}
          className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] text-left animate-[slideUp_0.3s_ease-out_both]"
          style={{ animationDelay: '60ms' }}
        >
          <span className="text-4xl shrink-0">👨‍👩‍👧</span>
          <div>
            <div className="text-lg font-bold text-slate-700">Set up Kid Mode</div>
            <div className="text-xs text-slate-400 mt-0.5">I am a parent or guardian</div>
          </div>
        </button>

        <button
          data-testid="role-start-learning"
          onClick={() => setKidModeEnabled(false)}
          className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl border-2 border-sky-200 bg-sky-50 hover:border-sky-400 hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] text-left animate-[slideUp_0.3s_ease-out_both]"
          style={{ animationDelay: '120ms' }}
        >
          <span className="text-4xl shrink-0">🎓</span>
          <div>
            <div className="text-lg font-bold text-slate-700">Start Learning</div>
            <div className="text-xs text-slate-400 mt-0.5">Student, tutor, or lifelong learner</div>
          </div>
        </button>
      </div>
    </div>
  );
}
