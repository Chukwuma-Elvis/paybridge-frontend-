import React, { useState, useEffect, useMemo } from 'react';
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
  WatchlistEntry,
  evaluateParty,
  nameSimilarity,
} from '../utils/screening';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  UserPlus,
  ArrowRight,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Globe,
  Calendar,
  ListFilter,
} from 'lucide-react';
import { toast } from 'sonner';

export const CompliancePage: React.FC = () => {
  const session = useSessionStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'CASES' | 'WATCHLIST'>('CASES');

  // ==========================================
  // Cases State
  // ==========================================
  const [cases, setCases] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'APPROVED' | 'REJECTED'>('OPEN');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [isLoadingCases, setIsLoadingCases] = useState(false);

  // Decision Form
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [decisionReason, setDecisionReason] = useState('Identity verified against government passport document. False positive match.');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Customer Limit Check
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [limitStatus, setLimitStatus] = useState<any>(null);
  const [isLoadingLimit, setIsLoadingLimit] = useState(false);

  // ==========================================
  // Watchlist State
  // ==========================================
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Entry Form State
  const [newName, setNewName] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [newCountry, setNewCountry] = useState('NG');
  const [newBirth, setNewBirth] = useState('');
  const [newListName, setNewListName] = useState('CUSTOM-LIST');
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isResettingWatchlist, setIsResettingWatchlist] = useState(false);

  // Interactive Live Simulator State
  const [simName, setSimName] = useState('Alina Samplova');
  const [simCountry, setSimCountry] = useState('NG');
  const [simBirth, setSimBirth] = useState('');

  // Load Cases
  const loadCases = async () => {
    setIsLoadingCases(true);
    try {
      const res = await apiRequest({
        method: 'GET',
        path: '/api/admin/compliance/cases',
        query: { status: statusFilter, limit: 50 },
        label: `List compliance cases [${statusFilter}]`,
      });
      setCases(res.data || []);
      if (res.data?.length > 0 && !selectedCase) {
        setSelectedCase(res.data[0]);
      }
    } catch {
      // Mock cases for demo if backend is empty
      const mockCases = [
        {
          id: 'case-demo-101',
          reference: 'CASE-2026-001',
          partyName: 'Osama Bin Demo',
          partyCountry: 'NG',
          partyBirth: '1982-04-12',
          outcome: 'HIT_SUSPECTED',
          matchDetails: 'Jaro-Winkler 0.94 similarity score against OFAC / UN Sanctions List',
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        },
      ];
      setCases(mockCases);
      setSelectedCase(mockCases[0]);
    } finally {
      setIsLoadingCases(false);
    }
  };

  // Load Watchlist
  const loadWatchlist = async () => {
    setIsLoadingWatchlist(true);
    try {
      const res = await apiRequest({
        method: 'GET',
        path: '/api/compliance/watchlist',
        label: 'List screening watchlist candidates',
      });
      setWatchlist(res.data || []);
    } catch {
      // Default built-in entries fallback
      setWatchlist([
        {
          listName: 'SYNTHETIC-LIST',
          entryId: 'SYN-001',
          names: ['Zorgon Testlist', 'Z. Testlist'],
          country: 'ZZ',
          birth: '1970-01-01',
        },
        {
          listName: 'SYNTHETIC-LIST',
          entryId: 'SYN-002',
          names: ['Alina Samplova'],
          country: 'RU',
          birth: '1982-06-15',
        },
        {
          listName: 'SYNTHETIC-LIST',
          entryId: 'SYN-003',
          names: ['Kwame Mockerson', 'Kwame M. Mocker'],
          country: 'GH',
          birth: null,
        },
      ]);
    } finally {
      setIsLoadingWatchlist(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    if (!decisionReason.trim()) {
      toast.error('A mandatory written audit reason is required for compliance decisions');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: `/api/admin/compliance/cases/${selectedCase.id}/decision`,
        body: {
          decision,
          reason: decisionReason.trim(),
        },
        label: `Compliance Decision: ${decision} for ${selectedCase.reference}`,
      });

      const updated = res.data;
      setSelectedCase(updated);
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(`Compliance case ${decision} recorded in immutable audit log.`);
    } catch (err: any) {
      if (err.status === 409) {
        toast.error('HTTP 409 Conflict: Cannot apply opposite decision to an already finalized case!');
      } else {
        const updated = {
          ...selectedCase,
          status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          decidedBy: 'compliance-admin',
          decisionReason,
          decidedAt: new Date().toISOString(),
        };
        setSelectedCase(updated);
        setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success(`Demo decision recorded: ${decision}`);
      }
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleCheckLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerIdInput.trim()) {
      toast.error('Customer ID is required');
      return;
    }

    setIsLoadingLimit(true);
    try {
      const res = await apiRequest({
        method: 'GET',
        path: `/api/compliance/customers/${customerIdInput.trim()}/limits`,
        label: 'Fetch customer transaction limits',
      });
      setLimitStatus(res.data);
      toast.success('Customer limits loaded.');
    } catch {
      setLimitStatus({
        customerId: customerIdInput,
        tier: 'BASIC',
        dailyLimitMinor: 100000,
        spentTodayMinor: 25000,
        remainingMinor: 75000,
        currency: 'USD',
      });
    } finally {
      setIsLoadingLimit(false);
    }
  };

  // Add Watchlist Entry
  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Primary name is required');
      return;
    }

    const aliases = newAliases
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const names = [newName.trim(), ...aliases];

    setIsAddingEntry(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/compliance/watchlist',
        body: {
          listName: newListName.trim() || 'CUSTOM-LIST',
          name: newName.trim(),
          names,
          country: newCountry.trim().toUpperCase() || undefined,
          birth: newBirth.trim() || undefined,
        },
        label: `Add ${newName.trim()} to screening watchlist`,
      });

      const added = res.data;
      setWatchlist((prev) => [...prev, added]);
      setNewName('');
      setNewAliases('');
      setNewBirth('');
      toast.success(`Added "${newName.trim()}" to active watchlist!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add entry to watchlist');
      // Local fallback
      const mockEntry: WatchlistEntry = {
        listName: newListName.trim() || 'CUSTOM-LIST',
        entryId: `CUST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        names,
        country: newCountry.trim().toUpperCase() || null,
        birth: newBirth.trim() || null,
      };
      setWatchlist((prev) => [...prev, mockEntry]);
      setNewName('');
      setNewAliases('');
      setNewBirth('');
      toast.success(`Added "${newName.trim()}" to local demo watchlist.`);
    } finally {
      setIsAddingEntry(false);
    }
  };

  // Reset Watchlist
  const handleResetWatchlist = async () => {
    if (!window.confirm('Reset the screening watchlist to built-in synthetic entries? Custom entries will be removed.')) {
      return;
    }

    setIsResettingWatchlist(true);
    try {
      await apiRequest({
        method: 'DELETE',
        path: '/api/compliance/watchlist',
        label: 'Reset screening watchlist to default',
      });
      toast.success('Watchlist reset to built-in synthetic entries.');
      await loadWatchlist();
    } catch {
      // Local fallback reset
      setWatchlist([
        {
          listName: 'SYNTHETIC-LIST',
          entryId: 'SYN-001',
          names: ['Zorgon Testlist', 'Z. Testlist'],
          country: 'ZZ',
          birth: '1970-01-01',
        },
        {
          listName: 'SYNTHETIC-LIST',
          entryId: 'SYN-002',
          names: ['Alina Samplova'],
          country: 'RU',
          birth: '1982-06-15',
        },
        {
          listName: 'SYNTHETIC-LIST',
          entryId: 'SYN-003',
          names: ['Kwame Mockerson', 'Kwame M. Mocker'],
          country: 'GH',
          birth: null,
        },
      ]);
      toast.success('Watchlist reset to default.');
    } finally {
      setIsResettingWatchlist(false);
    }
  };

  // Filtered Watchlist
  const filteredWatchlist = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return watchlist;
    return watchlist.filter(
      (entry) =>
        entry.listName.toLowerCase().includes(q) ||
        entry.entryId.toLowerCase().includes(q) ||
        (entry.country && entry.country.toLowerCase().includes(q)) ||
        entry.names.some((n) => n.toLowerCase().includes(q))
    );
  }, [watchlist, searchQuery]);

  // Live Match Simulator Result
  const liveMatchResult = useMemo(() => {
    return evaluateParty(simName, simCountry, simBirth, watchlist);
  }, [simName, simCountry, simBirth, watchlist]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Compliance Desk & Screening Registry</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time sanctions & PEP screening gate, synthetic watchlists, and KYC customer tier limits.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('CASES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CASES'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Review Queue</span>
            {cases.filter((c) => c.status === 'OPEN').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full text-[10px]">
                {cases.filter((c) => c.status === 'OPEN').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WATCHLIST')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'WATCHLIST'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Watchlist Registry</span>
            <span className="ml-1 px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[10px]">
              {watchlist.length}
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: REVIEW CASES QUEUE & KYC LIMITS */}
      {/* ==================================================== */}
      {activeTab === 'CASES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cases List */}
          <div className="lg:col-span-1 space-y-3">
            <Card
              title="Screening Cases Queue"
              subtitle="Filtered by resolution status"
              actions={
                <Button size="sm" variant="ghost" onClick={loadCases} isLoading={isLoadingCases} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                  Refresh
                </Button>
              }
            >
              <div className="space-y-3">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  options={[
                    { label: 'OPEN (Needs Decision)', value: 'OPEN' },
                    { label: 'APPROVED', value: 'APPROVED' },
                    { label: 'REJECTED', value: 'REJECTED' },
                  ]}
                />

                <div className="space-y-2">
                  {cases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`w-full text-left p-3 rounded-md border text-xs transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/60 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{c.reference}</span>
                          <Badge
                            variant={c.status === 'APPROVED' ? 'success' : c.status === 'OPEN' ? 'held' : 'error'}
                            size="sm"
                          >
                            {c.status}
                          </Badge>
                        </div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mt-1">{c.partyName}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{c.matchDetails}</div>
                      </button>
                    );
                  })}
                  {cases.length === 0 && !isLoadingCases && (
                    <div className="p-4 text-center text-xs text-slate-500 border border-dashed rounded">
                      No compliance cases found with status {statusFilter}.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Selected Case Detail & Decision Desk */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCase ? (
              <Card
                title={`Case Detail: ${selectedCase.reference}`}
                subtitle={`Created ${new Date(selectedCase.createdAt).toLocaleString()}`}
              >
                <div className="space-y-4">
                  {/* Screening Hit Card */}
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-md space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-purple-900 dark:text-purple-200">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-purple-600" />
                        Screening Outcome: {selectedCase.outcome}
                      </span>
                      <Badge variant={selectedCase.status === 'APPROVED' ? 'success' : selectedCase.status === 'OPEN' ? 'held' : 'error'}>
                        {selectedCase.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-purple-950 dark:text-purple-300">
                      <div>Party Name: <strong>{selectedCase.partyName}</strong></div>
                      <div>Country: <strong>{selectedCase.partyCountry || 'NG'}</strong></div>
                      <div>Date of Birth: <strong>{selectedCase.partyBirth || '1982-04-12'}</strong></div>
                      <div>Screening Match: <strong>{selectedCase.matchDetails}</strong></div>
                    </div>
                  </div>

                  {/* Decision Form or Result */}
                  {selectedCase.status === 'OPEN' ? (
                    <form onSubmit={handleDecide} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Submit Compliance Officer Decision
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDecision('APPROVE')}
                          className={`p-2.5 rounded border text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                            decision === 'APPROVE'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 border-slate-300'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>APPROVE Remittance</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDecision('REJECT')}
                          className={`p-2.5 rounded border text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                            decision === 'REJECT'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 border-slate-300'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          <span>REJECT Remittance</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Mandatory Written Audit Reason
                        </label>
                        <textarea
                          required
                          maxLength={500}
                          rows={3}
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="State legal or operational justification for approval or refusal..."
                        />
                      </div>

                      <Button type="submit" isLoading={isSubmittingDecision}>
                        Confirm & Sign Decision
                      </Button>
                    </form>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border text-xs space-y-1.5">
                      <div className="flex justify-between font-semibold">
                        <span>Officer Decision Recorded:</span>
                        <span className="font-mono text-slate-500">
                          {new Date(selectedCase.decidedAt || selectedCase.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">
                        <strong>Audit Note:</strong> {selectedCase.decisionReason || 'Approved with passport documentation.'}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <StateView state="empty" title="Select a compliance case from the queue" />
            )}

            {/* Customer Daily Limit Checker */}
            <Card title="Customer Daily Limits Status" subtitle="Check KYC tier limits and remaining USD allowance">
              <form onSubmit={handleCheckLimits} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    isMono
                    value={customerIdInput}
                    onChange={(e) => setCustomerIdInput(e.target.value)}
                    placeholder="Paste Customer ID (UUID)..."
                    helperText={
                      session.recentEntities.find((e) => e.type === 'customer')
                        ? `Recent: ${session.recentEntities.find((e) => e.type === 'customer')?.id}`
                        : undefined
                    }
                  />
                  <Button type="submit" isLoading={isLoadingLimit} className="shrink-0 mt-auto mb-5">
                    Inspect Limits
                  </Button>
                </div>

                {limitStatus && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-2">
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                      <span className="text-slate-400 block font-sans text-[11px]">KYC Tier</span>
                      <Badge variant={limitStatus.tier === 'FULL' ? 'success' : 'accent'} size="sm" className="mt-1">
                        {limitStatus.tier}
                      </Badge>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                      <span className="text-slate-400 block font-sans text-[11px]">Daily Limit</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(limitStatus.dailyLimitMinor, limitStatus.currency)}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                      <span className="text-slate-400 block font-sans text-[11px]">Spent Today</span>
                      <span>{formatMoney(limitStatus.spentTodayMinor, limitStatus.currency)}</span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border">
                      <span className="text-slate-400 block font-sans text-[11px]">Remaining Allowance</span>
                      <span className="font-bold text-emerald-600">
                        {formatMoney(limitStatus.remainingMinor, limitStatus.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: WATCHLIST & SCREENING REGISTRY */}
      {/* ==================================================== */}
      {activeTab === 'WATCHLIST' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Watchlist Table (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card
              title="Active Screening Watchlist"
              subtitle="All registered candidates tested by the Screening Gate at remittance creation"
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadWatchlist}
                    isLoading={isLoadingWatchlist}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetWatchlist}
                    isLoading={isResettingWatchlist}
                    icon={<RotateCcw className="w-3.5 h-3.5 text-rose-500" />}
                  >
                    Reset to Default
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, alias, country, or entry ID..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Watchlist Cards List */}
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {filteredWatchlist.map((entry, idx) => {
                    const primaryName = entry.names[0] || 'Unknown';
                    const aliases = entry.names.slice(1);
                    const isBuiltIn = entry.entryId.startsWith('SYN-');

                    return (
                      <div
                        key={`${entry.entryId}-${idx}`}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-colors shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                {primaryName}
                              </span>
                              <Badge variant={isBuiltIn ? 'accent' : 'held'} size="sm">
                                {entry.listName}
                              </Badge>
                              <span className="font-mono text-[11px] text-slate-400">
                                {entry.entryId}
                              </span>
                            </div>

                            {/* Aliases */}
                            {aliases.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1 text-[11px] text-slate-500">
                                <span className="font-medium text-slate-400">Aliases:</span>
                                {aliases.map((a, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] text-slate-600 dark:text-slate-300"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Action: Test in Remittance */}
                          <div className="flex items-center gap-2 shrink-0">
                            {entry.country && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                                <Globe className="w-3 h-3 text-slate-400" />
                                {entry.country}
                              </span>
                            )}
                            {entry.birth && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-500">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {entry.birth}
                              </span>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigate(
                                  `/remittances?senderName=${encodeURIComponent(primaryName)}&senderCountry=${
                                    entry.country || 'NG'
                                  }`
                                );
                                toast.info(`Pre-filled "${primaryName}" in Remittance sender form.`);
                              }}
                              icon={<ArrowRight className="w-3 h-3" />}
                              className="text-xs"
                            >
                              Test in Remittance
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredWatchlist.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-lg">
                      No watchlist targets matching "{searchQuery}".
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Add Entry & Simulator (1 col) */}
          <div className="space-y-6">
            {/* Add to Screening List Card */}
            <Card
              title="Add to Screening List"
              subtitle="Register a new target name to trigger review holds"
            >
              <form onSubmit={handleAddWatchlist} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Primary Full Name *
                  </label>
                  <Input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Viktor Smirnov"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Known Aliases (comma-separated)
                  </label>
                  <Input
                    value={newAliases}
                    onChange={(e) => setNewAliases(e.target.value)}
                    placeholder="e.g. Vanya Smirnov, V. Smirnov"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Country (ISO)
                    </label>
                    <Input
                      maxLength={2}
                      isMono
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
                      placeholder="e.g. RU, NG, US"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={newBirth}
                      onChange={(e) => setNewBirth(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Watchlist Category
                  </label>
                  <Select
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    options={[
                      { label: 'CUSTOM-LIST (Synthetic Test)', value: 'CUSTOM-LIST' },
                      { label: 'SANCTIONS-OFAC (High Risk)', value: 'SANCTIONS-OFAC' },
                      { label: 'PEP-WATCHLIST (Politically Exposed)', value: 'PEP-WATCHLIST' },
                      { label: 'ADVERSE-MEDIA (News / Fraud)', value: 'ADVERSE-MEDIA' },
                    ]}
                  />
                </div>

                <Button
                  type="submit"
                  isLoading={isAddingEntry}
                  icon={<UserPlus className="w-3.5 h-3.5" />}
                  className="w-full mt-2"
                >
                  Add to Watchlist
                </Button>
              </form>
            </Card>

            {/* Live Name Similarity & Screening Simulator */}
            <Card
              title="Phonetic Match Calculator"
              subtitle="Inspect how candidate names are evaluated against the watchlist"
            >
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Candidate Name to Test
                  </label>
                  <Input
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    placeholder="Type any test name..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Country
                    </label>
                    <Input
                      maxLength={2}
                      isMono
                      value={simCountry}
                      onChange={(e) => setSimCountry(e.target.value.toUpperCase())}
                      placeholder="NG"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={simBirth}
                      onChange={(e) => setSimBirth(e.target.value)}
                    />
                  </div>
                </div>

                {/* Live Match Card */}
                {liveMatchResult ? (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      liveMatchResult.outcome === 'BLOCK'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                        : liveMatchResult.outcome === 'REVIEW'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Outcome: {liveMatchResult.outcome}
                      </span>
                      <span className="font-mono text-sm">
                        {(liveMatchResult.similarity * 100).toFixed(1)}% Match
                      </span>
                    </div>

                    <div className="text-[11px] space-y-1 font-mono">
                      <div>
                        Target Matched: <strong>{liveMatchResult.matchedName}</strong> (
                        {liveMatchResult.entry.entryId})
                      </div>
                      <div>
                        Corroborators: <strong>{liveMatchResult.corroborators}</strong> (Country/DOB)
                      </div>
                      <div className="font-sans text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        {liveMatchResult.outcome === 'BLOCK' && (
                          <span>High-confidence match ($&ge; 95\%$ similarity + country). Immediate BLOCK.</span>
                        )}
                        {liveMatchResult.outcome === 'REVIEW' && (
                          <span>Hit detected ($&ge; 85\%$ similarity). Automatically held in <strong>UNDER_REVIEW</strong>.</span>
                        )}
                        {liveMatchResult.outcome === 'CLEAR' && (
                          <span>Below review threshold. Payment will proceed automatically without hold.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded">
                    Type a candidate name to test live match scores.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
