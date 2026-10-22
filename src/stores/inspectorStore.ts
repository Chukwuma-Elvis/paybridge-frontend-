import { create } from 'zustand';

export interface RecordedCall {
  id: string;
  requestId: string;
  method: string;
  url: string;
  status: number | string;
  durationMs: number;
  timestamp: string;
  label?: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  curl: string;
  error?: string;
}

interface InspectorState {
  calls: RecordedCall[];
  selectedCallId: string | null;
  isOpen: boolean;

  recordCall: (call: RecordedCall) => void;
  selectCall: (callId: string | null) => void;
  selectByRequestId: (requestId: string) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  clearCalls: () => void;
}

export const useInspectorStore = create<InspectorState>((set, get) => ({
  calls: [],
  selectedCallId: null,
  isOpen: false,

  recordCall: (call: RecordedCall) => {
    set((state) => ({
      calls: [call, ...state.calls.filter((c) => c.id !== call.id)].slice(0, 50),
      selectedCallId: state.selectedCallId ? state.selectedCallId : call.id,
    }));
  },

  selectCall: (callId: string | null) => {
    set({ selectedCallId: callId });
  },

  selectByRequestId: (requestId: string) => {
    const found = get().calls.find((c) => c.requestId === requestId);
    if (found) {
      set({ selectedCallId: found.id, isOpen: true });
    }
  },

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open: boolean) => set({ isOpen: open }),
  clearCalls: () => set({ calls: [], selectedCallId: null }),
}));
