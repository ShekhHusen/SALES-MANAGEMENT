import sys
import re

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

# 1. Imports
imports = """import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { PdfTemplates } from '@/components/PdfTemplates';
"""
content = content.replace("import { toast } from 'sonner';", "import { toast } from 'sonner';\n" + imports)

# 2. Add refs and state
ref_state = """  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);
  const quotationTemplateRef = React.useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);"""
content = content.replace("const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);", ref_state)

# 3. Replace handlePrintQuotation
old_handle_start = "const handlePrintQuotation = (q: Quotation) => {"
old_handle_end_idx = content.find("  const handleCreateQuotation = async () => {")
old_handle_block = content[content.find(old_handle_start):old_handle_end_idx]

new_handle_block = """  const handlePrintQuotation = async () => {
    if (!quotationTemplateRef.current?.printRef1.current) return;
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

"""

content = content.replace(old_handle_block, new_handle_block)

# 4. Modify button onclick
content = content.replace("onClick={() => handlePrintQuotation(viewQuotation)}", "onClick={handlePrintQuotation}\n                  disabled={isGeneratingPdf}")
content = content.replace("Print Quotation", "{isGeneratingPdf ? 'Generating...' : 'Print Quotation'}")

# 5. Insert hidden PdfTemplates inside the dialog content
hidden_pdf_code = """
              <div className="absolute left-[-9999px] top-0">
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
"""

# Find where to put it. Let's put it right before <div className="grid gap-6 py-4"> in the View Dialog
content = content.replace('<div className="grid gap-6 py-4">', hidden_pdf_code + '\n              <div className="grid gap-6 py-4">', 1)

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)

print("Patched successfully")
