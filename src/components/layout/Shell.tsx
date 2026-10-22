import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Nav } from './Nav';
import { LiveLogDock } from '../log/LiveLogDock';
import { RequestInspector } from '../inspector/RequestInspector';
import { useLogDockStore } from '../../stores/logDockStore';
import { logStream } from '../../services/logStreamService';
import { useWakeStore } from '../../services/wakeService';
import { useSessionStore } from '../../stores/sessionStore';

export const Shell: React.FC = () => {
  const { position, size } = useLogDockStore();
  const autoWake = useSessionStore((s) => s.autoWake);
  const wake = useWakeStore();

  // Auto-connect log stream and probe health on mount
  useEffect(() => {
    logStream.start();
    if (autoWake && wake.status === 'idle') {
      wake.checkHealthOnce();
    }
    return () => {
      logStream.stop();
    };
  }, [autoWake]);

  // Adjust bottom padding so workspace never hides behind bottom dock
  const bottomPadding = position === 'bottom' ? size : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Nav />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 transition-all"
          style={{ paddingBottom: `${bottomPadding + 32}px` }}
        >
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <RequestInspector />
      <LiveLogDock />
    </div>
  );
};
