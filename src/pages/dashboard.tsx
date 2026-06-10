import React, { useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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
  User
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useAccountBalances } from '@/hooks/useAccountBalances';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Dashboard() {
  const { vehicles, purchases, sales, companies, models, parties } = useGlobalData();
  const { partyBalances, mappings } = useAccountBalances(parties);
  const navigate = useNavigate();

  const [vendorFilter, setVendorFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [bluebookFilter, setBluebookFilter] = useState('all');
  const [namsariFilter, setNamsariFilter] = useState('Pending');

  const activeSales = sales.filter(s => s.status !== 'returned');

  const pendingDuesList = useMemo(() => {
    return vehicles.map(v => {
      const sale = activeSales.find(s => s.chassisNumber === v.id);
      const purchase = purchases.find(p => p.chassisNumbers?.includes(v.id));
      const vendor = parties.find(p => p.id === purchase?.vendorId);
      const customer = parties.find(p => p.id === sale?.customerId);
      const company = companies.find(c => c.id === v.companyId);
      const model = models.find(m => m.id === v.modelId);
      const closingBal = customer ? (partyBalances[customer.id] || 0) : 0;
      
      return { vehicle: v, sale, purchase, vendor, customer, company, model, closingBal };
    }).filter(item => {
      if (!item.sale || !item.customer) return false;
      if (item.closingBal >= 100000) return false;
      if (namsariFilter !== 'all' && item.vehicle.naamsariStatus !== namsariFilter) return false;
      if (bluebookFilter !== 'all' && item.vehicle.bluebookStatus !== bluebookFilter) return false;
      if (vendorFilter !== 'all' && item.vendor?.id !== vendorFilter) return false;
      if (companyFilter !== 'all' && item.vehicle.companyId !== companyFilter) return false;
      if (modelFilter !== 'all' && item.vehicle.modelId !== modelFilter) return false;
      return true;
    });
  }, [vehicles, activeSales, purchases, parties, companies, models, partyBalances, namsariFilter, bluebookFilter, vendorFilter, companyFilter, modelFilter]);

  const uniqueVendors = useMemo(() => Array.from(new Set(purchases.map(p => p.vendorId))).map(vId => parties.find(p => p.id === vId)).filter(Boolean), [purchases, parties]);

  const stats = {
    totalInventory: vehicles.length,
    totalProcurement: purchases.reduce((acc, p) => acc + (p.chassisNumbers?.length || 0), 0),
    totalSales: activeSales.length,
    inStock: vehicles.filter(v => v.status === 'in-stock').length,
    bluebookPending: vehicles.filter(v => v.bluebookStatus === 'Not Received').length,
    bluebookReceived: vehicles.filter(v => v.bluebookStatus === 'Received').length,
    naamsariPending: vehicles.filter(v => v.naamsariStatus === 'Pending').length,
    jbmtName: vehicles.filter(v => v.naamsariStatus === 'Names of JBMT').length,
    customerDone: vehicles.filter(v => v.naamsariStatus === 'Customer Done').length,
  };

  // Model Split Data
  const modelSplit = models.map(m => ({
    name: m.name,
    value: vehicles.filter(v => v.modelId === m.id).length
  })).sort((a,b) => b.value - a.value).slice(0, 5);

  // Company Split Data
  const companySplit = companies.map(c => ({
    name: c.name,
    value: vehicles.filter(v => v.companyId === c.id).length
  }));

  // Sales Trend (Last 6 months simplified)
  const salesByMonth = activeSales.reduce((acc: any, sale) => {
    const month = sale.date.toDate().toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const salesTrendData = Object.entries(salesByMonth).map(([name, sales]) => ({ name, sales }));

  const topModel = modelSplit[0]?.name || 'N/A';

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
        <CardHeader className="pb-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-500">
              Clear Dues & Pending Namsari
            </CardTitle>
            <CardDescription>
              Vehicles with Naamsari pending and customer dues under ₹1 Lakh.
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <Select value={namsariFilter} onValueChange={setNamsariFilter}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Namsari" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Namsari</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Names of JBMT">Names of JBMT</SelectItem>
                    <SelectItem value="Customer Done">Customer Done</SelectItem>
                </SelectContent>
            </Select>

            <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {uniqueVendors.map(v => v && (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={companyFilter} onValueChange={(val) => { setCompanyFilter(val); setModelFilter('all'); }}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={modelFilter} onValueChange={setModelFilter} disabled={companyFilter === 'all'}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {models.filter(m => m.companyId === companyFilter).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={bluebookFilter} onValueChange={setBluebookFilter}>
                <SelectTrigger className="w-[140px] h-9">
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
        </CardHeader>
        <CardContent className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap gap-4 overflow-y-auto max-h-[350px] custom-scrollbar">
            {pendingDuesList.length === 0 ? (
              <div className="w-full text-center py-8 text-slate-500 text-sm">
                No vehicles matched your filters.
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
                          item.vehicle.naamsariStatus === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20" :
                          item.vehicle.naamsariStatus === 'Names of JBMT' ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20" :
                          "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                        )}>
                          {item.vehicle.naamsariStatus}
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
                      onClick={() => navigate('/process-document', { state: { saleId: item.sale?.id } })}
                      title="View Documents"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="flex-1 h-8 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => navigate('/internal-accounts', { state: { selectedPartyId: item.customer?.id, activeTab: 'statement' } })}
                      title="View Account"
                    >
                      <User className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Company Distribution</CardTitle>
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
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Monthly Performance Trend</CardTitle>
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
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Top 5 Models In-stock</CardTitle>
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
