import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogClose } from '@/components/ui/dialog';
import { Info, Hash, FileText, CreditCard, Battery, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sale } from '@/types';
import { useGlobalData } from '@/contexts/GlobalDataContext';

interface ProcessDocumentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewSale: Sale | null;
}

export function ProcessDocumentSheet({ open, onOpenChange, viewSale }: ProcessDocumentSheetProps) {
  const { parties, vehicles, companies, models } = useGlobalData();
  const customers = parties.filter(p => p.type === 'customer');

  const [viewGallery, setViewGallery] = useState<{items: {url: string, name: string}[], index: number} | null>(null);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-5xl overflow-y-auto bg-[#F8FAFC]">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-4">
              Process Document Details
            </SheetTitle>
          </SheetHeader>
          
          {viewSale && (
            <div className="space-y-8">
              {/* Selfie */}
              {(() => {
                const selfieUrl = viewSale.otherDetails?.images?.['selfie'];
                if (selfieUrl) {
                  return (
                    <div className="flex justify-center mb-4">
                      <div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => {
                          setViewGallery({ items: [{ url: selfieUrl, name: 'Selfie' }], index: 0 });
                        }}
                      >
                        <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

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
                  {(() => {
                    const docNames = ['Citizenship Front', 'Citizenship Back', 'Agreement Paper', 'Photo', 'Selfie', 'Quotation', 'Traffic Letter', 'Bikrinama EV', 'Bikrinama Petrol', 'Cheque', 'Additional Doc 1', 'Additional Doc 2', 'Additional Doc 3'];
                    const existingDocs = docNames.map(docName => {
                      const docKey = docName.toLowerCase().replace(/ /g, '_');
                      const url = viewSale.otherDetails?.images?.[docKey];
                      return { docName, docKey, url };
                    });
                    const availableGallery = existingDocs.filter(d => d.url).map(d => ({ url: d.url!, name: d.docName }));

                    return existingDocs.map(({ docName, url }) => {
                      return (
                        <div key={docName} 
                          className={`relative border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center space-y-2 bg-slate-50 dark:bg-[#0f172a] overflow-hidden h-32 ${url ? 'cursor-pointer hover:border-blue-400 group ring-offset-2 hover:ring-2 ring-blue-500/50 transition-all' : ''}`}
                          onClick={() => {
                            if (url) {
                              const idx = availableGallery.findIndex(g => g.name === docName);
                              setViewGallery({ items: availableGallery, index: idx });
                            }
                          }}
                        >
                          {url ? (
                            <>
                              <img src={url} alt={docName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 backdrop-blur-sm">
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
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Gallery View Dialog */}
      <Dialog open={!!viewGallery} onOpenChange={(open) => !open && setViewGallery(null)}>
        <DialogContent className="max-w-6xl w-full p-0 overflow-hidden bg-black/95 border-slate-800 h-[90vh] flex flex-col">
          <DialogHeader className="absolute top-0 inset-x-0 z-50 p-4 flex justify-between items-center pointer-events-none">
            <span className="text-white font-bold bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
              {viewGallery?.items[viewGallery.index]?.name} ({viewGallery ? viewGallery.index + 1 : 0} of {viewGallery?.items.length})
            </span>
            <DialogClose className="pointer-events-auto bg-black/50 text-white rounded-full p-2 hover:bg-black/70 backdrop-blur-md transition-colors" />
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center relative min-h-0 bg-transparent">
            {viewGallery && viewGallery.items.length > 0 && (
              <>
                <img src={viewGallery.items[viewGallery.index].url} alt={viewGallery.items[viewGallery.index].name} className="max-w-full max-h-[90vh] object-contain select-none" />
                
                {viewGallery.items.length > 1 && (
                  <>
                    <button 
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all shadow-lg active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewGallery(prev => prev ? { ...prev, index: prev.index === 0 ? prev.items.length - 1 : prev.index - 1 } : null);
                      }}
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all shadow-lg active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewGallery(prev => prev ? { ...prev, index: prev.index === prev.items.length - 1 ? 0 : prev.index + 1 } : null);
                      }}
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
