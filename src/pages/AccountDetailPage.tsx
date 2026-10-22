import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/apiClient';
import { formatMoney } from '../utils/money';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { StateView } from '../components/common/StateView';
import { ArrowLeft, Sparkles, RefreshCw, Bell, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFunding, setIsFunding] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // 1. Account info
      const accRes = await apiRequest({
        method: 'GET',
        path: `/api/accounts/${id}`,
        label: 'Fetch account info',
      });
      setAccount(accRes.data);

      // 2. Ledger statement entries
      const entriesRes = await apiRequest({
        method: 'GET',
        path: `/api/accounts/${id}/entries`,
        query: { limit: 50 },
        label: 'Fetch account ledger entries',
      });
      setEntries(entriesRes.data || []);

      // 3. Customer notifications
      if (accRes.data?.customerId) {
        const notifRes = await apiRequest({
          method: 'GET',
          path: '/api/notifications',
          query: { customerId: accRes.data.customerId, limit: 10 },
          label: 'Fetch customer notifications',
        }).catch(() => ({ data: [] }));
        setNotifications(notifRes.data || []);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDevFund = async () => {
    if (!id) return;
    setIsFunding(true);
    try {
      await apiRequest({
        method: 'POST',
        path: `/api/dev/accounts/${id}/fund`,
        body: { amountMinor: 10000000 }, // ₦100,000.00
        label: 'Dev Funding: ₦100,000.00',
      });
      toast.success('Funded ₦100,000.00 test money!');
      loadData();
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('No static resource')) {
        toast.error('Dev Funding is deploying or disabled on Render. Please verify PAYBRIDGE_DEV_FUNDING_ENABLED=true in Render Dashboard.');
      } else if (err.status === 401 || err.status === 403) {
        toast.error('Dev funding requires an ADMIN API key. Please check your API key in Settings.');
      } else {
        toast.error(err.message);
      }
    } finally {
      setIsFunding(false);
    }
  };

  if (isLoading && !account) {
    return <StateView state="loading" title="Loading Account Ledger..." />;
  }

  if (!account) {
    return (
      <StateView
        state="error"
        title="Account Not Found"
        message={`Unable to load account with id ${id}.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/customers">
            <Button size="sm" variant="ghost" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              Account {account.accountNumber}
            </h1>
            <p className="text-xs text-slate-500">
              ID: <span className="font-mono">{account.id}</span> &bull; Currency: {account.currency}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            isLoading={isFunding}
            onClick={handleDevFund}
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          >
            + ₦100k Test Funding
          </Button>
          <Button size="sm" variant="ghost" onClick={loadData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Current Balance</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatMoney(account.balanceMinor, account.currency)}
          </div>
        </div>
        <div>
          <Badge variant="success">{account.status || 'ACTIVE'}</Badge>
        </div>
      </div>

      {/* Ledger Entries Table */}
      <Card
        title="Ledger Movements (Double-Entry Audit Trail)"
        subtitle="Newest first &bull; Append-only zero-sum ledger entries"
      >
        {entries.length === 0 ? (
          <StateView
            state="empty"
            title="No ledger entries"
            message="No money movements have been posted to this account yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-sans">
                <tr>
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {entries.map((entry, idx) => {
                  const isCredit = entry.amountMinor > 0;
                  return (
                    <tr key={entry.entryId || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                      <td className="px-3 py-2 text-slate-500 text-[11px]">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-sans">
                        <Badge variant={entry.type === 'FUNDING' ? 'accent' : 'neutral'} size="sm">
                          {entry.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-bold">
                        {entry.reference}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-sans">
                        {entry.description}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-bold tabular-nums ${
                          isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : ''}
                        {formatMoney(entry.amountMinor, entry.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Customer Alerts / Notifications */}
      {notifications.length > 0 && (
        <Card title="Customer Notification Feed" subtitle="SMS and push alerts generated by the notification engine">
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs"
              >
                <div className="p-1.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{n.eventType}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    Recipient: {n.recipient} &bull; Channel: {n.channel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
