import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, format } from 'date-fns';

import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export function AuditLog() {
  const { userProfile, loading: authLoading } = useAuth();
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

  const getChassis = (log: any) => {
    if (log.entityType === 'Vehicle' && log.entityId) return log.entityId;
    if (!log.details) return '-';
    if (log.details.chassisNumber) return log.details.chassisNumber;
    if (log.details.chassisNumbers && Array.isArray(log.details.chassisNumbers)) return log.details.chassisNumbers.join(', ');
    return '-';
  };

  const getCustomer = (log: any) => {
    if (log.entityType !== 'Sale') return '-';
    if (!log.details) return '-';
    return log.details.customerId || '-';
  };

  const getVendor = (log: any) => {
    if (log.entityType !== 'Purchase') return '-';
    if (!log.details) return '-';
    return log.details.vendorId || '-';
  };

  const getFileNo = (log: any) => {
    if (!log.details) return '-';
    return log.details.fileNumber || '-';
  };

  const getInvoiceNo = (log: any) => {
    if (!log.details) return '-';
    return log.details.invoiceNumber || '-';
  };

  const getStatusText = (log: any) => {
    const action = log.action || log.actionType;
    if (action === 'CREATE') return 'Record Created';
    if (action === 'UPDATE') return 'Record Updated';
    if (action === 'DELETE') return 'Record Deleted';
    return 'Status Unknown';
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
       ID: log.id,
       Timestamp: log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
       UserEmail: log.userEmail,
       ActionType: log.action || log.actionType,
       EntityType: log.entityType,
       EntityID: log.entityId,
       Chassis: getChassis(log),
       Customer: getCustomer(log),
       Vendor: getVendor(log),
       FileNo: getFileNo(log),
       InvoiceNo: getInvoiceNo(log),
       Status: getStatusText(log),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AuditTrail");
    XLSX.writeFile(wb, `Audit_Trail_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  // Client-side filtering based on state
  const filteredLogs = logs.filter(log => {
    const action = log.action || log.actionType;
    const matchesAction = actionTypeFilter === 'ALL' || action === actionTypeFilter;
    const matchesEntity = entityTypeFilter === 'ALL' || log.entityType === entityTypeFilter;
    
    const searchLower = searchQuery.toLowerCase();
    const chassis = getChassis(log).toLowerCase();
    const customer = getCustomer(log).toLowerCase();
    const vendor = getVendor(log).toLowerCase();
    const invoice = getInvoiceNo(log).toLowerCase();
    const file = String(getFileNo(log)).toLowerCase();

    const matchesSearch = !searchQuery || 
      (log.userEmail || '').toLowerCase().includes(searchLower) ||
      (log.entityId || '').toLowerCase().includes(searchLower) ||
      chassis.includes(searchLower) ||
      customer.includes(searchLower) ||
      vendor.includes(searchLower) ||
      invoice.includes(searchLower) ||
      file.includes(searchLower);

    // Date filtering (assuming log.timestamp is a Firestore Timestamp or Date)
    let matchesDate = true;
    if (dateRange?.from && log.timestamp) {
       const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
       // Handle case where dateRange.to is undefined (single date selected)
       const toDate = dateRange.to || dateRange.from;
       matchesDate = logDate >= dateRange.from && logDate <= new Date(toDate.getTime() + 86400000); // include end of day
    }

    return matchesAction && matchesEntity && matchesSearch && matchesDate;
  });

  if (authLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-500" /></div>;

  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Audit Trail</h1>
        <p className="text-sm text-slate-500 font-medium">Trace all administrative actions across the platform.</p>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
             <div className="flex flex-col md:flex-row gap-4 items-center flex-wrap">
               <div className="relative flex-1 min-w-[200px]">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                 <Input 
                   placeholder="Search by user email or entity ID..."
                   className="pl-9 h-10 w-full"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
               
               <div className="flex items-center gap-2">
                 <DateRangePicker date={dateRange} setDate={setDateRange as any} />
                 
                 <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                   <SelectTrigger className="w-[150px] h-10">
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
                   <SelectTrigger className="w-[150px] h-10">
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
                 
                 <Button onClick={handleExport} variant="outline" className="h-10 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100">
                   <Download className="mr-2 h-4 w-4" />
                   Export
                 </Button>
               </div>
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
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Chassis No</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Customer</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Vendor</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">File No</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Invoice No</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-slate-500 font-medium">
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
                             (log.action || log.actionType) === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                             (log.action || log.actionType) === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                             (log.action || log.actionType) === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                             'bg-slate-50 text-slate-700 border-slate-200'
                           }`}
                        >
                          {log.action || log.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-slate-700">
                        {log.entityType}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs font-bold text-slate-600">
                        {log.entityId}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-slate-600">
                        {getChassis(log)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-slate-600">
                        {getCustomer(log)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-slate-600">
                        {getVendor(log)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-slate-600">
                        {getFileNo(log)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono text-slate-600">
                        {getInvoiceNo(log)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                         <div className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-100 p-2 rounded-md font-medium text-slate-700 whitespace-nowrap">
                            {getStatusText(log)}
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
