import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# 1. Add imports
if 'TallyLinkModal' not in content:
    content = content.replace(
        "import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';",
        "import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';\nimport { TallyLinkModal } from '@/components/TallyLinkModal';\nimport { TallyStatementModal } from '@/components/TallyStatementModal';"
    )

# 2. Add states and handlers
state_block = """  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

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
    "  const [viewSheetOpen, setViewSheetOpen] = useState(false);\n  const [viewSale, setViewSale] = useState<Sale | null>(null);",
    state_block
)

# 3. Add modals at the end of the return statement
modals_code = """      <ProcessDocumentSheet 
        open={viewSheetOpen} 
        onOpenChange={setViewSheetOpen} 
        viewSale={viewSale} 
        onEditDriveLink={handleOpenDriveModal}
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
        onEditDriveLink={handleOpenDriveModal}
      />""",
    modals_code
)

# 4. Add buttons in Action column
buttons_code = """                              <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="font-bold rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all border shadow-sm" 
                                 onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSale(sale);
                                }}
                              >
                                View
                              </Button>
                              
                              {customer && customer.tallyAccountId ? (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="font-bold rounded-xl border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all border shadow-sm px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPartyForTally(customer);
                                      setStatementModalOpen(true);
                                    }}
                                  >
                                    Statement
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-slate-400 hover:text-rose-500 font-bold text-[10px] rounded-lg px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnlinkTallyAccount(customer.id);
                                    }}
                                  >
                                    Unlink
                                  </Button>
                                </>
                              ) : (
                                customer && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="font-bold rounded-xl border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all border shadow-sm px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPartyForTally(customer);
                                      setLinkModalOpen(true);
                                    }}
                                  >
                                    Link Tally
                                  </Button>
                                )
                              )}"""

target_buttons = """                              <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="font-bold rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all border shadow-sm" 
                                 onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSale(sale);
                                }}
                              >
                                View
                              </Button>"""

content = content.replace(target_buttons, buttons_code)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)
