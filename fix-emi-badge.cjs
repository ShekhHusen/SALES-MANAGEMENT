const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

const nameRegex = /<span className="font-bold text-slate-900 dark:text-slate-100">\{emi\.customerName \|\| '--\-'\}<\/span>/;
const nameReplacement = `<div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{emi.customerName || '---'}</span>
                            {emi.isClosed && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900/50 uppercase tracking-wider">Closed</Badge>
                            )}
                          </div>`;
code = code.replace(nameRegex, nameReplacement);

fs.writeFileSync('src/pages/emi-management.tsx', code);
