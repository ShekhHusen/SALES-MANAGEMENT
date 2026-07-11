import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, where, writeBatch } from '@/lib/trackedFirestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Company, Model } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Plus, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';

import { ImportData } from '@/components/ImportData';
import { ExportData } from '@/components/ExportData';
import { BackupRestore } from '@/components/BackupRestore';

import { useGlobalData } from '@/contexts/GlobalDataContext';

export function Settings() {
  const { companies, models, colors } = useGlobalData();
  const { hasSetPassword, setUserPassword, user, resetPassword } = useAuth();
  
  const [newCompany, setNewCompany] = useState('');
  const [newModel, setNewModel] = useState({ name: '', companyId: '' });
  const [newColor, setNewColor] = useState('');
  const [isBrandExpanded, setIsBrandExpanded] = useState(false);
  const [isVariantExpanded, setIsVariantExpanded] = useState(false);
  const [isColorExpanded, setIsColorExpanded] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    expectedText?: string;
    onConfirm: () => void;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  const addCompany = async () => {
    if (!newCompany.trim()) return;
    try {
      await addDoc(collection(db, 'companies'), { name: newCompany });
      setNewCompany('');
      toast.success('Company added');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'companies');
    }
  };

  const addModel = async () => {
    if (!newModel.name.trim() || !newModel.companyId) return;
    try {
      await addDoc(collection(db, 'models'), newModel);
      setNewModel({ name: '', companyId: '' });
      toast.success('Model added');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'models');
    }
  };

  const addColor = async () => {
    if (!newColor.trim()) return;
    try {
      await addDoc(collection(db, 'colors'), { name: newColor });
      setNewColor('');
      toast.success('Color added');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'colors');
    }
  };

  const [itemToDelete, setItemToDelete] = useState<{ col: string, id: string, name: string } | null>(null);

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const { col, id, name } = itemToDelete;

    try {
      await deleteDoc(doc(db, col, id));
      toast.success('Item deleted');
      setItemToDelete(null);
    } catch (error) {
      console.error("Delete Settings Item Error:", error);
      toast.error('Failed to delete item. It might be in use elsewhere.');
      handleFirestoreError(error, OperationType.DELETE, col);
    }
  };

  const attemptDeleteItem = async (col: string, id: string, name: string) => {
    if (col === 'companies') {
      // Check if any model refers to this company
      const modelQuery = query(collection(db, 'models'), where('companyId', '==', id));
      const modelSnap = await getDocs(modelQuery);
      if (!modelSnap.empty) {
        toast.error(`Cannot delete brand "${name}". There are ${modelSnap.size} variants associated with it.`);
        return;
      }
    }

    if (col === 'models') {
      // Check if any vehicle refers to this model
      const vehicleQuery = query(collection(db, 'vehicles'), where('modelId', '==', id));
      const vehicleSnap = await getDocs(vehicleQuery);
      if (!vehicleSnap.empty) {
        toast.error(`Cannot delete variant "${name}". There are ${vehicleSnap.size} vehicles in inventory using this model.`);
        return;
      }
    }

    setItemToDelete({ col, id, name });
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setSettingPassword(true);
    try {
      await setUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {}
    setSettingPassword(false);
  };

  return (
    <div className="space-y-8 pb-10 h-full overflow-y-auto pr-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Configuration</h1>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-8">
        <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Security & Authentication</h3>
        </div>
        <CardContent className="p-6">
          {!hasSetPassword && typeof hasSetPassword === 'boolean' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-500">
                  You signed in via Google. Set a password for your account so you can also log in using your email and password directly.
                </p>
              </div>
              <div className="flex flex-col gap-3 max-w-sm">
                <Input 
                  type="password"
                  placeholder="Enter a secure password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white dark:bg-slate-900 h-11"
                />
                <Input 
                  type="password"
                  placeholder="Re-enter password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white dark:bg-slate-900 h-11"
                />
                <Button onClick={handleSetPassword} disabled={settingPassword} className="font-bold h-11 w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900">
                  {settingPassword ? 'Saving...' : 'Set Password'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Password Management</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Your account is protected with a password. If you want to change your password, you can request a secure reset link.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="font-bold shrink-0 h-11 px-6 shadow-sm" 
                onClick={async () => {
                  if (!user?.email) {
                    toast.error('No email address found for your account.');
                    return;
                  }
                  await resetPassword(user.email);
                }}
              >
                Send Reset Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Companies Section */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div 
            className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setIsBrandExpanded(!isBrandExpanded)}
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Brand Directory</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:bg-[#0f172a]">
              {isBrandExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {isBrandExpanded && (
            <CardContent className="p-6 space-y-6">
            <div className="flex gap-2">
              <Input 
                placeholder="Manufacturer Name..." 
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
              />
              <Button onClick={addCompany} className="h-11 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold px-6">
                <Plus className="h-4 w-4 mr-2" /> Register Brand
              </Button>
            </div>
            
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Manufacturer</TableHead>
                    <TableHead className="w-16 px-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.length > 0 ? (
                    companies.map((company) => (
                      <TableRow key={company.id} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-transparent">
                        <TableCell className="px-6 py-4 font-extrabold text-slate-900 dark:text-slate-100">{company.name}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => attemptDeleteItem('companies', company.id, company.name)} className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-12 text-slate-400 italic text-xs font-bold">No registered brands</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          )}
        </Card>

        {/* Models Section */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div 
            className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setIsVariantExpanded(!isVariantExpanded)}
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Variant Manifest</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:bg-[#0f172a]">
              {isVariantExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {isVariantExpanded && (
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-3">
              <Select 
                value={newModel.companyId} 
                onValueChange={(val) => setNewModel(prev => ({ ...prev, companyId: val }))}
              >
                <SelectTrigger className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all">
                  <SelectValue placeholder="Attribute to Brand" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-medium">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input 
                  placeholder="Variant/Model Name..." 
                  value={newModel.name}
                  onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                />
                <Button onClick={addModel} className="h-11 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold px-6">
                  <Plus className="h-4 w-4 mr-2" /> Add Variant
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Variant Identity</TableHead>
                    <TableHead className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Brand Parent</TableHead>
                    <TableHead className="w-16 px-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.length > 0 ? (
                    models.map((model) => (
                      <TableRow key={model.id} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-transparent">
                        <TableCell className="px-6 py-4 font-extrabold text-slate-900 dark:text-slate-100">{model.name}</TableCell>
                        <TableCell className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black uppercase tracking-tight text-slate-500">
                            {companies.find(c => c.id === model.companyId)?.name || 'Orphaned'}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => attemptDeleteItem('models', model.id, model.name)} className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-slate-400 italic text-xs font-bold">No registered variants</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          )}
        </Card>
        
        {/* Colors Section */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div 
            className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setIsColorExpanded(!isColorExpanded)}
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Vehicle Colors</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:bg-[#0f172a]">
              {isColorExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {isColorExpanded && (
            <CardContent className="p-6 space-y-6">
            <div className="flex gap-2">
              <Input 
                placeholder="Color Name..." 
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
              />
              <Button onClick={addColor} className="h-11 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold px-6">
                <Plus className="h-4 w-4 mr-2" /> Add Color
              </Button>
            </div>
            
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Color</TableHead>
                    <TableHead className="w-16 px-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colors.length > 0 ? (
                    colors.map((color) => (
                      <TableRow key={color.id} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-transparent">
                        <TableCell className="px-6 py-4 font-extrabold text-slate-900 dark:text-slate-100">{color.name}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => attemptDeleteItem('colors', color.id, color.name)} className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-12 text-slate-400 italic text-xs font-bold">No registered colors</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">Delete Item?</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              This will permanently delete <span className="text-slate-900 dark:text-slate-100 font-extrabold">{itemToDelete?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-6">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setItemToDelete(null)}>
              Abort
            </Button>
            <Button className="flex-1 h-11 rounded-xl font-black bg-red-600 hover:bg-red-700" onClick={confirmDeleteItem}>
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmAction} onOpenChange={(open) => {
        if (!open) {
            setConfirmAction(null);
            setConfirmInput('');
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-red-200 dark:border-red-900/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600 dark:text-red-500">{confirmAction?.title}</DialogTitle>
            <DialogDescription className="font-medium text-slate-600 dark:text-slate-400">
              {confirmAction?.description}
            </DialogDescription>
          </DialogHeader>
          {confirmAction?.expectedText && (
            <div className="pt-4 pb-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Copy this text: <span className="text-red-600 select-all">{confirmAction.expectedText}</span>
               </label>
               <Input 
                 autoFocus
                 value={confirmInput} 
                 onChange={e => setConfirmInput(e.target.value)} 
                 className="h-10 font-mono text-center font-bold"
                 placeholder={confirmAction.expectedText} 
               />
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => {
              setConfirmAction(null);
              setConfirmInput('');
            }}>
              Cancel
            </Button>
            <Button 
               disabled={confirmAction?.expectedText ? confirmInput !== confirmAction.expectedText : false}
               className="flex-1 h-11 rounded-xl font-black bg-red-600 hover:bg-red-700 text-white" 
               onClick={() => {
                  if (confirmAction) {
                      confirmAction.onConfirm();
                      setConfirmAction(null);
                      setConfirmInput('');
                  }
               }}
            >
              {confirmAction?.actionLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportData />
      <ExportData />
      <BackupRestore />

      {/* Danger Zone */}
      <Card className="shadow-sm border-red-200 dark:border-red-900 rounded-xl overflow-hidden mt-8">
        <div className="bg-red-50 dark:bg-red-900/10 px-6 py-4 border-b border-red-200 dark:border-red-900">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-600 dark:text-red-500">Danger Zone</h3>
        </div>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            
            {/* Clear Sales */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Clear All Sales</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Deletes all sales records and resets linked vehicles back to 'in-stock'.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="font-bold shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setConfirmAction({
                    title: "Clear All Sales?",
                    description: "Are you sure you want to clear ALL sales? This will reset all sold vehicles to 'in-stock'.",
                    actionLabel: "Clear Sales",
                    onConfirm: async () => {
                      try {
                        const salesSnap = await getDocs(query(collection(db, 'sales')));
                        let count = 0;
                        let batch = writeBatch(db);
                        let ops = 0;
                        
                        for (const d of salesSnap.docs) {
                          const chassis = d.data().chassisNumber;
                          if (chassis) {
                            batch.update(doc(db, 'vehicles', chassis), { status: 'in-stock', saleId: null });
                            ops++;
                          }
                          batch.delete(d.ref);
                          count++;
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
                        toast.success(`Successfully cleared ${count} sales records.`);
                      } catch (err) {
                        toast.error('Failed to clear sales.');
                      }
                    }
                  });
                }}
              >
                Clear Sales
              </Button>
            </div>

            {/* Clear Purchases */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Clear All Purchases</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Deletes purchases and their in-stock vehicles. Skips purchases linked to sold vehicles.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="font-bold shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setConfirmAction({
                    title: "Clear All Purchases?",
                    description: "Are you sure you want to clear ALL purchases? Purchases having sold vehicles will be skipped.",
                    actionLabel: "Clear Purchases",
                    onConfirm: async () => {
                      try {
                        const purchSnap = await getDocs(query(collection(db, 'purchases')));
                        const salesSnap = await getDocs(query(collection(db, 'sales')));
                        const vehSnap = await getDocs(query(collection(db, 'vehicles')));
                        
                        const soldChassis = new Set([
                          ...vehSnap.docs.filter(v => v.data().status === 'sold' || v.data().saleId).map(v => v.data().chassisNumber),
                          ...salesSnap.docs.map(s => s.data().chassisNumber).filter(Boolean)
                        ]);
                        
                        let deleted = 0;
                        let skipped = 0;
                        let batch = writeBatch(db);
                        let ops = 0;

                        for (const d of purchSnap.docs) {
                          const chassisArr = d.data().chassisNumbers || [];
                          const hasSold = chassisArr.some((c: string) => soldChassis.has(c));
                          if (hasSold) {
                            skipped++;
                          } else {
                            for (const c of chassisArr) {
                              batch.delete(doc(db, 'vehicles', c));
                              ops++;
                              if (ops >= 400) {
                                  await batch.commit();
                                  batch = writeBatch(db);
                                  ops = 0;
                              }
                            }
                            batch.delete(d.ref);
                            deleted++;
                            ops++;
                            
                            if (ops >= 400) {
                                await batch.commit();
                                batch = writeBatch(db);
                                ops = 0;
                            }
                          }
                        }

                        if (ops > 0) {
                            await batch.commit();
                        }
                        toast.success(`Cleared ${deleted} purchases. Skipped ${skipped} linked to sales.`);
                      } catch (err) {
                        toast.error('Failed to clear purchases.');
                      }
                    }
                  });
                }}
              >
                Clear Purchases
              </Button>
            </div>

            {/* Clear Vehicles */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Clear All Inventory (Vehicles)</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Deletes all inventory not linked to any purchase or sale.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="font-bold shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setConfirmAction({
                    title: "Clear Standalone Inventory?",
                    description: "Are you sure you want to clear standalone inventory? Vehicles linked to purchases or sales will be preserved.",
                    actionLabel: "Clear Vehicles",
                    onConfirm: async () => {
                      try {
                        const vehSnap = await getDocs(query(collection(db, 'vehicles')));
                        const salesSnap = await getDocs(query(collection(db, 'sales')));
                        const purchSnap = await getDocs(query(collection(db, 'purchases')));
                        
                        const usedChassis = new Set([
                          ...salesSnap.docs.map(s => s.data().chassisNumber).filter(Boolean)
                        ]);
                        
                        for (const p of purchSnap.docs) {
                          const arr = p.data().chassisNumbers || [];
                          for (const c of arr) if (c) usedChassis.add(c);
                        }

                        let deleted = 0;
                        let skipped = 0;
                        let batch = writeBatch(db);
                        let ops = 0;
                        
                        for (const d of vehSnap.docs) {
                          const data = d.data();
                          if (data.status === 'sold' || data.saleId || usedChassis.has(data.chassisNumber) || usedChassis.has(d.id)) {
                            skipped++;
                          } else {
                            batch.delete(d.ref);
                            deleted++;
                            ops++;
                            
                            if (ops >= 400) {
                                await batch.commit();
                                batch = writeBatch(db);
                                ops = 0;
                            }
                          }
                        }
                        
                        if (ops > 0) {
                            await batch.commit();
                        }
                        toast.success(`Cleared ${deleted} standalone vehicles. Skipped ${skipped} linked vehicles.`);
                      } catch (err) {
                        toast.error('Failed to clear inventory.');
                      }
                    }
                  });
                }}
              >
                Clear Vehicles
              </Button>
            </div>

            {/* Clear Parties */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Clear All Parties</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Deletes vendors and customers. Parties linked to sales or purchases are skipped.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="font-bold shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setConfirmAction({
                    title: "Clear All Parties?",
                    description: "Are you sure you want to clear parties? Linked parties will be kept.",
                    actionLabel: "Clear Parties",
                    onConfirm: async () => {
                      try {
                        const partiesSnap = await getDocs(query(collection(db, 'parties')));
                        const salesSnap = await getDocs(query(collection(db, 'sales')));
                        const purchSnap = await getDocs(query(collection(db, 'purchases')));
                        
                        const usedIds = new Set([
                          ...salesSnap.docs.map(s => s.data().customerId).filter(Boolean),
                          ...purchSnap.docs.map(p => p.data().vendorId).filter(Boolean)
                        ]);

                        let deleted = 0;
                        let skipped = 0;
                        let batch = writeBatch(db);
                        let ops = 0;

                        for (const p of partiesSnap.docs) {
                          if (usedIds.has(p.id)) {
                            skipped++;
                          } else {
                            batch.delete(p.ref);
                            deleted++;
                            ops++;
                            
                            if (ops === 400) {
                                await batch.commit();
                                batch = writeBatch(db);
                                ops = 0;
                            }
                          }
                        }
                        
                        if (ops > 0) {
                            await batch.commit();
                        }
                        toast.success(`Cleared ${deleted} parties. Skipped ${skipped} linked parties.`);
                      } catch (err) {
                        toast.error('Failed to clear parties.');
                      }
                    }
                  });
                }}
              >
                Clear Parties
              </Button>
            </div>

            {/* Clear Internal Openings */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Clear Internal Openings</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Deletes all opening balances in Internal Accounts.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="font-bold shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setConfirmAction({
                    title: "Clear Internal Openings?",
                    description: "Are you sure you want to clear all internal account openings? Openings linked to transactions will be preserved.",
                    actionLabel: "Clear Openings",
                    onConfirm: async () => {
                      try {
                        const txnsSnap = await getDocs(query(collection(db, 'internal_transactions')));
                        const usedAccounts = new Set(txnsSnap.docs.map(d => (d.data().particulars || '').toLowerCase().trim()));
                        
                        const openingsSnap = await getDocs(query(collection(db, 'internal_openings')));
                        let deletedCount = 0;
                        let skippedCount = 0;
                        
                        let batch = writeBatch(db);
                        let ops = 0;
                        
                        for (const docSnap of openingsSnap.docs) {
                            const accountName = (docSnap.data().accountName || '').toLowerCase().trim();
                            if (usedAccounts.has(accountName)) {
                                skippedCount++;
                            } else {
                                batch.delete(docSnap.ref);
                                deletedCount++;
                                ops++;

                                if (ops === 400) {
                                    await batch.commit();
                                    batch = writeBatch(db);
                                    ops = 0;
                                }
                            }
                        }
                        
                        if (ops > 0) {
                            await batch.commit();
                        }
                        
                        toast.success(`Cleared ${deletedCount} openings. Skipped ${skippedCount} linked openings.`);
                      } catch (err: any) {
                        console.error('Clear openings error:', err);
                        toast.error("Failed to clear internal account openings. " + err.message);
                      }
                    }
                  });
                }}
              >
                Clear Openings
              </Button>
            </div>

            {/* Clear Internal Transactions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Clear Internal Transactions</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Deletes all transactions in Internal Accounts.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="font-bold shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setConfirmAction({
                    title: "Clear Internal Transactions?",
                    description: "Are you sure you want to clear all internal account transactions?",
                    actionLabel: "Clear Transactions",
                    onConfirm: async () => {
                      try {
                        let deletedCount = 0;
                        const BATCH_SIZE = 400;
                        
                        const toastId = toast.loading('Clearing internal transactions... This may take a moment.');
                        
                        // We will batch delete in a loop until no more documents are left.
                        // For 8777 documents, calling getDocs repeatedly could be needed if we only query small amounts,
                        // but doing a single getDocs and then batching is also fine given client memory can handle a few thousand docs.
                        const txnsSnap = await getDocs(query(collection(db, 'internal_transactions')));
                        let batch = writeBatch(db);
                        let ops = 0;
                        
                        for (const docSnap of txnsSnap.docs) {
                            batch.delete(docSnap.ref);
                            deletedCount++;
                            ops++;
                            
                            if (ops === BATCH_SIZE) {
                                await batch.commit();
                                batch = writeBatch(db);
                                ops = 0;
                            }
                        }
                        
                        if (ops > 0) {
                            await batch.commit();
                        }
                        
                        toast.success(`Successfully cleared ${deletedCount} internal transactions.`, { id: toastId });
                      } catch (err: any) {
                        console.error('Clear transactions error:', err);
                        toast.error("Failed to clear internal account transactions. " + err.message);
                      }
                    }
                  });
                }}
              >
                Clear Transactions
              </Button>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t font-mono border-red-200 dark:border-red-900/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-red-600 dark:text-red-500">Master Reset</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Permanently delete everything (Vehicles, Purchases, Sales, Parties, Brands, Models). Destructive.
                </p>
              </div>
              <Button 
                variant="destructive" 
                className="font-bold shrink-0 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  setConfirmAction({
                    title: "Master Reset",
                    description: "Permanently delete everything (Vehicles, Purchases, Sales, Parties, Brands, Models). This action is highly destructive and cannot be undone.",
                    actionLabel: "Clear Everything",
                    expectedText: "DELETE ALL",
                    onConfirm: async () => {
                      const collections = ['vehicles', 'purchases', 'sales', 'parties', 'companies', 'models', 'internal_openings', 'internal_transactions', 'internal_data'];
                      try {
                        for (const colName of collections) {
                          const q = query(collection(db, colName));
                          const snap = await getDocs(q);
                          
                          let batch = writeBatch(db);
                          let ops = 0;
                          
                          for (const d of snap.docs) {
                              batch.delete(doc(db, colName, d.id));
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
                        }
                        toast.success('All system data cleared successfully.');
                      } catch (err) {
                        console.error("Error clearing data:", err);
                        toast.error('Failed to clear all data.');
                      }
                    }
                  });
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Everything
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
