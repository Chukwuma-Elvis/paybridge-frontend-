import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useWakeStore } from '../services/wakeService';
import { apiRequest } from '../services/apiClient';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { maskKey } from '../utils/security';
import {
  Plug,
  Sparkles,
  Key,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Clock,
  Eye,
  EyeOff,
  Server,
  Layers,
  Info,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export const ConnectPage: React.FC = () => {
  const session = useSessionStore();
  const wake = useWakeStore();

  const [addressInput, setAddressInput] = useState(session.backendUrl);
  const [addressError, setAddressError] = useState('');
  const [addressWarning, setAddressWarning] = useState('');

  const [keyInput, setKeyInput] = useState(session.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    setAddressInput(session.backendUrl);
  }, [session.backendUrl]);

  useEffect(() => {
    setKeyInput(session.apiKey);
  }, [session.apiKey]);

  // Try to load system info if an admin key is present
  useEffect(() => {
    if (session.apiKey && session.keyRole === 'ADMIN') {
      loadSystemInfo();
    }
  }, [session.apiKey, session.keyRole, session.backendUrl]);

  const loadSystemInfo = async () => {
    setLoadingInfo(true);
    try {
      const res = await apiRequest({
        path: '/api/admin/system/info',
        label: 'Fetch system info',
      });
      setSystemInfo(res.data);
    } catch {
      // Step 32 endpoint might not be deployed yet on remote, which is safe and expected
      setSystemInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSaveAddress = () => {
    setAddressError('');
    setAddressWarning('');

    const res = session.setBackendUrl(addressInput);
    if (!res.success) {
      setAddressError(res.error || 'Invalid address');
      return;
    }

    if (res.warning) {
      setAddressWarning(res.warning);
    }
    toast.success('Backend address updated. Session key and cache cleared.');
    wake.checkHealthOnce();
  };

  const handleSaveKey = () => {
    if (!keyInput.trim()) {
      session.clearKey();
      toast.info('API key cleared.');
      return;
    }

    session.setApiKey(keyInput.trim());
    toast.success(`Key saved with ${session.keyRole} role.`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Plug className="w-5 h-5 text-blue-600" />
          <span>Connect, Wake & System Settings</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure the target PayBridge API service, wake a sleeping instance on Render, and manage your session API key.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Backend Address */}
        <Card
          title="Backend Address"
          subtitle="Point the console at any deployed Render service or localhost"
        >
          <div className="space-y-4">
            <div>
              <Input
                label="Target Server URL"
                isMono
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                error={addressError}
                helperText="Must start with https://, or http:// for localhost"
                placeholder="https://paybridge-demo.onrender.com"
              />
              {addressWarning && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{addressWarning}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleSaveAddress}>
                Save & Connect
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  session.resetBackendUrl();
                  toast.info('Restored default Render address.');
                }}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset to Default
              </Button>
            </div>

            {/* Recent Addresses */}
            {session.recentUrls.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-400 block mb-1.5">Recent Addresses:</span>
                <div className="flex flex-wrap gap-1.5">
                  {session.recentUrls.map((url) => (
                    <button
                      key={url}
                      onClick={() => {
                        setAddressInput(url);
                        session.setBackendUrl(url);
                        toast.success(`Switched to ${url}`);
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      {url.replace(/^https?:\/\//, '')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Render Wake Service */}
        <Card
          title="Render Service Wake"
          subtitle="Probes the open health endpoint with backoff to wake the free tier"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Service Status:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {wake.status === 'awake' ? (
                    <Badge variant="success">200 UP &bull; Awake</Badge>
                  ) : wake.isWaking ? (
                    <Badge variant="warning">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Waking... ({wake.elapsedSeconds}s)
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Asleep / Unchecked</Badge>
                  )}
                  {wake.lastProbeStatus && (
                    <span className="text-xs font-mono text-slate-500">[{wake.lastProbeStatus}]</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {wake.isWaking ? (
                  <Button size="sm" variant="danger" onClick={wake.cancelWake}>
                    Cancel
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => wake.startWake()}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Wake Service
                  </Button>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Render free web services spin down after 15 min of inactivity. Initial boot takes about <strong>4 to 5 minutes</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoWake"
                  checked={session.autoWake}
                  onChange={(e) => session.setAutoWake(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoWake" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Probe health and wake automatically on console load
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: API Key Desk */}
        <Card
          title="Session API Key"
          subtitle="Pasted key lives in memory (opt-in session storage only; never stored in localStorage or URL)"
        >
          <div className="space-y-4">
            <div>
              <div className="relative">
                <Input
                  label="Paste API Key (Client or Admin)"
                  isMono
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste admin or client key..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-7 text-slate-400 hover:text-slate-600"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {session.apiKey && (
                <div className="mt-2 text-xs font-mono text-slate-500 flex items-center justify-between">
                  <span>Current Key: {maskKey(session.apiKey)}</span>
                  <Badge variant={session.keyRole === 'ADMIN' ? 'accent' : 'neutral'} size="sm">
                    {session.keyRole} Privileges
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberKey"
                checked={session.rememberKeyInSession}
                onChange={(e) => session.setRememberKeyInSession(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rememberKey" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                Remember key for this tab session only (sessionStorage)
              </label>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveKey}>
                Save Key
              </Button>
              {session.apiKey && (
                <Button size="sm" variant="outline" onClick={() => session.clearKey()}>
                  Forget Key
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Card 4: System Information */}
        <Card
          title="System Capabilities & Mode"
          subtitle="Server runtime flags reported by the API"
          actions={
            session.keyRole === 'ADMIN' && (
              <Button size="sm" variant="ghost" onClick={loadSystemInfo} isLoading={loadingInfo}>
                Refresh
              </Button>
            )
          }
        >
          {systemInfo ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Gateway Provider:</span>
                <Badge variant={systemInfo.gatewayMode === 'fake' ? 'neutral' : 'success'} size="sm">
                  {systemInfo.gatewayMode?.toUpperCase() || 'FAKE'}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Active Profile:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{systemInfo.activeProfile || 'prod'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Dev Funding:</span>
                <Badge variant={systemInfo.devFundingEnabled ? 'success' : 'warning'} size="sm">
                  {systemInfo.devFundingEnabled ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Partner Simulator:</span>
                <Badge variant={systemInfo.simulatorEnabled ? 'success' : 'neutral'} size="sm">
                  {systemInfo.simulatorEnabled ? 'ENABLED' : 'OFF'}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Live Log Stream:</span>
                <Badge variant={systemInfo.logStreamEnabled ? 'success' : 'neutral'} size="sm">
                  {systemInfo.logStreamEnabled ? 'ENABLED' : 'OFF'}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">
              <Server className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p>System info requires an active connection and an ADMIN key.</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Standard mode: Fake Gateway &bull; NGN/USD Corridors &bull; Strict Zero-Sum Ledger
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
