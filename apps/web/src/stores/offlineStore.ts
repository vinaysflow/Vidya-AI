import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { getApiBase, getAuthHeader } from '../lib/api';

const API_BASE = getApiBase();

interface OfflinePack {
  subject: string;
  version: string;
  concepts: Array<{ key: string; name: string; description: string; hints: string[] }>;
  flashcards: Array<{ front: string; back: string; concept: string }>;
  quizBank: Array<{ prompt: string; options: string[]; answer: string; concept: string }>;
  socraticStarters: string[];
}

interface OfflineState {
  isOnline: boolean;
  downloadedSubjects: string[];
  isDownloading: boolean;

  setOnline: (online: boolean) => void;
  downloadPack: (subject: string) => Promise<void>;
  removePack: (subject: string) => Promise<void>;
  getPack: (subject: string) => Promise<OfflinePack | null>;
  loadDownloadedList: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, getState) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  downloadedSubjects: [],
  isDownloading: false,

  setOnline: (online) => set({ isOnline: online }),

  downloadPack: async (subject) => {
    set({ isDownloading: true });
    try {
      const res = await fetch(`${API_BASE}/api/offline/pack/${subject}`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success) {
        await idbSet(`offline-pack-${subject}`, data.pack);
        const list = getState().downloadedSubjects;
        if (!list.includes(subject)) {
          const updated = [...list, subject];
          await idbSet('offline-subjects', updated);
          set({ downloadedSubjects: updated });
        }
      }
    } catch (err) {
      console.error('Failed to download pack:', err);
    } finally {
      set({ isDownloading: false });
    }
  },

  removePack: async (subject) => {
    await idbDel(`offline-pack-${subject}`);
    const updated = getState().downloadedSubjects.filter((s) => s !== subject);
    await idbSet('offline-subjects', updated);
    set({ downloadedSubjects: updated });
  },

  getPack: async (subject) => {
    return (await idbGet(`offline-pack-${subject}`)) || null;
  },

  loadDownloadedList: async () => {
    const list = (await idbGet('offline-subjects')) || [];
    set({ downloadedSubjects: list as string[] });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useOfflineStore.getState().setOnline(true));
  window.addEventListener('offline', () => useOfflineStore.getState().setOnline(false));
}
