with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

# Replace row beginning
row_old = """<TableRow key={party.id} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">
                    <TableCell className="px-6 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{party.name}</TableCell>"""

row_new = """<TableRow key={party.id} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">
                    <TableCell className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {party.tallyAccountId && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-indigo-600 hover:text-white border-indigo-200 hover:bg-indigo-600 font-bold text-[10px] rounded-lg shadow-sm px-2"
                            onClick={() => {
                              setSelectedPartyForTally(party);
                              setStatementModalOpen(true);
                            }}
                          >
                            STATEMENT
                          </Button>
                        )}
                        {party.type === 'customer' && (() => {
                          const customerSales = sales.filter(s => s.customerId === party.id);
                          if (customerSales.length > 0) {
                            return (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-[10px] rounded-lg shadow-sm px-2 flex items-center"
                                onClick={() => {
                                  const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                                  setViewSale(latestSale);
                                  setViewSheetOpen(true);
                                }}
                              >
                                VIEW
                              </Button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-2.5 font-extrabold text-slate-900 dark:text-slate-100">{party.name}</TableCell>"""

content = content.replace(row_old, row_new)


actions_old = """                      <div className="flex justify-end gap-2">
                        {party.tallyAccountId ? (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-indigo-600 hover:text-white border-indigo-200 hover:bg-indigo-600 font-bold text-[10px] rounded-lg shadow-sm px-2"
                              onClick={() => {
                                setSelectedPartyForTally(party);
                                setStatementModalOpen(true);
                              }}
                            >
                              STATEMENT
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-slate-400 hover:text-rose-500 font-bold text-[10px] rounded-lg px-2"
                              onClick={() => handleUnlinkTallyAccount(party.id)}
                            >
                              UNLINK
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-slate-500 hover:text-slate-700 border-slate-200 font-bold text-[10px] rounded-lg px-2"
                            onClick={() => {
                              setSelectedPartyForTally(party);
                              setLinkModalOpen(true);
                            }}
                          >
                            LINK TALLY
                          </Button>
                        )}
                        {party.type === 'customer' && (() => {
                          const customerSales = sales.filter(s => s.customerId === party.id);
                          if (customerSales.length > 0) {
                            return (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-[10px] rounded-lg shadow-sm px-2 flex items-center"
                                onClick={() => {
                                  const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                                  setViewSale(latestSale);
                                  setViewSheetOpen(true);
                                }}
                              >
                                VIEW
                              </Button>
                            );
                          }
                          return null;
                        })()}"""

actions_new = """                      <div className="flex justify-end gap-2">
                        {party.tallyAccountId ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-slate-400 hover:text-rose-500 font-bold text-[10px] rounded-lg px-2"
                            onClick={() => handleUnlinkTallyAccount(party.id)}
                          >
                            UNLINK
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-slate-500 hover:text-slate-700 border-slate-200 font-bold text-[10px] rounded-lg px-2"
                            onClick={() => {
                              setSelectedPartyForTally(party);
                              setLinkModalOpen(true);
                            }}
                          >
                            LINK TALLY
                          </Button>
                        )}"""

content = content.replace(actions_old, actions_new)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)

