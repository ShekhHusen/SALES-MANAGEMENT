import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

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
                    <p className="text-sm font-medium text-slate-500">{c?.phone || '-'}</p>
                    <p className="text-sm font-medium text-slate-500">{c?.address || '-'}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Vehicle Details</h4>
                    <p className="font-bold font-mono text-lg">{viewQuotation.chassisNumber}</p>
                    <p className="text-sm font-medium text-slate-500 uppercase">{co?.name || '-'} - {mo?.name || '-'}</p>
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

target = """      </Dialog>
    </div>
  );
}"""

replacement = """      </Dialog>""" + view_dialog_jsx + """    </div>
  );
}"""

if "Print Quotation" not in content:
    content = content.replace(target, replacement)
    with open("src/pages/quotations.tsx", "w") as f:
        f.write(content)
    print("Fixed")
else:
    print("Already fixed")
