import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { TableHead } from "@/components/ui/table";
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Search, FileText, CheckCircle, Info, CreditCard, Battery, Hash, Image as ImageIcon, Download, Printer, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, limit, getDocs, startAfter } from '@/lib/trackedFirestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Sale, Party, Vehicle, Company, Model } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Pagination } from '@/components/Pagination';
import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';
import { PdfTemplates } from '@/components/PdfTemplates';

type TabType = 'sold_vehicle' | 'others_details' | 'documents' | 'completed';

import { useGlobalData } from '@/contexts/GlobalDataContext';

export function ProcessDocument() {
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const { sales, parties, vehicles, companies, models, loadProcessDocumentData, isProcessDocumentLoaded } = useGlobalData();
  useEffect(() => {
    loadProcessDocumentData();
  }, []);
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

  // Pagination State for Sold Vehicles
  const [soldCurrentPage, setSoldCurrentPage] = useState(1);
  const [soldItemsPerPage, setSoldItemsPerPage] = useState<number | 'all'>('all');

  // Sorting State for Sold Vehicles
  const [soldSortConfig, setSoldSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  // Completed Sales State
  const [completedSalesData, setCompletedSalesData] = useState<Sale[]>([]);
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const [completedItemsPerPage, setCompletedItemsPerPage] = useState<number | 'all'>(5);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedTotalPages, setCompletedTotalPages] = useState(1);
  const [completedTotalItems, setCompletedTotalItems] = useState<number>(0);
  const [completedCursors, setCompletedCursors] = useState<any[]>([null]); // index 0 is page 1 start cursor
  const [completedError, setCompletedError] = useState<string | null>(null);

  // Added getCountFromServer to track total items
  const fetchCompletedSales = async (pageIndex: number, itemsPerPage: number | 'all') => {
    setCompletedLoading(true);
    setCompletedError(null);
    try {
      // Get total count (runs once or when needed)
      if (pageIndex === 1) {
        try {
          const { getCountFromServer } = await import('firebase/firestore');
          const countSnap = await getCountFromServer(query(collection(db, 'sales'), where('documentationCompleted', '==', true)));
          setCompletedTotalItems(countSnap.data().count);
        } catch (e) {
          console.warn("Could not get count", e);
        }
      }

      let q = query(
        collection(db, 'sales'),
        where('documentationCompleted', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      if (itemsPerPage !== 'all') {
         q = query(q, limit(itemsPerPage));
      }

      // If we have a cursor for this page, use startAfter
      const cursor = completedCursors[pageIndex - 1];
      if (cursor && itemsPerPage !== 'all') {
        q = query(
          collection(db, 'sales'),
          where('documentationCompleted', '==', true),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      }

      const snapshot = await getDocs(q);
      const fetchedSales = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale));
      
      setCompletedSalesData(fetchedSales);
      
      if (itemsPerPage === 'all') {
        setCompletedTotalPages(1);
      } else {
        // Setup cursor for next page if we got a full page
        if (snapshot.docs.length === itemsPerPage) {
          const lastVisible = snapshot.docs[snapshot.docs.length - 1];
          setCompletedCursors(prev => {
            const newCursors = [...prev];
            newCursors[pageIndex] = lastVisible;
            return newCursors;
          });
          setCompletedTotalPages(Math.max(completedTotalPages, pageIndex + 1));
        } else {
          setCompletedTotalPages(pageIndex);
        }
      }
    } catch (err: any) {
      console.error("Error fetching completed sales:", err);
      if (err.message?.includes('index')) {
        setCompletedError("An index is building or required in Firestore. Please wait or check Firestore console.");
        toast.error("Firestore index required. Check console for URL.");
      } else {
        setCompletedError(err.message || "Failed to load completed sales");
      }
    } finally {
      setCompletedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'completed') {
      fetchCompletedSales(completedCurrentPage, completedItemsPerPage);
    }
  }, [activeTab, completedCurrentPage, completedItemsPerPage]);

  // Keep old sort config state just in case, but disable sorting for completed since it's server-paginated
  const [completedSortConfig, setCompletedSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const handleSoldSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (soldSortConfig.key === key && soldSortConfig.direction === 'asc') direction = 'desc';
    setSoldSortConfig({ key, direction });
  };

  const handleCompletedSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (completedSortConfig.key === key && completedSortConfig.direction === 'asc') direction = 'desc';
    setCompletedSortConfig({ key, direction });
  };

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
      let monthlyInterestRate = 0;
      if (principal > 0 && period > 0) {
        if (interestRate > 0) {
          monthlyInterestRate = (interestRate / 12) / 100;
          emi = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, period) / (Math.pow(1 + monthlyInterestRate, period) - 1);
        } else {
          emi = principal / period;
        }
      }
      
      pdf.text(`Expected Monthly EMI: Rs ${Math.round(emi)}`, 250, y);
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
      
      for (let i = 1; i <= period; i++) {
        const monthlyInterest = currentRemaining * monthlyInterestRate;
        let monthlyPrincipal = emi - monthlyInterest;
        if (interestRate === 0) monthlyPrincipal = emi;
        
        currentRemaining -= monthlyPrincipal;
        if (currentRemaining < 0) currentRemaining = 0;
        
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
      const fetchSale = async () => {
        let tSale = [...sales, ...completedSalesData].find(s => s.id === saleId);
        if (!tSale) {
           const { getDoc, doc } = await import('@/lib/trackedFirestore');
           const sDoc = await getDoc(doc(db, 'sales', saleId));
           if (sDoc.exists()) {
             tSale = { ...sDoc.data(), id: sDoc.id } as Sale;
           }
        }
        if (tSale) {
          setSelectedSale(tSale);
          if (location.state.tab === 'others_details') {
            setActiveTab('others_details');
            setUnlockedTabs(prev => ({ ...prev, others_details: true }));
          }
        }
      };
      fetchSale();
    }
  }, [location.state, sales, completedSalesData]);

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
  const [isDownloadsExpanded, setIsDownloadsExpanded] = useState(false);

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
      
      setUnlockedTabs(prev => ({ ...prev, others_details: true, documents: true }));
      setActiveTab('documents');
    } else if (activeTab === 'documents') {
      setActiveTab('others_details');
    } else if (activeTab === 'others_details') {
      if (selectedSale?.documentationCompleted) {
        // Do not go back further if we are editing a completed sale
      } else {
        setUnlockedTabs(prev => ({ ...prev, others_details: false, documents: false }));
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
           (customer?.name?.toLowerCase() || "").includes(searchLow) ||
           (customer?.contactNumber?.toLowerCase() || "").includes(searchLow);
  });

  // Sort Sold Vehicles: dynamic sort based on configurable columns
  const sortedSoldSales = [...filteredSales].sort((a, b) => {
    let aVal: any = a[soldSortConfig.key as keyof Sale];
    let bVal: any = b[soldSortConfig.key as keyof Sale];
    
    if (soldSortConfig.key === 'customerName') {
      aVal = customers.find(c => c.id === a.customerId)?.name || '';
      bVal = customers.find(c => c.id === b.customerId)?.name || '';
    } else if (soldSortConfig.key === 'contactNumber') {
      aVal = customers.find(c => c.id === a.customerId)?.contactNumber || '';
      bVal = customers.find(c => c.id === b.customerId)?.contactNumber || '';
    } else if (soldSortConfig.key === 'createdAt') {
      aVal = a.createdAt?.toMillis() || 0;
      bVal = b.createdAt?.toMillis() || 0;
    } else if (soldSortConfig.key === 'fileNumber') {
      aVal = Number(a.fileNumber) || 0;
      bVal = Number(b.fileNumber) || 0;
    }

    if (aVal < bVal) return soldSortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return soldSortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Pagination logic for Sold Vehicles
  const totalSold = sortedSoldSales.length;
  const soldTotalPages = soldItemsPerPage === 'all' ? 1 : Math.ceil(totalSold / (soldItemsPerPage as number));
  const currentSoldSales = soldItemsPerPage === 'all' 
    ? sortedSoldSales 
    : sortedSoldSales.slice((soldCurrentPage - 1) * (soldItemsPerPage as number), soldCurrentPage * (soldItemsPerPage as number));

  // Completed Sales
  const filteredCompletedSales = completedSalesData.filter(s => {
    const customer = customers.find(c => c.id === s.customerId);
    const searchLow = searchQuery.toLowerCase();
    return s.chassisNumber.toLowerCase().includes(searchLow) || 
           (customer?.name?.toLowerCase() || "").includes(searchLow) ||
           (customer?.contactNumber?.toLowerCase() || "").includes(searchLow);
  });
  
  const currentCompletedSales = filteredCompletedSales;

  return (
    <div className="flex flex-col h-[599px] overflow-hidden md:p-2 pt-[8px] pb-0 md:pb-0 lg:pt-[10px]">
      <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 shrink-0 mb-[10px]">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
            <FileText className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 drop-shadow-sm">Process Document</h1>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 h-[40px] pt-[1px] mb-[10px]">
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            const newTab = val as TabType;
            if (newTab === 'others_details' || newTab === 'documents') return;
            setActiveTab(newTab);
            if (newTab === 'sold_vehicle') {
               setUnlockedTabs(prev => ({ ...prev, others_details: false, documents: false }));
            }
          }} 
          className="w-full md:w-auto h-[34px] pt-0 mb-0 lg:pb-0"
        >
          <TabsList className="bg-[#e0dede] dark:bg-[#0f172a] backdrop-blur-xl px-1.5 pt-0 pb-0 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex flex-wrap h-[83px] mb-0 md:mb-0 w-full sm:w-auto gap-1 max-md:pt-0 max-md:h-[65px] lg:pt-0 lg:pb-0 lg:h-[35px] lg:bg-[#eee9e9] dark:lg:bg-[#0f172a] lg:pl-[24px] lg:pr-[34px]">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!unlockedTabs[tab.id] || ((tab.id === 'others_details' || tab.id === 'documents') && activeTab !== tab.id)}
                 className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 rounded-xl font-bold text-sm px-6 py-[5px] h-[30px] transition-all lg:pt-[4px] lg:pb-[4px] lg:px-[24px]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 max-md:mt-[24px] lg:pt-0 lg:pb-[3px]">
          <div className="relative group lg:pb-0 lg:pt-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              type="text" 
              placeholder="Search by chassis, name..." 
              className="pl-9 w-full md:w-72 h-[41px] rounded-xl bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700 shadow-sm focus:ring-emerald-500/50 transition-all max-md:mt-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-11 h-11 p-0 rounded-xl bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700 shadow-sm hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-all max-md:mt-0">
            <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 h-[400px] rounded-2xl border-slate-200/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 flex flex-col overflow-hidden bg-white/80 dark:bg-slate-950 backdrop-blur-xl mb-0 pt-0 pb-0 max-md:mt-[71px]">
        {selectedSale && (activeTab === 'others_details' || activeTab === 'documents') && (() => {
          const customer = customers.find(c => c.id === selectedSale.customerId);
          return (
            <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 border-b border-blue-100 dark:border-blue-800 flex items-center shrink-0 shadow-inner">
              <Info className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                Editing Documentation for Customer: <span className="font-black text-blue-900 dark:text-blue-200 uppercase tracking-wide">{customer?.name || 'Unknown'}</span> (Chassis: {selectedSale.chassisNumber})
              </span>
            </div>
          );
        })()}

        {activeTab === 'sold_vehicle' && (
          <div className="flex flex-col h-[444px] pt-0 pb-0 animate-in fade-in slide-in-from-bottom-2 duration-300 max-md:mt-[10px] lg:pt-[10px] lg:pb-[10px] flex-1">
            <div className="overflow-x-auto w-full max-md:mt-0 flex-1 flex flex-col h-full">
              <div className="min-w-[700px] flex-1 flex flex-col relative overflow-y-auto">
                <table className="w-full text-left caption-bottom text-sm border-collapse table-fixed">
                  <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0f172a]/95 backdrop-blur-sm shadow-sm font-black text-slate-500 dark:text-slate-400 text-sm tracking-wider uppercase border-b border-slate-200/60 dark:border-slate-700">
                    <tr>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-[120px]" onClick={() => handleSoldSort('date')}>
                        <div className="flex items-center gap-1">Sale Date <ArrowUpDown className={`w-3 h-3 ${soldSortConfig.key === 'date' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-[100px]" onClick={() => handleSoldSort('fileNumber')}>
                        <div className="flex items-center gap-1">File No. <ArrowUpDown className={`w-3 h-3 ${soldSortConfig.key === 'fileNumber' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-[180px]" onClick={() => handleSoldSort('chassisNumber')}>
                        <div className="flex items-center gap-1">Chassis Number <ArrowUpDown className={`w-3 h-3 ${soldSortConfig.key === 'chassisNumber' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors" onClick={() => handleSoldSort('customerName')}>
                        <div className="flex items-center gap-1">Customer Name <ArrowUpDown className={`w-3 h-3 ${soldSortConfig.key === 'customerName' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-[150px]" onClick={() => handleSoldSort('contactNumber')}>
                        <div className="flex items-center gap-1">Contact Number <ArrowUpDown className={`w-3 h-3 ${soldSortConfig.key === 'contactNumber' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60 [&_tr:last-child]:border-0">
                  {currentSoldSales.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium">No Data Available</td></tr>
                  ) : (
                    currentSoldSales.map(sale => {
                      const customer = customers.find(c => c.id === sale.customerId);
                      const isSelected = selectedSale?.id === sale.id;
                      return (
                        <tr 
                          key={sale.id}
                          onClick={() => setSelectedSale(sale)}
                          className={`cursor-pointer transition-all ${isSelected ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{(sale.date as any)?.toDate?.()?.toLocaleDateString('en-GB') || (sale.date ? new Date(sale.date as string).toLocaleDateString('en-GB') : '---')}</td>
                          <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap overflow-hidden text-ellipsis">#{sale.fileNumber}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap overflow-hidden text-ellipsis">{sale.chassisNumber}</td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-black whitespace-nowrap overflow-hidden text-ellipsis">{customer?.name || '---'}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{customer?.contactNumber || '---'}</td>
                        </tr>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          
            <Pagination 
              currentPage={soldCurrentPage}
              totalPages={soldTotalPages}
              onPageChange={setSoldCurrentPage}
              itemsPerPage={soldItemsPerPage}
              setItemsPerPage={setSoldItemsPerPage}
              totalItems={totalSold}
            />
          </div>
        )}

        {activeTab === 'others_details' && (
          <div className="px-8 space-y-10 overflow-y-auto h-[444px] pt-0 pb-0 animate-in fade-in slide-in-from-bottom-2 duration-300 max-md:mt-[10px] lg:pt-[10px] lg:pb-[10px]">
            <div className="bg-slate-50/50 dark:bg-[#0f172a] px-6 py-[5px] rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm max-md:mt-0">
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
          <div className="px-8 mb-0 h-[444px] pt-0 pb-0 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col xl:flex-row gap-6 overflow-hidden max-md:mt-[10px] lg:pt-[10px] lg:pb-[10px]">
            
            {/* Left Sidebar: Downloads & Print */}
            <div className={`w-full xl:w-[280px] shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col py-[5px] px-[10px] transition-all xl:h-full overflow-hidden ${isDownloadsExpanded ? 'max-h-[50vh]' : 'h-[50px] xl:max-h-none xl:h-full'} max-md:mt-0`}>
              <div 
                className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 cursor-pointer xl:cursor-default"
                onClick={() => setIsDownloadsExpanded(!isDownloadsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Download Links</h3>
                </div>
                <div className="xl:hidden">
                  {isDownloadsExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto overflow-x-hidden pr-[24px] pl-6 pt-[5px] pb-0 mb-[9px] space-y-5 ${isDownloadsExpanded ? 'block' : 'hidden xl:block'}`}>
                 
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
            <div className="flex-1 bg-white dark:bg-[#0f172a] rounded-2xl px-6 pt-[4px] pb-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[250px] lg:h-[425px] overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pt-[2px] pb-[2px] mb-4 shrink-0">
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400">Upload Documents</h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {['Citizenship Front', 'Citizenship Back', 'Agreement Paper', 'Photo', 'Selfie', 'Quotation', 'Traffic Letter', 'Bikrinama EV', 'Bikrinama Petrol', 'Cheque', 'Additional Doc 1', 'Additional Doc 2', 'Additional Doc 3'].map((docName) => {
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
          <div className="flex flex-col h-[444px] pt-0 pb-0 animate-in fade-in slide-in-from-bottom-2 duration-300 max-md:mt-[10px] lg:pt-[10px] lg:pb-[10px] flex-1">
            <div className="overflow-x-auto w-full max-md:mt-0 flex-1 flex flex-col h-full">
              <div className="min-w-[800px] flex-1 flex flex-col relative overflow-y-auto">
                <table className="w-full text-left caption-bottom text-sm border-collapse table-fixed">
                  <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0f172a]/95 backdrop-blur-sm shadow-sm font-black text-slate-500 dark:text-slate-400 text-sm tracking-wider uppercase border-b border-slate-200/60 dark:border-slate-700">
                    <tr>
                      <TableHead className="px-4 py-[10px] w-[80px]">SN.</TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-[120px]" onClick={() => handleCompletedSort('date')}>
                        <div className="flex items-center gap-1">Sale Date <ArrowUpDown className={`w-3 h-3 ${completedSortConfig.key === 'date' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-[100px]" onClick={() => handleCompletedSort('fileNumber')}>
                        <div className="flex items-center gap-1">File No. <ArrowUpDown className={`w-3 h-3 ${completedSortConfig.key === 'fileNumber' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-[180px]" onClick={() => handleCompletedSort('chassisNumber')}>
                        <div className="flex items-center gap-1">Chassis Details <ArrowUpDown className={`w-3 h-3 ${completedSortConfig.key === 'chassisNumber' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors" onClick={() => handleCompletedSort('customerName')}>
                        <div className="flex items-center gap-1">Customer Details <ArrowUpDown className={`w-3 h-3 ${completedSortConfig.key === 'customerName' ? 'text-blue-500' : 'text-slate-400'}`} /></div>
                      </TableHead>
                      <TableHead className="px-4 py-[10px] w-[140px]">Document Status</TableHead>
                      <TableHead className="px-4 py-[10px] w-[150px]">Action</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60 [&_tr:last-child]:border-0">
                  {currentCompletedSales.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center"><div className="inline-block text-slate-500 font-medium bg-slate-50/50 px-6 py-3 rounded-full border border-slate-100 dark:border-slate-800">No Completed Documents Found</div></td></tr>
                  ) : (
                    currentCompletedSales.map((sale, idx) => {
                      const customer = customers.find(c => c.id === sale.customerId);
                      const displayIdx = completedItemsPerPage === 'all' ? idx + 1 : (completedCurrentPage - 1) * (completedItemsPerPage as number) + idx + 1;
                      return (
                        <tr 
                          key={sale.id}
                          onClick={() => setSelectedSale(sale)}
                          className={`cursor-pointer transition-all ${selectedSale?.id === sale.id ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                        >
                          <td className="px-4 py-3"><div className="font-bold text-slate-400 text-sm w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">{displayIdx}</div></td>
                          <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{(sale.date as any)?.toDate?.()?.toLocaleDateString('en-GB') || (sale.date ? new Date(sale.date as string).toLocaleDateString('en-GB') : '---')}</td>
                          <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap overflow-hidden text-ellipsis">#{sale.fileNumber}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap overflow-hidden text-ellipsis">{sale.chassisNumber}</td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-black whitespace-nowrap overflow-hidden text-ellipsis">{customer?.name || '---'}</td>
                          <td className="px-4 py-3"><span className="px-3 py-1 rounded-md text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white uppercase tracking-widest shadow-sm shadow-emerald-500/20">Completed</span></td>
                          <td className="px-4 py-3">
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          
            <Pagination 
              currentPage={completedCurrentPage}
              totalPages={completedTotalPages}
              onPageChange={setCompletedCurrentPage}
              itemsPerPage={completedItemsPerPage}
              setItemsPerPage={setCompletedItemsPerPage}
              totalItems={completedTotalItems}
            />
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

      <ProcessDocumentSheet 
        open={viewSheetOpen} 
        onOpenChange={setViewSheetOpen} 
        viewSale={viewSale} 
      />
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
