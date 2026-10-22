import { create } from 'zustand';
import { useSessionStore } from '../stores/sessionStore';
import { actionLog } from './actionLogService';

export type WakeStatus = 'idle' | 'checking' | 'waking' | 'awake' | 'failed' | 'cancelled';

interface WakeState {
  status: WakeStatus;
  elapsedSeconds: number;
  attempts: number;
  lastProbeStatus: string;
  isWaking: boolean;
  startWake: () => Promise<boolean>;
  cancelWake: () => void;
  checkHealthOnce: () => Promise<boolean>;
}

let wakeIntervalTimer: any = null;
let wakeActive = false;

export const useWakeStore = create<WakeState>((set, get) => ({
  status: 'idle',
  elapsedSeconds: 0,
  attempts: 0,
  lastProbeStatus: '',
  isWaking: false,

  cancelWake: () => {
    wakeActive = false;
    if (wakeIntervalTimer) {
      clearTimeout(wakeIntervalTimer);
      wakeIntervalTimer = null;
    }
    set({
      status: 'cancelled',
      isWaking: false,
    });
  },

  checkHealthOnce: async () => {
    const backendUrl = useSessionStore.getState().backendUrl;
    const healthUrl = `${backendUrl}/actuator/health`;
    const start = performance.now();

    try {
      set({ status: 'checking' });
      const resp = await fetch(healthUrl, { method: 'GET', headers: { Accept: 'application/json' } });
      const durationMs = Math.round(performance.now() - start);

      if (resp.ok) {
        const body = await resp.json().catch(() => ({}));
        const isUp = body.status === 'UP' || resp.status === 200;

        actionLog.logWakeProbe({
          attempt: 1,
          url: healthUrl,
          status: resp.status,
          durationMs,
          isUp,
        });

        if (isUp) {
          set({ status: 'awake', lastProbeStatus: '200 UP', isWaking: false });
          return true;
        }
      }

      actionLog.logWakeProbe({
        attempt: 1,
        url: healthUrl,
        status: resp.status,
        durationMs,
        isUp: false,
      });
      set({ status: 'waking', lastProbeStatus: `${resp.status} starting`, isWaking: false });
      return false;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      actionLog.logWakeProbe({
        attempt: 1,
        url: healthUrl,
        status: 'Unreachable',
        durationMs,
        isUp: false,
      });
      set({ status: 'waking', lastProbeStatus: '502/sleeping', isWaking: false });
      return false;
    }
  },

  startWake: async () => {
    if (get().isWaking) return false;

    wakeActive = true;
    set({
      status: 'waking',
      elapsedSeconds: 0,
      attempts: 0,
      lastProbeStatus: 'Starting probes...',
      isWaking: true,
    });

    const startTime = Date.now();
    const ticker = setInterval(() => {
      if (!wakeActive) {
        clearInterval(ticker);
        return;
      }
      set({ elapsedSeconds: Math.floor((Date.now() - startTime) / 1000) });
    }, 1000);

    const backoffSchedule = [2000, 3000, 4000, 6000, 8000, 10000, 15000];
    let attempt = 0;
    const maxDurationSeconds = 600; // 10 minutes limit

    while (wakeActive) {
      attempt++;
      set({ attempts: attempt });

      const backendUrl = useSessionStore.getState().backendUrl;
      const healthUrl = `${backendUrl}/actuator/health`;
      const probeStart = performance.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const resp = await fetch(healthUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const durationMs = Math.round(performance.now() - probeStart);

        if (resp.ok) {
          const body = await resp.json().catch(() => ({}));
          const isUp = body.status === 'UP' || resp.status === 200;

          actionLog.logWakeProbe({
            attempt,
            url: healthUrl,
            status: `${resp.status} UP`,
            durationMs,
            isUp: true,
          });

          if (isUp) {
            wakeActive = false;
            clearInterval(ticker);
            set({
              status: 'awake',
              lastProbeStatus: '200 UP',
              isWaking: false,
            });
            return true;
          }
        } else {
          // 502/503 is expected while waking
          const statusLabel = `${resp.status} waking`;
          actionLog.logWakeProbe({
            attempt,
            url: healthUrl,
            status: statusLabel,
            durationMs,
            isUp: false,
          });
          set({ lastProbeStatus: statusLabel });
        }
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - probeStart);
        const isTimeout = err.name === 'AbortError';
        const label = isTimeout ? 'Timeout (waking)' : 'Connection refused (waking)';

        actionLog.logWakeProbe({
          attempt,
          url: healthUrl,
          status: label,
          durationMs,
          isUp: false,
        });
        set({ lastProbeStatus: label });
      }

      // Check timeout
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed >= maxDurationSeconds) {
        wakeActive = false;
        clearInterval(ticker);
        set({
          status: 'failed',
          lastProbeStatus: 'Wake timed out after 10 minutes',
          isWaking: false,
        });
        return false;
      }

      // Backoff delay
      const delay = backoffSchedule[Math.min(attempt - 1, backoffSchedule.length - 1)];
      await new Promise((resolve) => {
        wakeIntervalTimer = setTimeout(resolve, delay);
      });
    }

    clearInterval(ticker);
    set({ isWaking: false });
    return false;
  },
}));
