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
