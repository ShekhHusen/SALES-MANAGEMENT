import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen, Users, ArrowRight, Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function Accounts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tally/daybook')
      .then(res => res.json())
      .then(json => {
        if (json.success) setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load data");
        setLoading(false);
      });
  }, []);

  // Group by party
  const partyGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    data.forEach(item => {
      const party = item.party || 'Unknown';
      if (!map.has(party)) map.set(party, []);
      map.get(party)!.push(item);
    });
    return map;
  }, [data]);

  const filteredParties = useMemo(() => {
    let parties = Array.from(partyGroups.keys()) as string[];
    parties.sort();
    if (search) {
      parties = parties.filter((p: string) => p.toLowerCase().includes(search.toLowerCase()));
    }
    return parties;
  }, [partyGroups, search]);

  const totalTransactionsCount = data.length;
  
  const calculateTotal = (txns: any[]) => {
      let tot = 0;
      txns.forEach(t => {
         const amt = parseFloat(t.amount) || 0;
         tot += amt;
      });
      return tot.toFixed(2);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col pt-2">
      <div className="flex flex-col gap-1 shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
           <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
           Accounts Ledger
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Review Daybook transactions organized by Party ledgers automatically mapped from Tally XML.
        </p>
      </div>

      <div className="flex flex-1 flex-col md:flex-row gap-6 overflow-hidden">
         {/* Left Side: Party List */}
         <Card className="flex flex-col md:w-1/3 border-slate-200 dark:border-slate-800 shadow-sm shrink-0 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ledgers..." 
                    className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                   <span>{filteredParties.length} Ledgers</span>
                   <span>{totalTransactionsCount} Txns</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-1 sidebar-scrollbar group">
                {loading ? (
                   <div className="flex items-center justify-center p-8 text-slate-400 text-sm">Loading...</div>
                ) : filteredParties.length > 0 ? (
                    filteredParties.map((party) => {
                        const txns = partyGroups.get(party) || [];
                        const isSelected = selectedParty === party;
                        return (
                            <button
                               key={party}
                               onClick={() => setSelectedParty(party)}
                               className={cn(
                                   "w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors outline-none",
                                   isSelected ? "bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60" : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                               )}
                            >
                               <div className="flex items-center gap-3 overflow-hidden">
                                  <div className={cn("w-8 h-8 rounded-full flex flex-col items-center justify-center shrink-0 border", isSelected ? "bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-400" : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400")}>
                                     <Users className="w-4 h-4" />
                                  </div>
                                  <div className="truncate">
                                      <p className={cn("text-sm font-bold truncate", isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300")}>{party}</p>
                                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">{txns.length} entries</p>
                                  </div>
                               </div>
                               <ArrowRight className={cn("w-4 h-4 shrink-0 transition-opacity", isSelected ? "opacity-100 text-indigo-600 dark:text-indigo-400" : "opacity-0 group-hover:opacity-30")} />
                            </button>
                        );
                    })
                ) : (
                    <div className="flex items-center justify-center p-12 text-center text-slate-500 text-sm font-medium">No parties found in Daybook.</div>
                )}
             </div>
         </Card>

         {/* Right Side: Ledger Detail View */}
         <Card className="flex-1 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
             {selectedParty ? (
                 <>
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-500" />
                                    {selectedParty}
                                </CardTitle>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">Detailed Ledger View</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Transaction Value</p>
                                <p className="text-xl font-mono font-black text-slate-900 dark:text-white">
                                    ₹ {calculateTotal(partyGroups.get(selectedParty) || [])}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Vch No.</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {(partyGroups.get(selectedParty) || []).map((txn, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-3 font-medium">{txn.date}</td>
                                        <td className="px-6 py-3">
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border", 
                                                txn.type.toLowerCase().includes('receipt') ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" :
                                                txn.type.toLowerCase().includes('payment') ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
                                                txn.type.toLowerCase().includes('sale') ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" :
                                                "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                            )}>
                                                {txn.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-xs">{txn.number}</td>
                                        <td className="px-6 py-3 font-bold text-slate-900 dark:text-white text-right">₹ {parseFloat(txn.amount || '0').toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/30 dark:bg-slate-900/10">
                     <FileText className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
                     <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Select an Account</h3>
                     <p className="text-sm font-medium text-slate-500 max-w-sm">Choose a ledger party from the left sidebar to view their complete transaction history and totals.</p>
                 </div>
             )}
         </Card>
      </div>
    </div>
  );
}
