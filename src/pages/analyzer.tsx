import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Vehicle, Company, Model, Party, Purchase, Sale } from '@/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Filter, ActivitySquare, ArrowUp, ArrowDown, ArrowUpDown, FilterIcon, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle } from '@/components/ui/popover';
import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { Pagination } from '@/components/Pagination';
import { useGlobalData } from '@/contexts/GlobalDataContext';

export function Analyzer() {
  const { vehicles, companies, models, parties, purchases, sales } = useGlobalData();

  const [filterVendor, setFilterVendor] = useState('ALL');
  const [filterChassis, setFilterChassis] = useState('');
  const [filterRegNum, setFilterRegNum] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterModel, setFilterModel] = useState('ALL');
  const [filterColor, setFilterColor] = useState('ALL');
  const [filterContact, setFilterContact] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterBluebook, setFilterBluebook] = useState('ALL');
  const [filterNaamsari, setFilterNaamsari] = useState('ALL');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  type SortKey = 'status' | 'salesDate' | 'fileNo' | 'purchase' | 'vehicle' | 'document' | 'customer';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' } | null>(null);
  const [activePopover, setActivePopover] = useState<SortKey | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(5);

  // View Sheet state
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewSale, setViewSale] = useState<any>(null);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig(direction ? { key, direction } : null);
  };

  const isFilterActive = (key: SortKey) => {
    switch (key) {
      case 'status': return filterStatus !== 'ALL';
      case 'purchase': return filterVendor !== 'ALL';
      case 'vehicle': return filterCompany !== 'ALL' || filterModel !== 'ALL' || filterColor !== 'ALL';
      case 'document': return filterBluebook !== 'ALL' || filterNaamsari !== 'ALL';
      default: return false;
    }
  };

  const vendors = useMemo(() => parties.filter(p => p.type === 'vendor'), [parties]);
  const customers = useMemo(() => parties.filter(p => p.type === 'customer'), [parties]);
  const uniqueColors = useMemo(() => Array.from(new Set(vehicles.map(v => v.color).filter(Boolean))), [vehicles]);

  const resetFilters = () => {
    setFilterVendor('ALL');
    setFilterChassis('');
    setFilterRegNum('');
    setFilterCustomer('');
    setFilterCompany('ALL');
    setFilterModel('ALL');
    setFilterColor('ALL');
    setFilterContact('');
    setFilterStatus('ALL');
    setFilterBluebook('ALL');
    setFilterNaamsari('ALL');
  };

  const filteredData = useMemo(() => {
    let result = vehicles.filter(v => {
      const matchStatus = filterStatus === 'ALL' || v.status === filterStatus;
      const matchBluebook = filterBluebook === 'ALL' || v.bluebookStatus === filterBluebook;
      const matchNaamsari = filterNaamsari === 'ALL' || v.naamsariStatus === filterNaamsari;
      const matchCompany = filterCompany === 'ALL' || v.companyId === filterCompany;
      const matchModel = filterModel === 'ALL' || v.modelId === filterModel;
      const matchColor = filterColor === 'ALL' || v.color.toLowerCase() === filterColor.toLowerCase();
      
      const matchChassis = filterChassis === '' || v.chassisNumber.toLowerCase().includes(filterChassis.toLowerCase());
      const matchRegNum = filterRegNum === '' || (v.registrationNumber || '').toLowerCase().includes(filterRegNum.toLowerCase());

      const purchase = purchases.find(p => p.id === v.purchaseId || (p.chassisNumbers && p.chassisNumbers.includes(v.chassisNumber)));
      const myVendor = purchase ? parties.find(p => p.id === purchase.vendorId) : null;
      const matchVendor = filterVendor === 'ALL' || myVendor?.id === filterVendor;

      const sale = v.saleId ? sales.find(s => s.id === v.saleId) : sales.find(s => s.chassisNumber === v.chassisNumber);
      const myCustomer = sale ? parties.find(p => p.id === sale.customerId) : null;
      const matchCustomerName = filterCustomer === '' || (myCustomer?.name || '').toLowerCase().includes(filterCustomer.toLowerCase());
      const matchContact = filterContact === '' || (myCustomer?.contactNumber || '').toLowerCase().includes(filterContact.toLowerCase());

      return matchStatus && matchBluebook && matchNaamsari && matchCompany && matchModel && matchColor && matchChassis && matchRegNum && matchVendor && matchCustomerName && matchContact;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const saleA = a.saleId ? sales.find(s => s.id === a.saleId) : sales.find(s => s.chassisNumber === a.chassisNumber);
        const saleB = b.saleId ? sales.find(s => s.id === b.saleId) : sales.find(s => s.chassisNumber === b.chassisNumber);
        const purchaseA = purchases.find(p => p.id === a.purchaseId || (p.chassisNumbers && p.chassisNumbers.includes(a.chassisNumber)));
        const purchaseB = purchases.find(p => p.id === b.purchaseId || (p.chassisNumbers && p.chassisNumbers.includes(b.chassisNumber)));

        let valA: any; let valB: any;
        switch (sortConfig.key) {
          case 'status':
            valA = a.status; valB = b.status; break;
          case 'salesDate':
            valA = saleA?.date ? new Date(saleA.date).getTime() : 0;
            valB = saleB?.date ? new Date(saleB.date).getTime() : 0;
            break;
          case 'fileNo':
            valA = saleA?.fileNumber ?? Number.MAX_SAFE_INTEGER;
            valB = saleB?.fileNumber ?? Number.MAX_SAFE_INTEGER;
            break;
          case 'purchase':
            valA = purchaseA?.date ? new Date(purchaseA.date).getTime() : 0;
            valB = purchaseB?.date ? new Date(purchaseB.date).getTime() : 0;
            break;
          case 'vehicle':
            const modelA = models.find(m => m.id === a.modelId)?.name || '';
            const modelB = models.find(m => m.id === b.modelId)?.name || '';
            valA = `${modelA} ${a.color}`; valB = `${modelB} ${b.color}`;
            break;
          case 'document':
            valA = a.bluebookStatus; valB = b.bluebookStatus;
            break;
          case 'customer':
            const customerA = saleA ? parties.find(p => p.id === saleA.customerId) : null;
            const customerB = saleB ? parties.find(p => p.id === saleB.customerId) : null;
            valA = customerA?.name || ''; valB = customerB?.name || '';
            break;
        }

        if (valA === valB) return 0;
        if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
    }

    return result;
  }, [vehicles, filterStatus, filterBluebook, filterNaamsari, filterCompany, filterModel, filterColor, filterChassis, filterRegNum, filterVendor, filterCustomer, filterContact, purchases, parties, sales, sortConfig, models]);

  const totalItems = filteredData.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const paginatedData = itemsPerPage === 'all' ? filteredData : filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on filter
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterBluebook, filterNaamsari, filterCompany, filterModel, filterColor, filterChassis, filterRegNum, filterVendor, filterCustomer, filterContact]);

  const renderColumnFilter = (key: SortKey) => {
    switch (key) {
      case 'status':
        return (
          <div className="space-y-1 p-3 w-[200px]">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Status</label>
            <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setActivePopover(null); }}>
              <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ready-to-purchase">Ready to Purchase (RtP)</SelectItem>
                <SelectItem value="in-stock">In-Stock</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'purchase':
        return (
          <div className="space-y-1 p-3 w-[200px]">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Vendor</label>
            <Select value={filterVendor} onValueChange={(val) => { setFilterVendor(val); setActivePopover(null); }}>
              <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Vendors</SelectItem>
                {vendors.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'vehicle':
        return (
          <div className="space-y-3 p-3 w-[200px]">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Company</label>
              <Select value={filterCompany} onValueChange={(val) => { setFilterCompany(val); }}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Companies</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Model</label>
              <Select value={filterModel} onValueChange={(val) => { setFilterModel(val); }}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full" disabled={filterCompany === 'ALL' && models.length === 0}>
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Models</SelectItem>
                  {models.filter(m => filterCompany === 'ALL' || m.companyId === filterCompany).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Color</label>
              <Select value={filterColor} onValueChange={(val) => { setFilterColor(val); setActivePopover(null); }}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                  <SelectValue placeholder="All Colors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Colors</SelectItem>
                  {uniqueColors.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'document':
        return (
          <div className="space-y-3 p-3 w-[200px]">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Bluebook</label>
              <Select value={filterBluebook} onValueChange={(val) => { setFilterBluebook(val); }}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="Not Received">Pending</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Namsari</label>
              <Select value={filterNaamsari} onValueChange={(val) => { setFilterNaamsari(val); setActivePopover(null); }}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Names of JBMT">Names of JBMT</SelectItem>
                  <SelectItem value="Customer Done">Customer Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const exportAnalyzer = () => {
    try {
      const data = filteredData.map(v => {
        const sale = v.saleId ? sales.find(s => s.id === v.saleId) : sales.find(s => s.chassisNumber === v.chassisNumber);
        const purchase = purchases.find(p => p.id === v.purchaseId || (p.chassisNumbers && p.chassisNumbers.includes(v.chassisNumber)));
        const model = models.find(m => m.id === v.modelId)?.name || '';
        const company = companies.find(c => c.id === v.companyId)?.name || '';
        const vendor = purchase ? parties.find(p => p.id === purchase.vendorId)?.name : '';
        const customer = sale ? parties.find(p => p.id === sale.customerId) : null;

        return {
          'Status': v.status,
          'Sales Date': sale?.date ? new Date(sale.date as any).toLocaleDateString() : '',
          'File No.': sale?.fileNumber || '',
          'Purchase Date': purchase?.date ? new Date(purchase.date as any).toLocaleDateString() : '',
          'Vendor Name': vendor || '',
          'Company': company,
          'Model': model,
          'Color': v.color,
          'Chassis Number': v.chassisNumber,
          'Bluebook': v.bluebookStatus,
          'Naamsari': v.naamsariStatus,
          'Customer Name': customer?.name || '',
          'Customer Contact': customer?.contactNumber || ''
        };
      });

      if (data.length === 0) {
        toast.error("No data to export.");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Analyzer_Data');
      XLSX.writeFile(wb, 'Analyzer_Records.xlsx');
      toast.success('Analyzer records exported');
    } catch(err) {
      toast.error('Failed to export analyzer records');
    }
  };

  return (
    <>
      <div className="flex-1 p-4 lg:p-8 pt-0 lg:pt-0 overflow-hidden h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-[#0f172a] relative rounded-2xl">
      <div className="flex items-center justify-between shrink-0 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-sm border border-blue-200">
            <ActivitySquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Data Analyzer</h1>
          </div>
        </div>
        <Button variant="outline" className="h-10 rounded-lg text-slate-600 border-slate-200 dark:border-slate-800" onClick={exportAnalyzer}>
          <Download className="h-4 w-4 mr-2" />
          Export Records
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch flex-1 min-h-0 overflow-hidden">
        <div className={`bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 space-y-3 w-full lg:w-[250px] shrink-0 relative overflow-y-auto overflow-x-hidden transition-all duration-300 lg:max-h-none lg:h-full ${isFilterExpanded ? 'max-h-[50vh]' : 'max-h-[64px] overflow-hidden'}`}>
          <div className="absolute top-0 right-0 p-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="flex flex-col gap-3 relative z-10">
            <div 
              className="flex items-center justify-between text-slate-800 dark:text-slate-200 cursor-pointer lg:cursor-default"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-extrabold uppercase tracking-tight">Filter Criteria</h2>
              </div>
              <div className="lg:hidden">
                {isFilterExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
              </div>
            </div>
            <div className={`flex flex-col gap-3 ${isFilterExpanded ? 'flex' : 'hidden lg:flex'}`}>
              <Button onClick={resetFilters} variant="outline" size="sm" className="w-full h-8 font-bold text-slate-600 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm bg-white dark:bg-[#0f172a]">
                <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Reset Filters
              </Button>
            </div>
          </div>

          <div className={`gap-3.5 relative z-10 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 ${isFilterExpanded ? 'grid' : 'hidden lg:grid'}`}>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Chassis Number</label>
              <Input placeholder="Search chassis..." value={filterChassis} onChange={e => setFilterChassis(e.target.value)} className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors placeholder:font-semibold placeholder:text-slate-400 placeholder:text-[10px] uppercase w-full" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Reg. Number</label>
              <Input placeholder="Search reg number..." value={filterRegNum} onChange={e => setFilterRegNum(e.target.value)} className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors placeholder:font-semibold placeholder:text-slate-400 placeholder:text-[10px] uppercase w-full" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Customer Name</label>
              <Input placeholder="Search customer..." value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors placeholder:font-semibold placeholder:text-slate-400 placeholder:text-[10px] uppercase w-full" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Customer Contact</label>
              <Input placeholder="Search contact..." value={filterContact} onChange={e => setFilterContact(e.target.value)} className="h-8 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 font-bold text-[10px] shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors placeholder:font-semibold placeholder:text-slate-400 placeholder:text-[10px] w-full" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 w-full min-w-0 flex flex-col max-h-[400px] lg:max-h-full lg:h-full">
          <div className="overflow-auto flex-1 h-full w-full relative rounded-2xl [&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-[#0f172a] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
              <TableRow className="bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-100 dark:hover:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                {(
                  [
                    { label: 'Status', key: 'status' as SortKey, filterable: true, sortable: true },
                    { label: 'Sales Date', key: 'salesDate' as SortKey, filterable: false, sortable: true },
                    { label: 'File No.', key: 'fileNo' as SortKey, filterable: false, sortable: true },
                    { label: 'Purchase Details', key: 'purchase' as SortKey, filterable: true, sortable: true },
                    { label: 'Vehicle Details', key: 'vehicle' as SortKey, filterable: true, sortable: true },
                    { label: 'Document Status', key: 'document' as SortKey, filterable: true, sortable: true },
                    { label: 'Customer Details', key: 'customer' as SortKey, filterable: false, sortable: false },
                    { label: 'Action', key: 'action' as SortKey, filterable: false, sortable: false },
                  ]
                ).map(col => (
                  <TableHead 
                    key={col.key}
                    className={`py-2.5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors ${col.sortable ? 'hover:text-slate-800 dark:hover:text-slate-200 select-none' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className={`flex items-center gap-1.5 ${col.sortable ? 'cursor-pointer' : ''}`} onClick={() => col.sortable && requestSort(col.key)}>
                        {col.label}
                        {col.sortable && (
                          <div className="flex bg-slate-200/50 rounded p-0.5">
                            {sortConfig?.key === col.key && sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-slate-800 dark:text-slate-200" />
                            ) : sortConfig?.key === col.key && sortConfig.direction === 'desc' ? (
                              <ArrowDown className="w-3 h-3 text-slate-800 dark:text-slate-200" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        )}
                      </div>
                      {col.filterable && (
                        <Popover open={activePopover === col.key} onOpenChange={(open) => setActivePopover(open ? col.key : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-200/50 -mr-2">
                              <FilterIcon className={`w-3.5 h-3.5 ${isFilterActive(col.key) ? 'text-blue-600 fill-blue-600/20' : 'text-slate-500'}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            {renderColumnFilter(col.key)}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map(v => {
                const myPurchase = purchases.find(p => p.id === v.purchaseId || (p.chassisNumbers && p.chassisNumbers.includes(v.chassisNumber)));
                const myVendor = myPurchase ? parties.find(p => p.id === myPurchase.vendorId) : null;
                
                const sale = v.saleId ? sales.find(s => s.id === v.saleId) : sales.find(s => s.chassisNumber === v.chassisNumber);
                const myCustomer = sale ? parties.find(p => p.id === sale.customerId) : null;

                const cComp = companies.find(c => c.id === v.companyId);
                const cModel = models.find(m => m.id === v.modelId);

                const isRtp = v.status === 'ready-to-purchase';
                const isInStock = v.status === 'in-stock';
                const isSold = v.status === 'sold';

                return (
                  <TableRow key={v.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800">
                    <TableCell className="px-6 py-2.5">
                      {isRtp && <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 border-none font-black text-[9px] uppercase tracking-wider">RtP</Badge>}
                      {isInStock && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black text-[9px] uppercase tracking-wider">In-Stock</Badge>}
                      {isSold && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] uppercase tracking-wider">Sold</Badge>}
                    </TableCell>
                    
                    {/* SALES DATE */}
                    <TableCell className="px-6 py-2.5">
                      {isSold && sale?.date ? (
                        <span className="font-bold text-xs text-slate-700 uppercase">
                          {sale.date.toDate().toLocaleDateString('en-GB', {year: 'numeric', month: 'short', day: '2-digit'}).replace(/ /g, '-')}
                        </span>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-none font-bold text-[9px] uppercase tracking-tighter">
                          {isRtp ? 'RtP' : 'In-Stock'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* FILE NO. */}
                    <TableCell className="px-6 py-2.5">
                      {isSold && sale?.fileNumber ? (
                        <span className="font-bold text-xs text-slate-700 uppercase">#{sale.fileNumber}</span>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-none font-bold text-[9px] uppercase tracking-tighter">
                          {isRtp ? 'RtP' : 'In-Stock'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* PURCHASE DETAILS */}
                    <TableCell className="px-6 py-2.5">
                      {isRtp ? (
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-none font-bold text-[9px] uppercase tracking-tighter">RtP</Badge>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase">
                            {myPurchase?.date ? myPurchase.date.toDate().toLocaleDateString('en-GB', {year: 'numeric', month: 'short', day: '2-digit'}).replace(/ /g, '-') : '-'}
                          </span>
                          <span className="font-bold text-[10px] text-slate-500 uppercase">{myVendor?.name || '-'}</span>
                          <span className="font-black text-[9px] text-blue-600 tracking-wider">INV: {myPurchase?.invoiceNumber || '-'}</span>
                        </div>
                      )}
                    </TableCell>

                    {/* VEHICLE DETAILS */}
                    <TableCell className="px-6 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-sm uppercase text-slate-900 dark:text-slate-100">{v.chassisNumber}</span>
                        <span className="font-bold text-[10px] text-slate-500 uppercase">
                          {cComp?.name || '-'} - {cModel?.name || '-'} <span className="text-blue-600">• {v.color || '-'}</span>
                        </span>
                      </div>
                    </TableCell>

                    {/* DOCUMENT STATUS */}
                    <TableCell className="px-6 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 px-1">
                          {v.registrationNumber || 'UNREGISTERED'}
                        </span>
                        <div className="flex items-center gap-1 px-1">
                          <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border-none ${v.bluebookStatus === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                            {v.bluebookStatus}
                          </Badge>
                          <span className="text-slate-300">-</span>
                          <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border-none ${v.naamsariStatus === 'Customer Done' ? 'bg-indigo-100 text-indigo-700' : v.naamsariStatus === 'Names of JBMT' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                            {v.naamsariStatus}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    {/* CUSTOMER DETAILS */}
                    <TableCell className="px-6 py-2.5">
                      {isSold ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase">{myCustomer?.name || '-'}</span>
                          <span className="font-bold text-[10px] text-slate-500 uppercase">{myCustomer?.address || '-'} <span className="ml-0.5">• {myCustomer?.contactNumber || '-'}</span></span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-none font-bold text-[9px] uppercase tracking-tighter">
                          {isRtp ? 'RtP' : 'In-Stock'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* ACTION DETAILS */}
                    <TableCell className="px-6 py-2.5">
                      {isSold && sale ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-[10px] rounded-lg shadow-sm px-2 flex items-center"
                          onClick={() => {
                            setViewSale(sale);
                            setViewSheetOpen(true);
                          }}
                        >
                          VIEW
                        </Button>
                      ) : (
                         <span className="opacity-0">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                       <Filter className="w-8 h-8 opacity-20" />
                       <span className="font-semibold">No data matches the current filters.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalItems={totalItems}
          />
        </div>
      </div>
    </div>
    </div>
    <ProcessDocumentSheet 
      open={viewSheetOpen} 
      onOpenChange={setViewSheetOpen} 
      viewSale={viewSale} 
    />
    </>
  );
}
