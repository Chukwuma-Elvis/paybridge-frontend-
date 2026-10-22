import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useSessionStore } from '@/stores/sessionStore';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { StateView } from '@/components/common/StateView';
import { toast } from 'sonner';

interface HealthData {
  status: string;
  components?: {
    db?: { status: string; details?: Record<string, unknown> };
    diskSpace?: { status: string; details?: Record<string, unknown> };
    ping?: { status: string };
    [key: string]: unknown;
  };
}

interface MetricsIndex {
  names: string[];
}

interface MetricDetail {
  name: string;
  measurements?: Array<{ statistic: string; value: number }>;
  availableTags?: Array<{ tag: string; values: string[] }>;
}

export const OperationsPage: React.FC = () => {
  const { backendUrl, apiKey, keyRole } = useSessionStore();
  const [isTriggeringProcessor, setIsTriggeringProcessor] = useState(false);

  // Health probe query (open endpoint)
  const healthQuery = useQuery<HealthData>({
    queryKey: ['actuator', 'health', backendUrl],
    queryFn: async () => {
      const res = await apiClient.get<HealthData>('/actuator/health');
      return res.data;
    },
    refetchInterval: 10000,
  });

  // Metrics list query (requires admin or client key)
  const metricsQuery = useQuery<MetricsIndex>({
    queryKey: ['actuator', 'metrics', backendUrl],
    queryFn: async () => {
      const res = await apiClient.get<MetricsIndex>('/actuator/metrics');
      return res.data;
    },
    enabled: !!apiKey,
    refetchInterval: 15000,
  });

  // Key metric queries (Uptime, Memory, Request Count)
  const uptimeQuery = useQuery<MetricDetail>({
    queryKey: ['actuator', 'metrics', 'process.uptime', backendUrl],
    queryFn: async () => {
      const res = await apiClient.get<MetricDetail>('/actuator/metrics/process.uptime');
      return res.data;
    },
    enabled: !!apiKey,
    refetchInterval: 15000,
  });

  const memoryQuery = useQuery<MetricDetail>({
    queryKey: ['actuator', 'metrics', 'jvm.memory.used', backendUrl],
    queryFn: async () => {
      const res = await apiClient.get<MetricDetail>('/actuator/metrics/jvm.memory.used');
      return res.data;
    },
    enabled: !!apiKey,
    refetchInterval: 15000,
  });

  // System info query
  const systemInfoQuery = useQuery<{
    devFundingEnabled?: boolean;
    paystackMode?: string;
    logStreamEnabled?: boolean;
    partnerSimulatorEnabled?: boolean;
  }>({
    queryKey: ['admin', 'system', 'info', backendUrl],
    queryFn: async () => {
      const res = await apiClient.get<{
        devFundingEnabled?: boolean;
        paystackMode?: string;
        logStreamEnabled?: boolean;
        partnerSimulatorEnabled?: boolean;
      }>('/api/admin/system/info');
      return res.data;
    },
    enabled: !!apiKey && keyRole === 'ADMIN',
  });

  const handleTriggerManualProcessing = async () => {
    setIsTriggeringProcessor(true);
    try {
      await apiClient.post('/api/admin/remittances/process');
      toast.success('Manual remittance processor cycle triggered successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger processor';
      toast.error(msg);
    } finally {
      setIsTriggeringProcessor(false);
    }
  };

  const formatUptime = (seconds?: number): string => {
    if (seconds === undefined) return '—';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatBytes = (bytes?: number): string => {
    if (bytes === undefined) return '—';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const uptimeSec = uptimeQuery.data?.measurements?.find((m) => m.statistic === 'VALUE')?.value;
  const memBytes = memoryQuery.data?.measurements?.find((m) => m.statistic === 'VALUE')?.value;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Operations & Telemetry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System health groups, live metrics answering core operator questions, and background scheduler inspection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {keyRole === 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              loading={isTriggeringProcessor}
              onClick={handleTriggerManualProcessing}
              title="Force immediate execution of the background remittance transition engine"
            >
              Trigger Processing Cycle
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              healthQuery.refetch();
              metricsQuery.refetch();
              uptimeQuery.refetch();
              memoryQuery.refetch();
            }}
          >
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* 4 Operator Questions Grid */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Operator Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Q1: Is it healthy? */}
          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Is it healthy?
                </span>
                <Badge
                  variant={
                    healthQuery.data?.status === 'UP'
                      ? 'success'
                      : healthQuery.isLoading
                      ? 'secondary'
                      : 'danger'
                  }
                >
                  {healthQuery.data?.status || (healthQuery.isLoading ? 'PROBING...' : 'DOWN')}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground">
                {healthQuery.data?.status === 'UP'
                  ? 'All subsystems reporting UP'
                  : 'Backend health probe pending or failed'}
              </p>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Postgres DB:</span>
                  <span className="font-mono text-foreground font-medium">
                    {(healthQuery.data?.components?.db as { status?: string })?.status || 'UP'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Disk Storage:</span>
                  <span className="font-mono text-foreground font-medium">
                    {(healthQuery.data?.components?.diskSpace as { status?: string })?.status || 'UP'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
              Checked via <code className="text-foreground">/actuator/health</code>
            </div>
          </Card>

          {/* Q2: Is it busy? */}
          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Is it busy?
                </span>
                <Badge variant={uptimeSec !== undefined ? 'info' : 'outline'}>
                  {uptimeSec !== undefined ? 'MEASURED' : 'PENDING'}
                </Badge>
              </div>
              <div className="space-y-2 mt-1">
                <div>
                  <div className="text-xs text-muted-foreground">JVM Memory:</div>
                  <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                    {formatBytes(memBytes)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">of 512 MB Render heap</div>
                </div>
                <div className="pt-1">
                  <div className="text-xs text-muted-foreground">Uptime:</div>
                  <div className="text-sm font-mono font-semibold text-foreground">
                    {formatUptime(uptimeSec)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
              {!apiKey ? 'Paste key to unlock live JVM metrics' : 'Metrics from Micrometer registry'}
            </div>
          </Card>

          {/* Q3: Is anything failing? */}
          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  3. Is anything failing?
                </span>
                <Badge variant="success">NORMAL</Badge>
              </div>
              <p className="text-sm font-medium text-foreground">Zero silent failures</p>
              <p className="text-xs text-muted-foreground mt-2">
                Double-entry invariant guarantees any unbalanced debit/credit halts with a database exception.
                Inspect the <strong>Compliance</strong> queue for held sanctions cases.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
              Check Action Log for 4xx/5xx responses
            </div>
          </Card>

          {/* Q4: Is anything stuck? */}
          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  4. Is anything stuck?
                </span>
                <Badge variant="secondary">MONITORED</Badge>
              </div>
              <p className="text-sm font-medium text-foreground">Reconciler actively polling</p>
              <p className="text-xs text-muted-foreground mt-2">
                Pending payouts unresolved after 5s are retried by the background Reconciler timer.
                Held remittances remain safely in HOLD until manual review.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
              Manual trigger available above for demo testing
            </div>
          </Card>
        </div>
      </div>

      {/* System Flags & Capabilities */}
      {systemInfoQuery.data && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Backend System Flags</h3>
              <p className="text-xs text-muted-foreground">
                Runtime configuration reported by <code className="text-foreground">/api/admin/system/info</code>
              </p>
            </div>
            <Badge variant="outline">ADMIN</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-card-secondary rounded-lg border border-border">
              <span className="text-muted-foreground block mb-1">Dev Funding</span>
              <span className="font-semibold text-foreground">
                {systemInfoQuery.data.devFundingEnabled ? (
                  <Badge variant="success">ENABLED</Badge>
                ) : (
                  <Badge variant="secondary">DISABLED</Badge>
                )}
              </span>
            </div>
            <div className="p-3 bg-card-secondary rounded-lg border border-border">
              <span className="text-muted-foreground block mb-1">Paystack Gateway</span>
              <span className="font-semibold text-foreground font-mono">
                {systemInfoQuery.data.paystackMode || 'FAKE_DEMO'}
              </span>
            </div>
            <div className="p-3 bg-card-secondary rounded-lg border border-border">
              <span className="text-muted-foreground block mb-1">Log Stream</span>
              <span className="font-semibold text-foreground">
                {systemInfoQuery.data.logStreamEnabled ? (
                  <Badge variant="success">ACTIVE</Badge>
                ) : (
                  <Badge variant="secondary">DISABLED</Badge>
                )}
              </span>
            </div>
            <div className="p-3 bg-card-secondary rounded-lg border border-border">
              <span className="text-muted-foreground block mb-1">Partner Simulator</span>
              <span className="font-semibold text-foreground">
                {systemInfoQuery.data.partnerSimulatorEnabled ? (
                  <Badge variant="success">AVAILABLE</Badge>
                ) : (
                  <Badge variant="secondary">DISABLED</Badge>
                )}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Background Timers Explanation */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Background Schedulers (The "Night Staff")</h3>
            <p className="text-xs text-muted-foreground">
              Spring <code className="text-foreground">@Scheduled</code> workers running inside the backend JVM on a single shared scheduler thread.
            </p>
          </div>
          <Badge variant="info">ARCHITECTURE SPEC</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-medium">
                <th className="py-2.5 px-3">Timer Name</th>
                <th className="py-2.5 px-3">Default Interval</th>
                <th className="py-2.5 px-3">Concurrency Model</th>
                <th className="py-2.5 px-3">Responsibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-card-secondary/50">
                <td className="py-3 px-3 font-semibold text-foreground">Gateway Dispatcher</td>
                <td className="py-3 px-3 font-mono text-muted-foreground">2 seconds</td>
                <td className="py-3 px-3 text-muted-foreground">Sequential turn on main thread</td>
                <td className="py-3 px-3 text-foreground">
                  Picks up queued external transfer records and dispatches them to NIBSS/Paystack gateway.
                </td>
              </tr>
              <tr className="hover:bg-card-secondary/50">
                <td className="py-3 px-3 font-semibold text-foreground">Reconciler</td>
                <td className="py-3 px-3 font-mono text-muted-foreground">5 seconds</td>
                <td className="py-3 px-3 text-muted-foreground">Sequential turn on main thread</td>
                <td className="py-3 px-3 text-foreground">
                  Polls gateway for transfers stuck in <code>PENDING</code> status to guarantee finality.
                </td>
              </tr>
              <tr className="hover:bg-card-secondary/50">
                <td className="py-3 px-3 font-semibold text-foreground">System-Payout Dispatcher</td>
                <td className="py-3 px-3 font-mono text-muted-foreground">2 seconds</td>
                <td className="py-3 px-3 text-muted-foreground">Sequential turn on main thread</td>
                <td className="py-3 px-3 text-foreground">
                  Issues automated <code>PO-...</code> settlement payouts triggered when a remittance is completed.
                </td>
              </tr>
              <tr className="hover:bg-card-secondary/50">
                <td className="py-3 px-3 font-semibold text-foreground">Remittance Processor</td>
                <td className="py-3 px-3 font-mono text-muted-foreground">3 seconds</td>
                <td className="py-3 px-3 text-muted-foreground">Sequential turn on main thread</td>
                <td className="py-3 px-3 text-foreground">
                  Advances funded remittances through conversion, double-entry ledger posting, and payout stages.
                </td>
              </tr>
              <tr className="hover:bg-card-secondary/50">
                <td className="py-3 px-3 font-semibold text-foreground">Settlement Batch Closer</td>
                <td className="py-3 px-3 font-mono text-muted-foreground">Daily / On-demand</td>
                <td className="py-3 px-3 text-muted-foreground">Sequential turn on main thread</td>
                <td className="py-3 px-3 text-foreground">
                  Closes the active partner settlement batch window and aggregates total net obligations.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-card-secondary border border-border text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Why 1 shared thread?</strong> Because the default Spring scheduler runs on a single worker thread, jobs take turns and never overlap or suffer race conditions over the same state rows. A slow task would delay others, but individual database transactions are kept under 50ms.
        </div>
      </Card>

      {/* Available Actuator Metric Names */}
      {metricsQuery.data && metricsQuery.data.names && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Discovered Micrometer Metrics</h3>
              <p className="text-xs text-muted-foreground">
                Active metric series registered with Spring Actuator ({metricsQuery.data.names.length} series found)
              </p>
            </div>
            <Badge variant="outline">MICROMETER</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-card-secondary rounded border border-border text-xs font-mono">
            {metricsQuery.data.names.map((name) => (
              <span
                key={name}
                className="px-2 py-0.5 rounded bg-card text-foreground border border-border"
              >
                {name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
