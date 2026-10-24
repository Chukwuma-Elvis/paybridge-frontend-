import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { apiRequest } from '../services/apiClient';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { StateView } from '../components/common/StateView';
import { KeyRound, Plus, Copy, Check, Trash2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const ApiKeysPage: React.FC = () => {
  const session = useSessionStore();

  const [keys, setKeys] = useState<any[]>([]);
  const [keyName, setKeyName] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'ADMIN'>('CLIENT');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // One-time plaintext reveal modal/banner
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest({
        method: 'GET',
        path: '/api/admin/api-keys',
        label: 'List API keys',
      });
      setKeys(res.data || []);
    } catch {
      // Demo mock keys
      setKeys([
        { id: '1', name: 'default-admin-key', role: 'ADMIN', createdAt: new Date().toISOString() },
        { id: '2', name: 'mobile-app-client', role: 'CLIENT', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error('Key name is required');
      return;
    }

    setIsCreating(true);
    try {
      const res = await apiRequest({
        method: 'POST',
        path: '/api/admin/api-keys',
        body: { name: keyName.trim(), role },
        label: `Create API key ${keyName} (${role})`,
      });

      const newKey = res.data;
      const keyString = newKey.apiKey || newKey.plaintext || '';
      setRevealedKey(keyString);
      setKeys((prev) => [newKey, ...prev]);
      setKeyName('');
      toast.success('API key generated! Copy it now; it cannot be shown again.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await apiRequest({
        method: 'DELETE',
        path: `/api/admin/api-keys/${id}`,
        label: `Revoke API key ${id}`,
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.info('API key revoked.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCopyPlaintext = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied plaintext key to clipboard.');
    }
  };

  const handleUseKeyInSession = () => {
    if (revealedKey) {
      session.setApiKey(revealedKey);
      toast.success('Active console API key updated to this new key!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" />
          <span>API Key Management & Scopes</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Issue scoped API credentials. Plaintext keys are hashed with SHA-256 on creation and never displayed again.
        </p>
      </div>

      {/* One-Time Plaintext Reveal Notice */}
      {revealedKey && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 dark:text-emerald-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>New API Key Generated (Plaintext - Copy Now)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleUseKeyInSession}
                icon={<KeyRound className="w-3.5 h-3.5 text-blue-600" />}
              >
                Use in Console
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyPlaintext}
                icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy Key'}
              </Button>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 select-all break-all shadow-sm">
            {revealedKey}
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
            Copy this key now. It is hashed on the server with SHA-256 and will <strong>never</strong> be displayed again. If lost, it must be revoked and reissued.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Key Form */}
        <Card title="Issue New Scoped API Key" subtitle="Select privilege role for the credential">
          <form onSubmit={handleCreateKey} className="space-y-3">
            <Input
              label="Key Identifier / Name"
              required
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. partner-service-key"
            />

            <Select
              label="Role Scope"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              options={[
                { label: 'CLIENT (Transfers, Quotes, Accounts)', value: 'CLIENT' },
                { label: 'ADMIN (Full Desk, Compliance, Settlement)', value: 'ADMIN' },
              ]}
            />

            <Button type="submit" isLoading={isCreating} icon={<Plus className="w-4 h-4" />}>
              Generate Key
            </Button>
          </form>
        </Card>

        {/* Existing Keys Table */}
        <div className="lg:col-span-2">
          <Card
            title="Active Registered Keys"
            subtitle="Hashed records in database"
            actions={
              <Button size="sm" variant="ghost" onClick={loadKeys} isLoading={isLoading} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Refresh
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Prefix</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium text-right">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100 font-sans">
                        {k.name}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {k.prefix || '(operator)'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={k.role === 'ADMIN' ? 'accent' : 'neutral'} size="sm">
                          {k.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={k.active !== false ? 'success' : 'danger'} size="sm">
                          {k.active !== false ? 'ACTIVE' : 'REVOKED'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-[11px]">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {k.active !== false && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeKey(k.id)}
                            icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                            title="Revoke key immediately"
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
