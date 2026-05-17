/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Layout } from '@/components/layout';
import { Dashboard } from '@/pages/dashboard';
import { Inventory } from '@/pages/inventory';
import { Parties } from '@/pages/parties';
import { Purchases } from '@/pages/purchases';
import { Sales } from '@/pages/sales';
import { ProcessDocument } from '@/pages/process-document';
import { Quotation } from '@/pages/quotation';
import { Settings } from '@/pages/settings';
import { Analyzer } from '@/pages/analyzer';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ThemeProvider } from '@/hooks/use-theme';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';

function AppRoutes() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-3xl font-bold">Vehicle Management System</h1>
        <p className="text-muted-foreground">Please sign in to access the system</p>
        <button
          onClick={login}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2"
          id="login-btn"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="white"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="white"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <GlobalDataProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/process-document" element={<ProcessDocument />} />
          <Route path="/quotation" element={<Quotation />} />
          <Route path="/analyzer" element={<Analyzer />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </GlobalDataProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

