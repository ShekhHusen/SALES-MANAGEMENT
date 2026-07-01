import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, query, orderBy } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { FollowUp, Party } from '@/types';
import { Clock, Phone, MessageCircle, Calendar as CalendarIcon, User as UserIcon, BellRing, Filter, History as HistoryIcon, CheckCircle2, CheckCircle, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserProfile } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useGlobalData } from '@/contexts/GlobalDataContext';

interface OpeningBalance {
    id: string;
    accountName: string;
}
interface Transaction {
    id: string;
    particulars: string;
}

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

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    const groupedOptions = Object.entries(filteredOptions.reduce((acc, opt) => {
        if (!acc[opt.category]) acc[opt.category] = [];
        acc[opt.category].push(opt);
        return acc;
    }, {} as Record<string, typeof options>)).sort(([a], [b]) => a === "Parties" ? -1 : b === "Parties" ? 1 : 0);

    const toggleCategory = (e: React.MouseEvent, category: string) => {
        e.stopPropagation();
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="min-h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors" onClick={() => setIsOpen(!isOpen)}>
                <span className="truncate max-w-[calc(100%-20px)] font-medium text-slate-700 dark:text-slate-300">{options.find(o => o.value === value)?.label || placeholder}</span>
                {value ? (
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); onChange(''); }} />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </div>
            {isOpen && (
                <div className="absolute top-11 left-0 z-50 w-full min-w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden mt-1 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                autoFocus
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto w-full">
                        {groupedOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-900 font-medium">No results found.</div>
                        ) : (
                            groupedOptions.map(([category, items]) => (
                                <div key={category}>
                                    <div 
                                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase shrink-0 sticky top-0 z-10 flex cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 select-none items-center justify-between tracking-wider shadow-sm"
                                        onClick={(e) => toggleCategory(e, category)}
                                    >
                                        <span>{category} <span className="ml-1 opacity-60 text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{items.length}</span></span>
                                        {expandedCategories[category] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                    </div>
                                    {expandedCategories[category] && items.map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`px-3 py-2.5 text-sm font-medium cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors ${value === opt.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-500' : 'text-slate-700 dark:text-slate-300 border-l-2 border-transparent'}`}
                                            onClick={() => {
                                                onChange(opt.value);
                                                setIsOpen(false);
                                                setSearch('');
                                            }}
                                        >
                                            <span className="truncate block whitespace-normal break-words leading-tight">{opt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export function FollowUps() {
    const { userProfile } = useAuth();
    const { followups, parties } = useGlobalData();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [openings, setOpenings] = useState<OpeningBalance[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const navigate = useNavigate();

    const [updatingPartyId, setUpdatingPartyId] = useState<string | null>(null);
    const [newFollowupMsg, setNewFollowupMsg] = useState('');
    const [newFollowupDate, setNewFollowupDate] = useState('');
    const [newFollowupTime, setNewFollowupTime] = useState('');
    const [newFollowupAssignedTo, setNewFollowupAssignedTo] = useState('unassigned');
    const [newFollowupPriority, setNewFollowupPriority] = useState<'high' | 'medium' | 'low'>('medium');
    const [historyOpenFor, setHistoryOpenFor] = useState<string | null>(null);
    const [fullHistoryOpen, setFullHistoryOpen] = useState(false);
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    const [historyAssignBy, setHistoryAssignBy] = useState('all');
    const [historyAssignee, setHistoryAssignee] = useState('all');
    const [historyAccount, setHistoryAccount] = useState('');
    const [historyStatus, setHistoryStatus] = useState('all');
    const [quickNotes, setQuickNotes] = useState<Record<string, string>>({});
    const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);
    const [taskCompleted, setTaskCompleted] = useState(false);
    
    // UI states
    const [pendingExpanded, setPendingExpanded] = useState(true);
    const [workedExpanded, setWorkedExpanded] = useState(true);
    
    // Filters
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [showOnlyDue, setShowOnlyDue] = useState<boolean>(true);

    useEffect(() => {
        const unsubs = [
            onSnapshot(collection(db, 'users'), snap => {
                setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })));
            }),
            onSnapshot(collection(db, 'internal_openings'), (snap) => setOpenings(snap.docs.map(d => ({ id: d.id, ...d.data() } as OpeningBalance)))),
            onSnapshot(collection(db, 'internal_transactions'), (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))),
            onSnapshot(doc(db, 'internal_data', 'mappings'), (snap) => {
                 if (snap.exists()) {
                     setMappings(snap.data()?.mappings || {});
                 }
            })
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    const allAccountNames = useMemo(() => {
        const names = new Set<string>();
        openings.forEach(o => o.accountName && names.add(o.accountName.trim()));
        transactions.forEach(t => t.particulars && names.add(t.particulars.trim()));
        return Array.from(names).sort();
    }, [openings, transactions]);

    const accountOptions = useMemo(() => {
        const options: { label: string, value: string, category: string }[] = [];
        const addedNames = new Set<string>();

        allAccountNames.forEach(name => {
            const isMapped = !!mappings[name];
            const isPartyMatch = parties.some(p => p.name.toLowerCase() === name.toLowerCase());
            options.push({
                label: name,
                value: name,
                category: (isMapped || isPartyMatch) ? "Parties" : "Internal Accounts"
            });
            addedNames.add(name.toLowerCase());
        });

        parties.forEach(p => {
            const isPartyMapped = Object.values(mappings).includes(p.id);
            if (!isPartyMapped && !addedNames.has(p.name.toLowerCase())) {
                options.push({
                    label: p.name,
                    value: p.id,
                    category: "Un-linked Parties"
                });
            }
        });

        return options.sort((a, b) => a.label.localeCompare(b.label));
    }, [allAccountNames, mappings, parties]);

    const handleSaveQuickNote = async (followupId: string, currentMessage: string) => {
        const note = quickNotes[followupId];
        if (!note?.trim()) return;
        
        setSavingNoteFor(followupId);
        try {
            const timestamp = new Date().toLocaleString();
            const userName = userProfile?.displayName || userProfile?.email || 'Unknown';
            const updatedMessage = `${currentMessage}\n\n[Note ${timestamp} by ${userName}]:\n${note.trim()}`;
            
            await updateDoc(doc(db, 'followups', followupId), {
                message: updatedMessage
            });
            
            setQuickNotes(prev => ({ ...prev, [followupId]: '' }));
            toast.success("Note added successfully");
        } catch (error) {
            toast.error("Failed to add note");
        } finally {
            setSavingNoteFor(null);
        }
    };

    const startUpdate = (partyId: string, currentAssignedTo?: string) => {
        const now = new Date();
        setNewFollowupDate(now.toLocaleDateString('en-CA'));
        setNewFollowupTime(now.toTimeString().slice(0, 5));
        setNewFollowupMsg('');
        setNewFollowupAssignedTo(currentAssignedTo || 'unassigned');
        setNewFollowupPriority('medium');
        setTaskCompleted(false);
        setUpdatingPartyId(partyId);
    };

    const handleSaveFollowup = async (partyId: string) => {
        if (!newFollowupMsg.trim()) {
            toast.error('Please enter a message');
            return;
        }

        let nextDate = null;
        if (!taskCompleted && newFollowupDate) {
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
                partyId: partyId,
                message: newFollowupMsg,
                nextFollowUpDate: nextDate,
                createdAt: serverTimestamp(),
                createdByUid: userProfile?.uid || null,
                createdByName: userProfile?.displayName || userProfile?.email || 'Unknown User',
                assignedToId,
                assignedToName,
                isCompleted: taskCompleted,
                priority: newFollowupPriority
            });

            toast.success('Follow-up updated');
            setUpdatingPartyId(null);
        } catch (error) {
            console.error('Error saving follow-up:', error);
            toast.error('Failed to add follow-up');
        }
    };

    const handleAssignChange = async (followupId: string, newAssignedToId: string) => {
        let assignedToId = null;
        let assignedToName = null;
        if (newAssignedToId && newAssignedToId !== 'unassigned') {
            const assignedUser = users.find(u => u.uid === newAssignedToId);
            if (assignedUser) {
                assignedToId = assignedUser.uid;
                assignedToName = assignedUser.displayName || assignedUser.email;
            }
        }
        try {
            await updateDoc(doc(db, 'followups', followupId), {
                assignedToId,
                assignedToName
            });
            toast.success("Assignee updated");
        } catch (error) {
            console.error('Error updating assignee:', error);
            toast.error("Failed to update assignee");
        }
    };

    // Calculate all pending/latest followups per party
    const activeFollowups = useMemo(() => {
        const now = new Date();
        const latestPerParty: { party: Party, followup: FollowUp, isDue: boolean }[] = [];
        
        const byParty: Record<string, FollowUp[]> = {};
        followups.forEach(f => {
            if (!byParty[f.partyId]) byParty[f.partyId] = [];
            byParty[f.partyId].push(f);
        });

        const isAdmin = userProfile?.role === 'admin';

        Object.entries(byParty).forEach(([partyId, logs]) => {
            logs.sort((a, b) => {
                const timeA = (a.createdAt as any)?.toMillis?.() || 0;
                const timeB = (b.createdAt as any)?.toMillis?.() || 0;
                return timeB - timeA;
            });

            const latest = logs[0];
            if (latest.isCompleted) return; // Skip if latest status is completed
            if (!latest.nextFollowUpDate) return; // Skip if no next date and not completed

            const isAssignedToMe = latest.assignedToId === userProfile?.uid;
            const isGlobal = !latest.assignedToId || latest.assignedToId === 'unassigned';

            // User visibility rules:
            if (!isAdmin && !isAssignedToMe && !isGlobal) {
                return;
            }

            const nextDate = (latest.nextFollowUpDate as any)?.toDate?.() || new Date(latest.nextFollowUpDate as any);
            const isDue = nextDate <= now;
            
            let party = parties.find(p => p.id === partyId);
            if (!party) {
                // Support pseudoparties for unlinked accounts
                party = {
                    id: partyId,
                    name: partyId,
                    address: '',
                    contactNumber: '',
                    type: 'customer',
                    createdAt: (latest.createdAt as any)
                };
            }
            latestPerParty.push({ party, followup: latest, isDue });
        });

        // Filter
        let filtered = latestPerParty;
        if (showOnlyDue) {
            filtered = filtered.filter(item => item.isDue);
        }
        
        if (selectedUserId === 'unassigned') {
            filtered = filtered.filter(item => !item.followup.assignedToId);
        } else if (selectedUserId !== 'all') {
            filtered = filtered.filter(item => item.followup.assignedToId === selectedUserId);
        }

        // Sort by closest nextDate first
        return filtered.sort((a, b) => {
            const timeA = (a.followup.nextFollowUpDate as any)?.toMillis?.() || 0;
            const timeB = (b.followup.nextFollowUpDate as any)?.toMillis?.() || 0;
            return timeA - timeB;
        }).slice(0, 50); // limit to a reasonable amount
    }, [followups, parties, showOnlyDue, selectedUserId, userProfile]);

    const workedTodayFollowups = useMemo(() => {
        if (userProfile?.role !== 'admin') return [];
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const byParty: Record<string, FollowUp> = {};

        followups.forEach(f => {
            const time = (f.createdAt as any)?.toMillis?.() || 0;
            if (time >= startOfDay) {
                if (!byParty[f.partyId] || time > ((byParty[f.partyId].createdAt as any)?.toMillis?.() || 0)) {
                    byParty[f.partyId] = f;
                }
            }
        });

        return Object.values(byParty).sort((a, b) => {
            const timeA = (a.createdAt as any)?.toMillis?.() || 0;
            const timeB = (b.createdAt as any)?.toMillis?.() || 0;
            return timeB - timeA;
        });
    }, [followups, userProfile]);

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                        <BellRing className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Active Follow-ups</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage, track, and assign follow-up tasks.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setFullHistoryOpen(true)}
                        className="bg-white dark:bg-slate-950 font-semibold"
                    >
                        <HistoryIcon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                        Full History
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 mr-4">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filters:</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500">Show:</Label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button 
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${showOnlyDue ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            onClick={() => setShowOnlyDue(true)}
                        >
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Overdue & Due Soon</span>
                        </button>
                        <button 
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!showOnlyDue ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            onClick={() => setShowOnlyDue(false)}
                        >
                            All Active
                        </button>
                    </div>
                </div>

                {userProfile?.role === 'admin' && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-xs text-slate-500">Assignee:</Label>
                        <select 
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-transparent shadow-sm dark:border-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">All Assignees</option>
                            <option value="unassigned">Unassigned (Global)</option>
                            {users.map(u => (
                                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Active Tasks Section Header */}
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => setPendingExpanded(!pendingExpanded)}>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">Active Tasks</h2>
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">{activeFollowups.length}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {pendingExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
            </div>

            {/* List */}
            {pendingExpanded && (
                activeFollowups.length === 0 ? (
                    <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                        <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-80" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No pending follow-ups found</h3>
                        <p className="text-slate-500">Great job! You're all caught up with your tasks.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeFollowups.map(({ party, followup, isDue }) => (
                        <div key={followup.id} className={`bg-white dark:bg-[#0f172a] border rounded-xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md ${isDue ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-800'}`}>
                            {isDue && (
                                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                                    <div className="absolute top-[-10px] right-[-30px] bg-red-500 text-white text-[10px] font-bold py-1 w-[100px] text-center transform rotate-45 shadow-sm">
                                        DUE
                                    </div>
                                </div>
                            )}
                            
                            <div className="pr-8">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 line-clamp-1">{party.name}</h4>
                                {party.contactNumber && (
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{party.contactNumber}</p>
                                )}
                                <div className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${isDue ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {isDue ? 'Overdue/Due Now: ' : 'Scheduled for: '} 
                                    {(followup.nextFollowUpDate as any)?.toDate?.().toLocaleString() || new Date(followup.nextFollowUpDate as any).toLocaleString()}
                                </div>
                            </div>
                            
                            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-700 line-clamp-3">
                                <p className="font-semibold text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Previous Note:</p>
                                "{followup.message}"
                            </div>

                            {/* User Assignment & History Action */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 relative border border-slate-200 dark:border-slate-800 rounded-lg pr-1 bg-slate-50 dark:bg-slate-800/50 focus-within:border-blue-500 transition-colors">
                                    <div className="pl-2.5 pointer-events-none">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    {userProfile?.role === 'admin' ? (
                                        <>
                                            <select 
                                                value={followup.assignedToId || 'unassigned'}
                                                onChange={(e) => handleAssignChange(followup.id, e.target.value)}
                                                className="h-7 py-0.5 pl-1.5 pr-7 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none appearance-none cursor-pointer w-full max-w-[140px] truncate"
                                            >
                                                <option value="unassigned">Unassigned (Global)</option>
                                                {users.map(u => (
                                                    <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-7 py-0.5 pl-1.5 pr-2.5 flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[140px] truncate">
                                            {followup.assignedToName || 'Unassigned (Global)'}
                                        </div>
                                    )}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs px-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => setHistoryOpenFor(party.id)}
                                >
                                    <HistoryIcon className="w-3.5 h-3.5 mr-1.5" /> History
                                </Button>
                            </div>
                            
                            {updatingPartyId === party.id ? (
                                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 mt-auto">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Note</Label>
                                        <Textarea 
                                            value={newFollowupMsg} 
                                            onChange={(e) => setNewFollowupMsg(e.target.value)} 
                                            placeholder="Enter update..."
                                            className="resize-none min-h-[60px] text-sm"
                                            rows={2}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-2 my-2 cursor-pointer" onClick={() => setTaskCompleted(!taskCompleted)}>
                                        <input type="checkbox" checked={taskCompleted} onChange={(e) => setTaskCompleted(e.target.checked)} className="cursor-pointer rounded border-slate-300" />
                                        <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">Mark as Completed</Label>
                                    </div>

                                    {!taskCompleted && (
                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Next Date</Label>
                                                <Input type="date" className="h-8 text-xs" value={newFollowupDate} onChange={(e) => setNewFollowupDate(e.target.value)} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</Label>
                                                <Input type="time" className="h-8 text-xs" value={newFollowupTime} onChange={(e) => setNewFollowupTime(e.target.value)} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-2">
                                        {userProfile?.role === 'admin' && (
                                            <div className="space-y-1.5 flex-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign To</Label>
                                                <select 
                                                    value={newFollowupAssignedTo}
                                                    onChange={(e) => setNewFollowupAssignedTo(e.target.value)}
                                                    className="flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950"
                                                >
                                                    <option value="unassigned">Anyone (Global)</option>
                                                    {users.map(u => (
                                                        <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="space-y-1.5 flex-1">
                                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</Label>
                                            <select 
                                                value={newFollowupPriority}
                                                onChange={(e) => setNewFollowupPriority(e.target.value as any)}
                                                className="flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                                            >
                                                <option value="high">🔴 High</option>
                                                <option value="medium">🟡 Medium</option>
                                                <option value="low">🟢 Low</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => setUpdatingPartyId(null)}>Cancel</Button>
                                        <Button size="sm" className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSaveFollowup(party.id)}>Save Task</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex-1 h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900/40 dark:hover:bg-blue-900/20"
                                            onClick={() => startUpdate(party.id, followup.assignedToId)}
                                        >
                                            Quick Update
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex-1 h-8 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                            onClick={() => navigate('/internal-accounts', { state: { selectedPartyId: party.id, activeTab: 'statement' } })}
                                        >
                                            Account
                                        </Button>
                                    </div>
                                    {party.contactNumber && (
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" asChild className="flex-1 h-8 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-300">
                                                <a href={`tel:${party.contactNumber}`}>
                                                    <Phone className="w-3 h-3 mr-1.5" /> Call
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="sm" asChild className="flex-1 h-8 text-xs bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366]">
                                                <a href={`https://wa.me/${party.contactNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                    <MessageCircle className="w-3 h-3 mr-1.5" /> WhatsApp
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                )
            )}

            {/* Admin Tasks Worked On Today Section */}
            {userProfile?.role === 'admin' && workedTodayFollowups.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6 cursor-pointer group" onClick={() => setWorkedExpanded(!workedExpanded)}>
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">Tasks Worked On Today</h2>
                                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">{workedTodayFollowups.length}</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review follow-ups that were marked as completed or updated today by your team.</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
                            {workedExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                    </div>
                    
                    {workedExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workedTodayFollowups.map((f) => {
                                const party = parties.find(p => p.id === f.partyId);
                                return (
                                    <div key={f.id} className="bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-5 shadow-sm flex flex-col gap-3 relative overflow-hidden transition-all hover:shadow-md">
                                        <div className="pr-8">
                                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 line-clamp-1">{party?.name || 'Unknown Party'}</h4>
                                            {party?.contactNumber && (
                                                <p className="text-xs font-semibold text-slate-500 mt-0.5">{party.contactNumber}</p>
                                            )}
                                        </div>
                                        
                                        <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-700 line-clamp-3">
                                            <p className="font-semibold text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Note:</p>
                                            "{f.message}"
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <UserIcon className="w-3.5 h-3.5" />
                                                By: {f.createdByName || 'Unknown'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold ml-auto">
                                                <Clock className="w-3.5 h-3.5" />
                                                {(f.createdAt as any)?.toDate?.().toLocaleTimeString() || 'Just now'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* History Dialog */}
            {historyOpenFor && (
                <Dialog open={!!historyOpenFor} onOpenChange={(open) => !open && setHistoryOpenFor(null)}>
                    <DialogContent className="max-w-[600px] h-[80vh] flex flex-col">
                        <DialogHeader className="shrink-0 space-y-3">
                            <DialogTitle>Follow-up History</DialogTitle>
                            <p className="text-sm text-slate-500">
                                History for {parties.find(p => p.id === historyOpenFor)?.name}
                            </p>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {followups
                                .filter(f => f.partyId === historyOpenFor)
                                .sort((a, b) => {
                                    const timeA = (a.createdAt as any)?.toMillis?.() || 0;
                                    const timeB = (b.createdAt as any)?.toMillis?.() || 0;
                                    return timeB - timeA;
                                })
                                .map(f => (
                                    <div key={f.id} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex flex-col gap-2">
                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{f.message}</p>
                                        <div className="flex flex-wrap gap-3 mt-1 pt-3 border-t border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                {(f.createdAt as any)?.toDate?.().toLocaleString() || 'Just now'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <UserIcon className="w-3.5 h-3.5" />
                                                Created By: {f.createdByName || 'Unknown'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                <UserIcon className="w-3.5 h-3.5" />
                                                Assignee: {f.assignedToName || 'Unassigned'}
                                            </div>
                                            {f.isCompleted && (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold ml-auto">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Completed
                                                </div>
                                            )}
                                            {!f.isCompleted && f.nextFollowUpDate && (
                                                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium ml-auto">
                                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                    Due: {(f.nextFollowUpDate as any)?.toDate?.().toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            {followups.filter(f => f.partyId === historyOpenFor).length === 0 && (
                                <p className="text-sm text-center text-slate-500 py-4">No history available.</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Full History Dialog */}
            <Dialog open={fullHistoryOpen} onOpenChange={setFullHistoryOpen}>
                <DialogContent className="max-w-[100vw] sm:max-w-[100vw] w-screen h-screen m-0 rounded-none flex flex-col p-4 sm:p-6 shadow-none">
                    <DialogHeader className="shrink-0 space-y-3">
                        <DialogTitle>Full Follow-up History</DialogTitle>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <div className="space-y-1.5 flex-1 max-w-[200px]">
                                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">From Date</Label>
                                <Input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5 flex-1 max-w-[200px]">
                                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">To Date</Label>
                                <Input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5 flex-1 max-w-[250px]">
                                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Account Name</Label>
                                <SearchableSelect 
                                    options={accountOptions}
                                    value={historyAccount}
                                    onChange={(v) => setHistoryAccount(v)}
                                    placeholder="All Accounts"
                                />
                            </div>
                            <div className="space-y-1.5 flex-1 max-w-[200px]">
                                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Assigned By</Label>
                                <Select value={historyAssignBy} onValueChange={setHistoryAssignBy}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="All Users" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        {users.map(u => (
                                            <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 flex-1 max-w-[200px]">
                                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Assignee</Label>
                                <Select value={historyAssignee} onValueChange={setHistoryAssignee}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="All Assignees" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Assignees</SelectItem>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {users.map(u => (
                                            <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 flex-1 max-w-[150px]">
                                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status</Label>
                                <Select value={historyStatus} onValueChange={setHistoryStatus}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="due">Due</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 mt-4">
                        {(() => {
                            let filtered = followups;
                            if (historyStartDate) {
                                const start = new Date(historyStartDate);
                                start.setHours(0,0,0,0);
                                filtered = filtered.filter(f => {
                                    const t = (f.createdAt as any)?.toDate?.() || new Date(f.createdAt as any);
                                    return t >= start;
                                });
                            }
                            if (historyEndDate) {
                                const end = new Date(historyEndDate);
                                end.setHours(23,59,59,999);
                                filtered = filtered.filter(f => {
                                    const t = (f.createdAt as any)?.toDate?.() || new Date(f.createdAt as any);
                                    return t <= end;
                                });
                            }
                            if (historyAccount && historyAccount !== 'all') {
                                filtered = filtered.filter(f => {
                                    const party = parties.find(p => p.id === f.partyId);
                                    const accountNameMatch = (party?.name || f.partyId).toLowerCase();
                                    return f.partyId === historyAccount || accountNameMatch === historyAccount.toLowerCase();
                                });
                            }
                            if (historyAssignBy && historyAssignBy !== 'all') {
                                filtered = filtered.filter(f => f.createdByUid === historyAssignBy);
                            }
                            if (historyAssignee && historyAssignee !== 'all') {
                                if (historyAssignee === 'unassigned') {
                                    filtered = filtered.filter(f => !f.assignedToId || f.assignedToId === 'unassigned');
                                } else {
                                    filtered = filtered.filter(f => f.assignedToId === historyAssignee);
                                }
                            }
                            if (historyStatus !== 'all') {
                                if (historyStatus === 'completed') {
                                    filtered = filtered.filter(f => f.isCompleted);
                                } else if (historyStatus === 'due') {
                                    filtered = filtered.filter(f => !f.isCompleted);
                                }
                            }

                            // Sort by date descending
                            filtered.sort((a, b) => {
                                const timeA = (a.createdAt as any)?.toMillis?.() || 0;
                                const timeB = (b.createdAt as any)?.toMillis?.() || 0;
                                return timeB - timeA;
                            });

                            if (filtered.length === 0) {
                                return (
                                    <div className="text-center py-12">
                                        <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <HistoryIcon className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No follow-ups found</h3>
                                        <p className="text-slate-500 text-sm">Try adjusting your date range.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {filtered.map(f => {
                                        const party = parties.find(p => p.id === f.partyId);
                                        const urgency = f.priority || 'medium';
                                        return (
                                            <div key={f.id} className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex flex-col gap-1.5 transition-all hover:shadow-md relative">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex items-center gap-2 max-w-[calc(100%-110px)]">
                                                        {urgency === 'high' && <span className="bg-red-100 text-red-700 border border-red-200/60 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0">High</span>}
                                                        {urgency === 'medium' && <span className="bg-yellow-100 text-yellow-700 border border-yellow-200/60 dark:bg-yellow-900/30 dark:border-yellow-800/50 dark:text-yellow-400 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0">Med</span>}
                                                        {urgency === 'low' && <span className="bg-emerald-100 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0">Low</span>}
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{party?.name || 'Unknown Party'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm shrink-0">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        {(f.createdAt as any)?.toDate?.().toLocaleDateString() || new Date(f.createdAt as any).toLocaleDateString()}
                                                        {' '}
                                                        {(f.createdAt as any)?.toDate?.().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || new Date(f.createdAt as any).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-1 whitespace-pre-wrap line-clamp-3">
                                                    {f.message}
                                                </div>
                                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-auto pt-1">
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                                        <UserIcon className="w-3 h-3 text-slate-400" />
                                                        By: <span className="text-slate-700 dark:text-slate-300 truncate max-w-[60px]">{f.createdByName || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium ml-2">
                                                        <UserIcon className="w-3 h-3 text-slate-400" />
                                                        Assignee: <span className="text-slate-700 dark:text-slate-300 truncate max-w-[60px]">{f.assignedToName || 'Unassigned'}</span>
                                                    </div>
                                                    {f.isCompleted && (
                                                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-auto bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Done
                                                        </div>
                                                    )}
                                                    {!f.isCompleted && f.nextFollowUpDate && (
                                                        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-auto bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                            <Clock className="w-3 h-3 text-blue-500" />
                                                            Due: {(f.nextFollowUpDate as any)?.toDate?.().toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                                                    <Input
                                                        placeholder="Add quick note..."
                                                        className="h-6 text-[10px] w-full px-2"
                                                        value={quickNotes[f.id] || ''}
                                                        onChange={(e) => setQuickNotes(prev => ({ ...prev, [f.id]: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveQuickNote(f.id, f.message);
                                                        }}
                                                        disabled={savingNoteFor === f.id}
                                                    />
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary" 
                                                        className="h-6 text-[10px] px-2.5 shadow-none shrink-0"
                                                        onClick={() => handleSaveQuickNote(f.id, f.message)}
                                                        disabled={savingNoteFor === f.id || !quickNotes[f.id]?.trim()}
                                                    >
                                                        {savingNoteFor === f.id ? <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> : 'Save'}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
