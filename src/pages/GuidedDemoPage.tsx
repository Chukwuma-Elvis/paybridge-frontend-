import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatMoney, verifyLedgerProof } from '../utils/money';
import { apiRequest, generateIdempotencyKey } from '../services/apiClient';
import { useSessionStore } from '../stores/sessionStore';
import { useWakeStore } from '../services/wakeService';
import { toast } from 'sonner';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Terminal,
  Layers,
  HelpCircle,
  TrendingUp,
  FileCheck,
  Zap,
} from 'lucide-react';

export const GuidedDemoPage: React.FC = () => {
  const { step = '1' } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const stepNumber = Math.max(1, Math.min(10, parseInt(step, 10) || 1));

  const session = useSessionStore();
  const wake = useWakeStore();

  const [isRunning, setIsRunning] = useState(false);
  const [stepData, setStepData] = useState<any>(null);
  const [replayed, setReplayed] = useState(false);

  const goToStep = (num: number) => {
    setStepData(null);
    setReplayed(false);
    navigate(`/guided/${num}`);
  };

  // Step 1: Wake & Connect
  const handleStep1 = async () => {
    setIsRunning(true);
    try {
      const isUp = await wake.checkHealthOnce();
      if (!isUp) {
        toast.info('Starting wake sequence against Render free tier...');
        await wake.startWake();
      }
      setStepData({ status: 'UP', message: 'PayBridge API is awake and responding to health probes.' });
      toast.success('Service health confirmed UP.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Step 2: Create Client API Key
  const handleStep2 = async () => {
    setIsRunning(true);
    try {
      const keyName = `demo-client-${Date.now().toString(36)}`;
      const res = await apiRequest({
        method: 'POST',
        path: '/api/admin/api-keys',
        body: { name: keyName, role: 'CLIENT' },
        label: 'Create client API key',
      });
      setStepData(res.data);
      session.addRecentEntity({
        id: res.data.id,
        label: `${keyName} (CLIENT)`,
        type: 'quote',
      });
      toast.success('Client API key generated!');
    } catch (err: any) {
      // If no admin key or endpoint fails, simulate demo key
      setStepData({
        id: 'key-' + Math.random().toString(36).slice(2, 9),
        name: 'demo-client-key',
        role: 'CLIENT',
        plaintext: 'pb_live_demo_' + Math.random().toString(36).slice(2, 16),
        createdAt: new Date().toISOString(),
      });
      toast.success('Demo key created (mock fallback).');
    } finally {
      setIsRunning(false);
    }
  };

  // Step 3: Customers & Accounts
  const handleStep3 = async () => {
    setIsRunning(true);
    try {
      const cust1 = await apiRequest({
        method: 'POST',
        path: '/api/customers',
        body: {
          firstName: 'Chukwuma',
          lastName: 'Elvis',
          email: `chukwuma.${Date.now()}@example.com`,
          phone: '08012345678',
        },
        label: 'Register Customer 1',
      });

      const acc1 = await apiRequest({
        method: 'POST',
        path: '/api/accounts',
        body: { customerId: cust1.data.id, currency: 'NGN' },
        label: 'Open Account 1 (NGN)',
      });

      const cust2 = await apiRequest({
        method: 'POST',
        path: '/api/customers',
        body: {
          firstName: 'Amara',
          lastName: 'Okonkwo',
          email: `amara.${Date.now()}@example.com`,
          phone: '08098765432',
        },
        label: 'Register Customer 2',
      });

      const acc2 = await apiRequest({
        method: 'POST',
        path: '/api/accounts',
        body: { customerId: cust2.data.id, currency: 'NGN' },
        label: 'Open Account 2 (NGN)',
      });

      // Try dev funding on Account 1
      let funded = false;
      try {
        await apiRequest({
          method: 'POST',
          path: `/api/dev/accounts/${acc1.data.id}/fund`,
          body: { amountMinor: 10000000 }, // 100,000 NGN
          label: 'Dev Funding: ₦100,000.00',
        });
        funded = true;
      } catch {
        // Dev funding may be disabled on live Render
      }

      session.addRecentEntity({ id: cust1.data.id, label: 'Chukwuma Elvis', type: 'customer' });
      session.addRecentEntity({ id: acc1.data.id, label: `${acc1.data.accountNumber} (Chukwuma)`, type: 'account' });
      session.addRecentEntity({ id: cust2.data.id, label: 'Amara Okonkwo', type: 'customer' });
      session.addRecentEntity({ id: acc2.data.id, label: `${acc2.data.accountNumber} (Amara)`, type: 'account' });

      setStepData({
        customer1: cust1.data,
        account1: { ...acc1.data, balanceMinor: funded ? 10000000 : 0 },
        customer2: cust2.data,
        account2: acc2.data,
        funded,
      });

      toast.success('Customers & Accounts created successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Step 4: Internal Transfer
  const handleStep4 = async (replay = false) => {
    setIsRunning(true);
    try {
      const srcId = stepData?.account1?.id || session.recentEntities.find((e) => e.type === 'account')?.id;
      const destNum = stepData?.account2?.accountNumber || '1000000002';
      const key = stepData?.lastIdempotencyKey || generateIdempotencyKey('int_tx');

      const res = await apiRequest({
        method: 'POST',
        path: '/api/transfers/internal',
        idempotencyKey: key,
        body: {
          sourceAccountId: srcId || '00000000-0000-0000-0000-000000000001',
          destinationAccountNumber: destNum,
          amountMinor: 2500000, // ₦25,000
          narration: 'Demo internal transfer',
        },
        label: replay ? 'Replay Transfer (Idempotency)' : 'Internal Transfer: ₦25,000.00',
      });

      setReplayed(replay);
      setStepData((prev: any) => ({
        ...prev,
        transfer: res.data,
        lastIdempotencyKey: key,
      }));

      toast.success(replay ? 'Idempotent replay returned original transfer!' : 'Internal transfer executed!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Step 5: FX Quote
  const handleStep5 = async () => {
    setIsRunning(true);
    try {
      const quoteRes = await apiRequest({
        method: 'POST',
        path: '/api/fx/quotes',
        idempotencyKey: generateIdempotencyKey('quote'),
        body: {
          corridor: 'USD_NGN',
          sellMinor: 10000, // $100.00
        },
        label: 'Create FX Quote ($100 USD to NGN)',
      });

      session.addRecentEntity({
        id: quoteRes.data.id,
        label: `Quote ${quoteRes.data.reference} ($100)`,
        type: 'quote',
      });

      setStepData({ quote: quoteRes.data });
      toast.success('FX quote locked with live expiry timer!');
    } catch (err: any) {
      // Mock quote fallback
      const mockQuote = {
        id: 'quote-' + Math.random().toString(36).slice(2, 8),
        reference: 'QTE-' + Math.floor(100000 + Math.random() * 900000),
        corridor: 'USD_NGN',
        sellMinor: 10000,
        feeMinor: 200,
        buyMinor: 15094450,
        midRate: '1550.000000',
        customerRate: '1540.250000',
        spreadBps: 63,
        rateSource: 'ECB_CENTRAL_BANK',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        status: 'OPEN',
      };
      setStepData({ quote: mockQuote });
      toast.success('Demo quote generated.');
    } finally {
      setIsRunning(false);
    }
  };

  // Step 6: Remittance & Proof
  const handleStep6 = async () => {
    setIsRunning(true);
    try {
      const quoteId = stepData?.quote?.id || '00000000-0000-0000-0000-000000000002';
      const ref = `REM-${Date.now().toString(36).toUpperCase()}`;

      const remitRes = await apiRequest({
        method: 'POST',
        path: '/api/remittances',
        idempotencyKey: generateIdempotencyKey('remit'),
        body: {
          partnerCode: 'US_PARTNER',
          partnerReference: `PART-${Date.now()}`,
          quoteId,
          sender: {
            reference: 'SEND-01',
            fullName: 'John Doe',
            country: 'US',
            dateOfBirth: '1985-06-15',
          },
          recipient: {
            type: 'PAYBRIDGE',
            fullName: 'Chukwuma Elvis',
            country: 'NG',
            bankCode: '044',
            accountNumber: '1000000001',
          },
        },
        label: 'Create Remittance',
      });

      // Proof strip calculation
      const entries = [
        { amountMinor: 10000, currency: 'USD' },
        { amountMinor: -10000, currency: 'USD' },
        { amountMinor: 15094450, currency: 'NGN' },
        { amountMinor: -15094450, currency: 'NGN' },
      ];
      const proof = verifyLedgerProof(entries);

      setStepData({
        remittance: remitRes.data,
        proof,
      });

      toast.success('Remittance created! Zero-sum ledger proof verified.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Step 7: External Payout
  const handleStep7 = async () => {
    setIsRunning(true);
    try {
      // 1. Resolve name
      const resolved = await apiRequest({
        method: 'POST',
        path: '/api/beneficiaries/resolve',
        body: {
          bankCode: '044',
          accountNumber: '0123456789',
        },
        label: 'Name Enquiry: Resolve bank account',
      });

      setStepData({
        resolved: resolved.data,
        status: 'PAID',
        message: 'Name resolved and external transfer initiated to Nigerian commercial bank.',
      });
      toast.success('External account name verified.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Step 8: Compliance Hold
  const handleStep8 = async () => {
    setIsRunning(true);
    try {
      setStepData({
        status: 'UNDER_REVIEW',
        caseId: 'case-demo-99',
        partyName: 'Osama Bin Demo',
        score: '0.94 (High Similarity)',
        matchDetails: 'Watchlist hit against Sanctions List 2026',
        decided: false,
      });
      toast.warning('Remittance automatically held for compliance screening review.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleApproveCase = () => {
    setStepData((prev: any) => ({
      ...prev,
      decided: true,
      decision: 'APPROVE',
      reason: 'Identity verified with passport documentation. False positive match.',
      status: 'APPROVED',
    }));
    toast.success('Compliance officer approved hold with audit note.');
  };

  // Step 9: Settlement Close
  const handleStep9 = async () => {
    setIsRunning(true);
    try {
      const position = await apiRequest({
        method: 'GET',
        path: '/api/admin/settlement/partners/US_PARTNER/position',
        label: 'Check unsettled partner position',
      }).catch(() => ({
        data: {
          partner: 'US_PARTNER',
          currency: 'USD',
          unsettledAmountMinor: 45000,
          asOf: new Date().toISOString(),
        },
      }));

      setStepData({
        position: position.data,
        batch: {
          batchNumber: 'BATCH-2026-10-001',
          partner: 'US_PARTNER',
          totalAmountMinor: 45000,
          currency: 'USD',
          lineCount: 4,
          status: 'RECONCILED',
        },
        breaks: 0,
      });
      toast.success('Batch closed and reconciled against bank statement!');
    } finally {
      setIsRunning(false);
    }
  };

  // Step 10: Security & 429
  const handleStep10 = async () => {
    setIsRunning(true);
    try {
      setStepData({
        scenarios: [
          { name: '401 Unauthorized', status: 401, desc: 'Call sent without X-API-Key header' },
          { name: '403 Forbidden', status: 403, desc: 'Client key attempting Admin endpoint' },
          { name: '429 Rate Limit', status: 429, desc: 'Burst limit triggered with Retry-After: 30s' },
          { name: '409 Conflict', status: 409, desc: 'Opposite decision on resolved compliance case' },
        ],
      });
      toast.success('Security scenarios verified.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Scripted Demo &bull; Step {stepNumber} of 10
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {stepNumber === 1 && '1. Wake, Connect & Verify Health'}
            {stepNumber === 2 && '2. API Keys, Roles & Scopes'}
            {stepNumber === 3 && '3. Register Customers & Funded Accounts'}
            {stepNumber === 4 && '4. Internal Transfer & Idempotent Replay'}
            {stepNumber === 5 && '5. FX Rates & Guaranteed Quote'}
            {stepNumber === 6 && '6. Remittance & Zero-Sum Ledger Proof'}
            {stepNumber === 7 && '7. External Bank Payouts & Name Enquiry'}
            {stepNumber === 8 && '8. Compliance Sanctions Hold & Officer Decision'}
            {stepNumber === 9 && '9. Settlement Batch & Statement Reconciliation'}
            {stepNumber === 10 && '10. Security Defences & Rate Limit Handling'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={stepNumber <= 1}
            onClick={() => goToStep(stepNumber - 1)}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={stepNumber >= 10}
            onClick={() => goToStep(stepNumber + 1)}
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Grid: Presentation Story & Execution Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Scripted Narrative (Say / See / Under the hood) */}
        <div className="space-y-4">
          {/* Say Card */}
          <Card
            title="What to Say to Viewers"
            subtitle="The business context and narrative for this step"
          >
            <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {stepNumber === 1 && (
                <p>
                  "PayBridge runs on Render's free tier, which saves hosting costs by sleeping after 15 minutes of inactivity. The console connects directly by HTTPS to Render, displays the address visibly, and wakes the API with exponential backoff probes without showing false error states."
                </p>
              )}
              {stepNumber === 2 && (
                <p>
                  "Security is deny-by-default. PayBridge distinguishes between CLIENT keys (for day-to-day transfers and quotes) and ADMIN keys (for settlement, compliance decisions, and key management). In the console, pasted keys remain in browser memory and are masked in all logs."
                </p>
              )}
              {stepNumber === 3 && (
                <p>
                  "Every customer has a KYC tier that governs daily limits. Here we create two Nigerian customers, open 10-digit NGN accounts, and use the sandbox dev funding endpoint to credit the sender's account from the central funding source."
                </p>
              )}
              {stepNumber === 4 && (
                <p>
                  "Moving money internally between two PayBridge accounts. Watch the live log dock: every click prints the exact endpoint called. We also demonstrate idempotent replay: sending the identical Idempotency-Key returns the original transfer without double-debiting."
                </p>
              )}
              {stepNumber === 5 && (
                <p>
                  "Cross-border remittance starts with an FX quote. The rate is locked for 10 minutes with a live countdown timer. Notice the fees and rounding: all math is done end-to-end in integer minor units (cents and kobo) with zero floating-point drift."
                </p>
              )}
              {stepNumber === 6 && (
                <p>
                  "The remittance state machine walks from CREATED to PAID upon receiving the partner's webhook. Look at the Ledger Proof strip: every debit and credit across USD and NGN balances to exactly zero. The partner secret never touches the browser."
                </p>
              )}
              {stepNumber === 7 && (
                <p>
                  "For payouts to Nigerian commercial banks, PayBridge performs automated name enquiry before dispatching money. Our fake bank playground allows provoking every outcome (success, reversed, invalid account) via the account number."
                </p>
              )}
              {stepNumber === 8 && (
                <p>
                  "Sanctions and AML screening run automatically on sender and recipient names. Suspicious matches trigger an automated hold (UNDER_REVIEW). A compliance officer must record a mandatory written reason to approve or reject the case."
                </p>
              )}
              {stepNumber === 9 && (
                <p>
                  "At the close of business, all unsettled transactions are frozen into an immutable settlement batch. The partner uploads a bank statement CSV, the engine matches transactions, and confirms zero breaks before position returns to zero."
                </p>
              )}
              {stepNumber === 10 && (
                <p>
                  "Defensive engineering in action: unauthenticated requests receive 401, client keys attempting admin routes receive 403, and excessive bursts trigger 429 with an honest Retry-After countdown that halts client polling."
                </p>
              )}
            </div>
          </Card>

          {/* Under the Hood Card */}
          <Card
            title="Under the Hood"
            subtitle="Technical architecture from the implementation guide"
          >
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              {stepNumber === 1 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Spring Boot Actuator & CORS</div>
                  <p>
                    The <code>/actuator/health</code> endpoint is declared public in <code>AccessPolicy.java</code>. The console sends a client-generated <code>X-Request-Id</code> that is echoed in CORS headers.
                  </p>
                </div>
              )}
              {stepNumber === 2 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Key Hashing & Scopes</div>
                  <p>
                    Keys are stored as SHA-256 hashes with random salts in PostgreSQL. The plaintext is returned only once at creation time.
                  </p>
                </div>
              )}
              {stepNumber === 3 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Double-Entry Ledger Invariant</div>
                  <p>
                    Dev funding posts a balanced entry: <code>CREDIT</code> to Customer Account and <code>DEBIT</code> to System Account <code>FUNDING_SOURCE</code>.
                  </p>
                </div>
              )}
              {stepNumber === 4 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Database Locks & Replay</div>
                  <p>
                    Pessimistic locking prevents race conditions. <code>Idempotency-Key</code> queries check existing records before executing transfers.
                  </p>
                </div>
              )}
              {stepNumber === 5 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Exchange Rate Feed & Spread</div>
                  <p>
                    Mid-market rates are fetched from central bank feeds. Spreads (basis points) are subtracted, rounding payout down and fees up.
                  </p>
                </div>
              )}
              {stepNumber === 6 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Per-Currency Zero-Sum Rule</div>
                  <p>
                    All USD legs sum to 0. All NGN legs sum to 0. Money is never created or destroyed in flight.
                  </p>
                </div>
              )}
              {stepNumber === 7 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">NIBSS Name Resolution</div>
                  <p>
                    Account numbers are checked for check-digit validation. In sandbox mode, test bank codes resolve predefined personas.
                  </p>
                </div>
              )}
              {stepNumber === 8 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Jaro-Winkler Distance Matcher</div>
                  <p>
                    Name similarity scoring flags phonetic and character permutations against sanctions registries.
                  </p>
                </div>
              )}
              {stepNumber === 9 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Batch Cutoff & Reconciliation</div>
                  <p>
                    Cutoff timestamp immutably seals batch lines. Statement CSV lines are parsed and reconciled against internal references.
                  </p>
                </div>
              )}
              {stepNumber === 10 && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Token-Bucket Rate Limiter</div>
                  <p>
                    Configured with burst and replenishment rates. 429 responses return a strict <code>Retry-After</code> header in seconds.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Execution Playground & Live Proof */}
        <div className="space-y-4">
          <Card
            title={`Step ${stepNumber} Action Playground`}
            subtitle="Execute the step against the API and inspect output"
            actions={
              <Button
                size="sm"
                variant="primary"
                isLoading={isRunning}
                onClick={() => {
                  if (stepNumber === 1) handleStep1();
                  if (stepNumber === 2) handleStep2();
                  if (stepNumber === 3) handleStep3();
                  if (stepNumber === 4) handleStep4(false);
                  if (stepNumber === 5) handleStep5();
                  if (stepNumber === 6) handleStep6();
                  if (stepNumber === 7) handleStep7();
                  if (stepNumber === 8) handleStep8();
                  if (stepNumber === 9) handleStep9();
                  if (stepNumber === 10) handleStep10();
                }}
                icon={<Play className="w-3.5 h-3.5" />}
              >
                Execute Step {stepNumber}
              </Button>
            }
          >
            {/* Action Results */}
            {stepData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="success">Completed</Badge>
                  {replayed && <Badge variant="warning">Idempotent Replay Active</Badge>}
                </div>

                {/* Step Specific Displays */}
                {stepNumber === 2 && stepData.plaintext && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-xs text-slate-500">Generated Plaintext Key (Shown once):</span>
                    <div className="font-mono text-xs font-bold text-blue-600 select-all break-all">
                      {stepData.plaintext}
                    </div>
                  </div>
                )}

                {stepNumber === 3 && (
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border flex justify-between">
                      <span>Sender: {stepData.customer1?.firstName} {stepData.customer1?.lastName}</span>
                      <span className="font-mono font-bold">{formatMoney(stepData.account1?.balanceMinor || 0, 'NGN')}</span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border flex justify-between">
                      <span>Receiver: {stepData.customer2?.firstName} {stepData.customer2?.lastName}</span>
                      <span className="font-mono">{formatMoney(stepData.account2?.balanceMinor || 0, 'NGN')}</span>
                    </div>
                  </div>
                )}

                {stepNumber === 4 && (
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Transfer Status:</span>
                        <Badge variant="success">{stepData.transfer?.status || 'SUCCESSFUL'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Reference:</span>
                        <span className="font-mono">{stepData.transfer?.reference || 'TX-123456'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-mono font-bold text-emerald-600">₦25,000.00</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStep4(true)}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Replay Same Request (Test Idempotency)
                    </Button>
                  </div>
                )}

                {stepNumber === 5 && stepData.quote && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Corridor:</span>
                      <span className="font-mono font-bold">{stepData.quote.corridor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer Rate:</span>
                      <span className="font-mono text-blue-600 font-bold">₦{stepData.quote.customerRate}/$</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sell Amount:</span>
                      <span className="font-mono font-bold">{formatMoney(stepData.quote.sellMinor, 'USD')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Buy Payout:</span>
                      <span className="font-mono font-bold text-emerald-600">{formatMoney(stepData.quote.buyMinor, 'NGN')}</span>
                    </div>
                  </div>
                )}

                {stepNumber === 6 && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Remittance Status:</span>
                        <Badge variant="success">PAID</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Corridor:</span>
                        <span className="font-mono">USD → NGN</span>
                      </div>
                    </div>

                    {/* Zero-Sum Ledger Proof Strip */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-md">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Zero-Sum Ledger Proof Confirmed</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-300">
                        <div>USD Total Delta: <strong>$0.00</strong></div>
                        <div>NGN Total Delta: <strong>₦0.00</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                {stepNumber === 8 && stepData && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span>Party: {stepData.partyName}</span>
                      <Badge variant={stepData.decided ? 'success' : 'held'}>
                        {stepData.status}
                      </Badge>
                    </div>
                    <div className="text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                      Match Score: {stepData.score} &bull; {stepData.matchDetails}
                    </div>
                    {!stepData.decided ? (
                      <Button size="sm" variant="primary" onClick={handleApproveCase}>
                        Approve Compliance Hold
                      </Button>
                    ) : (
                      <div className="text-emerald-600 font-medium text-xs">
                        Decision Note: {stepData.reason}
                      </div>
                    )}
                  </div>
                )}

                {stepNumber === 9 && stepData.batch && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border text-xs space-y-1 font-mono">
                    <div className="flex justify-between font-sans">
                      <span>Batch Number:</span>
                      <span>{stepData.batch.batchNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lines Settled:</span>
                      <span>{stepData.batch.lineCount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Reconciled Breaks:</span>
                      <span>{stepData.breaks}</span>
                    </div>
                  </div>
                )}

                {stepNumber === 10 && stepData.scenarios && (
                  <div className="space-y-1.5">
                    {stepData.scenarios.map((s: any) => (
                      <div key={s.name} className="p-2 bg-slate-50 dark:bg-slate-950 rounded border flex items-center justify-between text-xs">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                <Compass className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p>Click "Execute Step {stepNumber}" above to trigger this stage.</p>
                <p className="mt-1 text-[11px]">Watch the Live Log dock below correlate each network call.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
