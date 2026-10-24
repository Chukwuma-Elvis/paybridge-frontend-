import React, { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useWakeStore } from '../../services/wakeService';
import { useInspectorStore } from '../../stores/inspectorStore';
import { useLogDockStore } from '../../stores/logDockStore';
import {
  Sparkles,
  Key,
  Terminal,
  Radio,
  BookOpen,
  Compass,
  FileCode2,
  ExternalLink,
  Loader2,
  Moon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { backendUrl, apiKey, keyRole } = useSessionStore();
  const wake = useWakeStore();
  const { calls, isOpen: isInspectorOpen, toggleOpen: toggleInspector } = useInspectorStore();
  const { position: dockPosition, setPosition: setDockPosition } = useLogDockStore();

  const isGuided = location.pathname.startsWith('/guided');

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0 z-20">
      {/* Brand & Mode */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100 hover:opacity-90">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
            PB
          </div>
          <span className="hidden sm:inline">PayBridge Console</span>
        </Link>

        {/* Guided vs Explorer Toggle */}
        <div className="flex rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-0.5 text-xs font-medium">
          <button
            onClick={() => navigate('/guided/1')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              isGuided
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Guided Demo</span>
          </button>
          <button
            onClick={() => navigate('/customers')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              !isGuided
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Explorer</span>
          </button>
        </div>
      </div>

      {/* Center: Backend Address & Status */}
      <div className="flex items-center gap-2">
        <Link
          to="/connect"
          className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:border-blue-400 transition-colors"
          title="Click to change backend address or manage session key"
        >
          <span className="text-slate-400">API:</span>
          <span className="max-w-[140px] md:max-w-[200px] truncate">{backendUrl.replace(/^https?:\/\//, '')}</span>
        </Link>

        {/* Wake Status & Action */}
        {wake.status === 'awake' ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Awake</span>
          </div>
        ) : wake.isWaking ? (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Waking ({wake.elapsedSeconds}s)</span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50"
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
            onClick={() => wake.startWake()}
          >
            Wake API
          </Button>
        )}
      </div>

      {/* Right Controls: Role, Swagger, Inspector, Log */}
      <div className="flex items-center gap-2">
        {/* Key Role Indicator */}
        {apiKey ? (
          <Link
            to="/connect"
            title={`Active API Key Scope: ${keyRole} (determined by scope chosen when key was generated). Click to configure in Connect.`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-blue-400 transition-colors shadow-xs"
          >
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span className={keyRole === 'ADMIN' ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-blue-600 dark:text-blue-400 font-bold'}>
              {keyRole === 'ADMIN' ? '👑 ADMIN' : '👤 CLIENT'}
            </span>
          </Link>
        ) : (
          <Link to="/connect">
            <Badge variant="warning" size="sm" className="cursor-pointer hover:opacity-85">
              <Key className="w-3 h-3 mr-0.5" />
              <span>No Key</span>
            </Badge>
          </Link>
        )}

        {/* Swagger Link */}
        <a
          href={`${backendUrl}/swagger-ui/index.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Open API Swagger Documentation"
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Swagger</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>

        {/* Request Inspector Toggle */}
        <Button
          size="sm"
          variant={isInspectorOpen ? 'primary' : 'outline'}
          className="h-8 px-2.5 text-xs"
          onClick={toggleInspector}
          icon={<Terminal className="w-3.5 h-3.5" />}
          title="Toggle Request Inspector"
        >
          <span className="hidden sm:inline">Inspector</span>
          {calls.length > 0 && <span className="ml-1 opacity-80">({calls.length})</span>}
        </Button>

        {/* Live Log Dock Toggle */}
        <Button
          size="sm"
          variant={dockPosition !== 'hidden' ? 'secondary' : 'outline'}
          className="h-8 px-2.5 text-xs"
          onClick={() => setDockPosition(dockPosition === 'hidden' ? 'bottom' : 'hidden')}
          icon={<Radio className="w-3.5 h-3.5 text-blue-500" />}
          title="Toggle Live Log Dock"
        >
          <span className="hidden sm:inline">Logs</span>
        </Button>
      </div>
    </header>
  );
};
