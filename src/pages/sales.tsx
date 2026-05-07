import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp, writeBatch, doc, getDocs, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Company, Model, Party, Vehicle, Sale } from '@/types';
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
import { BadgeDollarSign, Car, User, FileText, Search, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

export function Sales() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [inStockVehicles, setInStockVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  
  const [selectedChassis, setSelectedChassis] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [editColor, setEditColor] = useState('');
  
  // Selection Dialog State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sales, setSales] = useState<(Sale & { id: string })[]>([]);

  // Edit Sale State
  const [editingSale, setEditingSale] = useState<(Sale & { id: string }) | null>(null);
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editFileNumber, setEditFileNumber] = useState<number | string>('');

  useEffect(() => {
    onSnapshot(collection(db, 'companies'), (s) => setCompanies(s.docs.map(d => ({ ...d.data(), id: d.id } as Company))));
    onSnapshot(collection(db, 'models'), (s) => setModels(s.docs.map(d => ({ ...d.data(), id: d.id } as Model))));
    onSnapshot(collection(db, 'vehicles'), (s) => setAllVehicles(s.docs.map(d => ({ ...d.data(), chassisNumber: d.id } as Vehicle))));
    
    // Listen for in-stock vehicles
    onSnapshot(query(collection(db, 'vehicles'), where('status', '==', 'in-stock')), (s) => {
      const vehicles = s.docs.map(d => ({ ...d.data(), chassisNumber: d.id } as Vehicle));
      setInStockVehicles(vehicles.filter(v => !!v.purchaseId));
    });
    
    onSnapshot(query(collection(db, 'parties'), where('type', '==', 'customer')), (s) => setCustomers(s.docs.map(d => ({ ...d.data(), id: d.id } as Party))));
    onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc')), (s) => setSales(s.docs.map(d => ({ ...d.data(), id: d.id } as (Sale & { id: string })))));
  }, []);

  const openEditSale = (sale: Sale & { id: string }) => {
    setEditingSale(sale);
    setEditSaleDate(sale.date instanceof Timestamp ? sale.date.toDate().toISOString().split('T')[0] : String(sale.date));
    setEditFileNumber(sale.fileNumber);
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
      toast.success('Sale record updated successfully');
      setEditingSale(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'sales');
    }
  };

  const [saleToDelete, setSaleToDelete] = useState<(Sale & { id: string }) | null>(null);

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    try {
      const batch = writeBatch(db);
      
      // 1. Revert vehicle status if it exists
      const vehicleRef = doc(db, 'vehicles', saleToDelete.chassisNumber);
      const vehicleDoc = await getDoc(vehicleRef);
      
      if (vehicleDoc.exists()) {
        batch.update(vehicleRef, {
          status: 'in-stock',
          saleId: null,
          currentOwnerId: null,
          updatedAt: Timestamp.now(),
        });
      }

      // 2. Delete sale record
      batch.delete(doc(db, 'sales', saleToDelete.id));

      await batch.commit();
      toast.success('Sale record deleted successfully');
      setSaleToDelete(null);
    } catch (error) {
      console.error("Delete Sale Error:", error);
      toast.error('Failed to delete sale record. Please check if you have required permissions.');
      handleFirestoreError(error, OperationType.DELETE, 'sales');
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
      const salesQuery = query(
        collection(db, 'sales'), 
        where('companyId', '==', currentVehicle.companyId),
        orderBy('fileNumber', 'desc'),
        limit(1)
      );
      const salesSnap = await getDocs(salesQuery);
      let nextFileNumber = 1;
      if (!salesSnap.empty) {
        nextFileNumber = salesSnap.docs[0].data().fileNumber + 1;
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
      toast.success(`Sale recorded. File Number: ${nextFileNumber}`);
      
      // Reset
      setSelectedChassis('');
      setSelectedCustomer('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sales Desk</h1>
          <p className="text-sm text-slate-500 font-medium">Coordinate vehicle sales, execute documentation, and finalize registries.</p>
        </div>
        <Button 
          onClick={handleSaveSale} 
          size="lg" 
          disabled={!selectedChassis || !selectedCustomer}
          className="rounded-xl h-12 px-8 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 font-bold"
        >
          Finalize Transaction
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Selection */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Car className="h-4 w-4" /> Vehicle Selection
                </h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Chassis</label>
                  <div className="relative flex items-center gap-2">
                    <Select value={selectedChassis} onValueChange={setSelectedChassis}>
                      <SelectTrigger className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 flex-1">
                        <SelectValue placeholder="Identify Unit by Chassis Number" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
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
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12 rounded-xl shrink-0 border-slate-200"
                      onClick={() => setIsSelectorOpen(true)}
                    >
                      <Search className="h-5 w-5 text-slate-400" />
                    </Button>
                  </div>
                </div>

                {currentVehicle && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                     <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manufacturer</span>
                        <span className="font-extrabold text-blue-600">{companies.find(c => c.id === currentVehicle.companyId)?.name}</span>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Finish Assignment</label>
                        <Select value={editColor} onValueChange={setEditColor}>
                          <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200">
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

            <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer Mapping
                </h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Customer</label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all h-12">
                      <SelectValue placeholder="Identify Registered Party" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id} className="py-3">
                           <div className="flex flex-col">
                              <span className="font-bold text-sm">{c.name}</span>
                              <span className="text-[10px] uppercase font-black text-slate-400 tracking-tight">{c.contactNumber}</span>
                           </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedCustomer && (
                  <div className="rounded-xl border-2 border-dashed border-slate-100 p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Registry Address</p>
                       <p className="text-sm font-bold text-slate-700">{customers.find(c => c.id === selectedCustomer)?.address}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
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
          <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Registry Attributes
              </h3>
            </div>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Date</label>
                <Input 
                  type="date" 
                  value={saleDate} 
                  onChange={(e) => setSaleDate(e.target.value)} 
                  className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl font-black">Sales History</CardTitle>
          <CardDescription>Detailed overview of all vehicle sales transactions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">SN</TableHead>
                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Sale Dates</TableHead>
                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">File#</TableHead>
                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Details</TableHead>
                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Customer Details</TableHead>
                <TableHead className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Document Status</TableHead>
                <TableHead className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale, index) => {
                const vehicle = allVehicles.find(v => v.chassisNumber === sale.chassisNumber);
                const customer = customers.find(c => c.id === sale.customerId);
                const company = companies.find(c => c.id === sale.companyId);
                const model = models.find(m => m.id === vehicle?.modelId);

                return (
                  <TableRow key={sale.id} className="hover:bg-slate-50/50 border-transparent divide-x divide-slate-100">
                    <TableCell className="px-4 py-4 text-center font-bold text-slate-500">{index + 1}</TableCell>
                    <TableCell className="px-4 py-4 font-bold text-slate-700">
                      {sale.date instanceof Timestamp 
                        ? sale.date.toDate().toLocaleDateString('en-GB') 
                        : String(sale.date)}
                    </TableCell>
                    <TableCell className="px-4 py-4 font-black text-slate-900">
                      #{sale.fileNumber}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-sm uppercase text-slate-900">{sale.chassisNumber}</span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {company?.name} - {model?.name}
                        </span>
                        <span className="text-[10px] font-black text-blue-600 uppercase">
                          {vehicle?.color}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-sm uppercase text-slate-900">{customer?.name}</span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          {customer?.address}
                        </span>
                        <span className="text-[10px] font-black text-slate-400">
                          {customer?.contactNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border-none bg-slate-100 text-slate-600 ${vehicle?.bluebookStatus === 'Received' ? 'bg-emerald-100 text-emerald-700' : ''}`}>
                          {vehicle?.bluebookStatus || 'NOT RECEIVED'}
                        </Badge>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border-none bg-slate-100 text-slate-600 ${vehicle?.naamsariStatus === 'Customer Done' ? 'bg-blue-100 text-blue-700' : ''}`}>
                          {vehicle?.naamsariStatus || 'PENDING'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                          onClick={() => openEditSale(sale)}
                        >
                          EDIT
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setSaleToDelete(sale)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-slate-400 italic font-medium">
                    No sales records logged yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sale Date</label>
              <Input 
                type="date" 
                value={editSaleDate} 
                onChange={(e) => setEditSaleDate(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
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
              This will delete the sale record for chassis <span className="text-slate-900 font-extrabold">{saleToDelete?.chassisNumber}</span> and revert the vehicle status to "In-Stock".
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
              className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold"
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-4 rounded-xl border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
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
                      className="cursor-pointer hover:bg-slate-50 group"
                      onClick={() => {
                        setSelectedChassis(vehicle.chassisNumber);
                        setIsSelectorOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <TableCell className="font-mono font-black text-sm px-4">{vehicle.chassisNumber}</TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600">
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
    </div>
  );
}
