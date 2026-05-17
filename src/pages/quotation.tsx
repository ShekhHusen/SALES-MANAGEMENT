import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { FileText, Printer, FileDown, Download, Mail, Phone } from 'lucide-react';
import { Sale, Vehicle, Party, Company, Model } from '@/types';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { PdfTemplates } from '@/components/PdfTemplates';
import { useGlobalData } from '@/contexts/GlobalDataContext';

export function Quotation() {
  const { sales: allSales, vehicles, parties, companies, models } = useGlobalData();
  const sales = allSales.filter(s => s.documentationCompleted);
  const customers = parties.filter(p => p.type === 'customer');
  
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [docType, setDocType] = useState<'quotation' | 'traffic'>('quotation');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const printWrapperRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!pdfTemplateRef.current || !pdfTemplateRef.current.printRef1.current) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();

      // Wait for any images to load by using a small delay if necessary, 
      // but toPng usually handles it better.
      const scaleConfig = { 
        quality: 0.95, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      };

      // Page 1
      const imgData1 = await toPng(pdfTemplateRef.current.printRef1.current, scaleConfig);
      
      const imgProps1 = pdf.getImageProperties(imgData1);
      const pdfHeight1 = (imgProps1.height * pdfWidth) / imgProps1.width;
      pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight1);

      // Page 2
      if (pdfTemplateRef.current.printRef2.current && docType === 'quotation') {
        pdf.addPage();
        const imgData2 = await toPng(pdfTemplateRef.current.printRef2.current, scaleConfig);
        const imgProps2 = pdf.getImageProperties(imgData2);
        const pdfHeight2 = (imgProps2.height * pdfWidth) / imgProps2.width;
        pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight2);
      }

      pdf.save(`${docType === 'quotation' ? 'Quotation' : 'Traffic-Letter'}-${selectedSale?.chassisNumber || 'Report'}.pdf`);
    } catch (e: any) {
      console.error(e);
      toast.error('Error generating PDF: ' + (e.message || 'Unknown error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const selectedSale = sales.find(s => s.id === selectedSaleId);
  const vehicle = selectedSale ? vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber) : null;
  const customer = selectedSale ? customers.find(c => c.id === selectedSale.customerId) : null;
  const company = vehicle ? companies.find(c => c.id === vehicle.companyId) : null;
  const model = vehicle ? models.find(m => m.id === vehicle.modelId) : null;
  
  const details = selectedSale?.otherDetails || {};
  const price = Number(details.vehiclePrice) || 0;
  const serials = details.serialNumbers || [];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Document Printing</h1>
          <p className="text-slate-500 font-medium mt-1">Select a completed document process to generate</p>
          <div className="mt-2 text-xs text-amber-600 font-semibold bg-amber-50 inline-block px-2 py-1 rounded">
            Please upload "header.png" and "footer.png" to the public folder using the file explorer for them to appear.
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={docType} onValueChange={(val: any) => setDocType(val)}>
            <SelectTrigger className="w-[150px] border-2 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quotation">Quotation</SelectItem>
              <SelectItem value="traffic">Traffic Letter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSaleId} onValueChange={setSelectedSaleId}>
            <SelectTrigger className="w-full sm:w-[300px] border-2 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Select a Customer/Chassis" />
            </SelectTrigger>
            <SelectContent>
              {sales.map((sale) => {
                const c = customers.find(x => x.id === sale.customerId);
                return (
                  <SelectItem key={sale.id} value={sale.id}>
                    {c?.name || 'Unknown'} - {sale.chassisNumber}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleDownloadPDF}
            disabled={!selectedSaleId || isGeneratingPdf}
            variant="outline"
            className="border-[#1a4731] text-[#1a4731] hover:bg-emerald-50 shrink-0"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button 
            onClick={handlePrint}
            disabled={!selectedSaleId || isGeneratingPdf}
            className="bg-[#1a4731] hover:bg-[#133524] text-white shrink-0"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-200/50 rounded-xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 flex justify-center print:bg-white print:p-0 print:border-none print:m-0 print:overflow-visible">
        {selectedSale ? (
          <div ref={printWrapperRef} className="flex flex-col gap-10 items-center">
             <PdfTemplates
               ref={pdfTemplateRef}
               sale={selectedSale}
               vehicle={vehicle!}
               customer={customer!}
               company={company!}
               model={model!}
               docType={docType}
             />
          </div>
        ) : (
          <div className="flex mt-32 items-center text-slate-400 gap-3">
             <Printer className="w-8 h-8 opacity-20" />
             <span className="font-medium">Select a quotation record to preview</span>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @media print {
          @page { size: A4; margin: 0; }
          body * {
            visibility: hidden;
          }
          /* Override light mode colors for printing since user might be in Dark mode */
          .print\\:visible, .print\\:visible * {
            visibility: visible;
          }
          .flex-1.bg-slate-200\\/50 {
             background: white !important;
          }
          body {
            background-color: white !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
          }
          #root > div > div > main > div > div > div.flex-1 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            visibility: visible;
            overflow: visible !important;
          }
          #root > div > div > main > div > div > div.flex-1 * {
            visibility: visible;
          }
          .page-break-after {
            page-break-after: always;
          }
        }
      `}} />
    </div>
  );
}

