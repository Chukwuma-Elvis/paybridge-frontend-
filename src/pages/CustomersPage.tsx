import React, { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest } from '../services/apiClient';
import { formatMoney } from '../utils/money';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { StateView } from '../components/common/StateView';
import { Users, UserPlus, CreditCard, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
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

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [fundingAccountId, setFundingAccountId] = useState<string | null>(null);

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
      setCustomersList((prev) => [newCust, ...prev]);
      setSelectedCustomerId(newCust.id);

      session.addRecentEntity({
        id: newCust.id,
        label: `${newCust.firstName} ${newCust.lastName}`,
        type: 'customer',
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

      const newAcc = res.data;
      setAccountsList((prev) => [newAcc, ...prev]);

      session.addRecentEntity({
        id: newAcc.id,
        label: `${newAcc.accountNumber} (${newAcc.currency})`,
        type: 'account',
      });

      toast.success(`Account ${newAcc.accountNumber} opened!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsOpeningAccount(false);
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
      toast.error(`Dev funding error: ${err.message}`);
    } finally {
      setFundingAccountId(null);
    }
  };

  const handleUpdateKyc = async (customerId: string, nextTier: 'BASIC' | 'FULL') => {
    try {
      const res = await apiRequest({
        method: 'PATCH',
        path: `/api/customers/${customerId}/kyc-tier`,
        body: { kycTier: nextTier },
        label: `Upgrade customer KYC to ${nextTier}`,
      });

      setCustomersList((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, kycTier: res.data.kycTier } : c))
      );

      toast.success(`KYC tier upgraded to ${nextTier}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>Customers & Accounts</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Register customer profiles, manage KYC tiers and daily transaction limits, and open multi-currency accounts.
        </p>
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

        {/* Form 2: Open Account */}
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
                  label: `${c.firstName} ${c.lastName} (${c.email})`,
                  value: c.id,
                })),
                ...session.recentEntities
                  .filter((e) => e.type === 'customer' && !customersList.some((c) => c.id === e.id))
                  .map((e) => ({
                    label: `${e.label} [Recent]`,
                    value: e.id,
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
      </div>

      {/* Accounts List & Balance */}
      <Card
        title="Created Accounts & Balances"
        subtitle="Live ledger balances and one-click dev test funding"
      >
        {accountsList.length === 0 ? (
          <StateView
            state="empty"
            title="No accounts opened yet"
            message="Use the form above or the Guided Demo to open customer accounts."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Account Number</th>
                  <th className="px-3 py-2 font-medium">Currency</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accountsList.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 font-mono">
                    <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">
                      {acc.accountNumber}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Customer Registry List with KYC */}
      {customersList.length > 0 && (
        <Card title="Customer Identity & KYC Tier" subtitle="Change tiers to test USD daily transaction limits">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer Name</th>
                  <th className="px-3 py-2 font-medium">Email / Phone</th>
                  <th className="px-3 py-2 font-medium">KYC Tier</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Upgrade KYC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customersList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                    <td className="px-3 py-2 font-semibold">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-mono">
                      {c.email} &bull; {c.phone}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={c.kycTier === 'FULL' ? 'success' : c.kycTier === 'BASIC' ? 'accent' : 'neutral'} size="sm">
                        {c.kycTier || 'UNVERIFIED'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="success" size="sm">
                        {c.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1.5">
                      {c.kycTier !== 'BASIC' && (
                        <Button size="sm" variant="ghost" onClick={() => handleUpdateKyc(c.id, 'BASIC')}>
                          Tier: BASIC
                        </Button>
                      )}
                      {c.kycTier !== 'FULL' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateKyc(c.id, 'FULL')}>
                          Tier: FULL
                        </Button>
                      )}
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
