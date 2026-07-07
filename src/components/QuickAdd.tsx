import React, { useState } from 'react';
import { collection, addDoc, doc, setDoc, Timestamp, getDoc } from '@/lib/trackedFirestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useAuth } from '@/hooks/use-auth';
import { logAction } from '@/lib/audit';

export function QuickAddParty({ type, onAdded }: { type: 'vendor' | 'customer', onAdded?: (id: string) => void }) {
  const { refreshParties } = useGlobalData();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactNumber || !address) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'parties'), {
        name,
        contactNumber,
        address,
        type,
        createdAt: Timestamp.now(),
      });
      toast.success(`${type === 'vendor' ? 'Vendor' : 'Customer'} created successfully`);
      await refreshParties();
      if (onAdded) onAdded(docRef.id);
      setIsOpen(false);
      setName('');
      setContactNumber('');
      setAddress('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'parties');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-lg">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Add New {type === 'vendor' ? 'Vendor' : 'Customer'}</DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Quickly register a new {type} directly from this context.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name*</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required className="h-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number*</Label>
            <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact" required className="h-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address*</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" required className="h-10 rounded-lg" />
          </div>
          <DialogFooter className="pt-2">
             <Button type="submit" className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold">Register {type}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuickAddVehicle({ onAdded }: { onAdded?: (chassis: string, vehicleData?: any) => void }) {
  const { companies, models, refreshVehicles } = useGlobalData();
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [chassisNumber, setChassisNumber] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [modelId, setModelId] = useState('');
  const [color, setColor] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chassisNumber || !companyId || !modelId) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const chassisUpper = chassisNumber.toUpperCase();
      const vehicleRef = doc(db, 'vehicles', chassisUpper);
      const vehicleSnap = await getDoc(vehicleRef);
      if (vehicleSnap.exists()) {
        toast.error('Chassis number already exists in inventory');
        return;
      }
      
      const vehicleData = {
        chassisNumber: chassisUpper,
        companyId,
        modelId,
        color,
        registrationNumber: '',
        bluebookStatus: 'Not Received',
        naamsariStatus: 'Pending',
        status: 'ready-to-purchase',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      await setDoc(vehicleRef, vehicleData);
      
      if (user) {
         logAction(user.uid, user.email || '', 'CREATE', 'Vehicle', chassisUpper, vehicleData);
      }
      toast.success('Vehicle registered successfully');
      await refreshVehicles();
      if (onAdded) onAdded(chassisUpper, vehicleData);
      setIsOpen(false);
      setChassisNumber('');
      setCompanyId('');
      setModelId('');
      setColor('');
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'vehicles');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-lg">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Add New Vehicle</DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Quickly register a new chassis into inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chassis Number*</Label>
            <Input value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} placeholder="Chassis No" required className="h-10 rounded-lg uppercase" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company*</Label>
            <Select value={companyId} onValueChange={(val) => { setCompanyId(val); setModelId(''); }}>
               <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Brand" />
               </SelectTrigger>
               <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id ?? ''}>{c.name}</SelectItem>)}
               </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Model*</Label>
            <Select value={modelId} onValueChange={setModelId} disabled={!companyId}>
               <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Variant" />
               </SelectTrigger>
               <SelectContent>
                  {models.filter(m => m.companyId === companyId).map(m => (
                     <SelectItem key={m.id} value={m.id ?? ''}>{m.name}</SelectItem>
                  ))}
               </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Color</Label>
            <Select value={color} onValueChange={setColor}>
               <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Color" />
               </SelectTrigger>
               <SelectContent>
                  {['Blue', 'Green', 'Red', 'Yellow', 'Black', 'White', 'Silver', 'Grey'].map(c => (
                     <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
               </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
             <Button type="submit" className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold">Register Vehicle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
