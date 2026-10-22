import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import {
  actionLog,
  LogEntry,
} from '../../services/actionLogService';
import { logStream, StreamStatus } from '../../services/logStreamService';
import { useLogDockStore, DockPosition, LogLevelFilter, LogSourceFilter } from '../../stores/logDockStore';
import { CorrelationChip } from './CorrelationChip';
import {
  Pause,
  Play,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  ArrowDownToLine,
  Maximize2,
  Minimize2,
  Radio,
  X,
} from 'lucide-react';
import { Button } from '../common/Button';

export const LiveLogDock: React.FC = () => {
  const {
    position,
    size,
    levelFilter,
    sourceFilter,
    searchQuery,
    requestIdFilter,
    hidePolling,
    isPaused,
    followTail,
    fontSize,
    setPosition,
    setSize,
    setLevelFilter,
    setSourceFilter,
    setSearchQuery,
    setRequestIdFilter,
    setHidePolling,
    togglePause,
    setFollowTail,
  } = useLogDockStore();

  const [allEntries, setAllEntries] = useState<LogEntry[]>([]);
  const [pausedBuffer, setPausedBuffer] = useState<LogEntry[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(logStream.getStatus());
  const [atBottom, setAtBottom] = useState(true);
  const [screenReaderSummary, setScreenReaderSummary] = useState('');

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(size);

  // Subscribe to action log
  useEffect(() => {
    return actionLog.subscribe((newEntries) => {
      if (isPaused) {
        setPausedBuffer((prev) => [...prev, ...newEntries.slice(allEntries.length)]);
      } else {
        setAllEntries([...newEntries]);
      }
    });
  }, [isPaused, allEntries.length]);

  // Subscribe to stream status
  useEffect(() => {
    return logStream.onStatusChange(setStreamStatus);
  }, []);

  // When unpausing, flush buffer
  const handleTogglePause = () => {
    if (isPaused) {
      setAllEntries((prev) => [...prev, ...pausedBuffer]);
      setPausedBuffer([]);
    }
    togglePause();
  };

  // Screen reader rate-limited announcement
  useEffect(() => {
    const timer = setInterval(() => {
      if (allEntries.length > 0) {
        const last10 = allEntries.slice(-10);
        const errCount = last10.filter((e) => e.level === 'ERROR').length;
        setScreenReaderSummary(`${allEntries.length} total lines recorded.${errCount > 0 ? ` ${errCount} recent errors.` : ''}`);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [allEntries.length]);

  // Filter entries
  const { filteredEntries, hiddenPollingCount } = useMemo(() => {
    let pollingCount = 0;

    const filtered = allEntries.filter((entry) => {
      if (entry.isPolling) {
        pollingCount++;
        if (hidePolling) return false;
      }

      // Source filter
      if (sourceFilter === 'console' && entry.source !== 'console') return false;
      if (sourceFilter === 'server' && entry.source !== 'server') return false;

      // Level filter
      if (levelFilter !== 'ALL' && entry.level !== levelFilter) return false;

      // Request ID correlation filter
      if (requestIdFilter && entry.requestId !== requestIdFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = entry.message.toLowerCase();
        const reqId = entry.requestId?.toLowerCase() || '';
        const url = entry.url?.toLowerCase() || '';
        if (!msg.includes(q) && !reqId.includes(q) && !url.includes(q)) {
          return false;
        }
      }

      return true;
    });

    return { filteredEntries: filtered, hiddenPollingCount: pollingCount };
  }, [allEntries, sourceFilter, levelFilter, requestIdFilter, searchQuery, hidePolling]);

  // Follow tail scroll
  useEffect(() => {
    if (followTail && virtuosoRef.current && filteredEntries.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: filteredEntries.length - 1,
        align: 'end',
        behavior: 'auto',
      });
    }
  }, [filteredEntries.length, followTail]);

  // Resize handling
  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = size;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const deltaY = startY.current - moveEvent.clientY;
      const newHeight = Math.max(160, Math.min(window.innerHeight - 100, startHeight.current + deltaY));
      setSize(newHeight);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDownload = () => {
    const text = actionLog.exportAsText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paybridge-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (position === 'hidden') {
    return (
      <button
        onClick={() => setPosition('bottom')}
        className="fixed bottom-3 right-4 z-30 px-3 py-1.5 bg-slate-900 text-slate-100 border border-slate-700 rounded-md shadow-lg text-xs font-mono flex items-center gap-2 hover:bg-slate-800 cursor-pointer"
        aria-label="Open Live Log dock"
      >
        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>Live Logs ({allEntries.length})</span>
      </button>
    );
  }

  const isBottom = position === 'bottom';

  return (
    <section
      aria-label="Live Log dock"
      style={isBottom ? { height: `${size}px` } : { width: `${size}px` }}
      className={`fixed z-30 bg-slate-950 text-slate-200 border-slate-800 shadow-2xl flex flex-col font-mono select-text transition-all ${
        isBottom ? 'bottom-0 inset-x-0 border-t' : 'right-0 inset-y-0 border-l'
      }`}
    >
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {screenReaderSummary}
      </div>

      {/* Resize handle */}
      {isBottom && (
        <div
          onMouseDown={handleMouseDown}
          className="h-1.5 w-full bg-slate-800/80 hover:bg-blue-600 cursor-row-resize transition-colors"
          title="Drag to resize Live Log dock"
        />
      )}

      {/* Dock Controls Toolbar */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Stream status + Source toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                streamStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : streamStatus === 'connecting' || streamStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-300">
              {streamStatus === 'connected'
                ? 'Stream Live'
                : streamStatus === 'disabled'
                ? 'Console-only (Stream Off)'
                : streamStatus}
            </span>
          </div>

          <div className="flex rounded border border-slate-700 bg-slate-950 p-0.5 text-[11px]">
            {(['both', 'console', 'server'] as LogSourceFilter[]).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sourceFilter === src ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {src.charAt(0).toUpperCase() + src.slice(1)}
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as LogLevelFilter)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter logs by level"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">INFO only</option>
            <option value="WARN">WARN only</option>
            <option value="ERROR">ERROR only</option>
          </select>
        </div>

        {/* Center: Search + Active Correlation chip */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter text / request id..."
              className="w-full bg-slate-950 border border-slate-700 rounded pl-7 pr-2 py-0.5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {requestIdFilter && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/60 border border-blue-600 rounded text-[11px] text-blue-200 whitespace-nowrap">
              <span>{requestIdFilter}</span>
              <button
                onClick={() => setRequestIdFilter(null)}
                className="hover:text-white"
                title="Clear request filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Hide Polling toggle */}
          <button
            onClick={() => setHidePolling(!hidePolling)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
              hidePolling
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-blue-950/60 text-blue-300 border-blue-700'
            }`}
            title="Toggle hiding internal health probes and polling lines"
          >
            Hide Polling {hiddenPollingCount > 0 && `(${hiddenPollingCount})`}
          </button>

          {/* Pause / Resume */}
          <Button
            size="sm"
            variant={isPaused ? 'danger' : 'ghost'}
            className="h-6 text-[11px] px-2 text-slate-300"
            onClick={handleTogglePause}
            icon={isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          >
            {isPaused ? `Resume (${pausedBuffer.length})` : 'Pause'}
          </Button>

          {/* Follow Tail */}
          <button
            onClick={() => setFollowTail(!followTail)}
            className={`p-1 rounded text-slate-400 hover:text-slate-200 ${
              followTail ? 'text-blue-400' : ''
            }`}
            title={followTail ? 'Auto-scroll on tail active' : 'Auto-scroll off'}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
            title="Download log history as TXT"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={() => actionLog.clear()}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
            title="Clear view (view only, does not affect server)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Close/Minimize */}
          <button
            onClick={() => setPosition('hidden')}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
            title="Hide dock"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Entries Virtualized Window */}
      <div className="flex-1 min-h-0 relative bg-slate-950">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No log lines match current filters.
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={filteredEntries}
            atBottomStateChange={(bottom) => setAtBottom(bottom)}
            itemContent={(_, entry) => {
              const isSent = entry.type === 'sent';
              const isFinished = entry.type === 'finished';
              const isAction = isSent || isFinished;
              const isCorrelated = requestIdFilter && entry.requestId === requestIdFilter;

              return (
                <div
                  key={entry.id}
                  className={`px-3 py-1 text-xs border-b border-slate-900/60 flex items-start gap-2 hover:bg-slate-900/40 font-mono transition-colors ${
                    isCorrelated ? 'bg-blue-950/40 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  {/* Timestamp */}
                  <span className="text-slate-500 text-[11px] shrink-0 select-none">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>

                  {/* Source Badge */}
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded shrink-0 select-none font-bold ${
                      entry.source === 'console'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}
                  >
                    {entry.source.toUpperCase()}
                  </span>

                  {/* Level Badge */}
                  <span
                    className={`text-[10px] font-bold shrink-0 select-none ${
                      entry.level === 'ERROR'
                        ? 'text-rose-400'
                        : entry.level === 'WARN'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {entry.level}
                  </span>

                  {/* Request ID chip */}
                  {entry.requestId && (
                    <CorrelationChip requestId={entry.requestId} />
                  )}

                  {/* Message body */}
                  <div className="flex-1 break-all">
                    {isSent ? (
                      <div className="text-purple-300">
                        <span className="font-bold">{entry.method}</span>{' '}
                        <span className="text-purple-200 select-all font-mono">{entry.url}</span>
                        {entry.label && <span className="text-slate-400 ml-1.5">({entry.label})</span>}
                      </div>
                    ) : isFinished ? (
                      <div className={entry.level === 'ERROR' ? 'text-rose-300 font-semibold' : 'text-emerald-300'}>
                        {entry.message}
                      </div>
                    ) : (
                      <span className="text-slate-200">{entry.message}</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}

        {/* Jump to latest button if user scrolled up */}
        {!atBottom && filteredEntries.length > 0 && (
          <button
            onClick={() => {
              virtuosoRef.current?.scrollToIndex({
                index: filteredEntries.length - 1,
                align: 'end',
                behavior: 'smooth',
              });
              setFollowTail(true);
            }}
            className="absolute bottom-3 right-4 z-10 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-md text-xs font-sans flex items-center gap-1 cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Jump to latest</span>
          </button>
        )}
      </div>
    </section>
  );
};
