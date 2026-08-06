import fs from 'fs';
let code = fs.readFileSync('src/components/ProcessDocumentSheet.tsx', 'utf8');

code = code.replace(/      <>\s*<SheetContent className="w-full sm:max-w-5xl overflow-y-auto bg-\[#F8FAFC\]">/, '  return (\n    <Sheet open={open} onOpenChange={onOpenChange}>\n      <SheetContent className="w-full sm:max-w-5xl overflow-y-auto bg-[#F8FAFC]">');

fs.writeFileSync('src/components/ProcessDocumentSheet.tsx', code);
