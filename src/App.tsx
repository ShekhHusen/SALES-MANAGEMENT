/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Layout } from '@/components/layout';
import { Dashboard } from '@/pages/dashboard';
import { Inventory } from '@/pages/inventory';
import { Parties } from '@/pages/parties';
import { Purchases } from '@/pages/purchases';
import { Sales } from '@/pages/sales';
import { ProcessDocument } from '@/pages/process-document';
import { EmiManagement } from '@/pages/emi-management';
import { FollowUps } from '@/pages/follow-ups';
import { Quotation } from '@/pages/quotation';
import { Settings } from '@/pages/settings';
import { UserManagement } from '@/pages/users';
import { AuthScreen } from '@/components/AuthScreen';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ThemeProvider } from '@/hooks/use-theme';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';

import { ShieldAlert } from 'lucide-react';

function TabGuard({ path, children }: { path: string; children: React.ReactNode }) {
  const { userProfile } = useAuth();
  const currentRole = userProfile?.role || 'user';

  if (currentRole === 'admin' && (path === '/users' || path === '/')) {
    return <>{children}</>;
  }

  if (userProfile?.allowedTabs && Array.isArray(userProfile.allowedTabs)) {
    const isAllowed = userProfile.allowedTabs.includes(path);
    if (!isAllowed) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tab Access Restricted</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm mb-6">
            You do not have permission to view this tab. Please contact your administrator to request access.
          </p>
          <a href="/" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-colors">
            Return to Dashboard
          </a>
        </div>
      );
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, userProfile, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (userProfile?.role === 'pending') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background dark:bg-slate-950 px-4 text-center">
        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-2">
           <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">Request submitted. Please wait for an administrator to verify your account and assign a role.</p>
        <button
          onClick={logout}
          className="rounded-md border border-slate-200 dark:border-slate-800 px-6 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors mt-4 text-slate-700 dark:text-slate-300 font-medium"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <GlobalDataProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<TabGuard path="/"><Dashboard /></TabGuard>} />
          <Route path="/inventory" element={<TabGuard path="/inventory"><Inventory /></TabGuard>} />
          <Route path="/parties" element={<TabGuard path="/parties"><Parties /></TabGuard>} />
          <Route path="/purchases" element={<TabGuard path="/purchases"><Purchases /></TabGuard>} />
          <Route path="/sales" element={<TabGuard path="/sales"><Sales /></TabGuard>} />
          <Route path="/process-document" element={<TabGuard path="/process-document"><ProcessDocument /></TabGuard>} />
          <Route path="/follow-ups" element={<TabGuard path="/follow-ups"><FollowUps /></TabGuard>} />
          <Route path="/emi-management" element={<TabGuard path="/emi-management"><EmiManagement /></TabGuard>} />
          <Route path="/quotation" element={<TabGuard path="/quotation"><Quotation /></TabGuard>} />
          <Route path="/users" element={<TabGuard path="/users"><UserManagement /></TabGuard>} />
          <Route path="/settings" element={<TabGuard path="/settings"><Settings /></TabGuard>} />
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

