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
  CloudSun,
  CloudMoon,
  Menu,
  X,
  LogOut,
  ActivitySquare,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: BarChart3, path: '/' },
  { label: 'Inventory', icon: Car, path: '/inventory' },
  { label: 'Parties', icon: Users, path: '/parties' },
  { label: 'Purchases', icon: ShoppingCart, path: '/purchases' },
  { label: 'Sales', icon: BadgeDollarSign, path: '/sales' },
  { label: 'Document Process', icon: FileText, path: '/document-process' },
  { label: 'Data Analyzer', icon: ActivitySquare, path: '/analyzer' },
  { label: 'Settings', icon: SettingsIcon, path: '/settings' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 h-screen bg-[#0F172A] text-slate-400 transition-transform duration-300 outline-none flex flex-col shadow-2xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:-translate-x-full lg:hover:translate-x-0",
        "lg:after:content-[''] lg:after:absolute lg:after:top-0 lg:after:-right-8 lg:after:w-8 lg:after:h-full lg:after:bg-transparent lg:after:cursor-pointer"
      )}>
        <div className="flex flex-col h-full py-6">
          <div className="px-6 pb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="text-xl font-extrabold tracking-tight text-[#3B82F6]">
                AUTO<span className="text-slate-100 uppercase tracking-widest font-black">Manager</span>
              </div>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-100" onClick={toggleSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
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
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Administrator</p>
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
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 rounded-xl" onClick={toggleSidebar}>
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

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Professional entry animation placeholder */}
            <div className="animate-in fade-in duration-500 slide-in-from-bottom-2">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
