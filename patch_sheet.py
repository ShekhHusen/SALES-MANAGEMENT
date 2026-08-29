import re

with open('src/components/ProcessDocumentSheet.tsx', 'r') as f:
    content = f.read()

# I will add the Financial Details and Battery Details sections right after Inventory Details.

new_sections = """              {/* Other Specific Details */}
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
"""

content = content.replace("              {/* Bluebook & Namsari */}", new_sections + "\n              {/* Bluebook & Namsari */}")
content = content.replace("import { Info, Hash, FileText, FolderOpen, ExternalLink } from 'lucide-react';", "import { Info, Hash, FileText, FolderOpen, ExternalLink, CreditCard, Battery } from 'lucide-react';")

with open('src/components/ProcessDocumentSheet.tsx', 'w') as f:
    f.write(content)
