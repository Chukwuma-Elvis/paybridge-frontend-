import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest } from '../services/apiClient';
import { formatMoney } from '../utils/money';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { StateView } from '../components/common/StateView';
import { Users, UserPlus, CreditCard, Sparkles, ArrowRight, Check, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export const CustomersPage: React.FC = () => {
  const session = useSessionStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('08012345678');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [accountCurrency, setAccountCurrency] = useState('NGN');
  const [isOpeningAccount, setIsOpeningAccount] = useState(false);

  const [lookupNumber, setLookupNumber] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [fundingAccountId, setFundingAccountId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load from backend and sync session
  const loadFromBackend = async () => {
    if (!session.apiKey) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch customers
      const custRes = await apiRequest({
        method: 'GET',
        path: '/api/customers',
        label: 'Fetch all customers',
      }).catch(() => null);

      if (custRes && Array.isArray(custRes.data)) {
        setCustomersList((prev) => {
          const map = new Map();
          for (const c of [...custRes.data, ...prev]) {
            if (c?.id) map.set(c.id, c);
          }
          return Array.from(map.values());
        });
        if (!selectedCustomerId && custRes.data.length > 0) {
          setSelectedCustomerId(custRes.data[0].id);
        }
      }

      // 2. Fetch all accounts
      const accRes = await apiRequest({
        method: 'GET',
        path: '/api/accounts',
        label: 'Fetch all accounts',
      }).catch(() => null);

      if (accRes && Array.isArray(accRes.data)) {
        setAccountsList((prev) => {
          const map = new Map();
          for (const a of [...accRes.data, ...prev]) {
            if (a?.id) map.set(a.id, a);
          }
          return Array.from(map.values());
        });

        for (const acc of accRes.data) {
          session.addRecentEntity({
            id: acc.id,
            label: `${acc.accountNumber} (${acc.currency})`,
            type: 'account',
            details: acc,
          });
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFromBackend();
  }, [session.apiKey, session.backendUrl]);

  // Merge recent entities from session storage
  useEffect(() => {
    if (session.recentEntities.length > 0) {
      setCustomersList((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const e of session.recentEntities) {
          if (e.type === 'customer' && !existingIds.has(e.id)) {
            const parts = (e.label || 'Customer').split(' ');
            merged.push(e.details || {
              id: e.id,
              firstName: parts[0] || 'Customer',
              lastName: parts.slice(1).join(' ') || '',
              email: 'Recent Profile',
              phone: '',
              kycTier: 'UNVERIFIED',
              status: 'ACTIVE',
            });
            existingIds.add(e.id);
          }
        }
        return merged;
      });

      setAccountsList((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const merged = [...prev];
        for (const e of session.recentEntities) {
          if (e.type === 'account' && !existingIds.has(e.id)) {
            const num = (e.label || '').split(' ')[0] || e.id.substring(0, 10);
            const curr = (e.label || '').includes('USD') ? 'USD' : 'NGN';
            merged.push(e.details || {
              id: e.id,
              accountNumber: num,
              currency: curr,
              balanceMinor: 0,
              status: 'ACTIVE',
            });
            existingIds.add(e.id);
          }
        }
        return merged;
      });
    }
  }, [session.recentEntities]);

  // Fetch accounts when selected customer changes
  useEffect(() => {
    if (!selectedCustomerId || !session.apiKey) return;

    apiRequest({
      method: 'GET',
      path: '/api/accounts',
      query: { customerId: selectedCustomerId },
      label: 'Fetch customer accounts',
    })
      .then((res) => {
        if (Array.isArray(res.data)) {
          const cust = customersList.find((c) => c.id === selectedCustomerId);
          const custName = cust ? `${cust.firstName} ${cust.lastName}` : undefined;

          const taggedAccounts = res.data.map((acc: any) => ({
            ...acc,
            customerName: custName || acc.customerName,
          }));

          setAccountsList((prev) => {
            const incomingIds = new Set(taggedAccounts.map((a: any) => a.id));
            const retainedOthers = prev.filter((a) => !incomingIds.has(a.id));
            return [...taggedAccounts, ...retainedOthers];
          });

          for (const acc of taggedAccounts) {
            session.addRecentEntity({
              id: acc.id,
              label: `${acc.accountNumber} (${acc.currency})`,
              type: 'account',
              details: acc,
            });
          }
        }
      })
      .catch(() => {});
  }, [selectedCustomerId, session.apiKey]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phone) {
      toast.error('All fields are required');
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/customers',
        body: { firstName, lastName, email, phone },
        label: `Create customer ${firstName} ${lastName}`,
      });

      const newCust = res.data;
      setCustomersList((prev) => [newCust, ...prev.filter((c) => c.id !== newCust.id)]);
      setSelectedCustomerId(newCust.id);

      session.addRecentEntity({
        id: newCust.id,
        label: `${newCust.firstName} ${newCust.lastName}`,
        type: 'customer',
        details: newCust,
      });

      toast.success(`Customer ${newCust.firstName} created successfully!`);
      setFirstName('');
      setLastName('');
      setEmail('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer first');
      return;
    }

    setIsOpeningAccount(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/accounts',
        body: { customerId: selectedCustomerId, currency: accountCurrency },
        label: `Open ${accountCurrency} account for customer`,
      });

      const cust = customersList.find((c) => c.id === selectedCustomerId);
      const newAcc = {
        ...res.data,
        customerName: cust ? `${cust.firstName} ${cust.lastName}` : undefined,
      };

      setAccountsList((prev) => [newAcc, ...prev.filter((a) => a.id !== newAcc.id)]);

      session.addRecentEntity({
        id: newAcc.id,
        label: `${newAcc.accountNumber} (${newAcc.currency})`,
        type: 'account',
        details: newAcc,
      });

      toast.success(`Account ${newAcc.accountNumber} opened!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsOpeningAccount(false);
    }
  };

  const handleLookupAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = lookupNumber.trim();
    if (!query || query.length !== 10) {
      toast.error('Please enter a 10-digit account number');
      return;
    }

    setIsLookingUp(true);
    try {
      const res = await apiRequest({
        method: 'GET',
        path: `/api/accounts/by-number/${query}`,
        label: `Lookup account ${query}`,
      });

      const acc = res.data;
      setAccountsList((prev) => [acc, ...prev.filter((a) => a.id !== acc.id)]);

      session.addRecentEntity({
        id: acc.id,
        label: `${acc.accountNumber} (${acc.currency})`,
        type: 'account',
        details: acc,
      });

      toast.success(`Found account ${acc.accountNumber} (${acc.currency})!`);
      setLookupNumber('');
    } catch (err: any) {
      toast.error(err.message || 'Account not found');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleDevFund = async (accountId: string) => {
    setFundingAccountId(accountId);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: `/api/dev/accounts/${accountId}/fund`,
        body: { amountMinor: 5000000 }, // ₦50,000.00
        label: 'Dev Funding ₦50,000.00',
      });

      setAccountsList((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, balanceMinor: res.data.balanceMinor } : acc))
      );

      toast.success('Account funded with ₦50,000.00 test money!');
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('No static resource')) {
        toast.error('Dev Funding is deploying or disabled on Render. Please verify PAYBRIDGE_DEV_FUNDING_ENABLED=true in Render Dashboard.');
      } else if (err.status === 401 || err.status === 403) {
        toast.error('Dev funding requires an ADMIN API key. Please check your API key in Settings.');
      } else {
        toast.error(`Dev funding error: ${err.message}`);
      }
    } finally {
      setFundingAccountId(null);
    }
  };

  const handleUpdateKyc = async (customerId: string, nextTier: 'UNVERIFIED' | 'BASIC' | 'FULL') => {
    try {
      const res = await apiRequest({
        method: 'PATCH',
        path: `/api/customers/${customerId}/kyc-tier`,
        body: { kycTier: nextTier },
        label: `Update customer KYC to ${nextTier}`,
      });

      const updated = res.data;
      setCustomersList((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, kycTier: updated.kycTier } : c))
      );

      session.addRecentEntity({
        id: customerId,
        label: `${updated.firstName} ${updated.lastName}`,
        type: 'customer',
        details: updated,
      });

      toast.success(`KYC tier updated to ${nextTier}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Customers & Accounts</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Register customer profiles, open multi-currency accounts, and manage KYC tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            isLoading={isRefreshing}
            onClick={loadFromBackend}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync from Server
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Create Customer */}
        <Card title="Register New Customer" subtitle="Creates a customer identity in the database">
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Chukwuma"
              />
              <Input
                label="Last Name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Elvis"
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@example.com"
            />

            <Input
              label="Phone Number (Nigerian Mobile)"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Format: 08012345678 or +2348012345678"
              placeholder="08012345678"
            />

            <Button type="submit" isLoading={isCreatingCustomer} icon={<UserPlus className="w-4 h-4" />}>
              Create Customer
            </Button>
          </form>
        </Card>

        {/* Form 2: Open Account & Lookup */}
        <div className="space-y-6">
          <Card title="Open Customer Account" subtitle="Opens a 10-digit NGN or USD account for a customer">
            <form onSubmit={handleOpenAccount} className="space-y-3">
              <Select
                label="Select Customer"
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                options={[
                  { label: '-- Choose Customer --', value: '' },
                  ...customersList.map((c) => ({
                    label: `${c.firstName || 'Customer'} ${c.lastName || ''} (${c.email || c.id.substring(0, 8)}) • ${c.kycTier || 'UNVERIFIED'}`,
                    value: c.id,
                  })),
                ]}
              />

              <Select
                label="Currency"
                value={accountCurrency}
                onChange={(e) => setAccountCurrency(e.target.value)}
                options={[
                  { label: 'NGN (Nigerian Naira - ₦)', value: 'NGN' },
                  { label: 'USD (United States Dollar - $)', value: 'USD' },
                ]}
              />

              <Button
                type="submit"
                isLoading={isOpeningAccount}
                disabled={!selectedCustomerId}
                icon={<CreditCard className="w-4 h-4" />}
              >
                Open Account
              </Button>
            </form>
          </Card>

          <Card title="Lookup Existing Account" subtitle="Find any account by its 10-digit NUBAN number">
            <form onSubmit={handleLookupAccount} className="flex gap-2">
              <div className="flex-1">
                <Input
                  isMono
                  placeholder="Enter 10-digit NUBAN..."
                  maxLength={10}
                  value={lookupNumber}
                  onChange={(e) => setLookupNumber(e.target.value)}
                />
              </div>
              <Button type="submit" isLoading={isLookingUp} icon={<Search className="w-4 h-4" />}>
                Find
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Accounts List & Balance */}
      <Card
        title="Created Accounts & Balances"
        subtitle="Live ledger balances and one-click dev test funding across all customer accounts"
        actions={
          <Button size="sm" variant="ghost" onClick={loadFromBackend} isLoading={isRefreshing} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        }
      >
        {accountsList.length === 0 ? (
          <StateView
            state="empty"
            title="No accounts found"
            message="Open an account above, or enter an account number in the lookup box."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Account Number</th>
                  <th className="px-3 py-2 font-medium">Customer / Owner</th>
                  <th className="px-3 py-2 font-medium">Currency</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accountsList.map((acc) => {
                  const owner = customersList.find((c) => c.id === acc.customerId);
                  const ownerName = acc.customerName || (owner ? `${owner.firstName} ${owner.lastName}` : 'Customer');

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 font-mono">
                      <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">
                        {acc.accountNumber}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-700 dark:text-slate-300">
                        {ownerName}
                      </td>
                      <td className="px-3 py-2">{acc.currency}</td>
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(acc.balanceMinor || 0, acc.currency)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="success" size="sm">
                          {acc.status || 'ACTIVE'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right space-x-2 font-sans">
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={fundingAccountId === acc.id}
                          onClick={() => handleDevFund(acc.id)}
                          icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                          title="Credits ₦50,000 from FUNDING_SOURCE system account"
                        >
                          + ₦50k Test Money
                        </Button>
                        <Link to={`/accounts/${acc.id}`}>
                          <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Ledger Entries
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Customer Registry List with KYC */}
      {customersList.length > 0 && (
        <Card title="Customer Identity & KYC Tier" subtitle="Manage customer KYC tiers and limits">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer Name</th>
                  <th className="px-3 py-2 font-medium">Email / Phone</th>
                  <th className="px-3 py-2 font-medium">Current KYC Tier</th>
                  <th className="px-3 py-2 font-medium">Change Tier</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customersList.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  const currentTier = c.kycTier || 'UNVERIFIED';
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-900/60 ${isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
                      <td className="px-3 py-2 font-semibold flex items-center gap-1.5">
                        <span>{c.firstName} {c.lastName}</span>
                        {isSelected && <Badge variant="accent" size="sm">Active</Badge>}
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-mono">
                        {c.email} {c.phone ? `• ${c.phone}` : ''}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={currentTier === 'FULL' ? 'success' : currentTier === 'BASIC' ? 'accent' : 'neutral'} size="sm">
                          {currentTier}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={`Change KYC tier for ${c.firstName} ${c.lastName}`}
                          value={currentTier}
                          onChange={(e) => handleUpdateKyc(c.id, e.target.value as 'UNVERIFIED' | 'BASIC' | 'FULL')}
                          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
                        >
                          <option value="UNVERIFIED">UNVERIFIED (₦50k/day)</option>
                          <option value="BASIC">BASIC (₦500k/day)</option>
                          <option value="FULL">FULL (₦10m/day)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="success" size="sm">
                          {c.status || 'ACTIVE'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant={isSelected ? 'secondary' : 'outline'}
                          onClick={() => setSelectedCustomerId(c.id)}
                          icon={isSelected ? <Check className="w-3.5 h-3.5 text-blue-600" /> : undefined}
                        >
                          {isSelected ? 'Selected' : 'Select Customer'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
