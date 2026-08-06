import fs from 'fs';
let code = fs.readFileSync('src/components/ProcessDocumentSheet.tsx', 'utf8');

code = code.replace(/<div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 transition-colors"[\s\S]*?setViewGallery\(\{ items: \[\{ url: selfieUrl, name: 'Selfie' \}\], index: 0 \}\);[\s\S]*?\}\}[\s\S]*?<\/div>/, '<div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden shrink-0"><img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" /></div>');

fs.writeFileSync('src/components/ProcessDocumentSheet.tsx', code);
