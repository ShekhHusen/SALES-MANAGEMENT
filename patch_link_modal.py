import re

with open('src/components/TallyLinkModal.tsx', 'r') as f:
    content = f.read()

# Fix import
imports_old = "import { Search, Link, Loader2 } from 'lucide-react';"
imports_new = "import { Search, Link, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';"
content = content.replace(imports_old, imports_new)

# Fix fetchAccounts
fetch_old = """  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Just fetching all or limit to 100
      const q = query(collection(tallyDb, 'accounts'), limit(200));
      const snap = await getDocs(q);
      const accs: any[] = [];
      snap.forEach(doc => {
        accs.push({ id: doc.id, ...doc.data() });
      });
      setAccounts(accs);
    } catch (e) {
      console.error("Error fetching Tally accounts:", e);
    } finally {
      setLoading(false);
    }
  };"""

fetch_new = """  const fetchAccounts = async () => {
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
  };"""
content = content.replace(fetch_old, fetch_new)

# Fix state and pagination
state_old = """  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');"""

state_new = """  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;"""
content = content.replace(state_old, state_new)

# Reset page on search
effect_search_old = """  const filteredAccounts = accounts.filter(a => 
    (a.name || '').toLowerCase().includes(search.toLowerCase())
  );"""

effect_search_new = """  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredAccounts = accounts.filter(a => 
    (a.name || '').toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);"""
content = content.replace(effect_search_old, effect_search_new)

# Replace the mapped list with paginatedAccounts and add pagination controls
render_old = """          ) : filteredAccounts.length > 0 ? (
            <div className="divide-y">
              {filteredAccounts.map(acc => (
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
          ) : ("""

render_new = """          ) : paginatedAccounts.length > 0 ? (
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
          ) : ("""

content = content.replace(render_old, render_new)

with open('src/components/TallyLinkModal.tsx', 'w') as f:
    f.write(content)

