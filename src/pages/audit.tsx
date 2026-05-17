import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, format } from 'date-fns';

export function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: addDays(new Date(), -30),
    to: new Date()
  });

  const fetchLogs = async (isLoadMore = false) => {
    try {
      setLoading(true);
      
      let baseQuery = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(50) // Adjust limit as needed
      );

      if (isLoadMore && lastDoc) {
        baseQuery = query(
          collection(db, 'audit_logs'),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(50)
        );
      }

      const snapshot = await getDocs(baseQuery);
      
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      } else {
        setHasMore(false);
      }

      setLogs(prev => isLoadMore ? [...prev, ...newLogs] : newLogs);
      
      // If we got fewer than 50 docs, that was the last page
      if (snapshot.docs.length < 50) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    fetchLogs(false); // In a real scenario, could implement client-side filtering or complex Firestore querying
  };

  // Client-side filtering based on state
  const filteredLogs = logs.filter(log => {
    const matchesAction = actionTypeFilter === 'ALL' || log.actionType === actionTypeFilter;
    const matchesEntity = entityTypeFilter === 'ALL' || log.entityType === entityTypeFilter;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (log.userEmail || '').toLowerCase().includes(searchLower) ||
      (log.entityId || '').toLowerCase().includes(searchLower);

    // Date filtering (assuming log.timestamp is a Firestore Timestamp or Date)
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to && log.timestamp) {
       const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
       matchesDate = logDate >= dateRange.from && logDate <= new Date(dateRange.to.getTime() + 86400000); // include end of day
    }

    return matchesAction && matchesEntity && matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Audit Trail</h1>
        <p className="text-sm text-slate-500 font-medium">Trace all administrative actions across the platform.</p>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
           <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input 
                 placeholder="Search by user email or entity ID..."
                 className="pl-9 h-10 w-full"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             
             <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
               <SelectTrigger className="w-[180px] h-10">
                 <SelectValue placeholder="Action Type" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="ALL">All Actions</SelectItem>
                 <SelectItem value="CREATE">Create</SelectItem>
                 <SelectItem value="UPDATE">Update</SelectItem>
                 <SelectItem value="DELETE">Delete</SelectItem>
               </SelectContent>
             </Select>

             <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
               <SelectTrigger className="w-[180px] h-10">
                 <SelectValue placeholder="Entity Type" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="ALL">All Entities</SelectItem>
                 <SelectItem value="Vehicle">Vehicle</SelectItem>
                 <SelectItem value="Purchase">Purchase</SelectItem>
                 <SelectItem value="Sale">Sale</SelectItem>
                 <SelectItem value="Document">Document</SelectItem>
               </SelectContent>
             </Select>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Timestamp</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">User</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Action</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Entity</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Entity ID</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3 w-1/3">Changes/Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                       No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50">
                      <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-600">
                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {log.userEmail}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge 
                           variant="outline" 
                           className={`uppercase text-[10px] font-black tracking-widest ${
                             log.actionType === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                             log.actionType === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                             log.actionType === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                             'bg-slate-50 text-slate-700 border-slate-200'
                           }`}
                        >
                          {log.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-slate-700">
                        {log.entityType}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs font-bold text-slate-600">
                        {log.entityId}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                         <div className="max-w-[300px] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl overflow-hidden text-xs bg-slate-50 dark:bg-slate-900 border border-slate-100 p-2 rounded-md font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(log.details, null, 2)}
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {hasMore && !loading && (
             <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex justify-center">
                <Button variant="outline" onClick={() => fetchLogs(true)}>
                   Load More History
                </Button>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
