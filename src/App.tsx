import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Shell } from '@/components/layout/Shell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Route-level code splitting for optimal bundle performance
const ConnectPage = lazy(() => import('@/pages/ConnectPage').then((m) => ({ default: m.ConnectPage })));
const GuidedDemoPage = lazy(() => import('@/pages/GuidedDemoPage').then((m) => ({ default: m.GuidedDemoPage })));
const CustomersPage = lazy(() => import('@/pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const AccountDetailPage = lazy(() => import('@/pages/AccountDetailPage').then((m) => ({ default: m.AccountDetailPage })));
const InternalTransfersPage = lazy(() => import('@/pages/InternalTransfersPage').then((m) => ({ default: m.InternalTransfersPage })));
const ExternalTransfersPage = lazy(() => import('@/pages/ExternalTransfersPage').then((m) => ({ default: m.ExternalTransfersPage })));
const FxPage = lazy(() => import('@/pages/FxPage').then((m) => ({ default: m.FxPage })));
const RemittancesPage = lazy(() => import('@/pages/RemittancesPage').then((m) => ({ default: m.RemittancesPage })));
const CompliancePage = lazy(() => import('@/pages/CompliancePage').then((m) => ({ default: m.CompliancePage })));
const SettlementPage = lazy(() => import('@/pages/SettlementPage').then((m) => ({ default: m.SettlementPage })));
const ApiKeysPage = lazy(() => import('@/pages/ApiKeysPage').then((m) => ({ default: m.ApiKeysPage })));
const SecurityPlaygroundPage = lazy(() => import('@/pages/SecurityPlaygroundPage').then((m) => ({ default: m.SecurityPlaygroundPage })));
const OperationsPage = lazy(() => import('@/pages/OperationsPage').then((m) => ({ default: m.OperationsPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-muted-foreground font-medium">Loading desk...</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Shell />}>
                <Route index element={<Navigate to="/guided/1" replace />} />
                <Route path="connect" element={<ConnectPage />} />
                <Route path="guided" element={<Navigate to="/guided/1" replace />} />
                <Route path="guided/:step" element={<GuidedDemoPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="accounts/:id" element={<AccountDetailPage />} />
                <Route path="transfers/internal" element={<InternalTransfersPage />} />
                <Route path="transfers/external" element={<ExternalTransfersPage />} />
                <Route path="fx" element={<FxPage />} />
                <Route path="remittances" element={<RemittancesPage />} />
                <Route path="remittances/:id" element={<RemittancesPage />} />
                <Route path="compliance" element={<CompliancePage />} />
                <Route path="settlement" element={<SettlementPage />} />
                <Route path="admin/keys" element={<ApiKeysPage />} />
                <Route path="admin/security" element={<SecurityPlaygroundPage />} />
                <Route path="ops" element={<OperationsPage />} />
                <Route path="*" element={<Navigate to="/guided/1" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
};

export default App;
