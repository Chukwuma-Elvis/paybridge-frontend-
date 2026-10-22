/**
 * Action Log & Live Log unified event system.
 * Implements plan section 7 and invariants 13 & 14.
 *
 * Interleaves:
 * 1. Console Action Log lines:
 *    - Sent: "→ POST https://paybridge.onrender.com/api/transfers [req-123] Create internal transfer"
 *    - Finished: "← 201 Created (142 ms) [req-123]"
 * 2. Server streamed log lines correlated by request id.
 */

export interface LogEntry {
  id: string;
  sequence?: number;
  timestamp: string;
  source: 'console' | 'server';
  type: 'sent' | 'finished' | 'wake_probe' | 'server_line' | 'gap';
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE';
  requestId?: string;
  message: string;
  method?: string;
  url?: string;
  endpoint?: string;
  label?: string;
  status?: number | string;
  durationMs?: number;
  isPolling?: boolean;
  requestBody?: string;
  responseBody?: string;
  headers?: Record<string, string>;
}

type Listener = (entries: LogEntry[]) => void;

class ActionLogService {
  private entries: LogEntry[] = [];
  private listeners: Set<Listener> = new Set();
  private maxEntries = 5000;

  getEntries(): LogEntry[] {
    return this.entries;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.entries);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.entries);
    }
  }

  addEntry(entry: Omit<LogEntry, 'id'>): LogEntry {
    const fullEntry: LogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };

    this.entries.push(fullEntry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    this.notify();
    return fullEntry;
  }

  logRequestSent(options: {
    requestId: string;
    method: string;
    url: string;
    label?: string;
    isPolling?: boolean;
    requestBody?: string;
    headers?: Record<string, string>;
  }): LogEntry {
    const cleanUrl = options.url;
    const msg = `→ ${options.method.toUpperCase()} ${cleanUrl} ${options.label ? `(${options.label})` : ''}`;

    return this.addEntry({
      timestamp: new Date().toISOString(),
      source: 'console',
      type: 'sent',
      level: 'INFO',
      requestId: options.requestId,
      method: options.method.toUpperCase(),
      url: cleanUrl,
      endpoint: cleanUrl,
      label: options.label,
      isPolling: options.isPolling,
      requestBody: options.requestBody,
      headers: options.headers,
      message: msg,
    });
  }

  logRequestFinished(options: {
    requestId: string;
    status: number | string;
    durationMs: number;
    error?: string;
    isPolling?: boolean;
    responseBody?: string;
  }): LogEntry {
    const isError = typeof options.status === 'number' && options.status >= 400;
    const statusText = options.error ? `Error: ${options.error}` : options.status;
    const msg = `← ${statusText} (${options.durationMs}ms)`;

    return this.addEntry({
      timestamp: new Date().toISOString(),
      source: 'console',
      type: 'finished',
      level: isError ? 'ERROR' : 'INFO',
      requestId: options.requestId,
      status: options.status,
      durationMs: options.durationMs,
      isPolling: options.isPolling,
      responseBody: options.responseBody,
      message: msg,
    });
  }

  logWakeProbe(options: {
    attempt: number;
    url: string;
    status: number | string;
    durationMs: number;
    isUp: boolean;
  }): LogEntry {
    const msg = `→ GET ${options.url} [Probe #${options.attempt}] Result: ${options.status} (${options.durationMs}ms)`;
    return this.addEntry({
      timestamp: new Date().toISOString(),
      source: 'console',
      type: 'wake_probe',
      level: options.isUp ? 'INFO' : 'WARN',
      status: options.status,
      durationMs: options.durationMs,
      message: msg,
    });
  }

  addServerLog(line: {
    sequence: number;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE';
    logger: string;
    message: string;
    requestId?: string;
  }): LogEntry {
    return this.addEntry({
      sequence: line.sequence,
      timestamp: line.timestamp,
      source: 'server',
      type: 'server_line',
      level: line.level,
      requestId: line.requestId,
      message: `[${line.logger}] ${line.message}`,
    });
  }

  addGapMarker(startSeq: number, endSeq: number): LogEntry {
    return this.addEntry({
      timestamp: new Date().toISOString(),
      source: 'server',
      type: 'gap',
      level: 'WARN',
      message: `--- [Log Buffer Gap: Lines ${startSeq} through ${endSeq} dropped due to buffer wrap] ---`,
    });
  }

  clear() {
    this.entries = [];
    this.notify();
  }

  exportAsText(): string {
    return this.entries
      .map((e) => {
        const idPart = e.requestId ? `[${e.requestId}] ` : '';
        return `${e.timestamp} [${e.source.toUpperCase()}] [${e.level}] ${idPart}${e.message}`;
      })
      .join('\n');
  }
}

export const actionLog = new ActionLogService();
