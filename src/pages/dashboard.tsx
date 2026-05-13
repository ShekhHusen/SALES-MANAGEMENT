import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Vehicle, Purchase, Sale, Company, Model } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Legend
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
  UserCheck
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    onSnapshot(collection(db, 'vehicles'), (s) => setVehicles(s.docs.map(d => d.data() as Vehicle)));
    onSnapshot(collection(db, 'purchases'), (s) => setPurchases(s.docs.map(d => d.data() as Purchase)));
    onSnapshot(collection(db, 'sales'), (s) => setSales(s.docs.map(d => d.data() as Sale)));
    onSnapshot(collection(db, 'companies'), (s) => setCompanies(s.docs.map(d => ({ id: d.id, ...d.data() } as Company))));
    onSnapshot(collection(db, 'models'), (s) => setModels(s.docs.map(d => ({ id: d.id, ...d.data() } as Model))));
  }, []);

  const stats = {
    totalInventory: vehicles.length,
    totalProcurement: purchases.reduce((acc, p) => acc + (p.chassisNumbers?.length || 0), 0),
    totalSales: sales.length,
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
  const salesByMonth = sales.reduce((acc: any, sale) => {
    const month = sale.date.toDate().toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const salesTrendData = Object.entries(salesByMonth).map(([name, sales]) => ({ name, sales }));

  const topModel = modelSplit[0]?.name || 'N/A';

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 font-medium active:text-slate-600 transition-colors cursor-default">
          Comprehensive summary of vehicle inventory and document workflow.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard 
          title="Total Inventory" 
          value={stats.totalInventory} 
          icon={Car} 
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <StatCard 
          title="Total Purchases" 
          value={stats.totalProcurement} 
          icon={ShoppingCart} 
          color="text-purple-500"
          bg="bg-purple-50"
        />
        <StatCard 
          title="In-Stock Units" 
          value={stats.inStock} 
          icon={Package} 
          color="text-indigo-500"
          bg="bg-indigo-50"
        />
        <StatCard 
          title="Sales Recorded" 
          value={stats.totalSales} 
          icon={BadgeDollarSign} 
          color="text-emerald-500"
          bg="bg-emerald-50"
        />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Doc Pending" 
          value={stats.bluebookPending} 
          icon={Clock} 
          color="text-amber-500"
          bg="bg-amber-50"
        />
        <StatCard 
          title="Doc Received" 
          value={stats.bluebookReceived} 
          icon={CheckCircle2} 
          color="text-teal-500"
          bg="bg-teal-50"
        />
        <StatCard 
          title="Namsari Pending" 
          value={stats.naamsariPending} 
          icon={AlertCircle} 
          color="text-orange-500"
          bg="bg-orange-50"
        />
        <StatCard 
          title="Names of JBMT" 
          value={stats.jbmtName} 
          icon={UserCheck} 
          color="text-cyan-500"
          bg="bg-cyan-50"
        />
        <StatCard 
          title="Customer Done" 
          value={stats.customerDone} 
          icon={FileText} 
          color="text-emerald-500"
          bg="bg-emerald-50"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Company Distribution</CardTitle>
            <CardDescription className="text-xs">Inventory split by manufacturer</CardDescription>
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
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Monthly Performance Trend</CardTitle>
            <CardDescription className="text-xs">Visualizing unit movement over time</CardDescription>
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
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-slate-800">Top 5 Models In-stock</CardTitle>
          <CardDescription className="text-xs">Inventory density by vehicle model</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
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
                cursor={{ fill: '#F1F5F9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="relative overflow-hidden border-none shadow-md bg-white hover:shadow-xl transition-all duration-300 group rounded-2xl">
      <div className={cn("absolute inset-0 opacity-0 bg-gradient-to-br transition-opacity duration-300 group-hover:opacity-10", bg, "from-transparent to-current")} />
      <CardContent className="p-4 relative z-10 flex items-center gap-4">
        <div className={cn("p-3 rounded-2xl shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-110 shrink-0", bg, color)}>
          <Icon className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1 cursor-default">{value}</span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition-colors truncate cursor-default">{title}</span>
        </div>
      </CardContent>
    </Card>
  );
}
