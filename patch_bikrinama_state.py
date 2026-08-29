import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# State
old_state = "  const [showCrossCheckModal, setShowCrossCheckModal] = useState(false);"
new_state = """  const [showCrossCheckModal, setShowCrossCheckModal] = useState(false);
  const [showBikrinamaModal, setShowBikrinamaModal] = useState(false);
  const [bikrinamaForm, setBikrinamaForm] = useState({
    customerDistrict: '',
    customerMunicipality: '',
    customerWard: '',
    grandFathersName: '',
    fathersName: '',
    customerAge: '',
    nepaliYear: '',
    nepaliMonth: '',
    nepaliDay: '',
    nepaliDayOfWeek: ''
  });"""

content = content.replace(old_state, new_state)

# To find where to inject the dialog, let's inject it near showCrossCheckModal dialog
old_dialog = """      {/* Cross Check Dialog */}"""
new_dialog = """      {/* Bikrinama Dialog */}
      <Dialog open={showBikrinamaModal} onOpenChange={setShowBikrinamaModal}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 border-b pb-2">Bikrinama Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">District</label>
              <Input 
                value={bikrinamaForm.customerDistrict} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, customerDistrict: e.target.value})} 
                placeholder="Rautahat" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Municipality / VDC</label>
              <Input 
                value={bikrinamaForm.customerMunicipality} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, customerMunicipality: e.target.value})} 
                placeholder="Garuda" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ward No</label>
              <Input 
                value={bikrinamaForm.customerWard} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, customerWard: e.target.value})} 
                placeholder="4" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Age</label>
              <Input 
                value={bikrinamaForm.customerAge} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, customerAge: e.target.value})} 
                placeholder="30" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Father's Name</label>
              <Input 
                value={bikrinamaForm.grandFathersName} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, grandFathersName: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Father's Name</label>
              <Input 
                value={bikrinamaForm.fathersName} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, fathersName: e.target.value})} 
              />
            </div>
            
            <div className="col-span-2 pt-2 border-t mt-2">
                <h4 className="text-sm font-bold mb-2">Nepali Date</h4>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year (e.g. 2081)</label>
              <Input 
                value={bikrinamaForm.nepaliYear} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, nepaliYear: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month (e.g. Baishakh)</label>
              <Input 
                value={bikrinamaForm.nepaliMonth} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, nepaliMonth: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Day (e.g. 15)</label>
              <Input 
                value={bikrinamaForm.nepaliDay} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, nepaliDay: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Day of Week (e.g. Sunday)</label>
              <Input 
                value={bikrinamaForm.nepaliDayOfWeek} 
                onChange={(e) => setBikrinamaForm({...bikrinamaForm, nepaliDayOfWeek: e.target.value})} 
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowBikrinamaModal(false)}>Cancel</Button>
            <Button onClick={() => {
                setShowBikrinamaModal(false);
                if (selectedSale) {
                    const tempSale = {
                        ...selectedSale,
                        otherDetails: {
                            ...(selectedSale.otherDetails || {}),
                            ...bikrinamaForm
                        }
                    };
                    handleDownloadPDF('bikrinama' as any, tempSale, 'print');
                }
            }}>Print Bikrinama</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Cross Check Dialog */}"""

content = content.replace(old_dialog, new_dialog)

# Now update the buttons 
old_buttons = """                 <div className="space-y-2 block">
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
                 </div>"""

new_buttons = """                 <div className="space-y-2 block">
                   <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-800 my-2"></div>
                   <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2">Bikrinama (Document)</p>
                   <Button 
                     onClick={() => {
                        // Pre-fill fathers/grandfathers name if they exist in otherDetails
                        if (selectedSale?.otherDetails) {
                            setBikrinamaForm(prev => ({
                                ...prev,
                                fathersName: selectedSale.otherDetails.fathersName || prev.fathersName,
                                grandFathersName: selectedSale.otherDetails.grandFathersName || prev.grandFathersName
                            }));
                        }
                        setShowBikrinamaModal(true);
                     }}
                     disabled={isGeneratingPdf}
                     variant="outline"
                     className="w-full justify-center rounded-xl border-orange-200/60 text-orange-700 bg-orange-50/50 hover:bg-orange-100 hover:border-orange-300 shadow-sm font-bold h-10 transition-all"
                     title="Print Bikrinama"
                   >
                     <Printer className="w-4 h-4 mr-2" />
                     Print Bikrinama
                   </Button>
                 </div>"""

content = content.replace(old_buttons, new_buttons)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)
