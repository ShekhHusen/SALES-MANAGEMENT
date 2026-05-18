import { useState, useEffect, FormEvent } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, getDoc, setDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Vehicle, Company, Model, BluebookStatus, NaamsariStatus, Purchase, Sale, Party } from '@/types';
import { cn } from '@/lib/utils';
import { logAction } from '@/lib/audit';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Search, Filter, FileText, Info, ShoppingBag, BadgeDollarSign, Plus, Trash2, X, Download, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { Pagination } from '@/components/Pagination';
import { useGlobalData } from '@/contexts/GlobalDataContext';

export function Inventory() {
  const { user } = useAuth();
  const { vehicles, companies, models, parties, purchases, sales } = useGlobalData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Custom Filters & Sorting
  const [sortField, setSortField] = useState<'chassis' | 'customer' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterColor, setFilterColor] = useState<string>('all');
  const [filterBluebook, setFilterBluebook] = useState<string>('all');
  const [filterNaamsari, setFilterNaamsari] = useState<string>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(5);
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<Purchase | null>(null);
  const [saleDetails, setSaleDetails] = useState<Sale | null>(null);

  const hasActiveFilters = search !== '' || filterStatus !== 'all' || filterCompany !== 'all' || filterModel !== 'all' || filterColor !== 'all' || filterBluebook !== 'all' || filterNaamsari !== 'all' || sortField !== null;

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterCompany('all');
    setFilterModel('all');
    setFilterColor('all');
    setFilterBluebook('all');
    setFilterNaamsari('all');
    setSortField(null);
    setSortOrder('asc');
  };

  // New Vehicle Form State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    chassisNumber: '',
    companyId: '',
    modelId: '',
    color: '',
    registrationNumber: '',
    bluebookStatus: 'Not Received' as BluebookStatus,
    naamsariStatus: 'Pending' as NaamsariStatus,
    status: 'ready-to-purchase' as 'ready-to-purchase' | 'in-stock' | 'sold',
  });

  // Background Data Integrity Healer
  useEffect(() => {
    if (vehicles.length > 0 && (purchases.length > 0 || sales.length > 0)) {
      vehicles.forEach(vehicle => {
        const saleId = sales.find(s => s.chassisNumber === vehicle.chassisNumber)?.id || null;
        const purchaseId = purchases.find(p => p.chassisNumbers.includes(vehicle.chassisNumber))?.id || null;
        
        let realStatus: 'ready-to-purchase' | 'in-stock' | 'sold' = 'ready-to-purchase';
        if (saleId) {
          realStatus = 'sold';
        } else if (purchaseId) {
          realStatus = 'in-stock';
        }

        const needsSync = 
          vehicle.status !== realStatus || 
          (vehicle.saleId || null) !== saleId || 
          (vehicle.purchaseId || null) !== purchaseId;

        if (needsSync) {
          updateDoc(doc(db, 'vehicles', vehicle.chassisNumber), {
            status: realStatus,
            saleId,
            purchaseId
          }).catch(console.error);
        }
      });
    }
  }, [vehicles, purchases, sales]);

  const handleCreateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!newVehicle.chassisNumber || !newVehicle.companyId || !newVehicle.modelId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const vehicleRef = doc(db, 'vehicles', newVehicle.chassisNumber);
      const vehicleSnap = await getDoc(vehicleRef);
      
      if (vehicleSnap.exists()) {
        toast.error('Vehicle with this chassis number already exists');
        return;
      }

      const vehicleData = {
        ...newVehicle,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(vehicleRef, vehicleData);
      
      if (user) {
        logAction(user.uid, user.email || '', 'CREATE', 'Vehicle', newVehicle.chassisNumber, newVehicle);
      }
      
      toast.success('Vehicle added successfully');
      setIsAddDialogOpen(false);
      setNewVehicle({
        chassisNumber: '',
        companyId: '',
        modelId: '',
        color: '',
        registrationNumber: '',
        bluebookStatus: 'Not Received',
        naamsariStatus: 'Pending',
        status: 'ready-to-purchase',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vehicles/${newVehicle.chassisNumber}`);
    }
  };

  const fetchExtendedDetails = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setPurchaseDetails(null);
    setSaleDetails(null);

    if (vehicle.purchaseId) {
      const pDoc = await getDoc(doc(db, 'purchases', vehicle.purchaseId));
      if (pDoc.exists()) setPurchaseDetails({ id: pDoc.id, ...pDoc.data() } as Purchase);
    }
    if (vehicle.saleId) {
      const sDoc = await getDoc(doc(db, 'sales', vehicle.saleId));
      if (sDoc.exists()) setSaleDetails({ id: sDoc.id, ...sDoc.data() } as Sale);
    }
  };

  const updateDocStatus = async (chassisNumber: string, bluebook: BluebookStatus, naamsari: NaamsariStatus, registrationNumber: string) => {
    try {
      const vehicleRef = doc(db, 'vehicles', chassisNumber);
      await updateDoc(vehicleRef, {
        bluebookStatus: bluebook,
        naamsariStatus: naamsari,
        registrationNumber: registrationNumber || '',
        updatedAt: Timestamp.now(),
      });
      
      if (user) {
        logAction(user.uid, user.email || '', 'UPDATE', 'Vehicle', chassisNumber, { bluebookStatus: bluebook, naamsariStatus: naamsari, registrationNumber });
      }

      toast.success('Status updated');
      setSelectedVehicle(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicles/${chassisNumber}`);
    }
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleToDelete.chassisNumber));
      
      if (user) {
        logAction(user.uid, user.email || '', 'DELETE', 'Vehicle', vehicleToDelete.chassisNumber, vehicleToDelete);
      }

      toast.success('Vehicle deleted from inventory');
      setVehicleToDelete(null);
    } catch (error) {
      console.error("Delete Vehicle Error:", error);
      toast.error('Could not delete vehicle. Permissions or database error.');
      handleFirestoreError(error, OperationType.DELETE, `vehicles/${vehicleToDelete.chassisNumber}`);
    }
  };

  const deleteVehicle = async (vehicle: Vehicle) => {
    // Check if sold
    if (vehicle.status === 'sold' || vehicle.saleId) {
      toast.error(`Cannot delete chassis ${vehicle.chassisNumber}. It has already been sold. Delete the sale record first.`);
      return;
    }

    // Check if part of a purchase invoice
    if (vehicle.purchaseId) {
      toast.error(`Cannot delete chassis ${vehicle.chassisNumber}. It is linked to a purchase invoice. You must delete the entire purchase record to maintain invoice integrity.`);
      return;
    }

    setVehicleToDelete(vehicle);
  };

  const processedVehicles = vehicles.filter(v => {
    const saleDetails = v.saleId ? sales.find(s => s.id === v.saleId) : null;
    const customer = saleDetails ? parties.find(p => p.id === saleDetails.customerId) : null;

    const matchesSearch = v.chassisNumber.toLowerCase().includes(search.toLowerCase()) || 
                          v.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
                          customer?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchesCompany = filterCompany === 'all' || v.companyId === filterCompany;
    const matchesModel = filterModel === 'all' || v.modelId === filterModel;
    const matchesColor = filterColor === 'all' || v.color === filterColor;
    const matchesBluebook = filterBluebook === 'all' || v.bluebookStatus === filterBluebook;
    const matchesNaamsari = filterNaamsari === 'all' || v.naamsariStatus === filterNaamsari;

    return matchesSearch && matchesStatus && matchesCompany && matchesModel && matchesColor && matchesBluebook && matchesNaamsari;
  });

  if (sortField) {
    processedVehicles.sort((a, b) => {
      if (sortField === 'chassis') {
         return sortOrder === 'asc' ? a.chassisNumber.localeCompare(b.chassisNumber) : b.chassisNumber.localeCompare(a.chassisNumber);
      } else if (sortField === 'customer') {
         const customerA = (a.saleId ? parties.find(p => p.id === sales.find(s => s.id === a.saleId)?.customerId)?.name : '') || '';
         const customerB = (b.saleId ? parties.find(p => p.id === sales.find(s => s.id === b.saleId)?.customerId)?.name : '') || '';
         return sortOrder === 'asc' ? customerA.localeCompare(customerB) : customerB.localeCompare(customerA);
      }
      return 0;
    });
  }

  const filteredVehicles = processedVehicles;
  const totalItems = filteredVehicles.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const paginatedVehicles = itemsPerPage === 'all' ? filteredVehicles : filteredVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on filter
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterCompany, filterModel, filterColor, filterBluebook, filterNaamsari]);

  const exportRecords = () => {
    try {
      const data = filteredVehicles.map(v => ({
        'Chassis Number': v.chassisNumber,
        'Company': companies.find(c => c.id === v.companyId)?.name || 'Unknown',
        'Model': models.find(m => m.id === v.modelId)?.name || 'Unknown',
        'Color': v.color,
        'Registration Number': v.registrationNumber,
        'Inventory Status': v.status,
        'Bluebook Status': v.bluebookStatus,
        'Naamsari Status': v.naamsariStatus,
      }));
      
      if(data.length === 0) {
        toast.error("No records to export.");
        return;
      }
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      XLSX.writeFile(wb, 'Inventory_Records.xlsx');
      toast.success('Inventory records exported');
    } catch(err) {
      toast.error('Failed to export inventory records');
    }
  };

  return (
    <div className="flex flex-col flex-1 gap-4 h-full">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Vehicle Inventory</h1>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/50 p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:bg-card shrink-0">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by Chassis or Customer Name..." 
              className="pl-10 h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Inventory</SelectItem>
              <SelectItem value="ready-to-purchase">Ready to Purchase</SelectItem>
              <SelectItem value="in-stock">In Stock Units</SelectItem>
              <SelectItem value="sold">Sold Units</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              onClick={clearFilters}
              className="h-10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold px-6 shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Add New Vehicle</DialogTitle>
                <DialogDescription className="font-medium text-slate-500">
                  Register a new chassis segment to the inventory database.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateVehicle} className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="chassis" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chassis Number*</Label>
                    <Input 
                      id="chassis" 
                      placeholder="Enter unique chassis number" 
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold"
                      value={newVehicle.chassisNumber}
                      onChange={(e) => setNewVehicle({ ...newVehicle, chassisNumber: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company*</Label>
                    <Select 
                      value={newVehicle.companyId} 
                      onValueChange={(val) => setNewVehicle({ ...newVehicle, companyId: val, modelId: '' })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <SelectValue placeholder="Select Make" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id ?? ''}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Model*</Label>
                    <Select 
                      value={newVehicle.modelId} 
                      onValueChange={(val) => setNewVehicle({ ...newVehicle, modelId: val })}
                      disabled={!newVehicle.companyId}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.filter(m => m.companyId === newVehicle.companyId).map(m => (
                          <SelectItem key={m.id} value={m.id ?? ''}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Color</Label>
                    <Input 
                      id="color" 
                      placeholder="Vehicle color" 
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold"
                      value={newVehicle.color}
                      onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reg Number</Label>
                    <Input 
                      id="reg" 
                      placeholder="Registration info" 
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold"
                      value={newVehicle.registrationNumber}
                      onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bluebook Status</Label>
                    <Select 
                      value={newVehicle.bluebookStatus} 
                      onValueChange={(val: BluebookStatus) => setNewVehicle({ ...newVehicle, bluebookStatus: val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Received">Not Received</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" className="h-11 rounded-xl font-bold flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Discard
                  </Button>
                  <Button type="submit" className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold flex-1 shadow-lg shadow-blue-500/20">
                    Register Vehicle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="h-10 rounded-lg text-slate-600 border-slate-200 dark:border-slate-800" onClick={exportRecords}>
            <Download className="h-4 w-4 mr-2" />
            Export Records
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden rounded-xl flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0 [&_[data-slot=table-container]]:flex-1 [&_[data-slot=table-container]]:min-h-0 [&_[data-slot=table-container]]:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200 dark:border-slate-800">
                <TableHead className="py-2.5 px-6">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-[11px] font-extrabold uppercase tracking-widest text-slate-500"
                    onClick={() => {
                      if (sortField === 'chassis') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('chassis');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Chassis No
                    <ArrowUpDown className={cn("h-3 w-3 opacity-50 group-hover:opacity-100", sortField === 'chassis' && "opacity-100 text-[#1a4731]")} />
                  </div>
                </TableHead>
                <TableHead className="py-2.5 px-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-[11px] font-extrabold uppercase tracking-widest text-slate-500 outline-none bg-transparent border-none p-0 m-0 text-left">
                      Vehicle Details
                      <Filter className={cn("h-3 w-3 opacity-50 group-hover:opacity-100", (filterCompany !== 'all' || filterModel !== 'all' || filterColor !== 'all') && "opacity-100 text-[#1a4731]")} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Company</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-48 max-h-[300px] overflow-y-auto">
                            <DropdownMenuRadioGroup value={filterCompany} onValueChange={(val) => setFilterCompany(String(val))}>
                              <DropdownMenuRadioItem value="all">All Companies</DropdownMenuRadioItem>
                              {companies.map(c => <DropdownMenuRadioItem key={c.id} value={c.id}>{c.name}</DropdownMenuRadioItem>)}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Model</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-48 max-h-[300px] overflow-y-auto">
                            <DropdownMenuRadioGroup value={filterModel} onValueChange={(val) => setFilterModel(String(val))}>
                               <DropdownMenuRadioItem value="all">All Models</DropdownMenuRadioItem>
                               {models.filter(m => filterCompany === 'all' || m.companyId === filterCompany).map(m => <DropdownMenuRadioItem key={m.id} value={m.id}>{m.name}</DropdownMenuRadioItem>)}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Color</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-48 max-h-[300px] overflow-y-auto">
                            <DropdownMenuRadioGroup value={filterColor} onValueChange={(val) => setFilterColor(String(val))}>
                               <DropdownMenuRadioItem value="all">All Colors</DropdownMenuRadioItem>
                               {Array.from(new Set(vehicles.map(v => v.color))).filter(c => typeof c === 'string' && c.length > 0).map(color => <DropdownMenuRadioItem key={color as string} value={color as string}>{color as string}</DropdownMenuRadioItem>)}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Inventory Status</TableHead>
                <TableHead className="py-2.5 px-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-[11px] font-extrabold uppercase tracking-widest text-slate-500 outline-none bg-transparent border-none p-0 m-0 text-left">
                      Registration Details
                      <Filter className={cn("h-3 w-3 opacity-50 group-hover:opacity-100", (filterBluebook !== 'all' || filterNaamsari !== 'all') && "opacity-100 text-[#1a4731]")} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Bluebook</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={filterBluebook} onValueChange={(val) => setFilterBluebook(String(val))}>
                              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="Pending">Pending</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="Received">Received</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Naamsari</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={filterNaamsari} onValueChange={(val) => setFilterNaamsari(String(val))}>
                              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="Pending">Pending</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="Names of JBMT">Names of JBMT</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="Customer Done">Customer Done</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="py-2.5 px-6">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-[11px] font-extrabold uppercase tracking-widest text-slate-500"
                    onClick={() => {
                      if (sortField === 'customer') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('customer');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Customer Details
                    <ArrowUpDown className={cn("h-3 w-3 opacity-50 group-hover:opacity-100", sortField === 'customer' && "opacity-100 text-[#1a4731]")} />
                  </div>
                </TableHead>
                <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVehicles.map((vehicle) => {
                const saleDetails = vehicle.saleId ? sales.find(s => s.id === vehicle.saleId) : null;
                const customer = saleDetails ? parties.find(p => p.id === saleDetails.customerId) : null;
                
                return (
                <TableRow key={vehicle.chassisNumber} className="hover:bg-slate-50/40 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">
                  <TableCell className="px-6 py-2.5 font-mono font-bold text-slate-700 text-sm">{vehicle.chassisNumber}</TableCell>
                  <TableCell className="px-6 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{companies.find(c => c.id === vehicle.companyId)?.name}</span>
                      <span className="text-xs text-slate-500 font-medium">{models.find(m => m.id === vehicle.modelId)?.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Color: <span className="font-semibold text-slate-600">{vehicle.color}</span></span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-2.5">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                        "h-2 w-2 rounded-full", 
                        vehicle.status === 'in-stock' ? "bg-emerald-500" : 
                        vehicle.status === 'ready-to-purchase' ? "bg-amber-500" : "bg-slate-300"
                        )} />
                       <span className={cn(
                        "text-xs font-bold capitalize", 
                        vehicle.status === 'in-stock' ? "text-emerald-700" : 
                        vehicle.status === 'ready-to-purchase' ? "text-amber-700" : "text-slate-500"
                        )}>
                        {vehicle.status === 'in-stock' ? 'In-Stock' : 
                         vehicle.status === 'ready-to-purchase' ? 'Ready to Purchase' : 'Sold'}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-slate-700 tracking-tight">{vehicle.registrationNumber || '-'}</span>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className={cn(
                          "px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-tight border",
                          vehicle.bluebookStatus === 'Received' 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          BB: {vehicle.bluebookStatus}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-tight border",
                          vehicle.naamsariStatus === 'Customer Done' 
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                            : vehicle.naamsariStatus === 'Names of JBMT'
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-800"
                        )}>
                          NS: {vehicle.naamsariStatus === 'Names of JBMT' ? 'JBMT' : vehicle.naamsariStatus === 'Customer Done' ? 'Customer' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-2.5">
                    {customer ? (
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{customer.name}</span>
                            <span className="text-[10px] text-slate-500">{customer.contactNumber}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">{customer.address}</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Pending Sale</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-primary hover:bg-primary/5 font-bold text-xs" onClick={() => fetchExtendedDetails(vehicle)}>
                            <Info className="h-3.5 w-3.5 mr-1" /> View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent showCloseButton={false} className="max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border-none shadow-2xl p-0">
                        <div className="p-8 bg-[#0F172A] text-white overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-12 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                           <DialogClose className="absolute top-4 right-4 z-20 rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors text-white dark:text-slate-100">
                             <X className="h-5 w-5" />
                           </DialogClose>
                           <DialogHeader className="relative z-10 w-11/12">
                              <div className="flex items-center gap-3 mb-2">
                                 <Badge variant="outline" className="text-blue-400 border-blue-400 uppercase text-[10px] font-black">History Log</Badge>
                                 <span className="text-slate-400 text-xs font-mono">{vehicle.chassisNumber}</span>
                              </div>
                              <DialogTitle className="text-2xl font-black tracking-tight text-white">Lifecycle Intelligence</DialogTitle>
                           </DialogHeader>
                        </div>
                        
                        <div className="p-8 space-y-8">
                          {/* Section 1: Chassis Details */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400">
                              Chassis Identity
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50">
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Company</p>
                                <p className="font-extrabold text-slate-900 dark:text-slate-100">{companies.find(c => c.id === vehicle.companyId)?.name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Model</p>
                                <p className="font-extrabold text-slate-900 dark:text-slate-100">{models.find(m => m.id === vehicle.modelId)?.name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Color</p>
                                <p className="font-extrabold text-slate-900 dark:text-slate-100">{vehicle.color}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Initial Log</p>
                                <p className="font-extrabold text-slate-900 dark:text-slate-100">{vehicle.createdAt.toDate().toLocaleDateString()}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reg. Number</label>
                                <Input 
                                  value={selectedVehicle?.registrationNumber || ''} 
                                  onChange={(e) => {
                                    if (selectedVehicle) setSelectedVehicle({ ...selectedVehicle, registrationNumber: e.target.value.toUpperCase() });
                                  }}
                                  placeholder="Eg. BA 1 CHA 1234"
                                  className="h-10 rounded-lg border-slate-200 dark:border-slate-800 uppercase"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Bluebook</label>
                                <Select 
                                  value={selectedVehicle?.bluebookStatus} 
                                  onValueChange={(val: BluebookStatus) => {
                                    if (selectedVehicle) setSelectedVehicle({ ...selectedVehicle, bluebookStatus: val });
                                  }}
                                >
                                  <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Not Received">Not Received</SelectItem>
                                    <SelectItem value="Received">Received</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Naamsari</label>
                                <Select 
                                  value={selectedVehicle?.naamsariStatus}
                                  onValueChange={(val: NaamsariStatus) => {
                                    if (selectedVehicle) setSelectedVehicle({ ...selectedVehicle, naamsariStatus: val });
                                  }}
                                >
                                  <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Names of JBMT" disabled={selectedVehicle?.bluebookStatus !== 'Received'}>Names of JBMT</SelectItem>
                                    <SelectItem value="Customer Done" disabled={selectedVehicle?.status !== 'sold'}>Customer Done</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20" onClick={() => selectedVehicle && updateDocStatus(selectedVehicle.chassisNumber, selectedVehicle.bluebookStatus, selectedVehicle.naamsariStatus, selectedVehicle.registrationNumber || '')}>
                              Commit Status Changes
                            </Button>
                          </div>

                          <Separator className="bg-slate-100 dark:bg-slate-800" />

                          {/* Section 2: Purchase Details */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-blue-500">
                              Purchase Origination
                            </h3>
                            {purchaseDetails ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-xl border border-blue-50 p-6 bg-blue-50/30">
                                <div>
                                  <p className="text-[10px] text-blue-400 font-black uppercase">Date</p>
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100">{purchaseDetails.date.toDate().toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-blue-400 font-black uppercase">Invoice #</p>
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100">{purchaseDetails.invoiceNumber}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-blue-400 font-black uppercase">Vendor Partner</p>
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100">{parties.find(p => p.id === purchaseDetails.vendorId)?.name}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-widest italic">Inventory seed data only</p>
                            )}
                          </div>

                          <Separator className="bg-slate-100 dark:bg-slate-800" />

                          {/* Section 3: Sales Details */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-emerald-500">
                              Sales Culmination
                            </h3>
                            {saleDetails ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-xl border border-emerald-50 p-6 bg-emerald-50/30">
                                <div>
                                  <p className="text-[10px] text-emerald-400 font-black uppercase">Sale Date</p>
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100">{saleDetails.date.toDate().toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-400 font-black uppercase">File Reference</p>
                                  <p className="font-black text-blue-600">REF-{saleDetails.fileNumber.toString().padStart(4, '0')}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-400 font-black uppercase">End Customer</p>
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">{parties.find(p => p.id === saleDetails.customerId)?.name}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-widest italic">Pending Commercial Completion</p>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
                      <DialogContent className="sm:max-w-md rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-black text-red-600">Delete Vehicle Record?</DialogTitle>
                          <DialogDescription className="font-bold text-slate-500">
                            This will permanently delete the vehicle <span className="text-slate-900 dark:text-slate-100 font-extrabold">{vehicleToDelete?.chassisNumber}</span> from your inventory.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-3 pt-6">
                          <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setVehicleToDelete(null)}>
                            Abort
                          </Button>
                          <Button className="flex-1 h-11 rounded-xl font-black bg-red-600 hover:bg-red-700" onClick={confirmDeleteVehicle}>
                            Confirm Delete
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteVehicle(vehicle)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                </TableRow>
                );
              })}
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                       <Search className="h-8 w-8 text-slate-200" />
                       <p className="text-slate-400 font-bold text-sm">No chassis segments matched your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalItems={totalItems}
          />
        </CardContent>
      </Card>
    </div>
  );
}

