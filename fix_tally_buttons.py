with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

menu_old = """                        {party.tallyAccountId && (
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
                        )}"""

menu_new = """                        {party.tallyAccountId ? (
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

content = content.replace(menu_old, menu_new)

actions_old = """                      <div className="flex justify-end gap-2">
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

actions_new = """                      <div className="flex justify-end gap-2">
                        {party.tallyAccountId && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-slate-400 hover:text-rose-500 font-bold text-[10px] rounded-lg px-2"
                            onClick={() => handleUnlinkTallyAccount(party.id)}
                          >
                            UNLINK
                          </Button>
                        )}"""

content = content.replace(actions_old, actions_new)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)
