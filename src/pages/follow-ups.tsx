import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FollowUp, Party } from '@/types';
import { Clock, Phone, MessageCircle, Calendar as CalendarIcon, User as UserIcon, BellRing, Filter, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserProfile } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function FollowUps() {
    const { userProfile } = useAuth();
    const [followups, setFollowups] = useState<FollowUp[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const navigate = useNavigate();

    const [updatingPartyId, setUpdatingPartyId] = useState<string | null>(null);
    const [newFollowupMsg, setNewFollowupMsg] = useState('');
    const [newFollowupDate, setNewFollowupDate] = useState('');
    const [newFollowupTime, setNewFollowupTime] = useState('');
    const [newFollowupAssignedTo, setNewFollowupAssignedTo] = useState('unassigned');
    const [historyOpenFor, setHistoryOpenFor] = useState<string | null>(null);
    
    // Filters
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [showOnlyDue, setShowOnlyDue] = useState<boolean>(true);

    useEffect(() => {
        const unsubs = [
            onSnapshot(collection(db, 'followups'), snap => {
                setFollowups(snap.docs.map(d => ({id: d.id, ...d.data()} as FollowUp)));
            }),
            onSnapshot(collection(db, 'parties'), snap => {
                setParties(snap.docs.map(d => ({id: d.id, ...d.data()} as Party)));
            }),
            onSnapshot(collection(db, 'users'), snap => {
                setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })));
            })
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    const startUpdate = (partyId: string, currentAssignedTo?: string) => {
        const now = new Date();
        setNewFollowupDate(now.toLocaleDateString('en-CA'));
        setNewFollowupTime(now.toTimeString().slice(0, 5));
        setNewFollowupMsg('');
        setNewFollowupAssignedTo(currentAssignedTo || 'unassigned');
        setUpdatingPartyId(partyId);
    };

    const handleSaveFollowup = async (partyId: string) => {
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
                partyId: partyId,
                message: newFollowupMsg,
                nextFollowUpDate: nextDate,
                createdAt: serverTimestamp(),
                createdByUid: userProfile?.uid || null,
                createdByName: userProfile?.displayName || userProfile?.email || 'Unknown User',
                assignedToId,
                assignedToName
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
            if (!f.nextFollowUpDate) return; // Only those with a next date
            if (!byParty[f.partyId]) byParty[f.partyId] = [];
            byParty[f.partyId].push(f);
        });

        Object.entries(byParty).forEach(([partyId, logs]) => {
            logs.sort((a, b) => {
                const timeA = (a.createdAt as any)?.toMillis?.() || 0;
                const timeB = (b.createdAt as any)?.toMillis?.() || 0;
                return timeB - timeA;
            });

            const latest = logs[0];
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
    }, [followups, parties, showOnlyDue, selectedUserId]);

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
            </div>

            {/* List */}
            {activeFollowups.length === 0 ? (
                <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                    <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <BellRing className="h-8 w-8 text-slate-400" />
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
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Next Date</Label>
                                            <Input type="date" className="h-8 text-xs" value={newFollowupDate} onChange={(e) => setNewFollowupDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</Label>
                                            <Input type="time" className="h-8 text-xs" value={newFollowupTime} onChange={(e) => setNewFollowupTime(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
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
                                            {f.nextFollowUpDate && (
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
        </div>
    );
}
