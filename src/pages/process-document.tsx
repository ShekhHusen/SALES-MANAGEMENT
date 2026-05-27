import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Search, FileText, CheckCircle, Info, CreditCard, Battery, Hash, Image as ImageIcon, Download, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Sale, Party, Vehicle, Company, Model } from '@/types';
import { logAction } from '@/lib/audit';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { PdfTemplates } from '@/components/PdfTemplates';

type TabType = 'sold_vehicle' | 'others_details' | 'documents' | 'completed';

import { useGlobalData } from '@/contexts/GlobalDataContext';

export function ProcessDocument() {
  const location = useLocation();
  const { user, userProfile } = useAuth();
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

  // EMI state
  const [onEmi, setOnEmi] = useState(false);
  const [emiVehiclePrice, setEmiVehiclePrice] = useState<number | ''>('');
  const [emiDownPayment, setEmiDownPayment] = useState<number | ''>('');
  const [emiPeriod, setEmiPeriod] = useState<number | ''>(''); // in months
  const [emiInterest, setEmiInterest] = useState<number | ''>(''); // in annum percentage

  const [batteryType, setBatteryType] = useState('');
  const [batteryBrand, setBatteryBrand] = useState('');
  const [bluetoothId, setBluetoothId] = useState('');
  const [productId, setProductId] = useState('');
  const [notes, setNotes] = useState('');
  const [noOfBattery, setNoOfBattery] = useState<number | ''>('');
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const quotationTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const trafficTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const handleDownloadPDF = async (docType: 'quotation' | 'traffic', sale: Sale, action: 'download' | 'print' = 'download') => {
    let templateRef;
    if (docType === 'quotation') templateRef = quotationTemplateRef;
    else if (docType === 'traffic') templateRef = trafficTemplateRef;

    if (!templateRef?.current || !templateRef.current.printRef1.current) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
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

      if (action === 'print') {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      } else {
        pdf.save(`${docType === 'quotation' ? 'Quotation' : 'Traffic-Letter'}-${sale.chassisNumber || 'Report'}.pdf`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Error generating PDF: ' + (e.message || 'Unknown error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadEMIList = (action: 'download' | 'print' = 'download') => {
    if (!selectedSale) return;
    
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const customer = customers.find(c => c.id === selectedSale.customerId);
      
      let y = 50;
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("EMI Schedule", 40, y);
      
      y += 30;
      pdf.setFontSize(12);
      pdf.text("Customer Details", 40, y);
      y += 20;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Name: ${customer?.name || '---'}`, 40, y);
      pdf.text(`Contact: ${customer?.contactNumber || '---'}`, 250, y);
      y += 15;
      pdf.text(`Address: ${customer?.address || '---'}`, 40, y);
      pdf.text(`Alt Number: ${customerAltNumber || '---'}`, 250, y);
      
      y += 30;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Vehicle Details", 40, y);
      y += 20;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Chassis No: ${selectedSale.chassisNumber}`, 40, y);
      pdf.text(`Engine No: ${engineNumber || '---'}`, 250, y);
      y += 15;
      pdf.text(`Battery Type: ${batteryType || '---'}`, 40, y);
      pdf.text(`Vehicle No: ${vehicleNumber || '---'}`, 250, y);
      
      y += 30;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Pricing & EMI Details", 40, y);
      y += 20;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`EMI Vehicle Price: Rs ${emiVehiclePrice || 0}`, 40, y);
      pdf.text(`Down Payment: Rs ${emiDownPayment || 0}`, 250, y);
      y += 15;
      
      const vPrice = Number(emiVehiclePrice) || 0;
      const dp = Number(emiDownPayment) || 0;
      const period = Number(emiPeriod) || 0;
      const interestRate = Number(emiInterest) || 0;
      
      const principal = vPrice - dp;
      pdf.text(`Principal Amount: Rs ${principal}`, 40, y);
      pdf.text(`Period: ${period} months`, 250, y);
      y += 15;
      pdf.text(`Interest Rate: ${interestRate}% p.a.`, 40, y);
      
      let emi = 0;
      if (principal > 0 && period > 0) {
        if (interestRate > 0) {
          // Flat rate calculation
          // Total Interest = Principal * (Interest Rate / 100) * (Period / 12)
          const totalInterest = principal * (interestRate / 100) * (period / 12);
          const totalAmount = principal + totalInterest;
          emi = totalAmount / period;
        } else {
          emi = principal / period;
        }
      }
      
      pdf.text(`Monthly EMI: Rs ${Math.round(emi)}`, 250, y);
      y += 30;
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Monthly EMI List", 40, y);
      y += 20;
      
      pdf.setFontSize(10);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(40, y-12, 515, 18, "F");
      pdf.text("Month", 45, y);
      pdf.text("Monthly EMI", 150, y);
      pdf.text("Principal Part", 280, y);
      pdf.text("Interest Part", 400, y);
      pdf.text("Remaining", 480, y);
      y += 15;
      
      pdf.setFont("helvetica", "normal");
      
      let currentRemaining = principal;
      const totalOverallInterest = principal * (interestRate / 100) * (period / 12);
      const monthlyInterest = interestRate > 0 ? (totalOverallInterest / period) : 0;
      const monthlyPrincipal = interestRate > 0 ? (principal / period) : emi;
      
      for (let i = 1; i <= period; i++) {
        currentRemaining -= monthlyPrincipal;
        
        pdf.text(i.toString(), 45, y);
        pdf.text(Math.round(emi).toString(), 150, y);
        pdf.text(Math.round(monthlyPrincipal).toString(), 280, y);
        pdf.text(Math.round(monthlyInterest).toString(), 400, y);
        pdf.text(Math.max(0, Math.round(currentRemaining)).toString(), 480, y);
        
        y += 15;
        if (y > 780) {
          pdf.addPage();
          y = 50;
        }
      }
      
      if (action === 'print') {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      } else {
        pdf.save(`EMI-List-${selectedSale.chassisNumber}.pdf`);
        toast.success('EMI List generated successfully!');
      }
    } catch (e: any) {
       console.error(e);
       toast.error('Failed to generate EMI List: ' + (e.message || 'Unknown'));
    } finally {
       setIsGeneratingPdf(false);
    }
  };

  const handleDownloadUploadedImagePDF = (docKey: string, docName: string, action: 'download' | 'print' = 'print') => {
    const imgData = images[docKey];
    if (!imgData) {
      let fallbackPdf = '';
      if (docKey === 'bikrinama_ev') fallbackPdf = '/BIKRINAMA%20(EV).pdf';
      else if (docKey === 'bikrinama_petrol') fallbackPdf = '/BIKRINAMA%20(Petrol).pdf';
      
      if (fallbackPdf) {
        if (action === 'print') {
          window.open(fallbackPdf, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = fallbackPdf;
          a.download = decodeURIComponent(fallbackPdf.replace('/', ''));
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      }

      toast.error(`Please upload ${docName} first from the Documents section below.`);
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;
      const pdfRatio = pdfWidth / pdfHeight;
      
      let finalW = pdfWidth;
      let finalH = pdfHeight;
      
      if (imgRatio > pdfRatio) {
         finalH = pdfWidth / imgRatio;
      } else {
         finalW = pdfHeight * imgRatio;
      }
      
      const x = (pdfWidth - finalW) / 2;
      const y = (pdfHeight - finalH) / 2;
      
      pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);
      
      if (action === 'print') {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      } else {
        pdf.save(`${docName.replace(/ /g, '-')}-${selectedSale?.chassisNumber || 'Document'}.pdf`);
        toast.success(`${docName} downloaded successfully!`);
      }
    } catch (e) {
      console.error(e);
      toast.error(`Failed to generate ${docName} PDF`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCitizenshipA4 = (action: 'download' | 'print' = 'download') => {
    const frontImg = images['citizenship_front'];
    const backImg = images['citizenship_back'];

    if (!frontImg && !backImg) {
      toast.error('Please upload at least Citizenship Front or Back');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [11.69, 8.27]
      });

      // A4 Size: 11.69 x 8.27 inches
      const w = 4.5;
      const h = 2.8;
      
      const x1 = 0.5;
      const x2 = 11.69 - w - 0.5;
  
      const y1 = 1.5;
      const y2 = 4.5;

      if (frontImg) {
        pdf.addImage(frontImg, 'JPEG', x1, y1, w, h);
        pdf.addImage(frontImg, 'JPEG', x2, y1, w, h);
      }
      
      if (backImg) {
        pdf.addImage(backImg, 'JPEG', x1, y2, w, h);
        pdf.addImage(backImg, 'JPEG', x2, y2, w, h);
      }

      if (action === 'print') {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      } else {
        pdf.save(`Citizenship-A4-${selectedSale?.chassisNumber || 'Document'}.pdf`);
        toast.success('Citizenship A4 generated successfully!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate Citizenship A4 PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (selectedSale) {
      setVehiclePrice(selectedSale.otherDetails?.vehiclePrice ?? '');
      setPaidAmount(selectedSale.otherDetails?.paidAmount ?? '');
      setDuesAmount(selectedSale.otherDetails?.duesAmount ?? '');
      setFathersName(selectedSale.otherDetails?.fathersName ?? '');
      setGrandFathersName(selectedSale.otherDetails?.grandFathersName ?? '');
      setCustomerAltNumber(selectedSale.otherDetails?.customerAltNumber ?? '');
      setEngineNumber(selectedSale.otherDetails?.engineNumber ?? '');
      setVehicleNumber(selectedSale.otherDetails?.vehicleNumber ?? '');
      setCitizenshipNumber(selectedSale.otherDetails?.citizenshipNumber ?? '');
      
      setOnEmi(selectedSale.otherDetails?.onEmi ?? false);
      setEmiVehiclePrice(selectedSale.otherDetails?.emiVehiclePrice ?? '');
      setEmiDownPayment(selectedSale.otherDetails?.emiDownPayment ?? '');
      setEmiPeriod(selectedSale.otherDetails?.emiPeriod ?? '');
      setEmiInterest(selectedSale.otherDetails?.emiInterest ?? '');

      setBatteryType(selectedSale.otherDetails?.batteryType ?? '');
      setBatteryBrand(selectedSale.otherDetails?.batteryBrand ?? '');
      setBluetoothId(selectedSale.otherDetails?.bluetoothId ?? '');
      setProductId(selectedSale.otherDetails?.productId ?? '');
      setNotes(selectedSale.otherDetails?.notes ?? '');
      setNoOfBattery(selectedSale.otherDetails?.noOfBattery ?? '');
      setSerialNumbers(selectedSale.otherDetails?.serialNumbers ?? []);
      setImages(selectedSale.otherDetails?.images ?? {});
    } else {
      setVehiclePrice('');
      setPaidAmount('');
      setDuesAmount('');
      setFathersName('');
      setGrandFathersName('');
      setCustomerAltNumber('');
      setEngineNumber('');
      setVehicleNumber('');
      setCitizenshipNumber('');
      setOnEmi(false);
      setEmiVehiclePrice('');
      setEmiDownPayment('');
      setEmiPeriod('');
      setEmiInterest('');
      setBatteryType('');
      setBatteryBrand('');
      setBluetoothId('');
      setProductId('');
      setNotes('');
      setNoOfBattery('');
      setSerialNumbers([]);
      setImages({});
    }
  }, [selectedSale]);

  useEffect(() => {
    if (location.state && location.state.saleId) {
      const saleId = location.state.saleId;
      const tSale = sales.find(s => s.id === saleId);
      if (tSale) {
        setSelectedSale(tSale);
        if (location.state.tab === 'others_details') {
          setActiveTab('others_details');
          setUnlockedTabs(prev => ({ ...prev, others_details: true }));
        }
      }
    }
  }, [location.state, sales]);

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
  
  const [showCrossCheckModal, setShowCrossCheckModal] = useState(false);

  // Form State for Documents (Mocked since Firebase Storage is skipped)
  const [images, setImages] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      
      setOnEmi(selectedSale.otherDetails?.onEmi ?? false);
      setEmiVehiclePrice(selectedSale.otherDetails?.emiVehiclePrice ?? '');
      setEmiDownPayment(selectedSale.otherDetails?.emiDownPayment ?? '');
      setEmiPeriod(selectedSale.otherDetails?.emiPeriod ?? '');
      setEmiInterest(selectedSale.otherDetails?.emiInterest ?? '');

      setBatteryType(selectedSale.otherDetails?.batteryType ?? '');
      setBatteryBrand(selectedSale.otherDetails?.batteryBrand ?? '');
      setBluetoothId(selectedSale.otherDetails?.bluetoothId ?? '');
      setProductId(selectedSale.otherDetails?.productId ?? '');
      setNotes(selectedSale.otherDetails?.notes ?? '');
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
      setShowCrossCheckModal(true);
    } else if (activeTab === 'documents') {
      handleComplete();
    }
  };

  const handleConfirmCrossCheck = () => {
    setShowCrossCheckModal(false);
    setUnlockedTabs(prev => ({ ...prev, documents: true }));
    setActiveTab('documents');
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
          onEmi,
          emiVehiclePrice,
          emiDownPayment,
          emiPeriod,
          emiInterest,
          batteryType,
          batteryBrand,
          bluetoothId,
          productId,
          notes,
          noOfBattery,
          serialNumbers,
          images
        }
      });
      
      if (user) {
        logAction(user.uid, user.email || '', 'UPDATE', 'Document', selectedSale.id, {
          documentationCompleted: true,
          actionType: 'DOCUMENT_PROCESSED'
        });
      }

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
      setOnEmi(false);
      setEmiVehiclePrice('');
      setEmiDownPayment('');
      setEmiPeriod('');
      setEmiInterest('');
      setBatteryType('');
      setBatteryBrand('');
      setBluetoothId('');
      setProductId('');
      setNotes('');
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
    <div className="flex flex-col h-[516px] overflow-hidden md:p-2 pb-0 md:pb-0">
      <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 shrink-0 mb-[10px]">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
            <FileText className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 drop-shadow-sm">Process Document</h1>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 mb-[10px]">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabType)} className="w-full md:w-auto">
          <TabsList className="bg-[#e0dede] dark:bg-[#0f172a] backdrop-blur-xl px-1.5 py-0 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex flex-wrap h-[44px] gap-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!unlockedTabs[tab.id]}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 rounded-xl font-bold text-sm px-6 py-[12px] transition-all"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              type="text" 
              placeholder="Search by chassis, name..." 
              className="pl-9 w-full md:w-72 h-[41px] rounded-xl bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700 shadow-sm focus:ring-emerald-500/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-11 h-11 p-0 rounded-xl bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700 shadow-sm hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-all">
            <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 rounded-2xl border-slate-200/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 flex flex-col overflow-hidden bg-white/80 dark:bg-slate-950 backdrop-blur-xl mb-[10px] pt-0 pb-1">
        {activeTab === 'sold_vehicle' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-x-auto w-full">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-3 px-8 py-[10px] border-b border-slate-200/60 dark:border-slate-700 font-black text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#0f172a] shrink-0 text-sm tracking-wider uppercase">
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
                    <div className="divide-y divide-slate-100/60 dark:divide-slate-800/60 p-2">
                      {filteredSales.map(sale => {
                        const customer = customers.find(c => c.id === sale.customerId);
                        const isSelected = selectedSale?.id === sale.id;
                        return (
                          <div 
                            key={sale.id}
                            onClick={() => setSelectedSale(sale)}
                            className={`grid grid-cols-3 px-4 py-[4px] cursor-pointer transition-all rounded-lg mx-1 my-[1px] ${selectedSale?.id === sale.id ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm border border-emerald-100 dark:border-emerald-900/30' : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50 border border-transparent'}`}
                          >
                        <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">{sale.chassisNumber}</div>
                        <div className="text-slate-800 dark:text-slate-200 font-black">{customer?.name || '---'}</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium">{customer?.contactNumber || '---'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>
          </div>
        )}

        {activeTab === 'others_details' && (
          <div className="px-8 py-[10px] space-y-10 overflow-y-auto h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-50/50 dark:bg-[#0f172a] px-6 py-[5px] rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between pb-[3px] mb-[10px] border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400">Financial & Family Details</h2>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">On EMI?</label>
                  <button 
                    type="button"
                    role="switch"
                    aria-checked={onEmi}
                    onClick={() => setOnEmi(!onEmi)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${onEmi ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <span 
                      aria-hidden="true" 
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${onEmi ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
              
              {onEmi ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 p-5 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">EMI Vehicle Price</label>
                    <Input 
                      type="number" 
                      value={emiVehiclePrice} 
                      onChange={(e) => setEmiVehiclePrice(e.target.value ? Number(e.target.value) : '')}
                      className="h-[40px] rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Down Payment</label>
                    <Input 
                      type="number" 
                      value={emiDownPayment} 
                      onChange={(e) => setEmiDownPayment(e.target.value ? Number(e.target.value) : '')}
                      className="h-[40px] rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Period (Months)</label>
                    <Input 
                      type="number" 
                      value={emiPeriod} 
                      onChange={(e) => setEmiPeriod(e.target.value ? Number(e.target.value) : '')}
                      className="h-[40px] rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interest (% p.a.)</label>
                    <Input 
                      type="number" 
                      value={emiInterest} 
                      onChange={(e) => setEmiInterest(e.target.value ? Number(e.target.value) : '')}
                      className="h-[40px] rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle Price</label>
                  <Input 
                    type="number" 
                    value={vehiclePrice} 
                    onChange={(e) => setVehiclePrice(e.target.value ? Number(e.target.value) : '')}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 transition-all font-medium"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid Amount</label>
                  <Input 
                    type="number" 
                    value={paidAmount} 
                    onChange={(e) => setPaidAmount(e.target.value ? Number(e.target.value) : '')}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 shadow-sm focus:ring-emerald-500/50 transition-all font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dues Amount</label>
                  <Input 
                    type="number" 
                    value={duesAmount} 
                    readOnly
                    className="h-[40px] rounded-xl border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 cursor-not-allowed shadow-sm font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Alt Number</label>
                  <Input 
                    type="text" 
                    value={customerAltNumber} 
                    onChange={(e) => setCustomerAltNumber(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 hover:border-emerald-300 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Engine No</label>
                  <Input 
                    value={engineNumber} 
                    onChange={(e) => setEngineNumber(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 uppercase font-mono tracking-wider font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle Number</label>
                  <Input 
                    value={vehicleNumber} 
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 uppercase font-mono tracking-wider font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Citizenship Certificate No.</label>
                  <Input 
                    value={citizenshipNumber} 
                    onChange={(e) => setCitizenshipNumber(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Father's Name</label>
                  <Input 
                    value={fathersName} 
                    onChange={(e) => setFathersName(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 transition-all font-medium"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grandfather's Name</label>
                  <Input 
                    value={grandFathersName} 
                    onChange={(e) => setGrandFathersName(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 transition-all font-medium"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes (Printed on Quotation)</label>
                  <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any additional notes..."
                    className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 min-h-[100px] p-4 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-300 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">Battery Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Battery Type</label>
                  <Input 
                    value={batteryType} 
                    onChange={(e) => setBatteryType(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 font-medium transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Battery Brand</label>
                  <Input 
                    value={batteryBrand} 
                    onChange={(e) => setBatteryBrand(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 font-medium transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bluetooth ID</label>
                  <Input 
                    value={bluetoothId} 
                    onChange={(e) => setBluetoothId(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 font-mono font-bold transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product ID</label>
                  <Input 
                    value={productId} 
                    onChange={(e) => setProductId(e.target.value)}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 font-mono font-bold transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">No. of Battery (pcs)</label>
                  <Input 
                    type="number"
                    value={noOfBattery} 
                    onChange={(e) => setNoOfBattery(e.target.value ? Number(e.target.value) : '')}
                    className="h-[40px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 shadow-sm focus:ring-emerald-500/50 font-black text-emerald-600 dark:text-emerald-400 transition-all"
                  />
                </div>
              </div>

              {serialNumbers.length > 0 && (
                <div className="mt-8 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-inner">
                   <h3 className="text-slate-700 dark:text-slate-300 font-bold mb-4 flex items-center gap-2"><Hash className="w-5 h-5 text-emerald-500" /> Battery Serial Numbers</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     {serialNumbers.map((s, idx) => (
                       <div key={idx} className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block">S.N. {idx + 1}</label>
                         <Input 
                           value={s}
                           onChange={(e) => {
                             const nArr = [...serialNumbers];
                             nArr[idx] = e.target.value;
                             setSerialNumbers(nArr);
                           }}
                           placeholder={`SN-${idx + 1}...`}
                           className="h-[40px] bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-mono text-sm font-semibold shadow-sm focus:ring-emerald-500/50"
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
          <div className="px-8 py-[10px] mb-0 h-full animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col xl:flex-row gap-6 overflow-hidden">
            
            {/* Left Sidebar: Downloads & Print */}
            <div className="w-full xl:w-[280px] shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden py-[5px] px-[10px]">
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-[24px] pl-6 pt-[5px] pb-0 mb-[9px] space-y-5">
                 
                 <div className="space-y-2">
                   <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Quotation</p>
                   <div className="flex gap-2">
                     <Button 
                       onClick={() => handleDownloadPDF('quotation', selectedSale!, 'download')}
                       disabled={isGeneratingPdf}
                       variant="outline"
                       className="flex-1 rounded-xl border-emerald-200/60 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm font-bold h-10 transition-all"
                     >
                       <Download className="w-4 h-4 mr-2" />
                       Download
                     </Button>
                     <Button 
                       onClick={() => handleDownloadPDF('quotation', selectedSale!, 'print')}
                       disabled={isGeneratingPdf}
                       variant="outline"
                       className="shrink-0 w-12 rounded-xl border-emerald-200/60 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm h-10 transition-all"
                       title="Print / Preview Quotation"
                     >
                       <Printer className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>

                 {onEmi && (
                   <div className="space-y-2">
                     <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">EMI List</p>
                     <div className="flex gap-2">
                       <Button 
                         onClick={() => handleDownloadEMIList('download')}
                         disabled={isGeneratingPdf}
                         variant="outline"
                         className="flex-1 rounded-xl border-indigo-200/60 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm font-bold h-10 transition-all"
                       >
                         <Download className="w-4 h-4 mr-2" />
                         Download
                       </Button>
                       <Button 
                         onClick={() => handleDownloadEMIList('print')}
                         disabled={isGeneratingPdf}
                         variant="outline"
                         className="shrink-0 w-12 rounded-xl border-indigo-200/60 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm h-10 transition-all"
                         title="Print / Preview EMI List"
                       >
                         <Printer className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 )}
                 
                 <div className="space-y-2">
                   <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Traffic Letter</p>
                   <div className="flex gap-2">
                     <Button 
                       onClick={() => handleDownloadPDF('traffic', selectedSale!, 'download')}
                       disabled={isGeneratingPdf}
                       variant="outline"
                       className="flex-1 rounded-xl border-emerald-200/60 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm font-bold h-10 transition-all"
                     >
                       <Download className="w-4 h-4 mr-2" />
                       Download
                     </Button>
                     <Button 
                       onClick={() => handleDownloadPDF('traffic', selectedSale!, 'print')}
                       disabled={isGeneratingPdf}
                       variant="outline"
                       className="shrink-0 w-12 rounded-xl border-emerald-200/60 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm h-10 transition-all"
                       title="Print / Preview Traffic Letter"
                     >
                       <Printer className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Citizenship A4</p>
                   <div className="flex gap-2">
                     <Button 
                       onClick={() => handleDownloadCitizenshipA4('download')}
                       disabled={isGeneratingPdf || (!images['citizenship_front'] && !images['citizenship_back'])}
                       variant="outline"
                       className="flex-1 rounded-xl border-teal-200/60 text-teal-700 bg-teal-50/50 hover:bg-teal-100 hover:border-teal-300 shadow-sm font-bold h-10 transition-all"
                     >
                       <Download className="w-4 h-4 mr-2" />
                       Download
                     </Button>
                     <Button 
                       onClick={() => handleDownloadCitizenshipA4('print')}
                       disabled={isGeneratingPdf || (!images['citizenship_front'] && !images['citizenship_back'])}
                       variant="outline"
                       className="shrink-0 w-12 rounded-xl border-teal-200/60 text-teal-700 bg-teal-50/50 hover:bg-teal-100 hover:border-teal-300 shadow-sm h-10 transition-all"
                       title="Print / Preview Citizenship A4"
                     >
                       <Printer className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>

                 <div className="space-y-2 block">
                   <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-800 my-2"></div>
                   <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2">Bikrinama (EV)</p>
                   <Button 
                     onClick={() => handleDownloadUploadedImagePDF('bikrinama_ev', 'Bikrinama EV', 'print')}
                     disabled={isGeneratingPdf}
                     variant="outline"
                     className="w-full justify-center rounded-xl border-orange-200/60 text-orange-700 bg-orange-50/50 hover:bg-orange-100 hover:border-orange-300 shadow-sm font-bold h-10 transition-all"
                     title="Print Bikrinama (EV)"
                   >
                     <Printer className="w-4 h-4 mr-2" />
                     Print View
                   </Button>
                 </div>

                 <div className="space-y-2">
                   <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2">Bikrinama (Petrol)</p>
                   <Button 
                     onClick={() => handleDownloadUploadedImagePDF('bikrinama_petrol', 'Bikrinama Petrol', 'print')}
                     disabled={isGeneratingPdf}
                     variant="outline"
                     className="w-full justify-center rounded-xl border-rose-200/60 text-rose-700 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300 shadow-sm font-bold h-10 transition-all"
                     title="Print Bikrinama (Petrol)"
                   >
                     <Printer className="w-4 h-4 mr-2" />
                     Print View
                   </Button>
                 </div>

              </div>
            </div>

            {/* Right Content: Upload Documents */}
            <div className="flex-1 bg-white dark:bg-[#0f172a] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pt-[2px] pb-[2px] mb-4 shrink-0">
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400">Upload Documents</h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {['Citizenship Front', 'Citizenship Back', 'Agreement Paper', 'Photo', 'Quotation', 'Traffic Letter', 'Bikrinama EV', 'Bikrinama Petrol', 'Cheque', 'Additional Doc 1', 'Additional Doc 2', 'Additional Doc 3'].map((docName) => {
                const docKey = docName.toLowerCase().replace(/ /g, '_');
                return (
                  <div key={docName} className="relative border-2 border-dashed border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 h-44 bg-slate-50/50 dark:bg-[#0f172a] hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-400 transition-all group overflow-hidden shadow-sm hover:shadow-md cursor-pointer">
                    {images[docKey] ? (
                      <>
                        <img src={images[docKey]} alt={docName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                        <div className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="absolute bottom-3 left-0 right-0 z-10 text-[10px] font-black text-white px-3 tracking-widest uppercase text-center">{docName}</span>
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 z-20 backdrop-blur-sm">
                           <Button variant="secondary" size="sm" className="w-24 h-8 rounded-full font-bold shadow-lg" onClick={() => setPreviewImage(images[docKey])}>Preview</Button>
                           <Button variant="destructive" size="sm" className="w-24 h-8 rounded-full font-bold shadow-lg" onClick={() => {
                             const n = {...images};
                             delete n[docKey];
                             setImages(n);
                           }}>Remove</Button>
                        </div>
                      </>
                    ) : uploadProgress[docKey] !== undefined ? (
                      <div className="flex flex-col items-center justify-center w-full space-y-3 px-4">
                        <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress[docKey]}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Uploading {uploadProgress[docKey]}%</span>
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#0f172a] flex items-center justify-center shadow-sm group-hover:-translate-y-1 transition-all duration-300 mb-3 border border-slate-100 dark:border-slate-800 group-hover:border-emerald-200">
                          <FileText className="w-6 h-6 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 text-center uppercase tracking-wider">{docName}</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUploadProgress(prev => ({ ...prev, [docKey]: 0 }));
                              const interval = setInterval(() => {
                                setUploadProgress(prev => {
                                  const current = prev[docKey] || 0;
                                  if (current >= 90) {
                                    clearInterval(interval);
                                    return prev;
                                  }
                                  return { ...prev, [docKey]: current + 15 };
                                });
                              }, 100);

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

                                  setTimeout(() => {
                                    setUploadProgress(prev => ({ ...prev, [docKey]: 100 }));
                                    setTimeout(() => {
                                      setImages(prev => ({ ...prev, [docKey]: canvas.toDataURL('image/jpeg', 0.6) }));
                                      setUploadProgress(prev => {
                                        const next = { ...prev };
                                        delete next[docKey];
                                        return next;
                                      });
                                    }, 200);
                                  }, 500);
                                };
                                img.src = ev.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-x-auto w-full">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-5 px-8 py-[10px] border-b border-slate-200/60 dark:border-slate-700 font-black text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#0f172a] shrink-0 text-sm tracking-wider uppercase">
                   <div>SN.</div>
                   <div>Chassis Details</div>
                   <div>Customer Details</div>
                   <div>Document Status</div>
                   <div>Action</div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                  {sales.filter(s => s.documentationCompleted).length === 0 ? (
                    <div className="h-full flex items-center justify-center p-8">
                      <div className="text-slate-500 font-medium bg-slate-50/50 px-6 py-3 rounded-full border border-slate-100 dark:border-slate-800">No Completed Documents Found</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                      {sales.filter(s => s.documentationCompleted).map((sale, idx) => {
                        const customer = customers.find(c => c.id === sale.customerId);
                        return (
                          <div 
                            key={sale.id}
                            onClick={() => setSelectedSale(sale)}
                            className={`grid grid-cols-5 px-4 py-[4px] items-center cursor-pointer transition-all rounded-lg mx-1 my-[1px] ${selectedSale?.id === sale.id ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm border border-emerald-100 dark:border-emerald-900/30' : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50 border border-transparent'}`}
                          >
                        <div className="font-bold text-slate-400 text-sm w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">{idx + 1}</div>
                        <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">{sale.chassisNumber}</div>
                        <div className="text-slate-800 dark:text-slate-200 font-black">{customer?.name || '---'}</div>
                        <div>
                          <span className="px-3 py-1 rounded-md text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white uppercase tracking-widest shadow-sm shadow-emerald-500/20">Completed</span>
                        </div>
                        <div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="font-bold rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all border shadow-sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewSale(sale);
                              setViewSheetOpen(true);
                            }}
                          >
                            View Document
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between items-center shrink-0 px-2 pt-[6px] pb-[6px] mb-0">
        <div>
          {(activeTab === 'documents' || activeTab === 'others_details' || activeTab === 'completed') && (
            <Button
              variant="outline"
              disabled={loading || (activeTab === 'completed' && !selectedSale) || (activeTab === 'others_details' && selectedSale?.documentationCompleted)}
              onClick={handlePrevious}
              className={`border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 bg-white/50 dark:bg-[#0f172a] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl px-6 py-[16px] font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all ${activeTab === 'others_details' && selectedSale?.documentationCompleted ? 'opacity-0 pointer-events-none' : ''}`}
            >
              {'<< BACK'}
            </Button>
          )}
        </div>
        
        {activeTab !== 'completed' && (
          <Button 
            disabled={loading || (activeTab === 'sold_vehicle' && !selectedSale)}
            onClick={handleNext}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl px-6 py-[16px] font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all"
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
              <div className="bg-white dark:bg-[#0f172a] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
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
              <div className="bg-white dark:bg-[#0f172a] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
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
              <div className="bg-white dark:bg-[#0f172a] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
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
              <div className="bg-white dark:bg-[#0f172a] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
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
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-slate-500 font-medium">Notes</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 whitespace-pre-line">{viewSale.otherDetails?.notes || '---'}</p>
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
                  <div className="mt-4 bg-slate-50 dark:bg-[#0f172a] rounded-lg p-4">
                    <p className="text-sm text-slate-500 font-medium mb-2">Battery Serial Numbers</p>
                    <div className="flex flex-wrap gap-2">
                      {viewSale.otherDetails.serialNumbers.map((sn, idx) => (
                        <span key={idx} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 px-3 py-1 rounded text-sm font-mono text-slate-700 shadow-sm">
                          {sn || 'N/A'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="bg-white dark:bg-[#0f172a] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-slate-500" /> Documents
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {['Citizenship Front', 'Citizenship Back', 'Agreement Paper', 'Photo', 'Quotation', 'Traffic Letter', 'Bikrinama EV', 'Bikrinama Petrol', 'Cheque', 'Additional Doc 1', 'Additional Doc 2', 'Additional Doc 3'].map((docName) => {
                    const docKey = docName.toLowerCase().replace(/ /g, '_');
                    const hasImage = viewSale.otherDetails?.images?.[docKey];
                    return (
                      <div key={docName} className="relative border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center space-y-2 bg-slate-50 dark:bg-[#0f172a] overflow-hidden h-32">
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

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-slate-800">
          <DialogHeader className="absolute top-0 right-0 z-50 p-4">
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[50vh] max-h-[90vh]">
            {previewImage && (
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cross Check Dialog */}
      <Dialog open={showCrossCheckModal} onOpenChange={setShowCrossCheckModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 border-b pb-2">Cross Check Form Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <p className="font-bold text-slate-700 underline text-sm uppercase">Financial Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-medium text-slate-500">Vehicle Price:</span>
                <span className="font-bold text-slate-900">{vehiclePrice || '---'}</span>
                
                <span className="font-medium text-slate-500">Paid Amount:</span>
                <span className="font-bold text-emerald-600">{paidAmount || '---'}</span>
                
                <span className="font-medium text-slate-500">Dues Amount:</span>
                <span className="font-bold text-rose-600">{duesAmount || '---'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-700 underline text-sm uppercase mt-4">Personal Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-medium text-slate-500">Father's Name:</span>
                <span className="font-bold text-slate-900">{fathersName || '---'}</span>

                <span className="font-medium text-slate-500">Grandfather's Name:</span>
                <span className="font-bold text-slate-900">{grandFathersName || '---'}</span>

                <span className="font-medium text-slate-500">Alt Contact Number:</span>
                <span className="font-bold text-slate-900">{customerAltNumber || '---'}</span>

                <span className="font-medium text-slate-500">Citizenship No:</span>
                <span className="font-bold text-slate-900">{citizenshipNumber || '---'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-700 underline text-sm uppercase mt-4">Battery Information</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-medium text-slate-500">Battery Type:</span>
                <span className="font-bold text-slate-900">{batteryType || '---'}</span>

                <span className="font-medium text-slate-500">No. of Battery:</span>
                <span className="font-bold text-slate-900">{noOfBattery || '---'}</span>
              </div>
              
              {serialNumbers.length > 0 && (
                <div className="mt-2">
                  <span className="font-medium text-slate-500 text-sm">Serial Numbers:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {serialNumbers.map((sn, idx) => (
                      <span key={idx} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono text-slate-700 dark:text-slate-300">
                        {sn || 'N/A'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCrossCheckModal(false)}>Edit Details</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handleConfirmCrossCheck}
            >
              Confirm and Proceed to Documents
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                productId, notes, noOfBattery, serialNumbers
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
                productId, notes, noOfBattery, serialNumbers
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
