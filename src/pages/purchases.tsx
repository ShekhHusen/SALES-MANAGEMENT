import { useState, useEffect, Fragment } from 'react';
import { collection, addDoc, getDocs, onSnapshot, query, where, Timestamp, writeBatch, doc, orderBy, deleteDoc, getDoc } from '@/lib/trackedFirestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Company, Model, Party, Vehicle, Purchase } from '@/types';
import { logAction } from '@/lib/audit';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Search, CarFront, Check, Download, ArrowUp, ArrowDown, FilterIcon, FilterX, Database, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

import { QuickAddParty, QuickAddVehicle } from '@/components/QuickAdd';
import { Pagination } from '@/components/Pagination';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { cn } from '@/lib/utils';

export function Purchases() {


  
  
  
  
  
  

  const { user, userProfile } = useAuth();
  const { companies, models, parties, vehicles: allVehicles, purchases, refreshPurchases } = useGlobalData();
  const vendors = parties.filter(p => p.type === 'vendor');
  const isAdmin = userProfile?.role === 'admin';
  const isClerk = userProfile?.role === 'inventory_clerk';
  const canDelete = isAdmin;
  const canEdit = isAdmin || isClerk;
  const canCreate = isAdmin || isClerk;

  const [sortField, setSortField] = useState<'date' | 'invoiceNumber' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [chassisFilter, setChassisFilter] = useState('');
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInvoiceExpanded, setIsInvoiceExpanded] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // On-demand load states
  const [setLoadFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(5);
  
  const hasActiveFilters = vendorFilter !== 'ALL' || chassisFilter !== '';

  const clearFilters = () => {
    setVendorFilter('ALL');
    setChassisFilter('');
  };

  const handleSort = (field: 'date' | 'invoiceNumber') => {
    if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDirection('asc');
    }
  };

  const processedPurchases = [...purchases]
    .filter(purchase => {
      // Find the vehicles for this purchase
      const purchaseVehicles = allVehicles.filter(v => (purchase.chassisNumbers || []).includes(v.chassisNumber));
      
      const matchesVendor = vendorFilter === 'ALL' || purchase.vendorId === vendorFilter;
      const matchesChassis = !chassisFilter || purchaseVehicles.some(v => (v.chassisNumber?.toLowerCase() || "").includes(chassisFilter.toLowerCase()));
      
      if (!matchesVendor) return false;
      if (!matchesChassis) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      let valA, valB;
      if (sortField === 'date') {
        const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
        const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
        valA = dateA; valB = dateB;
      } else if (sortField === 'invoiceNumber') {
        valA = a.invoiceNumber; valB = b.invoiceNumber;
      }
      
      if (valA! < valB!) return sortDirection === 'asc' ? -1 : 1;
      if (valA! > valB!) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totalItems = processedPurchases.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const paginatedPurchases = itemsPerPage === 'all' ? processedPurchases : processedPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on filter
  useEffect(() => {
    setCurrentPage(1);
  }, [vendorFilter, chassisFilter]);

  // Delete Confirmation State
  const [purchaseToDelete, setPurchaseToDelete] = useState<(Purchase & { id: string }) | null>(null);
  
  // Edit Purchase State
  const [editingPurchase, setEditingPurchase] = useState<(Purchase & { id: string }) | null>(null);
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  
  const [currentChassisEntries, setCurrentChassisEntries] = useState<Partial<Vehicle>[]>([]);
  
  // Selection Dialog State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [targetRowIndex, setTargetRowIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const addChassisRow = () => {
    setCurrentChassisEntries([...currentChassisEntries, { 
      chassisNumber: '', 
      companyId: '', 
      modelId: '', 
      color: 'White',
      bluebookStatus: 'Not Received',
      naamsariStatus: 'Pending',
      status: 'in-stock'
    }]);
  };

  const updateRow = (index: number, field: keyof Vehicle, value: any) => {
    const updated = [...currentChassisEntries];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentChassisEntries(updated);
  };

  const openNewPurchase = () => {
    cancelEdit();
    setIsFormOpen(true);
  };

  const openEditPurchase = (purchase: Purchase & { id: string }) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingPurchase(purchase);
    setIsFormOpen(true);
    
    setPurchaseDate(purchase.date instanceof Timestamp ? purchase.date.toDate().toISOString().split('T')[0] : String(purchase.date));
    setInvoiceNumber(purchase.invoiceNumber || '');
    setSelectedVendor(purchase.vendorId || '');

    const entries = (purchase.chassisNumbers || []).map(chassis => {
       const v = allVehicles.find(veh => veh.chassisNumber === chassis);
       if (v) {
         return v;
       }
       return { chassisNumber: chassis, status: 'in-stock' } as Partial<Vehicle>;
    });
    
    setCurrentChassisEntries(entries);
  };

  const cancelEdit = () => {
    setEditingPurchase(null);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setSelectedVendor('');
    setCurrentChassisEntries([]);
    setIsFormOpen(false);
  };





  const confirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;

    // Check if any vehicles in this purchase are sold
    const vehiclesInPurchase = allVehicles.filter(v => 
      v.purchaseId === purchaseToDelete.id || 
      (purchaseToDelete.chassisNumbers && purchaseToDelete.chassisNumbers.includes(v.chassisNumber))
    );
    
    const soldVehicles = vehiclesInPurchase.filter(v => v.status === 'sold' || v.saleId);
    
    if (soldVehicles.length > 0) {
      toast.error(`Restricted: Invoice "${purchaseToDelete.invoiceNumber}" contains ${soldVehicles.length} sold unit(s). Purging is blocked to maintain sales integrity.`);
      setPurchaseToDelete(null);
      return;
    }

    try {
      let batch = writeBatch(db);
      let ops = 0;
      
      // Revert inventory records back to ready-to-purchase
      for (const v of vehiclesInPurchase) {
        batch.update(doc(db, 'vehicles', v.chassisNumber), {
          purchaseId: null,
          currentOwnerId: null,
          status: 'ready-to-purchase',
          updatedAt: Timestamp.now()
        });
        ops++;
        if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
        }
      }
      
      // Delete purchase record
      batch.delete(doc(db, 'purchases', purchaseToDelete.id));
      ops++;
      
      if (ops > 0) {
          await batch.commit();
      }
      
      if (user) {
        logAction(user.uid, user.email || '', 'DELETE', 'Purchase', purchaseToDelete.id, purchaseToDelete);
      }

      await refreshPurchases();
      toast.success('Purchase manifest and linked inventory records purged.');
      setPurchaseToDelete(null);
    } catch (error) {
      console.error("Delete Purchase Error:", error);
      toast.error('Failed to purge records. Database connectivity issue.');
      handleFirestoreError(error, OperationType.DELETE, 'purchases');
    }
  };

  const selectVehicleForRow = (vehicle: Vehicle) => {
    if (targetRowIndex === null) return;
    
    const updated = [...currentChassisEntries];
    updated[targetRowIndex] = {
      ...updated[targetRowIndex],
      chassisNumber: vehicle.chassisNumber,
      companyId: vehicle.companyId,
      modelId: vehicle.modelId,
      color: vehicle.color || 'White',
    };
    setCurrentChassisEntries(updated);
    setIsSelectorOpen(false);
    setTargetRowIndex(null);
    setSearchQuery('');
    toast.info(`Imported details for ${vehicle.chassisNumber}`);
  };

  const removeRow = (index: number) => {
    setCurrentChassisEntries(currentChassisEntries.filter((_, i) => i !== index));
  };

  const handleSavePurchase = async () => {
    if (!selectedVendor || !invoiceNumber || currentChassisEntries.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    // Sanitize entries
    const sanitizedEntries = currentChassisEntries.map(e => ({
      ...e,
      chassisNumber: (e.chassisNumber || '').trim().toUpperCase()
    }));

    // Check for duplicates in current form
    const chassisNumbers = sanitizedEntries.map(e => e.chassisNumber);
    if (chassisNumbers.some(c => !c)) {
      toast.error('Chassis numbers cannot be empty');
      return;
    }

    if (new Set(chassisNumbers).size !== chassisNumbers.length) {
      toast.error('Duplicate chassis numbers in this purchase entries');
      return;
    }

    try {
      if (editingPurchase) {
          if (purchases.some(p => p.vendorId === selectedVendor && p.invoiceNumber === invoiceNumber && p.id !== editingPurchase.id)) {
              toast.error('An invoice with this number already exists for this vendor');
              return;
          }
      } else {
          if (purchases.some(p => p.vendorId === selectedVendor && p.invoiceNumber === invoiceNumber)) {
              toast.error('An invoice with this number already exists for this vendor');
              return;
          }
      }

      let removedChassis: string[] = [];
      if (editingPurchase) {
          removedChassis = (editingPurchase.chassisNumbers || []).filter(c => !chassisNumbers.includes(c));
          
          for (const rc of removedChassis) {
             const vData = allVehicles.find(v => v.chassisNumber === rc);
             if (vData && vData.status === 'sold') {
                 toast.error(`Cannot remove chassis ${rc} from this purchase because it is already sold.`);
                 return;
             }
          }
      }

      const newChassis = editingPurchase ? chassisNumbers.filter(c => !(editingPurchase.chassisNumbers || []).includes(c)) : chassisNumbers;
      
      for (const chassis of newChassis) {
        if (!chassis) continue;
        const vehicleDoc = await getDoc(doc(db, 'vehicles', chassis));
        
        if (vehicleDoc.exists()) {
           const vehicleData = vehicleDoc.data();
           if (vehicleData.purchaseId) {
             toast.error(`Chassis number ${chassis} is already linked to a purchase.`);
             return;
           }
           if (vehicleData.status === 'sold') {
             toast.error(`Chassis number ${chassis} is marked as sold and cannot be purchased.`);
             return;
           }
        }
      }

      let batch = writeBatch(db);
      let ops = 0;
      
      const purchaseRef = editingPurchase ? doc(db, 'purchases', editingPurchase.id) : doc(collection(db, 'purchases'));
      
      if (editingPurchase) {
         batch.update(purchaseRef, {
            date: Timestamp.fromDate(new Date(purchaseDate)),
            invoiceNumber,
            vendorId: selectedVendor,
            chassisNumbers,
            updatedAt: Timestamp.now(),
         });
      } else {
         batch.set(purchaseRef, {
            date: Timestamp.fromDate(new Date(purchaseDate)),
            invoiceNumber,
            vendorId: selectedVendor,
            chassisNumbers,
            createdAt: Timestamp.now(),
         });
      }
      ops++;

      for (const rc of removedChassis) {
         batch.update(doc(db, 'vehicles', rc), {
             purchaseId: null,
             currentOwnerId: null,
             status: 'ready-to-purchase',
             updatedAt: Timestamp.now()
         });
         ops++;
         if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      }

      for (const entry of sanitizedEntries) {
        if (!entry.chassisNumber) continue;
        const vehicleRef = doc(db, 'vehicles', entry.chassisNumber);
        
        const isNewToPurchase = newChassis.includes(entry.chassisNumber);
        const existingVehicle = allVehicles.find(v => v.chassisNumber === entry.chassisNumber);

        batch.set(vehicleRef, {
          ...entry,
          status: existingVehicle && existingVehicle.status === 'sold' ? 'sold' : 'in-stock',
          purchaseId: purchaseRef.id,
          currentOwnerId: selectedVendor,
          updatedAt: Timestamp.now(),
          ...(isNewToPurchase && !existingVehicle ? { bluebookStatus: 'Not Received', naamsariStatus: 'Pending' } : {})
        }, { merge: true });
        ops++;
        
        if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
        }
      }
      
      if (ops > 0) {
          await batch.commit();
      }
      
      if (user) {
        logAction(user.uid, user.email || '', editingPurchase ? 'UPDATE' : 'CREATE', 'Purchase', purchaseRef.id, {
          invoiceNumber,
          vendorId: selectedVendor,
          chassisNumbers,
        });
      }

      await refreshPurchases();
      toast.success(editingPurchase ? 'Purchase updated successfully' : 'Purchase recorded and inventory updated');
      
      // Reset
      cancelEdit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchases/vehicles');
    }
  };

  const exportPurchases = () => {
    try {
      const data = processedPurchases.map(p => ({
        'Invoice Number': p.invoiceNumber,
        'Date': p.date?.toDate ? p.date.toDate().toLocaleDateString('en-US') : '',
        'Vendor Name': vendors.find(v => v.id === p.vendorId)?.name || 'Unknown',
        'Chassis Numbers': p.chassisNumbers.join(', ')
      }));
      if (data.length === 0) {
        toast.error("No purchases to export.");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
      XLSX.writeFile(wb, 'Purchase_Records.xlsx');
      toast.success('Purchase records exported');
    } catch(err) {
      toast.error('Failed to export purchase records');
    }
  };

  return (
    <div className="flex flex-col flex-1 gap-4 h-full">
      <div className="flex items-center justify-between shrink-0 mb-1 lg:mt-[10px]">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Purchase Operations</h1>
        </div>
        <div className="flex gap-3 lg:mr-[200px]">
          <Button 
            onClick={openNewPurchase} 
            size="lg" 
            disabled={!canCreate}
            className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Purchase
          </Button>
        </div>
      </div>

      
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && cancelEdit()}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] h-[95vh] rounded-2xl flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
            <DialogTitle className="text-xl font-black">{editingPurchase ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</DialogTitle>
            <div className="flex items-center gap-3">
               <Button onClick={cancelEdit} variant="outline" className="h-10 px-6 font-bold rounded-xl">
                 Cancel
               </Button>
               <Button onClick={handleSavePurchase} className="h-10 px-6 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                 {editingPurchase ? 'Confirm Updates' : 'Confirm Procurement'}
               </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-12">
        <Card className={cn(isInvoiceExpanded ? "lg:col-span-4" : "lg:col-span-12", "shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-fit lg:pt-[5px] lg:pb-0")}>
          <div 
            className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 lg:pt-[5px] lg:pb-[5px] flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => setIsInvoiceExpanded(!isInvoiceExpanded)}
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{editingPurchase ? "Edit Invoice Reference" : "Invoice Reference"}</h3>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700">
                {isInvoiceExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {isInvoiceExpanded && (
          <CardContent className="p-6 space-y-6 lg:pt-0 lg:pb-[10px]">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procurement Date</label>
              <Input 
                type="date" 
                value={purchaseDate} 
                onChange={(e) => setPurchaseDate(e.target.value)} 
                className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Challan / Invoice #</label>
              <Input 
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)} 
                placeholder="Ex: INV-9902" 
                className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Associated Vendor</label>
              <div className="flex gap-2 items-center">
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all flex-1">
                    <SelectValue placeholder="Identify Source..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id} className="font-medium">{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-shrink-0">
                  <QuickAddParty type="vendor" onAdded={setSelectedVendor} />
                </div>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        <Card className={cn(isInvoiceExpanded ? "lg:col-span-8" : "lg:col-span-12", "shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden lg:pt-[5px] lg:pb-0")}>
          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between lg:pt-0 lg:pb-0">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{editingPurchase ? "Edit Chassis Manifest" : "Chassis Manifest"}</h3>
            <div className="flex gap-2">
               <QuickAddVehicle onAdded={(chassis) => {
                 setTargetRowIndex(currentChassisEntries.length);
                 addChassisRow();
                 setSearchQuery(chassis);
                 setIsSelectorOpen(true);
               }} />
               <Button variant="outline" size="sm" onClick={addChassisRow} className="rounded-lg h-11 bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-xs text-blue-600 px-4">
                 <Plus className="h-4 w-4 mr-1" /> Add Entry Row
               </Button>
            </div>
          </div>
          <CardContent className="p-0">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Chassis Ident</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Company</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Model Line</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Finish</TableHead>
                    <TableHead className="w-16 px-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentChassisEntries.map((entry, index) => (
                    <TableRow key={index} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-transparent">
                      <TableCell className="px-6 py-2.5">
                        <div className="relative flex items-center">
                          <Input 
                            placeholder="Search VIN/Chassis..." 
                            value={entry.chassisNumber} 
                            readOnly
                            className="h-10 rounded-lg border-slate-200 dark:border-slate-800 font-mono font-bold text-sm bg-slate-50 dark:bg-[#0f172a] pr-10 text-slate-500 cursor-not-allowed"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 text-slate-300 hover:text-blue-600 transition-colors"
                            onClick={() => {
                              setTargetRowIndex(index);
                              setIsSelectorOpen(true);
                            }}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-2.5">
                        <Select 
                          value={entry.companyId} 
                          onValueChange={(val) => {
                            updateRow(index, 'companyId', val);
                            updateRow(index, 'modelId', ''); 
                          }}
                          disabled
                        >
                          <SelectTrigger className="w-[140px] h-10 rounded-lg bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Brand" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {companies.map(c => <SelectItem key={c.id} value={c.id} className="font-medium">{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-6 py-2.5">
                        <Select 
                          value={entry.modelId} 
                          onValueChange={(val) => updateRow(index, 'modelId', val)}
                          disabled
                        >
                          <SelectTrigger className="w-[140px] h-10 rounded-lg bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Variants" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {models.filter(m => m.companyId === entry.companyId).map(m => (
                              <SelectItem key={m.id} value={m.id} className="font-medium">{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-6 py-2.5">
                         <Select 
                          value={entry.color} 
                          onValueChange={(val) => updateRow(index, 'color', val)}
                        >
                          <SelectTrigger className="w-[110px] h-10 rounded-lg bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {['Blue', 'Green', 'Red', 'Yellow', 'Black', 'White'].map(c => (
                              <SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-6 py-2.5">
                        <Button variant="ghost" size="icon" onClick={() => removeRow(index)} className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {currentChassisEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 px-6">
                        <div className="flex flex-col items-center gap-3">
                           <div className="p-4 bg-slate-50 dark:bg-[#0f172a] rounded-full">
                              <CarFront className="h-8 w-8 text-slate-300" />
                           </div>
                           <p className="text-slate-400 font-bold text-sm tracking-tight italic">Manifest is empty. Add a row to initiate registration.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>


          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Select from Inventory</DialogTitle>
            <DialogDescription className="font-medium">
              Choose a chassis from registered pool to import its model and brand data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search chassis, model or company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] focus:bg-white dark:focus:bg-slate-900 transition-all font-bold"
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-[#0f172a] sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-4">Chassis</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-4">Make/Model</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-4">Status</TableHead>
                  <TableHead className="w-10 px-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allVehicles
                  .filter(v => v.status === 'ready-to-purchase')
                  .filter(v => {
                    const searchLower = searchQuery.toLowerCase();
                    const companyName = companies.find(c => c.id === v.companyId)?.name || '';
                    const modelName = models.find(m => m.id === v.modelId)?.name || '';
                    
                    return (
                      (v.chassisNumber?.toLowerCase() || "").includes(searchLower) ||
                      companyName.toLowerCase().includes(searchLower) ||
                      modelName.toLowerCase().includes(searchLower)
                    );
                  })
                  .map(vehicle => (
                    <TableRow 
                      key={vehicle.chassisNumber} 
                      className="cursor-pointer hover:bg-slate-50 dark:bg-[#0f172a] group"
                      onClick={() => selectVehicleForRow(vehicle)}
                    >
                      <TableCell className="font-mono font-black text-sm px-4">{vehicle.chassisNumber}</TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {companies.find(c => c.id === vehicle.companyId)?.name}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {models.find(m => m.id === vehicle.modelId)?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <Badge variant={vehicle.status === 'in-stock' ? 'outline' : 'secondary'} className="text-[9px] uppercase font-bold">
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check className="h-4 w-4 text-blue-600" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                }
                {allVehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-slate-400 italic text-sm">
                      No vehicles in inventory records.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>


      {/* Purchase List History */}
      <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 lg:pt-[5px] lg:pb-[5px]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4 px-6 shrink-0 shadow-sm z-20 lg:pt-[5px] lg:pb-[5px]">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-black">Purchase History</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" className="h-10 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onClick={clearFilters}>
                <FilterX className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
            <Button variant="outline" className="h-10 rounded-lg text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]" onClick={exportPurchases}>
              <Download className="h-4 w-4 mr-2" />
              Export Records
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 text-xs flex-1 flex flex-col min-h-0 [&_[data-slot=table-container]]:flex-1 [&_[data-slot=table-container]]:min-h-0 [&_[data-slot=table-container]]:overflow-auto">
          <>
          <Table>
            <TableHeader>
              <TableRow className="divide-x divide-slate-100">
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap lg:pt-[8px] lg:pb-[8px]">
                  <div className="flex items-center justify-between gap-1.5">
                    Party Name
                    <Popover open={activePopover === 'vendor'} onOpenChange={(open) => setActivePopover(open ? 'vendor' : null)}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-200/50 -mr-2">
                          <FilterIcon className={`w-3.5 h-3.5 ${vendorFilter !== 'ALL' ? 'text-blue-600 fill-blue-600/20' : 'text-slate-500'}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="space-y-1 p-3 w-[200px]">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Vendor</label>
                          <Select value={vendorFilter} onValueChange={(val) => { setVendorFilter(val); setActivePopover(null); }}>
                            <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                              <SelectValue placeholder="All Vendors" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="ALL">All Vendors</SelectItem>
                              {vendors.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:pt-[8px] lg:pb-[8px]" onClick={() => handleSort('invoiceNumber')}>
                  <div className="flex items-center gap-1">
                    Invoice No.
                    {sortField === 'invoiceNumber' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap lg:pt-[8px] lg:pb-[8px]">
                  <div className="flex items-center justify-between gap-1.5">
                    Vehicle Details
                    <Popover open={activePopover === 'company'} onOpenChange={(open) => setActivePopover(open ? 'company' : null)}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-200/50 -mr-2">
                          <FilterIcon className={`w-3.5 h-3.5 ${chassisFilter !== '' ? 'text-blue-600 fill-blue-600/20' : 'text-slate-500'}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="space-y-3 p-3 w-[200px]">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Chassis Number</label>
                            <Input 
                              placeholder="Search chassis..." 
                              value={chassisFilter} 
                              onChange={e => setChassisFilter(e.target.value)}
                              className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500 w-full"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap lg:pt-[8px] lg:pb-[8px]">
                  Document Status
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap lg:pt-[8px] lg:pb-[8px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPurchases.map((purchase) => {
                const vendor = vendors.find(v => v.id === purchase.vendorId);
                const vehiclesForThisPurchase = allVehicles.filter(v => v.purchaseId === purchase.id || (purchase.chassisNumbers && (purchase.chassisNumbers || []).includes(v.chassisNumber)));
                const isExpanded = expandedRows[purchase.id];

                return (
                  <Fragment key={purchase.id}>
                  <TableRow className="hover:bg-slate-200 dark:hover:bg-slate-800 border-transparent divide-x divide-slate-100 cursor-pointer" onClick={() => toggleRow(purchase.id)}>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-slate-900 dark:text-slate-100 uppercase">{vendor?.name || 'Unknown Vendor'}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {purchase.date instanceof Timestamp 
                            ? purchase.date?.toDate?.()?.toLocaleDateString('en-GB') || 'N/A'
                            : String(purchase.date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5 font-black text-slate-900 dark:text-slate-100 text-center">
                      <Badge variant="outline" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] font-black">
                        {purchase.invoiceNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge className="font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{vehiclesForThisPurchase.length} Vehicles</Badge>
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                           {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                           {isExpanded ? 'Hide Details' : 'View Details'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                       {/* Left empty intentionally for summary row, or show combined status */}
                       <span className="text-[10px] font-bold text-slate-400">Expand for statuses</span>
                    </TableCell>
                    <TableCell className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                            onClick={() => openEditPurchase(purchase)}
                          >
                            EDIT
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setPurchaseToDelete(purchase)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50/50">
                      <TableCell colSpan={5} className="p-0 border-b border-slate-200 dark:border-slate-800">
                        <div className="px-8 py-4">
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Invoice Chassis Details</h4>
                           {vehiclesForThisPurchase.length === 0 ? (
                             <div className="text-sm font-bold text-slate-400 italic">No chassis linked to this invoice.</div>
                           ) : (
                             <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                               {vehiclesForThisPurchase.map(v => {
                                  const company = companies.find(c => c.id === v.companyId);
                                  const model = models.find(m => m.id === v.modelId);
                                  return (
                                    <div key={v.chassisNumber} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                                       <div className="flex justify-between items-start">
                                          <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{v.chassisNumber}</span>
                                          <Badge variant="outline" className="text-[9px] font-bold uppercase">{v.status}</Badge>
                                       </div>
                                       <div className="flex flex-col gap-1">
                                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                            {company?.name} • {model?.name} • {v.color}
                                          </span>
                                          <span className="text-[10px] font-black uppercase text-slate-500">
                                            Reg: {v.registrationNumber || 'UNREGISTERED'}
                                          </span>
                                          <span className="text-[10px] font-black uppercase text-slate-500">
                                            Docs: {v.bluebookStatus || 'NOT RECEIVED'} • {v.naamsariStatus || 'PENDING'}
                                          </span>
                                       </div>
                                    </div>
                                  )
                               })}
                             </div>
                           )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                );
              })}
              {paginatedPurchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400 italic font-medium">
                    No purchase records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="lg:pt-[1px] lg:pb-[5px]">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              totalItems={totalItems}
            />
          </div>
          </>
        </CardContent>
      </Card>

      <Dialog open={!!purchaseToDelete} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">Purge Purchase Record?</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              This will permanently delete invoice <span className="text-slate-900 dark:text-slate-100 font-extrabold">{purchaseToDelete?.invoiceNumber}</span> and ALL associated inventory chassis that are currently in stock.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-6">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setPurchaseToDelete(null)}>
              Abort
            </Button>
            <Button className="flex-1 h-11 rounded-xl font-black bg-red-600 hover:bg-red-700" onClick={confirmDeletePurchase}>
              Confirm Purge
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
