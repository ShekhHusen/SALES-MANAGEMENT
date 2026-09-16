import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

# 1. Add viewQuotation state
if "const [search, setSearch] = useState('');" in content:
    content = content.replace("const [search, setSearch] = useState('');", "const [search, setSearch] = useState('');\n  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);")

# 2. Add handlePrintQuotation method
print_fn = """
  const handlePrintQuotation = (q: Quotation) => {
    const customer = parties.find(p => p.id === q.customerId);
    const vehicle = vehicles.find(v => v.chassisNumber === q.chassisNumber);
    const co = companies.find(c => c.id === vehicle?.companyId);
    const mo = models.find(m => m.id === vehicle?.modelId);
    
    const printContent = `
      <html>
        <head>
          <title>Quotation ${q.quotationNumber}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
            .row { display: flex; margin-bottom: 15px; }
            .col { flex: 1; }
            .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #888; letter-spacing: 1px; }
            .value { font-size: 14px; font-weight: bold; margin-top: 4px; }
            .section { margin-top: 30px; border: 1px solid #eee; border-radius: 8px; padding: 20px; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; margin-bottom: 15px; }
            .serial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
            .serial-box { border: 1px dashed #ccc; padding: 8px; font-family: monospace; text-align: center; font-size: 12px; font-weight: bold; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Pre-Sales Quotation</h1>
            <p style="margin: 5px 0 0; color: #666;">Quotation #: ${q.quotationNumber} | Date: ${q.date.toDate().toLocaleDateString()}</p>
          </div>
          
          <div class="row">
            <div class="col">
              <div class="label">Customer Details</div>
              <div class="value">${customer?.name || 'Unknown'}</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">${customer?.phone || ''}</div>
              <div style="font-size: 12px; color: #666;">${customer?.address || ''}</div>
            </div>
            <div class="col" style="text-align: right;">
              <div class="label">Status</div>
              <div class="value" style="text-transform: uppercase;">${q.status.replace(/_/g, ' ')}</div>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">Vehicle Information</h3>
            <div class="row">
              <div class="col">
                <div class="label">Chassis Number</div>
                <div class="value" style="font-family: monospace;">${q.chassisNumber}</div>
              </div>
              <div class="col">
                <div class="label">Make / Model</div>
                <div class="value">${co?.name || '-'} / ${mo?.name || '-'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">Battery Information</h3>
            <div class="row">
              <div class="col">
                <div class="label">Category & Count</div>
                <div class="value" style="text-transform: uppercase;">${q.batteryDetails?.category || 'None'} - ${q.batteryDetails?.numberOfBattery || 0} Units</div>
              </div>
              <div class="col">
                <div class="label">Battery Model</div>
                <div class="value" style="text-transform: uppercase;">${q.batteryDetails?.model || '-'}</div>
              </div>
            </div>
            <div class="row" style="margin-top: 15px;">
              <div class="col">
                <div class="label">Product ID</div>
                <div class="value" style="text-transform: uppercase;">${q.batteryDetails?.productId || '-'}</div>
              </div>
              <div class="col">
                <div class="label">Bluetooth ID</div>
                <div class="value" style="text-transform: uppercase;">${q.batteryDetails?.bluetoothId || '-'}</div>
              </div>
            </div>
            
            ${(q.batteryDetails?.serialNumbers || []).length > 0 ? `
              <div style="margin-top: 20px;">
                <div class="label">Serial Numbers</div>
                <div class="serial-grid">
                  ${(q.batteryDetails?.serialNumbers || []).map(sn => `
                    <div class="serial-box">${sn || 'N/A'}</div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div style="text-align: center;">
              <div style="border-top: 1px solid #333; width: 150px; padding-top: 5px; font-weight: bold; font-size: 12px;">Authorized Signatory</div>
            </div>
            <div style="text-align: center;">
              <div style="border-top: 1px solid #333; width: 150px; padding-top: 5px; font-weight: bold; font-size: 12px;">Customer Signature</div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };
"""
if "const handlePrintQuotation" not in content:
    content = content.replace("  const handleCreateQuotation = async () => {", print_fn + "\n  const handleCreateQuotation = async () => {")

# 3. Modify Form Dialog size
content = content.replace('className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto"', 'className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto"')

# 4. Add "VIEW / PRINT" button
action_buttons_target = """                              <CheckCircle className="w-3 h-3 mr-1" /> CONVERT TO SALE
                            </Button>"""
action_buttons_replacement = """                              <CheckCircle className="w-3 h-3 mr-1" /> CONVERT TO SALE
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-[10px] rounded-lg px-3"
                              onClick={() => setViewQuotation(q)}
                            >
                              <FileSignature className="w-3 h-3 mr-1" /> VIEW
                            </Button>"""

# If already added, don't add again
if "VIEW / PRINT" not in content and "VIEW" not in content.replace("VIEW", "X"):
    content = content.replace(action_buttons_target, action_buttons_replacement)

# Oh wait, we should also add VIEW button for ALL status, not just active!
# Let's adjust where we place the VIEW button.
all_buttons_target = """                        {q.status === 'active' && userProfile?.role !== 'viewer' && ("""
all_buttons_replacement = """                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-blue-200 text-blue-700 hover:bg-blue-700 hover:text-white font-bold text-[10px] rounded-lg px-3"
                          onClick={() => setViewQuotation(q)}
                        >
                          <FileSignature className="w-3 h-3 mr-1" /> VIEW & PRINT
                        </Button>
                        {q.status === 'active' && userProfile?.role !== 'viewer' && ("""

if "<FileSignature className=\"w-3 h-3 mr-1\" /> VIEW & PRINT" not in content:
    content = content.replace(all_buttons_target, all_buttons_replacement)


# 5. Add View Dialog JSX at the end of the file, before the last `</div>`
view_dialog_jsx = """
      <Dialog open={!!viewQuotation} onOpenChange={(open) => !open && setViewQuotation(null)}>
        {viewQuotation && (() => {
          const c = parties.find(p => p.id === viewQuotation.customerId);
          const v = vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber);
          const co = companies.find(comp => comp.id === v?.companyId);
          const mo = models.find(m => m.id === v?.modelId);
          return (
            <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
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
                    <p className="text-sm font-medium text-slate-500">{c?.phone}</p>
                    <p className="text-sm font-medium text-slate-500">{c?.address}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Vehicle Details</h4>
                    <p className="font-bold font-mono text-lg">{viewQuotation.chassisNumber}</p>
                    <p className="text-sm font-medium text-slate-500 uppercase">{co?.name} - {mo?.name}</p>
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
                  onClick={() => handlePrintQuotation(viewQuotation)}
                >
                  Print Quotation
                </Button>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
"""

# Insert before the last `    </div>\n  );\n}`
if "Print Quotation" not in content:
    import re
    content = re.sub(r'(\s*</div>\s*);\s*}\s*$', view_dialog_jsx + r'\1', content)

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)

print("Patch applied")
