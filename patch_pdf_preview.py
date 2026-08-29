import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# 1. Update handleDownloadPDF signature and templateRef logic
old_handle_start = """  const handleDownloadPDF = async (docType: 'quotation' | 'traffic' | 'bikrinama', sale: Sale, action: 'download' | 'print' = 'download') => {
    let templateRef;
    if (docType === 'quotation') templateRef = quotationTemplateRef;
    else if (docType === 'traffic') templateRef = trafficTemplateRef;

    if (!templateRef?.current || !templateRef.current.printRef1.current) return;"""

new_handle_start = """  const handleDownloadPDF = async (docType: 'quotation' | 'traffic' | 'bikrinama', sale: Sale, action: 'download' | 'print' | 'preview' = 'download') => {
    let templateRef;
    if (docType === 'quotation') templateRef = quotationTemplateRef;
    else if (docType === 'traffic') templateRef = trafficTemplateRef;
    else if (docType === 'bikrinama') templateRef = bikrinamaTemplateRef;

    if (!templateRef?.current || !templateRef.current.printRef1.current) return;"""

content = content.replace(old_handle_start, new_handle_start)

# 2. Add action == 'preview' logic
old_handle_end = """      if (action === 'print') {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      } else {
        pdf.save(`${docType === 'quotation' ? 'Quotation' : 'Traffic-Letter'}-${sale.chassisNumber || 'Report'}.pdf`);
      }
    } catch (e: any) {"""

new_handle_end = """      if (action === 'preview') {
        setPdfPreviewUrl(pdf.output('bloburl'));
      } else if (action === 'print') {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      } else {
        pdf.save(`${docType === 'quotation' ? 'Quotation' : docType === 'traffic' ? 'Traffic-Letter' : 'Bikrinama'}-${sale.chassisNumber || 'Report'}.pdf`);
      }
    } catch (e: any) {"""

content = content.replace(old_handle_end, new_handle_end)

# 3. Add state for preview
old_state = "const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);"
new_state = """const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);"""
content = content.replace(old_state, new_state)

# 4. Add Preview Dialog
old_dialog = "{/* Cross Check Dialog */}"
new_dialog = """{/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => !open && setPdfPreviewUrl(null)}>
        <DialogContent className="sm:max-w-5xl rounded-2xl h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-black text-slate-900">Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 overflow-hidden relative">
            {pdfPreviewUrl && (
              <iframe 
                src={pdfPreviewUrl} 
                className="w-full h-full border-0" 
                title="PDF Preview"
              />
            )}
          </div>
          <div className="p-4 border-t flex justify-end gap-3 shrink-0 bg-white">
            <Button variant="outline" onClick={() => setPdfPreviewUrl(null)}>Close</Button>
            <Button variant="secondary" onClick={() => window.open(pdfPreviewUrl!, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Cross Check Dialog */}"""

content = content.replace(old_dialog, new_dialog)

# 5. Change "Print Bikrinama" in the form to "Preview Document"
old_bikrinama_print = """                    handleDownloadPDF('bikrinama' as any, tempSale, 'print');
                }
            }}>Print Bikrinama</Button>"""

new_bikrinama_print = """                    handleDownloadPDF('bikrinama', tempSale, 'preview');
                }
            }}>Preview Document</Button>"""

content = content.replace(old_bikrinama_print, new_bikrinama_print)

# 6. Change other print actions to 'preview' (Quotation and Traffic)
content = content.replace(
    "onClick={() => handleDownloadPDF('quotation', selectedSale!, 'print')}",
    "onClick={() => handleDownloadPDF('quotation', selectedSale!, 'preview')}"
)

content = content.replace(
    "onClick={() => handleDownloadPDF('traffic', selectedSale!, 'print')}",
    "onClick={() => handleDownloadPDF('traffic', selectedSale!, 'preview')}"
)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)
