import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8 max-w-2xl mx-auto">
      <Link
        to="/"
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-emerald-500" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Privacy Notice</h1>
      </div>

      <p className="text-xs text-slate-400 mb-6">Last updated: March 2026</p>

      <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-bold text-slate-800 dark:text-white mb-2">What we collect</h2>
          <ul className="space-y-1 list-disc list-inside">
            <li>Anonymized tutoring session messages (the questions and answers exchanged)</li>
            <li>Learning progress scores (mastery levels per concept)</li>
            <li>XP and gamification events (points, badges, streaks)</li>
            <li>Grade level and enrichment program selection</li>
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            All data is identified only by a randomly generated device ID. We never link it to a name, email, or any personal identifier.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 dark:text-white mb-2">What we do NOT collect</h2>
          <ul className="space-y-1 list-disc list-inside">
            <li>Name, email address, or phone number</li>
            <li>School name or location</li>
            <li>Photos, videos, or voice recordings stored beyond the session</li>
            <li>Device identifiers beyond the anonymous app ID</li>
            <li>Browsing history or third-party tracking</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 dark:text-white mb-2">How we use the data</h2>
          <ul className="space-y-1 list-disc list-inside">
            <li>To power the Socratic tutoring experience in real-time</li>
            <li>To track learning progress and adapt difficulty</li>
            <li>To generate the Parent Report showing learning outcomes</li>
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            We do not sell data to third parties. We do not use it for advertising.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 dark:text-white mb-2">How to delete your data</h2>
          <p>
            Go to <strong>Settings → Delete My Data</strong> to permanently remove all tutoring history, progress,
            and gamification data from our servers. This cannot be undone.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 dark:text-white mb-2">Children's privacy</h2>
          <p>
            Vidya is designed for use under parent supervision. We do not knowingly collect personal
            information from children under 13. All data is anonymous by design — no account is required
            and no personal information is requested.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-slate-800 dark:text-white mb-2">Contact</h2>
          <p>
            Questions about privacy? Email us at{' '}
            <a href="mailto:privacy@tryvidya.ai" className="text-blue-500 underline">
              privacy@tryvidya.ai
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
