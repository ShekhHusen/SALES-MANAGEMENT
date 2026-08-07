import fs from 'fs';

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace <DialogTrigger asChild> ... </DialogTrigger>
  code = code.replace(
    /<DialogTrigger asChild(?:={true})?>\s*<Button([\s\S]*?)>([\s\S]*?)<\/Button>\s*<\/DialogTrigger>/g,
    '<DialogTrigger render={<Button$1>$2</Button>} />'
  );
  
  // Replace <PopoverTrigger asChild> ... </PopoverTrigger>
  code = code.replace(
    /<PopoverTrigger asChild(?:={true})?>\s*<Button([\s\S]*?)>([\s\S]*?)<\/Button>\s*<\/PopoverTrigger>/g,
    '<PopoverTrigger render={<Button$1>$2</Button>} />'
  );

  fs.writeFileSync(file, code);
}

['src/components/QuickAdd.tsx', 'src/pages/purchases.tsx', 'src/pages/sales.tsx', 'src/components/ui/date-range-picker.tsx'].forEach(fixFile);

