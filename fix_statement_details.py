with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# I will rewrite the file to perfectly include the new features without messing up the existing design
full_code = """import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { tallyDb } from '@/lib/tallyFirebase';
import { Loader2, FileText, ArrowLeft, Calendar, Building2, Phone, MapPin, Calculator, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TallyStatementModalProps {
  tallyAccountId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyName: string;
}

export function TallyStatementModal({ tallyAccountId, open, onOpenChange, partyName }: TallyStatementModalProps) {
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  useEffect(() => {
    if (open && tallyAccountId) {
      fetchData();
    }
  }, [open, tallyAccountId]);

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

        // Sort by date ASCENDING for correct running balance calculation
        const sortedTxs = Array.from(txMap.values()).sort((a, b) => {
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

  // Initialize running balance
  let currentBalance = 0;
  if (accountInfo?.openingBalance) {
     currentBalance = accountInfo.openingBalanceType === 'Cr' 
        ? -Number(accountInfo.openingBalance) 
        : Number(accountInfo.openingBalance);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-screen !h-screen !h-[100dvh] !p-0 !m-0 !rounded-none !border-0 flex flex-col bg-slate-50 dark:bg-slate-950 [&>button]:hidden">
        
        {/* Custom App Bar Header */}
        <div className="h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 shadow-sm">
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
              </DialogTitle>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Comprehensive Account Statement</p>
            </div>
          </div>
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowFullDetails(!showFullDetails)}
                        className="h-8 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                      >
                        {showFullDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showFullDetails ? "Hide Details" : "Show Full Details"}
                      </Button>
                      <Badge variant="secondary" className="font-bold">
                        {transactions.length} Records
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
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
                        {/* Opening Balance Row */}
                        <TableRow className="bg-blue-50/30 dark:bg-blue-900/10">
                          <TableCell colSpan={4} className="font-bold text-slate-700 dark:text-slate-300 text-right uppercase text-xs tracking-wider">
                            Opening Balance
                          </TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono">
                            {accountInfo?.openingBalance || '0.00'} {accountInfo?.openingBalanceType || ''}
                          </TableCell>
                        </TableRow>

                        {transactions.length > 0 ? transactions.map((tx, index) => {
                          const isDebit = tx.debitAccount === accountInfo?.name;
                          const amount = Number(isDebit ? tx.debitAmount : tx.creditAmount) || 0;
                          const otherParty = isDebit ? tx.creditAccount : tx.debitAccount;
                          
                          if (isDebit) {
                            currentBalance += amount;
                          } else {
                            currentBalance -= amount;
                          }
                          
                          const balType = currentBalance >= 0 ? 'Dr' : 'Cr';
                          const balDisplay = `${Math.abs(currentBalance).toFixed(2)} ${balType}`;
                          
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
                                    {amount.toFixed(2)}
                                  </span>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-right align-top pt-4">
                                {!isDebit ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-black font-mono bg-rose-50 dark:bg-rose-900/10 px-2 py-1 rounded text-xs">
                                    {amount.toFixed(2)}
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

                        {/* Final Summary Row */}
                        <TableRow className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700">
                          <TableCell colSpan={4} className="font-black text-slate-900 dark:text-slate-100 text-right uppercase text-xs tracking-wider py-4">
                            Totals & Closing Balance
                          </TableCell>
                          <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                            {accountInfo?.totalDebit || '0.00'}
                          </TableCell>
                          <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                            {accountInfo?.totalCredit || '0.00'}
                          </TableCell>
                          <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                            {accountInfo?.closingBalance || '0.00'} {accountInfo?.closingBalanceType || ''}
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
      </DialogContent>
    </Dialog>
  );
}
"""

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(full_code)
