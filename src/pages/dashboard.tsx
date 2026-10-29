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
import { doc, getDoc } from 'firebase/firestore';
import { tallyDb } from '@/lib/tallyFirebase';

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
          bluebookPendingSnap,
          bluebookReceivedSnap,
          naamsariPendingSnap,
          jbmtNameSnap,
          customerDoneSnap,
          totalSalesSnap
        ] = await Promise.all([
          getCountFromServer(vehiclesRef),
          getCountFromServer(query(vehiclesRef, where('bluebookStatus', '==', 'Not Received'))),
          getCountFromServer(query(vehiclesRef, where('bluebookStatus', '==', 'Received'))),
          getCountFromServer(query(vehiclesRef, where('naamsariStatus', '==', 'Pending'))),
          getCountFromServer(query(vehiclesRef, where('naamsariStatus', '==', 'Names of JBMT'))),
          getCountFromServer(query(vehiclesRef, where('naamsariStatus', '==', 'Customer Done'))),
          getCountFromServer(query(salesRef, where('status', '!=', 'returned')))
        ]);

        // Sum total chassis across all purchase bills
        const purchasesRef = collection(db, 'purchases');
        const purchasesSnap = await getDocs(purchasesRef);
        let totalPurchasedChassis = 0;
        purchasesSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.chassisNumbers)) {
            totalPurchasedChassis += data.chassisNumbers.length;
          }
        });

        const totalInventory = totalInventorySnap.data().count;
        const totalSales = totalSalesSnap.data().count;
        const inStockCount = Math.max(0, totalInventory - totalSales);

        setStats({
          totalInventory,
          totalProcurement: totalPurchasedChassis,
          totalSales,
          inStock: inStockCount,
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
    toast.info(`Fetching data & customer balances for ${title}...`);
    try {
      const [
        vehiclesSnap,
        companiesSnap,
        modelsSnap,
        partiesSnap,
        purchasesSnap,
        salesSnap,
        tallyAccountsSnap,
        tallyFySnap
      ] = await Promise.all([
        getDocs(query(collection(db, 'vehicles'), where('naamsariStatus', '==', naamsariStatus))),
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'models')),
        getDocs(collection(db, 'parties')),
        getDocs(collection(db, 'purchases')),
        getDocs(collection(db, 'sales')),
        getDocs(collection(tallyDb, 'accounts')),
        getDocs(collection(tallyDb, 'fiscalYears')).catch(() => null)
      ]);

      const filteredVehicles = vehiclesSnap.docs.map(d => ({ ...d.data(), id: d.id, chassisNumber: d.id })) as Vehicle[];
      const companies = companiesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Company[];
      const models = modelsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Model[];
      const parties = partiesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Party[];
      const purchases = purchasesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Purchase[];
      const sales = salesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Sale[];

      // Parse Tally accounts
      const tallyAccounts: any[] = [];
      tallyAccountsSnap.forEach(d => tallyAccounts.push({ id: d.id, ...d.data() }));

      // Determine active fiscal year in Tally
      let currentFyId = '';
      if (tallyFySnap && !tallyFySnap.empty) {
        const fys: any[] = [];
        tallyFySnap.forEach(d => fys.push({ id: d.id, ...d.data() }));
        fys.sort((a, b) => {
          const dateA = new Date(a.startDate || 0).getTime();
          const dateB = new Date(b.startDate || 0).getTime();
          return dateB - dateA;
        });
        const today = new Date().toISOString().split('T')[0];
        const currentFy = fys.find(fy => fy.startDate <= today && fy.endDate >= today) || fys[0];
        currentFyId = currentFy?.id || '';
      }

      // Helper to format currency accurately (Indian format)
      const formatAmt = (val: any) => {
        if (val === undefined || val === null || val === '') return '0.00';
        const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
        if (isNaN(num)) return '0.00';
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      // Comprehensive function to match customer by name / contact / tallyAccountId
      const findTallyAccountForCustomer = (customer: Party | null | undefined): any | null => {
        if (!customer) return null;

        // 1. Direct link if customer.tallyAccountId is set
        if (customer.tallyAccountId) {
          const directMatch = tallyAccounts.find(a => a.id === customer.tallyAccountId);
          if (directMatch) return directMatch;
        }

        const rawName = (customer.name || '').trim();
        if (!rawName) return null;

        const cleanName = rawName.toLowerCase().replace(/\s+/g, ' ');
        const phone = (customer.contactNumber || '').replace(/\D/g, '');
        const altPhone = (customer.alternateNumber || '').replace(/\D/g, '');

        // 2. Exact name match (case-insensitive)
        const exactMatch = tallyAccounts.find(a => (a.name || '').trim().toLowerCase() === cleanName);
        if (exactMatch) return exactMatch;

        // 3. Tally account name starts with customer name (e.g. "NAME - 9800000000" or "NAME-LOCATION")
        const startsWithMatch = tallyAccounts.find(a => {
          const aName = (a.name || '').trim().toLowerCase();
          return aName.startsWith(cleanName);
        });
        if (startsWithMatch) return startsWithMatch;

        // 4. Match by phone number if phone has at least 7 digits (Tally names often contain phone numbers)
        if (phone.length >= 7) {
          const phoneMatch = tallyAccounts.find(a => {
            const aName = (a.name || '').replace(/\s+/g, '');
            const aPhone = (a.contact || a.phone || '').replace(/\D/g, '');
            return aName.includes(phone) || (aPhone && aPhone.includes(phone));
          });
          if (phoneMatch) return phoneMatch;
        }

        if (altPhone.length >= 7) {
          const altPhoneMatch = tallyAccounts.find(a => {
            const aName = (a.name || '').replace(/\s+/g, '');
            const aPhone = (a.contact || a.phone || '').replace(/\D/g, '');
            return aName.includes(altPhone) || (aPhone && aPhone.includes(altPhone));
          });
          if (altPhoneMatch) return altPhoneMatch;
        }

        // 5. Stripped match (alphanumeric only)
        const strippedCust = cleanName.replace(/[^a-z0-9]/g, '');
        if (strippedCust.length > 3) {
          const strippedMatch = tallyAccounts.find(a => {
            const aStripped = (a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return aStripped.startsWith(strippedCust) || strippedCust.startsWith(aStripped);
          });
          if (strippedMatch) return strippedMatch;
        }

        // 6. Word token match: all words of customer name are in account name
        const words = cleanName.split(' ').filter(w => w.length > 2);
        if (words.length >= 2) {
          const tokenMatch = tallyAccounts.find(a => {
            const aName = (a.name || '').toLowerCase();
            return words.every(w => aName.includes(w));
          });
          if (tokenMatch) return tokenMatch;
        }

        return null;
      };

      // Cache for fetched account balances
      const balanceCache = new Map<string, string>();
      const getExactClosingBalance = async (acc: any): Promise<string> => {
        if (!acc) return '0.00';
        if (balanceCache.has(acc.id)) return balanceCache.get(acc.id)!;

        let rawBal = acc.closingBalance;
        let rawType = acc.closingBalanceType || '';

        // Check active fiscal year subcollection for latest FY balance
        if (currentFyId) {
          try {
            const fyDoc = await getDoc(doc(tallyDb, `accounts/${acc.id}/fiscalYears`, currentFyId));
            if (fyDoc.exists()) {
              const fyData = fyDoc.data();
              if (fyData.closingBalance !== undefined && fyData.closingBalance !== null) {
                rawBal = fyData.closingBalance;
                rawType = fyData.closingBalanceType || rawType;
              }
            }
          } catch (e) {
            // Fallback to account doc balance
          }
        }

        if (rawBal === undefined || rawBal === null || rawBal === '' || rawBal === 0 || rawBal === '0') {
          const res = rawType ? `0.00 ${rawType}`.trim() : '0.00';
          balanceCache.set(acc.id, res);
          return res;
        }

        const formatted = `${formatAmt(rawBal)} ${rawType}`.trim();
        balanceCache.set(acc.id, formatted);
        return formatted;
      };

      // IGNORE IN-STOCK VEHICLES: Only include sold vehicles that have an active sale and customer
      const soldVehicles = filteredVehicles.filter((v) => {
        // If strictly marked as in-stock or available, ignore it
        if (v.status === 'in-stock' || (v.status as any) === 'available') return false;

        const sale = sales.find((s) => (v.saleId && s.id === v.saleId) || s.chassisNumber === v.chassisNumber || s.chassisNumber === v.id);
        // Must have an active sale and valid customer
        if (!sale || sale.status === 'returned' || !sale.customerId) return false;

        return true;
      });

      if (soldVehicles.length === 0) {
        toast.error(`No sold vehicles found for ${title}. (In-stock units were ignored)`);
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
        { header: 'Contact Number', key: 'Contact Number', width: 15 },
        { header: 'Closing Balance', key: 'Closing Balance', width: 18 }
      ];

      let matchedBalanceCount = 0;
      const rows = await Promise.all(
        soldVehicles.map(async (v) => {
          const purchase = purchases.find((p) => p.id === v.purchaseId);
          const vendor = purchase ? parties.find((p) => p.id === purchase.vendorId) : null;
          const sale = sales.find((s) => (v.saleId && s.id === v.saleId) || s.chassisNumber === v.chassisNumber || s.chassisNumber === v.id);
          const customer = sale ? parties.find((p) => p.id === sale.customerId) : null;

          let closingBal = '0.00';
          if (customer) {
            const matchedAcc = findTallyAccountForCustomer(customer);
            if (matchedAcc) {
              closingBal = await getExactClosingBalance(matchedAcc);
              matchedBalanceCount++;
            }
          }

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
            'Status': sale ? 'sold' : v.status,
            'File No.': sale?.fileNumber || '',
            'Customer Name': customer?.name || '',
            'Address': customer?.address || '',
            'Contact Number': customer?.contactNumber || '',
            'Closing Balance': closingBal
          };
        })
      );

      // Sort by Vendor (A-Z) and then by Status (A-Z)
      rows.sort((a: any, b: any) => {
        const vendorCompare = (a.Vendor || '').localeCompare(b.Vendor || '');
        if (vendorCompare !== 0) return vendorCompare;
        return (a.Status || '').localeCompare(b.Status || '');
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `${title.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${title} exported successfully! (${rows.length} sold vehicles, in-stock ignored)`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportInStock = async () => {
    setIsExporting(true);
    toast.info('Fetching In-Stock Units data...');
    try {
      const [vehiclesSnap, companiesSnap, modelsSnap, salesSnap] = await Promise.all([
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'models')),
        getDocs(collection(db, 'sales'))
      ]);

      const vehicles = vehiclesSnap.docs.map(d => ({ ...d.data(), id: d.id, chassisNumber: d.id })) as Vehicle[];
      const companies = companiesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Company[];
      const models = modelsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Model[];
      const sales = salesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Sale[];

      // Filter for in-stock vehicles (no active sale and not marked as sold)
      const inStockVehicles = vehicles.filter(v => {
        if (v.status === 'sold') return false;
        const activeSale = sales.find(s => (s.chassisNumber === v.chassisNumber || (v.saleId && s.id === v.saleId)) && s.status !== 'returned');
        if (activeSale) return false;
        return true;
      });

      if (inStockVehicles.length === 0) {
        toast.error('No In-Stock units found to export.');
        setIsExporting(false);
        return;
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('In-Stock Units');

      // Export only: Chassis Number, Company, Model, Color
      ws.columns = [
        { header: 'Chassis Number', key: 'Chassis Number', width: 25 },
        { header: 'Company', key: 'Company', width: 20 },
        { header: 'Model', key: 'Model', width: 25 },
        { header: 'Color', key: 'Color', width: 15 }
      ];

      const rows = inStockVehicles.map(v => ({
        'Chassis Number': v.chassisNumber || v.id,
        'Company': companies.find(c => c.id === v.companyId)?.name || '',
        'Model': models.find(m => m.id === v.modelId)?.name || '',
        'Color': v.color || ''
      }));

      // Sort by Company (A-Z) and Model (A-Z)
      rows.sort((a, b) => {
        const comp = (a.Company || '').localeCompare(b.Company || '');
        if (comp !== 0) return comp;
        return (a.Model || '').localeCompare(b.Model || '');
      });

      ws.addRows(rows);

      // Add Auto-Filter to all columns
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: ws.columns.length }
      };

      // Header formatting
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `In_Stock_Units_${timestamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`In-Stock Units exported successfully! (${rows.length} units)`);
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
        <StatCard 
          title="In-Stock Units" 
          value={stats.inStock} 
          icon={Package} 
          color="text-indigo-500" 
          bg="bg-indigo-50 dark:bg-indigo-500/10" 
          onExport={handleExportInStock}
          isExporting={isExporting}
        />
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
