import fs from 'fs';
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

// Add Button import
if (!code.includes("import { Button }")) {
  code = code.replace(
    "import { Input } from '@/components/ui/input';",
    "import { Input } from '@/components/ui/input';\nimport { Button } from '@/components/ui/button';"
  );
}

// Add paidEmis to EmiRecord
code = code.replace(
  /createdAt: Timestamp;/,
  "createdAt: Timestamp;\n  paidEmis?: number;"
);

// Replace TableHeader and TableBody
const replacement = `
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
              <TableRow className="border-none">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Customer Details</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Loan Amount</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Coming EMI Date</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Pending EMI</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Loading EMI records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEmis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <Calculator className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-lg">No EMI records found</p>
                      <p className="text-slate-400 text-sm">EMIs created during process document will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmis.map((emi) => {
                  const createdAtDate = emi.createdAt ? new Date(emi.createdAt.seconds * 1000) : new Date();
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
                  const timeYears = (emi.periodMonths || 0) / 12;
                  const totalInterest = principal * (rate / 100) * timeYears;
                  const totalAmount = principal + totalInterest;
                  const monthlyEmi = emi.periodMonths > 0 ? totalAmount / emi.periodMonths : 0;

                  const pendingEmiSum = overdueEmisCount * monthlyEmi;

                  const nextEmiDate = new Date(createdAtDate);
                  nextEmiDate.setMonth(nextEmiDate.getMonth() + paidEmisCount + overdueEmisCount + 1);

                  return (
                    <TableRow key={emi.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{emi.customerName || '---'}</span>
                          <span className="text-sm text-slate-500">{emi.customerContact || '---'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {emi.loanAmount ? \`₹\${emi.loanAmount.toLocaleString()}\` : '---'}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-700 dark:text-slate-300">
                        {nextEmiDate.toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-500">
                        ₹{pendingEmiSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs" title="Paid EMIs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {paidEmisCount}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-xs" title="Pending/Overdue EMIs">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            {overdueEmisCount}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 font-bold text-xs" title="Remaining EMIs">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            {remainingEmisCount}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8">View</Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
`;

code = code.replace(/<TableHeader[\s\S]*?<\/TableBody>/, replacement.trim());
fs.writeFileSync('src/pages/emi-management.tsx', code);
