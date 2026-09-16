import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Info, Hash, FileText, FolderOpen, ExternalLink, CreditCard, Battery } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sale } from '@/types';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { openPopup } from '@/lib/utils';
import { TallyStatementModal } from '@/components/TallyStatementModal';

interface ProcessDocumentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewSale: Sale | null;
  onEditDriveLink?: (sale: Sale) => void;
}

export function ProcessDocumentSheet({ open, onOpenChange, viewSale, onEditDriveLink }: ProcessDocumentSheetProps) {
  const { parties, vehicles, companies, models } = useGlobalData();
  const customers = parties.filter(p => p.type === 'customer');
  const [statementModalOpen, setStatementModalOpen] = useState(false);


    
  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-5xl overflow-y-auto bg-[#F8FAFC]">
          <SheetHeader className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between gap-4">
              <SheetTitle className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Process Document Details
              </SheetTitle>
              {viewSale && (
                <div className="flex items-center gap-2 mr-6">
                  {(() => {
                    const party = parties.find(p => p.id === viewSale.customerId);
                    if (party && party.tallyAccountId) {
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl font-bold gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                          onClick={() => setStatementModalOpen(true)}
                        >
                          <FileText className="w-4 h-4 text-indigo-600" />
                          STATEMENT
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  {viewSale.driveFolderUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-bold gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      onClick={() => openPopup(viewSale.driveFolderUrl, 'DriveFolder')}
                    >
                      <FolderOpen className="w-4 h-4 text-emerald-600" />
                      Google Drive Folder
                      <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                    </Button>
                  ) : onEditDriveLink ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-bold gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      onClick={() => onEditDriveLink(viewSale)}
                    >
                      <FolderOpen className="w-4 h-4" />
                      Add Google Drive Link
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </SheetHeader>
          
          {viewSale && (
            <div className="space-y-8">
              {/* Selfie */}
              {(() => {
                const selfieUrl = viewSale.otherDetails?.images?.['selfie'];
                if (selfieUrl) {
                  return (
                    <div className="flex justify-center mb-4"><div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden shrink-0"><img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" /></div></div>
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

              {/* Other Specific Details */}
              {viewSale.otherDetails && (
                <>
                  <div className="bg-white dark:bg-[#0f172a] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-slate-500" /> Financial & Form Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Vehicle Price</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.vehiclePrice || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Paid Amount</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{viewSale.otherDetails.paidAmount || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Dues Amount</p>
                        <p className="font-bold text-red-500">{viewSale.otherDetails.duesAmount || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Father's Name</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.fathersName || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Grandfather's Name</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.grandFathersName || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Citizenship Number</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.citizenshipNumber || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Engine Number</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.engineNumber || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Vehicle Number</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.vehicleNumber || '---'}</p>
                      </div>
                    </div>
                  </div>

                  {viewSale.otherDetails.onEmi && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-6 shadow-sm border border-blue-100 dark:border-blue-800/30">
                      <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 border-b border-blue-100 dark:border-blue-800/30 pb-2 mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-500" /> EMI Details
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">EMI Vehicle Price</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.emiVehiclePrice || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Down Payment</p>
                          <p className="font-bold text-emerald-600">{viewSale.otherDetails.emiDownPayment || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">EMI Period</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.emiPeriod ? `${viewSale.otherDetails.emiPeriod} months` : '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 font-medium">Interest</p>
                          <p className="font-bold text-red-500">{viewSale.otherDetails.emiInterest ? `${viewSale.otherDetails.emiInterest}%` : '---'}</p>
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-4">
                          <p className="text-sm text-slate-500 font-medium">EMI Start Date</p>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.emiStartDate || '---'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#0f172a] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                      <Battery className="w-5 h-5 text-slate-500" /> Battery Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Type</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.batteryType || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Brand</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.batteryBrand || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">No. of Battery</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.noOfBattery || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Product ID</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.productId || '---'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Bluetooth ID</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{viewSale.otherDetails.bluetoothId || '---'}</p>
                      </div>
                      <div className="space-y-1 col-span-2 md:col-span-3">
                        <p className="text-sm text-slate-500 font-medium">Serial Numbers</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {viewSale.otherDetails.serialNumbers && viewSale.otherDetails.serialNumbers.length > 0 
                            ? viewSale.otherDetails.serialNumbers.join(', ') 
                            : '---'}
                        </p>
                      </div>
                      <div className="space-y-1 col-span-2 md:col-span-3">
                        <p className="text-sm text-slate-500 font-medium">Notes</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">{viewSale.otherDetails.notes || 'No notes provided.'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

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

            </div>
          )}
        </SheetContent>
      </Sheet>
    
    {(() => {
      const party = viewSale ? parties.find(p => p.id === viewSale.customerId) : null;
      return (
        <TallyStatementModal 
          open={statementModalOpen}
          onOpenChange={setStatementModalOpen}
          tallyAccountId={party?.tallyAccountId || null}
          partyName={party?.name || ''}
        />
      );
    })()}
  </>
  );
}
