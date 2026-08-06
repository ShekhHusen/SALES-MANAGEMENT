import fs from 'fs';
let code = fs.readFileSync('src/components/ProcessDocumentSheet.tsx', 'utf8');

code = code.replace(/return \(\s*<Sheet open=\{open\} onOpenChange=\{onOpenChange\}>/, 'return (\n                      <>');

fs.writeFileSync('src/components/ProcessDocumentSheet.tsx', code);
