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

export interface SelectedAccount {
  id: string;
  accountNumber: string;
  customerName?: string;
  currency?: string;
}

interface SessionState {
  backendUrl: string;
  recentUrls: string[];
  apiKey: string;
  keyRole: KeyRole;
  rememberKeyInSession: boolean;
  autoWake: boolean;
  recentEntities: RecentEntity[];
  selectedAccount: SelectedAccount | null;

  setBackendUrl: (url: string) => { success: boolean; error?: string; warning?: string };
  resetBackendUrl: () => void;
  setApiKey: (key: string, role?: KeyRole) => void;
  setKeyRole: (role: KeyRole) => void;
  verifyKeyRole: (keyToVerify?: string) => Promise<KeyRole>;
  setRememberKeyInSession: (remember: boolean) => void;
  setAutoWake: (autoWake: boolean) => void;
  clearKey: () => void;
  addRecentEntity: (entity: Omit<RecentEntity, 'createdAt'>) => void;
  clearRecentEntities: () => void;
  setSelectedAccount: (account: SelectedAccount | null) => void;
}

const DEFAULT_BACKEND_URL = (import.meta.env.VITE_DEFAULT_BACKEND_URL as string) || 'https://paybridge-xsf2.onrender.com';
const STORAGE_KEY_BACKEND_URL = 'paybridge_backend_url';
const STORAGE_KEY_RECENT_URLS = 'paybridge_recent_backend_urls';
const STORAGE_KEY_AUTO_WAKE = 'paybridge_auto_wake';
const SESSION_KEY_API_KEY = 'paybridge_session_api_key';
const SESSION_KEY_ROLE = 'paybridge_session_role';
const STORAGE_KEY_KNOWN_KEY_ROLES = 'paybridge_known_key_roles';
const STORAGE_KEY_RECENT_ENTITIES = 'paybridge_recent_entities';
const STORAGE_KEY_SELECTED_ACCOUNT = 'paybridge_selected_account';

export function getKnownKeyRole(key: string): KeyRole | null {
  try {
    const trimmed = key.trim();
    if (!trimmed) return null;
    const stored = localStorage.getItem(STORAGE_KEY_KNOWN_KEY_ROLES);
    if (stored) {
      const map: Record<string, KeyRole> = JSON.parse(stored);
      if (map[trimmed]) return map[trimmed];
      const prefix = trimmed.slice(0, 11);
      if (map[prefix]) return map[prefix];
    }
  } catch {
    // ignore
  }
  return null;
}

export function registerKnownKeyRole(key: string, role: KeyRole, prefix?: string) {
  try {
    const trimmed = key.trim();
    if (!trimmed) return;
    const stored = localStorage.getItem(STORAGE_KEY_KNOWN_KEY_ROLES);
    const map: Record<string, KeyRole> = stored ? JSON.parse(stored) : {};
    map[trimmed] = role;
    if (prefix) {
      map[prefix] = role;
    }
    const derivedPrefix = trimmed.slice(0, 11);
    map[derivedPrefix] = role;
    localStorage.setItem(STORAGE_KEY_KNOWN_KEY_ROLES, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function loadInitialSelectedAccount(): SelectedAccount | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY_SELECTED_ACCOUNT);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return null;
}

function loadInitialRecentEntities(): RecentEntity[] {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY_RECENT_ENTITIES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

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
      const knownRole = getKnownKeyRole(savedKey);
      return { key: savedKey, role: knownRole || savedRole || 'ADMIN' };
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
    recentEntities: loadInitialRecentEntities(),
    selectedAccount: loadInitialSelectedAccount(),

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

        try {
          sessionStorage.removeItem(STORAGE_KEY_RECENT_ENTITIES);
          sessionStorage.removeItem(STORAGE_KEY_SELECTED_ACCOUNT);
        } catch {
          // ignore
        }
        set({
          backendUrl: normalized,
          recentUrls: recent,
          apiKey: '',
          keyRole: 'ANONYMOUS',
          recentEntities: [],
          selectedAccount: null,
        });
      }

      return { success: true, warning: validation.warning };
    },

    resetBackendUrl: () => {
      get().setBackendUrl(DEFAULT_BACKEND_URL);
    },

    setApiKey: (key: string, role?: KeyRole) => {
      const trimmed = key.trim();
      if (!trimmed) {
        get().clearKey();
        return;
      }

      // Role is determined by the role scope picked when generating the key:
      // 1. Explicit role passed (e.g. key generation form on ApiKeysPage)
      // 2. Known generated keys registry (stored when key was generated)
      // 3. Fallback heuristic or existing session role
      let determinedRole: KeyRole =
        role ||
        getKnownKeyRole(trimmed) ||
        (trimmed.toLowerCase().includes('admin') || trimmed.startsWith('adm-')
          ? 'ADMIN'
          : get().keyRole !== 'ANONYMOUS'
          ? get().keyRole
          : 'ADMIN');

      if (role) {
        registerKnownKeyRole(trimmed, role);
      }

      if (get().rememberKeyInSession) {
        try {
          sessionStorage.setItem(SESSION_KEY_API_KEY, trimmed);
          sessionStorage.setItem(SESSION_KEY_ROLE, determinedRole);
        } catch {
          // ignore
        }
      }

      set({
        apiKey: trimmed,
        keyRole: determinedRole,
      });

      // Background probe: verify against server and register confirmed role
      get().verifyKeyRole(trimmed).catch(() => {});
    },

    setKeyRole: (role: KeyRole) => {
      set({ keyRole: role });
      if (get().rememberKeyInSession && get().apiKey) {
        try {
          sessionStorage.setItem(SESSION_KEY_ROLE, role);
        } catch {
          // ignore
        }
      }
    },

    verifyKeyRole: async (keyToVerify?: string): Promise<KeyRole> => {
      const activeKey = (keyToVerify || get().apiKey).trim();
      if (!activeKey) {
        set({ keyRole: 'ANONYMOUS' });
        return 'ANONYMOUS';
      }

      try {
        const res = await fetch(`${get().backendUrl}/api/admin/api-keys`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-API-Key': activeKey,
            'X-Request-Id': `probe-${Date.now().toString(36)}`,
          },
        });

        if (res.ok) {
          registerKnownKeyRole(activeKey, 'ADMIN');
          get().setKeyRole('ADMIN');
          return 'ADMIN';
        } else if (res.status === 403) {
          registerKnownKeyRole(activeKey, 'CLIENT');
          get().setKeyRole('CLIENT');
          return 'CLIENT';
        }
      } catch {
        // network or server asleep
      }

      return get().keyRole;
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
      set((state) => {
        const updated = [full, ...state.recentEntities.filter((e) => e.id !== entity.id)].slice(0, 50);
        try {
          sessionStorage.setItem(STORAGE_KEY_RECENT_ENTITIES, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { recentEntities: updated };
      });
    },

    clearRecentEntities: () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY_RECENT_ENTITIES);
      } catch {
        // ignore
      }
      set({ recentEntities: [] });
    },

    setSelectedAccount: (account) => {
      try {
        if (account) {
          sessionStorage.setItem(STORAGE_KEY_SELECTED_ACCOUNT, JSON.stringify(account));
        } else {
          sessionStorage.removeItem(STORAGE_KEY_SELECTED_ACCOUNT);
        }
      } catch {
        // ignore
      }
      set({ selectedAccount: account });
    },
  };
});
