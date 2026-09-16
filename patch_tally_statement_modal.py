import sys
import re

with open("src/components/TallyStatementModal.tsx", "r") as f:
    content = f.read()

imports_patch = """import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';
import { History } from 'lucide-react';"""
content = content.replace("import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';", imports_patch)

state_patch = """  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<any>(null);
  
  // Followups
  const [followUpData, setFollowUpData] = useState<any>(null);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
"""
content = content.replace("""  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<any>(null);""", state_patch)

fetch_patch = """  const fetchFiscalYears = async () => {
    try {
      // Fetch followups for this account
      if (tallyAccountId) {
        const qFollowups = query(collection(tallyDb, 'followUps'), where('accountId', '==', tallyAccountId));
        const snapFu = await getDocs(qFollowups);
        if (!snapFu.empty) {
          setFollowUpData(snapFu.docs[0].data());
        } else {
            setFollowUpData(null);
        }
      }

      const snap = await getDocs(collection(tallyDb, 'fiscalYears'));"""
content = content.replace("""  const fetchFiscalYears = async () => {
    try {
      const snap = await getDocs(collection(tallyDb, 'fiscalYears'));""", fetch_patch)

button_patch = """            {/* Add View button if vmsParty is a customer and has sales */}
            <div className="ml-auto flex items-center pr-4 gap-2">
              {vmsParty?.type === 'customer' && (() => {
                const customerSales = sales.filter(s => s.customerId === vmsParty.id);
                if (customerSales.length > 0) {
                  return (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-xs rounded-xl shadow-sm px-4 flex items-center gap-2"
                        onClick={() => {
                          const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                          setViewSale(latestSale);
                          setViewSheetOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        VIEW DOCUMENT
                      </Button>
                  );
                }
                return null;
              })()}
              
              {followUpData && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 text-blue-600 hover:text-white border-blue-200 hover:bg-blue-600 font-bold text-xs rounded-xl shadow-sm px-4 flex items-center gap-2"
                  onClick={() => setFollowUpModalOpen(true)}
                >
                  <History className="h-4 w-4" />
                  FOLLOW-UPS
                </Button>
              )}
            </div>"""

old_button = """              {/* Add View button if vmsParty is a customer and has sales */}
              {vmsParty?.type === 'customer' && (() => {
                const customerSales = sales.filter(s => s.customerId === vmsParty.id);
                if (customerSales.length > 0) {
                  return (
                    <div className="ml-auto flex items-center pr-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-xs rounded-xl shadow-sm px-4 flex items-center gap-2"
                        onClick={() => {
                          const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                          setViewSale(latestSale);
                          setViewSheetOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        VIEW DOCUMENT
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}"""

content = content.replace(old_button, button_patch)

dialog_patch = """            <ProcessDocumentSheet 
              open={viewSheetOpen}
              onOpenChange={setViewSheetOpen}
              viewSale={viewSale}
            />
            
            <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                 <DialogTitle>Follow-up History - {partyName}</DialogTitle>
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Action / Note</TableHead>
                        <TableHead className="text-xs">Next Date</TableHead>
                        <TableHead className="text-xs">By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(followUpData?.history || []).map((h: any, idx: number) => (
                        <TableRow key={h.id || idx}>
                          <TableCell className="text-xs">
                            {h.date || '---'}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] whitespace-pre-wrap">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-700">{h.action || '---'}</span>
                              <span className="text-slate-600">{h.note || '---'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-blue-600">
                            {h.nextFollowUpDate || '---'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {h.userName || '---'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!followUpData?.history || followUpData.history.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                            No history available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                 </Table>
              </DialogContent>
            </Dialog>"""
            
content = content.replace("""            <ProcessDocumentSheet 
              open={viewSheetOpen}
              onOpenChange={setViewSheetOpen}
              viewSale={viewSale}
            />""", dialog_patch)


with open("src/components/TallyStatementModal.tsx", "w") as f:
    f.write(content)

print("Patched TallyStatementModal")
