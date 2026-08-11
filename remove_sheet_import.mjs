import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

content = content.replace("import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';\n", '');

fs.writeFileSync('src/pages/emi-management.tsx', content);
