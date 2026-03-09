import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ChatInterface } from './components/chat/ChatInterface';
import { ProgressDashboard } from './components/progress/ProgressDashboard';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ParentReport } from './components/kid/ParentReport';
import { useChatStore, useIsKidMode } from './stores/chatStore';
import './i18n';

function App() {
  const { language, theme } = useChatStore();
  const isKidMode = useIsKidMode();

  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');

    const resolveTheme = () => {
      // Kid mode always forces light — bright colours, no dark theme for 3rd graders
      if (isKidMode) return 'light';
      if (theme === 'SYSTEM') {
        return media?.matches ? 'dark' : 'light';
      }
      return theme === 'DARK' ? 'dark' : 'light';
    };

    const applyTheme = () => {
      const mode = resolveTheme();
      root.classList.toggle('dark', mode === 'dark');
      root.style.colorScheme = mode;
    };

    applyTheme();
    if (isKidMode) return; // kid mode: no system-change listener needed
    if (theme !== 'SYSTEM' || !media) return;

    const handleChange = () => applyTheme();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme, isKidMode]);

  return (
    <BrowserRouter>
      <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        <Routes>
          <Route path="/" element={<ChatInterface />} />
          <Route path="/progress" element={<ProgressDashboard />} />
          <Route path="/dashboard" element={<DashboardLayout />} />
          <Route path="/privacy" element={<PrivacyNotice />} />
          <Route path="/parent-report" element={<ParentReport />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
