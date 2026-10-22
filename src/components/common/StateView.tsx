import React from 'react';
import { Loader2, AlertCircle, ShieldX, Clock, Moon, Sparkles, Inbox } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';
import { useWakeStore } from '../../services/wakeService';
import { useSessionStore } from '../../stores/sessionStore';
import { useNavigate } from 'react-router-dom';

interface StateViewProps {
  state: 'loading' | 'empty' | 'error' | 'asleep' | 'rate-limited' | 'unauthorized';
  title?: string;
  message?: string;
  requestId?: string;
  retryAfterSeconds?: number;
  onRetry?: () => void;
  actionText?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export const StateView: React.FC<StateViewProps> = ({
  state,
  title,
  message,
  requestId,
  retryAfterSeconds,
  onRetry,
  actionText,
  onAction,
  children,
}) => {
  const navigate = useNavigate();
  const wake = useWakeStore();
  const session = useSessionStore();

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-3" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title || 'Loading data...'}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message || 'Fetching from backend...'}</p>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <Inbox className="w-5 h-5" aria-hidden="true" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title || 'No items found'}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {message || 'No records match the current criteria or none have been created yet.'}
        </p>
        {(actionText || onAction) && (
          <div className="mt-4">
            <Button size="sm" onClick={onAction}>
              {actionText || 'Create Item'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (state === 'asleep') {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
        <Moon className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {title || 'Backend API is Asleep on Render Free Tier'}
        </h4>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 max-w-md">
          {message ||
            'Render free services spin down after 15 minutes of inactivity. Waking takes 4 to 5 minutes. The console probes the health endpoint automatically until it reports UP.'}
        </p>

        <div className="mt-4 flex flex-col items-center gap-2">
          {wake.isWaking ? (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-900/40 px-3 py-1.5 rounded-md">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Waking server... Elapsed: {wake.elapsedSeconds}s (Probe #{wake.attempts})</span>
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-amber-900" onClick={wake.cancelWake}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => wake.startWake()}>
                Wake Service Now
              </Button>
              <Button size="sm" variant="outline" onClick={() => wake.checkHealthOnce()}>
                Check Health
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state === 'rate-limited') {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" aria-hidden="true" />
        <Badge variant="warning">HTTP 429: Too Many Requests</Badge>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">
          {title || 'Rate Limit Reached'}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">
          {message || 'The server rate limiter paused requests from this client to protect sandbox resources.'}
        </p>
        {retryAfterSeconds !== undefined && (
          <div className="mt-3 font-mono text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-3 py-1 rounded">
            Retry-After: {retryAfterSeconds} seconds
          </div>
        )}
        {onRetry && (
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (state === 'unauthorized') {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <ShieldX className="w-8 h-8 text-rose-500 mb-2" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title || 'Authentication Required'}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md">
          {message ||
            (session.keyRole === 'CLIENT'
              ? 'This endpoint requires an ADMIN API key. Your current key has CLIENT privileges.'
              : 'You must paste a valid API key to access this feature.')}
        </p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="primary" onClick={() => navigate('/connect')}>
            Go to Connect / Paste Key
          </Button>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Error default
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg">
      <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mb-2" aria-hidden="true" />
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title || 'An Error Occurred'}</h4>
      <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-md font-mono">{message || 'Unknown request error'}</p>
      {requestId && (
        <div className="mt-2 text-xs text-slate-500 font-mono">
          Request ID: <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{requestId}</span>
        </div>
      )}
      {children}
      {onRetry && (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
};
