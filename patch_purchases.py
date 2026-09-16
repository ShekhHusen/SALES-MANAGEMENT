import re

with open('src/pages/purchases.tsx', 'r') as f:
    content = f.read()

target = r'''                             <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
                             </div>'''

replacement = r'''                             <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-black uppercase tracking-widest text-[10px]">
                                    <tr>
                                      <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">SN</th>
                                      <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">Chassis Number</th>
                                      <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">Company</th>
                                      <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">Model</th>
                                      <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">Color</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {vehiclesForThisPurchase.map((v, idx) => {
                                      const company = companies.find(c => c.id === v.companyId);
                                      const model = models.find(m => m.id === v.modelId);
                                      return (
                                        <tr key={v.chassisNumber} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                          <td className="px-4 py-2 font-bold text-slate-500">{idx + 1}</td>
                                          <td className="px-4 py-2 font-black text-slate-900 dark:text-slate-100">{v.chassisNumber}</td>
                                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{company?.name || '-'}</td>
                                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{model?.name || '-'}</td>
                                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{v.color || '-'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                             </div>'''

content = content.replace(target, replacement)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(content)
