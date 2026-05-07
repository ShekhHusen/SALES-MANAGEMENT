import { useState, useEffect, FormEvent } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, getDoc, setDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Vehicle, Company, Model, BluebookStatus, NaamsariStatus, Purchase, Sale, Party } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, FileText, Info, ShoppingBag, BadgeDollarSign, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function Inventory() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<Purchase | null>(null);
  const [saleDetails, setSaleDetails] = useState<Sale | null>(null);
  const [parties, setParties] = useState<Party[]>([]);

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
    status: 'in-stock' as 'in-stock' | 'sold',
  });

  useEffect(() => {
    const q = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
    const unsubVehicles = onSnapshot(q, (s) => setVehicles(s.docs.map(d => ({ ...d.data(), chassisNumber: d.id } as Vehicle))));
    onSnapshot(collection(db, 'companies'), (s) => setCompanies(s.docs.map(d => ({ ...d.data(), id: d.id } as Company))));
    onSnapshot(collection(db, 'models'), (s) => setModels(s.docs.map(d => ({ ...d.data(), id: d.id } as Model))));
    onSnapshot(collection(db, 'parties'), (s) => setParties(s.docs.map(d => ({ ...d.data(), id: d.id } as Party))));
    
    return () => unsubVehicles();
  }, []);

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
        status: 'in-stock',
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

  const updateDocStatus = async (chassisNumber: string, bluebook: BluebookStatus, naamsari: NaamsariStatus) => {
    try {
      const vehicleRef = doc(db, 'vehicles', chassisNumber);
      await updateDoc(vehicleRef, {
        bluebookStatus: bluebook,
        naamsariStatus: naamsari,
        updatedAt: Timestamp.now(),
      });
      toast.success('Status updated');
      setSelectedVehicle(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicles/${chassisNumber}`);
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

    if (!window.confirm(`Are you sure you want to delete vehicle ${vehicle.chassisNumber}?`)) return;

    try {
      await deleteDoc(doc(db, 'vehicles', vehicle.chassisNumber));
      toast.success('Vehicle deleted from inventory');
    } catch (error) {
      console.error("Delete Vehicle Error:", error);
      toast.error('Could not delete vehicle. Permissions or database error.');
      handleFirestoreError(error, OperationType.DELETE, `vehicles/${vehicle.chassisNumber}`);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.chassisNumber.toLowerCase().includes(search.toLowerCase()) || 
                          v.registrationNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Vehicle Inventory</h1>
        <p className="text-sm text-slate-500 font-medium">Monitor chassis records and document lifecycle progress.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm dark:bg-card">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by Chassis Number..." 
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-10 rounded-lg border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Inventory</SelectItem>
              <SelectItem value="in-stock">In Stock Units</SelectItem>
              <SelectItem value="sold">Sold Units</SelectItem>
            </SelectContent>
          </Select>
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
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold"
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
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
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
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
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
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold"
                      value={newVehicle.color}
                      onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reg Number</Label>
                    <Input 
                      id="reg" 
                      placeholder="Registration info" 
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold"
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
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
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
          <Button variant="outline" className="h-10 rounded-lg text-slate-600 border-slate-200">
            Export Records
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                <TableHead className="py-4 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Chassis No</TableHead>
                <TableHead className="py-4 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Make & Model</TableHead>
                <TableHead className="py-4 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Color</TableHead>
                <TableHead className="py-4 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Inventory Status</TableHead>
                <TableHead className="py-4 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Bluebook</TableHead>
                <TableHead className="py-4 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Naamsari</TableHead>
                <TableHead className="py-4 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.chassisNumber} className="hover:bg-slate-50/40 border-b border-slate-100 last:border-0 transition-colors">
                  <TableCell className="px-6 py-4 font-mono font-bold text-slate-700 text-sm">{vehicle.chassisNumber}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{companies.find(c => c.id === vehicle.companyId)?.name}</span>
                      <span className="text-xs text-slate-500 font-medium">{models.find(m => m.id === vehicle.modelId)?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-600">{vehicle.color}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className={cn("h-2 w-2 rounded-full", vehicle.status === 'in-stock' ? "bg-emerald-500" : "bg-slate-300")} />
                       <span className={cn("text-xs font-bold capitalize", vehicle.status === 'in-stock' ? "text-emerald-700" : "text-slate-500")}>
                        {vehicle.status === 'in-stock' ? 'In-Stock' : 'Sold'}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm border",
                      vehicle.bluebookStatus === 'Received' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {vehicle.bluebookStatus}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm border",
                      vehicle.naamsariStatus === 'Customer Done' 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                        : vehicle.naamsariStatus === 'Names of JBMT'
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {vehicle.naamsariStatus}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-primary hover:bg-primary/5 font-bold text-xs" onClick={() => fetchExtendedDetails(vehicle)}>
                            <Info className="h-3.5 w-3.5 mr-1" /> View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-none shadow-2xl p-0">
                        <div className="p-8 bg-[#0F172A] text-white overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-12 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                           <DialogHeader className="relative z-10">
                              <div className="flex items-center gap-3 mb-2">
                                 <Badge variant="outline" className="text-blue-400 border-blue-400 uppercase text-[10px] font-black">History Log</Badge>
                                 <span className="text-slate-500 text-xs font-mono">{vehicle.chassisNumber}</span>
                              </div>
                              <DialogTitle className="text-2xl font-black tracking-tight">Lifecycle Intelligence</DialogTitle>
                           </DialogHeader>
                        </div>
                        
                        <div className="p-8 space-y-8">
                          {/* Section 1: Chassis Details */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-400">
                              Chassis Identity
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border border-slate-100 p-6 bg-slate-50/50">
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Company</p>
                                <p className="font-extrabold text-slate-900">{companies.find(c => c.id === vehicle.companyId)?.name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Model</p>
                                <p className="font-extrabold text-slate-900">{models.find(m => m.id === vehicle.modelId)?.name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Color</p>
                                <p className="font-extrabold text-slate-900">{vehicle.color}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Initial Log</p>
                                <p className="font-extrabold text-slate-900">{vehicle.createdAt.toDate().toLocaleDateString()}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Bluebook</label>
                                <Select 
                                  value={selectedVehicle?.bluebookStatus} 
                                  onValueChange={(val: BluebookStatus) => {
                                    if (selectedVehicle) setSelectedVehicle({ ...selectedVehicle, bluebookStatus: val });
                                  }}
                                >
                                  <SelectTrigger className="h-10 rounded-lg border-slate-200">
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
                                  <SelectTrigger className="h-10 rounded-lg border-slate-200">
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
                            <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20" onClick={() => selectedVehicle && updateDocStatus(selectedVehicle.chassisNumber, selectedVehicle.bluebookStatus, selectedVehicle.naamsariStatus)}>
                              Commit Status Changes
                            </Button>
                          </div>

                          <Separator className="bg-slate-100" />

                          {/* Section 2: Purchase Details */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-blue-500">
                              Purchase Origination
                            </h3>
                            {purchaseDetails ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-xl border border-blue-50 p-6 bg-blue-50/30">
                                <div>
                                  <p className="text-[10px] text-blue-400 font-black uppercase">Date</p>
                                  <p className="font-extrabold text-slate-900">{purchaseDetails.date.toDate().toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-blue-400 font-black uppercase">Invoice #</p>
                                  <p className="font-extrabold text-slate-900">{purchaseDetails.invoiceNumber}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-blue-400 font-black uppercase">Vendor Partner</p>
                                  <p className="font-extrabold text-slate-900">{parties.find(p => p.id === purchaseDetails.vendorId)?.name}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest italic">Inventory seed data only</p>
                            )}
                          </div>

                          <Separator className="bg-slate-100" />

                          {/* Section 3: Sales Details */}
                          <div className="space-y-4">
                            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-emerald-500">
                              Sales Culmination
                            </h3>
                            {saleDetails ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-xl border border-emerald-50 p-6 bg-emerald-50/30">
                                <div>
                                  <p className="text-[10px] text-emerald-400 font-black uppercase">Sale Date</p>
                                  <p className="font-extrabold text-slate-900">{saleDetails.date.toDate().toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-400 font-black uppercase">File Reference</p>
                                  <p className="font-black text-blue-600">REF-{saleDetails.fileNumber.toString().padStart(4, '0')}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-400 font-black uppercase">End Customer</p>
                                  <p className="font-extrabold text-slate-900 truncate">{parties.find(p => p.id === saleDetails.customerId)?.name}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest italic">Pending Commercial Completion</p>
                            )}
                          </div>
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
              ))}
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                       <Search className="h-8 w-8 text-slate-200" />
                       <p className="text-slate-400 font-bold text-sm">No chassis segments matched your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

