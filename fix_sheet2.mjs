import fs from 'fs';
let code = fs.readFileSync('src/components/ProcessDocumentSheet.tsx', 'utf8');

code = code.replace(/<div className="flex justify-center mb-4">\s*<div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden shrink-0"><img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" \/><\/div>\s*\);\s*\}/, '<div className="flex justify-center mb-4"><div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden shrink-0"><img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" /></div></div>\n                  );\n                }');

fs.writeFileSync('src/components/ProcessDocumentSheet.tsx', code);
