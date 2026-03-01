export const FEATURE_FREEZE = (() => {
  const raw = String(import.meta.env.VITE_FEATURE_FREEZE || '').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
})();

export const VOICE_ENABLED = (() => {
  const raw = String(import.meta.env.VITE_ENABLE_VOICE || 'true').toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
})();
