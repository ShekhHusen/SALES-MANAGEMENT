import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, where } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarClock, Eye, Plus } from 'lucide-react';
import { Sale } from '@/types';

export function FollowUps() {
  const { sales, loadSales, isSalesLoaded, vehicles, loadVehicles, isVehiclesLoaded, parties, loadParties, isPartiesLoaded } = useGlobalData();
  const [salesFollowUps, setSalesFollowUps] = useState<any[]>([]);
  const [emiFollowUps, setEmiFollowUps] = useState<any[]>([]);
  const [emis, setEmis] = useState<any[]>([]);
  const [selectedEntityForHistory, setSelectedEntityForHistory] = useState<{ id: string, type: 'sales' | 'emi', saleId?: string } | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [selectedViewDetails, setSelectedViewDetails] = useState<any>(null);

  useEffect(() => {
    if (!isSalesLoaded) loadSales();
    if (!isVehiclesLoaded) loadVehicles();
    if (!isPartiesLoaded) loadParties();
  }, [isSalesLoaded, loadSales, isVehiclesLoaded, loadVehicles, isPartiesLoaded, loadParties]);

  useEffect(() => {
    const qSalesFollowUps = query(collection(db, 'salesFollowUps'));
    const unsubSalesFollowUps = onSnapshot(qSalesFollowUps, (snapshot) => {
      setSalesFollowUps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qEmiFollowUps = query(collection(db, 'emiFollowUps'));
    const unsubEmiFollowUps = onSnapshot(qEmiFollowUps, (snapshot) => {
      setEmiFollowUps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qEmis = query(collection(db, 'emis'));
    const unsubEmis = onSnapshot(qEmis, (snapshot) => {
      setEmis(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSalesFollowUps();
      unsubEmiFollowUps();
      unsubEmis();
    };
  }, []);

  // Process followups to get the latest one per sale / emi
  // Actually, we want to show follow-ups where nextDate <= today + 3 days
  // But only the latest follow-up for that entity, or rather we check if the LATEST follow-up has a nextDate <= today + 3 days.

  const getProcessedList = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const latestFollowUps = new Map<string, any>();

    const getTime = (d: any) => {
      if (!d) return 0;
      if (d.seconds) return d.seconds * 1000;
      if (typeof d.toMillis === 'function') return d.toMillis();
      if (d instanceof Date) return d.getTime();
      return new Date(d).getTime() || 0;
    };

    // Process sales follow-ups
    salesFollowUps.forEach(fu => {
      if (!latestFollowUps.has(fu.saleId) || getTime(latestFollowUps.get(fu.saleId).createdAt) < getTime(fu.createdAt)) {
        latestFollowUps.set(fu.saleId, { ...fu, entityType: 'sales', entityId: fu.saleId });
      }
    });

    // Process EMI follow-ups
    emiFollowUps.forEach(fu => {
      if (!latestFollowUps.has(fu.emiId) || getTime(latestFollowUps.get(fu.emiId).createdAt) < getTime(fu.createdAt)) {
        latestFollowUps.set(fu.emiId, { ...fu, entityType: 'emi', entityId: fu.emiId });
      }
    });

    const pendingFollowUps: any[] = [];

    latestFollowUps.forEach((fu, key) => {
      if (!fu.nextDate) return;
      
      const nextDateStr = fu.nextDate; // assuming YYYY-MM-DD
      const nextDate = new Date(nextDateStr);
      
      if (true) { // Show all follow ups for now
        // Find customer info
        let customerName = 'Unknown';
        let address = '---';
        let contact = '---';
        let fileNumber = '---';
        let saleId = '';

        if (fu.entityType === 'sales') {
          const sale = sales.find(s => s.id === fu.saleId);
          if (sale) {
            const customer = parties.find(p => p.id === sale.customerId);
            if (customer) {
              customerName = customer.name || 'Unknown';
              address = customer.address || '---';
              contact = customer.contactNumber || '---';
            }
            fileNumber = sale.fileNumber || '---';
            saleId = sale.id;
          }
        } else if (fu.entityType === 'emi') {
          const emi = emis.find(e => e.id === fu.emiId);
          if (emi) {
            const customer = parties.find(p => p.id === emi.customerId);
            if (customer) {
              customerName = customer.name || 'Unknown';
              address = customer.address || '---';
              contact = customer.contactNumber || '---';
            }
            const sale = sales.find(s => s.id === emi.saleId);
            fileNumber = sale?.fileNumber || '---';
            saleId = emi.saleId;
          }
        }

        pendingFollowUps.push({
          ...fu,
          customerName,
          address,
          contact,
          fileNumber,
          saleId
        });
      }
    });

    // Sort by nextDate asc
    pendingFollowUps.sort((a, b) => {
      return new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime();
    });

    return pendingFollowUps;
  };

  const processedList = getProcessedList();

  useEffect(() => {
    if (selectedEntityForHistory) {
      const qSales = query(collection(db, 'salesFollowUps'), where('saleId', '==', selectedEntityForHistory.saleId || selectedEntityForHistory.id));
      const unsubSales = onSnapshot(qSales, (snapshot) => {
        const s = snapshot.docs.map(doc => ({ id: doc.id, type: 'sales', ...doc.data() }));
        
        let emiId = '';
        if (selectedEntityForHistory.type === 'emi') {
          emiId = selectedEntityForHistory.id;
        } else {
          const emi = emis.find(e => e.saleId === selectedEntityForHistory.id);
          if (emi) emiId = emi.id;
        }

        if (emiId) {
           const qEmi = query(collection(db, 'emiFollowUps'), where('emiId', '==', emiId));
           const unsubEmi = onSnapshot(qEmi, (emiSnap) => {
             const e = emiSnap.docs.map(doc => ({ id: doc.id, type: 'emi', ...doc.data() }));
             const combined = [...s, ...e].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
             setHistoryList(combined);
           });
           return () => unsubEmi();
        } else {
           setHistoryList(s.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        }
      });
      return () => unsubSales();
    } else {
      setHistoryList([]);
    }
  }, [selectedEntityForHistory, emis]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#090E17]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 lg:pb-0 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Follow-ups Dashboard
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Pending and upcoming follow-ups</p>
        </div>
      </div>

      <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-hidden flex flex-col">
        <Card className="flex-1 flex flex-col border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-blue-900/5 dark:shadow-blue-900/10 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md">
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Customer / File</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Address & Contact</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Recent Follow-up</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Remarks</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Next Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No pending or upcoming follow-ups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  processedList.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {item.customerName}
                        </div>
                        <Badge variant="outline" className="text-[10px] mt-1 text-slate-500 font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                          #{item.fileNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{item.address}</div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">{item.contact}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                           <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                             {item.recentDate || '---'}
                           </span>
                           {item.entityType === 'sales' ? (
                             <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">Sales</Badge>
                           ) : (
                             <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-purple-50 text-purple-700 border-purple-200">EMI</Badge>
                           )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 max-w-[250px] whitespace-pre-wrap">
                        <div className="flex flex-col gap-1">
                          <span>{item.remarks || '---'}</span>
                          {item.userName && (
                            <span className="text-[10px] text-slate-400 font-medium">By: {item.userName}</span>
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
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => setSelectedEntityForHistory({ id: item.entityId, type: item.entityType, saleId: item.saleId })}>
                                 <Plus className="h-4 w-4" />
                               </Button>
                             } />
                             <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                               <DialogHeader>
                                 <DialogTitle>Follow-up History - {item.customerName}</DialogTitle>
                               </DialogHeader>
                               <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Recent Date</TableHead>
                                      <TableHead className="text-xs">Remarks</TableHead>
                                      <TableHead className="text-xs">Next Date</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {historyList.map(h => (
                                      <TableRow key={h.id}>
                                        <TableCell className="text-xs">
                                          <div className="flex flex-col gap-1">
                                            <span>{h.recentDate || '---'}</span>
                                            {h.type === 'sales' ? (
                                              <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">Sales</Badge>
                                            ) : (
                                              <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-purple-50 text-purple-700 border-purple-200">EMI</Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          <div className="flex flex-col gap-1">
                                            <span>{h.remarks || '---'}</span>
                                            {h.userName && (
                                              <span className="text-[10px] text-slate-400 font-medium">By: {h.userName}</span>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold text-blue-600">
                                          {h.nextDate || '---'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
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
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Customer & Vehicle Details</DialogTitle>
          </DialogHeader>
          {selectedViewDetails && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Customer Info</h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="font-semibold text-sm">{selectedViewDetails.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Contact</p>
                    <p className="font-semibold text-sm">{selectedViewDetails.contact}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="font-semibold text-sm">{selectedViewDetails.address}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Vehicle Info</h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">File Number</p>
                    <p className="font-semibold text-sm">#{selectedViewDetails.fileNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Vehicle Type</p>
                    <p className="font-semibold text-sm">
                       {(() => {
                          const sale = sales.find(s => s.id === selectedViewDetails.saleId);
                          if (!sale) return '---';
                          const vehicle = vehicles.find(v => v.chassisNumber === sale.chassisNumber);
                          if (!vehicle) return sale.chassisNumber || '---';
                          return `${vehicle.company} ${vehicle.model} (${vehicle.color})`;
                       })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Chassis Number</p>
                    <p className="font-semibold text-sm">
                       {(() => {
                          const sale = sales.find(s => s.id === selectedViewDetails.saleId);
                          return sale ? sale.chassisNumber : '---';
                       })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
