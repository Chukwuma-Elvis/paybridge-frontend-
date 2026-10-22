import React, { useState } from 'react';
import { useInspectorStore } from '../../stores/inspectorStore';
import { X, Copy, Check, Terminal, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const RequestInspector: React.FC = () => {
  const { calls, selectedCallId, isOpen, selectCall, setOpen, clearCalls } = useInspectorStore();
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'curl'>('response');

  if (!isOpen) return null;

  const selectedCall = calls.find((c) => c.id === selectedCallId) || calls[0];

  const handleCopyCurl = () => {
    if (selectedCall) {
      navigator.clipboard.writeText(selectedCall.curl);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  return (
    <aside
      aria-label="Request Inspector"
      className="fixed inset-y-0 right-0 z-40 w-96 md:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col transition-all"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Request Inspector</h2>
          <span className="text-xs text-slate-400">({calls.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {calls.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-slate-500"
              onClick={clearCalls}
              title="Clear call history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            aria-label="Close Request Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center flex-1">
          <Terminal className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
          <p>No API requests recorded yet.</p>
          <p className="mt-1 text-[11px]">Click an action or run a demo step to inspect live HTTP traffic.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Recent Calls List Carousel / Selector */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 overflow-x-auto whitespace-nowrap flex gap-1.5">
            {calls.map((call) => {
              const isSelected = selectedCall?.id === call.id;
              const isError = typeof call.status === 'number' && (call.status === 0 || call.status >= 400);

              return (
                <button
                  key={call.id}
                  onClick={() => selectCall(call.id)}
                  className={`px-2 py-1 text-xs font-mono rounded border transition-colors flex items-center gap-1.5 shrink-0 select-none ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : isError
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                  }`}
                >
                  <span className="font-bold">{call.method}</span>
                  <span>{call.status}</span>
                </button>
              );
            })}
          </div>

          {selectedCall && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Summary Header */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCall.method}</span>
                    <Badge
                      variant={
                        selectedCall.status === 200 || selectedCall.status === 201 || selectedCall.status === 202
                          ? 'success'
                          : selectedCall.status === 429
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {selectedCall.status}
                    </Badge>
                    <span className="text-slate-500 font-mono">({selectedCall.durationMs}ms)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(selectedCall.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="font-mono text-xs break-all text-slate-700 dark:text-slate-300">
                  {selectedCall.url}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                  <span>X-Request-Id:</span>
                  <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{selectedCall.requestId}</span>
                </div>
              </div>

              {/* Tabs: Request / Response / cURL */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('response')}
                  className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'response'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Response
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('request')}
                  className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'request'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Request
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('curl')}
                  className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'curl'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  cURL
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'response' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Response Body</h4>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-md font-mono text-[11px] overflow-x-auto max-h-60 whitespace-pre-wrap break-all">
                      {selectedCall.responseBody
                        ? (() => {
                            try {
                              return JSON.stringify(JSON.parse(selectedCall.responseBody), null, 2);
                            } catch {
                              return selectedCall.responseBody;
                            }
                          })()
                        : '<Empty Body>'}
                    </pre>
                  </div>

                  {selectedCall.responseHeaders && (
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Response Headers</h4>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                        {Object.entries(selectedCall.responseHeaders).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-slate-500">{k}:</span>
                            <span className="text-slate-800 dark:text-slate-200 break-all">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'request' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Request Headers (Key Masked)</h4>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                      {Object.entries(selectedCall.requestHeaders).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-slate-800 dark:text-slate-200 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedCall.requestBody && (
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Request Body</h4>
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-md font-mono text-[11px] overflow-x-auto max-h-60 whitespace-pre-wrap break-all">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedCall.requestBody), null, 2);
                          } catch {
                            return selectedCall.requestBody;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'curl' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Copy safe cURL command with placeholder key:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={handleCopyCurl}
                      icon={copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedCurl ? 'Copied' : 'Copy cURL'}
                    </Button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-md font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                    {selectedCall.curl}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
