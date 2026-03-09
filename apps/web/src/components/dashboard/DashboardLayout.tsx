import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, School, Settings } from 'lucide-react';
import { GuardianLinkFlow } from './GuardianLinkFlow';
import { ClassroomManager } from './ClassroomManager';
import { useChatStore } from '../../stores/chatStore';

const TABS = [
  { id: 'students', label: 'My Students', icon: Users },
  { id: 'classroom', label: 'Classroom', icon: School },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('students');
  const { userId } = useChatStore();

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-white dark:bg-slate-800">
        <Link to="/" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">Dashboard</h1>
      </header>

      <nav className="flex border-b bg-white dark:bg-slate-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'students' && (
          <div className="space-y-4">
            <GuardianLinkFlow guardianUserId={userId ?? 'anonymous'} />
            <p className="text-sm text-slate-500 text-center">
              Link to students to see their learning summaries here.
            </p>
          </div>
        )}

        {activeTab === 'classroom' && (
          <ClassroomManager teacherId={userId ?? 'anonymous'} />
        )}

        {activeTab === 'settings' && (
          <div className="text-sm text-slate-500 text-center p-8">
            Dashboard settings coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
