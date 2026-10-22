import React, { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest, generateIdempotencyKey } from '../services/apiClient';
import { formatMoney, parseMoney } from '../utils/money';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { StateView } from '../components/common/StateView';
import { ArrowRightLeft, RotateCcw, ShieldCheck, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const InternalTransfersPage: React.FC = () => {
  const session = useSessionStore();

  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountNumber, setDestAccountNumber] = useState('');
  const [amountStr, setAmountStr] = useState('5000');
  const [narration, setNarration] = useState('Payment for goods');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lastTransfer, setLastTransfer] = useState<any>(null);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState<string>('');
  const [isReplay, setIsReplay] = useState(false);
  const [transfersList, setTransfersList] = useState<any[]>([]);

  const handleTransfer = async (e?: React.FormEvent, replay = false) => {
    if (e) e.preventDefault();

    let amountMinor: number;
    try {
      amountMinor = parseMoney(amountStr, 'NGN');
    } catch (err: any) {
      toast.error(err.message);
      return;
    }

    if (!sourceAccountId) {
      toast.error('Source account ID is required');
      return;
    }

    if (!destAccountNumber || destAccountNumber.length !== 10) {
      toast.error('Destination must be a 10-digit account number');
      return;
    }

    const key = replay ? lastIdempotencyKey : generateIdempotencyKey('int');
    setIsSubmitting(true);

    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/transfers/internal',
        idempotencyKey: key,
        body: {
          sourceAccountId,
          destinationAccountNumber: destAccountNumber,
          amountMinor,
          narration,
        },
        label: replay ? 'Replay Transfer (Idempotency)' : `Internal Transfer ${formatMoney(amountMinor, 'NGN')}`,
      });

      const data = res.data;
      setLastTransfer(data);
      setLastIdempotencyKey(key);
      setIsReplay(replay || res.response.headers.get('Idempotent-Replayed') === 'true');

      if (!replay) {
        setTransfersList((prev) => [data, ...prev]);
      }

      toast.success(replay ? 'Idempotent replay returned original transfer!' : 'Transfer completed successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scenario quick helpers
  const runScenario = (type: 'insufficient' | 'same_account' | 'invalid_dest') => {
    if (type === 'insufficient') {
      setAmountStr('999999999');
      toast.info('Amount set to ₦999,999,999.00 to provoke INSUFFICIENT_FUNDS');
    } else if (type === 'same_account') {
      setDestAccountNumber('1000000001');
      toast.info('Destination set to source account to provoke SAME_ACCOUNT_TRANSFER');
    } else if (type === 'invalid_dest') {
      setDestAccountNumber('9999999999');
      toast.info('Destination set to non-existent account number to provoke ACCOUNT_NOT_FOUND');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
          <span>Internal Transfers & Idempotency</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Atomic double-entry transfers between PayBridge customer accounts with strict idempotency key protection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Card */}
        <Card title="Initiate Internal Transfer" subtitle="Move money instantly between two accounts">
          <form onSubmit={(e) => handleTransfer(e, false)} className="space-y-3">
            <Input
              label="Source Account ID (UUID)"
              isMono
              required
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              helperText={
                session.recentEntities.find((e) => e.type === 'account')
                  ? `Recent: ${session.recentEntities.find((e) => e.type === 'account')?.id}`
                  : undefined
              }
            />

            <Input
              label="Destination 10-Digit Account Number"
              isMono
              required
              maxLength={10}
              value={destAccountNumber}
              onChange={(e) => setDestAccountNumber(e.target.value)}
              placeholder="1000000002"
            />

            <Input
              label="Amount in NGN (₦)"
              isMono
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="5000.00"
            />

            <Input
              label="Narration"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Payment description"
            />

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <Button type="submit" isLoading={isSubmitting} icon={<ArrowRightLeft className="w-4 h-4" />}>
                Send Transfer
              </Button>

              {lastIdempotencyKey && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleTransfer(undefined, true)}
                  disabled={isSubmitting}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Replay Same Request
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Error Scenarios Card */}
        <Card title="One-Click Error Scenarios" subtitle="Demonstrate server validation and business rule enforcement">
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Click any scenario to populate the form with parameters that trigger specific server validation refusals:
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => runScenario('insufficient')}
                className="p-3 text-left rounded border border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">1. Insufficient Funds</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Attempts to transfer ₦999,999,999.00</div>
                </div>
                <Badge variant="warning" size="sm">400 Bad Request</Badge>
              </button>

              <button
                type="button"
                onClick={() => runScenario('same_account')}
                className="p-3 text-left rounded border border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">2. Same Account Transfer</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Sets destination to source account</div>
                </div>
                <Badge variant="warning" size="sm">400 Bad Request</Badge>
              </button>

              <button
                type="button"
                onClick={() => runScenario('invalid_dest')}
                className="p-3 text-left rounded border border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">3. Account Not Found</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Sends to non-existent account 9999999999</div>
                </div>
                <Badge variant="warning" size="sm">404 Not Found</Badge>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Transfer Result Banner */}
      {lastTransfer && (
        <Card
          title={isReplay ? 'Replayed Transfer Response (Idempotency Active)' : 'Transfer Receipt'}
          subtitle={`Reference: ${lastTransfer.reference}`}
        >
          <div className="space-y-3">
            {isReplay && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Idempotent Replay Proved:</strong> The server recognized the repeated{' '}
                  <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">{lastIdempotencyKey}</code> and returned the original record without double-charging!
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Status</span>
                <Badge variant="success" size="sm" className="mt-1">
                  {lastTransfer.status}
                </Badge>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Amount</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {formatMoney(lastTransfer.amountMinor, lastTransfer.currency)}
                </span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Transfer ID</span>
                <span className="truncate block" title={lastTransfer.id}>
                  {lastTransfer.id}
                </span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Timestamp</span>
                <span className="text-[11px] block">{new Date(lastTransfer.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Transfers List */}
      {transfersList.length > 0 && (
        <Card title="Session Transfers History" subtitle="Transfers executed during this console session">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Narration</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {transfersList.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                    <td className="px-3 py-2 font-bold text-blue-600">{t.reference}</td>
                    <td className="px-3 py-2">
                      <Badge variant="success" size="sm">
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-bold tabular-nums">
                      {formatMoney(t.amountMinor, t.currency)}
                    </td>
                    <td className="px-3 py-2 font-sans text-slate-600 dark:text-slate-400">
                      {t.narration || '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-[11px]">
                      {new Date(t.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
