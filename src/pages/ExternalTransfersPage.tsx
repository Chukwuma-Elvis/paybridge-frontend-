import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest, generateIdempotencyKey } from '../services/apiClient';
import { formatMoney, parseMoney } from '../utils/money';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { StateView } from '../components/common/StateView';
import { Send, Search, UserCheck, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';
import { toast } from 'sonner';

export const ExternalTransfersPage: React.FC = () => {
  const session = useSessionStore();

  // Beneficiary Resolve State
  const [bankCode, setBankCode] = useState('044');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [resolvedAccount, setResolvedAccount] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSavingBeneficiary, setIsSavingBeneficiary] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);

  // External Transfer State
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [amountStr, setAmountStr] = useState('15000');
  const [narration, setNarration] = useState('External settlement payout');
  const [isInitiating, setIsInitiating] = useState(false);

  // Active Payout Polling
  const [activeTransfer, setActiveTransfer] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

  const bankOptions = [
    { label: '044 - Access Bank', value: '044' },
    { label: '058 - GTBank (Guaranty Trust)', value: '058' },
    { label: '011 - First Bank of Nigeria', value: '011' },
    { label: '033 - United Bank for Africa (UBA)', value: '033' },
    { label: '057 - Zenith Bank', value: '057' },
    { label: '035 - Wema Bank / ALAT', value: '035' },
    { label: '214 - First City Monument Bank (FCMB)', value: '214' },
    { label: '070 - Fidelity Bank', value: '070' },
    { label: '221 - Stanbic IBTC Bank', value: '221' },
    { label: '032 - Union Bank of Nigeria', value: '032' },
    { label: '232 - Sterling Bank', value: '232' },
    { label: '101 - Providus Bank', value: '101' },
    { label: '50211 - Kuda Bank', value: '50211' },
    { label: '999992 - OPay (Paycom)', value: '999992' },
    { label: '999991 - PalmPay', value: '999991' },
    { label: '50515 - Moniepoint MFB', value: '50515' },
  ];

  // Resolve Name Enquiry
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || accountNumber.length !== 10) {
      toast.error('Must be a 10-digit account number');
      return;
    }

    setIsResolving(true);
    setResolvedAccount(null);

    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/beneficiaries/resolve',
        body: { bankCode, accountNumber },
        label: 'Name Enquiry: Resolve Account Holder',
      });

      setResolvedAccount(res.data);
      toast.success(`Account resolved: ${res.data.accountName}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResolving(false);
    }
  };

  // Save Beneficiary
  const handleSaveBeneficiary = async () => {
    if (!resolvedAccount) return;
    const customerId = session.recentEntities.find((e) => e.type === 'customer')?.id;
    if (!customerId) {
      toast.error('Please create or select a customer on the Customers page first.');
      return;
    }

    setIsSavingBeneficiary(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/beneficiaries',
        body: {
          customerId,
          bankCode: resolvedAccount.bankCode,
          accountNumber: resolvedAccount.accountNumber,
        },
        label: 'Save Bank Beneficiary',
      });

      const newBen = res.data;
      setBeneficiaries((prev) => [newBen, ...prev]);
      setSelectedBeneficiaryId(newBen.id);

      session.addRecentEntity({
        id: newBen.id,
        label: `${newBen.accountName} (${newBen.bankCode})`,
        type: 'beneficiary',
      });

      toast.success('Beneficiary saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingBeneficiary(false);
    }
  };

  // Initiate External Transfer
  const handleExternalTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (!selectedBeneficiaryId) {
      toast.error('Please select a saved beneficiary');
      return;
    }

    setIsInitiating(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/transfers/external',
        idempotencyKey: generateIdempotencyKey('ext_tx'),
        body: {
          sourceAccountId,
          beneficiaryId: selectedBeneficiaryId,
          amountMinor,
          narration,
        },
        label: `External Transfer ${formatMoney(amountMinor, 'NGN')}`,
      });

      const data = res.data;
      setActiveTransfer(data);
      toast.success('External transfer accepted (202 Accepted). Polling payout status...');
      startPayoutPolling(data.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsInitiating(false);
    }
  };

  // Poll status with stop condition
  const startPayoutPolling = (transferId: string) => {
    setIsPolling(true);

    const interval = setInterval(async () => {
      // Pause if tab is hidden
      if (document.hidden) return;

      try {
        const res = await apiRequest({
          method: 'GET',
          path: `/api/transfers/${transferId}`,
          isPolling: true,
          label: 'Poll Payout Status',
        });

        const status = res.data.status;
        setActiveTransfer(res.data);

        // Stop condition: final state
        if (status === 'SUCCESSFUL' || status === 'FAILED' || status === 'REVERSED') {
          clearInterval(interval);
          setIsPolling(false);
          toast.success(`Payout completed with final state: ${status}`);
        }
      } catch {
        clearInterval(interval);
        setIsPolling(false);
      }
    }, 2500);
  };

  // Fake bank rule filler
  const fillOutcome = (ruleDigits: string, label: string) => {
    setAccountNumber(`012345${ruleDigits}`);
    toast.info(`Account number ending in ${ruleDigits} set for: ${label}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-600" />
          <span>External Bank Transfers & Beneficiaries</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Perform commercial bank account name enquiry (NIBSS), save beneficiaries, and dispatch payouts with live status polling.
        </p>
      </div>

      {/* Fake Bank Gateway Playground Table */}
      <Card
        title="Fake Bank Gateway Outcome Playground"
        subtitle="Last 4 digits of the account number trigger deterministic simulator outcomes"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2 font-medium">Last 4 Digits</th>
                <th className="px-3 py-2 font-medium">Simulated Outcome</th>
                <th className="px-3 py-2 font-medium">Behavior</th>
                <th className="px-3 py-2 font-medium text-right">Quick Fill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                <td className="px-3 py-2 font-bold text-emerald-600">...0000</td>
                <td className="px-3 py-2">
                  <Badge variant="success" size="sm">SUCCESSFUL</Badge>
                </td>
                <td className="px-3 py-2 font-sans text-slate-600 dark:text-slate-400">
                  Payout succeeds immediately on first polling pass
                </td>
                <td className="px-3 py-2 text-right font-sans">
                  <Button size="sm" variant="ghost" onClick={() => fillOutcome('0000', 'Success')}>
                    Fill 0000
                  </Button>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                <td className="px-3 py-2 font-bold text-rose-600">...1111</td>
                <td className="px-3 py-2">
                  <Badge variant="error" size="sm">FAILED</Badge>
                </td>
                <td className="px-3 py-2 font-sans text-slate-600 dark:text-slate-400">
                  Commercial bank rejects; triggers automated ledger reversal
                </td>
                <td className="px-3 py-2 text-right font-sans">
                  <Button size="sm" variant="ghost" onClick={() => fillOutcome('1111', 'Failed')}>
                    Fill 1111
                  </Button>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                <td className="px-3 py-2 font-bold text-amber-600">...2222</td>
                <td className="px-3 py-2">
                  <Badge variant="warning" size="sm">DELAYED PENDING</Badge>
                </td>
                <td className="px-3 py-2 font-sans text-slate-600 dark:text-slate-400">
                  Simulates interbank clearing delay across multiple polling cycles
                </td>
                <td className="px-3 py-2 text-right font-sans">
                  <Button size="sm" variant="ghost" onClick={() => fillOutcome('2222', 'Delayed')}>
                    Fill 2222
                  </Button>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                <td className="px-3 py-2 font-bold text-purple-600">...3333</td>
                <td className="px-3 py-2">
                  <Badge variant="held" size="sm">REVERSED</Badge>
                </td>
                <td className="px-3 py-2 font-sans text-slate-600 dark:text-slate-400">
                  Commercial bank reverses after temporary hold
                </td>
                <td className="px-3 py-2 text-right font-sans">
                  <Button size="sm" variant="ghost" onClick={() => fillOutcome('3333', 'Reversed')}>
                    Fill 3333
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beneficiary Name Enquiry Form */}
        <Card
          title="Bank Name Enquiry (Resolve Beneficiary)"
          subtitle="Verifies account holder identity before saving or sending money"
        >
          <form onSubmit={handleResolve} className="space-y-3">
            <Select
              label="Destination Bank"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              options={bankOptions}
            />

            <Input
              label="10-Digit Account Number"
              isMono
              required
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
            />

            <div className="pt-1 flex gap-2">
              <Button type="submit" isLoading={isResolving} icon={<Search className="w-4 h-4" />}>
                Resolve Name
              </Button>
            </div>

            {resolvedAccount && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Account Holder: {resolvedAccount.accountName}</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                  Bank Code: {resolvedAccount.bankCode} &bull; Account: {resolvedAccount.accountNumber}
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={isSavingBeneficiary}
                  onClick={handleSaveBeneficiary}
                >
                  Save as Beneficiary
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* External Transfer Form */}
        <Card
          title="Dispatch External Payout"
          subtitle="Sends transfer to verified commercial bank account"
        >
          <form onSubmit={handleExternalTransfer} className="space-y-3">
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

            <Select
              label="Choose Beneficiary"
              required
              value={selectedBeneficiaryId}
              onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
              options={[
                { label: '-- Select Saved Beneficiary --', value: '' },
                ...beneficiaries.map((b) => ({
                  label: `${b.accountName} (${b.accountNumber})`,
                  value: b.id,
                })),
                ...session.recentEntities
                  .filter((e) => e.type === 'beneficiary' && !beneficiaries.some((b) => b.id === e.id))
                  .map((e) => ({
                    label: `${e.label} [Recent]`,
                    value: e.id,
                  })),
              ]}
            />

            <Input
              label="Amount in NGN (₦)"
              isMono
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="15000.00"
            />

            <Input
              label="Narration"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="External settlement payout"
            />

            <Button
              type="submit"
              isLoading={isInitiating}
              disabled={!selectedBeneficiaryId}
              icon={<Send className="w-4 h-4" />}
            >
              Dispatch Payout
            </Button>
          </form>
        </Card>
      </div>

      {/* Active Payout Polling Tracker */}
      {activeTransfer && (
        <Card
          title="Live Payout Status Tracker (Automated Polling)"
          subtitle={`Tracking Transfer ID: ${activeTransfer.id}`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded border">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    activeTransfer.status === 'SUCCESSFUL'
                      ? 'success'
                      : activeTransfer.status === 'PENDING'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {activeTransfer.status}
                </Badge>
                {isPolling && (
                  <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    Polling cadence 2.5s (pauses in hidden tabs)...
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatMoney(activeTransfer.amountMinor, activeTransfer.currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Reference</span>
                <span>{activeTransfer.reference}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Fee (Minor)</span>
                <span>{formatMoney(activeTransfer.feeMinor || 0, activeTransfer.currency)}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Type</span>
                <span>EXTERNAL</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                <span className="text-slate-400 block font-sans text-[11px]">Created At</span>
                <span>{new Date(activeTransfer.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
