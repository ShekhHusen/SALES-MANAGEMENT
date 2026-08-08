import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

// Imports
content = content.replace(
  "import { Checkbox } from '@/components/ui/checkbox';",
  "import { Checkbox } from '@/components/ui/checkbox';\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { updateDoc, doc, addDoc } from '@/lib/trackedFirestore';\nimport { toast } from 'sonner';"
);

// State
content = content.replace(
  "const [selectedEmiForView, setSelectedEmiForView] = useState<EmiRecord | null>(null);",
  "const [selectedEmiForView, setSelectedEmiForView] = useState<EmiRecord | null>(null);\n  const [paymentEmiDetail, setPaymentEmiDetail] = useState<{emiNo: number, principalForMonth: number, interestForMonth: number, monthlyEmi: number} | null>(null);\n  const [receiptNumber, setReceiptNumber] = useState('');\n  const [paymentAmount, setPaymentAmount] = useState('');\n  const [isSavingPayment, setIsSavingPayment] = useState(false);"
);

// handleSavePayment function
const handleSaveStr = `  const handleSavePayment = async () => {
    if (!selectedEmiForView || !paymentEmiDetail) return;
    setIsSavingPayment(true);
    try {
      // Create payment record
      await addDoc(collection(db, 'emiPayments'), {
        emiId: selectedEmiForView.id,
        emiNo: paymentEmiDetail.emiNo,
        receiptNumber,
        amount: Number(paymentAmount),
        principal: paymentEmiDetail.principalForMonth,
        interest: paymentEmiDetail.interestForMonth,
        createdAt: new Date(),
      });
      
      // Update EMI record
      await updateDoc(doc(db, 'emis', selectedEmiForView.id), {
        paidEmis: (selectedEmiForView.paidEmis || 0) + 1
      });
      
      toast.success('EMI Payment saved successfully');
      setPaymentEmiDetail(null);
      setReceiptNumber('');
      setPaymentAmount('');
    } catch (error) {
      console.error('Error saving payment', error);
      toast.error('Failed to save payment');
    } finally {
      setIsSavingPayment(false);
    }
  };`;

content = content.replace(
  "const [searchQuery, setSearchQuery] = useState('');",
  `const [searchQuery, setSearchQuery] = useState('');\n${handleSaveStr}`
);

// Checkbox modification
content = content.replace(
  "<Checkbox checked={isPaid} disabled />",
  `<Checkbox 
                                      checked={isPaid} 
                                      disabled={isPaid} 
                                      onCheckedChange={() => {
                                        if (!isPaid) {
                                          setPaymentEmiDetail({
                                            emiNo,
                                            principalForMonth,
                                            interestForMonth,
                                            monthlyEmi
                                          });
                                          setPaymentAmount(Math.round(monthlyEmi).toString());
                                          setReceiptNumber('');
                                        }
                                      }}
                                    />`
);

// Dialog UI
const dialogUI = `
      {/* Payment Dialog */}
      <Dialog open={!!paymentEmiDetail} onOpenChange={(open) => !open && setPaymentEmiDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive EMI Payment - #{paymentEmiDetail?.emiNo}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receiptNo" className="text-right">
                Receipt No
              </Label>
              <Input
                id="receiptNo"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="col-span-3"
                placeholder="Enter Receipt Number"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            {paymentEmiDetail && (
              <div className="mt-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-slate-500 mb-1">Pending Principal</p>
                  <p className="font-mono font-medium text-blue-600 dark:text-blue-400">₹{Math.round(paymentEmiDetail.principalForMonth).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Pending Interest</p>
                  <p className="font-mono font-medium text-orange-500">₹{Math.round(paymentEmiDetail.interestForMonth).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentEmiDetail(null)}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={isSavingPayment || !paymentAmount}>
              {isSavingPayment ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

content = content.replace("    </div>\n  );\n}", dialogUI + "\n    </div>\n  );\n}");

fs.writeFileSync('src/pages/emi-management.tsx', content);
