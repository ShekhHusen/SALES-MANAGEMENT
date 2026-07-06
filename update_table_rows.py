import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, Fragment } from 'react';")

table_body_regex = re.compile(r"              \{paginatedPurchases\.map\(\(purchase\) => \{.*?\n              \}\)}", re.DOTALL)

new_table_body = '''              {paginatedPurchases.map((purchase) => {
                const vendor = vendors.find(v => v.id === purchase.vendorId);
                const vehiclesForThisPurchase = allVehicles.filter(v => v.purchaseId === purchase.id || (purchase.chassisNumbers && (purchase.chassisNumbers || []).includes(v.chassisNumber)));
                const isExpanded = expandedRows[purchase.id];

                return (
                  <Fragment key={purchase.id}>
                  <TableRow className="hover:bg-slate-200 dark:hover:bg-slate-800 border-transparent divide-x divide-slate-100 cursor-pointer" onClick={() => toggleRow(purchase.id)}>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-slate-900 dark:text-slate-100 uppercase">{vendor?.name || 'Unknown Vendor'}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {purchase.date instanceof Timestamp 
                            ? purchase.date?.toDate?.()?.toLocaleDateString('en-GB') || 'N/A'
                            : String(purchase.date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5 font-black text-slate-900 dark:text-slate-100 text-center">
                      <Badge variant="outline" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] font-black">
                        {purchase.invoiceNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge className="font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{vehiclesForThisPurchase.length} Vehicles</Badge>
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                           {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                           {isExpanded ? 'Hide Details' : 'View Details'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                       {/* Left empty intentionally for summary row, or show combined status */}
                       <span className="text-[10px] font-bold text-slate-400">Expand for statuses</span>
                    </TableCell>
                    <TableCell className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                            onClick={() => openEditPurchase(purchase)}
                          >
                            EDIT
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setPurchaseToDelete(purchase)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50/50">
                      <TableCell colSpan={5} className="p-0 border-b border-slate-200 dark:border-slate-800">
                        <div className="px-8 py-4">
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Invoice Chassis Details</h4>
                           {vehiclesForThisPurchase.length === 0 ? (
                             <div className="text-sm font-bold text-slate-400 italic">No chassis linked to this invoice.</div>
                           ) : (
                             <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                               {vehiclesForThisPurchase.map(v => {
                                  const company = companies.find(c => c.id === v.companyId);
                                  const model = models.find(m => m.id === v.modelId);
                                  return (
                                    <div key={v.chassisNumber} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                                       <div className="flex justify-between items-start">
                                          <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{v.chassisNumber}</span>
                                          <Badge variant="outline" className="text-[9px] font-bold uppercase">{v.status}</Badge>
                                       </div>
                                       <div className="flex flex-col gap-1">
                                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                            {company?.name} • {model?.name} • {v.color}
                                          </span>
                                          <span className="text-[10px] font-black uppercase text-slate-500">
                                            Reg: {v.registrationNumber || 'UNREGISTERED'}
                                          </span>
                                          <span className="text-[10px] font-black uppercase text-slate-500">
                                            Docs: {v.bluebookStatus || 'NOT RECEIVED'} • {v.naamsariStatus || 'PENDING'}
                                          </span>
                                       </div>
                                    </div>
                                  )
                               })}
                             </div>
                           )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                );
              })}'''

c = table_body_regex.sub(new_table_body, c)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

