import sys

with open("src/pages/follow-ups.tsx", "r") as f:
    content = f.read()

# We will completely replace the content of follow-ups.tsx with a new one that fetches from tallyDb
# Let's generate the code.

new_content = """import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { tallyDb } from '@/lib/tallyFirebase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarClock, Eye, History } from 'lucide-react';
import { format } from 'date-fns';

export function FollowUps() {
  const { parties, loadParties, isPartiesLoaded } = useGlobalData();
  const [tallyFollowUps, setTallyFollowUps] = useState<any[]>([]);
  const [selectedViewDetails, setSelectedViewDetails] = useState<any>(null);
  const [selectedHistory, setSelectedHistory] = useState<any>(null);

  useEffect(() => {
    if (!isPartiesLoaded) loadParties();
  }, [isPartiesLoaded, loadParties]);

  useEffect(() => {
    if (!tallyDb) return;
    
    // Fetch all follow-ups from secondary firebase
    const qFollowUps = query(collection(tallyDb, 'followUps'));
    const unsub = onSnapshot(qFollowUps, (snapshot) => {
      setTallyFollowUps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching tally followups:", error);
    });

    return () => {
      unsub();
    };
  }, []);

  // Filter follow-ups for linked tally accounts
  const getProcessedList = () => {
    const linkedParties = parties.filter(p => p.tallyAccountId);
    const linkedAccountIds = linkedParties.map(p => p.tallyAccountId);

    const filtered = tallyFollowUps.filter(fu => linkedAccountIds.includes(fu.accountId) && !fu.completed);

    return filtered.map(fu => {
      const party = linkedParties.find(p => p.tallyAccountId === fu.accountId);
      return {
        ...fu,
        customerName: party?.name || fu.accountName || 'Unknown',
        contact: party?.contactNumber || '---',
        address: party?.address || '---',
        partyId: party?.id,
        nextDate: fu.nextFollowUpDate || '---',
        remarks: fu.lastCallNote || fu.message || '---',
      };
    }).sort((a, b) => {
       if (a.nextDate === '---') return 1;
       if (b.nextDate === '---') return -1;
       return new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime();
    });
  };

  const followUpList = getProcessedList();

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] gap-6 p-6 sm:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Follow-ups</h1>
        <p className="text-slate-500 dark:text-slate-400">View upcoming follow-ups for Tally linked accounts.</p>
      </div>

      <div className="grid gap-6 flex-1 items-start relative min-h-0">
        <Card className="flex flex-col shadow-sm border-slate-200/60 dark:border-slate-800 h-full max-h-full overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Tally Linked Pending Follow-ups</CardTitle>
                <CardDescription>Accounts synced from Tally Reporting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-auto bg-white/50 dark:bg-slate-900/50">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Customer</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Remarks</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Next Date</TableHead>
                  <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUpList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      No pending follow-ups found for linked Tally accounts.
                    </TableCell>
                  </TableRow>
                ) : (
                  followUpList.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{item.customerName}</span>
                          <span className="text-xs text-slate-500">{item.contact}</span>
                          <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-teal-50 text-teal-700 border-teal-200">Tally Sync</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 max-w-[250px] whitespace-pre-wrap">
                        <div className="flex flex-col gap-1">
                          <span>{item.remarks}</span>
                          {item.lastCallBy && (
                            <span className="text-[10px] text-slate-400 font-medium">By: {item.lastCallBy}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                          {item.nextDate}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800" onClick={() => setSelectedViewDetails(item)}>
                             <Eye className="h-4 w-4" />
                           </Button>
                           <Dialog>
                             <DialogTrigger render={
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => setSelectedHistory(item)}>
                                 <History className="h-4 w-4" />
                               </Button>
                             } />
                             <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                               <DialogHeader>
                                 <DialogTitle>Follow-up History - {selectedHistory?.customerName}</DialogTitle>
                               </DialogHeader>
                               <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Date</TableHead>
                                      <TableHead className="text-xs">Action / Note</TableHead>
                                      <TableHead className="text-xs">Next Date</TableHead>
                                      <TableHead className="text-xs">By</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(selectedHistory?.history || []).map((h: any, idx: number) => (
                                      <TableRow key={h.id || idx}>
                                        <TableCell className="text-xs">
                                          {h.date || '---'}
                                        </TableCell>
                                        <TableCell className="text-xs max-w-[200px] whitespace-pre-wrap">
                                          <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-slate-700">{h.action || '---'}</span>
                                            <span className="text-slate-600">{h.note || '---'}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold text-blue-600">
                                          {h.nextFollowUpDate || '---'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                          {h.userName || '---'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {(!selectedHistory?.history || selectedHistory.history.length === 0) && (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                                          No history available.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                               </Table>
                             </DialogContent>
                           </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!selectedViewDetails} onOpenChange={(open) => !open && setSelectedViewDetails(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Customer Details (Tally Linked)</DialogTitle>
          </DialogHeader>
          {selectedViewDetails && (
            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tally Account Name</p>
                  <p className="font-semibold text-sm">{selectedViewDetails.accountName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">App Customer Name</p>
                  <p className="font-semibold text-sm">{selectedViewDetails.customerName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Contact</p>
                    <p className="font-semibold text-sm">{selectedViewDetails.contact}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Address</p>
                    <p className="font-semibold text-sm">{selectedViewDetails.address}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Latest Remarks</p>
                  <p className="font-semibold text-sm mt-1 bg-white p-2 rounded border border-slate-200">
                    {selectedViewDetails.remarks}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
"""

with open("src/pages/follow-ups.tsx", "w") as f:
    f.write(new_content)

print("Re-written follow ups page")
