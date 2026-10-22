import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest, generateIdempotencyKey } from '../services/apiClient';
import { formatMoney, parseMoney } from '../utils/money';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import {
  ArrowRightLeft,
  RotateCcw,
  RefreshCw,
  User,
  Building2,
  Wallet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface EnrichedAccount {
  id: string;
  accountNumber: string;
  customerId?: string;
  customerName?: string;
  currency: string;
  balanceMinor: number;
  status: string;
}

export const InternalTransfersPage: React.FC = () => {
  const session = useSessionStore();

  const [accountsList, setAccountsList] = useState<EnrichedAccount[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, string>>({});
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedDestId, setSelectedDestId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountNumber, setDestAccountNumber] = useState('');
  const [amountStr, setAmountStr] = useState('5000');
  const [narration, setNarration] = useState('Payment for goods');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lastTransfer, setLastTransfer] = useState<any>(null);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState<string>('');
  const [isReplay, setIsReplay] = useState(false);
  const [transfersList, setTransfersList] = useState<any[]>([]);

  // Fetch all accounts and customers
  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      // 1. Fetch customers to resolve names
      const custRes = await apiRequest({
        method: 'GET',
        path: '/api/customers',
        label: 'Fetch customers for transfers',
      }).catch(() => null);

      const nameMap: Record<string, string> = {};
      if (custRes && Array.isArray(custRes.data)) {
        for (const c of custRes.data) {
          nameMap[c.id] = `${c.firstName || 'Customer'} ${c.lastName || ''}`.trim();
        }
        setCustomersMap(nameMap);
      }

      // 2. Fetch all accounts
      const accRes = await apiRequest({
        method: 'GET',
        path: '/api/accounts',
        label: 'Fetch accounts for transfers',
      }).catch(() => null);

      const accounts: EnrichedAccount[] = [];
      const seenIds = new Set<string>();

      if (accRes && Array.isArray(accRes.data)) {
        for (const a of accRes.data) {
          seenIds.add(a.id);
          accounts.push({
            ...a,
            customerName: a.customerId ? nameMap[a.customerId] : undefined,
          });
        }
      }

      // 3. Merge from recentEntities in session
      for (const e of session.recentEntities) {
        if (e.type === 'account' && !seenIds.has(e.id)) {
          seenIds.add(e.id);
          const details = e.details || {};
          const num = details.accountNumber || (e.label || '').split(' ')[0] || e.id.substring(0, 10);
          const curr = details.currency || ((e.label || '').includes('USD') ? 'USD' : 'NGN');
          const custName = details.customerName || (details.customerId ? nameMap[details.customerId] : undefined);
          accounts.push({
            id: e.id,
            accountNumber: num,
            customerId: details.customerId,
            customerName: custName,
            currency: curr,
            balanceMinor: details.balanceMinor || 0,
            status: details.status || 'ACTIVE',
          });
        }
      }

      setAccountsList(accounts);

      // Auto-select initial accounts if not already chosen
      if (accounts.length > 0) {
        if (!sourceAccountId) {
          setSelectedSourceId(accounts[0].id);
          setSourceAccountId(accounts[0].id);
        }
        if (!destAccountNumber && accounts.length > 1) {
          setSelectedDestId(accounts[1].id);
          setDestAccountNumber(accounts[1].accountNumber);
        }
      }
    } catch (err: any) {
      console.error('Failed to load accounts for transfer:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [session.apiKey, session.backendUrl]);

  // Handle Source Selection
  const handleSourceSelect = (accountId: string) => {
    setSelectedSourceId(accountId);
    setSourceAccountId(accountId);
  };

  const handleSourceInputChange = (val: string) => {
    setSourceAccountId(val);
    const matched = accountsList.find((a) => a.id.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setSelectedSourceId(matched.id);
    } else {
      setSelectedSourceId('');
    }
  };

  // Handle Destination Selection
  const handleDestSelect = (accountId: string) => {
    setSelectedDestId(accountId);
    const matched = accountsList.find((a) => a.id === accountId);
    if (matched) {
      setDestAccountNumber(matched.accountNumber);
    }
  };

  const handleDestInputChange = (val: string) => {
    setDestAccountNumber(val);
    const matched = accountsList.find((a) => a.accountNumber === val.trim());
    if (matched) {
      setSelectedDestId(matched.id);
    } else {
      setSelectedDestId('');
    }
  };

  // Resolve active objects
  const sourceAccount = accountsList.find((a) => a.id === sourceAccountId);
  const destAccount = accountsList.find(
    (a) => a.accountNumber === destAccountNumber || (selectedDestId && a.id === selectedDestId)
  );

  let parsedAmountMinor = 0;
  try {
    parsedAmountMinor = parseMoney(amountStr || '0', sourceAccount?.currency || 'NGN');
  } catch {
    parsedAmountMinor = 0;
  }

  const handleTransfer = async (e?: React.FormEvent, replay = false) => {
    if (e) e.preventDefault();

    let amountMinor: number;
    try {
      amountMinor = parseMoney(amountStr, sourceAccount?.currency || 'NGN');
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
        label: replay
          ? 'Replay Transfer (Idempotency)'
          : `Internal Transfer ${formatMoney(amountMinor, sourceAccount?.currency || 'NGN')}`,
      });

      const data = res.data;
      setLastTransfer(data);
      setLastIdempotencyKey(key);
      setIsReplay(replay || res.response.headers.get('Idempotent-Replayed') === 'true');

      if (!replay) {
        setTransfersList((prev) => [data, ...prev]);

        // Optimistically update local balances
        setAccountsList((prev) =>
          prev.map((acc) => {
            if (acc.id === sourceAccountId) {
              return { ...acc, balanceMinor: Math.max(0, acc.balanceMinor - amountMinor) };
            }
            if (acc.accountNumber === destAccountNumber) {
              return { ...acc, balanceMinor: acc.balanceMinor + amountMinor };
            }
            return acc;
          })
        );
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
      if (sourceAccount) {
        setSelectedDestId(sourceAccount.id);
        setDestAccountNumber(sourceAccount.accountNumber);
      } else {
        setDestAccountNumber('1000000001');
      }
      toast.info('Destination set to source account to provoke SAME_ACCOUNT_TRANSFER');
    } else if (type === 'invalid_dest') {
      setSelectedDestId('');
      setDestAccountNumber('9999999999');
      toast.info('Destination set to non-existent account number to provoke ACCOUNT_NOT_FOUND');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            <span>Internal Transfers & Idempotency</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Atomic double-entry transfers between PayBridge customer accounts with strict idempotency key protection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            isLoading={isLoadingAccounts}
            onClick={loadAccounts}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync Accounts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Card */}
        <Card title="Initiate Internal Transfer" subtitle="Move money instantly between two accounts">
          <form onSubmit={(e) => handleTransfer(e, false)} className="space-y-4">
            {/* SOURCE ACCOUNT SECTION */}
            <div className="space-y-2 p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <Select
                label="Source Account (Debit)"
                value={selectedSourceId}
                onChange={(e) => handleSourceSelect(e.target.value)}
                options={[
                  { label: '-- Select from Available Accounts --', value: '' },
                  ...accountsList.map((a) => ({
                    label: `${a.accountNumber} • ${a.customerName || 'Customer'} (${formatMoney(a.balanceMinor, a.currency)})`,
                    value: a.id,
                  })),
                ]}
              />

              {sourceAccount && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      {sourceAccount.customerName || 'Customer Account'}
                    </span>
                    <Badge variant={sourceAccount.currency === 'NGN' ? 'success' : 'accent'} size="sm">
                      {sourceAccount.currency}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 font-sans block text-[10px]">Account Number:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{sourceAccount.accountNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[10px]">Available Balance:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(sourceAccount.balanceMinor, sourceAccount.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Source Account ID (UUID)"
                isMono
                required
                value={sourceAccountId}
                onChange={(e) => handleSourceInputChange(e.target.value)}
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                helperText="Auto-populated from dropdown or paste any account UUID"
              />
            </div>

            {/* DESTINATION ACCOUNT SECTION */}
            <div className="space-y-2 p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <Select
                label="Destination Account (Credit)"
                value={selectedDestId}
                onChange={(e) => handleDestSelect(e.target.value)}
                options={[
                  { label: '-- Select from Available Accounts --', value: '' },
                  ...accountsList.map((a) => ({
                    label: `${a.accountNumber} • ${a.customerName || 'Beneficiary'} (${formatMoney(a.balanceMinor, a.currency)})`,
                    value: a.id,
                  })),
                ]}
              />

              {destAccount && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      {destAccount.customerName || 'Destination Beneficiary'}
                    </span>
                    <Badge variant={destAccount.currency === 'NGN' ? 'success' : 'accent'} size="sm">
                      {destAccount.currency}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 font-sans block text-[10px]">Account Number:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{destAccount.accountNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[10px]">Current Balance:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(destAccount.balanceMinor, destAccount.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Destination 10-Digit Account Number"
                isMono
                required
                maxLength={10}
                value={destAccountNumber}
                onChange={(e) => handleDestInputChange(e.target.value)}
                placeholder="1000000002"
                helperText="Auto-populated from dropdown or enter 10 digits"
              />
            </div>

            {/* LIVE TRANSFER IMPACT PREVIEW */}
            {sourceAccount && destAccount && parsedAmountMinor > 0 && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-200">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                    Estimated Balances After Transfer
                  </span>
                  <span className="font-mono">{formatMoney(parsedAmountMinor, sourceAccount.currency)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-950">
                    <span className="text-slate-400 font-sans block text-[10px]">Source Remainder:</span>
                    <span
                      className={`font-bold ${
                        sourceAccount.balanceMinor < parsedAmountMinor
                          ? 'text-rose-600'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {formatMoney(sourceAccount.balanceMinor - parsedAmountMinor, sourceAccount.currency)}
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-950">
                    <span className="text-slate-400 font-sans block text-[10px]">Destination Next:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(destAccount.balanceMinor + parsedAmountMinor, destAccount.currency)}
                    </span>
                  </div>
                </div>

                {sourceAccount.balanceMinor < parsedAmountMinor && (
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Warning: Transfer amount exceeds available balance. Will fail with INSUFFICIENT_FUNDS.</span>
                  </div>
                )}

                {sourceAccount.id === destAccount.id && (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Warning: Source and destination are the exact same account.</span>
                  </div>
                )}
              </div>
            )}

            <Input
              label={`Amount in ${sourceAccount?.currency || 'NGN'} (${sourceAccount?.currency === 'USD' ? '$' : '₦'})`}
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
                <Badge variant="warning" size="sm">
                  400 Bad Request
                </Badge>
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
                <Badge variant="warning" size="sm">
                  400 Bad Request
                </Badge>
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
                <Badge variant="warning" size="sm">
                  404 Not Found
                </Badge>
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
                  <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">
                    {lastIdempotencyKey}
                  </code>{' '}
                  and returned the original record without double-charging!
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
