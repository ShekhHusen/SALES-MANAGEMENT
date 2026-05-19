import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, AlertCircle, FileSpreadsheet, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { collection, doc, writeBatch, getDocs, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Company, Model, Party } from '@/types';

type ImportType = 'parties' | 'inventory' | 'purchases' | 'sales';

export function ImportData() {
  const [importType, setImportType] = useState<ImportType>('parties');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    let wsData: any[] = [];
    let fileName = '';

    switch (importType) {
      case 'parties':
        wsData = [
          ['Name', 'Address', 'Contact Number', 'Type (vendor/customer)'],
          ['John Doe', '123 Kathmandu', '9800000000', 'vendor'],
          ['Jane Smith', '456 Pokhara', '9811111111', 'customer'],
        ];
        fileName = 'Parties_Template.xlsx';
        break;
      case 'inventory':
        wsData = [
          ['Chassis Number', 'Company', 'Model', 'Color', 'Registration Number', 'Bluebook Status (Not Received/Received)', 'Naamsari Status (Pending/Names of JBMT/Customer Done)', 'Status (ready-to-purchase/in-stock/sold)'],
          ['CH123456', 'Honda', 'Shine', 'Red', 'Ba 1 Pa 1234', 'Received', 'Names of JBMT', 'in-stock'],
        ];
        fileName = 'Inventory_Template.xlsx';
        break;
      case 'purchases':
        wsData = [
          ['Invoice Number', 'Date (YYYY-MM-DD)', 'Vendor Name', 'Chassis Numbers (comma separated)'],
          ['INV-001', '2023-10-01', 'John Doe', 'CH123456, CH123457'],
        ];
        fileName = 'Purchases_Template.xlsx';
        break;
      case 'sales':
        wsData = [
          ['File Number', 'Date (YYYY-MM-DD)', 'Customer Name', 'Chassis Number', 'Company'],
          ['101', '2023-10-15', 'Jane Smith', 'CH123456', 'Honda'],
        ];
        fileName = 'Sales_Template.xlsx';
        break;
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, fileName);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsUploading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data && data.length > 0) {
          setPreviewData(data);
        } else {
          toast.error('The uploaded file is empty.');
        }
      } catch (error) {
        console.error('Error importing file:', error);
        toast.error('Failed to parse Excel file. Please ensure it follows the template format.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const processImport = async () => {
    if (!previewData || previewData.length === 0) {
      toast.error('No data to import.');
      return;
    }

    setIsProcessing(true);
    try {
      // Fetch some mappings to avoid duplicates
      const companiesSnap = await getDocs(collection(db, 'companies'));
      const existingCompanies = new Map(companiesSnap.docs.map(d => [d.data().name.toLowerCase(), d.id]));
      
      const modelsSnap = await getDocs(collection(db, 'models'));
      const existingModels = new Map(modelsSnap.docs.map(d => [d.data().name.toLowerCase(), d.id]));

      const partiesSnap = await getDocs(collection(db, 'parties'));
      const existingParties = new Map(partiesSnap.docs.map(d => [d.data().name.toLowerCase(), d.id]));

      let count = 0;
      const data = previewData;

      let currentBatch = writeBatch(db);
      let opCount = 0;

      const commitBatchIfNeeded = async (opsToAdd: number) => {
        if (opCount + opsToAdd > 450) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      };

      if (importType === 'parties') {
        for (const row of data) {
          const type = row['Type (vendor/customer)']?.toLowerCase() === 'customer' ? 'customer' : 'vendor';
          const name = row['Name']?.toString().trim();
          if (!name) continue;
          
          let id = existingParties.get(name.toLowerCase());
          if (!id) {
            const docRef = doc(collection(db, 'parties'));
            id = docRef.id;
            existingParties.set(name.toLowerCase(), id);
          }
          
          await commitBatchIfNeeded(1);
          currentBatch.set(doc(db, 'parties', id), {
            name,
            address: row['Address']?.toString() || '',
            contactNumber: row['Contact Number']?.toString() || '',
            type,
            createdAt: Timestamp.now()
          }, { merge: true });
          opCount++;
          count++;
        }
      } 
      else if (importType === 'inventory') {
        for (const row of data) {
          const chassis = row['Chassis Number']?.toString().trim();
          if (!chassis) continue;
          
          let compId = '';
          const compName = row['Company']?.toString().trim();
          let newOps = 1;
          if (compName) {
            compId = existingCompanies.get(compName.toLowerCase()) || '';
            if (!compId) {
              const cRef = doc(collection(db, 'companies'));
              compId = cRef.id;
              existingCompanies.set(compName.toLowerCase(), compId);
              newOps++;
            }
          }

          let modelId = '';
          const modelName = row['Model']?.toString().trim();
          if (modelName && compId) {
            modelId = existingModels.get(modelName.toLowerCase()) || '';
            if (!modelId) {
              const mRef = doc(collection(db, 'models'));
              modelId = mRef.id;
              existingModels.set(modelName.toLowerCase(), modelId);
              newOps++;
            }
          }

          await commitBatchIfNeeded(newOps);

          if (compName && !existingCompanies.has(compName.toLowerCase() + '_created')) {
              if (compId && !existingCompanies.has(compId)) {
                currentBatch.set(doc(db, 'companies', compId), { name: compName });
                existingCompanies.set(compId, compId); // just to mark as added
                opCount++;
              }
          }

          if (modelName && compId && !existingModels.has(modelId)) {
             currentBatch.set(doc(db, 'models', modelId), { name: modelName, companyId: compId });
             existingModels.set(modelId, modelId);
             opCount++;
          }

          currentBatch.set(doc(db, 'vehicles', chassis), {
            chassisNumber: chassis,
            companyId: compId,
            modelId,
            color: row['Color']?.toString() || '',
            registrationNumber: row['Registration Number']?.toString() || '',
            bluebookStatus: row['Bluebook Status (Not Received/Received)'] === 'Received' ? 'Received' : 'Not Received',
            naamsariStatus: row['Naamsari Status (Pending/Names of JBMT/Customer Done)'] || 'Pending',
            status: row['Status (ready-to-purchase/in-stock/sold)'] || 'in-stock',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          }, { merge: true });
          opCount++;
          count++;
        }
      }
      else if (importType === 'purchases') {
        for (const row of data) {
          const inv = row['Invoice Number']?.toString().trim();
          if (!inv) continue;

          let vendorId = '';
          const vendorName = row['Vendor Name']?.toString().trim();
          let newOps = 1;
          if (vendorName) {
            vendorId = existingParties.get(vendorName.toLowerCase()) || '';
            if (!vendorId) {
               const pRef = doc(collection(db, 'parties'));
               vendorId = pRef.id;
               existingParties.set(vendorName.toLowerCase(), vendorId);
               newOps++;
            }
          }

          const chassisStr = row['Chassis Numbers (comma separated)']?.toString() || '';
          const chassisArr = chassisStr.split(',').map((c: string) => c.trim()).filter(Boolean);
          newOps += chassisArr.length;

          await commitBatchIfNeeded(newOps);

          if (vendorName && !existingParties.has(vendorId)) {
             currentBatch.set(doc(db, 'parties', vendorId), { name: vendorName, type: 'vendor', address: '', contactNumber: '', createdAt: Timestamp.now() });
             existingParties.set(vendorId, vendorId);
             opCount++;
          }

          const dateStr = row['Date (YYYY-MM-DD)'];
          let date = Timestamp.now();
          if (dateStr) {
             if (dateStr instanceof Date) {
               date = Timestamp.fromDate(dateStr);
             } else {
               const parsed = new Date(dateStr);
               if (!isNaN(parsed.getTime())) {
                 date = Timestamp.fromDate(parsed);
               }
             }
          }

          const ref = doc(collection(db, 'purchases'));
          currentBatch.set(ref, {
             invoiceNumber: inv,
             date,
             vendorId,
             chassisNumbers: chassisArr,
             createdAt: Timestamp.now()
          });
          opCount++;

          for (const chassis of chassisArr) {
             currentBatch.set(doc(db, 'vehicles', chassis), {
                 chassisNumber: chassis,
                 status: 'in-stock',
                 updatedAt: Timestamp.now()
             }, { merge: true });
             opCount++;
          }

          count++;
        }
      }
      else if (importType === 'sales') {
        for (const row of data) {
           const chassis = row['Chassis Number']?.toString().trim();
           if (!chassis) continue;

           let custId = '';
           const custName = row['Customer Name']?.toString().trim();
           let newOps = 2; // sale + vehicle
           if (custName) {
              custId = existingParties.get(custName.toLowerCase()) || '';
              if (!custId) {
                 const pRef = doc(collection(db, 'parties'));
                 custId = pRef.id;
                 existingParties.set(custName.toLowerCase(), custId);
                 newOps++;
              }
           }

           let compId = '';
           const compName = row['Company']?.toString().trim();
           if (compName) {
             compId = existingCompanies.get(compName.toLowerCase()) || '';
             if (!compId) {
               const cRef = doc(collection(db, 'companies'));
               compId = cRef.id;
               existingCompanies.set(compName.toLowerCase(), compId);
               newOps++;
             }
           }

           await commitBatchIfNeeded(newOps);

           if (custName && !existingParties.has(custId)) {
              currentBatch.set(doc(db, 'parties', custId), { name: custName, type: 'customer', address: '', contactNumber: '', createdAt: Timestamp.now() });
              existingParties.set(custId, custId);
              opCount++;
           }

           if (compName && !existingCompanies.has(compId)) {
              currentBatch.set(doc(db, 'companies', compId), { name: compName });
              existingCompanies.set(compId, compId);
              opCount++;
           }

           const dateStr = row['Date (YYYY-MM-DD)'];
           let date = Timestamp.now();
           if (dateStr) {
              if (dateStr instanceof Date) {
                date = Timestamp.fromDate(dateStr);
              } else {
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                  date = Timestamp.fromDate(parsed);
                }
              }
           }

           const fileNumber = parseInt(row['File Number']?.toString() || '0');

           const ref = doc(collection(db, 'sales'));
           currentBatch.set(ref, {
             fileNumber,
             date,
             customerId: custId,
             companyId: compId,
             chassisNumber: chassis,
             createdAt: Timestamp.now()
           });
           opCount++;

           currentBatch.set(doc(db, 'vehicles', chassis), {
             chassisNumber: chassis,
             status: 'sold',
             saleId: ref.id,
             updatedAt: Timestamp.now()
           }, { merge: true });
           opCount++;

           count++;
        }
      }

      if (opCount > 0) {
         await currentBatch.commit();
      }
      toast.success(`Successfully imported ${count} records!`);
      setPreviewData(null);
      setFileName('');

    } catch (error) {
       console.error("Import Error", error);
       toast.error("Failed to commit imported data.");
    } finally {
       setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden mt-8">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
           <FileSpreadsheet className="w-5 h-5 text-slate-500" />
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Data Import Center</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium">Batch import your records easily via Excel files.</p>
      </div>
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Module to Import</label>
            <Select value={importType} onValueChange={(val: any) => { setImportType(val as ImportType); setPreviewData(null); }} disabled={!!previewData}>
              <SelectTrigger className="w-full md:w-[300px] h-11 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parties">Parties (Vendors & Customers)</SelectItem>
                <SelectItem value="inventory">Inventory (Vehicles)</SelectItem>
                <SelectItem value="purchases">Procurement (Purchases)</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
              </SelectContent>
            </Select>
        </div>

        {!previewData && (
          <div className="flex flex-col md:flex-row gap-4">
             <div className="flex-1 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <h4 className="text-sm font-bold text-blue-900">Step 1: Download Template</h4>
                   <p className="text-xs text-blue-700 mt-1 font-medium">Download the standard Excel template for the selected module, and populate your data exactly as per the format.</p>
                   <Button onClick={downloadTemplate} variant="outline" className="mt-3 bg-white hover:bg-blue-50 text-blue-700 border-blue-200 font-bold">
                      <Download className="w-4 h-4 mr-2" /> Download {importType.charAt(0).toUpperCase() + importType.slice(1)} Template
                   </Button>
                </div>
             </div>

             <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                <Upload className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                   <h4 className="text-sm font-bold text-emerald-900">Step 2: Upload Populated File</h4>
                   <p className="text-xs text-emerald-700 mt-1 font-medium">Once your data is ready, simply upload the filled Excel file here to automatically batch-insert records.</p>
                   
                   <div className="mt-3">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? 'Parsing...' : 'Select & Upload File'}
                      </Button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {previewData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Preview Data ({fileName})</h4>
                  <p className="text-xs text-amber-700 mt-1 font-medium">Please review your data below before committing. A total of <span className="font-extrabold">{previewData.length}</span> records will be imported.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button onClick={() => setPreviewData(null)} variant="outline" className="h-9 hover:bg-slate-100 font-bold border-slate-300">
                   <X className="w-4 h-4 mr-2" /> Cancel
                 </Button>
                 <Button onClick={processImport} disabled={isProcessing} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                   <Upload className="w-4 h-4 mr-2" /> {isProcessing ? 'Pushing Data...' : 'Confirm & Push Data'}
                 </Button>
              </div>
            </div>

            <div className="border rounded-xl bg-white overflow-hidden max-h-[400px] overflow-y-auto w-full max-w-[calc(100vw-300px)]">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                     <tr>
                        {Object.keys(previewData[0] || {}).map((key) => (
                           <th key={key} className="px-4 py-3 font-semibold text-slate-700 border-b">{key}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {previewData.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                           {Object.values(row).map((val: any, vidx) => (
                              <td key={vidx} className="px-4 py-2.5 text-slate-600">{val?.toString() || '-'}</td>
                           ))}
                        </tr>
                     ))}
                  </tbody>
               </table>
               {previewData.length > 50 && (
                  <div className="p-3 text-center text-xs font-medium text-slate-500 bg-slate-50 border-t">
                     Showing first 50 rows only. The remaining {previewData.length - 50} rows will also be imported.
                  </div>
               )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
