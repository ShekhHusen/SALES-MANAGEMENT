import React, { useState, useEffect } from 'react';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useAuth } from '@/hooks/use-auth';
import { collection, doc, Timestamp, writeBatch } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { Party, Vehicle, Quotation } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Plus, X, Search, CheckCircle, Ban, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { PdfTemplates } from '@/components/PdfTemplates';



function SearchableSelect({
  value,
  onValueChange,
  items,
  placeholder,
  searchPlaceholder = "Search...",
  className = ""
}: {
  value: string;
  onValueChange: (val: string) => void;
  items: { value: string; label: string; subLabel?: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.subLabel && item.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`inline-flex shrink-0 items-center border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 w-full justify-between text-left h-10 px-3 ${!value ? "text-muted-foreground font-normal" : "font-bold"} ${className}`}
      >
          <span className="truncate flex items-center gap-2">
            {value ? (
              <>
                {items.find(item => item.value === value)?.label}
                {items.find(item => item.value === value)?.subLabel && (
                  <span className="text-slate-400 font-sans text-xs font-normal">({items.find(item => item.value === value)?.subLabel})</span>
                )}
              </>
            ) : placeholder}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.value}
                className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${item.value === value ? "bg-accent/50 font-medium" : ""}`}
                onClick={() => {
                  onValueChange(item.value);
                  setOpen(false);
                  setSearchQuery("");
                }}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {item.value === value && <CheckCircle className="h-4 w-4" />}
                </span>
                {item.label}
                {item.subLabel && <span className="text-slate-400 font-sans text-xs ml-2">({item.subLabel})</span>}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Quotations() {

  const { userProfile } = useAuth();
  const { quotations, vehicles, parties, companies, models, sales, loadQuotations, loadVehicles, loadParties, loadSales, isQuotationsLoaded, isVehiclesLoaded, isPartiesLoaded, isSalesLoaded } = useGlobalData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [quotationToCancel, setQuotationToCancel] = useState<Quotation | null>(null);
  const [quotationToConvert, setQuotationToConvert] = useState<Quotation | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedChassis, setSelectedChassis] = useState('');
  const [bookingAmount, setBookingAmount] = useState<number | ''>('');
  const [numberOfBattery, setNumberOfBattery] = useState<number>(0);
  const [batteryCategory, setBatteryCategory] = useState('');
  const [batteryModel, setBatteryModel] = useState('');
  const [productId, setProductId] = useState('');
  const [bluetoothId, setBluetoothId] = useState('');
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  
  const [search, setSearch] = useState('');
    const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);
  const quotationTemplateRef = React.useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!isQuotationsLoaded) loadQuotations();
    if (!isVehiclesLoaded) loadVehicles();
    if (!isPartiesLoaded) loadParties();
    if (!isSalesLoaded) loadSales();
  }, [isQuotationsLoaded, isVehiclesLoaded, isPartiesLoaded, isSalesLoaded]);

  const customers = parties.filter(p => p.type === 'customer');
  const availableVehicles = vehicles.filter(v => v.status === 'in-stock');
  
  const handleBatteryCountChange = (val: string) => {
    const num = parseInt(val) || 0;
    setNumberOfBattery(num);
    setSerialNumbers(Array(num).fill(''));
  };

  const handleSerialNumberChange = (index: number, val: string) => {
    const newSerials = [...serialNumbers];
    newSerials[index] = val;
    setSerialNumbers(newSerials);
  };


    const handlePrintQuotation = async () => {
    // Wait for a tiny bit to ensure the React ref is attached if it was just mounted
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!quotationTemplateRef.current?.printRef1.current) {
      toast.error('Print template not ready yet. Please try again.');
      console.log("Ref is missing:", quotationTemplateRef.current);
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const scaleConfig = { 
        quality: 0.95, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      };

      const imgData1 = await toPng(quotationTemplateRef.current.printRef1.current, scaleConfig);
      const imgProps1 = pdf.getImageProperties(imgData1);
      const pdfHeight1 = (imgProps1.height * pdfWidth) / imgProps1.width;
      
      pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight1);

      if (quotationTemplateRef.current.printRef2.current) {
        pdf.addPage();
        const imgData2 = await toPng(quotationTemplateRef.current.printRef2.current, scaleConfig);
        const imgProps2 = pdf.getImageProperties(imgData2);
        const pdfHeight2 = (imgProps2.height * pdfWidth) / imgProps2.width;
        pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight2);
      }

      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCreateQuotation = async () => {
    if (!selectedCustomer || !selectedChassis) {
      toast.error('Customer and Chassis are required.');
      return;
    }
    
    setSaving(true);
    try {
      let newQNo = 1;
      if (quotations.length > 0) {
        newQNo = Math.max(...quotations.map(q => q.quotationNumber || 0)) + 1;
      }
      
      const batch = writeBatch(db);
      const qRef = doc(collection(db, 'quotations'));
      
      batch.set(qRef, {
        quotationNumber: newQNo,
        date: Timestamp.now(),
        customerId: selectedCustomer,
        chassisNumber: selectedChassis,
        batteryDetails: {
          numberOfBattery,
          category: batteryCategory,
          model: batteryModel,
          productId,
          bluetoothId,
          serialNumbers
        },
        bookingAmount: bookingAmount || 0,
        status: 'active',
        createdAt: Timestamp.now()
      });
      
      const vRef = doc(db, 'vehicles', selectedChassis);
      batch.update(vRef, {
        status: 'hold',
        updatedAt: Timestamp.now()
      });
      
      await batch.commit();
      toast.success('Quotation Created. Vehicle is now on HOLD.');
      
      setIsFormOpen(false);
      setSelectedCustomer('');
      setSelectedChassis('');
      setBookingAmount('');
      setNumberOfBattery(0);
      setBatteryCategory('');
      setBatteryModel('');
      setProductId('');
      setBluetoothId('');
      setSerialNumbers([]);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelQuotation = async (q: Quotation) => {
    try {
      const batch = writeBatch(db);
      const qRef = doc(db, 'quotations', q.id);
      
      batch.update(qRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
      
      const v = vehicles.find(v => v.chassisNumber === q.chassisNumber);
      if (v && v.status === 'hold') {
         const vRef = doc(db, 'vehicles', q.chassisNumber);
         batch.update(vRef, {
           status: 'in-stock',
           updatedAt: Timestamp.now()
         });
      }
      
      await batch.commit();
      toast.success('Quotation Cancelled. Vehicle is now IN-STOCK.');
      setQuotationToCancel(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel quotation');
    }
  };

  const handleConvertSale = async (q: Quotation) => {
    if (!window.confirm('Convert this quotation into a confirmed sale?')) return;
    try {
      const v = vehicles.find(veh => veh.chassisNumber === q.chassisNumber);
      if (!v) {
        toast.error('Vehicle not found.');
        return;
      }

      let nextFileNo = 1;
      if (sales && sales.length > 0) {
        nextFileNo = Math.max(...sales.map(s => s.fileNumber || 0)) + 1;
      }

      const batch = writeBatch(db);
      
      // 1. Create Sale
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, {
        date: Timestamp.now(),
        customerId: q.customerId,
        chassisNumber: q.chassisNumber,
        fileNumber: nextFileNo,
        companyId: v.companyId,
        documentationCompleted: false,
        status: 'active',
        createdAt: Timestamp.now()
      });

      // 2. Create OtherDetails (Battery)
      const odRef = doc(db, 'otherDetails', saleRef.id);
      batch.set(odRef, {
        chassisNumber: q.chassisNumber,
        saleId: saleRef.id,
        price: 0, // Needs to be filled in Process Documents
        batteryDetails: q.batteryDetails,
        createdAt: Timestamp.now()
      });

      // 3. Update Vehicle
      const vRef = doc(db, 'vehicles', q.chassisNumber);
      batch.update(vRef, {
        status: 'sold',
        saleId: saleRef.id,
        currentOwnerId: q.customerId,
        updatedAt: Timestamp.now()
      });

      // 4. Update Quotation
      const qRef = doc(db, 'quotations', q.id);
      batch.update(qRef, {
        status: 'converted_to_sale',
        saleId: saleRef.id,
        updatedAt: Timestamp.now()
      });

      await batch.commit();
      toast.success('Converted to Sale successfully! You can complete documentation in Process Document.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert to sale');
    }
  };

  const filtered = quotations.filter(q => {
    const cust = customers.find(c => c.id === q.customerId)?.name || '';
    return q.chassisNumber.toLowerCase().includes(search.toLowerCase()) || cust.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between shrink-0 mb-1 lg:mt-[10px]">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pre-Sales Quotations</h1>
        </div>
        <div className="flex gap-3 lg:mr-[200px]">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search Quotations..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 font-medium shadow-sm"
            />
          </div>
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="h-10 px-6 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            disabled={userProfile?.role === 'viewer'}
          >
            <Plus className="w-4 h-4 mr-2" /> New Quotation
          </Button>
        </div>
      </div>

      <Card className="flex-1 shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col bg-white dark:bg-[#0f172a]">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Q. No</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Date</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Customer</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Chassis</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Battery Status</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Status</TableHead>
                <TableHead className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(q => {
                const customer = customers.find(c => c.id === q.customerId);
                return (
                  <TableRow key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800/60 transition-colors">
                    <TableCell className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">#{q.quotationNumber}</TableCell>
                    <TableCell className="px-6 py-4 font-medium text-slate-500">{q.date?.toDate?.()?.toLocaleDateString('en-GB') || '---'}</TableCell>
                    <TableCell className="px-6 py-4 font-black text-slate-900 dark:text-slate-100 uppercase">{customer?.name || '---'}</TableCell>
                    <TableCell className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">{q.chassisNumber}</TableCell>
                    <TableCell className="px-6 py-4 text-xs font-bold text-slate-500">
                      {q.batteryDetails?.numberOfBattery || 0} Batteries <span className="uppercase text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full ml-2">{q.batteryDetails?.category || 'None'}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {q.status === 'active' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Active / Hold</Badge>}
                      {q.status === 'converted_to_sale' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Sold</Badge>}
                      {q.status === 'cancelled' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Cancelled</Badge>}
                      {q.bookingAmount ? <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Booked: ₹{q.bookingAmount}</Badge> : null}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-blue-200 text-blue-700 hover:bg-blue-700 hover:text-white font-bold text-[10px] rounded-lg px-3"
                          onClick={() => setViewQuotation(q)}
                        >
                          <FileSignature className="w-3 h-3 mr-1" /> VIEW & PRINT
                        </Button>
                        {q.status === 'active' && userProfile?.role !== 'viewer' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-[10px] rounded-lg px-3"
                              onClick={() => setQuotationToConvert(q)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> CONVERT TO SALE
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-bold text-[10px] rounded-lg px-3"
                              onClick={() => setQuotationToCancel(q)}
                            >
                              <Ban className="w-3 h-3 mr-1" /> CANCEL
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    No quotations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[95vw] max-w-[1400px] h-[95vh] rounded-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 border-b pb-2 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-blue-600" /> New Pre-Sales Quotation
            </DialogTitle>
          </DialogHeader>
          
              {viewQuotation && (
              <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <PdfTemplates
                  ref={quotationTemplateRef}
                  sale={{
                    id: viewQuotation.id,
                    customerId: viewQuotation.customerId,
                    chassisNumber: viewQuotation.chassisNumber,
                    saleDate: viewQuotation.date,
                    saleAmount: 0,
                    downPayment: 0,
                    financeAmount: 0,
                    isFinanced: false,
                    status: 'pending',
                    createdAt: viewQuotation.createdAt,
                    otherDetails: {
                      vehiclePrice: 0,
                      noOfBattery: viewQuotation.batteryDetails?.numberOfBattery || 0,
                      serialNumbers: viewQuotation.batteryDetails?.serialNumbers || [],
                    }
                  } as any}
                  vehicle={vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)}
                  customer={parties.find(p => p.id === viewQuotation.customerId)}
                  company={companies.find(comp => comp.id === vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)?.companyId)}
                  model={models.find(m => m.id === vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)?.modelId)}
                  docType="quotation"
                />
              </div>
            )}

              <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</label>
                <SearchableSelect
                  value={selectedCustomer}
                  onValueChange={setSelectedCustomer}
                  placeholder="Select Customer"
                  searchPlaceholder="Search customer..."
                  items={customers.map(c => ({ value: c.id, label: c.name.toUpperCase() }))}
                  className="font-bold uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chassis (In-Stock Only)</label>
                <SearchableSelect
                  value={selectedChassis}
                  onValueChange={setSelectedChassis}
                  placeholder="Select Chassis"
                  searchPlaceholder="Search chassis or model..."
                  items={availableVehicles.map(v => {
                    const co = companies.find(c => c.id === v.companyId);
                    const mo = models.find(m => m.id === v.modelId);
                    return {
                      value: v.chassisNumber,
                      label: v.chassisNumber,
                      subLabel: `${co?.name || ''} - ${mo?.name || ''}`
                    };
                  })}
                  className="font-bold font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booking Amount (Optional)</label>
                <Input
                  type="number"
                  placeholder="Amount in ₹"
                  value={bookingAmount}
                  onChange={e => setBookingAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="font-bold font-mono border-slate-200"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-2">Battery Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Number of Battery</label>
                  <Input 
                    type="number" 
                    min="0" 
                    value={numberOfBattery} 
                    onChange={e => handleBatteryCountChange(e.target.value)}
                    className="font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                  <Select value={batteryCategory} onValueChange={setBatteryCategory}>
                    <SelectTrigger className="font-bold uppercase"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="graphene">Graphene</SelectItem>
                      <SelectItem value="lithium_ion">Lithium Ion</SelectItem>
                      <SelectItem value="lead_acid">Lead Acid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Battery Model</label>
                  <Input value={batteryModel} onChange={e => setBatteryModel(e.target.value)} className="font-bold uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product ID</label>
                  <Input value={productId} onChange={e => setProductId(e.target.value)} className="font-bold uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bluetooth ID</label>
                  <Input value={bluetoothId} onChange={e => setBluetoothId(e.target.value)} className="font-bold uppercase" />
                </div>
              </div>

              {numberOfBattery > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Serial Numbers</label>
                  <div className="grid grid-cols-2 gap-2">
                    {serialNumbers.map((sn, idx) => (
                      <Input 
                        key={idx}
                        placeholder={`Battery ${idx + 1} Serial`}
                        value={sn}
                        onChange={e => handleSerialNumberChange(idx, e.target.value)}
                        className="font-bold font-mono text-xs uppercase"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="font-bold rounded-xl" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6" 
              onClick={handleCreateQuotation}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Quotation & Hold Vehicle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewQuotation} onOpenChange={(open) => !open && setViewQuotation(null)}>
        {viewQuotation && (() => {
          const c = parties.find(p => p.id === viewQuotation.customerId);
          const v = vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber);
          const co = companies.find(comp => comp.id === v?.companyId);
          const mo = models.find(m => m.id === v?.modelId);
          return (
            <DialogContent className="w-[95vw] max-w-[1400px] h-[95vh] rounded-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 border-b pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-5 h-5 text-blue-600" /> Quotation #{viewQuotation.quotationNumber}
                  </div>
                  <Badge className="text-xs uppercase">{viewQuotation.status.replace(/_/g, ' ')}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Customer</h4>
                    <p className="font-bold text-lg uppercase">{c?.name || 'Unknown'}</p>
                    <p className="text-sm font-medium text-slate-500">{c?.phone || '-'}</p>
                    <p className="text-sm font-medium text-slate-500">{c?.address || '-'}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Vehicle Details</h4>
                    <p className="font-bold font-mono text-lg">{viewQuotation.chassisNumber}</p>
                    <p className="text-sm font-medium text-slate-500 uppercase">{co?.name || '-'} - {mo?.name || '-'}</p>
                    {viewQuotation.bookingAmount ? (
                      <p className="text-sm font-bold text-blue-600 mt-2">Booking Amount: ₹{viewQuotation.bookingAmount}</p>
                    ) : null}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-2">Battery Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category & Count</p>
                      <p className="font-bold uppercase">{viewQuotation.batteryDetails?.category || 'None'} - {viewQuotation.batteryDetails?.numberOfBattery || 0} Units</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Battery Model</p>
                      <p className="font-bold uppercase">{viewQuotation.batteryDetails?.model || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product ID</p>
                      <p className="font-bold uppercase">{viewQuotation.batteryDetails?.productId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bluetooth ID</p>
                      <p className="font-bold uppercase">{viewQuotation.batteryDetails?.bluetoothId || '-'}</p>
                    </div>
                  </div>
                  
                  {(viewQuotation.batteryDetails?.serialNumbers || []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Serial Numbers</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(viewQuotation.batteryDetails?.serialNumbers || []).map((sn, idx) => (
                          <div key={idx} className="border border-dashed border-slate-300 p-2 text-center rounded font-mono font-bold text-xs uppercase bg-white">
                            {sn || 'N/A'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" className="font-bold rounded-xl" onClick={() => setViewQuotation(null)}>Close</Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6" 
                  onClick={handlePrintQuotation}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? 'Generating...' : 'Print Quotation'}
                </Button>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      <Dialog open={!!quotationToCancel} onOpenChange={(open) => !open && setQuotationToCancel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Quotation</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-700">
            Are you sure you want to cancel this quotation and release the vehicle?
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setQuotationToCancel(null)}>No, Keep it</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => quotationToCancel && handleCancelQuotation(quotationToCancel)}>Yes, Cancel Quotation</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quotationToConvert} onOpenChange={(open) => !open && setQuotationToConvert(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Sale</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-700">
            Are you sure you want to convert this quotation into a confirmed sale? This will mark the vehicle as SOLD.
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setQuotationToConvert(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => quotationToConvert && handleConvertSale(quotationToConvert)}>Yes, Convert</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}