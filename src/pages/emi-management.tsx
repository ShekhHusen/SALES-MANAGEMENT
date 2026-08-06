import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from '@/lib/trackedFirestore';
import { Search, Calculator } from 'lucide-react';

interface EmiRecord {
  id: string;
  saleId: string;
  chassisNumber: string;
  customerId: string;
  customerName: string;
  customerContact: string;
  loanAmount: number;
  interestRate: number;
  periodMonths: number;
  emiVehiclePrice: number;
  emiDownPayment: number;
  createdAt: Timestamp;
}

export function EmiManagement() {
  const [emis, setEmis] = useState<EmiRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filteredEmis = emis.filter(emi => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (emi.customerName || '').toLowerCase().includes(searchLower) ||
      (emi.chassisNumber || '').toLowerCase().includes(searchLower) ||
      (emi.customerContact || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] lg:h-screen w-full max-w-[1600px] mx-auto animate-in fade-in zoom-in-95 duration-300 px-4 md:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:mt-[24px]">EMI Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and view customer EMI details.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden rounded-3xl">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by customer name, chassis or contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl">
            <Calculator className="w-4 h-4" />
            <span>Total EMIs: {filteredEmis.length}</span>
          </div>
        </div>

        <CardContent className="flex-1 p-0 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
              <TableRow className="border-none">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Customer Details</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Chassis No.</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Vehicle Price</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Down Payment</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Loan Amount</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Interest Rate</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Period (Mo)</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Created At</TableHead>
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
                filteredEmis.map((emi) => (
                  <TableRow key={emi.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{emi.customerName || '---'}</span>
                        <span className="text-sm text-slate-500">{emi.customerContact || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">{emi.chassisNumber}</TableCell>
                    <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">{emi.emiVehiclePrice ? `₹${emi.emiVehiclePrice.toLocaleString()}` : '---'}</TableCell>
                    <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">{emi.emiDownPayment ? `₹${emi.emiDownPayment.toLocaleString()}` : '---'}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{emi.loanAmount ? `₹${emi.loanAmount.toLocaleString()}` : '---'}</TableCell>
                    <TableCell className="text-right font-medium text-indigo-600 dark:text-indigo-400">{emi.interestRate ? `${emi.interestRate}%` : '---'}</TableCell>
                    <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">{emi.periodMonths ? `${emi.periodMonths} Mo` : '---'}</TableCell>
                    <TableCell className="text-right text-sm text-slate-500 whitespace-nowrap">
                      {emi.createdAt ? new Date(emi.createdAt.seconds * 1000).toLocaleDateString() : '---'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
