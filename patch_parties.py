import re

with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

# Add imports for our new components
imports_target = "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';"
new_imports = """import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TallyLinkModal } from '@/components/TallyLinkModal';
import { TallyStatementModal } from '@/components/TallyStatementModal';"""
content = content.replace(imports_target, new_imports)

# Add state variables
state_target = "  const [saleDetails, setSaleDetails] = useState<any | null>(null);"
if state_target not in content:
    state_target = "  const [viewSheetOpen, setViewSheetOpen] = useState(false);"
new_state = """  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [selectedPartyForTally, setSelectedPartyForTally] = useState<Party | null>(null);"""
content = content.replace("  const [viewSheetOpen, setViewSheetOpen] = useState(false);", new_state)

# Add linking logic
link_logic = """  const handleLinkTallyAccount = async (tallyAccountId: string) => {
    if (!selectedPartyForTally) return;
    try {
      await updateDoc(doc(db, 'parties', selectedPartyForTally.id), {
        tallyAccountId
      });
      toast.success('Tally Account linked successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to link account.');
    }
  };

  const handleUnlinkTallyAccount = async (partyId: string) => {
    try {
      await updateDoc(doc(db, 'parties', partyId), {
        tallyAccountId: null
      });
      toast.success('Tally Account unlinked.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to unlink account.');
    }
  };"""

effect_target = "  useEffect(() => {"
content = content.replace(effect_target, link_logic + "\n\n" + effect_target)

# Add the UI buttons in the row
row_buttons_old = """                        {party.type === 'customer' && (() => {
                          const customerSales = sales.filter(s => s.customerId === party.id);
                          if (customerSales.length > 0) {
                            return (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-[10px] rounded-lg shadow-sm px-2 flex items-center"
                                onClick={() => {
                                  // Show the most recent sale for this customer
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

row_buttons_new = """                        {party.tallyAccountId ? (
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

content = content.replace(row_buttons_old, row_buttons_new)

# Append Modals at the bottom
modals = """
      <TallyLinkModal 
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        onLink={handleLinkTallyAccount}
        partyName={selectedPartyForTally?.name || ''}
      />
      <TallyStatementModal 
        open={statementModalOpen}
        onOpenChange={setStatementModalOpen}
        tallyAccountId={selectedPartyForTally?.tallyAccountId || null}
        partyName={selectedPartyForTally?.name || ''}
      />
    </div>
  );
}
"""
content = content.replace("    </div>\n  );\n}", modals)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)
