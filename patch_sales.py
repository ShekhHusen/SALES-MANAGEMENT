import re

with open('src/pages/sales.tsx', 'r') as f:
    content = f.read()

# 1. Add imports
if 'TallyLinkModal' not in content:
    content = content.replace(
        "import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';",
        "import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';\nimport { TallyLinkModal } from '@/components/TallyLinkModal';\nimport { TallyStatementModal } from '@/components/TallyStatementModal';"
    )

# 2. Add states and handlers
state_block = """  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<any>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [selectedPartyForTally, setSelectedPartyForTally] = useState<Party | null>(null);

  const handleLinkTallyAccount = async (tallyAccountId: string) => {
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
  };
"""

content = content.replace(
    "  const [viewSheetOpen, setViewSheetOpen] = useState(false);\n  const [viewSale, setViewSale] = useState<any>(null);",
    state_block
)

# 3. Add modals at the end of the return statement
modals_code = """      <ProcessDocumentSheet 
        open={viewSheetOpen} 
        onOpenChange={setViewSheetOpen} 
        viewSale={viewSale} 
      />

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
      />"""

content = content.replace(
    """      <ProcessDocumentSheet 
        open={viewSheetOpen} 
        onOpenChange={setViewSheetOpen} 
        viewSale={viewSale} 
      />""",
    modals_code
)

# 4. Add buttons in Action column
buttons_code = """                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-[10px] rounded-lg shadow-sm px-2 flex items-center"
                          onClick={() => {
                            setViewSale(sale);
                            setViewSheetOpen(true);
                          }}
                        >
                          VIEW
                        </Button>
                        {customer && customer.tallyAccountId ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-indigo-600 hover:text-white border-indigo-200 hover:bg-indigo-600 font-bold text-[10px] rounded-lg shadow-sm px-2"
                              onClick={() => {
                                setSelectedPartyForTally(customer);
                                setStatementModalOpen(true);
                              }}
                            >
                              STATEMENT
                            </Button>
                            {canDelete && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-slate-400 hover:text-rose-500 font-bold text-[10px] rounded-lg px-2"
                                onClick={() => handleUnlinkTallyAccount(customer.id)}
                              >
                                UNLINK
                              </Button>
                            )}
                          </>
                        ) : (
                          customer && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-slate-500 hover:text-slate-700 border-slate-200 font-bold text-[10px] rounded-lg px-2"
                              onClick={() => {
                                setSelectedPartyForTally(customer);
                                setLinkModalOpen(true);
                              }}
                            >
                              LINK TALLY
                            </Button>
                          )
                        )}"""

target_buttons = """                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-[10px] rounded-lg shadow-sm px-2 flex items-center"
                          onClick={() => {
                            setViewSale(sale);
                            setViewSheetOpen(true);
                          }}
                        >
                          VIEW
                        </Button>"""

content = content.replace(target_buttons, buttons_code)

with open('src/pages/sales.tsx', 'w') as f:
    f.write(content)
