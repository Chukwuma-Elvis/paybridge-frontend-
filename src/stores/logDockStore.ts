import { create } from 'zustand';

export type DockPosition = 'bottom' | 'right' | 'hidden';
export type LogLevelFilter = 'ALL' | 'INFO' | 'WARN' | 'ERROR';
export type LogSourceFilter = 'both' | 'console' | 'server';
export type LogFontSize = 'xs' | 'sm' | 'base';

interface LogDockState {
  position: DockPosition;
  size: number;
  levelFilter: LogLevelFilter;
  sourceFilter: LogSourceFilter;
  searchQuery: string;
  requestIdFilter: string | null;
  onlyMine: boolean;
  hidePolling: boolean;
  isPaused: boolean;
  followTail: boolean;
  fontSize: LogFontSize;

  setPosition: (pos: DockPosition) => void;
  setSize: (size: number) => void;
  setLevelFilter: (level: LogLevelFilter) => void;
  setSourceFilter: (source: LogSourceFilter) => void;
  setSearchQuery: (query: string) => void;
  setRequestIdFilter: (reqId: string | null) => void;
  setOnlyMine: (onlyMine: boolean) => void;
  setHidePolling: (hide: boolean) => void;
  togglePause: () => void;
  setFollowTail: (follow: boolean) => void;
  setFontSize: (size: LogFontSize) => void;
}

const STORAGE_KEY_DOCK_POS = 'paybridge_logdock_pos';
const STORAGE_KEY_DOCK_SIZE = 'paybridge_logdock_size';

export const useLogDockStore = create<LogDockState>((set) => ({
  position: (localStorage.getItem(STORAGE_KEY_DOCK_POS) as DockPosition) || 'bottom',
  size: Number(localStorage.getItem(STORAGE_KEY_DOCK_SIZE)) || 280,
  levelFilter: 'ALL',
  sourceFilter: 'both',
  searchQuery: '',
  requestIdFilter: null,
  onlyMine: false,
  hidePolling: true,
  isPaused: false,
  followTail: true,
  fontSize: 'sm',

  setPosition: (position) => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCK_POS, position);
    } catch {
      // ignore
    }
    set({ position });
  },

  setSize: (size) => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCK_SIZE, String(size));
    } catch {
      // ignore
    }
    set({ size });
  },

  setLevelFilter: (levelFilter) => set({ levelFilter }),
  setSourceFilter: (sourceFilter) => set({ sourceFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRequestIdFilter: (requestIdFilter) => set({ requestIdFilter }),
  setOnlyMine: (onlyMine) => set({ onlyMine }),
  setHidePolling: (hidePolling) => set({ hidePolling }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setFollowTail: (followTail) => set({ followTail }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
