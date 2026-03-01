import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SkillRadar } from './SkillRadar';
import { MasteryTree } from './MasteryTree';
import { DueReviewCard } from './DueReviewCard';
import { SUBJECT_META, type Subject } from '../../stores/chatStore';

const SUBJECTS_WITH_CONCEPTS: Subject[] = [
  'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'CODING', 'AI_LEARNING',
];

export function ProgressDashboard() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('PHYSICS');

  const subjectMeta = SUBJECT_META.find((s) => s.id === selectedSubject);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-white dark:bg-slate-800">
        <Link to="/" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">My Progress</h1>
      </header>

      {/* Subject selector */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {SUBJECTS_WITH_CONCEPTS.map((subj) => {
          const meta = SUBJECT_META.find((s) => s.id === subj);
          return (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSubject === subj
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              {meta?.label.EN ?? subj}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <DueReviewCard />

        <section>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Skill Radar - {subjectMeta?.label.EN}
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <SkillRadar subject={selectedSubject} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Learning Path
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <MasteryTree subject={selectedSubject} />
          </div>
        </section>
      </div>
    </div>
  );
}
