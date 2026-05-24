import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FollowUp, Party } from '@/types';
import { Bell, Phone, MessageCircle, Clock, X, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserProfile } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function FollowUpNotifier() {
    const { userProfile } = useAuth();
    const [followups, setFollowups] = useState<FollowUp[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
    const navigate = useNavigate();

    const [users, setUsers] = useState<UserProfile[]>([]);
    
    const [updatingPartyId, setUpdatingPartyId] = useState<string | null>(null);
    const [newFollowupMsg, setNewFollowupMsg] = useState('');
    const [newFollowupDate, setNewFollowupDate] = useState('');
    const [newFollowupTime, setNewFollowupTime] = useState('');
    const [newFollowupAssignedTo, setNewFollowupAssignedTo] = useState('unassigned');

    const startUpdate = (partyId: string) => {
        const now = new Date();
        setNewFollowupDate(now.toLocaleDateString('en-CA'));
        setNewFollowupTime(now.toTimeString().slice(0, 5));
        setNewFollowupMsg('');
        setNewFollowupAssignedTo('unassigned');
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

            toast.success('Follow-up added successfully');
            setUpdatingPartyId(null);
        } catch (error) {
            console.error('Error saving follow-up:', error);
            toast.error('Failed to add follow-up');
        }
    };

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

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Due Follow-ups logic
    const dueFollowups = useMemo(() => {
        const now = new Date();
        const myDue: { party: Party, followup: FollowUp }[] = [];
        const globalDue: { party: Party, followup: FollowUp }[] = [];
        
        // Group by party ID
        const byParty: Record<string, FollowUp[]> = {};
        followups.forEach(f => {
            if (!byParty[f.partyId]) byParty[f.partyId] = [];
            byParty[f.partyId].push(f);
        });

        Object.entries(byParty).forEach(([partyId, logs]) => {
            // Sort by createdAt desc
            logs.sort((a, b) => {
                const timeA = (a.createdAt as any)?.toMillis?.() || 0;
                const timeB = (b.createdAt as any)?.toMillis?.() || 0;
                return timeB - timeA;
            });

            const latest = logs[0];
            if (latest.nextFollowUpDate) {
                const nextDate = (latest.nextFollowUpDate as any)?.toDate?.() || new Date(latest.nextFollowUpDate as any);
                if (nextDate <= now) {
                    const party = parties.find(p => p.id === partyId);
                    if (party) {
                        // Check assigning
                        if (latest.assignedToId === userProfile?.uid) {
                            myDue.push({ party, followup: latest });
                        } else if (!latest.assignedToId) { // Global
                            globalDue.push({ party, followup: latest });
                        }
                    }
                }
            }
        });

        const sorter = (a: { followup: FollowUp }, b: { followup: FollowUp }) => {
            const timeA = (a.followup.nextFollowUpDate as any)?.toMillis?.() || 0;
            const timeB = (b.followup.nextFollowUpDate as any)?.toMillis?.() || 0;
            return timeA - timeB;
        };

        return {
            myDue: myDue.sort(sorter),
            globalDue: globalDue.sort(sorter),
            totalLength: myDue.length + globalDue.length
        };
    }, [followups, parties, userProfile]);

    // Check for new notifications every minute
    useEffect(() => {
        const checkNotifications = (list: { party: Party, followup: FollowUp }[]) => {
            const now = new Date();
            list.forEach(due => {
                const nextDate = (due.followup.nextFollowUpDate as any)?.toDate?.() || new Date(due.followup.nextFollowUpDate as any);
                if (nextDate <= now && !notifiedIds.has(due.followup.id)) {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        const notif = new Notification(`Follow-up Time: ${due.party.name}`, {
                            body: `Message: ${due.followup.message}\nPlease contact them now.`,
                            icon: '/icon.png'
                        });
                        notif.onclick = () => {
                            window.focus();
                            setIsOpen(true);
                        };
                    }
                    setNotifiedIds(prev => {
                        const next = new Set(prev);
                        next.add(due.followup.id);
                        return next;
                    });
                }
            });
        };

        const interval = setInterval(() => {
            checkNotifications(dueFollowups.myDue);
            checkNotifications(dueFollowups.globalDue);
        }, 60000); // check every minute

        // Initial check
        checkNotifications(dueFollowups.myDue);
        checkNotifications(dueFollowups.globalDue);

        return () => clearInterval(interval);
    }, [dueFollowups, notifiedIds]);

    if (dueFollowups.totalLength === 0) return null;

    return (
        <>
            <Button 
                variant="outline" 
                size="icon" 
                className="relative h-8 w-8 rounded-lg text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => setIsOpen(true)}
            >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                    {dueFollowups.totalLength}
                </span>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-red-500 fill-red-500/20" />
                            Pending Follow-ups
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
                        {dueFollowups.myDue.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Assigned to Me</h3>
                                {dueFollowups.myDue.map(({ party, followup }) => (
                                    <FollowupCard 
                                        key={followup.id} 
                                        party={party} 
                                        followup={followup} 
                                        updatingPartyId={updatingPartyId}
                                        startUpdate={startUpdate}
                                        setIsOpen={setIsOpen}
                                        navigate={navigate}
                                        newFollowupMsg={newFollowupMsg}
                                        setNewFollowupMsg={setNewFollowupMsg}
                                        newFollowupDate={newFollowupDate}
                                        setNewFollowupDate={setNewFollowupDate}
                                        newFollowupTime={newFollowupTime}
                                        setNewFollowupTime={setNewFollowupTime}
                                        newFollowupAssignedTo={newFollowupAssignedTo}
                                        setNewFollowupAssignedTo={setNewFollowupAssignedTo}
                                        users={users}
                                        setUpdatingPartyId={setUpdatingPartyId}
                                        handleSaveFollowup={handleSaveFollowup}
                                    />
                                ))}
                            </div>
                        )}
                        {dueFollowups.globalDue.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Global Follow-ups</h3>
                                {dueFollowups.globalDue.map(({ party, followup }) => (
                                    <FollowupCard 
                                        key={followup.id} 
                                        party={party} 
                                        followup={followup} 
                                        updatingPartyId={updatingPartyId}
                                        startUpdate={startUpdate}
                                        setIsOpen={setIsOpen}
                                        navigate={navigate}
                                        newFollowupMsg={newFollowupMsg}
                                        setNewFollowupMsg={setNewFollowupMsg}
                                        newFollowupDate={newFollowupDate}
                                        setNewFollowupDate={setNewFollowupDate}
                                        newFollowupTime={newFollowupTime}
                                        setNewFollowupTime={setNewFollowupTime}
                                        newFollowupAssignedTo={newFollowupAssignedTo}
                                        setNewFollowupAssignedTo={setNewFollowupAssignedTo}
                                        users={users}
                                        setUpdatingPartyId={setUpdatingPartyId}
                                        handleSaveFollowup={handleSaveFollowup}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function FollowupCard({ party, followup, updatingPartyId, startUpdate, setIsOpen, navigate, newFollowupMsg, setNewFollowupMsg, newFollowupDate, setNewFollowupDate, newFollowupTime, setNewFollowupTime, newFollowupAssignedTo, setNewFollowupAssignedTo, users, setUpdatingPartyId, handleSaveFollowup }: any) {
    return (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{party.name}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        Due: {(followup.nextFollowUpDate as any)?.toDate?.().toLocaleString() || new Date(followup.nextFollowUpDate as any).toLocaleString()}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        onClick={() => startUpdate(party.id)}
                    >
                        Quick Update
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        onClick={() => {
                            setIsOpen(false);
                            navigate('/internal-accounts', { state: { selectedPartyId: party.id, activeTab: 'statement' } });
                        }}
                    >
                        View Account
                    </Button>
                </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-xs text-slate-400 mb-1 uppercase tracking-wider">Previous Note:</p>
                "{followup.message}"
            </div>
            
            {updatingPartyId === party.id ? (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Note</Label>
                        <Textarea 
                            value={newFollowupMsg} 
                            onChange={(e) => setNewFollowupMsg(e.target.value)} 
                            placeholder="Enter update..."
                            className="resize-none min-h-[60px]"
                            rows={2}
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" /> Next Date</Label>
                            <Input type="date" className="h-8 text-xs" value={newFollowupDate} onChange={(e) => setNewFollowupDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3 h-3" /> Time</Label>
                            <Input type="time" className="h-8 text-xs" value={newFollowupTime} onChange={(e) => setNewFollowupTime(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign To</Label>
                        <select 
                            value={newFollowupAssignedTo}
                            onChange={(e) => setNewFollowupAssignedTo(e.target.value)}
                            className="flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-1 text-xs shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                        >
                            <option value="unassigned">Anyone (Global)</option>
                            {users.map((u: any) => (
                                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => setUpdatingPartyId(null)}>Cancel</Button>
                        <Button size="sm" className="flex-1 h-8" onClick={() => handleSaveFollowup(party.id)}>Save Update</Button>
                    </div>
                </div>
            ) : (
                party.contactNumber && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <Button variant="outline" size="sm" asChild className="flex-1 h-8 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                            <a href={`tel:${party.contactNumber}`}>
                                <Phone className="w-3.5 h-3.5 mr-2" /> Call
                            </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex-1 h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                            <a href={`https://wa.me/${party.contactNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-3.5 h-3.5 mr-2" /> WhatsApp
                            </a>
                        </Button>
                    </div>
                )
            )}
        </div>
    );
}
