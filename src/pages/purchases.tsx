import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, onSnapshot, query, where, Timestamp, writeBatch, doc, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Company, Model, Party, Vehicle, Purchase } from '@/types';
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
import { Plus, Trash2, Search, CarFront, Check, Download, ArrowUp, ArrowDown, FilterIcon, FilterX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

export function Purchases() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [vendors, setVendors] = useState<Party[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [purchases, setPurchases] = useState<(Purchase & { id: string })[]>([]);
  
  const [sortField, setSortField] = useState<'date' | 'invoiceNumber' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [chassisFilter, setChassisFilter] = useState('');
  const [activePopover, setActivePopover] = useState<string | null>(null);

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
      const purchaseVehicles = allVehicles.filter(v => purchase.chassisNumbers.includes(v.chassisNumber));
      
      const matchesVendor = vendorFilter === 'ALL' || purchase.vendorId === vendorFilter;
      const matchesChassis = !chassisFilter || purchaseVehicles.some(v => v.chassisNumber.toLowerCase().includes(chassisFilter.toLowerCase()));
      
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

  useEffect(() => {
    onSnapshot(collection(db, 'companies'), (s) => setCompanies(s.docs.map(d => ({ ...d.data(), id: d.id } as Company))));
    onSnapshot(collection(db, 'models'), (s) => setModels(s.docs.map(d => ({ ...d.data(), id: d.id } as Model))));
    onSnapshot(query(collection(db, 'parties'), where('type', '==', 'vendor')), (s) => setVendors(s.docs.map(d => ({ ...d.data(), id: d.id } as Party))));
    onSnapshot(collection(db, 'vehicles'), (s) => setAllVehicles(s.docs.map(d => ({ ...d.data(), chassisNumber: d.id } as Vehicle))));
    onSnapshot(query(collection(db, 'purchases'), orderBy('date', 'desc')), (s) => setPurchases(s.docs.map(d => ({ ...d.data(), id: d.id } as (Purchase & { id: string })))));
  }, []);

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

  const openEditPurchase = (purchase: Purchase & { id: string }) => {
    setEditingPurchase(purchase);
    setEditPurchaseDate(purchase.date instanceof Timestamp ? purchase.date.toDate().toISOString().split('T')[0] : String(purchase.date));
    setEditInvoiceNumber(purchase.invoiceNumber);
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return;
    try {
      const batch = writeBatch(db);
      const purchaseRef = doc(db, 'purchases', editingPurchase.id);
      batch.update(purchaseRef, {
        date: Timestamp.fromDate(new Date(editPurchaseDate)),
        invoiceNumber: editInvoiceNumber,
        updatedAt: Timestamp.now(),
      });
      await batch.commit();
      toast.success('Purchase record updated successfully');
      setEditingPurchase(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'purchases');
    }
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
      const batch = writeBatch(db);
      
      // Revert inventory records back to ready-to-purchase
      vehiclesInPurchase.forEach(v => {
        batch.update(doc(db, 'vehicles', v.chassisNumber), {
          purchaseId: null,
          currentOwnerId: null,
          status: 'ready-to-purchase',
          updatedAt: Timestamp.now()
        });
      });
      
      // Delete purchase record
      batch.delete(doc(db, 'purchases', purchaseToDelete.id));
      
      await batch.commit();
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
      // 1. Check if invoice already exists for this vendor
      const invoiceCheckQuery = query(
        collection(db, 'purchases'), 
        where('vendorId', '==', selectedVendor)
      );
      const invoiceCheckSnap = await getDocs(invoiceCheckQuery);
      if (invoiceCheckSnap.docs.some(d => d.data().invoiceNumber === invoiceNumber)) {
        toast.error('An invoice with this number already exists for this vendor');
        return;
      }

      // 2. Verify all chassis exist in inventory and are not already purchased
      for (const chassis of chassisNumbers) {
        if (!chassis) continue;
        const vehicleDoc = await getDoc(doc(db, 'vehicles', chassis));
        
        if (!vehicleDoc.exists()) {
          toast.error(`Chassis number ${chassis} is not found in inventory. Please add it to inventory first.`);
          return;
        }
        
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

      const batch = writeBatch(db);
      
      // 1. Create Purchase record
      const purchaseRef = doc(collection(db, 'purchases'));
      batch.set(purchaseRef, {
        date: Timestamp.fromDate(new Date(purchaseDate)),
        invoiceNumber,
        vendorId: selectedVendor,
        chassisNumbers,
        createdAt: Timestamp.now(),
      });

      // 2. Create/Update Vehicles
      for (const entry of sanitizedEntries) {
        if (!entry.chassisNumber) continue;
        const vehicleRef = doc(db, 'vehicles', entry.chassisNumber);
        
        // Use set with merge: true to avoid overwriting manually managed document status
        batch.set(vehicleRef, {
          ...entry,
          status: 'in-stock',
          purchaseId: purchaseRef.id,
          currentOwnerId: selectedVendor,
          updatedAt: Timestamp.now(),
          // Default doc statuses if NEW vehicle
          bluebookStatus: 'Not Received',
          naamsariStatus: 'Pending',
        }, { merge: true });

        // Ensure createdAt is only set manually or we'd need a separate check
        // For simplicity with batch.set merge, we add a server timestamp to updatedAt
      }

      await batch.commit();
      toast.success('Purchase recorded and inventory updated');
      
      // Reset
      setInvoiceNumber('');
      setCurrentChassisEntries([]);
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
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Purchase Operations</h1>
          <p className="text-sm text-slate-500 font-medium">Capture incoming vehicle shipments and register chassis IDs.</p>
        </div>
        <Button 
          onClick={handleSavePurchase} 
          size="lg" 
          className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold"
        >
          Confirm Procurement
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-4 shadow-sm border-slate-200 rounded-xl overflow-hidden h-fit">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Invoice Reference</h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procurement Date</label>
              <Input 
                type="date" 
                value={purchaseDate} 
                onChange={(e) => setPurchaseDate(e.target.value)} 
                className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Challan / Invoice #</label>
              <Input 
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)} 
                placeholder="Ex: INV-9902" 
                className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Associated Vendor</label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all">
                  <SelectValue placeholder="Identify Source..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id} className="font-medium">{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 shadow-sm border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Chassis Manifest</h3>
            <Button variant="outline" size="sm" onClick={addChassisRow} className="rounded-lg h-8 bg-white border-slate-200 font-bold text-xs text-blue-600">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Entry Row
            </Button>
          </div>
          <CardContent className="p-0">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Chassis Ident</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Company</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Model Line</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Finish</TableHead>
                    <TableHead className="w-16 px-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentChassisEntries.map((entry, index) => (
                    <TableRow key={index} className="hover:bg-slate-50/50 border-transparent">
                      <TableCell className="px-6 py-2.5">
                        <div className="relative flex items-center">
                          <Input 
                            placeholder="Search VIN/Chassis..." 
                            value={entry.chassisNumber} 
                            readOnly
                            className="h-10 rounded-lg border-slate-200 font-mono font-bold text-sm bg-slate-50 pr-10 text-slate-500 cursor-not-allowed"
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
                          <SelectTrigger className="w-[140px] h-10 rounded-lg bg-white border-slate-200">
                            <SelectValue placeholder="Brand" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200">
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
                          <SelectTrigger className="w-[140px] h-10 rounded-lg bg-white border-slate-200">
                            <SelectValue placeholder="Variants" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200">
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
                          <SelectTrigger className="w-[110px] h-10 rounded-lg bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200">
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
                           <div className="p-4 bg-slate-50 rounded-full">
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
              className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold"
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-4 rounded-xl border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
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
                      v.chassisNumber.toLowerCase().includes(searchLower) ||
                      companyName.toLowerCase().includes(searchLower) ||
                      modelName.toLowerCase().includes(searchLower)
                    );
                  })
                  .map(vehicle => (
                    <TableRow 
                      key={vehicle.chassisNumber} 
                      className="cursor-pointer hover:bg-slate-50 group"
                      onClick={() => selectVehicleForRow(vehicle)}
                    >
                      <TableCell className="font-mono font-black text-sm px-4">{vehicle.chassisNumber}</TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600">
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
      <Card className="mt-8 rounded-2xl border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-6 shrink-0 shadow-sm z-20 sticky top-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-black">Purchase History</CardTitle>
            <CardDescription>View and manage previous procurement invoices.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" className="h-10 text-slate-500 hover:text-slate-900" onClick={clearFilters}>
                <FilterX className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
            <Button variant="outline" className="h-10 rounded-lg text-slate-600 border-slate-200 bg-white" onClick={exportPurchases}>
              <Download className="h-4 w-4 mr-2" />
              Export Records
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 text-xs flex-1 overflow-auto relative [&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm ring-1 ring-slate-100">
              <TableRow className="divide-x divide-slate-100">
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
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
                            <SelectTrigger className="h-8 rounded-lg bg-slate-50 border-slate-200 font-bold text-[10px] shadow-sm hover:bg-white transition-colors w-full">
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
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('invoiceNumber')}>
                  <div className="flex items-center gap-1">
                    Invoice No.
                    {sortField === 'invoiceNumber' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
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
                              className="h-8 rounded-lg bg-slate-50 border-slate-200 font-bold text-[10px] shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500 w-full"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  Document Status
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedPurchases.map((purchase) => {
                const vendor = vendors.find(v => v.id === purchase.vendorId);
                const vehiclesForThisPurchase = allVehicles.filter(v => v.purchaseId === purchase.id || (purchase.chassisNumbers && purchase.chassisNumbers.includes(v.chassisNumber)));

                return (
                  <TableRow key={purchase.id} className="hover:bg-slate-50/50 border-transparent divide-x divide-slate-100">
                    <TableCell className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-slate-900 uppercase">{vendor?.name || 'Unknown Vendor'}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {purchase.date instanceof Timestamp 
                            ? purchase.date.toDate().toLocaleDateString('en-GB') 
                            : String(purchase.date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5 font-black text-slate-900 text-center">
                      <Badge variant="outline" className="border-slate-200 bg-white font-black">
                        {purchase.invoiceNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-0">
                      <div className="divide-y divide-slate-100">
                        {vehiclesForThisPurchase.map((v) => {
                          const company = companies.find(c => c.id === v.companyId);
                          const model = models.find(m => m.id === v.modelId);
                          return (
                            <div key={v.chassisNumber} className="px-4 py-2 flex flex-col">
                              <span className="font-black text-slate-900">{v.chassisNumber}</span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {company?.name}, {model?.name}, {v.color}
                              </span>
                            </div>
                          );
                        })}
                        {vehiclesForThisPurchase.length === 0 && (
                          <div className="px-4 py-3 text-slate-400 italic">No chassis linked</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-0">
                      <div className="divide-y divide-slate-100 h-full">
                        {vehiclesForThisPurchase.map((v) => (
                          <div key={v.chassisNumber + '_status'} className="px-4 py-2 flex flex-col justify-center gap-0.5">
                            <span className="font-bold text-xs uppercase text-slate-800">
                              {v.registrationNumber || 'UNREGISTERED'}
                            </span>
                            <span className="font-bold text-[9px] uppercase tracking-tighter text-slate-500">
                              {v.bluebookStatus || 'NOT RECEIVED'} - {v.naamsariStatus || 'PENDING'}
                            </span>
                          </div>
                        ))}
                        {vehiclesForThisPurchase.length === 0 && (
                          <div className="px-4 py-3 text-slate-400 italic">-</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                          onClick={() => openEditPurchase(purchase)}
                        >
                          EDIT
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setPurchaseToDelete(purchase)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400 italic font-medium">
                    No purchase records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!purchaseToDelete} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">Purge Purchase Record?</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              This will permanently delete invoice <span className="text-slate-900 font-extrabold">{purchaseToDelete?.invoiceNumber}</span> and ALL associated inventory chassis that are currently in stock.
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

      {/* Edit Purchase Dialog */}
      <Dialog open={!!editingPurchase} onOpenChange={(open) => !open && setEditingPurchase(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Edit Purchase Invoice</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              Update header info for invoice {editingPurchase?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Number</label>
              <Input 
                value={editInvoiceNumber} 
                onChange={(e) => setEditInvoiceNumber(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purchase Date</label>
              <Input 
                type="date" 
                value={editPurchaseDate} 
                onChange={(e) => setEditPurchaseDate(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setEditingPurchase(null)}>
              Cancel
            </Button>
            <Button className="flex-1 h-11 rounded-xl font-black bg-blue-600 hover:bg-blue-700" onClick={handleUpdatePurchase}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
