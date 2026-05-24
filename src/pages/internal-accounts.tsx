import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Plus, Save, Download, RefreshCw, FileSpreadsheet, ChevronLeft, ChevronRight, ArrowUpDown, Link, History, Calendar as CalendarIcon, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Party, Sale, OtherDetails, Vehicle, Model, Company, FollowUp } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';


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
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [parties, setParties] = useState<Party[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [otherDetails, setOtherDetails] = useState<OtherDetails[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [followups, setFollowups] = useState<FollowUp[]>([]);
    const [isFollowupOpen, setIsFollowupOpen] = useState(false);
    const [newFollowupMsg, setNewFollowupMsg] = useState('');
    const [newFollowupDate, setNewFollowupDate] = useState('');
    const [newFollowupTime, setNewFollowupTime] = useState('');
    const [isUnlinkConfirmOpen, setIsUnlinkConfirmOpen] = useState(false);
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
        const unsubs = [
            onSnapshot(collection(db, 'parties'), (snap) => setParties(snap.docs.map(d => ({ id: d.id, ...d.data() } as Party)))),
            onSnapshot(collection(db, 'sales'), (snap) => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)))),
            onSnapshot(collection(db, 'otherDetails'), (snap) => setOtherDetails(snap.docs.map(d => ({ id: d.id, ...d.data() } as OtherDetails)))),
            onSnapshot(collection(db, 'vehicles'), (snap) => setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)))),
            onSnapshot(collection(db, 'models'), (snap) => setModels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Model)))),
            onSnapshot(collection(db, 'companies'), (snap) => setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)))),
            onSnapshot(query(collection(db, 'followups'), orderBy('createdAt', 'desc')), (snap) => setFollowups(snap.docs.map(d => ({ id: d.id, ...d.data() } as FollowUp))))
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/internal-accounts?t=${Date.now()}`);
            const data = await res.json();
            if (data) {
                setOpenings(data.openings || []);
                setTransactions(data.transactions || []);
                setMappings(data.mappings || {});
            }
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setLoading(false);
        }
    };

    const saveData = async (newOpenings = openings, newTransactions = transactions, newMappings = mappings) => {
        try {
            const res = await fetch('/api/internal-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ openings: newOpenings, transactions: newTransactions, mappings: newMappings })
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

    const handleMapCustomer = async (partyId: string) => {
        if (!selectedAccount) return;
        const newMappings = { ...mappings, [selectedAccount]: partyId };
        setMappings(newMappings);
        await saveData(openings, transactions, newMappings);
    };

    const handleUnmapCustomer = async () => {
        if (!selectedAccount) return;
        const newMappings = { ...mappings };
        delete newMappings[selectedAccount];
        setMappings(newMappings);
        await saveData(openings, transactions, newMappings);
        setIsUnlinkConfirmOpen(false);
    };

    const linkedParty = useMemo(() => {
        if (!selectedAccount || !mappings[selectedAccount]) return null;
        return parties.find(p => p.id === mappings[selectedAccount]);
    }, [selectedAccount, mappings, parties]);
    
    useEffect(() => {
        if (isFollowupOpen) {
            const now = new Date();
            setNewFollowupDate(now.toLocaleDateString('en-CA'));
            setNewFollowupTime(now.toTimeString().slice(0, 5));
            setNewFollowupMsg('');
        }
    }, [isFollowupOpen]);

    const handleSaveFollowup = async () => {
        if (!linkedParty) return;
        if (!newFollowupMsg.trim()) {
            toast.error('Please enter a message');
            return;
        }

        let nextDate = null;
        if (newFollowupDate) {
            const timeStr = newFollowupTime || '09:00';
            nextDate = new Date(`${newFollowupDate}T${timeStr}`);
        }

        try {
            await addDoc(collection(db, 'followups'), {
                partyId: linkedParty.id,
                message: newFollowupMsg,
                nextFollowUpDate: nextDate,
                createdAt: serverTimestamp()
            });

            toast.success('Follow-up added successfully');
            setNewFollowupMsg('');
            const now = new Date();
            setNewFollowupDate(now.toLocaleDateString('en-CA'));
            setNewFollowupTime(now.toTimeString().slice(0, 5));
        } catch (error) {
            console.error('Error saving follow-up:', error);
            toast.error('Failed to add follow-up');
        }
    };

    const linkedPartyFollowups = useMemo(() => {
        if (!linkedParty) return [];
        return followups.filter(f => f.partyId === linkedParty.id);
    }, [linkedParty, followups]);

    const linkedSales = useMemo(() => {
        if (!linkedParty) return [];
        return sales.filter(s => s.customerId === linkedParty.id);
    }, [linkedParty, sales]);

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
        <div className="flex flex-col gap-6 h-full p-4 md:p-6 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 drop-shadow-sm">Internal Accounts</h1>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-fit bg-white/50 dark:bg-slate-950/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 p-1 rounded-xl shadow-sm">
                    <TabsTrigger value="opening" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Account Opening</TabsTrigger>
                    <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Transactions</TabsTrigger>
                    <TabsTrigger value="statement" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Account Statement</TabsTrigger>
                    <TabsTrigger value="mapping" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Customer Mapping</TabsTrigger>
                </TabsList>

                {/* --- ACCOUNT OPENING --- */}
                <TabsContent value="opening" className="flex-1 mt-6 flex flex-col min-h-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 z-20">
                            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">Opening Balances</CardTitle>
                            <div className="flex items-center gap-3">
                                <Button onClick={downloadOpeningTemplate} variant="outline" size="sm" className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                    <Download className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                                    Template
                                </Button>
                                <label className="cursor-pointer h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0.5">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Import Excel
                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportOpenings} />
                                </label>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden relative">
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
                <TabsContent value="transactions" className="flex-1 mt-6 flex flex-col min-h-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 z-20">
                            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">Transactions</CardTitle>
                            <div className="flex items-center gap-3">
                                <Button onClick={downloadTransactionTemplate} variant="outline" size="sm" className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                    <Download className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                                    Template
                                </Button>
                                <label className="cursor-pointer h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0.5">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Import Excel
                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportTransactions} />
                                </label>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden relative">
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
                <TabsContent value="statement" className="flex-1 mt-6 flex flex-col min-h-0 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 z-20">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <CardTitle className="whitespace-nowrap text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">Account Statement</CardTitle>
                                <div className="relative w-full md:w-96">
                                    <select 
                                        className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none shadow-sm transition-all"
                                        value={selectedAccount}
                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                    >
                                        <option value="" disabled>Select an account...</option>
                                        {allAccountNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                        <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden relative">
                            {!selectedAccount ? (
                                <div className="p-8 text-center text-slate-500">
                                    Please select an account to view its statement.
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col h-full overflow-hidden">
                                    {/* MAPPING SECTION */}
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3 w-full xl:w-auto">
                                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                                                <Link className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Customer Mapping</p>
                                                {linkedParty ? (
                                                    <p className="text-xs text-slate-500">Linked to: <span className="font-semibold text-slate-800 dark:text-slate-300">{linkedParty.name}</span></p>
                                                ) : (
                                                    <p className="text-xs text-slate-400">Not linked to any party from stakeholder management.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full xl:w-auto">
                                            {!linkedParty ? (
                                                <select 
                                                    className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    onChange={(e) => {
                                                        if (e.target.value) handleMapCustomer(e.target.value);
                                                    }}
                                                    value=""
                                                >
                                                    <option value="" disabled>Link to a Party...</option>
                                                    {parties.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.contactNumber || 'No contact'})</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Dialog open={isFollowupOpen} onOpenChange={setIsFollowupOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-9 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20">
                                                                <History className="w-4 h-4 mr-2" /> Follow-up History
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                                                            <DialogHeader className="shrink-0">
                                                                <DialogTitle>Follow-up History - {linkedParty?.name}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                                                {/* Add Follow-up Form */}
                                                                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message / Notes</Label>
                                                                        <Textarea 
                                                                            value={newFollowupMsg} 
                                                                            onChange={(e) => setNewFollowupMsg(e.target.value)} 
                                                                            placeholder="Enter follow-up notes..."
                                                                            className="resize-none"
                                                                            rows={3}
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Next Date</Label>
                                                                            <Input type="date" value={newFollowupDate} onChange={(e) => setNewFollowupDate(e.target.value)} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</Label>
                                                                            <Input type="time" value={newFollowupTime} onChange={(e) => setNewFollowupTime(e.target.value)} />
                                                                        </div>
                                                                    </div>
                                                                    <Button onClick={handleSaveFollowup} className="w-full">Save Follow-up</Button>
                                                                </div>

                                                                {/* History List */}
                                                                <div className="space-y-3">
                                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Previous Follow-ups</h4>
                                                                    {linkedPartyFollowups.length === 0 ? (
                                                                        <p className="text-sm text-center text-slate-500 py-4">No history available.</p>
                                                                    ) : (
                                                                        linkedPartyFollowups.map(f => (
                                                                            <div key={f.id} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{f.message}</p>
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                                        <span className="font-semibold">Added:</span> {(f.createdAt as any)?.toDate?.().toLocaleString() || 'Just now'}
                                                                                    </div>
                                                                                    {f.nextFollowUpDate && (
                                                                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 font-medium">
                                                                                            <span className="font-semibold text-amber-700 dark:text-amber-400">Next Action:</span> {(f.nextFollowUpDate as any)?.toDate?.().toLocaleString() || new Date(f.nextFollowUpDate as any).toLocaleString()}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Dialog open={isUnlinkConfirmOpen} onOpenChange={setIsUnlinkConfirmOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20">
                                                                Unlink Party
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Confirm Unlink</DialogTitle>
                                                            </DialogHeader>
                                                            <p className="text-sm flex-1 text-slate-500">Are you sure you want to unlink <span className="font-bold text-slate-800 dark:text-slate-200">{linkedParty.name}</span> from <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAccount}</span>? The customer linkage will be removed.</p>
                                                            <DialogFooter className="mt-4">
                                                                <Button variant="ghost" onClick={() => setIsUnlinkConfirmOpen(false)}>Cancel</Button>
                                                                <Button variant="destructive" onClick={handleUnmapCustomer}>Confirm Unlink</Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* VEHICLE DETAILS SECTION */}
                                    {linkedParty && linkedSales.length > 0 && (
                                        <div className="bg-[#F8FAFC] dark:bg-[#111827] px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 border-l-4 border-l-blue-500 shadow-inner">
                                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 tracking-wide uppercase">Linked Vehicle Details</h3>
                                            <div className="flex flex-col gap-4">
                                                {linkedSales.map(sale => {
                                                    const details = otherDetails.find(d => d.saleId === sale.id);
                                                    const vehicle = vehicles.find(v => v.chassisNumber === sale.chassisNumber);
                                                    const company = companies.find(c => c.id === vehicle?.companyId);
                                                    const model = models.find(m => m.id === vehicle?.modelId);
                                                    
                                                    return (
                                                        <div key={sale.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-3">
                                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
                                                                <span className="font-mono text-xs font-bold text-slate-500">{sale.chassisNumber}</span>
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-widest">File #{sale.fileNumber}</span>
                                                            </div>

                                                            <div className="flex flex-wrap md:flex-nowrap items-center gap-6 justify-between pt-1">
                                                                <div className="flex-1 min-w-[150px]">
                                                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Customer Details</p>
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{linkedParty.name}</p>
                                                                    <p className="text-xs font-medium text-slate-500">{linkedParty.contactNumber || 'No Contact'}</p>
                                                                </div>

                                                                <div className="flex-1 min-w-[150px]">
                                                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Vehicle Details</p>
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{company?.name || 'Unknown'} - {model?.name || 'Unknown'}</p>
                                                                    {vehicle?.color && <p className="text-xs font-medium text-slate-500">Color: {vehicle.color}</p>}
                                                                    {vehicle?.registrationNumber && <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">Reg: {vehicle.registrationNumber}</p>}
                                                                </div>

                                                                <div className="flex-1 min-w-[100px]">
                                                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Sales Date</p>
                                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{(sale.date as any)?.toDate?.()?.toLocaleDateString() || String(sale.date).split('T')[0]}</p>
                                                                </div>

                                                                {details && (
                                                                    <div className="flex-1 min-w-[100px]">
                                                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Price</p>
                                                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">₹{details.price.toLocaleString()}</p>
                                                                    </div>
                                                                )}

                                                                <div className="flex-none md:text-right min-w-[120px]">
                                                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 md:text-right">Document Status</p>
                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${sale.documentationCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                                        {sale.documentationCompleted ? 'Completed' : 'Pending'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

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

                {/* --- MAPPING TAB --- */}
                <TabsContent value="mapping" className="flex-1 mt-6 flex flex-col min-h-0 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 z-20">
                            <CardTitle className="whitespace-nowrap text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">Customer Mapping</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                        <span>Unlinked Accounts (Internal)</span>
                                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-black">{allAccountNames.filter(name => !mappings[name]).length}</span>
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/60 space-y-3">
                                        {allAccountNames.filter(name => !mappings[name]).map(name => (
                                            <div key={name} className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-md">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
                                                <select 
                                                    className="w-40 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const newMappings = { ...mappings, [name]: e.target.value };
                                                            setMappings(newMappings);
                                                            saveData(openings, transactions, newMappings);
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Link to Party...</option>
                                                    {parties.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                        {allAccountNames.filter(name => !mappings[name]).length === 0 && (
                                            <div className="text-center py-8">
                                                <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <p className="text-sm text-slate-500 font-medium">All accounts are linked!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                        <span>Pending Parties (Unlinked)</span>
                                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-black">{parties.filter(p => !Object.values(mappings).includes(p.id)).length}</span>
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/60 space-y-3">
                                        {parties.filter(p => !Object.values(mappings).includes(p.id)).map(party => (
                                            <div key={party.id} className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-md">
                                                <div>
                                                    <p className="font-bold text-slate-700 dark:text-slate-300">{party.name}</p>
                                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{party.contactNumber || 'No contact'}</p>
                                                </div>
                                                <select 
                                                    className="w-40 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const newMappings = { ...mappings, [e.target.value]: party.id };
                                                            setMappings(newMappings);
                                                            saveData(openings, transactions, newMappings);
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Link Account...</option>
                                                    {allAccountNames.map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                        {parties.filter(p => !Object.values(mappings).includes(p.id)).length === 0 && (
                                            <div className="text-center py-8">
                                                <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <p className="text-sm text-slate-500 font-medium">All parties are linked!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg flex items-center gap-2">
                                    <Link className="w-5 h-5 text-blue-500" /> Linked Mappings
                                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-black">{Object.keys(mappings).length}</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {Object.entries(mappings).map(([accountName, partyId]) => {
                                        const party = parties.find(p => p.id === partyId);
                                        if (!party) return null;
                                        return (
                                            <div key={accountName} className="flex flex-col bg-white dark:bg-slate-900 p-4 xl:p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Active Link
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            const newMappings = { ...mappings };
                                                            delete newMappings[accountName];
                                                            setMappings(newMappings);
                                                            saveData(openings, transactions, newMappings);
                                                        }} 
                                                        className="h-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                    >
                                                        Unlink
                                                    </Button>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Internal Account</p>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{accountName}</p>
                                                    </div>
                                                    <div className="flex justify-center -my-1 relative z-10 w-full">
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded-full text-slate-400 shadow-sm relative -mt-3 -mb-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                                            <ArrowUpDown className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                                        <p className="text-[10px] font-extrabold text-blue-400 dark:text-blue-500 uppercase tracking-wider mb-1">Party (Customer)</p>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{party.name}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
