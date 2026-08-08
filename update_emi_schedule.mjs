import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

// Imports
content = content.replace(
  "import { collection, onSnapshot, query, orderBy, Timestamp } from '@/lib/trackedFirestore';",
  "import { collection, onSnapshot, query, orderBy, Timestamp, where } from '@/lib/trackedFirestore';"
);
content = content.replace(
  "import { Search, Calculator, CheckSquare, Calendar, CarFront, User, FileText, IndianRupee } from 'lucide-react';",
  "import { Search, Calculator, CheckSquare, Calendar, CarFront, User, FileText, IndianRupee, Download } from 'lucide-react';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';"
);

// State & Effect
const stateInjection = `  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [emiPaymentsList, setEmiPaymentsList] = useState<any[]>([]);

  useEffect(() => {
    if (selectedEmiForView) {
      const q = query(collection(db, 'emiPayments'), where('emiId', '==', selectedEmiForView.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setEmiPaymentsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    } else {
      setEmiPaymentsList([]);
    }
  }, [selectedEmiForView]);

  const handleDownloadPDF = () => {
    if (!selectedEmiForView) return;
    const doc = new jsPDF();
    doc.text("EMI Schedule & Details", 14, 15);
    
    // Customer Details
    doc.setFontSize(10);
    doc.text(\`Customer Name: \${selectedEmiForView.customerName}\`, 14, 25);
    doc.text(\`Contact: \${selectedEmiForView.customerContact}\`, 14, 30);
    doc.text(\`File No: \${selectedEmiForView.fileNumber || '---'}\`, 14, 35);
    
    // Inventory Details
    doc.text(\`Chassis Number: \${selectedEmiForView.chassisNumber}\`, 100, 25);
    doc.text(\`Vehicle Price: ₹\${(selectedEmiForView.emiVehiclePrice || 0).toLocaleString()}\`, 100, 30);
    doc.text(\`Down Payment: ₹\${(selectedEmiForView.emiDownPayment || 0).toLocaleString()}\`, 100, 35);
    doc.text(\`Loan Amount: ₹\${(selectedEmiForView.loanAmount || 0).toLocaleString()}\`, 100, 40);

    // Calculate Schedule
    const principal = selectedEmiForView.loanAmount || 0;
    const rate = selectedEmiForView.interestRate || 0;
    const months = selectedEmiForView.periodMonths || 0;
    const monthlyRate = rate / 12 / 100;
    const monthlyEmi = months > 0 
      ? (rate === 0 ? principal / months : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
      : 0;
    
    const basePrincipal = months > 0 && rate > 0 
      ? (principal * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
      : (months > 0 ? principal / months : 0);
    
    const startDate = selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date();

    let balance = principal;
    const tableData = [];

    for (let i = 0; i < months; i++) {
      const emiNo = i + 1;
      const emiDate = new Date(startDate);
      emiDate.setMonth(emiDate.getMonth() + emiNo);
      
      let principalForMonth = 0;
      let interestForMonth = 0;
      
      if (rate === 0) {
        principalForMonth = basePrincipal;
        interestForMonth = 0;
      } else {
        principalForMonth = basePrincipal * Math.pow(1 + monthlyRate, i);
        interestForMonth = monthlyEmi - principalForMonth;
      }
      
      balance -= principalForMonth;
      if (balance < 0) balance = 0;
      
      const paymentRecord = emiPaymentsList.find(p => p.emiNo === emiNo);
      const paymentInfo = paymentRecord ? \`\${paymentRecord.receiptNumber} / ₹\${paymentRecord.amount.toLocaleString()}\` : '-';

      tableData.push([
        \`#\${emiNo}\`,
        emiDate.toLocaleDateString('en-GB'),
        \`₹\${Math.round(principalForMonth).toLocaleString()}\`,
        \`₹\${Math.round(interestForMonth).toLocaleString()}\`,
        \`₹\${Math.round(balance).toLocaleString()}\`,
        paymentInfo
      ]);
    }

    autoTable(doc, {
      startY: 45,
      head: [['EMI No.', 'Date', 'Principle', 'Interest', 'Balance', 'Payment Info']],
      body: tableData,
    });
    
    doc.save(\`EMI_Schedule_\${selectedEmiForView.fileNumber || selectedEmiForView.customerName}.pdf\`);
  };`;

content = content.replace("  const [isSavingPayment, setIsSavingPayment] = useState(false);", stateInjection);

// Download button in Header
const headerSearch = `<SheetTitle className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">EMI Details</span>
                    {selectedEmiForView.fileNumber && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        #{selectedEmiForView.fileNumber}
                      </Badge>
                    )}
                  </div>`;
const headerReplace = `<div className="flex justify-between items-start w-full">
                <SheetTitle className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">EMI Details</span>
                    {selectedEmiForView.fileNumber && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        #{selectedEmiForView.fileNumber}
                      </Badge>
                    )}
                  </div>`;
content = content.replace(headerSearch, headerReplace);

// End of header div structure modification
content = content.replace(
  "                </SheetTitle>\n              </SheetHeader>",
  `                </SheetTitle>\n                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2 shrink-0">\n                  <Download className="w-4 h-4" />\n                  Export PDF\n                </Button>\n              </div>\n              </SheetHeader>`
);

// Schedule Table Headers
const thSearch = `<TableHead className="text-right font-semibold p-2">Principle</TableHead>
                            <TableHead className="text-right font-semibold p-2">Interest</TableHead>`;
const thReplace = `<TableHead className="text-right font-semibold p-2">Principle</TableHead>
                            <TableHead className="text-right font-semibold p-2">Interest</TableHead>
                            <TableHead className="text-right font-semibold p-2">Remaining</TableHead>
                            <TableHead className="text-right font-semibold p-2">Payment Info</TableHead>`;
content = content.replace(thSearch, thReplace);

// Table Body Mapping
const trSearch = `const startDate = selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date();

                            return Array.from({ length: months }).map((_, i) => {
                              const emiNo = i + 1;`;
const trReplace = `const startDate = selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date();

                            let remainingBalance = principal;

                            return Array.from({ length: months }).map((_, i) => {
                              const emiNo = i + 1;`;
content = content.replace(trSearch, trReplace);

const tdSearch = `                                  <TableCell className="text-right font-mono p-2 text-orange-500">
                                    ₹{Math.round(interestForMonth).toLocaleString()}
                                  </TableCell>
                                </TableRow>`;
const tdReplace = `                                  <TableCell className="text-right font-mono p-2 text-orange-500">
                                    ₹{Math.round(interestForMonth).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-slate-700 dark:text-slate-300">
                                    ₹{Math.round(remainingBalance).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-emerald-600 dark:text-emerald-400 text-xs">
                                    {paymentRecord ? \`\${paymentRecord.receiptNumber} / ₹\${paymentRecord.amount.toLocaleString()}\` : '-'}
                                  </TableCell>
                                </TableRow>`;
content = content.replace(tdSearch, tdReplace);

// Calculate remaining balance and find payment record
const logicSearch = `const isPaid = (selectedEmiForView.paidEmis || 0) >= emiNo;`;
const logicReplace = `remainingBalance -= principalForMonth;
                              if (remainingBalance < 0) remainingBalance = 0;
                              
                              const paymentRecord = emiPaymentsList.find(p => p.emiNo === emiNo);
                              const isPaid = (selectedEmiForView.paidEmis || 0) >= emiNo;`;
content = content.replace(logicSearch, logicReplace);

fs.writeFileSync('src/pages/emi-management.tsx', content);
