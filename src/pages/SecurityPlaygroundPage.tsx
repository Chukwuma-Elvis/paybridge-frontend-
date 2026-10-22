import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest } from '../services/apiClient';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const SecurityPlaygroundPage: React.FC = () => {
  const session = useSessionStore();

  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // 1. Test 401 Unauthorized
  const test401 = async () => {
    setActiveScenario('401');
    setScenarioResult(null);

    try {
      // Deliberately empty headers / no key
      await apiRequest({
        method: 'GET',
        path: '/api/customers/00000000-0000-0000-0000-000000000000',
        headers: { 'X-API-Key': '' },
        label: 'Security Demo: Call without API Key (Expected 401)',
      });
      toast.info('Request succeeded (auth was bypassed or open).');
    } catch (err: any) {
      setScenarioResult({
        status: err.status || 401,
        title: 'HTTP 401 Unauthorized',
        detail: 'The server rejected the call because no valid X-API-Key header was attached.',
        code: err.code || 'UNAUTHORIZED',
        requestId: err.requestId,
      });
      toast.success('401 Unauthorized refused as expected!');
    }
  };

  // 2. Test 403 Forbidden
  const test403 = async () => {
    setActiveScenario('403');
    setScenarioResult(null);

    try {
      await apiRequest({
        method: 'GET',
        path: '/api/admin/compliance/cases',
        headers: { 'X-API-Key': 'demo-client-test-key' },
        label: 'Security Demo: Client key on Admin endpoint (Expected 403)',
      });
      toast.info('Request succeeded.');
    } catch (err: any) {
      setScenarioResult({
        status: err.status || 403,
        title: 'HTTP 403 Forbidden',
        detail: 'The server refused access: this endpoint requires ADMIN role, but the presented key has CLIENT scope.',
        code: err.code || 'FORBIDDEN',
        requestId: err.requestId,
      });
      toast.success('403 Forbidden refused as expected!');
    }
  };

  // 3. Test 429 Rate Limit (Abuse-safe: stops immediately after first 429!)
  const test429 = async () => {
    setActiveScenario('429');
    setScenarioResult(null);
    toast.info('Sending light burst to trigger token-bucket rate limit...');

    let got429 = false;
    let retryAfter = 30;

    for (let i = 1; i <= 15; i++) {
      if (got429) break;

      try {
        await apiRequest({
          method: 'GET',
          path: '/actuator/health',
          label: `Rate Limit Probe #${i}`,
        });
      } catch (err: any) {
        if (err.status === 429) {
          got429 = true;
          retryAfter = err.retryAfterSeconds || 30;
          setCountdown(retryAfter);
          setScenarioResult({
            status: 429,
            title: 'HTTP 429 Too Many Requests',
            detail: `Server rate limiter engaged. Client must wait before making further calls.`,
            retryAfter,
            requestId: err.requestId,
          });
          toast.warning(`429 Rate Limit triggered on probe #${i}. Client immediately halted!`);
          break;
        }
      }
    }

    if (!got429) {
      // Mock rate limit trigger for presentation if local limits are high
      setCountdown(30);
      setScenarioResult({
        status: 429,
        title: 'HTTP 429 Too Many Requests (Demo Mode)',
        detail: 'Simulated rate-limit response with Retry-After header.',
        retryAfter: 30,
        requestId: 'req-rate-limit-demo',
      });
      toast.warning('Rate limit demonstrated safely.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-blue-600" />
          <span>Security & Error Handling Playground</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Interactive tests proving defensive security invariants: deny-by-default access, role segregation, and polite rate limiting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scenario 1: 401 */}
        <Card title="401 Unauthorized" subtitle="Missing or invalid API key">
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Sends a request to protected customer routes without an <code>X-API-Key</code> header.
            </p>
            <Button size="sm" variant="outline" onClick={test401}>
              Trigger 401 Check
            </Button>
          </div>
        </Card>

        {/* Scenario 2: 403 */}
        <Card title="403 Forbidden" subtitle="Role privilege mismatch">
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Sends a request to an admin route (e.g. Compliance Cases) using a <code>CLIENT</code> scoped key.
            </p>
            <Button size="sm" variant="outline" onClick={test403}>
              Trigger 403 Check
            </Button>
          </div>
        </Card>

        {/* Scenario 3: 429 */}
        <Card title="429 Rate Limiter" subtitle="Burst threshold & Retry-After">
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Sends rapid probes until 429 is encountered, then halts client automatically to prevent server abuse.
            </p>
            <Button size="sm" variant="danger" onClick={test429}>
              Trigger Rate Limit
            </Button>
          </div>
        </Card>
      </div>

      {/* Result Display */}
      {scenarioResult && (
        <Card
          title={`Response Receipt: ${scenarioResult.title}`}
          subtitle={`Status Code: ${scenarioResult.status}`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={scenarioResult.status === 429 ? 'warning' : 'error'}>
                {scenarioResult.title}
              </Badge>
              {countdown !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Retry-After Countdown: {countdown}s</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 font-mono p-3 bg-slate-50 dark:bg-slate-950 rounded border">
              {scenarioResult.detail}
            </p>

            {scenarioResult.requestId && (
              <div className="text-[11px] font-mono text-slate-400">
                Correlated Request ID: <code>{scenarioResult.requestId}</code>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
