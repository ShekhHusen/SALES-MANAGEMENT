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
import { collection, query, where, getCountFromServer, getAggregateFromServer, sum, getDocs } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { Company, Model, Party, Purchase, Sale, Vehicle } from '@/types';
// @ts-ignore
import ExcelJS from '@protobi/exceljs/dist/exceljs.min.js';
import { toast } from 'sonner';
import { FileSpreadsheet } from 'lucide-react';

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

  const { loadParties, loadCompanies, loadModels } = useGlobalData();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportGroup = async (naamsariStatus: string, title: string) => {
    setIsExporting(true);
    toast.info(`Generating Excel for ${title}...`);
    try {
      const [vehiclesSnap, companiesSnap, modelsSnap, partiesSnap, purchasesSnap, salesSnap] = await Promise.all([
        getDocs(query(collection(db, 'vehicles'), where('naamsariStatus', '==', naamsariStatus))),
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'models')),
        getDocs(collection(db, 'parties')),
        getDocs(collection(db, 'purchases')),
        getDocs(collection(db, 'sales'))
      ]);

      const filteredVehicles = vehiclesSnap.docs.map(d => ({ ...d.data(), id: d.id, chassisNumber: d.id })) as Vehicle[];
      const companies = companiesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Company[];
      const models = modelsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Model[];
      const parties = partiesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Party[];
      const purchases = purchasesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Purchase[];
      const sales = salesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Sale[];

      if (filteredVehicles.length === 0) {
        toast.error(`No vehicles found for ${title}`);
        setIsExporting(false);
        return;
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(title);

      ws.columns = [
        { header: 'Vendor', key: 'Vendor', width: 20 },
        { header: 'Invoice No.', key: 'Invoice No.', width: 15 },
        { header: 'Chassis Number', key: 'Chassis Number', width: 20 },
        { header: 'Company', key: 'Company', width: 15 },
        { header: 'Model', key: 'Model', width: 20 },
        { header: 'Color', key: 'Color', width: 12 },
        { header: 'Registration Number', key: 'Registration Number', width: 20 },
        { header: 'Bluebook Status', key: 'Bluebook Status', width: 15 },
        { header: 'Naamsari Status', key: 'Naamsari Status', width: 15 },
        { header: 'Status', key: 'Status', width: 12 },
        { header: 'File No.', key: 'File No.', width: 10 },
        { header: 'Customer Name', key: 'Customer Name', width: 20 },
        { header: 'Address', key: 'Address', width: 25 },
        { header: 'Contact Number', key: 'Contact Number', width: 15 }
      ];

      const rows = filteredVehicles.map((v) => {
        const purchase = purchases.find((p) => p.id === v.purchaseId);
        const vendor = purchase ? parties.find((p) => p.id === purchase.vendorId) : null;
        const sale = sales.find((s) => s.id === v.saleId);
        const customer = sale ? parties.find((p) => p.id === sale.customerId) : null;

        return {
          'Vendor': vendor?.name || '',
          'Invoice No.': purchase?.invoiceNumber || '',
          'Chassis Number': v.chassisNumber,
          'Company': companies.find((c) => c.id === v.companyId)?.name || '',
          'Model': models.find((m) => m.id === v.modelId)?.name || '',
          'Color': v.color || '',
          'Registration Number': v.registrationNumber || '',
          'Bluebook Status': v.bluebookStatus || '',
          'Naamsari Status': v.naamsariStatus || '',
          'Status': v.status || '',
          'File No.': sale?.fileNumber || '',
          'Customer Name': customer?.name || '',
          'Address': customer?.address || '',
          'Contact Number': customer?.contactNumber || ''
        };
      });

      // Sort by Vendor (A-Z) and then by Status (A-Z)
      rows.sort((a: any, b: any) => {
        const vendorCompare = a.Vendor.localeCompare(b.Vendor);
        if (vendorCompare !== 0) return vendorCompare;
        return a.Status.localeCompare(b.Status);
      });

      ws.addRows(rows);

      // Add Auto-Filter to all columns
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: ws.columns.length }
      };

      // Formatting headers
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' }
      };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_Export.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${title} data exported successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

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
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard title="Total Inventory" value={stats.totalInventory} icon={Car} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
        <StatCard title="Total Purchases" value={stats.totalProcurement} icon={ShoppingCart} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
        <StatCard title="In-Stock Units" value={stats.inStock} icon={Package} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
        <StatCard title="Sales Recorded" value={stats.totalSales} icon={BadgeDollarSign} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Doc Pending" value={stats.bluebookPending} icon={Clock} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" />
        <StatCard title="Doc Received" value={stats.bluebookReceived} icon={CheckCircle2} color="text-teal-500" bg="bg-teal-50 dark:bg-teal-500/10" />
        <StatCard 
          title="Namsari Pending" 
          value={stats.naamsariPending} 
          icon={AlertCircle} 
          color="text-orange-500" 
          bg="bg-orange-50 dark:bg-orange-500/10" 
          onExport={() => handleExportGroup('Pending', 'Namsari Pending')}
          isExporting={isExporting}
        />
        <StatCard 
          title="Names of JBMT" 
          value={stats.jbmtName} 
          icon={UserCheck} 
          color="text-cyan-500" 
          bg="bg-cyan-50 dark:bg-cyan-500/10" 
          onExport={() => handleExportGroup('Names of JBMT', 'Names of JBMT')}
          isExporting={isExporting}
        />
        <StatCard title="Customer Done" value={stats.customerDone} icon={FileText} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, onExport, isExporting }: any) {
  return (
    <Card className="relative overflow-hidden border-none shadow-md bg-white dark:bg-slate-950 hover:shadow-xl transition-all duration-300 group rounded-2xl">
      <div className={cn("absolute inset-0 opacity-0 bg-gradient-to-br transition-opacity duration-300 group-hover:opacity-10", bg, "from-transparent to-current")} />
      <CardContent className="p-4 relative z-10 flex items-center gap-4">
        <div className={cn("p-3 rounded-2xl shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-110 shrink-0", bg, color)}>
          <Icon className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-1 cursor-default">{value}</span>
            {onExport && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onExport();
                }}
                disabled={isExporting}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Export Group to Excel"
              >
                <FileSpreadsheet className={cn("h-4 w-4", isExporting && "animate-pulse")} />
              </button>
            )}
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors truncate cursor-default">{title}</span>
        </div>
      </CardContent>
    </Card>
  );
}
