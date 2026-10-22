import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Plug,
  Users,
  ArrowRightLeft,
  Send,
  TrendingUp,
  Globe,
  ShieldCheck,
  Scale,
  KeyRound,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Circle,
  HelpCircle,
} from 'lucide-react';

export const Nav: React.FC = () => {
  const location = useLocation();
  const isGuided = location.pathname.startsWith('/guided');

  const guidedSteps = [
    { num: '1', title: 'Wake & Connect', path: '/guided/1' },
    { num: '2', title: 'API Keys & Role', path: '/guided/2' },
    { num: '3', title: 'Funded Accounts', path: '/guided/3' },
    { num: '4', title: 'Internal Transfer', path: '/guided/4' },
    { num: '5', title: 'FX Quote Lock', path: '/guided/5' },
    { num: '6', title: 'Remittance & Proof', path: '/guided/6' },
    { num: '7', title: 'External Payouts', path: '/guided/7' },
    { num: '8', title: 'Compliance Hold', path: '/guided/8' },
    { num: '9', title: 'Settlement Close', path: '/guided/9' },
    { num: '10', title: 'Security & 429', path: '/guided/10' },
  ];

  const explorerLinks = [
    { name: 'Connect & Wake', path: '/connect', icon: <Plug className="w-4 h-4" /> },
    { name: 'Customers & Accounts', path: '/customers', icon: <Users className="w-4 h-4" /> },
    { name: 'Internal Transfers', path: '/transfers/internal', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { name: 'External & Beneficiaries', path: '/transfers/external', icon: <Send className="w-4 h-4" /> },
    { name: 'FX Rates & Quotes', path: '/fx', icon: <TrendingUp className="w-4 h-4" /> },
    { name: 'Remittances', path: '/remittances', icon: <Globe className="w-4 h-4" /> },
    { name: 'Compliance Cases', path: '/compliance', icon: <ShieldCheck className="w-4 h-4" /> },
    { name: 'Settlement & Batches', path: '/settlement', icon: <Scale className="w-4 h-4" /> },
    { name: 'API Keys', path: '/admin/keys', icon: <KeyRound className="w-4 h-4" /> },
    { name: 'Security & Scenarios', path: '/admin/security', icon: <ShieldAlert className="w-4 h-4" /> },
    { name: 'Operations & Health', path: '/ops', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <nav
      aria-label="Sidebar Navigation"
      className="w-56 md:w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto"
    >
      <div className="p-3">
        {isGuided ? (
          <div>
            <div className="px-2 py-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                The Demo Story (10 Steps)
              </span>
            </div>
            <ul className="space-y-1">
              {guidedSteps.map((step) => (
                <li key={step.num}>
                  <NavLink
                    to={step.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-900'
                      }`
                    }
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        location.pathname === step.path
                          ? 'bg-white text-blue-600'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {step.num}
                    </span>
                    <span className="truncate">{step.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <div className="px-2 py-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Explorer API Desks
              </span>
            </div>
            <ul className="space-y-1">
              {explorerLinks.map((link) => (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-900'
                      }`
                    }
                  >
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">{link.icon}</span>
                    <span className="truncate">{link.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-auto p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
        <div>PayBridge v1.0.0</div>
        <div className="text-[10px] text-slate-500 mt-0.5">Render Free Tier &bull; Vercel Hobby</div>
      </div>
    </nav>
  );
};
