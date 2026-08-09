import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, where } from '@/lib/trackedFirestore';
import { Search, Calculator, CheckSquare, Calendar, CarFront, User, FileText, IndianRupee, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { updateDoc, doc, addDoc } from '@/lib/trackedFirestore';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGlobalData } from '@/contexts/GlobalDataContext';

interface EmiRecord {
  id: string;
  saleId: string;
  chassisNumber: string;
  customerId: string;
  customerName: string;
  customerContact: string;
  customerAddress?: string;
  loanAmount: number;
  interestRate: number;
  periodMonths: number;
  emiVehiclePrice: number;
  emiDownPayment: number;
  createdAt: Timestamp;
  paidEmis?: number;
  fileNumber?: string;
  saleDate?: Timestamp;
}

export function EmiManagement() {
  const { parties, loadParties } = useGlobalData();
  const [emis, setEmis] = useState<EmiRecord[]>([]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  const [searchQuery, setSearchQuery] = useState('');
  const [emiMonthFilter, setEmiMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, emiMonthFilter, statusFilter, pageSize]);
  const handleSavePayment = async () => {
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
      
      setSelectedEmiForView(prev => prev ? { ...prev, paidEmis: (prev.paidEmis || 0) + 1 } : null);
      
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
  };
  const [loading, setLoading] = useState(true);
  const [selectedEmiForView, setSelectedEmiForView] = useState<EmiRecord | null>(null);
  const [paymentEmiDetail, setPaymentEmiDetail] = useState<{emiNo: number, principalForMonth: number, interestForMonth: number, monthlyEmi: number} | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
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

  const handlePrint = () => {
    if (!selectedEmiForView) return;

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
    
    const startDate = selectedEmiForView.saleDate ? new Date(selectedEmiForView.saleDate.seconds * 1000) : (selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date());

    let balance = principal;
    
    let tableRows = '';

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
      const paymentDateStr = paymentRecord?.createdAt ? (paymentRecord.createdAt.seconds ? new Date(paymentRecord.createdAt.seconds * 1000) : new Date(paymentRecord.createdAt)).toLocaleDateString('en-GB') : '';
      const paymentInfo = paymentRecord ? `${paymentRecord.receiptNumber} / रु${paymentRecord.amount.toLocaleString()} (${paymentDateStr})` : '';

      tableRows += `
        <tr>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${emiNo}</td>
          <td style="border: 1px solid black; padding: 8px;">${emiDate.toLocaleDateString('en-GB')}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">रु${Math.round(principalForMonth).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">रु${Math.round(interestForMonth).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">रु${Math.round(balance).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px;">${paymentInfo}</td>
        </tr>
      `;
    }

    const party = parties.find(p => p.id === selectedEmiForView.customerId || p.name === selectedEmiForView.customerName);
    const customerAddress = selectedEmiForView.customerAddress || party?.address || '---';

    const printContent = `
      <html>
        <head>
          <title>EMI Schedule - ${selectedEmiForView.fileNumber || selectedEmiForView.customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-decoration: underline; margin-bottom: 30px; }
            .details-container { display: flex; justify-content: space-between; margin-bottom: 30px; max-width: 800px; }
            .details-col { width: 48%; }
            .details-row { display: flex; margin-bottom: 8px; }
            .details-label { width: 150px; font-weight: normal; }
            table { width: 100%; max-width: 800px; border-collapse: collapse; margin-top: 20px; }
            th { border: 1px solid black; padding: 8px; text-align: left; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>EMI Schedule and Details</h2>
          <div class="details-container">
            <div class="details-col">
              <div class="details-row"><div class="details-label">Customer Name:</div><div>${selectedEmiForView.customerName || '---'}</div></div>
              <div class="details-row"><div class="details-label">Mobile Number:</div><div>${selectedEmiForView.customerContact || '---'}</div></div>
              <div class="details-row"><div class="details-label">Address:</div><div>${customerAddress}</div></div>
              <div class="details-row"><div class="details-label">Chassis Number:</div><div>${selectedEmiForView.chassisNumber || '---'}</div></div>
            </div>
            <div class="details-col">
              <div class="details-row"><div class="details-label">Vehicle Price:</div><div>रु${(selectedEmiForView.emiVehiclePrice || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Down Payment:</div><div>रु${(selectedEmiForView.emiDownPayment || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Interest Rate:</div><div>${selectedEmiForView.interestRate}%</div></div>
              <div class="details-row"><div class="details-label">Period:</div><div>${selectedEmiForView.periodMonths} Months</div></div>
              <div class="details-row"><div class="details-label">Loan Amount:</div><div>रु${(selectedEmiForView.loanAmount || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Monthly EMI:</div><div>रु${Math.round(monthlyEmi).toLocaleString()}</div></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>EMI No.</th>
                <th>Date</th>
                <th>Principle</th>
                <th>Interest</th>
                <th>Balance</th>
                <th>Payment Info</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'emis'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmiRecord[];
      setEmis(records);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const enhancedEmis = emis.map(emi => {
    const createdAtDate = emi.saleDate ? new Date(emi.saleDate.seconds * 1000) : (emi.createdAt ? new Date(emi.createdAt.seconds * 1000) : new Date());
    const now = new Date();
    
    let monthsPassed = (now.getFullYear() - createdAtDate.getFullYear()) * 12 + now.getMonth() - createdAtDate.getMonth();
    if (now.getDate() < createdAtDate.getDate()) {
      monthsPassed--;
    }
    if (monthsPassed < 0) monthsPassed = 0;

    const paidEmisCount = emi.paidEmis || 0;
    let overdueEmisCount = monthsPassed - paidEmisCount;
    if (overdueEmisCount < 0) overdueEmisCount = 0;
    
    let remainingEmisCount = emi.periodMonths - paidEmisCount - overdueEmisCount;
    if (remainingEmisCount < 0) remainingEmisCount = 0;

    const principal = emi.loanAmount || 0;
    const rate = emi.interestRate || 0;
    const monthlyRate = rate / 12 / 100;
    const months = emi.periodMonths || 0;
    const monthlyEmi = months > 0 
      ? (rate === 0 ? principal / months : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
      : 0;

    const pendingEmiSum = overdueEmisCount * monthlyEmi;

    const nextEmiDate = new Date(createdAtDate);
    nextEmiDate.setMonth(nextEmiDate.getMonth() + paidEmisCount + overdueEmisCount + 1);

    const isCompleted = paidEmisCount >= months;

    return {
      ...emi,
      overdueEmisCount,
      remainingEmisCount,
      pendingEmiSum,
      nextEmiDate,
      monthlyEmi,
      isCompleted
    };
  });

  const filteredEmis = enhancedEmis.filter(emi => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      (emi.customerName || '').toLowerCase().includes(searchLower) ||
      (emi.chassisNumber || '').toLowerCase().includes(searchLower) ||
      (emi.customerContact || '').toLowerCase().includes(searchLower)
    );

    let matchesMonth = true;
    if (emiMonthFilter && !emi.isCompleted) {
      const filterDate = new Date(emiMonthFilter + '-01');
      matchesMonth = emi.nextEmiDate.getFullYear() === filterDate.getFullYear() && emi.nextEmiDate.getMonth() === filterDate.getMonth();
    }

    let matchesStatus = true;
    if (statusFilter === 'overdue') {
      matchesStatus = emi.overdueEmisCount > 0;
    } else if (statusFilter === 'pending') {
      matchesStatus = emi.remainingEmisCount > 0 || emi.overdueEmisCount > 0;
    } else if (statusFilter === 'completed') {
      matchesStatus = emi.isCompleted;
    }

    return matchesSearch && matchesMonth && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmis.length / pageSize) || 1;
  const paginatedEmis = filteredEmis.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] lg:h-screen w-full max-w-[1600px] mx-auto animate-in fade-in zoom-in-95 duration-300 px-2 md:px-2 lg:px-2 py-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 mb-1">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:mt-[24px]">EMI Management</h1>
        </div>
      </div>

      <Card className="flex-1 flex flex-col border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden rounded-3xl sm:py-0">
        <div className="p-3 sm:p-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between">
          <div className="relative w-full sm:max-w-xs md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search customer, chassis..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner w-full text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 items-center w-full lg:w-auto">
            <div className="w-full sm:w-[160px]">
              <Input 
                type="month"
                value={emiMonthFilter}
                onChange={(e) => setEmiMonthFilter(e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner w-full text-xs sm:text-sm px-1.5 sm:px-3 h-10"
                title="Filter by Coming EMI Month"
              />
            </div>
            <div className="w-full sm:w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner h-10 w-full text-xs sm:text-sm px-1.5 sm:px-3">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1 sm:px-4 h-10 rounded-xl w-full border border-emerald-100 dark:border-emerald-900/30">
              <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Total: {filteredEmis.length}</span>
            </div>
          </div>
        </div>

        <CardContent className="flex-1 p-0 overflow-auto mx-4 md:mx-6 mb-0">
          <Table className="w-full whitespace-nowrap">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
              <TableRow className="border-none">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-px text-center">Action</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-px text-center">File No.</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Customer Details</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Loan Amount</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">EMI</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Coming EMI Date</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Pending EMI</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Loading EMI records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEmis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <Calculator className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-lg">No EMI records found</p>
                      <p className="text-slate-400 text-sm">EMIs created during process document will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmis.map((emi) => {
                  const { overdueEmisCount, remainingEmisCount, pendingEmiSum, nextEmiDate, monthlyEmi, isCompleted } = emi;
                  const paidEmisCount = emi.paidEmis || 0;

                  return (
                    <TableRow key={emi.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800 transition-colors">
                      <TableCell className="text-center w-px">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedEmiForView(emi)}>View</Button>
                      </TableCell>
                      <TableCell className="font-bold text-blue-600 dark:text-blue-400 w-px text-center">
                        {emi.fileNumber ? `#${emi.fileNumber}` : '---'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{emi.customerName || '---'}</span>
                          <span className="text-sm text-slate-500">{emi.customerContact || '---'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {emi.loanAmount ? `रु${emi.loanAmount.toLocaleString()}` : '---'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400">
                        रु{Math.round(monthlyEmi).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-700 dark:text-slate-300">
                        {nextEmiDate.toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-500">
                        रु{pendingEmiSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs" title="Paid EMIs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {paidEmisCount}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-xs" title="Pending/Overdue EMIs">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            {overdueEmisCount}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 font-bold text-xs" title="Remaining EMIs">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            {remainingEmisCount}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Rows:</span>
            <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
              <SelectTrigger className="w-16 h-8 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border-none shadow-inner px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-slate-600 dark:text-slate-400 font-semibold ml-1">
              {filteredEmis.length > 0 
                ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredEmis.length)} / ${filteredEmis.length}`
                : '0 / 0'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-slate-800 text-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <span className="px-2 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-slate-800 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5 sm:ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!selectedEmiForView} onOpenChange={(open) => !open && setSelectedEmiForView(null)}>
        <DialogContent className="w-full sm:max-w-3xl lg:max-w-4xl p-0 flex flex-col bg-slate-50 dark:bg-slate-900 max-h-[90vh]">
          {selectedEmiForView && (
            <>
              <DialogHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <div className="flex justify-between items-start w-full pr-8">
                <DialogTitle className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">EMI Details</span>
                    {selectedEmiForView.fileNumber && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        #{selectedEmiForView.fileNumber}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-normal text-slate-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Sale Date: {selectedEmiForView.saleDate ? new Date(selectedEmiForView.saleDate.seconds * 1000).toLocaleDateString('en-GB') : (selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000).toLocaleDateString('en-GB') : '---')}
                  </span>
                </DialogTitle>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 shrink-0">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>
              </DialogHeader>
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Customer Details Section */}
                  <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-500" />
                      Customer Details
                    </h3>
                    <Separator className="bg-slate-100 dark:bg-slate-800" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 mb-1">Name</p>
                        <p className="font-medium">{selectedEmiForView.customerName || '---'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Contact</p>
                        <p className="font-medium">{selectedEmiForView.customerContact || '---'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-slate-500 mb-1">Address</p>
                        <p className="font-medium">{selectedEmiForView.customerAddress || parties.find(p => p.id === selectedEmiForView.customerId || p.name === selectedEmiForView.customerName)?.address || '---'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Details Section */}
                  <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CarFront className="w-5 h-5 text-blue-500" />
                      Inventory Details
                    </h3>
                    <Separator className="bg-slate-100 dark:bg-slate-800" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 mb-1">Chassis Number</p>
                        <p className="font-medium">{selectedEmiForView.chassisNumber || '---'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Vehicle Price</p>
                        <p className="font-medium font-mono text-emerald-600">रु{(selectedEmiForView.emiVehiclePrice || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Down Payment</p>
                        <p className="font-medium font-mono text-blue-600">रु{(selectedEmiForView.emiDownPayment || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Loan Amount</p>
                        <p className="font-medium font-mono text-purple-600">रु{(selectedEmiForView.loanAmount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Monthly EMI</p>
                        <p className="font-medium font-mono text-indigo-600">
                          रु{Math.round(
                            selectedEmiForView.periodMonths > 0
                              ? (selectedEmiForView.interestRate === 0
                                  ? (selectedEmiForView.loanAmount || 0) / selectedEmiForView.periodMonths
                                  : ((selectedEmiForView.loanAmount || 0) * (selectedEmiForView.interestRate / 12 / 100) * Math.pow(1 + (selectedEmiForView.interestRate / 12 / 100), selectedEmiForView.periodMonths)) / (Math.pow(1 + (selectedEmiForView.interestRate / 12 / 100), selectedEmiForView.periodMonths) - 1))
                              : 0
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* EMI List Section */}
                  <div className="bg-white dark:bg-slate-950 rounded-xl p-0 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-500" />
                        EMI Schedule ({selectedEmiForView.periodMonths} Months)
                      </h3>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {selectedEmiForView.interestRate}% Interest
                      </Badge>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <Table className="w-full text-sm">
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10">
                          <TableRow className="border-slate-200 dark:border-slate-800">
                            <TableHead className="w-12 text-center p-2"><CheckSquare className="w-4 h-4 mx-auto text-slate-400" /></TableHead>
                            <TableHead className="font-semibold p-2">EMI No.</TableHead>
                            <TableHead className="font-semibold p-2">Date</TableHead>
                            <TableHead className="text-right font-semibold p-2">Principle</TableHead>
                            <TableHead className="text-right font-semibold p-2">Interest</TableHead>
                            <TableHead className="text-right font-semibold p-2">Remaining</TableHead>
                            <TableHead className="text-right font-semibold p-2">Payment Info</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
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
                            
                            const startDate = selectedEmiForView.saleDate ? new Date(selectedEmiForView.saleDate.seconds * 1000) : (selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date());

                            let remainingBalance = principal;

                            return Array.from({ length: months }).map((_, i) => {
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
                              
                              remainingBalance -= principalForMonth;
                              if (remainingBalance < 0) remainingBalance = 0;
                              
                              const paymentRecord = emiPaymentsList.find(p => p.emiNo === emiNo);
                              const isPaid = (selectedEmiForView.paidEmis || 0) >= emiNo;

                              return (
                                <TableRow key={emiNo} className={`border-slate-100 dark:border-slate-800 ${isPaid ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
                                  <TableCell className="text-center p-2">
                                    <Checkbox 
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
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium p-2 text-slate-700 dark:text-slate-300">
                                    #{emiNo}
                                  </TableCell>
                                  <TableCell className="p-2 text-slate-600 dark:text-slate-400">
                                    {emiDate.toLocaleDateString('en-GB')}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-blue-600 dark:text-blue-400">
                                    रु{Math.round(principalForMonth).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-orange-500">
                                    रु{Math.round(interestForMonth).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-slate-700 dark:text-slate-300">
                                    रु{Math.round(remainingBalance).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-emerald-600 dark:text-emerald-400 text-xs">
                                    {paymentRecord ? `${paymentRecord.receiptNumber} / रु${paymentRecord.amount.toLocaleString()} (${paymentRecord.createdAt ? (paymentRecord.createdAt.seconds ? new Date(paymentRecord.createdAt.seconds * 1000) : new Date(paymentRecord.createdAt)).toLocaleDateString('en-GB') : ''})` : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


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
                  <p className="font-mono font-medium text-blue-600 dark:text-blue-400">रु{Math.round(paymentEmiDetail.principalForMonth).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Pending Interest</p>
                  <p className="font-mono font-medium text-orange-500">रु{Math.round(paymentEmiDetail.interestForMonth).toLocaleString()}</p>
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

    </div>
  );
}
