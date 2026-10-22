/**
 * Live Log stream service using Fetch Streaming Reader.
 * Implements plan section 7, Decision D4, and Step 35.
 *
 * Rules:
 * - Uses Fetch reader because standard EventSource cannot send X-API-Key header.
 * - Reconnects on disconnect with exponential backoff.
 * - Remembers highest sequence number for catch-up on reconnect.
 * - Inserts gap marker if sequence number jump indicates missed lines.
 */

import { useSessionStore } from '../stores/sessionStore';
import { actionLog } from './actionLogService';

export type StreamStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'disabled';

class LogStreamService {
  private status: StreamStatus = 'disconnected';
  private abortController: AbortController | null = null;
  private lastSequence = 0;
  private reconnectAttempt = 0;
  private reconnectTimeout: any = null;
  private isExplicitlyStopped = false;
  private statusListeners: Set<(status: StreamStatus) => void> = new Set();

  getStatus(): StreamStatus {
    return this.status;
  }

  onStatusChange(listener: (status: StreamStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: StreamStatus) {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  start() {
    this.isExplicitlyStopped = false;
    this.connect();
  }

  stop() {
    this.isExplicitlyStopped = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setStatus('disconnected');
  }

  private async connect() {
    if (this.isExplicitlyStopped) return;

    const session = useSessionStore.getState();
    const apiKey = session.apiKey;

    // Stream requires admin key per back-end spec Step 30
    if (!apiKey) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    this.abortController = new AbortController();

    const streamUrl = `${session.backendUrl}/api/admin/logs/stream${
      this.lastSequence > 0 ? `?afterSequence=${this.lastSequence}` : ''
    }`;

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'X-API-Key': apiKey,
        },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          this.setStatus('disabled');
          return;
        }
        if (response.status === 404) {
          // Stream endpoint not enabled on back end
          this.setStatus('disabled');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      this.setStatus('connected');
      this.reconnectAttempt = 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!this.isExplicitlyStopped) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          this.parseBlock(block);
        }
      }

      this.handleDisconnect();
    } catch (err: any) {
      if (err.name !== 'AbortError' && !this.isExplicitlyStopped) {
        this.handleDisconnect();
      }
    }
  }

  private parseBlock(block: string) {
    if (!block.trim()) return;

    // Extract event and data from SSE block
    const lines = block.split('\n');
    let eventType = 'message';
    let dataStr = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        dataStr += line.substring(5).trim();
      }
    }

    if (!dataStr) return;

    if (eventType === 'keep-alive') {
      return;
    }

    try {
      const parsed = JSON.parse(dataStr);
      if (parsed.sequence) {
        if (this.lastSequence > 0 && parsed.sequence > this.lastSequence + 1) {
          actionLog.addGapMarker(this.lastSequence + 1, parsed.sequence - 1);
        }
        this.lastSequence = parsed.sequence;
      }

      actionLog.addServerLog({
        sequence: parsed.sequence || Date.now(),
        timestamp: parsed.timestamp || new Date().toISOString(),
        level: parsed.level || 'INFO',
        logger: parsed.logger || 'server',
        message: parsed.message || dataStr,
        requestId: parsed.requestId,
      });
    } catch {
      actionLog.addServerLog({
        sequence: ++this.lastSequence,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'server',
        message: dataStr,
      });
    }
  }

  private handleDisconnect() {
    if (this.isExplicitlyStopped) return;

    this.setStatus('reconnecting');
    this.reconnectAttempt++;
    // Exponential backoff capped at 15s
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempt), 15000);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const logStream = new LogStreamService();
