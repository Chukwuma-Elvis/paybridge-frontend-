import { create } from 'zustand';
import { validateBackendAddress } from '../utils/security';

export type KeyRole = 'ADMIN' | 'CLIENT' | 'ANONYMOUS';

export interface RecentEntity {
  id: string;
  label: string;
  type: 'customer' | 'account' | 'beneficiary' | 'remittance' | 'quote';
  details?: Record<string, any>;
  createdAt: string;
}

interface SessionState {
  backendUrl: string;
  recentUrls: string[];
  apiKey: string;
  keyRole: KeyRole;
  rememberKeyInSession: boolean;
  autoWake: boolean;
  recentEntities: RecentEntity[];

  setBackendUrl: (url: string) => { success: boolean; error?: string; warning?: string };
  resetBackendUrl: () => void;
  setApiKey: (key: string, role?: KeyRole) => void;
  setRememberKeyInSession: (remember: boolean) => void;
  setAutoWake: (autoWake: boolean) => void;
  clearKey: () => void;
  addRecentEntity: (entity: Omit<RecentEntity, 'createdAt'>) => void;
  clearRecentEntities: () => void;
}

const DEFAULT_BACKEND_URL = (import.meta.env.VITE_DEFAULT_BACKEND_URL as string) || 'https://paybridge-xsf2.onrender.com';
const STORAGE_KEY_BACKEND_URL = 'paybridge_backend_url';
const STORAGE_KEY_RECENT_URLS = 'paybridge_recent_backend_urls';
const STORAGE_KEY_AUTO_WAKE = 'paybridge_auto_wake';
const SESSION_KEY_API_KEY = 'paybridge_session_api_key';
const SESSION_KEY_ROLE = 'paybridge_session_role';

function loadInitialBackendUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BACKEND_URL);
    if (saved) {
      const validation = validateBackendAddress(saved);
      if (validation.isValid) return validation.normalizedUrl;
    }
  } catch {
    // ignore storage access errors
  }
  return DEFAULT_BACKEND_URL;
}

function loadInitialRecentUrls(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECENT_URLS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.slice(0, 5);
    }
  } catch {
    // ignore
  }
  return [DEFAULT_BACKEND_URL];
}

function loadInitialApiKey(): { key: string; role: KeyRole } {
  try {
    const savedKey = sessionStorage.getItem(SESSION_KEY_API_KEY);
    const savedRole = sessionStorage.getItem(SESSION_KEY_ROLE) as KeyRole | null;
    if (savedKey) {
      return { key: savedKey, role: savedRole || 'CLIENT' };
    }
  } catch {
    // ignore
  }
  return { key: '', role: 'ANONYMOUS' };
}

export const useSessionStore = create<SessionState>((set, get) => {
  const initialKey = loadInitialApiKey();

  return {
    backendUrl: loadInitialBackendUrl(),
    recentUrls: loadInitialRecentUrls(),
    apiKey: initialKey.key,
    keyRole: initialKey.role,
    rememberKeyInSession: Boolean(initialKey.key),
    autoWake: localStorage.getItem(STORAGE_KEY_AUTO_WAKE) !== 'false',
    recentEntities: [],

    setBackendUrl: (urlInput: string) => {
      const validation = validateBackendAddress(urlInput);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const normalized = validation.normalizedUrl;
      const current = get().backendUrl;

      // Invariant 13: Changing backend address forgets the session key and clears cached data
      if (current !== normalized) {
        try {
          sessionStorage.removeItem(SESSION_KEY_API_KEY);
          sessionStorage.removeItem(SESSION_KEY_ROLE);
        } catch {
          // ignore
        }

        const recent = Array.from(new Set([normalized, ...get().recentUrls])).slice(0, 5);
        try {
          localStorage.setItem(STORAGE_KEY_BACKEND_URL, normalized);
          localStorage.setItem(STORAGE_KEY_RECENT_URLS, JSON.stringify(recent));
        } catch {
          // ignore
        }

        set({
          backendUrl: normalized,
          recentUrls: recent,
          apiKey: '',
          keyRole: 'ANONYMOUS',
          recentEntities: [],
        });
      }

      return { success: true, warning: validation.warning };
    },

    resetBackendUrl: () => {
      get().setBackendUrl(DEFAULT_BACKEND_URL);
    },

    setApiKey: (key: string, role?: KeyRole) => {
      const trimmed = key.trim();
      let detectedRole: KeyRole = role || 'CLIENT';
      if (!role) {
        // Simple heuristic: admin keys in paybridge typically start with 'adm' or are configured as such
        if (trimmed.toLowerCase().includes('admin') || trimmed.startsWith('adm-')) {
          detectedRole = 'ADMIN';
        }
      }

      if (get().rememberKeyInSession) {
        try {
          if (trimmed) {
            sessionStorage.setItem(SESSION_KEY_API_KEY, trimmed);
            sessionStorage.setItem(SESSION_KEY_ROLE, detectedRole);
          } else {
            sessionStorage.removeItem(SESSION_KEY_API_KEY);
            sessionStorage.removeItem(SESSION_KEY_ROLE);
          }
        } catch {
          // ignore
        }
      }

      set({
        apiKey: trimmed,
        keyRole: trimmed ? detectedRole : 'ANONYMOUS',
      });
    },

    setRememberKeyInSession: (remember: boolean) => {
      set({ rememberKeyInSession: remember });
      try {
        if (!remember) {
          sessionStorage.removeItem(SESSION_KEY_API_KEY);
          sessionStorage.removeItem(SESSION_KEY_ROLE);
        } else if (get().apiKey) {
          sessionStorage.setItem(SESSION_KEY_API_KEY, get().apiKey);
          sessionStorage.setItem(SESSION_KEY_ROLE, get().keyRole);
        }
      } catch {
        // ignore
      }
    },

    setAutoWake: (autoWake: boolean) => {
      set({ autoWake });
      try {
        localStorage.setItem(STORAGE_KEY_AUTO_WAKE, String(autoWake));
      } catch {
        // ignore
      }
    },

    clearKey: () => {
      try {
        sessionStorage.removeItem(SESSION_KEY_API_KEY);
        sessionStorage.removeItem(SESSION_KEY_ROLE);
      } catch {
        // ignore
      }
      set({ apiKey: '', keyRole: 'ANONYMOUS' });
    },

    addRecentEntity: (entity) => {
      const full: RecentEntity = {
        ...entity,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        recentEntities: [full, ...state.recentEntities.filter((e) => e.id !== entity.id)].slice(0, 50),
      }));
    },

    clearRecentEntities: () => {
      set({ recentEntities: [] });
    },
  };
});
