import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Search, FileText, CheckCircle, Info, CreditCard, Battery, Hash, Image as ImageIcon, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Sale, Party, Vehicle, Company, Model } from '@/types';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { PdfTemplates } from '@/components/PdfTemplates';

type TabType = 'sold_vehicle' | 'others_details' | 'documents' | 'completed';

import { useGlobalData } from '@/contexts/GlobalDataContext';

export function ProcessDocument() {
  const { sales, parties, vehicles, companies, models } = useGlobalData();
  const customers = parties.filter(p => p.type === 'customer');
  const [activeTab, setActiveTab] = useState<TabType>('sold_vehicle');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // View Sheet state
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  // Unlocked tabs state
  const [unlockedTabs, setUnlockedTabs] = useState<Record<TabType, boolean>>({
    sold_vehicle: true,
    others_details: false,
    documents: false,
    completed: true,
  });

  // Form State for Others Details
  const [vehiclePrice, setVehiclePrice] = useState<number | ''>('');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [duesAmount, setDuesAmount] = useState<number | ''>('');
  const [fathersName, setFathersName] = useState('');
  const [grandFathersName, setGrandFathersName] = useState('');
  const [customerAltNumber, setCustomerAltNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [citizenshipNumber, setCitizenshipNumber] = useState('');

  const [batteryType, setBatteryType] = useState('');
  const [batteryBrand, setBatteryBrand] = useState('');
  const [bluetoothId, setBluetoothId] = useState('');
  const [productId, setProductId] = useState('');
  const [noOfBattery, setNoOfBattery] = useState<number | ''>('');
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const quotationTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const trafficTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);

  const handleDownloadPDF = async (docType: 'quotation' | 'traffic', sale: Sale) => {
    const templateRef = docType === 'quotation' ? quotationTemplateRef : trafficTemplateRef;
    if (!templateRef.current || !templateRef.current.printRef1.current) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const scaleConfig = { 
        quality: 0.95, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      };

      const imgData1 = await toPng(templateRef.current.printRef1.current, scaleConfig);
      const imgProps1 = pdf.getImageProperties(imgData1);
      const pdfHeight1 = (imgProps1.height * pdfWidth) / imgProps1.width;
      pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight1);

      if (templateRef.current.printRef2.current && docType === 'quotation') {
        pdf.addPage();
        const imgData2 = await toPng(templateRef.current.printRef2.current, scaleConfig);
        const imgProps2 = pdf.getImageProperties(imgData2);
        const pdfHeight2 = (imgProps2.height * pdfWidth) / imgProps2.width;
        pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight2);
      }

      pdf.save(`${docType === 'quotation' ? 'Quotation' : 'Traffic-Letter'}-${sale.chassisNumber || 'Report'}.pdf`);
    } catch (e: any) {
      console.error(e);
      toast.error('Error generating PDF: ' + (e.message || 'Unknown error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (vehiclePrice !== '' && paidAmount !== '') {
      setDuesAmount(Number(vehiclePrice) - Number(paidAmount));
    } else if (vehiclePrice !== '') {
      setDuesAmount(Number(vehiclePrice));
    } else {
      setDuesAmount('');
    }
  }, [vehiclePrice, paidAmount]);

  useEffect(() => {
    const num = Number(noOfBattery) || 0;
    if (num >= 0 && num <= 20) {
      setSerialNumbers(prev => {
        const newArr = [...prev];
        while (newArr.length < num) newArr.push('');
        return newArr.slice(0, num);
      });
    }
  }, [noOfBattery]);
  
  // Form State for Documents (Mocked since Firebase Storage is skipped)
  const [images, setImages] = useState<Record<string, string>>({});

  const tabs: { id: TabType; label: string }[] = [
    { id: 'sold_vehicle', label: 'Sold Vehicle' },
    { id: 'others_details', label: 'Others Details' },
    { id: 'documents', label: 'Documents' },
    { id: 'completed', label: 'Completed' },
  ];

  const handlePrevious = () => {
    if (activeTab === 'completed') {
      if (!selectedSale) {
        toast.error('Please select a sale first');
        return;
      }
      setVehiclePrice(selectedSale.otherDetails?.vehiclePrice ?? '');
      setPaidAmount(selectedSale.otherDetails?.paidAmount ?? '');
      setDuesAmount(selectedSale.otherDetails?.duesAmount ?? '');
      setFathersName(selectedSale.otherDetails?.fathersName ?? '');
      setGrandFathersName(selectedSale.otherDetails?.grandFathersName ?? '');
      setCustomerAltNumber(selectedSale.otherDetails?.customerAltNumber ?? '');
      setEngineNumber(selectedSale.otherDetails?.engineNumber ?? '');
      setVehicleNumber(selectedSale.otherDetails?.vehicleNumber ?? '');
      setCitizenshipNumber(selectedSale.otherDetails?.citizenshipNumber ?? '');
      setBatteryType(selectedSale.otherDetails?.batteryType ?? '');
      setBatteryBrand(selectedSale.otherDetails?.batteryBrand ?? '');
      setBluetoothId(selectedSale.otherDetails?.bluetoothId ?? '');
      setProductId(selectedSale.otherDetails?.productId ?? '');
      setNoOfBattery(selectedSale.otherDetails?.noOfBattery ?? '');
      setSerialNumbers(selectedSale.otherDetails?.serialNumbers ?? []);
      setImages(selectedSale.otherDetails?.images ?? {});
      
      setUnlockedTabs(prev => ({ ...prev, documents: true, others_details: true }));
      setActiveTab('documents');
    } else if (activeTab === 'documents') {
      setActiveTab('others_details');
    } else if (activeTab === 'others_details') {
      if (selectedSale?.documentationCompleted) {
        // Do not go back further if we are editing a completed sale
      } else {
        setActiveTab('sold_vehicle');
      }
    }
  };

  const handleNext = () => {
    if (activeTab === 'sold_vehicle') {
      if (!selectedSale) {
        toast.error('Please select a sale first');
        return;
      }
      setUnlockedTabs(prev => ({ ...prev, others_details: true }));
      setActiveTab('others_details');
    } else if (activeTab === 'others_details') {
      setUnlockedTabs(prev => ({ ...prev, documents: true }));
      setActiveTab('documents');
    } else if (activeTab === 'documents') {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!selectedSale?.id) return;
    setLoading(true);
    try {
      // Complete document process
      await updateDoc(doc(db, 'sales', selectedSale.id), {
        documentationCompleted: true,
        otherDetails: {
          vehiclePrice,
          paidAmount,
          duesAmount,
          fathersName,
          grandFathersName,
          customerAltNumber,
          engineNumber,
          vehicleNumber,
          citizenshipNumber,
          batteryType,
          batteryBrand,
          bluetoothId,
          productId,
          noOfBattery,
          serialNumbers,
          images
        }
      });
      toast.success('Documentation completed successfully!');
      setUnlockedTabs({ sold_vehicle: true, others_details: false, documents: false, completed: true });
      setActiveTab('completed');
      setSelectedSale(null);
      setVehiclePrice('');
      setPaidAmount('');
      setDuesAmount('');
      setFathersName('');
      setGrandFathersName('');
      setCustomerAltNumber('');
      setEngineNumber('');
      setVehicleNumber('');
      setCitizenshipNumber('');
      setBatteryType('');
      setBatteryBrand('');
      setBluetoothId('');
      setProductId('');
      setNoOfBattery('');
      setSerialNumbers([]);
      setImages({});
    } catch (error) {
      console.error('Error updating document process', error);
      toast.error('Failed to save document process');
      handleFirestoreError(error, OperationType.UPDATE, `sales/${selectedSale.id}`);
    } finally {
      setLoading(false);
    }
  };

  const pendingSales = sales.filter(s => !s.documentationCompleted);
  const filteredSales = pendingSales.filter(s => {
    const customer = customers.find(c => c.id === s.customerId);
    const searchLow = searchQuery.toLowerCase();
    return s.chassisNumber.toLowerCase().includes(searchLow) || 
           customer?.name.toLowerCase().includes(searchLow) ||
           customer?.contactNumber?.includes(searchLow);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] overflow-hidden space-y-4">
      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 shrink-0">
        <FileText className="w-5 h-5" />
        <h1 className="text-xl font-bold">Process Document</h1>
      </div>

      <div className="flex items-center justify-between shrink-0">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabType)} className="w-auto">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!unlockedTabs[tab.id]}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#1a4731] data-[state=active]:shadow-sm rounded-md font-bold text-sm px-6"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search by chassis, name..." 
              className="pl-9 w-64 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-10 h-10 p-0 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <Filter className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 rounded-xl border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden bg-white dark:bg-slate-900">
        {activeTab === 'sold_vehicle' && (
          <div className="flex flex-col h-full">
            <div className="grid grid-cols-3 px-8 py-4 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <div>Chassis Number</div>
              <div>Customer Name</div>
              <div>Contact Number</div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredSales.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-slate-500 font-medium">No Data Available</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSales.map(sale => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    const isSelected = selectedSale?.id === sale.id;
                    return (
                      <div 
                        key={sale.id}
                        onClick={() => setSelectedSale(sale)}
                        className={`grid grid-cols-3 px-8 py-4 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                      >
                        <div className="font-mono text-slate-700 font-medium">{sale.chassisNumber}</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">{customer?.name || '---'}</div>
                        <div className="text-slate-600 tracking-wide">{customer?.contactNumber || '---'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'others_details' && (
          <div className="p-8 space-y-8 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-6">Financial & Family Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Vehicle Price</label>
                  <Input 
                    type="number" 
                    value={vehiclePrice} 
                    onChange={(e) => setVehiclePrice(e.target.value ? Number(e.target.value) : '')}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Paid Amount</label>
                  <Input 
                    type="number" 
                    value={paidAmount} 
                    onChange={(e) => setPaidAmount(e.target.value ? Number(e.target.value) : '')}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Dues Amount</label>
                  <Input 
                    type="number" 
                    value={duesAmount} 
                    readOnly
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Customer Alt Number</label>
                  <Input 
                    type="text" 
                    value={customerAltNumber} 
                    onChange={(e) => setCustomerAltNumber(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Engine No</label>
                  <Input 
                    value={engineNumber} 
                    onChange={(e) => setEngineNumber(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 uppercase"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Vehicle Number</label>
                  <Input 
                    value={vehicleNumber} 
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 uppercase"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Citizenship Certificate No.</label>
                  <Input 
                    value={citizenshipNumber} 
                    onChange={(e) => setCitizenshipNumber(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 uppercase"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Father's Name</label>
                  <Input 
                    value={fathersName} 
                    onChange={(e) => setFathersName(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Grandfather's Name</label>
                  <Input 
                    value={grandFathersName} 
                    onChange={(e) => setGrandFathersName(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-6">
                 <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Battery Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Battery Type</label>
                  <Input 
                    value={batteryType} 
                    onChange={(e) => setBatteryType(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Battery Brand</label>
                  <Input 
                    value={batteryBrand} 
                    onChange={(e) => setBatteryBrand(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Bluetooth ID</label>
                  <Input 
                    value={bluetoothId} 
                    onChange={(e) => setBluetoothId(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Product ID</label>
                  <Input 
                    value={productId} 
                    onChange={(e) => setProductId(e.target.value)}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">No. of Battery (pcs)</label>
                  <Input 
                    type="number"
                    value={noOfBattery} 
                    onChange={(e) => setNoOfBattery(e.target.value ? Number(e.target.value) : '')}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {serialNumbers.length > 0 && (
                <div className="mt-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                   <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-4">Battery Serial Numbers</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                     {serialNumbers.map((s, idx) => (
                       <div key={idx} className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">Serial No. {idx + 1}</label>
                         <Input 
                           value={s}
                           onChange={(e) => {
                             const nArr = [...serialNumbers];
                             nArr[idx] = e.target.value;
                             setSerialNumbers(nArr);
                           }}
                           placeholder={`Enter SN-${idx + 1}...`}
                           className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                         />
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="p-8 space-y-6 overflow-y-auto h-full">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Upload Documents</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {['Citizenship Front', 'Citizenship Back', 'Agreement Paper', 'Photo'].map((docName) => {
                const docKey = docName.toLowerCase().replace(/ /g, '_');
                return (
                  <label key={docName} className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-3 h-40 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group overflow-hidden">
                    {images[docKey] ? (
                      <>
                        <img src={images[docKey]} alt={docName} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        <div className="relative z-10 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="relative z-10 text-sm font-bold text-slate-900 dark:text-slate-100 bg-white/80 px-2 rounded text-center">{docName}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
                        </div>
                        <span className="text-sm font-bold text-slate-600 text-center">{docName}</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              let width = img.width;
                              let height = img.height;
                              const MAX_DIMENSION = 800;
                              if (width > height && width > MAX_DIMENSION) {
                                height *= MAX_DIMENSION / width;
                                width = MAX_DIMENSION;
                              } else if (height > MAX_DIMENSION) {
                                width *= MAX_DIMENSION / height;
                                height = MAX_DIMENSION;
                              }
                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              ctx?.drawImage(img, 0, 0, width, height);
                              setImages(prev => ({ ...prev, [docKey]: canvas.toDataURL('image/jpeg', 0.6) }));
                            };
                            img.src = ev.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
            
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mt-8">Generate Documents</h2>
            <div className="flex gap-4">
               <Button 
                 onClick={() => handleDownloadPDF('quotation', selectedSale!)}
                 disabled={isGeneratingPdf}
                 variant="outline"
                 className="border-[#1a4731] text-[#1a4731] hover:bg-emerald-50 shrink-0 h-14 px-6 text-base font-bold"
               >
                 <Download className="w-5 h-5 mr-2" />
                 {isGeneratingPdf ? 'Generating...' : 'Download Quotation'}
               </Button>
               <Button 
                 onClick={() => handleDownloadPDF('traffic', selectedSale!)}
                 disabled={isGeneratingPdf}
                 variant="outline"
                 className="border-[#1a4731] text-[#1a4731] hover:bg-emerald-50 shrink-0 h-14 px-6 text-base font-bold"
               >
                 <Download className="w-5 h-5 mr-2" />
                 {isGeneratingPdf ? 'Generating...' : 'Download Traffic Letter'}
               </Button>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="flex flex-col h-full">
            <div className="grid grid-cols-5 px-8 py-4 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/50 shrink-0">
               <div>SN.</div>
               <div>Chassis Details</div>
               <div>Customer Details</div>
               <div>Document Status</div>
               <div>Action</div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {sales.filter(s => s.documentationCompleted).length === 0 ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-slate-500 font-medium">No Completed Documents Found</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sales.filter(s => s.documentationCompleted).map((sale, idx) => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    return (
                      <div 
                        key={sale.id}
                        onClick={() => setSelectedSale(sale)}
                        className={`grid grid-cols-5 px-8 py-4 items-center cursor-pointer transition-colors ${selectedSale?.id === sale.id ? 'bg-emerald-50' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                      >
                        <div className="font-bold text-slate-500 text-sm">{idx + 1}</div>
                        <div className="font-mono text-slate-700 font-medium">{sale.chassisNumber}</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">{customer?.name || '---'}</div>
                        <div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">Completed</span>
                        </div>
                        <div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="font-bold border-slate-200 dark:border-slate-800 text-slate-600 hover:text-[#1a4731]" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewSale(sale);
                              setViewSheetOpen(true);
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between items-center pt-2 shrink-0">
        <div>
          {(activeTab === 'documents' || activeTab === 'others_details' || activeTab === 'completed') && (
            <Button
              variant="outline"
              disabled={loading || (activeTab === 'completed' && !selectedSale) || (activeTab === 'others_details' && selectedSale?.documentationCompleted)}
              onClick={handlePrevious}
              className={`border-[#1a4731] text-[#1a4731] hover:bg-emerald-50 rounded-full px-10 py-6 font-bold text-sm tracking-widest shadow-sm transition-colors ${activeTab === 'others_details' && selectedSale?.documentationCompleted ? 'opacity-0 pointer-events-none' : ''}`}
            >
              {'<< BACK'}
            </Button>
          )}
        </div>
        
        {activeTab !== 'completed' && (
          <Button 
            disabled={loading || (activeTab === 'sold_vehicle' && !selectedSale)}
            onClick={handleNext}
            className="bg-[#1a4731] hover:bg-[#133524] text-white rounded-full px-10 py-6 font-bold text-sm tracking-widest shadow-md transition-colors"
          >
            {activeTab === 'documents' ? 'SAVE & COMPLETE' : 'SAVE & NEXT >>'}
          </Button>
        )}
      </div>

      {/* View Sheet */}
      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="w-full sm:max-w-5xl overflow-y-auto bg-[#F8FAFC]">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-4">
              Process Document Details
            </SheetTitle>
          </SheetHeader>
          
          {viewSale && (
            <div className="space-y-8">
              {/* Inventory Full Details */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-slate-500" /> Inventory Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const vehicle = vehicles.find(v => v.chassisNumber === viewSale.chassisNumber);
                    const company = vehicle ? companies.find(c => c.id === vehicle.companyId) : null;
                    const model = vehicle ? models.find(m => m.id === vehicle.modelId) : null;
                    return (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Chassis Number</p>
                          <p className="font-mono font-bold text-slate-900 dark:text-slate-100">{viewSale.chassisNumber}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Company</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{company?.name || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Model</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{model?.name || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Color</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{vehicle?.color || '---'}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Customer Full Details */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-500" /> Customer Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const customer = customers.find(c => c.id === viewSale.customerId);
                    return (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Name</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{customer?.name || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Contact Number</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{customer?.contactNumber || '---'}</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <p className="text-sm text-slate-500 font-medium">Address</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{customer?.address || '---'}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Bluebook & Namsari */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-500" /> Bluebook and Namsari Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const vehicle = vehicles.find(v => v.chassisNumber === viewSale.chassisNumber);
                    return (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Registration Number</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{vehicle?.registrationNumber || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Bluebook Status</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{vehicle?.bluebookStatus || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Naamsari Status</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{vehicle?.naamsariStatus || '---'}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Others Details */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-500" /> Financial & Family Details
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Vehicle Price</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.vehiclePrice !== undefined && viewSale.otherDetails?.vehiclePrice !== '' ? viewSale.otherDetails.vehiclePrice : '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Paid Amount</p>
                    <p className="font-bold text-emerald-600">{viewSale.otherDetails?.paidAmount !== undefined && viewSale.otherDetails?.paidAmount !== '' ? viewSale.otherDetails.paidAmount : '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Dues Amount</p>
                    <p className="font-bold text-rose-600">{viewSale.otherDetails?.duesAmount !== undefined && viewSale.otherDetails?.duesAmount !== '' ? viewSale.otherDetails.duesAmount : '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Customer Alt Number</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.customerAltNumber || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Engine Number</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 uppercase">{viewSale.otherDetails?.engineNumber || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Vehicle Number</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 uppercase">{viewSale.otherDetails?.vehicleNumber || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Citizenship Cert. No.</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 uppercase">{viewSale.otherDetails?.citizenshipNumber || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Father's Name</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.fathersName || '---'}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-slate-500 font-medium">Grandfather's Name</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.grandFathersName || '---'}</p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2 mt-6">
                  <Battery className="w-5 h-5 text-slate-500" /> Battery Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Battery Type</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.batteryType || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Battery Brand</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.batteryBrand || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Bluetooth ID</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.bluetoothId || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Product ID</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.productId || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500 font-medium">No. of Battery</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails?.noOfBattery !== undefined && viewSale.otherDetails?.noOfBattery !== '' ? viewSale.otherDetails.noOfBattery : '---'}</p>
                  </div>
                </div>

                {viewSale.otherDetails?.serialNumbers && viewSale.otherDetails.serialNumbers.length > 0 && (
                  <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm text-slate-500 font-medium mb-2">Battery Serial Numbers</p>
                    <div className="flex flex-wrap gap-2">
                      {viewSale.otherDetails.serialNumbers.map((sn, idx) => (
                        <span key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded text-sm font-mono text-slate-700 shadow-sm">
                          {sn || 'N/A'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-slate-500" /> Documents
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {['Citizenship Front', 'Citizenship Back', 'Agreement Paper', 'Photo'].map((docName) => {
                    const docKey = docName.toLowerCase().replace(/ /g, '_');
                    const hasImage = viewSale.otherDetails?.images?.[docKey];
                    return (
                      <div key={docName} className="relative border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center space-y-2 bg-slate-50 dark:bg-slate-900/50 overflow-hidden h-32">
                        {hasImage ? (
                          <>
                            <img src={viewSale.otherDetails.images[docKey]} alt={docName} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1">
                              <p className="text-[10px] font-bold text-white text-center truncate">{docName}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <FileText className="w-6 h-6 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 text-center">{docName} (Pending)</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Hidden PDF Templates */}
      <div className="fixed top-[-200vh] left-0 pointer-events-none z-[-99]" aria-hidden="true">
        {selectedSale && (
          <>
            <PdfTemplates
              ref={quotationTemplateRef}
              sale={selectedSale}
              vehicle={vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)}
              customer={customers.find(c => c.id === selectedSale.customerId)}
              company={companies.find(c => c.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.companyId)}
              model={models.find(m => m.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.modelId)}
              docType="quotation"
              tempDetails={{
                vehiclePrice, paidAmount, duesAmount, fathersName, grandFathersName, customerAltNumber,
                engineNumber, vehicleNumber, citizenshipNumber, batteryType, batteryBrand, bluetoothId,
                productId, noOfBattery, serialNumbers
              }}
            />
            <PdfTemplates
              ref={trafficTemplateRef}
              sale={selectedSale}
              vehicle={vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)}
              customer={customers.find(c => c.id === selectedSale.customerId)}
              company={companies.find(c => c.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.companyId)}
              model={models.find(m => m.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.modelId)}
              docType="traffic"
              tempDetails={{
                vehiclePrice, paidAmount, duesAmount, fathersName, grandFathersName, customerAltNumber,
                engineNumber, vehicleNumber, citizenshipNumber, batteryType, batteryBrand, bluetoothId,
                productId, noOfBattery, serialNumbers
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
