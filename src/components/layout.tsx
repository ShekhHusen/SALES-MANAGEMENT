import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Car, 
  Users, 
  ShoppingCart, 
  BadgeDollarSign, 
  Settings as SettingsIcon,
  Sun,
  Moon,
  X,
  Menu,
  LogOut,
  ActivitySquare,
  FileText,
  Printer,
  Shield,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useGlobalData } from '@/contexts/GlobalDataContext';

const navItems = [
  { label: 'Dashboard', icon: BarChart3, path: '/', roles: ['admin', 'sales_manager', 'inventory_clerk'] },
  { label: 'Internal Accounts', icon: BookOpen, path: '/internal-accounts', roles: ['admin', 'sales_manager'] },
  { label: 'Inventory', icon: Car, path: '/inventory', roles: ['admin', 'sales_manager', 'inventory_clerk'] },
  { label: 'Parties', icon: Users, path: '/parties', roles: ['admin', 'sales_manager'] },
  { label: 'Purchases', icon: ShoppingCart, path: '/purchases', roles: ['admin', 'inventory_clerk', 'sales_manager'] },
  { label: 'Sales', icon: BadgeDollarSign, path: '/sales', roles: ['admin', 'sales_manager'] },
  { label: 'Process Document', icon: FileText, path: '/process-document', roles: ['admin', 'sales_manager'] },
  { label: 'Print Quotation', icon: Printer, path: '/quotation', roles: ['admin'] },
  { label: 'Data Analyzer', icon: ActivitySquare, path: '/analyzer', roles: ['admin', 'sales_manager'] },
  { label: 'User Mgmt', icon: Shield, path: '/users', roles: ['admin'] },
  { label: 'Settings', icon: SettingsIcon, path: '/settings', roles: ['admin'] },
  { label: 'Audit Log', icon: ActivitySquare, path: '/audit', roles: ['admin'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { logout, user, userProfile } = useAuth();
  const location = useLocation();
  const { loading: dataLoading } = useGlobalData();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (dataLoading) {
    // Only return a simpler state if we have no user, else let layout render so the user sees the dashboard framework immediately
    if (!user) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-background">
          <div className="w-16 h-16 border-4 border-[#3B82F6]/20 border-t-[#3B82F6] rounded-full animate-spin mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse tracking-widest text-sm uppercase">Syncing Database...</p>
        </div>
      );
    }
  }

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center space-y-4">
           <div className="w-10 h-10 border-4 border-[#3B82F6]/20 border-t-[#3B82F6] rounded-full animate-spin" />
           <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse tracking-widest text-xs uppercase">Syncing Workspace...</p>
        </div>
      );
    }
    return children;
  };

  const currentRole = userProfile?.role || 'user';
  // Filter nav items by user role
  const visibleNavItems = navItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:bg-transparent" 
          onClick={toggleSidebar}
        />
      )}

      {/* Left Edge Hover Trigger */}
      {!sidebarOpen && (
        <div 
          className="fixed inset-y-0 left-0 w-6 z-40" 
          onMouseEnter={() => setSidebarOpen(true)}
          onTouchStart={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
      <aside 
        onMouseLeave={() => {
          if (window.innerWidth >= 1024) setSidebarOpen(false);
        }}
        className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 h-screen bg-[#0F172A] text-slate-400 transition-transform duration-300 outline-none flex flex-col shadow-2xl lg:shadow-none lg:border-r lg:border-slate-800",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-6">
          <div className="px-6 pb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex flex-col">
                <div className="text-xl font-extrabold tracking-tight text-[#3B82F6]">
                  AUTO<span className="text-slate-100 uppercase tracking-widest font-black">Manager</span>
                </div>
                <span className="text-[9px] font-black tracking-widest text-[#3B82F6] uppercase ml-1 opacity-80">Version 2.1</span>
              </div>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-100" onClick={toggleSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto sidebar-scrollbar">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 border-l-4",
                    isActive 
                      ? "bg-[#3B82F6]/10 text-slate-100 border-[#3B82F6]" 
                      : "border-transparent hover:bg-white/5 hover:text-slate-100"
                  )}
                >
                  <item.icon className={cn("h-4.5 w-4.5", isActive ? "text-[#3B82F6]" : "text-slate-500")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 rounded-full bg-[#3B82F6] flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-slate-100 truncate">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                   {currentRole.replace('_', ' ')}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-center gap-2 bg-transparent text-slate-300 border-slate-700 hover:bg-white/5 hover:text-white"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Floating Menu & Theme Controls */}
        <div className="fixed top-4 left-4 z-40 flex items-center gap-1.5 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-lg p-0", theme === 'light' && "bg-white shadow-sm text-blue-600 dark:text-white dark:bg-slate-700")} 
              onClick={() => setTheme('light')}
            >
              <Sun className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-lg p-0", theme === 'dark' && "bg-slate-700 text-white shadow-sm")} 
              onClick={() => setTheme('dark')}
            >
              <Moon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <main className="flex-1 overflow-hidden pt-4 px-4 pb-[10px] lg:pt-8 lg:px-8 lg:pb-[10px] flex flex-col">
          <div className="mx-auto max-w-[1400px] w-full flex-1 flex flex-col h-full overflow-hidden">
            {/* Professional entry animation placeholder */}
            <div className="animate-in fade-in duration-500 slide-in-from-bottom-2 flex-1 flex flex-col overflow-hidden h-full">
               {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
