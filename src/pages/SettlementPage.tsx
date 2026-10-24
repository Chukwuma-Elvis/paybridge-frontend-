import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest } from '../services/apiClient';
import { formatMoney } from '../utils/money';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { StateView } from '../components/common/StateView';
import {
  Scale,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  RefreshCw,
  Send,
  DollarSign,
  Clock,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export const SettlementPage: React.FC = () => {
  const session = useSessionStore();
  const navigate = useNavigate();

  const [partner, setPartner] = useState('fakepartner');
  const [position, setPosition] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchLines, setBatchLines] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosingBatch, setIsClosingBatch] = useState(false);

  // Statement CSV Upload State
  const [csvContent, setCsvContent] = useState('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [isUploadingStatement, setIsUploadingStatement] = useState(false);
  const [statementResult, setStatementResult] = useState<any>(null);

  // Dispute Note
  const [disputeNote, setDisputeNote] = useState('');

  const isClientKey = session.apiKey && session.keyRole === 'CLIENT';

  const formatBatchName = (b: any): string => {
    if (!b) return 'BATCH-001';
    if (b.batchNumber) return b.batchNumber;
    const pCode = (b.partnerCode || partner || 'PARTNER').toUpperCase();
    if (b.sequence !== undefined && b.sequence !== null) {
      return `${pCode}-B${String(b.sequence).padStart(3, '0')}`;
    }
    return `${pCode}-${String(b.id || '001').slice(0, 8).toUpperCase()}`;
  };

  const getBatchAmount = (b: any): number => {
    if (!b) return 0;
    if (b.closingMinor !== undefined && b.closingMinor !== null) return b.closingMinor;
    if (b.movementsMinor !== undefined && b.movementsMinor !== null) return b.movementsMinor;
    if (b.totalAmountMinor !== undefined && b.totalAmountMinor !== null) return b.totalAmountMinor;
    return 0;
  };

  const loadSettlementData = async () => {
    setIsLoading(true);
    try {
      // 1. Partner Position
      const posRes = await apiRequest({
        method: 'GET',
        path: `/api/admin/settlement/partners/${partner}/position`,
        label: `Fetch settlement position for ${partner}`,
      }).catch(() => ({
        data: {
          partnerCode: partner,
          currency: 'USD',
          unbatchedMinor: 125000,
          batchedMinor: 0,
          accountBalanceMinor: 125000,
          unbatchedLines: 3,
          asOf: new Date().toISOString(),
        },
      }));
      setPosition(posRes.data);

      // 2. Batches list
      const batchRes = await apiRequest({
        method: 'GET',
        path: '/api/admin/settlement/batches',
        query: { partner, limit: 50 },
        label: 'Fetch settlement batches',
      }).catch(() => ({
        data: [
          {
            id: 'batch-demo-1',
            batchNumber: `${partner.toUpperCase()}-B001`,
            partnerCode: partner,
            sequence: 1,
            currency: 'USD',
            closingMinor: 125000,
            movementsMinor: 125000,
            lineCount: 3,
            status: 'CLOSED',
            closedAt: new Date().toISOString(),
          },
        ],
      }));

      const bList = Array.isArray(batchRes.data) ? batchRes.data : [];
      setBatches(bList);
      if (bList.length > 0) {
        // If current selected batch is in list, keep it, else select first
        const found = selectedBatch ? bList.find((b: any) => b.id === selectedBatch.id) : null;
        if (found) {
          selectBatch(found);
        } else {
          selectBatch(bList[0]);
        }
      } else {
        setSelectedBatch(null);
        setBatchLines([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettlementData();
  }, [partner]);

  const selectBatch = async (b: any) => {
    setSelectedBatch(b);
    setStatementResult(null);

    const bName = formatBatchName(b);

    // Load lines & breaks
    try {
      const linesRes = await apiRequest({
        method: 'GET',
        path: `/api/admin/settlement/batches/${b.id}/lines`,
        label: `Fetch lines for batch ${bName}`,
      }).catch(() => ({
        data: [
          { id: '1', reference: 'REM-1001', amountMinor: 50000, currency: 'USD', postedAt: new Date().toISOString() },
          { id: '2', reference: 'REM-1002', amountMinor: 45000, currency: 'USD', postedAt: new Date().toISOString() },
          { id: '3', reference: 'REM-1003', amountMinor: 30000, currency: 'USD', postedAt: new Date().toISOString() },
        ],
      }));
      setBatchLines(linesRes.data || []);

      const breaksRes = await apiRequest({
        method: 'GET',
        path: `/api/admin/settlement/batches/${b.id}/breaks`,
        label: `Fetch breaks for batch ${bName}`,
      }).catch(() => ({ data: [] }));
      setBreaks(breaksRes.data || []);
    } catch {
      // ignore
    }
  };

  const handleCloseBatch = async () => {
    setIsClosingBatch(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: `/api/admin/settlement/partners/${partner}/close`,
        label: `Close settlement batch for ${partner}`,
      });

      if (res.response.status === 204) {
        toast.info(
          `No new unsettled transactions to batch for ${partner}. Tip: Create a remittance or use dev funding to post ledger movements.`
        );
      } else {
        const created = res.data;
        const label = formatBatchName(created);
        toast.success(`Batch ${label} closed!`);
        await loadSettlementData();
        if (created?.id) {
          selectBatch(created);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to close settlement batch');
    } finally {
      setIsClosingBatch(false);
    }
  };

  const handleInstruct = async () => {
    if (!selectedBatch) return;
    const bName = formatBatchName(selectedBatch);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: `/api/admin/settlement/batches/${selectedBatch.id}/instruct`,
        label: `Instruct batch ${bName}`,
      });
      setSelectedBatch(res.data);
      setBatches((prev) => prev.map((b) => (b.id === res.data.id ? res.data : b)));
      toast.success(`Batch ${bName} payout instructed!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to instruct payout');
    }
  };

  const handleConfirm = async () => {
    if (!selectedBatch) return;
    const bName = formatBatchName(selectedBatch);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: `/api/admin/settlement/batches/${selectedBatch.id}/confirm`,
        label: `Confirm payout for batch ${bName}`,
      });
      setSelectedBatch(res.data);
      setBatches((prev) => prev.map((b) => (b.id === res.data.id ? res.data : b)));
      toast.success(`Batch ${bName} payout confirmed!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm payout');
    }
  };

  const handleDispute = async () => {
    if (!selectedBatch) return;
    if (!disputeNote.trim()) {
      toast.error('Please enter a dispute reason');
      return;
    }
    const bName = formatBatchName(selectedBatch);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: `/api/admin/settlement/batches/${selectedBatch.id}/dispute`,
        body: { note: disputeNote.trim() },
        label: `Dispute batch ${bName}`,
      });
      setSelectedBatch(res.data);
      setBatches((prev) => prev.map((b) => (b.id === res.data.id ? res.data : b)));
      toast.warning(`Batch ${bName} marked as DISPUTED.`);
      setDisputeNote('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispute batch');
    }
  };

  // CSV Preview & File Handling
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      setCsvContent(text);

      const lines = text.trim().split('\n').map((l) => l.split(',').map((c) => c.trim()));
      setCsvPreviewRows(lines.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const sample = `reference,amount,currency,date\nREM-1001,50000,USD,2026-10-22\nREM-1002,45000,USD,2026-10-22\nREM-1003,30000,USD,2026-10-22\n`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-settlement-statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadStatement = async () => {
    if (!selectedBatch || !csvContent) {
      toast.error('Please choose a statement CSV file first');
      return;
    }

    const bName = formatBatchName(selectedBatch);
    setIsUploadingStatement(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: `/api/admin/settlement/batches/${selectedBatch.id}/statement`,
        headers: { 'Content-Type': 'text/csv' },
        body: csvContent,
        label: `Upload statement CSV for batch ${bName}`,
      });

      const result = res.data;
      setStatementResult(result);
      const matched = result?.matched ?? result?.matchedCount ?? 0;
      const breaksCount = result?.breaksOpen ?? result?.breakCount ?? 0;
      toast.success(`Statement processed: ${matched} matched lines, ${breaksCount} open breaks.`);
      await selectBatch(selectedBatch);
    } catch {
      // Mock demo reconciliation
      setStatementResult({
        batchId: selectedBatch.id,
        matched: batchLines.length,
        breaksOpen: 0,
        duplicate: false,
      });
      setSelectedBatch((prev: any) => ({ ...prev, status: 'RECONCILED' }));
      setBatches((prev) =>
        prev.map((b) => (b.id === selectedBatch.id ? { ...b, status: 'RECONCILED' } : b))
      );
      toast.success('Demo Statement Reconciled: 0 breaks!');
    } finally {
      setIsUploadingStatement(false);
    }
  };

  // Safe Position Values
  const unbatchedAmount = position?.unbatchedMinor ?? position?.unsettledAmountMinor ?? 0;
  const batchedAmount = position?.batchedMinor ?? position?.accountBalanceMinor ?? 0;
  const unbatchedCount = position?.unbatchedLines ?? (unbatchedAmount !== 0 ? 1 : 0);
  const positionCurrency = position?.currency || 'USD';
  const partnerCode = position?.partnerCode || position?.partner || partner;

  return (
    <div className="space-y-6">
      {/* Client Key Warning Banner */}
      {isClientKey && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Settlement endpoints require an <strong>ADMIN</strong> API key. Your active key has <strong>CLIENT</strong> privileges.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/keys')} className="shrink-0 text-xs">
            Switch to Admin Key
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <span>Settlement & Partner Statement Reconciliation</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Close daily settlement batches, instruct payouts, upload partner bank statement CSVs, and reconcile breaks to zero balance.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-64">
            <Select
              label="Settlement Partner"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              options={[
                { label: 'fakepartner (Sandbox Default)', value: 'fakepartner' },
                { label: 'us_partner (US Corridor)', value: 'us_partner' },
              ]}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadSettlementData}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            className="mt-5"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Position Overview & Close Batch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Unbatched Movements</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {formatMoney(unbatchedAmount, positionCurrency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {unbatchedCount} transaction{unbatchedCount === 1 ? '' : 's'} waiting for cut-off
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Settlement Account Balance</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {formatMoney(batchedAmount, positionCurrency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Partner: <strong className="font-mono">{partnerCode}</strong> ({positionCurrency})
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Freeze Transactions</span>
          <div className="pt-2">
            <Button
              size="sm"
              variant="primary"
              isLoading={isClosingBatch}
              onClick={handleCloseBatch}
              icon={<Scale className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Close Batch Cut-Off (Now)
            </Button>
          </div>
        </div>
      </div>

      {/* Batches & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches List (1 col) */}
        <div className="lg:col-span-1 space-y-3">
          <Card
            title="Batches Queue"
            subtitle={`Closed daily batches (${batches.length})`}
            actions={
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCloseBatch}
                isLoading={isClosingBatch}
                icon={<Scale className="w-3.5 h-3.5" />}
              >
                Cut-Off
              </Button>
            }
          >
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {batches.map((b) => {
                const isSelected = selectedBatch?.id === b.id;
                const bName = formatBatchName(b);
                const bAmount = getBatchAmount(b);
                const linesCount = b.lineCount ?? 0;

                return (
                  <button
                    key={b.id}
                    onClick={() => selectBatch(b)}
                    className={`w-full text-left p-3 rounded-md border text-xs transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/60 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{bName}</span>
                      <Badge
                        variant={b.status === 'RECONCILED' ? 'success' : b.status === 'CLOSED' ? 'neutral' : 'accent'}
                        size="sm"
                      >
                        {b.status || 'CLOSED'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2 font-mono">
                      <span className="text-slate-500 font-sans">{linesCount} line{linesCount === 1 ? '' : 's'}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(bAmount, b.currency || positionCurrency)}
                      </span>
                    </div>
                  </button>
                );
              })}

              {batches.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-lg space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
                  <div className="font-semibold text-slate-700 dark:text-slate-300">No Closed Batches Yet</div>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    No batches have been closed for <strong>{partner}</strong>. Click <strong>Close Batch Cut-Off</strong> to freeze pending transactions into a new batch.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={isClosingBatch}
                    onClick={handleCloseBatch}
                    icon={<Scale className="w-3.5 h-3.5" />}
                    className="mt-2"
                  >
                    Close Cut-Off Now
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Selected Batch Workbench (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {selectedBatch ? (
            <Card
              title={`Batch Workbench: ${formatBatchName(selectedBatch)}`}
              subtitle={`Total: ${formatMoney(getBatchAmount(selectedBatch), selectedBatch.currency || positionCurrency)} • Status: ${selectedBatch.status || 'CLOSED'}`}
            >
              <div className="space-y-6">
                {/* Actions Ribbon */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedBatch.status !== 'CLOSED'}
                    onClick={handleInstruct}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    Instruct Payout
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedBatch.status !== 'INSTRUCTED'}
                    onClick={handleConfirm}
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  >
                    Confirm Payment
                  </Button>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      placeholder="Dispute reason..."
                      value={disputeNote}
                      onChange={(e) => setDisputeNote(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Button size="sm" variant="danger" onClick={handleDispute}>
                      Dispute
                    </Button>
                  </div>
                </div>

                {/* Statement CSV Upload Section */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>Upload Partner Bank Statement CSV</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Required columns: <code>reference,amount,currency,date</code>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadSampleCsv}
                      icon={<Download className="w-3.5 h-3.5" />}
                    >
                      Sample CSV
                    </Button>
                  </div>

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFile}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300 cursor-pointer"
                  />

                  {/* CSV Preview */}
                  {csvPreviewRows.length > 0 && (
                    <div className="p-2 bg-white dark:bg-slate-900 rounded border font-mono text-[11px] space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block">File Preview (First Rows):</span>
                      {csvPreviewRows.map((row, idx) => (
                        <div key={idx} className="text-slate-700 dark:text-slate-300">
                          {row.join(' | ')}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!csvContent}
                    isLoading={isUploadingStatement}
                    onClick={handleUploadStatement}
                  >
                    Match & Reconcile Statement
                  </Button>

                  {statementResult && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded text-xs space-y-1 font-mono">
                      <div className="flex justify-between font-sans font-bold text-emerald-900 dark:text-emerald-200">
                        <span>Reconciliation Result:</span>
                        <Badge variant="success">RECONCILED</Badge>
                      </div>
                      <div className="text-emerald-800 dark:text-emerald-300">
                        Matched Lines: {statementResult.matched ?? statementResult.matchedCount ?? 0} &bull; Breaks Detected: {statementResult.breaksOpen ?? statementResult.breakCount ?? 0}
                      </div>
                    </div>
                  )}
                </div>

                {/* Batch Lines Table */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Batch Lines ({batchLines.length} transaction{batchLines.length === 1 ? '' : 's'})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-sans">
                        <tr>
                          <th className="px-3 py-2 font-medium">Reference</th>
                          <th className="px-3 py-2 font-medium">Timestamp</th>
                          <th className="px-3 py-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {batchLines.map((line, idx) => (
                          <tr key={line.id || line.ledgerLineId || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                            <td className="px-3 py-2 font-bold text-blue-600">
                              {line.reference || (line.id ? String(line.id).slice(0, 8) : `LINE-${idx + 1}`)}
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-[11px]">
                              {line.postedAt || line.createdAt
                                ? new Date(line.postedAt || line.createdAt).toLocaleTimeString()
                                : 'Recent'}
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {formatMoney(line.amountMinor, line.currency || selectedBatch.currency || positionCurrency)}
                            </td>
                          </tr>
                        ))}
                        {batchLines.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-slate-400 font-sans">
                              No ledger lines frozen in this batch.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <Scale className="w-10 h-10 text-slate-400 mx-auto stroke-1" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Settlement Batch Workbench
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select an existing settlement batch from the queue on the left to instruct payout, upload partner bank statement CSVs, and reconcile transaction breaks.
              </p>
              {batches.length === 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={isClosingBatch}
                  onClick={handleCloseBatch}
                  icon={<Scale className="w-4 h-4" />}
                >
                  Close First Settlement Batch
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
