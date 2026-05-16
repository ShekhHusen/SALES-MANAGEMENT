import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, where, Timestamp, orderBy, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Party } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Plus, Search, UserPlus, Trash2, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const partySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  address: z.string().min(2, 'Address is required'),
  contactNumber: z.string().min(7, 'Invalid contact number'),
  type: z.enum(['vendor', 'customer']),
});

type PartyFormValues = z.infer<typeof partySchema>;

export function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      address: '',
      contactNumber: '',
      type: 'customer',
    },
  });

  useEffect(() => {
    if (editingParty) {
      form.reset({
        name: editingParty.name,
        address: editingParty.address,
        contactNumber: editingParty.contactNumber,
        type: editingParty.type,
      });
    } else {
      form.reset({
        name: '',
        address: '',
        contactNumber: '',
        type: 'customer',
      });
    }
  }, [editingParty]);

  useEffect(() => {
    const q = query(collection(db, 'parties'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setParties(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Party)));
    });
    return unsubscribe;
  }, []);

  const onSubmit = async (values: PartyFormValues) => {
    try {
      if (editingParty) {
        await updateDoc(doc(db, 'parties', editingParty.id), {
          ...values,
          updatedAt: Timestamp.now(),
        });
        toast.success('Party updated successfully');
      } else {
        await addDoc(collection(db, 'parties'), {
          ...values,
          createdAt: Timestamp.now(),
        });
        toast.success('Party added successfully');
      }
      setIsDialogOpen(false);
      setEditingParty(null);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, editingParty ? OperationType.UPDATE : OperationType.CREATE, 'parties');
    }
  };

  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

  const confirmDeleteParty = async () => {
    if (!partyToDelete) return;
    try {
      await deleteDoc(doc(db, 'parties', partyToDelete.id));
      toast.success('Stakeholder record deleted');
      setPartyToDelete(null);
    } catch (error) {
      console.error("Delete Party Error:", error);
      toast.error('Failed to delete party record. It might be in use or forbidden.');
      handleFirestoreError(error, OperationType.DELETE, 'parties');
    }
  };

  const deleteParty = async (party: Party) => {
    // Check if used in purchases (as vendor)
    const purchaseQuery = query(collection(db, 'purchases'), where('vendorId', '==', party.id));
    const purchaseSnap = await getDocs(purchaseQuery);
    if (!purchaseSnap.empty) {
      toast.error(`Cannot delete "${party.name}". This vendor is linked to ${purchaseSnap.size} purchase invoices.`);
      return;
    }

    // Check if used in sales (as customer)
    const salesQuery = query(collection(db, 'sales'), where('customerId', '==', party.id));
    const salesSnap = await getDocs(salesQuery);
    if (!salesSnap.empty) {
      toast.error(`Cannot delete "${party.name}". This customer is linked to ${salesSnap.size} sales records.`);
      return;
    }

    setPartyToDelete(party);
  };

  const filteredParties = parties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.contactNumber.includes(search);
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const exportRecords = () => {
    try {
      const data = filteredParties.map(p => ({
        'Name': p.name,
        'Type': p.type,
        'Address': p.address,
        'Contact Number': p.contactNumber,
        'Onboarding Date': p.createdAt.toDate().toLocaleDateString('en-US')
      }));
      if (data.length === 0) {
        toast.error("No records to export.");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Parties');
      XLSX.writeFile(wb, 'Stakeholders_Records.xlsx');
      toast.success('Stakeholder records exported');
    } catch(err) {
      toast.error('Failed to export stakeholder records');
    }
  };

  return (
    <div className="flex flex-col flex-1 gap-4 h-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 mb-1">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Stakeholder Management</h1>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingParty(null);
        }}>
          <DialogTrigger
            render={
              <Button className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm font-bold gap-2 px-6">
                <Plus className="h-4.5 w-4.5" /> Initialize New Party
              </Button>
            }
          />
          <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-0">
            <div className="p-8 bg-[#0F172A] text-white">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-blue-400 border-blue-400 uppercase text-[10px] font-black">Registration</Badge>
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">{editingParty ? 'Update Party' : 'Party Intelligence'}</DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">{editingParty ? 'Refine identity details.' : 'Capture core identification and contact data.'}</DialogDescription>
              </DialogHeader>
            </div>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="space-y-6">
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <Button 
                    type="button" 
                    variant="ghost"
                    className={cn(
                      "flex-1 h-10 rounded-lg text-xs font-black uppercase transition-all",
                      form.watch('type') === 'customer' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
                    )}
                    onClick={() => form.setValue('type', 'customer')}
                  >
                    End Customer
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost"
                    className={cn(
                      "flex-1 h-10 rounded-lg text-xs font-black uppercase transition-all",
                      form.watch('type') === 'vendor' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
                    )}
                    onClick={() => form.setValue('type', 'vendor')}
                  >
                    Vendor Partner
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Name / Business Name</label>
                    <Input {...form.register('name')} placeholder="Identify the person or entity" className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white" />
                    {form.formState.errors.name && <p className="text-[10px] font-bold text-red-500">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Contact Line</label>
                    <Input {...form.register('contactNumber')} placeholder="+977- ..." className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white" />
                    {form.formState.errors.contactNumber && <p className="text-[10px] font-bold text-red-500">{form.formState.errors.contactNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Residential / Corporate Address</label>
                    <Input {...form.register('address')} placeholder="Location details for documentation" className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:bg-white" />
                    {form.formState.errors.address && <p className="text-[10px] font-bold text-red-500">{form.formState.errors.address.message}</p>}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/10">
                  {editingParty ? 'Update Record' : 'Commit Registration'}
                </Button>
                <Button type="button" variant="ghost" className="h-10 text-slate-400 font-bold text-xs" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingParty(null);
                }}>Abort Process</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 px-4 rounded-xl border border-slate-200 shadow-sm dark:bg-card shrink-0">
        <div className="relative flex-1 sm:max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by Name or Contact..." 
            className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Tabs value={filterType} onValueChange={(val) => setFilterType(val)} className="w-full sm:w-auto">
            <TabsList className="bg-slate-50 p-1 rounded-lg h-10 border border-slate-100">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 rounded-md text-xs font-bold h-8">Everything</TabsTrigger>
              <TabsTrigger value="customer" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 rounded-md text-xs font-bold h-8">Customers</TabsTrigger>
              <TabsTrigger value="vendor" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 rounded-md text-xs font-bold h-8">Vendors</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" className="h-10 rounded-lg text-slate-600 border-slate-200" onClick={exportRecords}>
            <Download className="h-4 w-4 mr-2" />
            Export Records
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0 [&_[data-slot=table-container]]:flex-1 [&_[data-slot=table-container]]:min-h-0 [&_[data-slot=table-container]]:overflow-auto">
          <Table>
            <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Principal Identity</TableHead>
                  <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 text-center">Classification</TableHead>
                  <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Contact Line</TableHead>
                  <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Registry Address</TableHead>
                  <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Onboarding Date</TableHead>
                  <TableHead className="py-2.5 px-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParties.length > 0 ? (
                filteredParties.map((party) => (
                  <TableRow key={party.id} className="hover:bg-slate-50/40 border-b border-slate-100 last:border-0 transition-colors">
                    <TableCell className="px-6 py-2.5 font-extrabold text-slate-900">{party.name}</TableCell>
                    <TableCell className="px-6 py-2.5 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm border",
                        party.type === 'customer' 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {party.type}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-2.5 font-black text-blue-600 text-xs">{party.contactNumber}</TableCell>
                    <TableCell className="px-6 py-2.5 text-sm font-medium text-slate-500">{party.address}</TableCell>
                    <TableCell className="px-6 py-2.5 text-xs font-bold text-slate-400">
                      {party.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="px-6 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setEditingParty(party);
                            setIsDialogOpen(true);
                          }}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteParty(party)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                       <UserPlus className="h-8 w-8 text-slate-200" />
                       <p className="text-slate-400 font-bold text-sm tracking-tight italic">No stakeholders identified in this segment.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={!!partyToDelete} onOpenChange={(open) => !open && setPartyToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">Delete Stakeholder?</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              This will permanently delete the stakeholder <span className="text-slate-900 font-extrabold">{partyToDelete?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-6">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setPartyToDelete(null)}>
              Abort
            </Button>
            <Button className="flex-1 h-11 rounded-xl font-black bg-red-600 hover:bg-red-700" onClick={confirmDeleteParty}>
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
