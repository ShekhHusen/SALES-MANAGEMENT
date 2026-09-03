import { useState, useEffect } from 'react';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { tallyDb } from '@/lib/tallyFirebase';
import { Loader2, FileText, ArrowLeft, Calendar, Eye, EyeOff, Printer, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';

interface TallyStatementModalProps {
  tallyAccountId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyName: string;
}

// Utility to safely parse and format amounts to 0.00
const formatAmt = (val: any) => {
  if (!val) return '0.00';
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Utility to safely parse numeric value
const parseAmt = (val: any) => {
  if (!val) return 0;
  const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? 0 : num;
};

export function TallyStatementModal({ tallyAccountId, open, onOpenChange, partyName }: TallyStatementModalProps) {
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedFyId, setSelectedFyId] = useState<string>('');
  const [fyAccountData, setFyAccountData] = useState<any>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<any>(null);
  const { businessProfile, parties, sales } = useGlobalData();
  const vmsParty = parties.find(p => p.tallyAccountId === tallyAccountId || p.name.toLowerCase() === partyName.toLowerCase());

  useEffect(() => {
    if (open) {
      fetchFiscalYears();
    }
  }, [open]);

  useEffect(() => {
    if (open && tallyAccountId && selectedFyId) {
      fetchData();
    }
  }, [open, tallyAccountId, selectedFyId]);

  const fetchFiscalYears = async () => {
    try {
      const snap = await getDocs(collection(tallyDb, 'fiscalYears'));
      const fys: any[] = [];
      snap.forEach(doc => {
        fys.push({ id: doc.id, ...doc.data() });
      });
      fys.sort((a, b) => {
        const dateA = new Date(a.startDate || 0).getTime();
        const dateB = new Date(b.startDate || 0).getTime();
        return dateB - dateA;
      });
      setFiscalYears(fys);
      if (fys.length > 0 && !selectedFyId) {
        const today = new Date().toISOString().split('T')[0];
        const currentFy = fys.find(fy => fy.startDate <= today && fy.endDate >= today);
        setSelectedFyId(currentFy ? currentFy.id : fys[0].id);
      }
    } catch (e) {
      console.error("Error fetching fiscal years:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let accName = '';
      const accDoc = await getDoc(doc(tallyDb, 'accounts', tallyAccountId!));
      if (accDoc.exists()) {
        const data = accDoc.data();
        accName = data.name;
        setAccountInfo({ id: accDoc.id, ...data });
      }

      // Fetch FY specific account data
      if (selectedFyId) {
        const fyAccDoc = await getDoc(doc(tallyDb, `accounts/${tallyAccountId}/fiscalYears`, selectedFyId));
        if (fyAccDoc.exists()) {
          setFyAccountData(fyAccDoc.data());
        } else {
          setFyAccountData(null);
        }
      }

      if (accName) {
        const qDebit = query(collection(tallyDb, 'transactions'), where('debitAccount', '==', accName));
        const qCredit = query(collection(tallyDb, 'transactions'), where('creditAccount', '==', accName));
        
        const [snapDebit, snapCredit] = await Promise.all([
          getDocs(qDebit).catch(() => null),
          getDocs(qCredit).catch(() => null)
        ]);

        const txMap = new Map();
        
        if (snapDebit) {
          snapDebit.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
        }
        if (snapCredit) {
          snapCredit.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
        }

        // Filter by FY dates
        let filteredTxs = Array.from(txMap.values());
        const selectedFy = fiscalYears.find(f => f.id === selectedFyId);
        if (selectedFy) {
          filteredTxs = filteredTxs.filter((tx: any) => {
            const txDate = tx.date || '';
            return txDate >= (selectedFy.startDate || '') && txDate <= (selectedFy.endDate || '9999-99-99');
          });
        }

        // Sort by date ASCENDING for correct running balance calculation
        const sortedTxs = filteredTxs.sort((a: any, b: any) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateA - dateB;
        });

        setTransactions(sortedTxs);
      }
    } catch (e) {
      console.error("Error fetching Tally statement:", e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize running balance based on FY selection
  let currentBalance = 0;
  let activeOpBal = selectedFyId ? (fyAccountData?.openingBalance || 0) : (accountInfo?.openingBalance || 0);
  let activeOpBalType = selectedFyId ? (fyAccountData?.openingBalanceType || '') : (accountInfo?.openingBalanceType || '');
  
  if (activeOpBal) {
     currentBalance = activeOpBalType === 'Cr' 
        ? -parseAmt(activeOpBal) 
        : parseAmt(activeOpBal);
  }

  // Robust Custom PDF Generator
  const generatePDF = (withDetails: boolean) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF');
      return;
    }

    let currentBal = accountInfo?.openingBalanceType === 'Cr' 
      ? -parseAmt(accountInfo?.openingBalance) 
      : parseAmt(accountInfo?.openingBalance);

    let rowsHtml = '';
    
    transactions.forEach(tx => {
      const isDebit = tx.debitAccount === accountInfo?.name;
      const amount = parseAmt(isDebit ? tx.debitAmount : tx.creditAmount);
      const otherParty = isDebit ? tx.creditAccount : tx.debitAccount;
      
      if (isDebit) currentBal += amount;
      else currentBal -= amount;
      
      const balType = currentBal >= 0 ? 'Dr' : 'Cr';
      const balDisplay = `${Math.abs(currentBal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balType}`;

      let detailsHtml = '';
      if (withDetails) {
        if (tx.inventory && tx.inventory.length > 0) {
           detailsHtml += `<div style="margin-top: 8px; font-size: 10px; color: #555;">
             <strong>Inventory:</strong><br/>
             ${tx.inventory.map((inv: any) => `${inv.itemName} (${inv.qty} x ${inv.rate} = ${inv.amount})`).join('<br/>')}
           </div>`;
        }
        if (tx.narration) {
           detailsHtml += `<div style="margin-top: 8px; font-size: 10px; color: #666; font-style: italic;">
             <strong>Narration:</strong> ${tx.narration}
           </div>`;
        }
        // Deliberately EXCLUDING enteredBy here as per requirement
      }

      rowsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top;">${tx.date || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top;">${tx.type || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top;">${tx.voucherNo || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top;">
            <strong>${otherParty || '-'}</strong>
            ${detailsHtml}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right; color: #059669; vertical-align: top;">
            ${isDebit ? formatAmt(amount) : '-'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right; color: #e11d48; vertical-align: top;">
            ${!isDebit ? formatAmt(amount) : '-'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right; font-weight: bold; vertical-align: top;">
            ${balDisplay}
          </td>
        </tr>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Statement - ${partyName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #111; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #ccc; font-size: 10px; text-transform: uppercase; color: #444; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; }
            .summary div { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary strong { font-size: 13px; display: block; margin-top: 4px; color: #000; text-transform: none; letter-spacing: 0; }
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
                              <div class="header">
            <div>
              <h1 style="margin: 0; font-size: 22px;">${partyName}</h1>
              ${(vmsParty?.contactNumber || vmsParty?.address) ? `<p style="margin: 4px 0 0 0; color: #444; font-size: 13px;"><strong>Contact:</strong> ${vmsParty?.contactNumber || "-"} &nbsp;|&nbsp; <strong>Address:</strong> ${vmsParty?.address || "-"}</p>` : ""}
              <p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">Comprehensive Account Statement</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 16px; color: #111;">${businessProfile?.name || 'VEHICLE MANAGEMENT SYSTEM'}</h2>
              <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">${businessProfile?.address || '123 Business Street, Auto Market'}</p>
              <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">Contact: ${businessProfile?.contactNumber || '+977 9800000000'}</p>
            </div>
          </div>
          
          <div class="summary">
            <div>Ledger Name <strong>${accountInfo?.name || '-'}</strong></div>
            <div>Under Group <strong>${accountInfo?.group || '-'}</strong></div>
            <div>Contact <strong>${accountInfo?.contact || '-'}</strong></div>
            <div>Address <strong>${accountInfo?.address || '-'}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Vch No.</th>
                <th>Particulars</th>
                <th style="text-align: right;">Debit</th>
                <th style="text-align: right;">Credit</th>
                <th style="text-align: right;">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" style="padding: 12px 8px; font-weight: bold; text-align: right; font-size: 11px; color: #555;">OPENING BALANCE</td>
                <td style="text-align: right;">-</td>
                <td style="text-align: right;">-</td>
                <td style="padding: 12px 8px; font-weight: bold; text-align: right; color: #2563eb; font-size: 12px;">
                  ${formatAmt(accountInfo?.openingBalance)} ${accountInfo?.openingBalanceType || ''}
                </td>
              </tr>
              ${rowsHtml}
              <tr>
                <td colspan="4" style="padding: 12px 8px; border-top: 2px solid #ccc; font-weight: bold; text-align: right; font-size: 11px; color: #555;">TOTALS & CLOSING BALANCE</td>
                <td style="padding: 12px 8px; border-top: 2px solid #ccc; font-weight: bold; text-align: right; color: #059669; font-size: 12px;">${formatAmt(accountInfo?.totalDebit)}</td>
                <td style="padding: 12px 8px; border-top: 2px solid #ccc; font-weight: bold; text-align: right; color: #e11d48; font-size: 12px;">${formatAmt(accountInfo?.totalCredit)}</td>
                <td style="padding: 12px 8px; border-top: 2px solid #ccc; font-weight: bold; text-align: right; color: #2563eb; font-size: 12px;">
                  ${formatAmt(accountInfo?.closingBalance)} ${accountInfo?.closingBalanceType || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-screen !h-screen !h-[100dvh] !p-0 !m-0 !rounded-none !border-0 flex flex-col bg-slate-50 dark:bg-slate-950 [&>button]:hidden">
        
        <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950">
          
          {/* Custom App Bar Header */}
          <div className="h-16 flex items-center justify-between relative px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => onOpenChange(false)} 
                className="rounded-full h-9 w-9 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {partyName} 
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 font-bold ml-2">
                    Tally Connected
                  </Badge>
                  {fiscalYears.length > 0 && (
                    <div className="relative ml-3">
                      <select
                        value={selectedFyId}
                        onChange={(e) => setSelectedFyId(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                      >
                        {fiscalYears.map(fy => (
                          <option key={fy.id} value={fy.id}>{fy.name || fy.id}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                {(vmsParty?.contactNumber || vmsParty?.address) && (<span className="text-[13px] font-semibold text-slate-500 normal-case ml-3 flex items-center gap-2 border-l pl-3 border-slate-200 dark:border-slate-700">{vmsParty?.contactNumber} {vmsParty?.contactNumber && vmsParty?.address ? "•" : ""} {vmsParty?.address}</span>)}</DialogTitle>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Comprehensive Account Statement</p>
              </div>
              
              {/* Add View button if vmsParty is a customer and has sales */}
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
              })()}
            </div>
            
            <ProcessDocumentSheet 
              open={viewSheetOpen}
              onOpenChange={setViewSheetOpen}
              viewSale={viewSale}
            />
                        

            
            {/* Top Bar PDF Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger 
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden md:flex items-center gap-2 font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900")}
              >
                <Printer className="h-4 w-4" /> Export PDF <ChevronDown className="h-3 w-3 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-medium">
                <DropdownMenuItem onClick={() => generatePDF(false)} className="cursor-pointer py-2.5">
                  Export Summary (Without Details)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => generatePDF(true)} className="cursor-pointer py-2.5">
                  Export Detailed (With Full Details)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  <p className="text-slate-500 font-medium animate-pulse">Synchronizing with Tally Analyzer...</p>
                </div>
              ) : (
                <>
                  {/* Account Profile - 1 Row 4 Columns */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Ledger Name</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{accountInfo?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Under Group</p>
                      <Badge variant="secondary" className="font-semibold">{accountInfo?.group || 'Primary'}</Badge>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Contact</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{accountInfo?.contact || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Address</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{accountInfo?.address || '-'}</p>
                    </div>
                  </div>

                  {/* Transactions Table Section */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
                      <h3 className="text-base font-black flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <FileText className="h-5 w-5 text-indigo-500" /> Transaction History
                      </h3>
                      <div className="flex items-center gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger 
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden")}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            PDF <ChevronDown className="h-3 w-3 ml-1" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => generatePDF(false)}>Summary PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generatePDF(true)}>Detailed PDF</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowFullDetails(!showFullDetails)}
                          className="h-8 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                        >
                          {showFullDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                          {showFullDetails ? "Hide Details" : "Show Full Details"}
                        </Button>
                        <Badge variant="secondary" className="font-bold hidden sm:inline-flex">
                          {transactions.length} Records
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Increased left/right padding for table here: px-6 sm:px-8 */}
                    <div className="overflow-x-auto px-6 sm:px-8 pb-6 pt-4">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                          <TableRow>
                            <TableHead className="w-[100px] font-black text-[10px] uppercase tracking-widest text-slate-500">Date</TableHead>
                            <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-500">Type</TableHead>
                            <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-500">Vch No.</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Particulars</TableHead>
                            <TableHead className="text-right w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-500">Debit</TableHead>
                            <TableHead className="text-right w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-500">Credit</TableHead>
                            <TableHead className="text-right w-[130px] font-black text-[10px] uppercase tracking-widest text-slate-500">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Opening Balance Row formatted safely to 0.00 */}
                          <TableRow className="bg-blue-50/30 dark:bg-blue-900/10">
                            <TableCell colSpan={4} className="font-bold text-slate-700 dark:text-slate-300 text-right uppercase text-xs tracking-wider">
                              Opening Balance
                            </TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono">
                              {formatAmt(activeOpBal)} {activeOpBalType}
                            </TableCell>
                          </TableRow>

                          {transactions.length > 0 ? transactions.map((tx, index) => {
                            const isDebit = tx.debitAccount === accountInfo?.name;
                            const amount = parseAmt(isDebit ? tx.debitAmount : tx.creditAmount);
                            const otherParty = isDebit ? tx.creditAccount : tx.debitAccount;
                            
                            if (isDebit) {
                              currentBalance += amount;
                            } else {
                              currentBalance -= amount;
                            }
                            
                            const balType = currentBalance >= 0 ? 'Dr' : 'Cr';
                            const balDisplay = `${Math.abs(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balType}`;
                            
                            return (
                              <TableRow key={tx.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <TableCell className="whitespace-nowrap align-top pt-4">
                                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium text-xs">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {tx.date || '-'}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top pt-4">
                                  <Badge variant="outline" className="bg-white dark:bg-slate-900 font-bold text-[10px]">
                                    {tx.type || 'N/A'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="align-top pt-4">
                                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{tx.voucherNo}</div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                    {otherParty || '-'}
                                  </div>
                                  
                                  {showFullDetails && (
                                    <div className="mt-3 space-y-3">
                                      {tx.enteredBy && (
                                        <div className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                                          Entered By: <span className="font-bold">{tx.enteredBy}</span>
                                        </div>
                                      )}

                                      {tx.inventory && tx.inventory.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Inventory Items</p>
                                          <div className="space-y-1.5">
                                            {tx.inventory.map((inv: any, idx: number) => (
                                              <div key={idx} className="flex flex-wrap justify-between text-xs items-center gap-2">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{inv.itemName}</span>
                                                <span className="text-slate-500 font-medium bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                  {inv.qty} × {inv.rate} = <span className="font-bold text-slate-800 dark:text-slate-200">{inv.amount}</span>
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {tx.narration && (
                                        <div className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/30 whitespace-pre-wrap break-words">
                                          <span className="font-black uppercase tracking-wider text-[9px] mr-2 text-amber-600 dark:text-amber-500 block mb-1">Narration</span> 
                                          {tx.narration}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right align-top pt-4">
                                  {isDebit ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono bg-emerald-50 dark:bg-emerald-900/10 px-2 py-1 rounded text-xs">
                                      {formatAmt(amount)}
                                    </span>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-right align-top pt-4">
                                  {!isDebit ? (
                                    <span className="text-rose-600 dark:text-rose-400 font-black font-mono bg-rose-50 dark:bg-rose-900/10 px-2 py-1 rounded text-xs">
                                      {formatAmt(amount)}
                                    </span>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-right align-top pt-4">
                                  <span className="font-bold font-mono text-slate-700 dark:text-slate-300 text-xs">
                                    {balDisplay}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          }) : (
                            <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                No transaction history found for this account.
                              </TableCell>
                            </TableRow>
                          )}

                          {/* Final Summary Row formatted safely to 0.00 */}
                          <TableRow className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700">
                            <TableCell colSpan={4} className="font-black text-slate-900 dark:text-slate-100 text-right uppercase text-xs tracking-wider py-4">
                              Totals & Closing Balance
                            </TableCell>
                            <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                              {formatAmt(selectedFyId ? (fyAccountData?.totalDebit || 0) : accountInfo?.totalDebit)}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                              {formatAmt(selectedFyId ? (fyAccountData?.totalCredit || 0) : accountInfo?.totalCredit)}
                            </TableCell>
                            <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                              {formatAmt(selectedFyId ? (fyAccountData?.closingBalance || 0) : accountInfo?.closingBalance)} {selectedFyId ? (fyAccountData?.closingBalanceType || '') : (accountInfo?.closingBalanceType || '')}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
