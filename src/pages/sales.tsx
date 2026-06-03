import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, Timestamp, writeBatch, doc, getDocs, orderBy, limit, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Company, Model, Party, Vehicle, Sale } from '@/types';
import { logAction } from '@/lib/audit';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { BadgeDollarSign, Car, User, FileText, Search, Check, ArrowUp, ArrowDown, FilterIcon, FilterX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, CornerUpLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

import { QuickAddParty, QuickAddVehicle } from '@/components/QuickAdd';
import { Pagination } from '@/components/Pagination';
import { useGlobalData } from '@/contexts/GlobalDataContext';

export function Sales() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { companies, models, parties, vehicles: allVehicles, sales } = useGlobalData();
  const customers = parties.filter(p => p.type === 'customer');
  const inStockVehicles = allVehicles.filter(v => v.status === 'in-stock');
  const isAdmin = userProfile?.role === 'admin';
  const isSalesManager = userProfile?.role === 'sales_manager';
  const canDelete = isAdmin;
  const canEdit = isAdmin || isSalesManager;
  const canCreate = isAdmin || isSalesManager;
  
  const [selectedChassis, setSelectedChassis] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [editColor, setEditColor] = useState('');
  
  // Selection Dialog State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Sale State
  const [editingSale, setEditingSale] = useState<(Sale & { id: string }) | null>(null);
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editFileNumber, setEditFileNumber] = useState<number | string>('');

  const [sortField, setSortField] = useState<'date' | 'fileNumber' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [fileNumberFilter, setFileNumberFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [colorFilter, setColorFilter] = useState('ALL');
  const [chassisFilter, setChassisFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // Naamsari
  const [bluebookFilter, setBluebookFilter] = useState('ALL');
  const [successModalData, setSuccessModalData] = useState<{fileNumber: number, customerName: string, saleId: string, chassisNumber: string} | null>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(5);
  
  const uniqueColors = Array.from(new Set(allVehicles.map(v => v.color).filter(Boolean)));

  const hasActiveFilters = fileNumberFilter !== '' || customerFilter !== '' || companyFilter !== 'ALL' || modelFilter !== 'ALL' || colorFilter !== 'ALL' || chassisFilter !== '' || statusFilter !== 'ALL' || bluebookFilter !== 'ALL';

  const clearFilters = () => {
    setFileNumberFilter('');
    setCustomerFilter('');
    setCompanyFilter('ALL');
    setModelFilter('ALL');
    setColorFilter('ALL');
    setChassisFilter('');
    setStatusFilter('ALL');
    setBluebookFilter('ALL');
  };

  const handleSort = (field: 'date' | 'fileNumber') => {
    if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDirection('asc');
    }
  };

  const processedSales = [...sales]
    .filter(sale => {
      const customer = customers.find(c => c.id === sale.customerId);
      const vehicle = allVehicles.find(v => v.chassisNumber === sale.chassisNumber);
      
      const matchesFile = sale.fileNumber.toString().includes(fileNumberFilter);
      const matchesCustomer = customer?.name?.toLowerCase().includes(customerFilter.toLowerCase()) || false;
      const matchesCompany = companyFilter === 'ALL' || sale.companyId === companyFilter;
      const matchesModel = modelFilter === 'ALL' || vehicle?.modelId === modelFilter;
      const matchesColor = colorFilter === 'ALL' || vehicle?.color === colorFilter;
      const matchesChassis = !chassisFilter || vehicle?.chassisNumber.toLowerCase().includes(chassisFilter.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || vehicle?.naamsariStatus === statusFilter;
      const matchesBluebook = bluebookFilter === 'ALL' || vehicle?.bluebookStatus === bluebookFilter;
      
      if (fileNumberFilter && !matchesFile) return false;
      if (customerFilter && !matchesCustomer) return false;
      if (!matchesCompany) return false;
      if (!matchesModel) return false;
      if (!matchesColor) return false;
      if (!matchesChassis) return false;
      if (!matchesStatus) return false;
      if (!matchesBluebook) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      let valA, valB;
      if (sortField === 'date') {
        const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
        const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
        valA = dateA; valB = dateB;
      } else if (sortField === 'fileNumber') {
        valA = a.fileNumber; valB = b.fileNumber;
      }
      
      if (valA! < valB!) return sortDirection === 'asc' ? -1 : 1;
      if (valA! > valB!) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totalItems = processedSales.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const paginatedSales = itemsPerPage === 'all' ? processedSales : processedSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on filter
  useEffect(() => {
    setCurrentPage(1);
  }, [fileNumberFilter, customerFilter, companyFilter, modelFilter, colorFilter, chassisFilter, statusFilter, bluebookFilter]);

  const openEditSale = (sale: Sale & { id: string }) => {
    setEditingSale(sale);
    let parsedDate = '';
    try {
      if (sale.date) {
        if (typeof (sale.date as any).toDate === 'function') {
          parsedDate = (sale.date as any).toDate().toISOString().split('T')[0];
        } else if ((sale.date as any).seconds) {
          parsedDate = new Date((sale.date as any).seconds * 1000).toISOString().split('T')[0];
        } else {
          parsedDate = new Date(sale.date as any).toISOString().split('T')[0];
        }
      }
    } catch (e) {
      console.error("Failed to parse sale date:", sale.date, e);
    }
    setEditSaleDate(parsedDate);
    setEditFileNumber(sale.fileNumber || '');
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;
    try {
      const batch = writeBatch(db);
      const saleRef = doc(db, 'sales', editingSale.id);
      batch.update(saleRef, {
        date: Timestamp.fromDate(new Date(editSaleDate)),
        fileNumber: Number(editFileNumber),
        updatedAt: Timestamp.now(),
      });
      await batch.commit();
      
      if (user) {
        logAction(user.uid, user.email || '', 'UPDATE', 'Sale', editingSale.id, {
          date: editSaleDate,
          fileNumber: editFileNumber,
        });
      }

      toast.success('Sale record updated successfully');
      setEditingSale(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'sales');
    }
  };

  const [saleToDelete, setSaleToDelete] = useState<(Sale & { id: string }) | null>(null);
  const [returnSale, setReturnSale] = useState<(Sale & { id: string }) | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const confirmReturnSale = async () => {
    if (!returnSale || !returnReason.trim()) {
      toast.error('Please provide a reason to return the sale.');
      return;
    }
    
    try {
      const batch = writeBatch(db);
      const saleRef = doc(db, 'sales', returnSale.id);
      batch.update(saleRef, {
        status: 'returned',
        returnedAt: Timestamp.now(),
        returnReason: returnReason.trim()
      });
      
      const vehicleRef = doc(db, 'vehicles', returnSale.chassisNumber);
      batch.update(vehicleRef, {
        status: 'in-stock',
        saleId: deleteField(),
        currentOwnerId: deleteField(),
        updatedAt: Timestamp.now(),
      });
      
      await batch.commit();

      if (user) {
        logAction(user.uid, user.email || '', 'UPDATE', 'Sale', returnSale.id, { action: 'RETURNED', reason: returnReason });
      }

      toast.success(`Sale for ${returnSale.chassisNumber} marked as returned.`);
      setReturnSale(null);
      setReturnReason('');
    } catch (error) {
      console.error("Return Sale Error:", error);
      toast.error('Failed to return sale record.');
    }
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    try {
      // 1. Delete the sale record first
      await deleteDoc(doc(db, 'sales', saleToDelete.id));
      
      // 2. Attempt to revert vehicle status (non-blocking)
      try {
        const vehicleRef = doc(db, 'vehicles', saleToDelete.chassisNumber);
        await updateDoc(vehicleRef, {
          status: 'in-stock',
          saleId: deleteField(),
          currentOwnerId: deleteField(),
          updatedAt: Timestamp.now(),
        });
      } catch (vehError) {
        console.warn("Could not revert vehicle status (it may have been deleted):", vehError);
        // Non-blocking catch
      }

      if (user) {
        logAction(user.uid, user.email || '', 'DELETE', 'Sale', saleToDelete.id, saleToDelete);
      }

      toast.success('Sale record successfully removed.');
      setSaleToDelete(null);
    } catch (error) {
      console.error("Delete Sale Error:", error);
      toast.error('Failed to delete sale record. Please check database connectivity.');
      handleFirestoreError(error, OperationType.DELETE, `sales/${saleToDelete.id}`);
    }
  };

  const currentVehicle = inStockVehicles.find(v => v.chassisNumber === selectedChassis);

  useEffect(() => {
    if (currentVehicle) setEditColor(currentVehicle.color);
  }, [currentVehicle]);

  const handleSaveSale = async () => {
    if (!selectedChassis || !selectedCustomer || !saleDate) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!currentVehicle) return;

    try {
      // Get next file number for this company
      const companySales = sales.filter(s => s.companyId === currentVehicle.companyId);
      let nextFileNumber = 1;
      if (companySales.length > 0) {
        const fileNumbers = companySales.map(s => s.fileNumber || 0);
        nextFileNumber = Math.max(...fileNumbers) + 1;
      }

      const batch = writeBatch(db);
      
      // 1. Create Sale record
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, {
        date: Timestamp.fromDate(new Date(saleDate)),
        customerId: selectedCustomer,
        chassisNumber: selectedChassis,
        fileNumber: nextFileNumber,
        companyId: currentVehicle.companyId,
        createdAt: Timestamp.now(),
      });

      // 2. Update Vehicle
      const vehicleRef = doc(db, 'vehicles', selectedChassis);
      batch.update(vehicleRef, {
        status: 'sold',
        saleId: saleRef.id,
        currentOwnerId: selectedCustomer,
        color: editColor, // Allow editing color at sales
        updatedAt: Timestamp.now(),
      });

      await batch.commit();
      
      if (user) {
        logAction(user.uid, user.email || '', 'CREATE', 'Sale', saleRef.id, {
          customerId: selectedCustomer,
          chassisNumber: selectedChassis,
          fileNumber: nextFileNumber,
          companyId: currentVehicle.companyId,
        });
      }

      const cName = customers.find(c => c.id === selectedCustomer)?.name || 'Unknown';
      setSuccessModalData({
        fileNumber: nextFileNumber,
        customerName: cName,
        saleId: saleRef.id,
        chassisNumber: selectedChassis,
      });

      toast.success(`Sale recorded. File Number: ${nextFileNumber}`);
      
      // Reset
      setSelectedChassis('');
      setSelectedCustomer('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
    }
  };

  const exportSales = () => {
    try {
      const data = processedSales.map(s => ({
        'File Number': s.fileNumber,
        'Date': s.date?.toDate ? s.date.toDate().toLocaleDateString('en-US') : '',
        'Customer Name': customers.find(c => c.id === s.customerId)?.name || 'Unknown',
        'Chassis Number': s.chassisNumber,
        'Company': companies.find(c => c.id === s.companyId)?.name || 'Unknown'
      }));
      if (data.length === 0) {
        toast.error("No sales to export.");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');
      XLSX.writeFile(wb, 'Sales_Records.xlsx');
      toast.success('Sales records exported');
    } catch(err) {
      toast.error('Failed to export sales records');
    }
  };

  return (
    <div className="space-y-8 pb-10 h-full overflow-y-auto pr-2 lg:pb-0 lg:h-[850px]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 lg:mb-[20px] lg:mt-[16px] lg:pt-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sales Desk</h1>
        </div>
        <Button 
          onClick={handleSaveSale} 
          size="lg" 
          disabled={!selectedChassis || !selectedCustomer || !canCreate}
          className="rounded-xl h-12 px-8 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 font-bold lg:mr-[250px]"
        >
          Finalize Transaction
        </Button>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Selection */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-8">
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden lg:pt-[10px] lg:pb-0">
              <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 lg:pt-[10px] lg:pb-[10px]">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Car className="h-4 w-4" /> Vehicle Selection
                </h3>
              </div>
              <CardContent className="p-6 space-y-6 lg:pt-[10px] lg:pb-[10px]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Chassis</label>
                  <div className="relative flex items-center gap-2">
                    <Select value={selectedChassis} onValueChange={setSelectedChassis}>
                      <SelectTrigger className="rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all h-12 flex-1">
                        <SelectValue placeholder="Identify Unit by Chassis Number" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        {inStockVehicles.length > 0 ? (
                          inStockVehicles.map(v => (
                            <SelectItem key={v.chassisNumber} value={v.chassisNumber} className="py-3 items-center">
                              <div className="flex flex-col">
                                <span className="font-bold text-sm">{v.chassisNumber}</span>
                                <span className="text-[10px] uppercase font-black text-slate-400">
                                  {companies.find(c => c.id === v.companyId)?.name} • {v.color}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 italic">No purchased vehicles available</div>
                        )}
                      </SelectContent>
                    </Select>
                    <QuickAddVehicle onAdded={(chassis) => {
                       // Just open selector or directly select if it's in-stock. 
                       // Note: if it's just registered it is 'ready-to-purchase'. Not 'in-stock'. 
                       // So it would need to be purchased first to show up here properly, but we expose the option per user request.
                       toast.info(`Vehicle ${chassis} created. To sell it, you must procure it in Purchase Operations first.`);
                    }} />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12 rounded-xl shrink-0 border-slate-200 dark:border-slate-800"
                      onClick={() => setIsSelectorOpen(true)}
                    >
                      <Search className="h-5 w-5 text-slate-400" />
                    </Button>
                  </div>
                </div>

                {currentVehicle && (
                  <div className="rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                     <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manufacturer</span>
                        <span className="font-extrabold text-blue-600">{companies.find(c => c.id === currentVehicle.companyId)?.name}</span>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Finish Assignment</label>
                        <Select value={editColor} onValueChange={setEditColor}>
                          <SelectTrigger className="h-10 rounded-lg bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {['Blue', 'Green', 'Red', 'Yellow', 'Black', 'White'].map(c => (
                              <SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-500 font-medium italic">Original procurement color was {currentVehicle.color}</p>
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden lg:pt-[10px]">
              <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 lg:pt-[10px] lg:pb-[10px]">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer Mapping
                </h3>
              </div>
              <CardContent className="p-6 space-y-6 lg:pt-[10px] lg:pb-[10px]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Customer</label>
                  <div className="flex gap-2 items-center">
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-bold rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 transition-all h-12 flex-1 hover:bg-white dark:hover:bg-slate-900 overflow-hidden">
                          <div className="flex flex-col truncate w-full pt-1">
                            {selectedCustomer ? (
                              <>
                                <span className="font-bold text-sm truncate">{customers.find(c => c.id === selectedCustomer)?.name || 'Unknown'}</span>
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-tight truncate">{customers.find(c => c.id === selectedCustomer)?.contactNumber}</span>
                              </>
                            ) : (
                              <span className="text-slate-500 font-normal">Identify Registered Party</span>
                            )}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-2 border-slate-200 dark:border-slate-800 rounded-xl" align="start">
                        <input
                          placeholder="Search customer..."
                          className="w-full text-sm font-bold bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg h-9 px-3 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        />
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || c.contactNumber.includes(customerSearchQuery)).length === 0 ? (
                            <p className="text-sm p-4 text-center text-slate-500 font-bold">No customer found.</p>
                          ) : (
                            customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || c.contactNumber.includes(customerSearchQuery)).map(c => (
                              <div
                                key={c.id}
                                className={`flex flex-col px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedCustomer === c.id ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                                onClick={() => {
                                  setSelectedCustomer(c.id);
                                  setCustomerPopoverOpen(false);
                                  setCustomerSearchQuery('');
                                }}
                              >
                                <span className="font-bold text-sm truncate">{c.name}</span>
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-tight">{c.contactNumber}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex-shrink-0">
                      <QuickAddParty type="customer" onAdded={setSelectedCustomer} />
                    </div>
                  </div>
                </div>
                
                {selectedCustomer && (
                  <div className="rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800 p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Registry Address</p>
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{customers.find(c => c.id === selectedCustomer)?.address}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorized Contact</p>
                       <p className="text-sm font-black text-blue-600">{customers.find(c => c.id === selectedCustomer)?.contactNumber}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Transaction Details */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-8">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden lg:pt-[10px]">
            <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 lg:pt-[10px] lg:pb-[10px]">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Registry Attributes
              </h3>
            </div>
            <CardContent className="px-6 py-[10px] space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Date</label>
                <Input 
                  type="date" 
                  value={saleDate} 
                  onChange={(e) => setSaleDate(e.target.value)} 
                  className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px] lg:pt-[5px] lg:pb-[5px] lg:h-[562px]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4 shrink-0 shadow-sm z-20 sticky top-0 lg:pt-0 lg:pb-[5px]">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-black">Sales History</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" className="h-10 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onClick={clearFilters}>
                <FilterX className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
            <Button variant="outline" className="h-10 rounded-lg text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]" onClick={exportSales}>
              <Download className="h-4 w-4 mr-2" />
              Export Records
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto flex-1 relative [&_[data-slot=table-container]]:overflow-visible lg:h-[550px] lg:w-[1328px]">
          <Table>
            <TableHeader className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm ring-1 ring-slate-100">
              <TableRow>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">SN</TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Sale Dates
                    {sortField === 'date' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('fileNumber')}>
                    File#
                    {sortField === 'fileNumber' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  <div className="flex items-center justify-between gap-1.5">
                    Vehicle Details
                    <Popover open={activePopover === 'company'} onOpenChange={(open) => setActivePopover(open ? 'company' : null)}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-200/50 -mr-2">
                          <FilterIcon className={`w-3.5 h-3.5 ${(companyFilter !== 'ALL' || modelFilter !== 'ALL' || colorFilter !== 'ALL' || chassisFilter !== '') ? 'text-blue-600 fill-blue-600/20' : 'text-slate-500'}`} />
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
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Company</label>
                            <Select value={companyFilter} onValueChange={(val) => { setCompanyFilter(val); }}>
                              <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                                <SelectValue placeholder="All Companies" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Companies</SelectItem>
                                {companies.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Model</label>
                            <Select value={modelFilter} onValueChange={(val) => { setModelFilter(val); }}>
                              <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full" disabled={companyFilter === 'ALL' && models.length === 0}>
                                <SelectValue placeholder="All Models" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Models</SelectItem>
                                {models.filter(m => companyFilter === 'ALL' || m.companyId === companyFilter).map(m => (
                                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Color</label>
                            <Select value={colorFilter} onValueChange={(val) => { setColorFilter(val); setActivePopover(null); }}>
                              <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                                <SelectValue placeholder="All Colors" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Colors</SelectItem>
                                {uniqueColors.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1"> Customer Details </div>
                    <Input 
                      placeholder="Filter..." 
                      value={customerFilter} 
                      onChange={e => setCustomerFilter(e.target.value)}
                      className="h-6 w-full max-w-[120px] text-[10px] px-2 rounded-md font-bold"
                    />
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  <div className="flex items-center justify-between gap-1.5">
                    Document Status
                    <Popover open={activePopover === 'status'} onOpenChange={(open) => setActivePopover(open ? 'status' : null)}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-200/50 -mr-2">
                          <FilterIcon className={`w-3.5 h-3.5 ${(statusFilter !== 'ALL' || bluebookFilter !== 'ALL') ? 'text-blue-600 fill-blue-600/20' : 'text-slate-500'}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="space-y-3 p-3 w-[200px]">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Bluebook Status</label>
                            <Select value={bluebookFilter} onValueChange={(val) => { setBluebookFilter(val); }}>
                              <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="Not Received">Pending</SelectItem>
                                <SelectItem value="Received">Received</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Naamsari Status</label>
                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setActivePopover(null); }}>
                              <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Names of JBMT">Names of JBMT</SelectItem>
                                <SelectItem value="Customer Done">Customer Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSales.map((sale, index) => {
                const vehicle = allVehicles.find(v => v.chassisNumber === sale.chassisNumber);
                const customer = customers.find(c => c.id === sale.customerId);
                const company = companies.find(c => c.id === sale.companyId);
                const model = models.find(m => m.id === vehicle?.modelId);

                return (
                  <TableRow key={sale.id} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-transparent divide-x divide-slate-100">
                    <TableCell className="px-4 py-2.5 text-center font-bold text-slate-500">{index + 1}</TableCell>
                    <TableCell className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200">
                      {sale.date instanceof Timestamp 
                        ? sale.date?.toDate?.()?.toLocaleDateString('en-GB') || 'N/A'
                        : String(sale.date)}
                    </TableCell>
                    <TableCell className="px-4 py-2.5 font-black text-slate-900 dark:text-slate-100 flex flex-col gap-1 items-start">
                      <span>#{sale.fileNumber}</span>
                      {sale.status === 'returned' && (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="w-fit bg-red-50 text-red-600 border-red-200 text-[10px] uppercase font-bold py-0 h-5">
                            Returned
                          </Badge>
                          {sale.returnReason && (
                            <span className="text-[10px] font-medium text-red-500/80 leading-none" title={sale.returnReason}>
                              {sale.returnReason.length > 20 ? `${sale.returnReason.substring(0, 20)}...` : sale.returnReason}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-sm uppercase text-slate-900 dark:text-slate-100">{sale.chassisNumber}</span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {company?.name} - {model?.name} <span className="text-blue-600 uppercase ml-1">• {vehicle?.color}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-sm uppercase text-slate-900 dark:text-slate-100">{customer?.name}</span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          {customer?.address} <span className="ml-1">• {customer?.contactNumber}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex flex-col justify-center gap-1.5">
                        <span className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 px-1">
                          {vehicle?.registrationNumber || 'UNREGISTERED'}
                        </span>
                        <div className="flex items-center gap-1 px-1">
                          <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border-none bg-slate-100 dark:bg-slate-800 text-slate-600 ${vehicle?.bluebookStatus === 'Received' ? 'bg-emerald-100 text-emerald-700' : ''}`}>
                            {vehicle?.bluebookStatus || 'NOT RECEIVED'}
                          </Badge>
                          <span className="text-slate-300">-</span>
                          <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border-none bg-slate-100 dark:bg-slate-800 text-slate-600 ${vehicle?.naamsariStatus === 'Customer Done' ? 'bg-indigo-100 text-indigo-700' : vehicle?.naamsariStatus === 'Names of JBMT' ? 'bg-blue-100 text-blue-700' : ''}`}>
                            {vehicle?.naamsariStatus || 'PENDING'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        {canEdit && sale.status !== 'returned' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-orange-600 hover:text-white border-orange-200 hover:bg-orange-600 font-bold text-[10px] rounded-lg shadow-sm px-2 flex items-center"
                            onClick={() => setReturnSale(sale)}
                            title="Return Sale"
                          >
                            <CornerUpLeft className="h-3 w-3 mr-1" /> RETURN
                          </Button>
                        )}
                        {canEdit && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                            onClick={() => openEditSale(sale)}
                          >
                            EDIT
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setSaleToDelete(sale)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-slate-400 italic font-medium">
                    No sales records logged yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="lg:pt-0 lg:pb-0">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              totalItems={totalItems}
              className="lg:pt-[5px] lg:pb-[5px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Sale Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Edit Sale Record</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              Update sale attributes for chassis {editingSale?.chassisNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">File Number</label>
              <Input 
                type="number" 
                value={editFileNumber} 
                onChange={(e) => setEditFileNumber(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-black"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sale Date</label>
              <Input 
                type="date" 
                value={editSaleDate} 
                onChange={(e) => setEditSaleDate(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setEditingSale(null)}>
              Cancel
            </Button>
            <Button className="flex-1 h-11 rounded-xl font-black bg-blue-600 hover:bg-blue-700" onClick={handleUpdateSale}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">Revert Transaction?</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              This will delete the sale record for chassis <span className="text-slate-900 dark:text-slate-100 font-extrabold">{saleToDelete?.chassisNumber}</span> and revert the vehicle status to "In-Stock".
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-6">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setSaleToDelete(null)}>
              Abort
            </Button>
            <Button className="flex-1 h-11 rounded-xl font-black bg-red-600 hover:bg-red-700" onClick={confirmDeleteSale}>
              Confirm Reversal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnSale} onOpenChange={(open) => !open && setReturnSale(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-orange-600">Return Sale?</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              Mark sale for <span className="text-slate-900 dark:text-slate-100 font-extrabold">{returnSale?.chassisNumber}</span> as RETURNED. The vehicle will be moved back to the inventory as "In-Stock". This action keeps the sale history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Reason for Return</label>
              <Input
                placeholder="e.g. Scratches, Customer changed mind..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="h-11 rounded-xl font-medium border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-6">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setReturnSale(null)}>
              Cancel
            </Button>
            <Button className="flex-1 h-11 rounded-xl font-black bg-orange-600 hover:bg-orange-700 text-white" disabled={!returnReason.trim()} onClick={confirmReturnSale}>
              Confirm Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Search Purchased Inventory</DialogTitle>
            <DialogDescription className="font-medium">
              Only showing vehicles that have been processed through the purchase module.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filter by chassis, model or make..." 
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
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-4">Details</TableHead>
                  <TableHead className="w-10 px-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inStockVehicles
                  .filter(v => 
                    v.chassisNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    companies.find(c => c.id === v.companyId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(vehicle => (
                    <TableRow 
                      key={vehicle.chassisNumber} 
                      className="cursor-pointer hover:bg-slate-50 dark:bg-[#0f172a] group"
                      onClick={() => {
                        setSelectedChassis(vehicle.chassisNumber);
                        setIsSelectorOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <TableCell className="font-mono font-black text-sm px-4">{vehicle.chassisNumber}</TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {companies.find(c => c.id === vehicle.companyId)?.name}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase">
                            {vehicle.color} • In-Stock
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 text-right">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-emerald-600 border-emerald-100 bg-emerald-50">
                          Available
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                }
                {inStockVehicles.filter(v => 
                    v.chassisNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    companies.find(c => c.id === v.companyId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-slate-400 italic text-sm">
                      No matching purchased vehicles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={!!successModalData} onOpenChange={(open) => !open && setSuccessModalData(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
             <DialogTitle className="text-xl font-black text-emerald-600 flex items-center gap-2">
               <Check className="w-5 h-5" /> Sale Finalized
             </DialogTitle>
          </DialogHeader>
          {successModalData && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 border p-4 rounded-xl space-y-2">
                 <p className="font-bold text-slate-800">You have created file number: <span className="text-xl text-emerald-600">{successModalData.fileNumber}</span></p>
                 <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Customer: {successModalData.customerName}</p>
                 <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Chassis Number: {successModalData.chassisNumber}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-2">
             <Button variant="outline" onClick={() => setSuccessModalData(null)}>Close</Button>
             <Button 
               className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
               onClick={() => {
                 navigate('/process-document', { state: { saleId: successModalData?.saleId, tab: 'others_details' } });
                 setSuccessModalData(null);
               }}
             >
               Proceed to Document Process
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
