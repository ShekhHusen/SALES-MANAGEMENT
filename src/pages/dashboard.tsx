import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
import { collection, query, where, getCountFromServer, getAggregateFromServer, sum } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalInventory: 0,
    totalProcurement: 0,
    totalSales: 0,
    inStock: 0,
    bluebookPending: 0,
    bluebookReceived: 0,
    naamsariPending: 0,
    jbmtName: 0,
    customerDone: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const salesRef = collection(db, 'sales');
        
        // Parallel counting
        const [
          totalInventorySnap,
          inStockSnap,
          bluebookPendingSnap,
          bluebookReceivedSnap,
          naamsariPendingSnap,
          jbmtNameSnap,
          customerDoneSnap,
          totalSalesSnap
        ] = await Promise.all([
          getCountFromServer(vehiclesRef),
          getCountFromServer(query(vehiclesRef, where('status', '==', 'in-stock'))),
          getCountFromServer(query(vehiclesRef, where('bluebookStatus', '==', 'Not Received'))),
          getCountFromServer(query(vehiclesRef, where('bluebookStatus', '==', 'Received'))),
          getCountFromServer(query(vehiclesRef, where('naamsariStatus', '==', 'Pending'))),
          getCountFromServer(query(vehiclesRef, where('naamsariStatus', '==', 'Names of JBMT'))),
          getCountFromServer(query(vehiclesRef, where('naamsariStatus', '==', 'Customer Done'))),
          getCountFromServer(query(salesRef, where('status', '!=', 'returned')))
        ]);

        // We can't aggregate array length easily for purchases.chassisNumbers without fetching them or keeping a count field.
        // For now we'll fetch purchases to sum them up, or just getCount of purchases if that's close enough.
        // Or fetch all purchases just for the array sizes (it's much lighter than listening to them real-time).
        const purchasesRef = collection(db, 'purchases');
        const purchasesSnap = await getCountFromServer(purchasesRef);

        setStats({
          totalInventory: totalInventorySnap.data().count,
          totalProcurement: purchasesSnap.data().count, // approximate for now
          totalSales: totalSalesSnap.data().count,
          inStock: inStockSnap.data().count,
          bluebookPending: bluebookPendingSnap.data().count,
          bluebookReceived: bluebookReceivedSnap.data().count,
          naamsariPending: naamsariPendingSnap.data().count,
          jbmtName: jbmtNameSnap.data().count,
          customerDone: customerDoneSnap.data().count,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Loading Stats...</p>
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
        <StatCard title="Total Inventory" value={stats.totalInventory} icon={Car} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
        <StatCard title="Total Purchases" value={stats.totalProcurement} icon={ShoppingCart} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
        <StatCard title="In-Stock Units" value={stats.inStock} icon={Package} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
        <StatCard title="Sales Recorded" value={stats.totalSales} icon={BadgeDollarSign} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Doc Pending" value={stats.bluebookPending} icon={Clock} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" />
        <StatCard title="Doc Received" value={stats.bluebookReceived} icon={CheckCircle2} color="text-teal-500" bg="bg-teal-50 dark:bg-teal-500/10" />
        <StatCard title="Namsari Pending" value={stats.naamsariPending} icon={AlertCircle} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" />
        <StatCard title="Names of JBMT" value={stats.jbmtName} icon={UserCheck} color="text-cyan-500" bg="bg-cyan-50 dark:bg-cyan-500/10" />
        <StatCard title="Customer Done" value={stats.customerDone} icon={FileText} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
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
