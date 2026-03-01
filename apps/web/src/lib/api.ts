const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || '';

export function getApiBase(): string {
  return API_BASE;
}

function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vidya-chat-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { apiKey?: string | null };
    const key = parsed?.apiKey;
    return typeof key === 'string' && key.trim().length > 0 ? key : null;
  } catch {
    return null;
  }
}

function resolveApiKey(explicitKey?: string | null): string | null {
  if (explicitKey && explicitKey.trim().length > 0) return explicitKey;
  const stored = getStoredApiKey();
  if (stored) return stored;
  return PUBLIC_API_KEY && PUBLIC_API_KEY.trim().length > 0 ? PUBLIC_API_KEY : null;
}

export function getAuthHeader(explicitKey?: string | null): Record<string, string> {
  const key = resolveApiKey(explicitKey);
  return key ? { Authorization: `Bearer ${key}` } : {};
}

export function getJsonHeaders(explicitKey?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeader(explicitKey),
  };
}
