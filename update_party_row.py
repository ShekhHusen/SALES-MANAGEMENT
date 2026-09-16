import re

with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

# 1. Add the new Menu column at the beginning of TableRow
row_pattern = r'(<TableRow key=\{party\.id\} className="hover:bg-slate-200 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">)\s*<TableCell className="px-6 py-2\.5 font-extrabold text-slate-900 dark:text-slate-100">\{party\.name\}</TableCell>'

new_menu_cell = """\\1
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

content = re.sub(row_pattern, new_menu_cell, content)


# 2. Remove the Statement and View buttons from the right actions column
actions_pattern = r'(<div className="flex justify-end gap-2">)\s*\{party\.tallyAccountId \? \(\s*<div className="flex items-center gap-1">\s*<Button \s*variant="outline" \s*size="sm" \s*className="h-8 text-indigo-600 hover:text-white border-indigo-200 hover:bg-indigo-600 font-bold text-\[10px\] rounded-lg shadow-sm px-2"\s*onClick=\{\(\) => \{\s*setSelectedPartyForTally\(party\);\s*setStatementModalOpen\(true\);\s*\}\}\s*>\s*STATEMENT\s*</Button>\s*(<Button \s*variant="ghost" \s*size="sm" \s*className="h-8 text-slate-400 hover:text-rose-500 font-bold text-\[10px\] rounded-lg px-2"\s*onClick=\{\(\) => handleUnlinkTallyAccount\(party\.id\)\}\s*>\s*UNLINK\s*</Button>\s*</div>\s*\) : \(\s*<Button \s*variant="outline" \s*size="sm" \s*className="h-8 text-slate-500 hover:text-slate-700 border-slate-200 font-bold text-\[10px\] rounded-lg px-2"\s*onClick=\{\(\) => \{\s*setSelectedPartyForTally\(party\);\s*setLinkModalOpen\(true\);\s*\}\}\s*>\s*LINK TALLY\s*</Button>\s*\)\}\s*\{party\.type === \'customer\' && \(\(\) => \{\s*const customerSales = sales\.filter\(s => s\.customerId === party\.id\);\s*if \(customerSales\.length > 0\) \{\s*return \(\s*<Button \s*variant="outline" \s*size="sm" \s*className="h-8 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-\[10px\] rounded-lg shadow-sm px-2 flex items-center"\s*onClick=\{\(\) => \{\s*const latestSale = customerSales\.sort\(\(a, b\) => b\.createdAt\.toMillis\(\) - a\.createdAt\.toMillis\(\)\)\[0\];\s*setViewSale\(latestSale\);\s*setViewSheetOpen\(true\);\s*\}\}\s*>\s*VIEW\s*</Button>\s*\);\s*\}\s*return null;\s*\}\)\(\)\}'

new_actions = r"""\1
                        {party.tallyAccountId ? (
                          \2
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

content = re.sub(actions_pattern, new_actions, content)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)
