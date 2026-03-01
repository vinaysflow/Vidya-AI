import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, MessageSquare, Clock, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useChatStore, SUBJECT_META, type SessionSummary } from '../../stores/chatStore';
import { formatDate } from '../../lib/utils';

export function Sidebar() {
  const { t } = useTranslation();
  const {
    sessionHistory, sessionId, language,
    sidebarOpen, setSidebarOpen,
    clearChat, loadSession, deleteSession, deleteSessions,
  } = useChatStore();
  const [promptedThisOpen, setPromptedThisOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) {
      setPromptedThisOpen(false);
      return;
    }

    if (promptedThisOpen) return;
    setPromptedThisOpen(true);

    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const staleIds = sessionHistory
      .filter((session) => {
        const lastSeenRaw = session.lastViewedAt || session.createdAt;
        const lastSeen = typeof lastSeenRaw === 'string' ? new Date(lastSeenRaw) : lastSeenRaw;
        return now - lastSeen.getTime() > twoDaysMs;
      })
      .map((session) => session.id);

    if (staleIds.length === 0) return;

    const confirmed = window.confirm(
      staleIds.length === 1
        ? 'This chat has not been viewed in over 2 days. Do you want to delete it?'
        : `${staleIds.length} chats have not been viewed in over 2 days. Do you want to delete them?`
    );

    if (confirmed) {
      deleteSessions(staleIds);
    }
  }, [sidebarOpen, promptedThisOpen, sessionHistory, deleteSessions]);

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/30 z-30 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={cn(
        "fixed left-0 top-0 bottom-0 z-40 w-72",
        "bg-white/90 dark:bg-slate-900/80 border-r border-slate-200/70 dark:border-slate-700/70",
        "flex flex-col shadow-xl backdrop-blur-md",
        "lg:relative lg:shadow-none"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('sidebar.history')}
            </h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* New chat */}
        <div className="p-3">
          <button
            onClick={() => { clearChat(); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all",
              "bg-gradient-to-r from-blue-600 to-purple-600 text-white",
              "hover:shadow-lg hover:shadow-blue-500/20 text-sm font-medium"
            )}
          >
            <Plus className="w-4 h-4" />
            {t('chat.newChat')}
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {sessionHistory.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
              {t('sidebar.noSessions')}
            </p>
          ) : (
            sessionHistory.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === sessionId}
                language={language}
                onClick={() => loadSession(session.id)}
                onDelete={() => {
                  const confirmed = window.confirm('Delete this chat from your history?');
                  if (confirmed) deleteSession(session.id);
                }}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}

function SessionItem({ session, isActive, language, onClick, onDelete }: {
  session: SessionSummary;
  isActive: boolean;
  language: string;
  onClick: () => void;
  onDelete: () => void;
}) {
  const meta = SUBJECT_META.find(s => s.id === session.subject);
  const subjectLabel = meta?.label[language as keyof typeof meta.label] || meta?.label.EN || session.subject;

  return (
    <div
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-xl transition-all",
        isActive
          ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
          : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent"
      )}
    >
      <div className="flex items-start gap-2">
        <button onClick={onClick} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
              "bg-gradient-to-r text-white",
              meta?.color || "from-slate-400 to-slate-500"
            )}>
              {subjectLabel}
            </span>
            {session.topic && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {session.topic}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {session.preview}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
            <MessageSquare className="w-3 h-3" />
            <span>{session.messageCount} {t('sidebar.messages')}</span>
            <span className="ml-auto">{formatDate(session.createdAt)}</span>
          </div>
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
