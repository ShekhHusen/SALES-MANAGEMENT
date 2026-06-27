import React, { useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { Vehicle, Purchase, Sale, Company, Model } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { 
  Car, 
  ShoppingCart, 
  BadgeDollarSign, 
  Package, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  Eye,
  User,
  Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';
import { AccountStatementSheet } from '@/components/AccountStatementSheet';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Dashboard() {
  const { vehicles, purchases, sales, companies, models, parties, cardTotals } = useGlobalData();
  const { partyBalances, mappings } = useAccountBalances(parties);
  const navigate = useNavigate();

  const [tempVendorFilter, setTempVendorFilter] = useState('all');
  const [tempCompanyFilter, setTempCompanyFilter] = useState('all');
  const [tempModelFilter, setTempModelFilter] = useState('all');
  const [tempBluebookFilter, setTempBluebookFilter] = useState('all');
  const [tempNamsariFilter, setTempNamsariFilter] = useState('all');
  const [tempBalanceLessThan, setTempBalanceLessThan] = useState('100000');

  const [appliedFilters, setAppliedFilters] = useState<{
    vendor: string;
    company: string;
    model: string;
    bluebook: string;
    namsari: string;
    balanceLessThan: string;
  } | null>(null);

  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const [accSheetOpen, setAccSheetOpen] = useState(false);
  const [accParty, setAccParty] = useState(null);

  const activeSales = sales.filter(s => s.status !== 'returned');

  const getDocMillis = (item: any) => {
    if (!item) return 0;
    const dt = item.date || item.createdAt || item.updatedAt || item.purchaseDate || item.saleDate;
    if (!dt) return 0;
    if (typeof dt.toMillis === 'function') return dt.toMillis();
    if (typeof dt.toDate === 'function') return dt.toDate().getTime();
    if (dt.seconds) return dt.seconds * 1000;
    if (typeof dt === 'number') return dt;
    const parsed = new Date(dt).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const oneWeekWindowStart = useMemo(() => {
    let max = Date.now();
    activeSales.forEach(s => {
      const m = getDocMillis(s);
      if (m > max) max = m;
    });
    return max - 7 * 24 * 60 * 60 * 1000;
  }, [activeSales]);

  const recentSales = useMemo(() => {
    return activeSales.filter(s => {
      const m = getDocMillis(s);
      return m >= oneWeekWindowStart;
    });
  }, [activeSales, oneWeekWindowStart]);

  const recentVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const m = getDocMillis(v);
      return m >= oneWeekWindowStart;
    });
  }, [vehicles, oneWeekWindowStart]);

  const pendingDuesList = useMemo(() => {
    if (!appliedFilters) return [];
    return vehicles.map(v => {
      const sale = activeSales.find(s => s.chassisNumber === (v.chassisNumber || v.id));
      const purchase = purchases.find(p => p.chassisNumbers?.includes(v.chassisNumber || v.id));
      const vendor = parties.find(p => p.id === purchase?.vendorId);
      const customer = parties.find(p => p.id === sale?.customerId);
      const company = companies.find(c => c.id === v.companyId);
      const model = models.find(m => m.id === v.modelId);
      const closingBal = customer ? (partyBalances[customer.id] || 0) : 0;
      
      return { vehicle: v, sale, purchase, vendor, customer, company, model, closingBal };
    }).filter(item => {
      if (!item.sale || !item.customer) return false;
      const saleMillis = getDocMillis(item.sale);
      if (saleMillis > 0 && saleMillis < oneWeekWindowStart) return false;
      if (appliedFilters.balanceLessThan) {
        const threshold = parseFloat(appliedFilters.balanceLessThan);
        if (!isNaN(threshold) && item.closingBal >= threshold) return false;
      }
      if (appliedFilters.namsari !== 'all' && (item.vehicle.naamsariStatus || '').toLowerCase().trim() !== appliedFilters.namsari.toLowerCase().trim()) return false;
      if (appliedFilters.bluebook !== 'all' && (item.vehicle.bluebookStatus || '').toLowerCase().trim() !== appliedFilters.bluebook.toLowerCase().trim()) return false;
      if (appliedFilters.vendor !== 'all' && item.vendor?.id !== appliedFilters.vendor) return false;
      if (appliedFilters.company !== 'all' && item.vehicle.companyId !== appliedFilters.company) return false;
      if (appliedFilters.model !== 'all' && item.vehicle.modelId !== appliedFilters.model) return false;
      return true;
    });
  }, [vehicles, activeSales, purchases, parties, companies, models, partyBalances, appliedFilters, oneWeekWindowStart]);

  const uniqueVendors = useMemo(() => Array.from(new Set(purchases.map(p => p.vendorId))).map(vId => parties.find(p => p.id === vId)).filter(Boolean), [purchases, parties]);

  const stats = {
    // All-time Totals from Backend Aggregations (As Requested)
    totalInventory: cardTotals?.totalInventory ?? vehicles.length,
    totalProcurement: cardTotals?.totalProcurement ?? purchases.reduce((acc, p) => acc + (p.chassisNumbers?.length || 0), 0),
    totalSales: cardTotals?.totalSales ?? activeSales.length,
    inStock: cardTotals?.inStock ?? vehicles.filter(v => v.status === 'in-stock').length,
    // 1-Week Statuses (As Requested)
    bluebookPending: recentVehicles.filter(v => (v.bluebookStatus || '').toLowerCase().trim() === 'not received').length,
    bluebookReceived: recentVehicles.filter(v => (v.bluebookStatus || '').toLowerCase().trim() === 'received').length,
    naamsariPending: recentVehicles.filter(v => (v.naamsariStatus || '').toLowerCase().trim() === 'pending').length,
    jbmtName: recentVehicles.filter(v => (v.naamsariStatus || '').toLowerCase().trim() === 'names of jbmt').length,
    customerDone: recentVehicles.filter(v => (v.naamsariStatus || '').toLowerCase().trim() === 'customer done').length,
  };

  // Model Split Data (1-Week)
  const modelSplit = models.map(m => ({
    name: m.name,
    value: recentVehicles.filter(v => v.modelId === m.id).length
  })).sort((a,b) => b.value - a.value).slice(0, 5);

  // Company Split Data (1-Week)
  const companySplit = companies.map(c => ({
    name: c.name,
    value: recentVehicles.filter(v => v.companyId === c.id).length
  }));

  // Sales Trend (Last 1 Week by Day)
  const salesTrendData = useMemo(() => {
    const daysMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(oneWeekWindowStart + (7 - i) * 24 * 60 * 60 * 1000);
      const dayLabel = d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
      daysMap[dayLabel] = 0;
    }
    recentSales.forEach(sale => {
      const m = getDocMillis(sale);
      if (m >= oneWeekWindowStart) {
        const dt = new Date(m);
        const label = dt.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
        if (daysMap[label] !== undefined) {
          daysMap[label] += 1;
        } else {
          daysMap[label] = (daysMap[label] || 0) + 1;
        }
      }
    });
    return Object.entries(daysMap).map(([name, sales]) => ({ name, sales }));
  }, [recentSales, oneWeekWindowStart]);

  const topModel = modelSplit[0]?.name || 'N/A';

  const { loading } = useGlobalData();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Synchronizing Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 h-full overflow-y-auto pr-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:mt-[24px]">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard 
          title="Total Inventory" 
          value={stats.totalInventory} 
          icon={Car} 
          color="text-blue-500"
          bg="bg-blue-50 dark:bg-blue-500/10"
        />
        <StatCard 
          title="Total Purchases" 
          value={stats.totalProcurement} 
          icon={ShoppingCart} 
          color="text-purple-500"
          bg="bg-purple-50 dark:bg-purple-500/10"
        />
        <StatCard 
          title="In-Stock Units" 
          value={stats.inStock} 
          icon={Package} 
          color="text-indigo-500"
          bg="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <StatCard 
          title="Sales Recorded" 
          value={stats.totalSales} 
          icon={BadgeDollarSign} 
          color="text-emerald-500"
          bg="bg-emerald-50 dark:bg-emerald-500/10"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Doc Pending" 
          value={stats.bluebookPending} 
          icon={Clock} 
          color="text-amber-500"
          bg="bg-amber-50 dark:bg-amber-500/10"
        />
        <StatCard 
          title="Doc Received" 
          value={stats.bluebookReceived} 
          icon={CheckCircle2} 
          color="text-teal-500"
          bg="bg-teal-50 dark:bg-teal-500/10"
        />
        <StatCard 
          title="Namsari Pending" 
          value={stats.naamsariPending} 
          icon={AlertCircle} 
          color="text-orange-500"
          bg="bg-orange-50 dark:bg-orange-500/10"
        />
        <StatCard 
          title="Names of JBMT" 
          value={stats.jbmtName} 
          icon={UserCheck} 
          color="text-cyan-500"
          bg="bg-cyan-50 dark:bg-cyan-500/10"
        />
        <StatCard 
          title="Customer Done" 
          value={stats.customerDone} 
          icon={FileText} 
          color="text-emerald-500"
          bg="bg-emerald-50 dark:bg-emerald-500/10"
        />
      </div>

      {/* Pending Due < 1 Lakh & Pending Namsari Section */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-950 mb-4 bg-white/50 backdrop-blur-xl">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-500">
            Clear Dues & Pending Namsari
          </CardTitle>
          <CardDescription>
            Vehicles with Naamsari pending and customer dues target threshold limits. Configure filters below and search.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Labeled Filter Form */}
          <div className="bg-slate-50/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 mb-6">
            <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-4 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Search Criteria
            </h4>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Namsari Status</label>
                <Select value={tempNamsariFilter} onValueChange={setTempNamsariFilter}>
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Namsari" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Namsari</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Names of JBMT">Names of JBMT</SelectItem>
                    <SelectItem value="Customer Done">Customer Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Vendor</label>
                <Select value={tempVendorFilter} onValueChange={setTempVendorFilter}>
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {uniqueVendors.map(v => v && (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Company</label>
                <Select value={tempCompanyFilter} onValueChange={(val) => { setTempCompanyFilter(val); setTempModelFilter('all'); }}>
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Model</label>
                <Select value={tempModelFilter} onValueChange={setTempModelFilter} disabled={tempCompanyFilter === 'all'}>
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {models.filter(m => m.companyId === tempCompanyFilter).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bluebook Status</label>
                <Select value={tempBluebookFilter} onValueChange={setTempBluebookFilter}>
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Bluebook" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bluebooks</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Not Received">Not Received</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Balance Less Than (₹)</label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="e.g. 100000"
                    value={tempBalanceLessThan}
                    onChange={(e) => setTempBalanceLessThan(e.target.value)}
                    className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-10"
                  />
                  {tempBalanceLessThan && (
                    <button 
                      type="button"
                      onClick={() => setTempBalanceLessThan('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-800/55">
              {appliedFilters && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="font-bold text-slate-500 dark:text-slate-400 h-10 px-4 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setTempVendorFilter('all');
                    setTempCompanyFilter('all');
                    setTempModelFilter('all');
                    setTempBluebookFilter('all');
                    setTempNamsariFilter('all');
                    setTempBalanceLessThan('100000');
                    setAppliedFilters(null);
                  }}
                >
                  Clear
                </Button>
              )}
              <Button 
                className="bg-gradient-to-r from-rose-500 to-orange-500 text-white font-extrabold h-10 px-6 rounded-lg shadow-sm hover:opacity-90 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                onClick={() => {
                  setAppliedFilters({
                    vendor: tempVendorFilter,
                    company: tempCompanyFilter,
                    model: tempModelFilter,
                    bluebook: tempBluebookFilter,
                    namsari: tempNamsariFilter,
                    balanceLessThan: tempBalanceLessThan,
                  });
                }}
              >
                <Search className="w-4 h-4 text-white" />
                Search
              </Button>
            </div>
          </div>

          {/* Results Showcase */}
          {!appliedFilters ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800/60 rounded-2xl bg-slate-50/20 text-center">
              <Search className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2 stroke-[1.5]" />
              <h5 className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-1">Enter Filter Criteria & Search</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Set status criteria in the section above and click the Search button to discover matching dues and vehicle details.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 overflow-y-auto max-h-[350px] custom-scrollbar">
              {pendingDuesList.length === 0 ? (
                <div className="w-full text-center py-10 text-slate-500 text-sm font-medium">
                  No records matched your search parameters.
                </div>
              ) : (
                pendingDuesList.map(item => (
                  <div key={item.vehicle.id} className="group relative w-full sm:w-[350px] lg:w-[400px] flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            #{item.sale?.fileNumber || 'N/A'}
                          </span>
                          <span className={cn(
                            "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                            (item.vehicle.naamsariStatus || '').toLowerCase().trim() === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20" :
                            (item.vehicle.naamsariStatus || '').toLowerCase().trim() === 'names of jbmt' ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20" :
                            "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                          )}>
                            {item.vehicle.naamsariStatus || 'Unknown'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1" title={item.customer?.name}>
                          {item.customer?.name || 'Unknown Party'}
                        </h3>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mb-0.5">Cl. Bla.</div>
                        <div className={cn(
                          "font-mono font-bold text-sm",
                          item.closingBal > 0 ? "text-rose-600" : item.closingBal < 0 ? "text-emerald-600" : "text-slate-600 dark:text-slate-300"
                        )}>
                          {Math.abs(item.closingBal || 0).toLocaleString('en-IN')} {item.closingBal >= 0 ? (item.closingBal > 0 ? 'Dr' : '') : 'Cr'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4">
                      <div>
                        <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Vehicle</div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{item.company?.name} {item.model?.name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Vendor</div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1" title={item.vendor?.name}>{item.vendor?.name || 'Unknown'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="flex-1 h-8 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => {
                          setViewSale(item.sale);
                          setViewSheetOpen(true);
                        }}
                        title="View Documents"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="flex-1 h-8 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => {
                          setAccParty(item.customer);
                          setAccSheetOpen(true);
                        }}
                        title="View Account"
                      >
                        <User className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ProcessDocumentSheet open={viewSheetOpen} onOpenChange={setViewSheetOpen} viewSale={viewSale} />
      <AccountStatementSheet open={accSheetOpen} onOpenChange={setAccSheetOpen} party={accParty} />

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Company Distribution (1-Week)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={companySplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {companySplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">1-Week Sales Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 500, fill: '#64748B' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 500, fill: '#64748B' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Top 5 Models (1-Week)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelSplit}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 500, fill: '#64748B' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 500, fill: '#64748B' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.2)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="relative overflow-hidden border-none shadow-md bg-white dark:bg-slate-950 hover:shadow-xl transition-all duration-300 group rounded-2xl">
      <div className={cn("absolute inset-0 opacity-0 bg-gradient-to-br transition-opacity duration-300 group-hover:opacity-10", bg, "from-transparent to-current")} />
      <CardContent className="p-4 relative z-10 flex items-center gap-4">
        <div className={cn("p-3 rounded-2xl shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-110 shrink-0", bg, color)}>
          <Icon className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-1 cursor-default">{value}</span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors truncate cursor-default">{title}</span>
        </div>
      </CardContent>
    </Card>
  );
}
