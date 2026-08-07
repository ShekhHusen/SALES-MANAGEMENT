import fs from 'fs';
let code = fs.readFileSync('src/pages/inventory.tsx', 'utf8');

// Replace standard asChild with render prop
code = code.replace(
  /<DropdownMenuTrigger asChild>\s*<Button([\s\S]*?)>([\s\S]*?)<\/Button>\s*<\/DropdownMenuTrigger>/g,
  '<DropdownMenuTrigger render={<Button$1>$2</Button>} />'
);

// Also look for other occurrences of asChild that might be causing issues.
fs.writeFileSync('src/pages/inventory.tsx', code);
