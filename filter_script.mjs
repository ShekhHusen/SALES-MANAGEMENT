import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

// Imports
content = content.replace(
  "import { Input } from '@/components/ui/input';",
  "import { Input } from '@/components/ui/input';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';"
);

// State
content = content.replace(
  "const [searchQuery, setSearchQuery] = useState('');",
  "const [searchQuery, setSearchQuery] = useState('');\n  const [emiMonthFilter, setEmiMonthFilter] = useState('');\n  const [statusFilter, setStatusFilter] = useState('all');"
);

// We need to move the calculation logic from render mapping to a memoized array or just before filtering
const originalFilter = `  const filteredEmis = emis.filter(emi => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (emi.customerName || '').toLowerCase().includes(searchLower) ||
      (emi.chassisNumber || '').toLowerCase().includes(searchLower) ||
      (emi.customerContact || '').toLowerCase().includes(searchLower)
    );
  });`;

const newFilter = `  const enhancedEmis = emis.map(emi => {
    const createdAtDate = emi.saleDate ? new Date(emi.saleDate.seconds * 1000) : (emi.createdAt ? new Date(emi.createdAt.seconds * 1000) : new Date());
    const now = new Date();
    
    let monthsPassed = (now.getFullYear() - createdAtDate.getFullYear()) * 12 + now.getMonth() - createdAtDate.getMonth();
    if (now.getDate() < createdAtDate.getDate()) {
      monthsPassed--;
    }
    if (monthsPassed < 0) monthsPassed = 0;

    const paidEmisCount = emi.paidEmis || 0;
    let overdueEmisCount = monthsPassed - paidEmisCount;
    if (overdueEmisCount < 0) overdueEmisCount = 0;
    
    let remainingEmisCount = emi.periodMonths - paidEmisCount - overdueEmisCount;
    if (remainingEmisCount < 0) remainingEmisCount = 0;

    const principal = emi.loanAmount || 0;
    const rate = emi.interestRate || 0;
    const monthlyRate = rate / 12 / 100;
    const months = emi.periodMonths || 0;
    const monthlyEmi = months > 0 
      ? (rate === 0 ? principal / months : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
      : 0;

    const pendingEmiSum = overdueEmisCount * monthlyEmi;

    const nextEmiDate = new Date(createdAtDate);
    nextEmiDate.setMonth(nextEmiDate.getMonth() + paidEmisCount + overdueEmisCount + 1);

    const isCompleted = paidEmisCount >= months;

    return {
      ...emi,
      overdueEmisCount,
      remainingEmisCount,
      pendingEmiSum,
      nextEmiDate,
      monthlyEmi,
      isCompleted
    };
  });

  const filteredEmis = enhancedEmis.filter(emi => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      (emi.customerName || '').toLowerCase().includes(searchLower) ||
      (emi.chassisNumber || '').toLowerCase().includes(searchLower) ||
      (emi.customerContact || '').toLowerCase().includes(searchLower)
    );

    let matchesMonth = true;
    if (emiMonthFilter && !emi.isCompleted) {
      const filterDate = new Date(emiMonthFilter + '-01');
      matchesMonth = emi.nextEmiDate.getFullYear() === filterDate.getFullYear() && emi.nextEmiDate.getMonth() === filterDate.getMonth();
    }

    let matchesStatus = true;
    if (statusFilter === 'overdue') {
      matchesStatus = emi.overdueEmisCount > 0;
    } else if (statusFilter === 'pending') {
      matchesStatus = emi.remainingEmisCount > 0 || emi.overdueEmisCount > 0;
    } else if (statusFilter === 'completed') {
      matchesStatus = emi.isCompleted;
    }

    return matchesSearch && matchesMonth && matchesStatus;
  });`;

content = content.replace(originalFilter, newFilter);

const uiSearch = `<div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by customer name, chassis or contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner"
            />
          </div>`;

const uiReplace = `<div className="flex flex-wrap gap-4 items-center flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search customer, chassis..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner"
              />
            </div>
            <div className="w-full max-w-[180px]">
              <Input 
                type="month"
                value={emiMonthFilter}
                onChange={(e) => setEmiMonthFilter(e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner"
                title="Filter by Coming EMI Month"
              />
            </div>
            <div className="w-full max-w-[160px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>`;

content = content.replace(uiSearch, uiReplace);


// Update mapping
const oldMapping = `filteredEmis.map((emi) => {
                  const createdAtDate = emi.saleDate ? new Date(emi.saleDate.seconds * 1000) : (emi.createdAt ? new Date(emi.createdAt.seconds * 1000) : new Date());
                  const now = new Date();
                  
                  let monthsPassed = (now.getFullYear() - createdAtDate.getFullYear()) * 12 + now.getMonth() - createdAtDate.getMonth();
                  if (now.getDate() < createdAtDate.getDate()) {
                    monthsPassed--;
                  }
                  if (monthsPassed < 0) monthsPassed = 0;

                  const paidEmisCount = emi.paidEmis || 0;
                  let overdueEmisCount = monthsPassed - paidEmisCount;
                  if (overdueEmisCount < 0) overdueEmisCount = 0;
                  
                  let remainingEmisCount = emi.periodMonths - paidEmisCount - overdueEmisCount;
                  if (remainingEmisCount < 0) remainingEmisCount = 0;

                  const principal = emi.loanAmount || 0;
                  const rate = emi.interestRate || 0;
                  const monthlyRate = rate / 12 / 100;
                  const months = emi.periodMonths || 0;
                  const monthlyEmi = months > 0 
                    ? (rate === 0 ? principal / months : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
                    : 0;

                  const pendingEmiSum = overdueEmisCount * monthlyEmi;

                  const nextEmiDate = new Date(createdAtDate);
                  nextEmiDate.setMonth(nextEmiDate.getMonth() + paidEmisCount + overdueEmisCount + 1);

                  return (`;

const newMapping = `filteredEmis.map((emi) => {
                  const { overdueEmisCount, remainingEmisCount, pendingEmiSum, nextEmiDate, monthlyEmi, isCompleted } = emi;

                  return (`;

content = content.replace(oldMapping, newMapping);

fs.writeFileSync('src/pages/emi-management.tsx', content);
