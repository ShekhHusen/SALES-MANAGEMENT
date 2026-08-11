import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

content = content.replace(/<Sheet open=\{!!selectedEmiForView\}/, '<Dialog open={!!selectedEmiForView}');
content = content.replace(/<SheetContent side="right" className="w-full sm:w-\[600px\] lg:w-\[800px\] sm:max-w-none p-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">/, '<DialogContent className="w-full sm:max-w-3xl lg:max-w-4xl p-0 flex flex-col bg-slate-50 dark:bg-slate-900 max-h-[90vh]">');
content = content.replace(/<SheetHeader /g, '<DialogHeader ');
content = content.replace(/<SheetTitle /g, '<DialogTitle ');
content = content.replace(/<\/SheetTitle>/g, '</DialogTitle>');
content = content.replace(/<\/SheetHeader>/g, '</DialogHeader>');
content = content.replace(/<\/SheetContent>/g, '</DialogContent>');
content = content.replace(/<\/Sheet>/g, '</Dialog>');

fs.writeFileSync('src/pages/emi-management.tsx', content);
