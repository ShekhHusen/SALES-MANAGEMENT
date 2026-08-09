import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, where } from '@/lib/trackedFirestore';
import { Search, Calculator, CheckSquare, Calendar, CarFront, User, FileText, IndianRupee, Download, Printer, ChevronLeft, ChevronRight, X, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateDoc, doc, addDoc, deleteDoc } from '@/lib/trackedFirestore';
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
  const [sortField, setSortField] = useState<'fileNumber' | 'customerName' | 'loanAmount' | 'monthlyEmi' | 'nextEmiDate' | 'pendingEmiSum' | 'status' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, emiMonthFilter, statusFilter, pageSize, sortField, sortOrder]);

  const handleSort = (field: 'fileNumber' | 'customerName' | 'loanAmount' | 'monthlyEmi' | 'nextEmiDate' | 'pendingEmiSum' | 'status') => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: 'fileNumber' | 'customerName' | 'loanAmount' | 'monthlyEmi' | 'nextEmiDate' | 'pendingEmiSum' | 'status') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 ml-1 shrink-0 inline-block" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold ml-1 shrink-0 inline-block" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold ml-1 shrink-0 inline-block" />
    );
  };
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

  const [selectedEmiForFollowUp, setSelectedEmiForFollowUp] = useState<EmiRecord | null>(null);
  const [followUpsList, setFollowUpsList] = useState<any[]>([]);
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false);
  const [followUpRecentDate, setFollowUpRecentDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [followUpNextDate, setFollowUpNextDate] = useState('');
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);

  useEffect(() => {
    if (selectedEmiForFollowUp) {
      const q = query(collection(db, 'emiFollowUps'), where('emiId', '==', selectedEmiForFollowUp.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setFollowUpsList(list);
      }, (err) => {
        console.error('Follow-ups snapshot error:', err);
      });
      return () => unsubscribe();
    } else {
      setFollowUpsList([]);
    }
  }, [selectedEmiForFollowUp]);

  const handleSaveFollowUp = async () => {
    if (!selectedEmiForFollowUp) return;
    if (!followUpRemarks.trim()) {
      toast.error('Please enter remarks');
      return;
    }
    setIsSavingFollowUp(true);
    try {
      await addDoc(collection(db, 'emiFollowUps'), {
        emiId: selectedEmiForFollowUp.id,
        recentDate: followUpRecentDate,
        remarks: followUpRemarks.trim(),
        nextDate: followUpNextDate,
        createdAt: new Date()
      });
      toast.success('Follow up saved successfully');
      setIsAddFollowUpOpen(false);
      setFollowUpRemarks('');
      setFollowUpNextDate('');
    } catch (error) {
      console.error('Error saving follow up', error);
      toast.error('Failed to save follow up');
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const handleDeleteFollowUp = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'emiFollowUps', id));
      toast.success('Follow up deleted');
    } catch (error) {
      console.error('Error deleting follow up', error);
      toast.error('Failed to delete follow up');
    }
  };

  const formatDateYYYYMonDD = (d: Date | null | undefined) => {
    if (!d || isNaN(d.getTime())) return '---';
    const year = d.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
      const paymentInfo = paymentRecord ? `${paymentRecord.receiptNumber} / Rs. ${paymentRecord.amount.toLocaleString()} (${paymentDateStr})` : '';

      tableRows += `
        <tr>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${emiNo}</td>
          <td style="border: 1px solid black; padding: 8px;">${emiDate.toLocaleDateString('en-GB')}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">Rs. ${Math.round(principalForMonth).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">Rs. ${Math.round(interestForMonth).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">Rs. ${Math.round(balance).toLocaleString()}</td>
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
              <div class="details-row"><div class="details-label">Vehicle Price:</div><div>Rs. ${(selectedEmiForView.emiVehiclePrice || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Down Payment:</div><div>Rs. ${(selectedEmiForView.emiDownPayment || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Interest Rate:</div><div>${selectedEmiForView.interestRate}%</div></div>
              <div class="details-row"><div class="details-label">Period:</div><div>${selectedEmiForView.periodMonths} Months</div></div>
              <div class="details-row"><div class="details-label">Loan Amount:</div><div>Rs. ${(selectedEmiForView.loanAmount || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Monthly EMI:</div><div>Rs. ${Math.round(monthlyEmi).toLocaleString()}</div></div>
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

  const sortedEmis = [...filteredEmis].sort((a, b) => {
    if (!sortField) return 0;

    let valA: any;
    let valB: any;

    switch (sortField) {
      case 'fileNumber': {
        const numA = parseInt(a.fileNumber || '0', 10);
        const numB = parseInt(b.fileNumber || '0', 10);
        valA = isNaN(numA) ? (a.fileNumber || '') : numA;
        valB = isNaN(numB) ? (b.fileNumber || '') : numB;
        break;
      }
      case 'customerName':
        valA = (a.customerName || '').toLowerCase();
        valB = (b.customerName || '').toLowerCase();
        break;
      case 'loanAmount':
        valA = a.loanAmount || 0;
        valB = b.loanAmount || 0;
        break;
      case 'monthlyEmi':
        valA = a.monthlyEmi || 0;
        valB = b.monthlyEmi || 0;
        break;
      case 'nextEmiDate':
        valA = a.nextEmiDate ? a.nextEmiDate.getTime() : 0;
        valB = b.nextEmiDate ? b.nextEmiDate.getTime() : 0;
        break;
      case 'pendingEmiSum':
        valA = a.pendingEmiSum || 0;
        valB = b.pendingEmiSum || 0;
        break;
      case 'status': {
        const getStatusRank = (rec: typeof a) => {
          if (rec.isCompleted) return 0;
          if (rec.overdueEmisCount > 0) return 2;
          return 1;
        };
        valA = getStatusRank(a);
        valB = getStatusRank(b);
        break;
      }
      default:
        return 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedEmis.length / pageSize) || 1;
  const paginatedEmis = sortedEmis.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen w-full max-w-[1600px] mx-0 animate-in fade-in zoom-in-95 duration-300 px-2 md:px-2 lg:px-2 py-1 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 mb-1 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:mt-[24px]">EMI Management</h1>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden rounded-3xl sm:py-0">
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

        <CardContent className="flex-1 min-h-0 p-0 overflow-auto mx-2 md:mx-6 mb-0">
          <Table className="w-full whitespace-nowrap">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
              <TableRow className="border-none">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-px text-center">Action</TableHead>
                <TableHead 
                  className="font-bold text-slate-700 dark:text-slate-300 w-px text-center cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('fileNumber')}
                  title="Click to sort by File No."
                >
                  <div className="flex items-center justify-center">
                    <span>File No.</span>
                    {renderSortIcon('fileNumber')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('customerName')}
                  title="Click to sort by Customer Details"
                >
                  <div className="flex items-center">
                    <span>Customer Details</span>
                    {renderSortIcon('customerName')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-700 dark:text-slate-300 text-right cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('loanAmount')}
                  title="Click to sort by Loan Amount"
                >
                  <div className="flex items-center justify-end">
                    <span>Loan Amount</span>
                    {renderSortIcon('loanAmount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-700 dark:text-slate-300 text-right cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('monthlyEmi')}
                  title="Click to sort by EMI"
                >
                  <div className="flex items-center justify-end">
                    <span>EMI</span>
                    {renderSortIcon('monthlyEmi')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('nextEmiDate')}
                  title="Click to sort by Coming EMI Date"
                >
                  <div className="flex items-center justify-center">
                    <span>Coming EMI Date</span>
                    {renderSortIcon('nextEmiDate')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-700 dark:text-slate-300 text-right cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('pendingEmiSum')}
                  title="Click to sort by Pending EMI"
                >
                  <div className="flex items-center justify-end">
                    <span>Pending EMI</span>
                    {renderSortIcon('pendingEmiSum')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('status')}
                  title="Click to sort by Status"
                >
                  <div className="flex items-center justify-center">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </TableHead>
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
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => setSelectedEmiForView(emi)}>View</Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 shrink-0" 
                            title="Follow up History"
                            onClick={() => setSelectedEmiForFollowUp(emi)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
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
                        {emi.loanAmount ? `Rs. ${emi.loanAmount.toLocaleString()}` : '---'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400">
                        Rs. {Math.round(monthlyEmi).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-700 dark:text-slate-300">
                        {formatDateYYYYMonDD(nextEmiDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-500">
                        Rs. {pendingEmiSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
              <DialogHeader className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <div className="flex justify-between items-start w-full">
                  <DialogTitle className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-bold">EMI Details</span>
                      {selectedEmiForView.fileNumber && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                          #{selectedEmiForView.fileNumber}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-normal text-slate-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Sale Date: {selectedEmiForView.saleDate ? new Date(selectedEmiForView.saleDate.seconds * 1000).toLocaleDateString('en-GB') : (selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000).toLocaleDateString('en-GB') : '---')}
                    </span>
                  </DialogTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 h-9 px-3">
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEmiForView(null)}
                      className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </div>
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
                        <p className="font-medium font-mono text-emerald-600">Rs. {(selectedEmiForView.emiVehiclePrice || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Down Payment</p>
                        <p className="font-medium font-mono text-blue-600">Rs. {(selectedEmiForView.emiDownPayment || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Loan Amount</p>
                        <p className="font-medium font-mono text-purple-600">Rs. {(selectedEmiForView.loanAmount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Monthly EMI</p>
                        <p className="font-medium font-mono text-indigo-600">
                          Rs. {Math.round(
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
                                    Rs. {Math.round(principalForMonth).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-orange-500">
                                    Rs. {Math.round(interestForMonth).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-slate-700 dark:text-slate-300">
                                    Rs. {Math.round(remainingBalance).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono p-2 text-emerald-600 dark:text-emerald-400 text-xs">
                                    {paymentRecord ? `${paymentRecord.receiptNumber} / Rs. ${paymentRecord.amount.toLocaleString()} (${paymentRecord.createdAt ? (paymentRecord.createdAt.seconds ? new Date(paymentRecord.createdAt.seconds * 1000) : new Date(paymentRecord.createdAt)).toLocaleDateString('en-GB') : ''})` : '-'}
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
                  <p className="font-mono font-medium text-blue-600 dark:text-blue-400">Rs. {Math.round(paymentEmiDetail.principalForMonth).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Pending Interest</p>
                  <p className="font-mono font-medium text-orange-500">Rs. {Math.round(paymentEmiDetail.interestForMonth).toLocaleString()}</p>
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

      {/* Follow up History Dialog */}
      <Dialog open={!!selectedEmiForFollowUp} onOpenChange={(open) => !open && setSelectedEmiForFollowUp(null)}>
        <DialogContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden max-h-[85vh]">
          {selectedEmiForFollowUp && (
            <>
              <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <span>Follow up History</span>
                      {selectedEmiForFollowUp.fileNumber && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs">
                          #{selectedEmiForFollowUp.fileNumber}
                        </Badge>
                      )}
                    </DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customer: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEmiForFollowUp.customerName}</span> ({selectedEmiForFollowUp.customerContact || '---'})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs gap-1"
                      onClick={() => {
                        setFollowUpRecentDate(new Date().toISOString().split('T')[0]);
                        setFollowUpRemarks('');
                        setFollowUpNextDate('');
                        setIsAddFollowUpOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Follow up
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEmiForFollowUp(null)}
                      className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 overflow-y-auto flex-1 min-h-[220px]">
                {followUpsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No follow up history found.</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Follow up" to create a new record.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Recent Date</TableHead>
                          <TableHead className="font-bold text-xs">Remarks</TableHead>
                          <TableHead className="font-bold text-xs">Next Date</TableHead>
                          <TableHead className="font-bold text-xs text-right w-12">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {followUpsList.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {item.recentDate ? new Date(item.recentDate).toLocaleDateString('en-GB') : '---'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-w-[250px]">
                              {item.remarks || '---'}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {item.nextDate ? new Date(item.nextDate).toLocaleDateString('en-GB') : '---'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleDeleteFollowUp(item.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Follow up Dialog */}
      <Dialog open={isAddFollowUpOpen} onOpenChange={setIsAddFollowUpOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add New Follow up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Recent Date</Label>
              <Input 
                type="date" 
                value={followUpRecentDate} 
                onChange={(e) => setFollowUpRecentDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks</Label>
              <Textarea 
                placeholder="Enter remarks or customer conversation details..."
                value={followUpRemarks}
                onChange={(e) => setFollowUpRemarks(e.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Next Date</Label>
              <Input 
                type="date" 
                value={followUpNextDate} 
                onChange={(e) => setFollowUpNextDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddFollowUpOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSavingFollowUp} onClick={handleSaveFollowUp}>
              {isSavingFollowUp ? 'Saving...' : 'Save Follow up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
