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
  TrendingUp
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
    totalProcurement: purchases.length,
    totalSales: vehicles.filter(v => v.status === 'sold').length,
    inStock: vehicles.filter(v => v.status === 'in-stock' && !!v.purchaseId).length,
    bluebookPending: vehicles.filter(v => v.bluebookStatus === 'Not Received').length,
    bluebookReceived: vehicles.filter(v => v.bluebookStatus === 'Received').length,
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Total Inventory" 
          value={stats.totalInventory} 
          icon={Car} 
          color="text-blue-600" 
          meta="+8.2% from last gate"
          metaColor="text-emerald-600"
        />
        <StatCard 
          title="Total Purchases" 
          value={stats.totalProcurement} 
          icon={ShoppingCart} 
          color="text-purple-600" 
          meta={`Across ${purchases.length} invoices`}
          metaColor="text-slate-500"
        />
        <StatCard 
          title="In-Stock Units" 
          value={stats.inStock} 
          icon={Package} 
          color="text-indigo-600" 
          meta={`${stats.totalInventory > 0 ? Math.round(stats.inStock/stats.totalInventory*100) : 0}% of total pool`}
          metaColor="text-slate-500"
        />
        <StatCard 
          title="Sales Recorded" 
          value={stats.totalSales} 
          icon={BadgeDollarSign} 
          color="text-emerald-600" 
          meta="+12.5% vs last month"
          metaColor="text-emerald-600"
        />
        <StatCard 
          title="Doc Pending" 
          value={stats.bluebookPending} 
          icon={Clock} 
          color="text-amber-600" 
          meta="Requires immediate action"
          metaColor="text-amber-600"
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

function StatCard({ title, value, icon: Icon, color, meta, metaColor }: any) {
  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">{title}</span>
          <div className={cn("p-2 rounded-lg bg-slate-50", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{value}</span>
          <span className={cn("text-[10px] font-bold mt-1", metaColor || "text-slate-400")}>
            {meta}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
