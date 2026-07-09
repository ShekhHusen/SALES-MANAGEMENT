import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Database } from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, getDoc, doc } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { Company, Model, Party, Vehicle, Purchase, Sale } from '@/types';

export function ExportData() {
  const [isExporting, setIsExporting] = useState(false);

  const exportAllData = async () => {
    setIsExporting(true);
    toast.info('Gathering all data for export...');
    try {
      const companiesSnap = await getDocs(collection(db, 'companies'));
      const companies = companiesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Company));
      
      const modelsSnap = await getDocs(collection(db, 'models'));
      const models = modelsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Model));

      const partiesSnap = await getDocs(collection(db, 'parties'));
      const parties = partiesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Party));

      const vehiclesSnap = await getDocs(collection(db, 'vehicles'));
      const vehicles = vehiclesSnap.docs.map(d => ({ ...d.data(), chassisNumber: d.id } as Vehicle));

      const purchasesSnap = await getDocs(collection(db, 'purchases'));
      const purchases = purchasesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Purchase));

      const salesSnap = await getDocs(collection(db, 'sales'));
      const sales = salesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Sale));
      
      
      const accountMetadata = metadataSnap.docs.map(d => ({ ...d.data(), id: d.id } as any));

      const mappingsDoc = await getDoc(doc(db, 'internal_data', 'mappings'));
      const mappings = mappingsDoc.exists() ? mappingsDoc.data()?.mappings || {} : {};

      const wb = XLSX.utils.book_new();

      // 0. All Data
      const allDataRows: any[] = vehicles.map(v => {
        const purchase = purchases.find(p => p.id === v.purchaseId);
        const vendor = purchase ? parties.find(p => p.id === purchase.vendorId) : null;
        const sale = sales.find(s => s.id === v.saleId);
        const customer = sale ? parties.find(p => p.id === sale.customerId) : null;

        return {
          'Vendor': vendor?.name || '',
          'Invoice No.': purchase?.invoiceNumber || '',
          'Chassis Number': v.chassisNumber,
          'Company': companies.find(c => c.id === v.companyId)?.name || '',
          'Model': models.find(m => m.id === v.modelId)?.name || '',
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
      if(allDataRows.length===0) allDataRows.push({'Message': 'No Data'});
      const wsAllData = XLSX.utils.json_to_sheet(allDataRows);
      XLSX.utils.book_append_sheet(wb, wsAllData, 'All Data');

      // 0.5. All Accounts
      const accMap = new Map<string, { opening: number, debit: number, credit: number, lastActivity: Date | null, verifyBy: string, mappedAccount: string }>();

      const allAccountNames = new Set<string>();
      openings.forEach(o => o.accountName && allAccountNames.add((o.accountName || '').trim()));
      transactions.forEach(t => t.particulars && allAccountNames.add((t.particulars || '').trim()));

      allAccountNames.forEach(name => {
          let mappedAccount = '';
          const partyId = mappings[name];
          if (partyId) {
              const party = parties.find(p => p.id === partyId);
              if (party) mappedAccount = party.name;
          } else {
              const party = parties.find(p => (p.name || '').toLowerCase() === (name || '').toLowerCase());
              if (party) mappedAccount = party.name;
          }
          accMap.set(name, { opening: 0, debit: 0, credit: 0, lastActivity: null, verifyBy: '', mappedAccount });
      });

      // Add Unlinked Parties to the map with 0 balances
      parties.forEach(p => {
          const isPartyMapped = Object.values(mappings).includes(p.id);
          const hasExactName = Array.from(accMap.keys()).some(k => k.toLowerCase() === (p.name || '').toLowerCase());
          if (!isPartyMapped && !hasExactName) {
              if (p.name) {
                  accMap.set(p.name, { opening: 0, debit: 0, credit: 0, lastActivity: null, verifyBy: '', mappedAccount: p.name });
              }
          }
      });

      openings.forEach(o => {
          if (o.accountName && accMap.has(o.accountName)) {
              const acc = accMap.get(o.accountName)!;
              acc.opening += (o.debit || 0) - (o.credit || 0);
          }
      });

      transactions.forEach(t => {
          if (t.particulars && accMap.has(t.particulars)) {
              const acc = accMap.get(t.particulars)!;
              acc.debit += (t.debit || 0);
              acc.credit += (t.credit || 0);
              
              let tDate: Date | null = null;
              if (t.date) {
                  if ((t.date as any).toDate) {
                      tDate = (t.date as any).toDate();
                  } else if (typeof t.date === 'string') {
                      tDate = new Date(t.date);
                  }
              }
              
              if (tDate) {
                  if (!acc.lastActivity || tDate > acc.lastActivity) {
                      acc.lastActivity = tDate;
                  }
              }
          }
      });

      // assign verify by
      accountMetadata.forEach(meta => {
          if (meta.accountName && accMap.has(meta.accountName)) {
              const acc = accMap.get(meta.accountName)!;
              acc.verifyBy = meta.verifiedBy || '';
          }
      });

      const allAccountsRows = Array.from(accMap.entries()).map(([name, data]) => ({
          'Account Name': name,
          'Mapped Account': data.mappedAccount,
          'Opening Balance': data.opening,
          'Total Debit': data.debit,
          'Total Credit': data.credit,
          'Closing Balance': data.opening + data.debit - data.credit,
          'Verified By': data.verifyBy,
          'Last Activity': data.lastActivity ? data.lastActivity.toLocaleDateString() : ''
      }));

      if(allAccountsRows.length===0) (allAccountsRows as any[]).push({'Message': 'No Data'});
      const wsAllAccounts = XLSX.utils.json_to_sheet(allAccountsRows);
      XLSX.utils.book_append_sheet(wb, wsAllAccounts, 'All Accounts');

      // 1. Inventory
      const inventoryData: any[] = vehicles.map(v => ({
        'Chassis Number': v.chassisNumber,
        'Company': companies.find(c => c.id === v.companyId)?.name || 'Unknown',
        'Model': models.find(m => m.id === v.modelId)?.name || 'Unknown',
        'Color': v.color,
        'Registration Number': v.registrationNumber,
        'Bluebook Status': v.bluebookStatus,
        'Naamsari Status': v.naamsariStatus,
        'Status': v.status,
        'Purchase ID': v.purchaseId || '',
        'Sale ID': v.saleId || '',
        'Current Owner': parties.find(p => p.id === v.currentOwnerId)?.name || ''
      }));
      if(inventoryData.length===0) inventoryData.push({'Message': 'No Data'});
      const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
      XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory');

      // 2. Parties
      const partiesData: any[] = parties.map(p => ({
        'Name': p.name,
        'Type': p.type,
        'Address': p.address,
        'Contact Number': p.contactNumber
      }));
      if(partiesData.length===0) partiesData.push({'Message': 'No Data'});
      const wsParties = XLSX.utils.json_to_sheet(partiesData);
      XLSX.utils.book_append_sheet(wb, wsParties, 'Parties');

      // 3. Purchases
      const purchasesData: any[] = purchases.map(p => ({
        'Invoice Number': p.invoiceNumber,
        'Date': p.date?.toDate ? p.date.toDate().toLocaleDateString() : '',
        'Vendor Name': parties.find(party => party.id === p.vendorId)?.name || 'Unknown',
        'Chassis Numbers': p.chassisNumbers.join(', ')
      }));
      if(purchasesData.length===0) purchasesData.push({'Message': 'No Data'});
      const wsPurchases = XLSX.utils.json_to_sheet(purchasesData);
      XLSX.utils.book_append_sheet(wb, wsPurchases, 'Purchases');

      // 4. Sales
      const salesData: any[] = sales.map(s => ({
        'File Number': s.fileNumber,
        'Date': s.date?.toDate ? s.date.toDate().toLocaleDateString() : '',
        'Customer Name': parties.find(party => party.id === s.customerId)?.name || 'Unknown',
        'Chassis Number': s.chassisNumber,
        'Company': companies.find(c => c.id === s.companyId)?.name || 'Unknown'
      }));
      if(salesData.length===0) salesData.push({'Message': 'No Data'});
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

      XLSX.writeFile(wb, 'Complete_Data_Export.xlsx');
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export error', error);
      toast.error('Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden mt-8">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
           <Database className="w-5 h-5 text-slate-500" />
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Data Export Center</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium">Export all data from the system into an Excel workbook.</p>
      </div>
      <CardContent className="p-6">
        <Button onClick={exportAllData} disabled={isExporting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-8 rounded-lg">
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Gathering Data...' : 'Export Complete System Data'}
        </Button>
      </CardContent>
    </Card>
  );
}
