import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Plus, Save, Download, RefreshCw, FileSpreadsheet, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, Link, History, Calendar as CalendarIcon, Clock, Phone, MessageCircle, Search, FileText, Eye, EyeOff, MapPin, Edit2, BadgeCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, where, doc, setDoc, updateDoc, writeBatch, deleteField, FieldPath, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Party, Sale, OtherDetails, Vehicle, Model, Company, FollowUp } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth, UserProfile } from '@/hooks/use-auth';
import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';

const SearchableSelect = ({ options, value, onChange, placeholder }: { options: { label: string, value: string, category: string }[], value: string, onChange: (val: string) => void, placeholder: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ "Parties": true, "Un-linked Parties": true, "Internal Accounts": true });
    const containerRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
         return options.filter(o => (o.label || '').toLowerCase().includes(search.toLowerCase()) || (o.value || '').toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    const groupedOptions = useMemo(() => {
        const groups: Record<string, typeof options> = {};
        for (const opt of filteredOptions) {
            if (!groups[opt.category]) groups[opt.category] = [];
            groups[opt.category].push(opt);
        }
        return groups;
    }, [filteredOptions]);

    useEffect(() => {
        if (search) {
            const allCategories = Object.keys(groupedOptions);
            const expandAll = allCategories.reduce((acc, cat) => ({...acc, [cat]: true}), {});
            setExpandedCategories(expandAll);
        }
    }, [search, groupedOptions]);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const selectedLabel = useMemo(() => options.find(o => o.value === value)?.label || value, [options, value]);

    return (
        <div className="relative flex-1 w-full" ref={containerRef}>
            <div 
                className="w-full h-11 px-4 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium flex items-center justify-between cursor-pointer shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="truncate flex-1 max-w-full text-slate-700 dark:text-slate-300 pr-2">
                    {selectedLabel || <span className="text-slate-500">{placeholder}</span>}
                </div>
                <ArrowUpDown className="h-4 w-4 ml-1 shrink-0 text-slate-500" />
            </div>
            {isOpen && (
                <div className="absolute top-full mt-1.5 left-0 right-0 max-h-[300px] overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 flex flex-col p-1.5">
                    <div className="sticky top-0 bg-white dark:bg-slate-950 z-10 pb-1.5 border-b border-slate-100 dark:border-slate-700 shadow-[0_4px_6px_-6px_rgba(0,0,0,0.1)]">
                        <Input 
                            autoFocus
                            placeholder="Type to search..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 text-sm rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                        {Object.entries(groupedOptions).map(([category, opts]: [string, any[]]) => (
                            <div key={category} className="mb-1">
                                <div 
                                    className="px-3 py-2 text-[11px] uppercase font-bold text-slate-600 dark:text-slate-400 tracking-wider sticky top-[46px] bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-sm z-[5] flex justify-between items-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
                                    onClick={(e) => { e.stopPropagation(); toggleCategory(category); }}
                                >
                                    <span>{category} ({opts.length})</span>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedCategories[category] ? '' : '-rotate-90'}`} />
                                </div>
                                {expandedCategories[category] && (
                                    <div className="mt-1 flex flex-col gap-0.5">
                                        {opts.map(opt => (
                                            <div 
                                                key={opt.value} 
                                                className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${value === opt.value ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/40 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'}`}
                                                onClick={() => {
                                                    onChange(opt.value);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && <div className="p-4 text-sm text-slate-500 text-center font-medium italic">No results found.</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

// Data Types
interface OpeningBalance {
    id: string;
    date: string;
    accountName: string;
    debit: number;
    credit: number;
}

interface AccountMetadata {
    id: string;
    accountName: string;
    mobileNumber: string;
    address: string;
    verifiedAt?: any;
    verifiedBy?: string;
    verifiedBalance?: number;
}

interface TransactionItem {
    name: string;
    quantity: number;
    rate: number;
    amount: number;
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
    items?: TransactionItem[];
    runningBalance?: string;
    runningBalanceType?: string;
}

export function InternalAccounts() {
    const { userProfile } = useAuth();
    const [openings, setOpenings] = useState<OpeningBalance[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accountMetadata, setAccountMetadata] = useState<AccountMetadata[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [hiddenParties, setHiddenParties] = useState<string[]>([]);
    
    // Edit Metadata Dialog State
    const [editMetaOpen, setEditMetaOpen] = useState(false);
    const [metaForm, setMetaForm] = useState({ accountName: '', mobileNumber: '', address: '', id: '' });

    const [parties, setParties] = useState<Party[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [otherDetails, setOtherDetails] = useState<OtherDetails[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [followups, setFollowups] = useState<FollowUp[]>([]);
    const [isFollowupOpen, setIsFollowupOpen] = useState(false);
    const [isQuickFollowupOpen, setIsQuickFollowupOpen] = useState(false);
    const [newFollowupMsg, setNewFollowupMsg] = useState('');
    const [newFollowupDate, setNewFollowupDate] = useState('');
    const [newFollowupTime, setNewFollowupTime] = useState('');
    const [newFollowupAssignedTo, setNewFollowupAssignedTo] = useState('unassigned');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isUnlinkConfirmOpen, setIsUnlinkConfirmOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // View Sheet state
    const [viewSheetOpen, setViewSheetOpen] = useState(false);
    const [viewSale, setViewSale] = useState<any>(null);
    const [viewVoucherOpen, setViewVoucherOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Transaction | null>(null);

    // Pagination states
    const ITEMS_PER_PAGE = 10;
    const [statementSort, setStatementSort] = useState<SortConfig>({ key: 'date', direction: 'asc' });
    const [openingsPage, setOpeningsPage] = useState(1);
    const [transactionsPage, setTransactionsPage] = useState(1);
    const [statementPage, setStatementPage] = useState(1);
    const [summaryPage, setSummaryPage] = useState(1);
    
    // Mapping specific states
    const [mappingPage, setMappingPage] = useState(1);
    const [mappingSearchQuery, setMappingSearchQuery] = useState('');
    const [showHiddenParties, setShowHiddenParties] = useState(false);
    const [linkedMappingSearchQuery, setLinkedMappingSearchQuery] = useState('');
    const [openingSearchQuery, setOpeningSearchQuery] = useState('');
    const [summarySearchQuery, setSummarySearchQuery] = useState('');
    const [summaryFilter, setSummaryFilter] = useState('all');
    const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(new Set());

    type SortConfig = { key: string, direction: 'asc' | 'desc' } | null;
    const [openingsSort, setOpeningsSort] = useState<SortConfig>(null);
    const [transactionsSort, setTransactionsSort] = useState<SortConfig>(null);
    const [summarySort, setSummarySort] = useState<SortConfig>(null);

    const handleSort = (key: string, currentSort: SortConfig, setSort: (s: SortConfig) => void) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (currentSort && currentSort.key === key && currentSort.direction === 'asc') direction = 'desc';
        setSort({ key, direction });
    };

    const handleVerifyBalance = async (e: React.MouseEvent, accountName: string, balance: number) => {
        e.stopPropagation();
        
        const existingMeta = accountMetadata.find(m => m.accountName === accountName);
        
        try {
            if (existingMeta?.id) {
                await updateDoc(doc(db, 'account_metadata', existingMeta.id), {
                    verifiedAt: new Date().toISOString(),
                    verifiedBy: userProfile?.displayName || userProfile?.email || 'User',
                    verifiedBalance: balance || 0
                });
            } else {
                await addDoc(collection(db, 'account_metadata'), {
                    accountName: accountName || '',
                    mobileNumber: '',
                    address: '',
                    verifiedAt: new Date().toISOString(),
                    verifiedBy: userProfile?.displayName || userProfile?.email || 'User',
                    verifiedBalance: balance || 0
                });
            }
            toast.success(`${accountName} balance verified!`);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to verify balance: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const location = useLocation();
    const passedState = location.state as { selectedPartyId?: string, activeTab?: string };

    // Tab state
    const [activeTab, setActiveTab] = useState('summary');
    
    // Statement state
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    useEffect(() => {
        if (passedState?.activeTab) {
            setActiveTab(passedState.activeTab);
        } else if (userProfile && userProfile.role !== 'admin') {
            setActiveTab('statement');
        }
    }, [passedState?.activeTab, userProfile]);

    useEffect(() => {
        if (passedState?.selectedPartyId && Object.keys(mappings).length > 0) {
            const accName = Object.keys(mappings).find(key => mappings[key] === passedState.selectedPartyId);
            if (accName) {
                setSelectedAccount(accName);
            }
        }
    }, [passedState?.selectedPartyId, mappings]);

    // Fetch data on load
    useEffect(() => {
        setLoading(true);
        const unsubs = [
            onSnapshot(collection(db, 'parties'), (snap) => setParties(snap.docs.map(d => ({ id: d.id, ...d.data() } as Party))), (e) => console.error("Parties error:", e)),
            onSnapshot(collection(db, 'sales'), (snap) => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale))), (e) => console.error("Sales error:", e)),
            onSnapshot(collection(db, 'otherDetails'), (snap) => setOtherDetails(snap.docs.map(d => ({ id: d.id, ...d.data() } as OtherDetails))), (e) => console.error("otherDetails error:", e)),
            onSnapshot(collection(db, 'vehicles'), (snap) => setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))), (e) => console.error("Vehicles error:", e)),
            onSnapshot(collection(db, 'models'), (snap) => setModels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Model))), (e) => console.error("Models error:", e)),
            onSnapshot(collection(db, 'companies'), (snap) => setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))), (e) => console.error("Companies error:", e)),
            onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id }))), (e) => console.error("Users error:", e)),
            onSnapshot(query(collection(db, 'followups'), orderBy('createdAt', 'desc')), (snap) => setFollowups(snap.docs.map(d => ({ id: d.id, ...d.data() } as FollowUp))), (e) => console.error("Followups error:", e)),
            onSnapshot(collection(db, 'internal_openings'), (snap) => setOpenings(snap.docs.map(d => ({ id: d.id, ...d.data() } as OpeningBalance))), (e) => console.error("internal_openings error:", e)),
            onSnapshot(collection(db, 'internal_transactions'), (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))), (e) => console.error("internal_transactions error:", e)),
            onSnapshot(collection(db, 'account_metadata'), (snap) => setAccountMetadata(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccountMetadata))), (e) => console.error("account_metadata error:", e)),
            onSnapshot(doc(db, 'internal_data', 'mappings'), (snap) => {
                 if (snap.exists()) {
                     setMappings(snap.data()?.mappings || {});
                     setHiddenParties(snap.data()?.hiddenParties || []);
                 }
                 setLoading(false);
            }, (e) => {
                 console.error("Mappings error:", e);
                 setLoading(false);
            })
        ];
        
        const timeout = setTimeout(() => {
            if (loading) setLoading(false);
        }, 3000);
        
        return () => {
            unsubs.forEach(u => u());
            clearTimeout(timeout);
        };
    }, []);

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
                
                const newOpenings = data.map(row => ({
                    date: row['Date'] || row['Date '] || '',
                    accountName: (row['Account Name'] || row['Particulars'] || '').toString().trim(),
                    debit: Number(row['Debit']) || 0,
                    credit: Number(row['Credit']) || 0
                })).filter(o => o.accountName);

                if (newOpenings.length === 0) {
                     toast.info("No openings found to import");
                     return;
                }

                setLoading(true);
                const batchLimit = 400;
                let promises = [];
                for (let i = 0; i < newOpenings.length; i += batchLimit) {
                    const batch = writeBatch(db);
                    const chunk = newOpenings.slice(i, i + batchLimit);
                    chunk.forEach(o => {
                        const ref = doc(collection(db, 'internal_openings'));
                        batch.set(ref, o);
                    });
                    promises.push(batch.commit());
                }
                
                await Promise.all(promises);
                toast.success(`Imported ${newOpenings.length} opening balances`);
            } catch (error) {
                console.error("Failed to parse or save", error);
                toast.error("Failed to parse Excel file or save data");
            } finally {
                setLoading(false);
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
                
                const newTxns: any[] = [];
                let currentTxn: any = null;

                data.forEach(row => {
                    const vchNo = row['Vch No.'] || row['Vch No'] || '';
                    const particulars = (row['Particulars'] || '').toString().trim();
                    const debit = Number(row['Debit']) || 0;
                    const credit = Number(row['Credit']) || 0;
                    const itemName = (row['Item Name'] || row['Item'] || '').toString().trim();

                    if (particulars) {
                        currentTxn = {
                            date: row['Date'] || '',
                            vchType: row['Vch Type'] || '',
                            vchNo,
                            particulars,
                            debit,
                            credit,
                            narration: row['Narration'] || '',
                            items: []
                        };
                        newTxns.push(currentTxn);
                    }

                    if (currentTxn && (itemName || Number(row['Amount']) || Number(row['Item Amount']))) {
                        currentTxn.items.push({
                            name: itemName,
                            quantity: Number(row['Qty'] || row['Quantity']) || 0,
                            rate: Number(row['Rate']) || 0,
                            amount: Number(row['Amount'] || row['Item Amount']) || 0
                        });
                    }
                });

                const validTxns = newTxns.filter(t => t.particulars);

                if (validTxns.length === 0) {
                    toast.info("No valid transactions found to import");
                    return;
                }

                const existingAccountNames = new Set(openings.map(o => (o.accountName || '').toLowerCase()));
                const newOpeningsToCreate: any[] = [];
                
                validTxns.forEach(txn => {
                    const accNameLower = (txn.particulars || '').toLowerCase();
                    if (!existingAccountNames.has(accNameLower)) {
                        existingAccountNames.add(accNameLower);
                        newOpeningsToCreate.push({
                            date: txn.date || new Date().toISOString().split('T')[0],
                            accountName: txn.particulars,
                            debit: 0,
                            credit: 0
                        });
                    }
                });

                setLoading(true);
                const batchLimit = 400;
                let promises = [];
                
                // Save New Txns
                for (let i = 0; i < validTxns.length; i += batchLimit) {
                    const batch = writeBatch(db);
                    const chunk = validTxns.slice(i, i + batchLimit);
                    chunk.forEach(t => {
                        const ref = doc(collection(db, 'internal_transactions'));
                        batch.set(ref, t);
                    });
                    promises.push(batch.commit());
                }

                // Save New Openings
                for (let i = 0; i < newOpeningsToCreate.length; i += batchLimit) {
                    const batch = writeBatch(db);
                    const chunk = newOpeningsToCreate.slice(i, i + batchLimit);
                    chunk.forEach(o => {
                        const ref = doc(collection(db, 'internal_openings'));
                        batch.set(ref, o);
                    });
                    promises.push(batch.commit());
                }
                
                await Promise.all(promises);
                toast.success(`Imported ${validTxns.length} transactions` + (newOpeningsToCreate.length ? ` and created ${newOpeningsToCreate.length} new accounts` : ''));
            } catch (error) {
                 console.error("Failed to parse or save transactions", error);
                 toast.error("Failed to parse Excel file or save data");
            } finally {
                 setLoading(false);
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
        const ws = XLSX.utils.json_to_sheet([
            {
                'Date': 'YYYY-MM-DD',
                'Vch Type': 'Sales',
                'Vch No.': '101',
                'Particulars': 'Example Account',
                'Debit': 500,
                'Credit': 0,
                'Narration': 'Example narration',
                'Item Name': 'Product A',
                'Qty': 2,
                'Rate': 250,
                'Amount': 500
            },
            {
                'Date': '',
                'Vch Type': '',
                'Vch No.': '',
                'Particulars': '',
                'Debit': '',
                'Credit': '',
                'Narration': '',
                'Item Name': 'Product B',
                'Qty': 1,
                'Rate': 100,
                'Amount': 100
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, "Transactions_Template.xlsx");
    };

    const allAccountNames = useMemo(() => {
        const names = new Set<string>();
        openings.forEach(o => o.accountName && names.add((o.accountName || '').trim()));
        transactions.forEach(t => t.particulars && names.add((t.particulars || '').trim()));
        return Array.from(names).sort();
    }, [openings, transactions]);

    const accountOptions = useMemo(() => {
        const options: { label: string, value: string, category: string }[] = [];
        const addedNames = new Set<string>();

        allAccountNames.forEach(name => {
            const isMapped = !!mappings[name];
            const isPartyMatch = parties.some(p => (p.name || '').toLowerCase() === (name || '').toLowerCase());
            options.push({
                label: name,
                value: name,
                category: (isMapped || isPartyMatch) ? "Parties" : "Internal Accounts"
            });
            addedNames.add((name || '').toLowerCase());
        });

        parties.forEach(p => {
            const isPartyMapped = Object.values(mappings).includes(p.id);
            if (!isPartyMapped && !addedNames.has((p.name || '').toLowerCase())) {
                options.push({
                    label: p.name,
                    value: p.name,
                    category: "Un-linked Parties",
                });
                addedNames.add((p.name || '').toLowerCase());
            }
        });

        return options;
    }, [allAccountNames, mappings, parties]);

    const statementOpening = useMemo(() => {
        if (!selectedAccount) return null;
        // Sum up all openings for this account just in case there are multiple
        const acts = openings.filter(o => (o.accountName || '').trim() === selectedAccount);
        if (acts.length === 0) return null;
        const totalDebit = acts.reduce((acc, a) => acc + (a.debit || 0), 0);
        const totalCredit = acts.reduce((acc, a) => acc + (a.credit || 0), 0);
        return { debit: totalDebit, credit: totalCredit, date: acts[0].date };
    }, [selectedAccount, openings]);

    const statementTransactions = useMemo(() => {
        if (!selectedAccount) return [];
        let filtered = transactions.filter(t => (t.particulars || '').trim() === selectedAccount);
        
        // 1. Sort chronologically to compute running balance
        filtered.sort((a, b) => {
            const timeA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
            const timeB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
            const numA = isNaN(timeA) ? 0 : timeA;
            const numB = isNaN(timeB) ? 0 : timeB;
            return numA - numB;
        });

        // 2. Compute running balance
        let runDb = statementOpening?.debit || 0;
        let runCr = statementOpening?.credit || 0;
        filtered = filtered.map(t => {
            runDb += (t.debit || 0);
            runCr += (t.credit || 0);
            const bal = runDb - runCr;
            return {
                ...t,
                runningBalance: Math.abs(bal).toFixed(2),
                runningBalanceType: bal >= 0 ? 'Dr' : 'Cr'
            };
        });

        // 3. User sort
        return filtered.sort((a, b) => {
            if (!statementSort) return 0;
            const dir = statementSort.direction === 'asc' ? 1 : -1;
            
            if (statementSort.key === 'date') {
                const timeA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
                const timeB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
                const numA = isNaN(timeA) ? 0 : timeA;
                const numB = isNaN(timeB) ? 0 : timeB;
                return (numA - numB) * dir;
            }
            
            const valA = a[statementSort.key as keyof typeof a];
            const valB = b[statementSort.key as keyof typeof b];
            
            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });
    }, [selectedAccount, transactions, statementSort, statementOpening]);

    useEffect(() => {
        setStatementPage(1);
    }, [selectedAccount]);

    const sortedOpenings = useMemo(() => {
        let sortable = [...openings];
        
        if (openingSearchQuery.trim()) {
            const query = openingSearchQuery.toLowerCase();
            sortable = sortable.filter(o => 
                (o.accountName && (o.accountName || '').toLowerCase().includes(query)) ||
                (o.date && String(o.date).toLowerCase().includes(query))
            );
        }

        if (openingsSort) {
            sortable.sort((a: any, b: any) => {
                if (a[openingsSort.key] < b[openingsSort.key]) return openingsSort.direction === 'asc' ? -1 : 1;
                if (a[openingsSort.key] > b[openingsSort.key]) return openingsSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [openings, openingsSort, openingSearchQuery]);

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

    const openingsTotals = useMemo(() => {
        return openings.reduce((acc, curr) => ({
            debit: acc.debit + (curr.debit || 0),
            credit: acc.credit + (curr.credit || 0)
        }), { debit: 0, credit: 0 });
    }, [openings]);

    const transactionsTotals = useMemo(() => {
        return transactions.reduce((acc, curr) => ({
            debit: acc.debit + (curr.debit || 0),
            credit: acc.credit + (curr.credit || 0)
        }), { debit: 0, credit: 0 });
    }, [transactions]);

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
        try {
            await updateDoc(doc(db, 'internal_data', 'mappings'), 
                new FieldPath('mappings', selectedAccount), partyId
            );
            toast.success("Successfully mapped customer");
        } catch (e: any) {
            if (e.code === 'not-found') {
                 try {
                     await setDoc(doc(db, 'internal_data', 'mappings'), { mappings: { [selectedAccount]: partyId } });
                     toast.success("Successfully mapped customer");
                 } catch (err) {
                     toast.error("Failed to map customer");
                 }
            } else {
                toast.error("Failed to map customer");
            }
        }
    };

    const handleUnmapCustomer = async () => {
        if (!selectedAccount) return;
        try {
            await updateDoc(doc(db, 'internal_data', 'mappings'), 
                new FieldPath('mappings', selectedAccount), deleteField()
            );
            setIsUnlinkConfirmOpen(false);
            toast.success("Successfully unmapped customer");
        } catch (e) {
            toast.error("Failed to unmap customer");
        }
    };

    const linkedParty = useMemo(() => {
        if (!selectedAccount) return null;
        if (mappings[selectedAccount]) {
            return parties.find(p => p.id === mappings[selectedAccount]) || null;
        }
        return parties.find(p => (p.name || '').toLowerCase() === (selectedAccount || '').toLowerCase()) || null;
    }, [selectedAccount, mappings, parties]);
    
    useEffect(() => {
        if (isFollowupOpen || isQuickFollowupOpen) {
            const now = new Date();
            setNewFollowupDate(now.toLocaleDateString('en-CA'));
            setNewFollowupTime(now.toTimeString().slice(0, 5));
            setNewFollowupMsg('');
            setNewFollowupAssignedTo('unassigned');
        }
    }, [isFollowupOpen, isQuickFollowupOpen]);

    const handleSaveFollowup = async () => {
        const targetPartyId = linkedParty?.id || selectedAccount;
        if (!targetPartyId) {
            toast.error('Please select an account first');
            return;
        }
        if (!newFollowupMsg.trim()) {
            toast.error('Please enter a message');
            return;
        }

        let nextDate = null;
        if (newFollowupDate) {
            const timeStr = newFollowupTime || '09:00';
            nextDate = new Date(`${newFollowupDate}T${timeStr}`);
        }

        let assignedToId = null;
        let assignedToName = null;
        if (newFollowupAssignedTo && newFollowupAssignedTo !== 'unassigned') {
            const assignedUser = users.find(u => u.uid === newFollowupAssignedTo);
            if (assignedUser) {
                assignedToId = assignedUser.uid;
                assignedToName = assignedUser.displayName || assignedUser.email;
            }
        }

        try {
            await addDoc(collection(db, 'followups'), {
                partyId: targetPartyId,
                message: newFollowupMsg,
                nextFollowUpDate: nextDate,
                createdAt: serverTimestamp(),
                createdByUid: userProfile?.uid || null,
                createdByName: userProfile?.displayName || userProfile?.email || 'Unknown User',
                assignedToId,
                assignedToName
            });

            toast.success('Follow-up added successfully');
            setNewFollowupMsg('');
            const now = new Date();
            setNewFollowupDate(now.toLocaleDateString('en-CA'));
            setNewFollowupTime(now.toTimeString().slice(0, 5));
            setNewFollowupAssignedTo('unassigned');
            setIsQuickFollowupOpen(false);
        } catch (error) {
            console.error('Error saving follow-up:', error);
            toast.error('Failed to add follow-up');
        }
    };

    const linkedPartyFollowups = useMemo(() => {
        if (!selectedAccount) return [];
        const pId = linkedParty?.id;
        return followups.filter(f => f.partyId === selectedAccount || (pId && f.partyId === pId));
    }, [linkedParty, selectedAccount, followups]);

    const linkedSales = useMemo(() => {
        if (!linkedParty) return [];
        return sales.filter(s => s.customerId === linkedParty.id);
    }, [linkedParty, sales]);

    const accountSummaries = useMemo(() => {
        const accMap = new Map<string, { opening: number, debit: number, credit: number, lastActivity: Date | null, isParty: boolean, isUnlinkedParty: boolean }>();

        allAccountNames.forEach(name => {
            const isPartyMatch = !!mappings[name] || parties.some(p => (p.name || '').toLowerCase() === (name || '').toLowerCase());
            accMap.set(name, { opening: 0, debit: 0, credit: 0, lastActivity: null, isParty: isPartyMatch, isUnlinkedParty: false });
        });

        // Add Unlinked Parties to the map with 0 balances
        parties.forEach(p => {
            const isPartyMapped = Object.values(mappings).includes(p.id);
            const hasExactName = Array.from(accMap.keys()).some(k => k.toLowerCase() === (p.name || '').toLowerCase());
            if (!isPartyMapped && !hasExactName) {
                if (p.name) {
                    accMap.set(p.name, { opening: 0, debit: 0, credit: 0, lastActivity: null, isParty: true, isUnlinkedParty: true });
                }
            }
        });

        openings.forEach(o => {
            if (o.accountName && accMap.has(o.accountName)) {
                const acc = accMap.get(o.accountName)!;
                acc.opening += (o.debit || 0) - (o.credit || 0);
            }
        });

        transactions.forEach(t => {
            if (t.particulars && accMap.has(t.particulars)) {
                const acc = accMap.get(t.particulars)!;
                acc.debit += (t.debit || 0);
                acc.credit += (t.credit || 0);
                
                let tDate: Date | null = null;
                if (t.date) {
                    if ((t.date as any).toDate) {
                        tDate = (t.date as any).toDate();
                    } else if (typeof t.date === 'string') {
                        tDate = new Date(t.date);
                    }
                }
                
                if (tDate) {
                    if (!acc.lastActivity || tDate > acc.lastActivity) {
                        acc.lastActivity = tDate;
                    }
                }
            }
        });

        let list = Array.from(accMap.entries()).map(([name, data]) => ({
            name,
            opening: data.opening,
            debit: data.debit,
            credit: data.credit,
            closing: data.opening + data.debit - data.credit,
            lastActivity: data.lastActivity,
            isParty: data.isParty,
            isUnlinkedParty: data.isUnlinkedParty
        }));
        
        if (summarySearchQuery.trim() !== '') {
            const q = summarySearchQuery.toLowerCase();
            list = list.filter(a => (a.name || '').toLowerCase().includes(q));
        }

        if (summaryFilter !== 'all') {
            if (summaryFilter === 'receivable') {
                list = list.filter(a => a.closing > 0);
            } else if (summaryFilter === 'payable') {
                list = list.filter(a => a.closing < 0);
            } else if (summaryFilter === 'above_1l_receivable') {
                list = list.filter(a => a.closing > 100000);
            } else if (summaryFilter === 'above_1l_payable') {
                list = list.filter(a => a.closing < -100000);
            } else if (summaryFilter === 'internal_accounts') {
                list = list.filter(a => !a.isParty);
            } else if (summaryFilter === 'parties') {
                list = list.filter(a => a.isParty && !a.isUnlinkedParty);
            } else if (summaryFilter === 'unlinked_parties') {
                list = list.filter(a => a.isUnlinkedParty);
            }
        }

        if (summarySort) {
            list.sort((a, b) => {
                let valA: any = a[summarySort.key as keyof typeof a];
                let valB: any = b[summarySort.key as keyof typeof b];

                if (summarySort.key === 'closing_abs') {
                    valA = Math.abs(a.closing);
                    valB = Math.abs(b.closing);
                } else if (summarySort.key === 'lastActivity') {
                    valA = valA ? valA.getTime() : 0;
                    valB = valB ? valB.getTime() : 0;
                }

                if (valA < valB) return summarySort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return summarySort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return list;
    }, [allAccountNames, openings, transactions, summarySearchQuery, mappings, parties, summaryFilter, summarySort]);

    const paginatedAccountSummaries = useMemo(() => {
        const start = (summaryPage - 1) * ITEMS_PER_PAGE;
        return accountSummaries.slice(start, start + ITEMS_PER_PAGE);
    }, [accountSummaries, summaryPage]);

    const summaryTotals = useMemo(() => {
        let totalReceivable = 0;
        let totalPayable = 0;
        accountSummaries.forEach(acc => {
            if (acc.closing > 0) totalReceivable += acc.closing;
            if (acc.closing < 0) totalPayable += Math.abs(acc.closing);
        });
        return { count: accountSummaries.length, receivable: totalReceivable, payable: totalPayable };
    }, [accountSummaries]);

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
            totalDb, totalCr, balance: Math.abs(balance), isDebitBal, txDb, txCr
        };
    }, [statementOpening, statementTransactions]);

    const handleEditMetadata = (e: React.MouseEvent, accountName: string) => {
        e.stopPropagation();
        const existing = accountMetadata.find(m => m.accountName === accountName);
        setMetaForm({ 
            accountName, 
            mobileNumber: existing?.mobileNumber || '', 
            address: existing?.address || '',
            id: existing?.id || ''
        });
        setEditMetaOpen(true);
    };

    const saveAccountMetadata = async () => {
        try {
            if (metaForm.id) {
                await updateDoc(doc(db, 'account_metadata', metaForm.id), {
                    mobileNumber: metaForm.mobileNumber || '',
                    address: metaForm.address || '',
                });
            } else {
                await addDoc(collection(db, 'account_metadata'), {
                    accountName: metaForm.accountName || '',
                    mobileNumber: metaForm.mobileNumber || '',
                    address: metaForm.address || '',
                });
            }
            toast.success("Account details updated");
            setEditMetaOpen(false);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to update details: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const downloadFollowUpReport = () => {
        if (!selectedAccount) {
            toast.error("Select an account first");
            return;
        }
        if (linkedPartyFollowups.length === 0) {
            toast.error("No follow-ups found for this account");
            return;
        }
        
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Follow-up Report: ${selectedAccount}`, 14, 22);
        
        const tableColumn = ["Date", "Message", "Next Follow Up", "Assigned To", "Created By", "Status"];
        const tableRows: any[] = [];
        
        linkedPartyFollowups.forEach(f => {
            tableRows.push([
                f.createdAt ? (f.createdAt as any).toDate().toLocaleDateString('en-GB') : '',
                f.message || '',
                f.nextFollowUpDate ? (f.nextFollowUpDate as any).toDate().toLocaleDateString('en-GB') : '',
                f.assignedToName || f.assignedToId || 'Unassigned',
                f.createdByName || f.createdByUid || 'System',
                f.isCompleted ? 'Completed' : 'Pending'
            ]);
        });
        
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });
        
        doc.save(`Follow_Up_Report_${selectedAccount.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    };

    const downloadStatementWithVehicles = () => {
        if (!selectedAccount) {
            toast.error("Select an account first");
            return;
        }
        
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Account Statement: ${selectedAccount}`, 14, 22);
        
        let startY = 30;

        // 1. Vehicle Details (Top)
        const hasVehicles = linkedParty && linkedSales.length > 0;
        
        if (hasVehicles) {
            const vehicleColumns = ["Sale Date", "File No", "Chassis No", "Company & Model", "Color & Reg No", "Doc Status", "Battery Info", "Price"];
            const vehicleRows: any[] = [];
            
            linkedSales.forEach(s => {
                const vehicle = vehicles.find(v => v.chassisNumber === s.chassisNumber);
                const model = vehicle ? models.find(m => m.id === vehicle.modelId) : null;
                const company = vehicle ? companies.find(c => c.id === vehicle.companyId) : null;
                const otherDetail = otherDetails.find(od => od.saleId === s.id);
                
                let batteryInfo = 'N/A';
                if (otherDetail?.batteryDetails) {
                     const bd = otherDetail.batteryDetails;
                     batteryInfo = `${bd.numberOfBattery}x ${bd.category}\nModel: ${bd.model}\nSN: ${bd.serialNumbers?.join(', ') || ''}`;
                }

                vehicleRows.push([
                    (s.date && (s.date as any).toDate) ? (s.date as any).toDate().toLocaleDateString('en-GB') : '',
                    s.fileNumber || '',
                    s.chassisNumber || '',
                    `${company?.name || '-'}\n${model?.name || '-'}`,
                    `Color: ${vehicle?.color || '-'}\nReg: ${vehicle?.registrationNumber || '-'}`,
                    `BB: ${vehicle?.bluebookStatus || '-'}\nN/S: ${vehicle?.naamsariStatus || '-'}\nVeh: ${vehicle?.status || '-'}`,
                    batteryInfo,
                    otherDetail?.price ? otherDetail.price.toFixed(2) : '0.00'
                ]);
            });

            doc.setFontSize(14);
            doc.text("Vehicle Details", 14, startY);
            startY += 8;

            autoTable(doc, {
                head: [vehicleColumns],
                body: vehicleRows,
                startY: startY,
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            });

            startY = (doc as any).lastAutoTable.finalY + 15;
        }

        // 2. Statement Transactions (Bottom)
        const statementColumns = ["Date", "Particulars", "Vch Type", "Debit", "Credit", "Balance"];
        const statementRows: any[] = [];
        
        if (statementOpening) {
            const db = statementOpening.debit || 0;
            const cr = statementOpening.credit || 0;
            const isDr = db >= cr;
            statementRows.push([
                (statementOpening.date && (statementOpening.date as any).toDate) ? (statementOpening.date as any).toDate().toLocaleDateString('en-GB') : statementOpening.date,
                "OPENING BALANCE",
                "Opening",
                statementOpening.debit ? statementOpening.debit.toFixed(2) : '0.00',
                statementOpening.credit ? statementOpening.credit.toFixed(2) : '0.00',
                `${Math.abs(db - cr).toFixed(2)} ${isDr ? 'Dr' : 'Cr'}`
            ]);
        }
        
        statementTransactions.forEach(t => {
            statementRows.push([
                (t.date && (t.date as any).toDate) ? (t.date as any).toDate().toLocaleDateString('en-GB') : t.date,
                t.particulars,
                t.voucherType || t.vchType, // Fallback if voucherType isn't fully defined
                t.debit ? t.debit.toFixed(2) : '0.00',
                t.credit ? t.credit.toFixed(2) : '0.00',
                `${t.runningBalance || ''} ${t.runningBalanceType || ''}`.trim()
            ]);
        });
        
        if (statementRows.length === 0) {
            statementRows.push(["", "No statement records found.", "", "", "", ""]);
        } else {
             statementRows.push(["", "CLOSING BALANCE", "", 
                 totals.isDebitBal ? '' : totals.balance.toFixed(2), 
                 totals.isDebitBal ? totals.balance.toFixed(2) : '',
                 `${totals.balance.toFixed(2)} ${totals.isDebitBal ? 'Dr' : 'Cr'}`
             ]);
             statementRows.push(["", "TOTAL", "", totals.totalDb.toFixed(2), totals.totalCr.toFixed(2), ""]);
        }

        doc.setFontSize(14);
        doc.text("Statement Transactions", 14, startY);
        startY += 8;

        autoTable(doc, {
            head: [statementColumns],
            body: statementRows,
            startY: startY,
        });

        doc.save(`Statement_${selectedAccount.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    };

    const getClosingBalanceAsOnDate = (date: any) => {
        if (!date) return '';
        const targetDateObj = date && typeof (date as any).toDate === 'function' ? (date as any).toDate() : (typeof date === 'string' || typeof date === 'number' ? new Date(date) : new Date());
        const timeVal = targetDateObj instanceof Date && !isNaN(targetDateObj.valueOf()) ? new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate()).getTime() : Number.MAX_SAFE_INTEGER;
        const targetTime = isNaN(timeVal) ? Number.MAX_SAFE_INTEGER : timeVal;
        
        let db = statementOpening?.debit || 0;
        let cr = statementOpening?.credit || 0;
        
        statementTransactions.forEach(t => {
            if (!t.date) return;
            const tDateObj = t.date && typeof (t.date as any).toDate === 'function' ? (t.date as any).toDate() : (typeof t.date === 'string' || typeof t.date === 'number' ? new Date(t.date) : new Date());
            const ttVal = tDateObj instanceof Date && !isNaN(tDateObj.valueOf()) ? new Date(tDateObj.getFullYear(), tDateObj.getMonth(), tDateObj.getDate()).getTime() : 0;
            const tTime = isNaN(ttVal) ? 0 : ttVal;
            
            if (tTime <= targetTime) {
                db += (t.debit || 0);
                cr += (t.credit || 0);
            }
        });
        
        const balance = db - cr;
        const balPrefix = balance >= 0 ? 'Dr' : 'Cr';
        return `${Math.abs(balance).toFixed(2)} ${balPrefix}`;
    };

    const downloadVoucherPDF = (e: React.MouseEvent, tx: Transaction) => {
        e.stopPropagation();
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text("Voucher", 14, 22);
        
        const formattedDate = tx.date && (tx.date as any).toDate ? (tx.date as any).toDate().toLocaleDateString('en-GB') : tx.date;
        const closingBalance = getClosingBalanceAsOnDate(tx.date);

        doc.setFontSize(10);
        doc.text(`Date: ${formattedDate}`, 14, 32);
        doc.text(`Voucher No: ${tx.vchNo || '-'}`, 14, 38);
        doc.text(`Voucher Type: ${tx.vchType || '-'}`, 14, 44);
        
        doc.text(`Account: ${tx.particulars || '-'}`, 14, 54);
        doc.text(`Debit: ${tx.debit ? tx.debit.toFixed(2) : '0.00'}`, 14, 60);
        doc.text(`Credit: ${tx.credit ? tx.credit.toFixed(2) : '0.00'}`, 14, 66);
        doc.text(`Closing Balance (As on ${formattedDate}): ${closingBalance}`, 14, 72);
        
        let startY = 82;
        if (tx.narration) {
            doc.text("Narration:", 14, startY);
            const splitNarration = doc.splitTextToSize(tx.narration, 180);
            doc.text(splitNarration, 14, startY + 6);
            startY += 6 + (splitNarration.length * 5) + 6;
        }
        
        if (tx.items && tx.items.length > 0) {
            const itemRows = tx.items.map(item => [
                item.name,
                item.quantity,
                item.rate ? item.rate.toFixed(2) : '',
                item.amount ? item.amount.toFixed(2) : ''
            ]);
            
            autoTable(doc, {
                startY: startY,
                head: [['Item Name', 'Quantity', 'Rate', 'Amount']],
                body: itemRows,
                theme: 'grid',
                headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] }
            });
        }
        
        doc.save(`Voucher_${tx.vchNo || 'Unknown'}.pdf`);
    };

    return (
        <div className="flex flex-col gap-6 h-full p-4 md:p-6 overflow-hidden bg-slate-50/50 dark:bg-[#0f172a] lg:pt-[10px] lg:pb-[10px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 drop-shadow-sm">Internal Accounts</h1>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="relative group max-w-full flex items-center w-full pr-0 mb-0">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute left-0 z-10 rounded-full h-8 w-8 shadow-sm bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100 flex lg:hidden cursor-pointer transition-all"
                        onClick={() => document.getElementById('tabs-scroll-container')?.scrollBy({ left: -200, behavior: 'smooth' })}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div 
                        id="tabs-scroll-container" 
                        className="overflow-x-auto overflow-y-hidden flex w-full px-8 md:px-8 lg:px-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <style>{`#tabs-scroll-container::-webkit-scrollbar { display: none; }`}</style>
                        <TabsList className="bg-[#e0dede] dark:bg-[#0f172a] backdrop-blur-xl px-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex flex-nowrap w-max gap-1 py-[5px] min-h-[42px] mb-0">
                            <TabsTrigger value="summary" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20 rounded-xl font-bold text-sm px-6 py-[5px] h-[30px] transition-all whitespace-nowrap">All Accounts</TabsTrigger>
                            {userProfile?.role === 'admin' && <TabsTrigger value="opening" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20 rounded-xl font-bold text-sm px-6 py-[5px] h-[30px] transition-all whitespace-nowrap">Account Opening</TabsTrigger>}
                            {userProfile?.role === 'admin' && <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20 rounded-xl font-bold text-sm px-6 py-[5px] h-[30px] transition-all whitespace-nowrap">Transactions</TabsTrigger>}
                            <TabsTrigger value="statement" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20 rounded-xl font-bold text-sm px-6 py-[5px] h-[30px] transition-all whitespace-nowrap">Account Statement</TabsTrigger>
                            {userProfile?.role === 'admin' && <TabsTrigger value="mapping" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20 rounded-xl font-bold text-sm px-6 py-[5px] h-[30px] transition-all whitespace-nowrap">Customer Mapping</TabsTrigger>}
                        </TabsList>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 z-10 rounded-full h-8 w-8 shadow-sm bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100 flex lg:hidden cursor-pointer transition-all"
                        onClick={() => document.getElementById('tabs-scroll-container')?.scrollBy({ left: 200, behavior: 'smooth' })}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* --- SUMMARY --- */}
                <TabsContent value="summary" className="flex-1 mt-6 flex flex-col min-h-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950 backdrop-blur-xl overflow-hidden pt-[5px] pb-0">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4 px-6 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-[#0f172a] z-20 pt-[5px] pb-2">
                            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">All Accounts</CardTitle>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Select value={summaryFilter} onValueChange={(v) => {
                                    setSummaryFilter(v);
                                    setSummaryPage(1);
                                }}>
                                    <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                        <SelectValue placeholder="All Accounts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Accounts</SelectItem>
                                        <SelectItem value="internal_accounts">Internal Accounts</SelectItem>
                                        <SelectItem value="parties">Parties</SelectItem>
                                        <SelectItem value="unlinked_parties">Un-linked Parties</SelectItem>
                                        <SelectItem value="receivable">Receivables (Dr)</SelectItem>
                                        <SelectItem value="payable">Payables (Cr)</SelectItem>
                                        <SelectItem value="above_1l_receivable">Due &gt; 1 Lakh</SelectItem>
                                        <SelectItem value="above_1l_payable">Payable &gt; 1 Lakh</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative w-full sm:w-80 border border-transparent">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search by account name..."
                                        value={summarySearchQuery}
                                        onChange={(e) => {
                                            setSummarySearchQuery(e.target.value);
                                            setSummaryPage(1);
                                        }}
                                        className="w-full pl-9 h-10 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden relative">
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[#F8FAFC] dark:bg-[#0f172a] text-slate-500 font-bold sticky top-0 shadow-sm z-10 border-b">
                                        <tr>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('name', summarySort, setSummarySort)}>
                                                <div className="flex items-center gap-2">
                                                    Account Name
                                                    <ArrowUpDown className={`w-3 h-3 ${summarySort?.key === 'name' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left">Contact Info</th>
                                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('opening', summarySort, setSummarySort)}>
                                                <div className="flex items-center justify-end gap-2">
                                                    Opening Balance
                                                    <ArrowUpDown className={`w-3 h-3 ${summarySort?.key === 'opening' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('debit', summarySort, setSummarySort)}>
                                                <div className="flex items-center justify-end gap-2">
                                                    Total Debit
                                                    <ArrowUpDown className={`w-3 h-3 ${summarySort?.key === 'debit' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('credit', summarySort, setSummarySort)}>
                                                <div className="flex items-center justify-end gap-2">
                                                    Total Credit
                                                    <ArrowUpDown className={`w-3 h-3 ${summarySort?.key === 'credit' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('closing_abs', summarySort, setSummarySort)}>
                                                <div className="flex items-center justify-end gap-2">
                                                    Closing Balance
                                                    <ArrowUpDown className={`w-3 h-3 ${summarySort?.key === 'closing_abs' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-center">Verification</th>
                                            <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('lastActivity', summarySort, setSummarySort)}>
                                                <div className="flex items-center justify-end gap-2">
                                                    Last Activity
                                                    <ArrowUpDown className={`w-3 h-3 ${summarySort?.key === 'lastActivity' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accountSummaries.length === 0 && (
                                            <tr><td colSpan={8} className="p-8 text-center text-slate-500">No accounts found.</td></tr>
                                        )}
                                        {paginatedAccountSummaries.map((acc, i) => (
                                            <tr 
                                                key={i} 
                                                onClick={() => {
                                                    setSelectedAccount(acc.name);
                                                    setActiveTab('statement');
                                                }}
                                                className="border-b last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
                                            >
                                                <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                                    {acc.name}
                                                    {acc.isParty && <span className="ml-2 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">Mapped</span>}
                                                </td>
                                                <td className="px-6 py-4 text-left" onClick={(e) => e.stopPropagation()}>
                                                    {(() => {
                                                        if (acc.isParty) {
                                                            const party = parties.find(p => (p.name || '').toLowerCase() === (acc.name || '').toLowerCase()) || parties.find(p => p.id === mappings[acc.name]);
                                                            return party ? (
                                                                <div className="text-xs text-slate-500 whitespace-nowrap">
                                                                    {party.contactNumber && <div><Phone className="w-3 h-3 inline mr-1"/>{party.contactNumber}</div>}
                                                                    {party.address && <div className="truncate max-w-[150px]" title={party.address}><MapPin className="w-3 h-3 inline mr-1"/>{party.address}</div>}
                                                                </div>
                                                            ) : <span className="opacity-50">-</span>;
                                                        } else {
                                                            const meta = accountMetadata.find(m => m.accountName === acc.name);
                                                            return (
                                                                <div className="flex items-center justify-between group/contact gap-2">
                                                                    <div className="text-xs text-slate-500 whitespace-nowrap">
                                                                        {meta?.mobileNumber && <div><Phone className="w-3 h-3 inline mr-1"/>{meta.mobileNumber}</div>}
                                                                        {meta?.address && <div className="truncate max-w-[150px]" title={meta.address}><MapPin className="w-3 h-3 inline mr-1"/>{meta.address}</div>}
                                                                        {!meta?.mobileNumber && !meta?.address && <span className="opacity-50 italic">No contact info</span>}
                                                                    </div>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-6 w-6 opacity-0 group-hover/contact:opacity-100 transition-opacity flex-shrink-0" 
                                                                        onClick={(e) => handleEditMetadata(e, acc.name)}
                                                                        title="Edit Contact Info"
                                                                    >
                                                                        <Edit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        }
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium">{Math.abs(acc.opening).toFixed(2)} {acc.opening >= 0 ? (acc.opening > 0 ? 'Dr' : '') : 'Cr'}</td>
                                                <td className="px-6 py-4 text-right font-medium">{acc.debit.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-medium">{acc.credit.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-bold space-x-1">
                                                    <span className={acc.closing > 0 ? 'text-red-600' : acc.closing < 0 ? 'text-emerald-600' : ''}>
                                                        {Math.abs(acc.closing).toFixed(2)}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">{acc.closing >= 0 ? (acc.closing > 0 ? 'Dr' : '') : 'Cr'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    {(() => {
                                                        const meta = accountMetadata.find(m => m.accountName === acc.name);
                                                        const isVerified = meta?.verifiedBalance !== undefined && Math.abs(meta.verifiedBalance - acc.closing) < 0.01 && meta?.verifiedAt;
                                                        
                                                        if (isVerified) {
                                                            const verTime = meta.verifiedAt && typeof meta.verifiedAt.toDate === 'function' ? meta.verifiedAt.toDate() : new Date(meta.verifiedAt);
                                                            return (
                                                                <div className="flex flex-col items-center group/verify cursor-help">
                                                                    <BadgeCheck className="w-5 h-5 text-emerald-500" />
                                                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 truncate max-w-[80px]" title={`Verified by ${meta.verifiedBy}`}>
                                                                        {meta.verifiedBy?.split(' ')[0]}
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-400">
                                                                        {!isNaN(verTime.valueOf()) ? verTime.toLocaleDateString() : ''}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/30"
                                                                onClick={(e) => handleVerifyBalance(e, acc.name, acc.closing)}
                                                            >
                                                                Verify
                                                            </Button>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                                    {acc.lastActivity ? acc.lastActivity.toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {accountSummaries.length > 0 && (
                                        <tfoot className="bg-slate-50 dark:bg-[#0f172a] sticky bottom-0 border-t border-slate-200 dark:border-slate-700 shadow-md z-10">
                                            <tr>
                                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">Total Accounts: {summaryTotals.count}</td>
                                                <td className="px-6 py-4"></td> {/* Contact Info */}
                                                <td className="px-6 py-4"></td> {/* Opening Balance */}
                                                <td className="px-6 py-4"></td> {/* Debit */}
                                                <td className="px-6 py-4 text-right"></td> {/* Credit */}
                                                <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                                                    <div>Dr: <span className="text-red-600">{summaryTotals.receivable.toFixed(2)}</span></div>
                                                    <div>Cr: <span className="text-emerald-600">{summaryTotals.payable.toFixed(2)}</span></div>
                                                </td>
                                                <td className="px-6 py-4"></td> {/* Verification */}
                                                <td className="px-6 py-4"></td> {/* Last Activity */}
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                            
                            {/* Summary Pagination */}
                            {accountSummaries.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between px-4 py-3 lg:py-[5px] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 shadow-sm text-sm text-slate-500">
                                    <div>Showing {((summaryPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(summaryPage * ITEMS_PER_PAGE, accountSummaries.length)} of {accountSummaries.length} entries</div>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setSummaryPage(p => Math.max(1, p - 1))} disabled={summaryPage === 1} className="h-8">
                                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setSummaryPage(p => Math.min(Math.ceil(accountSummaries.length / ITEMS_PER_PAGE), p + 1))} disabled={summaryPage === Math.ceil(accountSummaries.length / ITEMS_PER_PAGE)} className="h-8">
                                            Next <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ACCOUNT OPENING --- */}
                <TabsContent value="opening" className="flex-1 mt-6 flex flex-col min-h-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950 backdrop-blur-xl overflow-hidden lg:pt-0 lg:pb-0">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4 max-md:pl-[16px] max-md:pb-0 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-[#0f172a] z-20 lg:pt-[5px] lg:pb-0">
                            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">Opening Balances</CardTitle>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search by name or date..."
                                        value={openingSearchQuery}
                                        onChange={(e) => {
                                            setOpeningSearchQuery(e.target.value);
                                            setOpeningsPage(1);
                                        }}
                                        className="w-full pl-9 h-10 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <Button onClick={downloadOpeningTemplate} variant="outline" size="sm" className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex-1 sm:flex-none">
                                        <Download className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                                        Template
                                    </Button>
                                    <label className="cursor-pointer h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0.5 flex-1 sm:flex-none">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Import Excel
                                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportOpenings} />
                                    </label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden relative">
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[#F8FAFC] dark:bg-[#0f172a] text-slate-500 font-bold sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3 lg:py-[5px] border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('date', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center">Date <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 lg:py-[5px] border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('accountName', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center">Account Name <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 lg:py-[5px] border-b text-right flex-1 justify-end cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('debit', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center justify-end">Debit <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                            <th className="px-4 py-3 lg:py-[5px] border-b text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('credit', openingsSort, setOpeningsSort)}>
                                                <div className="flex items-center justify-end">Credit <ArrowUpDown className="ml-1 w-3 h-3" /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedOpenings.length === 0 && (
                                            <tr><td colSpan={4} className="p-4 text-center text-slate-500">No opening balances found.</td></tr>
                                        )}
                                        {paginatedOpenings.map((op, i) => {
                                            const linkedPartyId = mappings[op.accountName] || mappings[(op.accountName || '').trim()];
                                            const linkedParty = linkedPartyId ? parties.find(p => p.id === linkedPartyId) : null;
                                            return (
                                                <tr key={i} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                    <td className="px-4 py-2">{op.date}</td>
                                                    <td className="px-4 py-2 font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{op.accountName}</span>
                                                            {linkedParty && (
                                                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-0.5">
                                                                    <Link className="w-3 h-3" /> Linked: {linkedParty.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">{op.debit ? op.debit.toFixed(2) : '-'}</td>
                                                    <td className="px-4 py-2 text-right">{op.credit ? op.credit.toFixed(2) : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {openings.length > 0 && (
                                        <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-bold sticky bottom-0 z-10 shadow-sm top-shadow-md">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-right">Grand Total</td>
                                                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{openingsTotals.debit.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400">{openingsTotals.credit.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                            
                            {/* Openings Pagination */}
                            {sortedOpenings.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between px-4 py-3 lg:py-[5px] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 shadow-sm text-sm text-slate-500">
                                    <div>Showing {((openingsPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(openingsPage * ITEMS_PER_PAGE, sortedOpenings.length)} of {sortedOpenings.length} entries</div>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setOpeningsPage(p => Math.max(1, p - 1))} disabled={openingsPage === 1} className="h-8">
                                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setOpeningsPage(p => Math.min(Math.ceil(sortedOpenings.length / ITEMS_PER_PAGE), p + 1))} disabled={openingsPage === Math.ceil(sortedOpenings.length / ITEMS_PER_PAGE)} className="h-8">
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
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950 backdrop-blur-xl overflow-hidden lg:pt-[5px] lg:pb-0">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-[#0f172a] z-20 lg:pb-0">
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
                                    <thead className="bg-[#F8FAFC] dark:bg-[#0f172a] text-slate-500 font-bold sticky top-0 shadow-sm z-10">
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
                                    {transactions.length > 0 && (
                                        <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-bold sticky bottom-0 z-10 shadow-sm top-shadow-md">
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 text-right">Grand Total</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap text-blue-600 dark:text-blue-400">{transactionsTotals.debit.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap text-indigo-600 dark:text-indigo-400">{transactionsTotals.credit.toFixed(2)}</td>
                                                <td className="px-4 py-3"></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                            
                            {/* Transactions Pagination */}
                            {transactions.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 shadow-sm text-sm text-slate-500 lg:py-[5px]">
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
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-[#0f172a] z-20">
                            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="whitespace-nowrap text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">
                                        {linkedParty && selectedAccount ? `${linkedParty.name} X ${selectedAccount}` : selectedAccount ? `Statement: ${selectedAccount}` : 'Account Statement'}
                                    </CardTitle>
                                    {linkedParty && (
                                        <div className="text-xs text-slate-500 font-medium mt-1">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{linkedParty.name}</span>
                                            {linkedParty.contactNumber && ` • ${linkedParty.contactNumber}`}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                                    <div className="relative w-full md:w-80 flex shrink-0">
                                        <SearchableSelect 
                                            options={accountOptions} 
                                            value={selectedAccount} 
                                            onChange={setSelectedAccount} 
                                            placeholder="Select an account..." 
                                        />
                                    </div>
                                    {selectedAccount && (
                                        <div className="flex gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                                            <Button onClick={downloadFollowUpReport} variant="outline" size="sm" className="flex-1 md:flex-none h-11 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" title="Download Follow-up Report (PDF)">
                                                <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                                                Follow-ups
                                            </Button>
                                            <Button onClick={downloadStatementWithVehicles} variant="outline" size="sm" className="flex-1 md:flex-none h-11 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" title="Download Account Statement with Vehicle Details (PDF)">
                                                <FileText className="w-3.5 h-3.5 mr-1.5 text-red-600 dark:text-red-400" />
                                                Statement + Vehicles
                                            </Button>
                                        </div>
                                    )}
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
                                    {/* MAPPING & CONTACT SECTION */}
                                    <div className="bg-slate-50/50 dark:bg-[#0f172a] p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between shrink-0">
                                        <div className="flex items-center gap-6 w-full xl:w-auto">
                                            <div className="flex items-center gap-3">
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
                                            
                                            <div className="w-px h-10 border-l border-slate-200 dark:border-slate-800 hidden xl:block"></div>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                    <Phone className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Contact Details</p>
                                                        {!linkedParty && (
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-200 dark:hover:bg-slate-800" onClick={(e) => handleEditMetadata(e, selectedAccount)}>
                                                                <Edit2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {(() => {
                                                        if (linkedParty) {
                                                            return (
                                                                <div className="text-xs text-slate-500 flex gap-4 mt-0.5">
                                                                    {linkedParty.contactNumber ? <span>{linkedParty.contactNumber}</span> : <span className="opacity-50 italic">No mobile</span>}
                                                                    {linkedParty.address ? <span className="truncate max-w-[150px]" title={linkedParty.address}>{linkedParty.address}</span> : <span className="opacity-50 italic">No address</span>}
                                                                </div>
                                                            )
                                                        } else {
                                                            const meta = accountMetadata.find(m => m.accountName === selectedAccount);
                                                            return (
                                                                <div className="text-xs text-slate-500 flex gap-4 mt-0.5">
                                                                    {meta?.mobileNumber ? <span>{meta.mobileNumber}</span> : <span className="opacity-50 italic">No mobile</span>}
                                                                    {meta?.address ? <span className="truncate max-w-[150px]" title={meta.address}>{meta.address}</span> : <span className="opacity-50 italic">No address</span>}
                                                                </div>
                                                            )
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                            
                                            <div className="w-px h-10 border-l border-slate-200 dark:border-slate-800 hidden xl:block"></div>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                    <BadgeCheck className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Verification Status</p>
                                                    </div>
                                                    {(() => {
                                                        const meta = accountMetadata.find(m => m.accountName === selectedAccount);
                                                        const currentSignedBalance = totals.isDebitBal ? totals.balance : -totals.balance;
                                                        const isVerified = meta?.verifiedBalance !== undefined && Math.abs(meta.verifiedBalance - currentSignedBalance) < 0.01 && meta?.verifiedAt;
                                                        
                                                        if (isVerified) {
                                                            const verTime = meta.verifiedAt && typeof meta.verifiedAt.toDate === 'function' ? meta.verifiedAt.toDate() : new Date(meta.verifiedAt);
                                                            return (
                                                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 whitespace-nowrap">
                                                                    Verified by {meta.verifiedBy} on {!isNaN(verTime.valueOf()) ? verTime.toLocaleDateString() : ''}
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <div className="mt-1">
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="h-6 text-xs px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-900/30 font-semibold"
                                                                    onClick={(e) => handleVerifyBalance(e, selectedAccount, currentSignedBalance)}
                                                                >
                                                                    Verify Balance Now (₹{totals.balance.toFixed(2)})
                                                                </Button>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                                            {!linkedParty && userProfile?.role === 'admin' && (
                                                <select 
                                                    className="w-full sm:w-auto h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                            )}
                                            
                                            <div className="flex items-center gap-2">
                                                {linkedParty?.type === 'customer' && (() => {
                                                  const customerSales = sales.filter(s => s.customerId === linkedParty.id);
                                                  if (customerSales.length > 0) {
                                                    return (
                                                      <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-9 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-xs rounded-lg shadow-sm px-3 flex items-center"
                                                        onClick={() => {
                                                          const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                                                          setViewSale(latestSale);
                                                          setViewSheetOpen(true);
                                                        }}
                                                      >
                                                        VIEW
                                                      </Button>
                                                    );
                                                  }
                                                  return null;
                                                })()}
                                                <Dialog open={isQuickFollowupOpen} onOpenChange={setIsQuickFollowupOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="default" size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                                                <Clock className="w-4 h-4 mr-2" /> Quick Update
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-[425px]">
                                                            <DialogHeader>
                                                                <DialogTitle>Quick Follow-up Update</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4 pt-2">
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message / Notes</Label>
                                                                    <Textarea 
                                                                        value={newFollowupMsg} 
                                                                        onChange={(e) => setNewFollowupMsg(e.target.value)} 
                                                                        placeholder="Enter brief follow-up notes..."
                                                                        className="resize-none"
                                                                        rows={3}
                                                                        autoFocus
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
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To</Label>
                                                                    <select 
                                                                        value={newFollowupAssignedTo}
                                                                        onChange={(e) => setNewFollowupAssignedTo(e.target.value)}
                                                                        className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                                                                    >
                                                                        <option value="unassigned">Anyone (Global)</option>
                                                                        {users.map(u => (
                                                                            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <DialogFooter className="mt-4">
                                                                <Button variant="ghost" onClick={() => setIsQuickFollowupOpen(false)}>Cancel</Button>
                                                                <Button onClick={handleSaveFollowup}>Save Update</Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Dialog open={isFollowupOpen} onOpenChange={setIsFollowupOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-9 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20">
                                                                <History className="w-4 h-4 mr-2" /> Follow-up History
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                                                            <DialogHeader className="shrink-0 space-y-3">
                                                                <DialogTitle>Follow-up History - {linkedParty?.name || selectedAccount}</DialogTitle>
                                                                {linkedParty?.contactNumber && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <Button variant="outline" size="sm" asChild className="flex-1 h-9 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                                                                            <a href={`tel:${linkedParty.contactNumber}`}>
                                                                                <Phone className="w-4 h-4 mr-2" /> Call {linkedParty.contactNumber}
                                                                            </a>
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" asChild className="flex-1 h-9 bg-green-50 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                                                            <a href={`https://wa.me/${linkedParty.contactNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                                                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                                                                            </a>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </DialogHeader>
                                                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                                                {/* Add Follow-up Form */}
                                                                <div className="bg-slate-50 dark:bg-[#0f172a] rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
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
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Next Date</Label>
                                                                            <Input type="date" value={newFollowupDate} onChange={(e) => setNewFollowupDate(e.target.value)} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</Label>
                                                                            <Input type="time" value={newFollowupTime} onChange={(e) => setNewFollowupTime(e.target.value)} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To</Label>
                                                                        <select 
                                                                            value={newFollowupAssignedTo}
                                                                            onChange={(e) => setNewFollowupAssignedTo(e.target.value)}
                                                                            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                                                                        >
                                                                            <option value="unassigned">Anyone (Global)</option>
                                                                            {users.map(u => (
                                                                                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                                                            ))}
                                                                        </select>
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
                                                                            <div key={f.id} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm">
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{f.message}</p>
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="font-semibold">Added:</span> {(f.createdAt as any)?.toDate?.().toLocaleString() || 'Just now'}
                                                                                        </div>
                                                                                        {f.createdByName && (
                                                                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                                                                <span className="font-semibold text-slate-500">By:</span> {f.createdByName}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {f.nextFollowUpDate && (
                                                                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 font-medium ml-auto">
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

                                                    {linkedParty && userProfile?.role === 'admin' && (
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
                                                    )}
                                                </div>
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
                                                        <div key={sale.id} className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 flex flex-col gap-3">
                                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
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
                                                                </div>

                                                                <div className="flex-1 min-w-[150px]">
                                                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Documentation & Status</p>
                                                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Reg: {vehicle?.registrationNumber || 'Pending'}</p>
                                                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Bluebook: <span className="capitalize">{vehicle?.bluebookStatus?.replace(/_/g, ' ') || 'Unknown'}</span></p>
                                                                    <p className="text-xs font-medium text-slate-500">Namsaari: <span className="capitalize">{vehicle?.naamsariStatus?.replace(/_/g, ' ') || 'Unknown'}</span></p>
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
                                            <thead className="bg-[#F8FAFC] dark:bg-[#0f172a] text-slate-500 font-bold sticky top-0 shadow-sm z-10">
                                                <tr>
                                                    <th 
                                                        className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        onClick={() => handleSort('date', statementSort, setStatementSort)}
                                                    >
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            Date
                                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 border-b">Details</th>
                                                    <th 
                                                        className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        onClick={() => handleSort('vchType', statementSort, setStatementSort)}
                                                    >
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            Vch Type
                                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        onClick={() => handleSort('vchNo', statementSort, setStatementSort)}
                                                    >
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            Vch No.
                                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 border-b text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        onClick={() => handleSort('debit', statementSort, setStatementSort)}
                                                    >
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            Debit
                                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 border-b text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        onClick={() => handleSort('credit', statementSort, setStatementSort)}
                                                    >
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            Credit
                                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 border-b text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            Balance
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 border-b text-center w-[80px]">Action</th>
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
                                                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                        {(() => {
                                                            const db = statementOpening?.debit || 0;
                                                            const cr = statementOpening?.credit || 0;
                                                            const isDr = db >= cr;
                                                            return `${Math.abs(db - cr).toFixed(2)} ${isDr ? 'Dr' : 'Cr'}`;
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3"></td>
                                                </tr>

                                                {/* Transaction Rows */}
                                                {paginatedStatementTxns.map((tx, i) => {
                                                    const hasItems = tx.items && tx.items.length > 0;
                                                    const isExpanded = expandedTxnIds.has(tx.id);
                                                    return (
                                                    <React.Fragment key={tx.id}>
                                                    <tr 
                                                        className={`border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors ${hasItems ? 'cursor-pointer' : ''}`}
                                                        onClick={() => {
                                                            if (!hasItems) return;
                                                            const newSet = new Set(expandedTxnIds);
                                                            if (newSet.has(tx.id)) newSet.delete(tx.id);
                                                            else newSet.add(tx.id);
                                                            setExpandedTxnIds(newSet);
                                                        }}
                                                    >
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                            <div className="flex items-center gap-2">
                                                                {hasItems && (
                                                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                )}
                                                                {tx.date}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-700 dark:text-slate-200">{tx.particulars}</div>
                                                            {tx.narration && <div className="text-xs text-slate-400 mt-0.5 max-w-sm truncate" title={tx.narration}>{tx.narration}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-semibold">{tx.vchType}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{tx.vchNo}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{tx.debit ? tx.debit.toFixed(2) : ''}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{tx.credit ? tx.credit.toFixed(2) : ''}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                                                            {tx.runningBalance || ''} 
                                                            {tx.runningBalanceType && <span className="text-xs font-medium ml-1 text-slate-500">{tx.runningBalanceType}</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                                                    title="View Voucher"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedVoucher(tx);
                                                                        setViewVoucherOpen(true);
                                                                    }}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                                                    title="Download Voucher PDF"
                                                                    onClick={(e) => downloadVoucherPDF(e, tx)}
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && hasItems && (
                                                        <tr className="bg-slate-50/50 dark:bg-[#0f172a] border-b">
                                                            <td colSpan={7} className="p-0">
                                                                <div className="px-8 py-3 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
                                                                    <table className="w-full text-xs text-left">
                                                                        <thead>
                                                                            <tr className="text-slate-500 font-bold uppercase tracking-wider">
                                                                                <th className="pb-2">Item Name</th>
                                                                                <th className="pb-2 text-right">Quantity</th>
                                                                                <th className="pb-2 text-right">Rate</th>
                                                                                <th className="pb-2 text-right">Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {tx.items!.map((item, idx) => (
                                                                                <tr key={idx} className="border-t border-slate-200/60 dark:border-slate-700/60">
                                                                                    <td className="py-2 text-slate-700 dark:text-slate-300">{item.name}</td>
                                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.rate ? item.rate.toFixed(2) : ''}</td>
                                                                                    <td className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300">{item.amount ? item.amount.toFixed(2) : ''}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    </React.Fragment>
                                                )})}
                                                
                                                {statementTransactions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No transactions recorded.</td>
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
                                    <div className="bg-slate-100 dark:bg-[#0f172a]/80 p-6 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)] z-20">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                                                <p className="text-lg font-medium text-red-600 dark:text-red-400">₹{totals.txDb.toFixed(2)} <span className="text-xs opacity-70">Dr</span></p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Total Credit</p>
                                                <p className="text-lg font-medium text-green-600 dark:text-green-400">₹{totals.txCr.toFixed(2)} <span className="text-xs opacity-70">Cr</span></p>
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
                    <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-slate-200/60 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-950 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-[#0f172a] z-20">
                            <CardTitle className="whitespace-nowrap text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">Customer Mapping</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
                            {(() => {
                                const unlinkedParties = parties.filter(p => !Object.values(mappings).includes(p.id) && (showHiddenParties ? true : !hiddenParties.includes(p.id)));
                                const filteredParties = unlinkedParties.filter(p => 
                                    (p.name || '').toLowerCase().includes((mappingSearchQuery || '').toLowerCase()) || 
                                    (p.contactNumber && p.contactNumber.includes(mappingSearchQuery))
                                );
                                
                                const totalMappingPages = Math.max(1, Math.ceil(filteredParties.length / ITEMS_PER_PAGE));
                                const startMappingIdx = (mappingPage - 1) * ITEMS_PER_PAGE;
                                const paginatedParties = filteredParties.slice(startMappingIdx, startMappingIdx + ITEMS_PER_PAGE);

                                return (
                                    <div className="space-y-4 max-w-4xl mx-auto w-full">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                                <span>Pending Parties (Unlinked)</span>
                                                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-black">{unlinkedParties.length}</span>
                                            </h3>
                                            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => setShowHiddenParties(!showHiddenParties)}
                                                    className="h-10 rounded-xl whitespace-nowrap"
                                                >
                                                    {showHiddenParties ? "Hide Ignored" : "Show Ignored"}
                                                </Button>
                                                <div className="relative w-full sm:w-64">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        placeholder="Search pending parties..."
                                                        value={mappingSearchQuery}
                                                        onChange={(e) => {
                                                            setMappingSearchQuery(e.target.value);
                                                            setMappingPage(1);
                                                        }}
                                                        className="pl-9 h-10 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-[#0f172a] rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                                            {paginatedParties.map(party => (
                                                <div key={party.id} className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm transition-all hover:shadow-md gap-4 flex-wrap sm:flex-nowrap">
                                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                                        <div>
                                                            <p className="font-bold text-slate-700 dark:text-slate-300 truncate">
                                                                {party.name}
                                                                {hiddenParties.includes(party.id) && (
                                                                    <span className="ml-2 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">Ignored</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{party.contactNumber || 'No contact'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                                        <div className="w-full sm:w-64">
                                                            <SearchableSelect 
                                                                options={accountOptions.filter(opt => !mappings[opt.value])}
                                                                value=""
                                                                onChange={async (val) => {
                                                                    if (val) {
                                                                        try {
                                                                            await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                                new FieldPath('mappings', val), party.id
                                                                            );
                                                                        } catch (err: any) {
                                                                            if (err.code === 'not-found') {
                                                                                await setDoc(doc(db, 'internal_data', 'mappings'), { mappings: { [val]: party.id } });
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="Link to account..."
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-10 w-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
                                                            title={hiddenParties.includes(party.id) ? "Unhide" : "Hide"}
                                                            onClick={async () => {
                                                                const ref = doc(db, 'internal_data', 'mappings');
                                                                try {
                                                                    if (hiddenParties.includes(party.id)) {
                                                                        await updateDoc(ref, { hiddenParties: arrayRemove(party.id) });
                                                                    } else {
                                                                        await updateDoc(ref, { hiddenParties: arrayUnion(party.id) });
                                                                    }
                                                                } catch (err: any) {
                                                                    if (err.code === 'not-found') {
                                                                        await setDoc(ref, { mappings: {}, hiddenParties: [party.id] });
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {hiddenParties.includes(party.id) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-50" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {paginatedParties.length === 0 && (
                                                <div className="text-center py-12">
                                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                                    </div>
                                                    <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
                                                        {mappingSearchQuery ? "No pending parties match your search." : "All parties are linked!"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {totalMappingPages > 1 && (
                                            <div className="flex items-center justify-between pt-4">
                                                <p className="text-sm text-slate-500 font-medium hidden sm:block">
                                                    Showing <span className="font-bold text-slate-700 dark:text-slate-300">{startMappingIdx + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(startMappingIdx + ITEMS_PER_PAGE, filteredParties.length)}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{filteredParties.length}</span>
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setMappingPage(p => Math.max(1, p - 1))}
                                                        disabled={mappingPage === 1}
                                                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                                    </Button>
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 px-2">Page {mappingPage} of {totalMappingPages}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setMappingPage(p => Math.min(totalMappingPages, p + 1))}
                                                        disabled={mappingPage === totalMappingPages}
                                                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800"
                                                    >
                                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg flex items-center gap-2">
                                        <Link className="w-5 h-5 text-blue-500" /> Linked Mappings
                                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-black">{Object.keys(mappings).length}</span>
                                    </h3>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Search linked mappings..."
                                            value={linkedMappingSearchQuery}
                                            onChange={(e) => setLinkedMappingSearchQuery(e.target.value)}
                                            className="pl-9 h-10 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {Object.entries(mappings).filter(([accountName, partyId]) => {
                                        if (!linkedMappingSearchQuery) return true;
                                        const query = linkedMappingSearchQuery.toLowerCase();
                                        const party = parties.find(p => p.id === partyId);
                                        return (accountName || '').toLowerCase().includes(query) || (party && (party.name || '').toLowerCase().includes(query));
                                    }).map(([accountName, partyId]) => {
                                        const party = parties.find(p => p.id === partyId);
                                        if (!party) return null;
                                        return (
                                            <div key={accountName} className="flex flex-col bg-white dark:bg-[#0f172a] p-4 xl:p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Active Link
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={async () => {
                                                            try {
                                                                await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                    new FieldPath('mappings', accountName), deleteField()
                                                                );
                                                            } catch (err) {}
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
                                                        <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-slate-800 p-1.5 rounded-full text-slate-400 shadow-sm relative -mt-3 -mb-3 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-sm">
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
            
            <ProcessDocumentSheet 
                open={viewSheetOpen} 
                onOpenChange={setViewSheetOpen} 
                viewSale={viewSale} 
            />

            <Dialog open={viewVoucherOpen} onOpenChange={setViewVoucherOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Voucher Details</DialogTitle>
                    </DialogHeader>
                    {selectedVoucher && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Date</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedVoucher.date && typeof (selectedVoucher.date as any).toDate === 'function' ? (selectedVoucher.date as any).toDate().toLocaleDateString('en-GB') : selectedVoucher.date}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Voucher No</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedVoucher.vchNo || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Voucher Type</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedVoucher.vchType || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Account</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedVoucher.particulars || '-'}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Debit</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-200">{selectedVoucher.debit ? selectedVoucher.debit.toFixed(2) : '0.00'}</p>
                                </div>
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Credit</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-200">{selectedVoucher.credit ? selectedVoucher.credit.toFixed(2) : '0.00'}</p>
                                </div>
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">
                                        Closing Balance
                                        <span className="text-[10px] ml-1 font-semibold opacity-70 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded shadow-sm bg-white/50 dark:bg-slate-900/50">
                                            As on {selectedVoucher.date && typeof (selectedVoucher.date as any).toDate === 'function' ? (selectedVoucher.date as any).toDate().toLocaleDateString('en-GB') : selectedVoucher.date}
                                        </span>
                                    </p>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-200">
                                        {getClosingBalanceAsOnDate(selectedVoucher.date)}
                                    </p>
                                </div>
                            </div>

                            {selectedVoucher.narration && (
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Narration</p>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                        {selectedVoucher.narration}
                                    </div>
                                </div>
                            )}

                            {selectedVoucher.items && selectedVoucher.items.length > 0 && (
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Items</p>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">Item Name</th>
                                                    <th className="px-4 py-3 text-right">Quantity</th>
                                                    <th className="px-4 py-3 text-right">Rate</th>
                                                    <th className="px-4 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {selectedVoucher.items.map((item, idx) => (
                                                    <tr key={idx} className="bg-white dark:bg-slate-950">
                                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.name}</td>
                                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{item.rate ? item.rate.toFixed(2) : '-'}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{item.amount ? item.amount.toFixed(2) : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewVoucherOpen(false)}>Close</Button>
                        <Button 
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" 
                            onClick={(e) => { selectedVoucher && downloadVoucherPDF(e, selectedVoucher); setViewVoucherOpen(false); }}
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Contact Metadata Dialog */}
            <Dialog open={editMetaOpen} onOpenChange={setEditMetaOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Contact Info for {metaForm.accountName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mobile Number</label>
                            <Input 
                                value={metaForm.mobileNumber}
                                onChange={(e) => setMetaForm(p => ({ ...p, mobileNumber: e.target.value }))}
                                placeholder="Enter mobile number"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Address</label>
                            <Input 
                                value={metaForm.address}
                                onChange={(e) => setMetaForm(p => ({ ...p, address: e.target.value }))}
                                placeholder="Enter full address"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditMetaOpen(false)}>Cancel</Button>
                        <Button onClick={saveAccountMetadata} className="bg-blue-600 text-white hover:bg-blue-700">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
