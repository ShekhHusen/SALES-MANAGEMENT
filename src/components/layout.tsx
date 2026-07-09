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
  BookOpen,
  BellRing,
  KeyRound,
  ChevronDown,
  DownloadCloud,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useGlobalData } from '@/contexts/GlobalDataContext';



const navItems = [
  { label: 'Dashboard', icon: BarChart3, path: '/', roles: ['admin', 'sales_manager', 'inventory_clerk'] },
  
  
  { label: 'Inventory', icon: Car, path: '/inventory', roles: ['admin', 'sales_manager', 'inventory_clerk'] },
  { label: 'Parties', icon: Users, path: '/parties', roles: ['admin', 'sales_manager'] },
  { label: 'Purchases', icon: ShoppingCart, path: '/purchases', roles: ['admin', 'inventory_clerk', 'sales_manager'] },
  { label: 'Sales', icon: BadgeDollarSign, path: '/sales', roles: ['admin', 'sales_manager'] },
  { label: 'Process Document', icon: FileText, path: '/process-document', roles: ['admin', 'sales_manager'] },
  { label: 'Print Quotation', icon: Printer, path: '/quotation', roles: ['admin'] },
  { label: 'User Mgmt', icon: Shield, path: '/users', roles: ['admin'] },
  { label: 'Settings', icon: SettingsIcon, path: '/settings', roles: ['admin'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topNavOpen, setTopNavOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { logout, user, userProfile, hasSetPassword } = useAuth();
  const location = useLocation();
  const { loading: dataLoading, debugStates, subscriptionErrors, loadPurchases, loadSales, loadFollowups, loadProcessDocumentData, isPurchasesLoaded, isSalesLoaded, isFollowupsLoaded, isProcessDocumentLoaded } = useGlobalData();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (dataLoading) {
    if (!user) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-background">
          <div className="w-16 h-16 border-4 border-[#3B82F6]/20 border-t-[#3B82F6] rounded-full animate-spin mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse tracking-widest text-sm uppercase">Syncing Database...</p>
          <pre className="text-xs text-slate-500 mt-4">{JSON.stringify(debugStates, null, 2)}</pre>
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
           <pre className="text-xs text-slate-500 mt-4 z-50 text-black dark:text-white relative bg-white dark:bg-slate-900 p-4 rounded-md">
            {JSON.stringify(debugStates, null, 2)}
           </pre>
        </div>
      );
    }
    
    // Show errors even if we force load
    return (
      <>
        {subscriptionErrors && subscriptionErrors.length > 0 && (
          <div className="bg-red-100 text-red-600 p-4 text-xs font-mono break-all whitespace-pre-wrap rounded-md mb-4 border border-red-300">
            <strong>Firebase Errors:</strong><br />
            {subscriptionErrors.some(e => e.includes('RESOURCE_EXHAUSTED')) && (
               <div className="text-red-700 bg-red-200 p-2 my-2 rounded font-bold">
                 CRITICAL: Your Firebase free daily quota limits have been exhausted. Your data is perfectly safe, but you won't be able to view or modify it until tomorrow when the daily quota resets, unless you upgrade your Firebase project to the Blaze (pay-as-you-go) plan.
               </div>
            )}
            {subscriptionErrors.join('\n')}
          </div>
        )}
        {children}
      </>
    );
  };

  const currentRole = userProfile?.role || 'user';
  const visibleNavItems = navItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => {
          if (window.innerWidth >= 1024) setSidebarOpen(true);
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 1024) setSidebarOpen(false);
        }}
        className={cn(
        "fixed inset-y-0 left-0 z-50 h-screen bg-[#0F172A] text-slate-400 transition-all duration-300 outline-none flex flex-col shadow-2xl lg:shadow-none lg:border-r lg:border-slate-800 overflow-hidden",
        sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 w-64 lg:w-[68px]"
      )}>
        <div className="flex flex-col h-full py-6">
          <div className="px-5 pb-8 flex items-center justify-between whitespace-nowrap overflow-hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                <Store className="h-4 w-4 text-white" />
              </div>
              <div className={cn("flex flex-col transition-all duration-300", sidebarOpen ? "opacity-100" : "opacity-0")}>
                <div className="text-lg font-extrabold tracking-wide text-[#3B82F6] leading-tight">
                  JAY BAUDHIMAI
                </div>
                <div className="text-slate-100 uppercase tracking-widest font-black text-xs leading-none mt-0.5">TRADERS <span className="text-[9px] font-black tracking-widest text-[#3B82F6] opacity-80 ml-1">V2.1</span></div>
              </div>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-100 shrink-0" onClick={toggleSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto sidebar-scrollbar overflow-x-hidden">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  title={item.label}
                  className={cn(
                    "flex items-center gap-4 px-6 py-3 text-sm font-medium transition-all duration-200 border-l-4 whitespace-nowrap",
                    isActive 
                      ? "bg-[#3B82F6]/10 text-slate-100 border-[#3B82F6]" 
                      : "border-transparent hover:bg-white/5 hover:text-slate-100"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-[#3B82F6]" : "text-slate-500")} />
                  <span className={cn("transition-opacity duration-300", sidebarOpen ? "opacity-100" : "opacity-0")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-5 border-t border-white/10 pt-6 overflow-hidden whitespace-nowrap">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 shrink-0 rounded-full bg-[#3B82F6] flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className={cn("flex-1 overflow-hidden transition-opacity duration-300", sidebarOpen ? "opacity-100" : "opacity-0")}>
                <p className="text-sm font-semibold text-slate-100 truncate">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                   {currentRole.replace('_', ' ')}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("justify-center gap-2 bg-transparent text-slate-300 border-slate-700 hover:bg-white/5 hover:text-white transition-all duration-300", sidebarOpen ? "w-full px-3" : "w-9 h-9 p-0 rounded-full border-none mx-auto")}
              onClick={logout}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn("transition-opacity duration-300", sidebarOpen ? "opacity-100" : "hidden")}>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Top Center Nav Trigger (Large Screens Only) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 hidden lg:flex flex-col items-center">
          <button 
            onClick={() => setTopNavOpen(!topNavOpen)}
            className={cn(
              "group flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-md border border-slate-200/60 dark:border-slate-800 rounded-full transition-all duration-300 ease-out overflow-hidden relative",
              topNavOpen ? "w-12 h-12 bg-white dark:bg-slate-900 shadow-inner" : "w-12 h-12 hover:w-16 hover:bg-white dark:hover:bg-slate-800"
            )}
          >
            {topNavOpen ? (
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300 animate-in fade-in zoom-in duration-200" />
            ) : (
              <>
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-50" />
                <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400 absolute opacity-0 scale-50 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 animate-bounce" />
              </>
            )}
          </button>

          {/* Creative Animated Nav Bar */}
          <div 
            className={cn(
              "absolute top-16 left-1/2 -translate-x-1/2 transition-all duration-500 ease-out origin-top",
              topNavOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-4 pointer-events-none"
            )}
          >
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl border border-slate-200/50 dark:border-slate-800 rounded-3xl p-3 flex gap-2 items-center flex-wrap max-w-[900px] justify-center w-max">
              {visibleNavItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setTopNavOpen(false)}
                    style={{ transitionDelay: `${idx * 15}ms` }}
                    className={cn(
                      "group/navitem relative px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all duration-300",
                      topNavOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
                      isActive 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 transition-transform duration-300 group-hover/navitem:scale-110", isActive ? "text-white" : "text-slate-400 group-hover/navitem:text-blue-500")} />
                    <span className="text-xs font-bold tracking-wide whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ring-2 ring-white/30 animate-pulse shadow-sm" />
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Menu & Theme Controls */}
        <div className="fixed top-4 right-4 z-40 flex items-center gap-1.5 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={toggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>

          
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

        <main className="flex-1 overflow-hidden pt-[20px] pb-[2px] pr-[7px] pl-4 lg:pl-[84px] flex flex-col lg:pt-0 lg:pb-0">
          <div className="mx-auto max-w-[1400px] w-full flex-1 flex flex-col h-full overflow-hidden">
            {(!hasSetPassword && typeof hasSetPassword === 'boolean' && location.pathname !== '/settings') && (
              <div className="mb-4 mt-16 lg:mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm z-30 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Set up your password</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-500/80 mt-0.5">You signed in with Google. Set a password so you can optionally log in with email and password next time.</p>
                  </div>
                </div>
                <Link to="/settings" className="shrink-0">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 font-bold border-none shadow-sm shadow-amber-500/20">
                    Set Password
                  </Button>
                </Link>
              </div>
            )}
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
