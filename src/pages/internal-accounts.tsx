import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Plus, Save, Download, RefreshCw, FileSpreadsheet, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

// Data Types
interface OpeningBalance {
    id: string;
    date: string;
    accountName: string;
    debit: number;
    credit: number;
}

interface Transaction {
    id: string;
    date: string;
    vchType: string;
    vchNo: string;
    particulars: string;
    debit: number;
    credit: number;
    narration: string;
}

export function InternalAccounts() {
    const [openings, setOpenings] = useState<OpeningBalance[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Pagination states
    const ITEMS_PER_PAGE = 10;
    const [openingsPage, setOpeningsPage] = useState(1);
    const [transactionsPage, setTransactionsPage] = useState(1);
    const [statementPage, setStatementPage] = useState(1);

    type SortConfig = { key: string, direction: 'asc' | 'desc' } | null;
    const [openingsSort, setOpeningsSort] = useState<SortConfig>(null);
    const [transactionsSort, setTransactionsSort] = useState<SortConfig>(null);

    const handleSort = (key: string, currentSort: SortConfig, setSort: (s: SortConfig) => void) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (currentSort && currentSort.key === key && currentSort.direction === 'asc') direction = 'desc';
        setSort({ key, direction });
    };

    // Tab state
    const [activeTab, setActiveTab] = useState('opening');
    
    // Statement state
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    // Fetch data on load
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/internal-accounts?t=${Date.now()}`);
            const data = await res.json();
            if (data) {
                setOpenings(data.openings || []);
                setTransactions(data.transactions || []);
            }
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setLoading(false);
        }
    };

    const saveData = async (newOpenings = openings, newTransactions = transactions) => {
        try {
            const res = await fetch('/api/internal-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ openings: newOpenings, transactions: newTransactions })
            });
            if (!res.ok) throw new Error("Failed to save.");
            toast.success("Saved successfully");
        } catch (e) {
            toast.error("Error saving data");
        }
    };

    const handleImportOpenings = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json<any>(ws, { raw: false, dateNF: 'yyyy-mm-dd' });
                
                const newOpenings: OpeningBalance[] = data.map(row => ({
                    id: Math.random().toString(),
                    date: row['Date'] || row['Date '] || '',
                    accountName: (row['Account Name'] || row['Particulars'] || '').toString().trim(),
                    debit: Number(row['Debit']) || 0,
                    credit: Number(row['Credit']) || 0
                })).filter(o => o.accountName);

                const combined = [...openings, ...newOpenings];
                setOpenings(combined);
                await saveData(combined, transactions);
                toast.success(`Imported ${newOpenings.length} opening balances`);
            } catch (error) {
                toast.error("Failed to parse Excel file");
            }
            if(e.target) e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleImportTransactions = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json<any>(ws, { raw: false, dateNF: 'yyyy-mm-dd' });
                
                const newTxns: Transaction[] = data.map(row => ({
                    id: Math.random().toString(),
                    date: row['Date'] || '',
                    vchType: row['Vch Type'] || '',
                    vchNo: row['Vch No.'] || row['Vch No'] || '',
                    particulars: (row['Particulars'] || '').toString().trim(),
                    debit: Number(row['Debit']) || 0,
                    credit: Number(row['Credit']) || 0,
                    narration: row['Narration'] || ''
                })).filter(t => t.particulars);

                const existingAccountNames = new Set(openings.map(o => o.accountName.toLowerCase()));
                const newOpeningsToCreate: OpeningBalance[] = [];
                
                newTxns.forEach(txn => {
                    const accNameLower = txn.particulars.toLowerCase();
                    if (!existingAccountNames.has(accNameLower)) {
                        existingAccountNames.add(accNameLower);
                        newOpeningsToCreate.push({
                            id: Math.random().toString(),
                            date: txn.date || new Date().toISOString().split('T')[0],
                            accountName: txn.particulars,
                            debit: 0,
                            credit: 0
                        });
                    }
                });

                const combinedTransactions = [...transactions, ...newTxns];
                const combinedOpenings = [...openings, ...newOpeningsToCreate];
                
                setTransactions(combinedTransactions);
                if (newOpeningsToCreate.length > 0) {
                    setOpenings(combinedOpenings);
                }
                
                await saveData(combinedOpenings, combinedTransactions);
                toast.success(`Imported ${newTxns.length} transactions` + (newOpeningsToCreate.length ? ` and created ${newOpeningsToCreate.length} new accounts` : ''));
            } catch (error) {
                toast.error("Failed to parse Excel file");
            }
            if(e.target) e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const downloadOpeningTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{
            'Date': 'YYYY-MM-DD',
            'Account Name': 'Example Account',
            'Debit': 1000,
            'Credit': 0
        }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Openings");
        XLSX.writeFile(wb, "Opening_Balances_Template.xlsx");
    };

    const downloadTransactionTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{
            'Date': 'YYYY-MM-DD',
            'Vch Type': 'Payment',
            'Vch No.': '101',
            'Particulars': 'Example Account',
            'Debit': 500,
            'Credit': 0,
            'Narration': 'Example narration'
        }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, "Transactions_Template.xlsx");
    };

    const allAccountNames = useMemo(() => {
        const names = new Set<string>();
        openings.forEach(o => o.accountName && names.add(o.accountName.trim()));
        transactions.forEach(t => t.particulars && names.add(t.particulars.trim()));
        return Array.from(names).sort();
    }, [openings, transactions]);

    const statementOpening = useMemo(() => {
        if (!selectedAccount) return null;
        // Sum up all openings for this account just in case there are multiple
        const acts = openings.filter(o => o.accountName.trim() === selectedAccount);
        if (acts.length === 0) return null;
        const totalDebit = acts.reduce((acc, a) => acc + (a.debit || 0), 0);
        const totalCredit = acts.reduce((acc, a) => acc + (a.credit || 0), 0);
        return { debit: totalDebit, credit: totalCredit, date: acts[0].date };
    }, [selectedAccount, openings]);

    const statementTransactions = useMemo(() => {
        if (!selectedAccount) return [];
        return transactions.filter(t => t.particulars.trim() === selectedAccount);
    }, [selectedAccount, transactions]);

    useEffect(() => {
        setStatementPage(1);
    }, [selectedAccount]);

    const sortedOpenings = useMemo(() => {
        let sortable = [...openings];
        if (openingsSort) {
            sortable.sort((a: any, b: any) => {
                if (a[openingsSort.key] < b[openingsSort.key]) return openingsSort.direction === 'asc' ? -1 : 1;
                if (a[openingsSort.key] > b[openingsSort.key]) return openingsSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [openings, openingsSort]);

    const sortedTransactions = useMemo(() => {
        let sortable = [...transactions];
        if (transactionsSort) {
            sortable.sort((a: any, b: any) => {
                if (a[transactionsSort.key] < b[transactionsSort.key]) return transactionsSort.direction === 'asc' ? -1 : 1;
                if (a[transactionsSort.key] > b[transactionsSort.key]) return transactionsSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [transactions, transactionsSort]);

    const paginatedOpenings = useMemo(() => {
        const start = (openingsPage - 1) * ITEMS_PER_PAGE;
        return sortedOpenings.slice(start, start + ITEMS_PER_PAGE);
    }, [sortedOpenings, openingsPage]);

    const paginatedTransactions = useMemo(() => {
        const start = (transactionsPage - 1) * ITEMS_PER_PAGE;
        return sortedTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [sortedTransactions, transactionsPage]);

    const paginatedStatementTxns = useMemo(() => {
        const start = (statementPage - 1) * ITEMS_PER_PAGE;
        return statementTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [statementTransactions, statementPage]);

    const totals = useMemo(() => {
        const opDb = statementOpening?.debit || 0;
        const opCr = statementOpening?.credit || 0;
        const txDb = statementTransactions.reduce((acc, t) => acc + (t.debit || 0), 0);
        const txCr = statementTransactions.reduce((acc, t) => acc + (t.credit || 0), 0);
        
        const totalDb = opDb + txDb;
        const totalCr = opCr + txCr;
        
        const balance = totalDb - totalCr;
        const isDebitBal = balance >= 0;

        return {
            totalDb, totalCr, balance: Math.abs(balance), isDebitBal
        };
    }, [statementOpening, statementTransactions]);

    return (
        <div className="flex flex-col gap-4 h-full p-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Internal Accounts</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage opening balances and internal transactions</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-fit">
                    <TabsTrigger value="opening">Account Opening</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="statement">Account Statement</TabsTrigger>
                </TabsList>

                {/* --- ACCOUNT OPENING --- */}
                <TabsContent value="opening" className="flex-1 mt-4 flex flex-col min-h-0">
                    <Card className="flex-1 flex flex-col min-h-0">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle>Opening Balances</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button onClick={downloadOpeningTemplate} variant="outline" size="sm" className="h-9">
                                    <Download className="w-4 h-4 mr-2" />
                                    Template
                                </Button>
                                <label className="cursor-pointer h-9 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Import Excel
                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportOpenings} />
                                </label>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[#F8FAFC] dark:bg-slate-900 text-slate-500 font-bold sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('date', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center">Date <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('accountName', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center">Account Name <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b text-right flex-1 justify-end cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('debit', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center justify-end">Debit <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('credit', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center justify-end">Credit <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {openings.length === 0 && (
                                            <tr><td colSpan={4} className="p-4 text-center text-slate-500">No opening balances. Import from Excel to get started.</td></tr>
                                        )}
                                        {paginatedOpenings.map((op, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="px-4 py-2">{op.date}</td>
                                                <td className="px-4 py-2 font-medium">{op.accountName}</td>
                                                <td className="px-4 py-2 text-right">{op.debit ? op.debit.toFixed(2) : '-'}</td>
                                                <td className="px-4 py-2 text-right">{op.credit ? op.credit.toFixed(2) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Openings Pagination */}
                            {openings.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 shadow-sm text-sm text-slate-500">
                                    <div>Showing {((openingsPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(openingsPage * ITEMS_PER_PAGE, openings.length)} of {openings.length} entries</div>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setOpeningsPage(p => Math.max(1, p - 1))} disabled={openingsPage === 1} className="h-8">
                                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setOpeningsPage(p => Math.min(Math.ceil(openings.length / ITEMS_PER_PAGE), p + 1))} disabled={openingsPage === Math.ceil(openings.length / ITEMS_PER_PAGE)} className="h-8">
                                            Next <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TRANSACTIONS --- */}
                <TabsContent value="transactions" className="flex-1 mt-4 flex flex-col min-h-0">
                    <Card className="flex-1 flex flex-col min-h-0">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle>Transactions</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button onClick={downloadTransactionTemplate} variant="outline" size="sm" className="h-9">
                                    <Download className="w-4 h-4 mr-2" />
                                    Template
                                </Button>
                                <label className="cursor-pointer h-9 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Import Excel
                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportTransactions} />
                                </label>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[#F8FAFC] dark:bg-slate-900 text-slate-500 font-bold sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('date', transactionsSort, setTransactionsSort)}>
                                                <div className="flex items-center whitespace-nowrap">Date <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('vchType', transactionsSort, setTransactionsSort)}>
                                                <div className="flex items-center whitespace-nowrap">Vch Type <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('vchNo', transactionsSort, setTransactionsSort)}>
                                                <div className="flex items-center whitespace-nowrap">Vch No. <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('particulars', transactionsSort, setTransactionsSort)}>
                                                <div className="flex items-center">Particulars <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('debit', transactionsSort, setTransactionsSort)}>
                                                <div className="flex items-center justify-end">Debit <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('credit', transactionsSort, setTransactionsSort)}>
                                                <div className="flex items-center justify-end">Credit <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 border-b">Narration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.length === 0 && (
                                            <tr><td colSpan={7} className="p-4 text-center text-slate-500">No transactions. Import from Excel to get started.</td></tr>
                                        )}
                                        {paginatedTransactions.map((tx, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="px-4 py-2 whitespace-nowrap">{tx.date}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{tx.vchType}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{tx.vchNo}</td>
                                                <td className="px-4 py-2 font-medium">{tx.particulars}</td>
                                                <td className="px-4 py-2 text-right whitespace-nowrap">{tx.debit ? tx.debit.toFixed(2) : '-'}</td>
                                                <td className="px-4 py-2 text-right whitespace-nowrap">{tx.credit ? tx.credit.toFixed(2) : '-'}</td>
                                                <td className="px-4 py-2 text-slate-500 max-w-[200px] truncate" title={tx.narration}>{tx.narration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Transactions Pagination */}
                            {transactions.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 shadow-sm text-sm text-slate-500">
                                    <div>Showing {((transactionsPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(transactionsPage * ITEMS_PER_PAGE, transactions.length)} of {transactions.length} entries</div>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setTransactionsPage(p => Math.max(1, p - 1))} disabled={transactionsPage === 1} className="h-8">
                                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setTransactionsPage(p => Math.min(Math.ceil(transactions.length / ITEMS_PER_PAGE), p + 1))} disabled={transactionsPage === Math.ceil(transactions.length / ITEMS_PER_PAGE)} className="h-8">
                                            Next <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ACCOUNT STATEMENT --- */}
                <TabsContent value="statement" className="flex-1 mt-4 flex flex-col min-h-0 space-y-4">
                    <Card className="flex-1 flex flex-col min-h-0">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <CardTitle className="whitespace-nowrap">Account Statement</CardTitle>
                                <select 
                                    className="w-full md:w-80 h-10 px-3 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                    <option value="" disabled>Select an account...</option>
                                    {allAccountNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
                            {!selectedAccount ? (
                                <div className="p-8 text-center text-slate-500">
                                    Please select an account to view its statement.
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col h-full overflow-hidden">
                                    <div className="flex-1 overflow-y-auto px-6">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-[#F8FAFC] dark:bg-slate-900 text-slate-500 font-bold sticky top-0 shadow-sm z-10">
                                                <tr>
                                                    <th className="px-4 py-3 border-b">Date</th>
                                                    <th className="px-4 py-3 border-b">Details</th>
                                                    <th className="px-4 py-3 border-b">Vch Type</th>
                                                    <th className="px-4 py-3 border-b">Vch No.</th>
                                                    <th className="px-4 py-3 border-b text-right">Debit</th>
                                                    <th className="px-4 py-3 border-b text-right">Credit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Opening Row */}
                                                <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-b">
                                                    <td className="px-4 py-3 font-medium text-slate-500">{statementOpening?.date || '-'}</td>
                                                    <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">Opening Balance</td>
                                                    <td className="px-4 py-3"></td>
                                                    <td className="px-4 py-3"></td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                        {statementOpening?.debit ? statementOpening.debit.toFixed(2) : ''}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                        {statementOpening?.credit ? statementOpening.credit.toFixed(2) : ''}
                                                    </td>
                                                </tr>

                                                {/* Transaction Rows */}
                                                {paginatedStatementTxns.map((tx, i) => (
                                                    <tr key={tx.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{tx.date}</td>
                                                        <td className="px-4 py-3">
                                                            <div>{tx.particulars}</div>
                                                            {tx.narration && <div className="text-xs text-slate-400 mt-0.5 max-w-sm truncate" title={tx.narration}>{tx.narration}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{tx.vchType}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{tx.vchNo}</td>
                                                        <td className="px-4 py-3 text-right">{tx.debit ? tx.debit.toFixed(2) : ''}</td>
                                                        <td className="px-4 py-3 text-right">{tx.credit ? tx.credit.toFixed(2) : ''}</td>
                                                    </tr>
                                                ))}
                                                
                                                {statementTransactions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No transactions recorded.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Statement Pagination */}
                                    {statementTransactions.length > ITEMS_PER_PAGE && (
                                        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-500 z-10 shadow-sm relative">
                                            <div>Showing {((statementPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(statementPage * ITEMS_PER_PAGE, statementTransactions.length)} of {statementTransactions.length} entries</div>
                                            <div className="flex gap-1">
                                                <Button variant="outline" size="sm" onClick={() => setStatementPage(p => Math.max(1, p - 1))} disabled={statementPage === 1} className="h-8">
                                                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => setStatementPage(p => Math.min(Math.ceil(statementTransactions.length / ITEMS_PER_PAGE), p + 1))} disabled={statementPage === Math.ceil(statementTransactions.length / ITEMS_PER_PAGE)} className="h-8">
                                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Footer Summary */}
                                    <div className="bg-slate-100 dark:bg-slate-900/80 p-6 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)] z-20">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Opening</p>
                                                <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                                                    ₹{Math.abs((statementOpening?.debit || 0) - (statementOpening?.credit || 0)).toFixed(2)} 
                                                    <span className="text-xs text-slate-400 ml-1">
                                                        {((statementOpening?.debit || 0) >= (statementOpening?.credit || 0)) ? 'Dr' : 'Cr'}
                                                    </span>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Total Debit</p>
                                                <p className="text-lg font-medium text-red-600 dark:text-red-400">₹{totals.totalDb.toFixed(2)} <span className="text-xs opacity-70">Dr</span></p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Total Credit</p>
                                                <p className="text-lg font-medium text-green-600 dark:text-green-400">₹{totals.totalCr.toFixed(2)} <span className="text-xs opacity-70">Cr</span></p>
                                            </div>
                                            <div className="md:border-l md:border-slate-300 dark:md:border-slate-700 md:pl-4">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold mb-1">Closing Balance</p>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                                    ₹{totals.balance.toFixed(2)} 
                                                    <span className="text-sm font-semibold ml-1.5 text-slate-500">
                                                        {totals.isDebitBal ? 'Dr' : 'Cr'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
