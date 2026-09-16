import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { tallyDb } from '@/lib/tallyFirebase';
import { Search, Link, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface TallyLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (tallyAccountId: string) => void;
  partyName: string;
}

export function TallyLinkModal({ open, onOpenChange, onLink, partyName }: TallyLinkModalProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Fetch all accounts without limit to show full list
      const q = query(collection(tallyDb, 'accounts'));
      const snap = await getDocs(q);
      const accs: any[] = [];
      snap.forEach(doc => {
        accs.push({ id: doc.id, ...doc.data() });
      });
      // Sort alphabetically by name
      accs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setAccounts(accs);
    } catch (e) {
      console.error("Error fetching Tally accounts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredAccounts = accounts.filter(a => 
    (a.name || '').toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Tally Account to {partyName}</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search accounts..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-lg">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : paginatedAccounts.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="divide-y flex-1">
                {paginatedAccounts.map(acc => (
                  <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">{acc.name}</h4>
                      <p className="text-xs text-slate-500">{acc.group || 'No Group'}</p>
                    </div>
                    <Button 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        onLink(acc.id);
                        onOpenChange(false);
                      }}
                    >
                      <Link className="h-4 w-4 mr-2" /> Link
                    </Button>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="p-3 border-t bg-slate-50 dark:bg-slate-900 flex items-center justify-between sticky bottom-0">
                  <span className="text-xs text-slate-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAccounts.length)} of {filteredAccounts.length}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              No accounts found.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
