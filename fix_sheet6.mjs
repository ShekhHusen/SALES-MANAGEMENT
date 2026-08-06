import fs from 'fs';
let code = fs.readFileSync('src/components/ProcessDocumentSheet.tsx', 'utf8');

const lines = code.split('\n');
// find the first `<>` and replace with `return (\n    <Sheet open={open} onOpenChange={onOpenChange}>`
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<>')) {
    lines[i] = lines[i].replace('<>', 'return (\n    <Sheet open={open} onOpenChange={onOpenChange}>');
    break;
  }
}

fs.writeFileSync('src/components/ProcessDocumentSheet.tsx', lines.join('\n'));
