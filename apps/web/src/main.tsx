import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import 'katex/dist/katex.min.css';

// Microsoft Clarity session recording — only loads when VITE_CLARITY_ID is set
// Get your free project ID at https://clarity.microsoft.com (takes ~30 seconds)
// Then add VITE_CLARITY_ID=your_project_id to your .env file
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID as string | undefined;
if (CLARITY_ID) {
  (function (c: Window & typeof globalThis, l: Document, a: string, r: string, i: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any)[a] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any)[a] ||
      function (...args: unknown[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((c as any)[a].q = (c as any)[a].q || []).push(args);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/' + i;
    const y = l.getElementsByTagName(r)[0];
    y?.parentNode?.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
