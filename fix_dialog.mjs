import fs from 'fs';

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace <DialogTrigger asChild> ... </DialogTrigger>
  code = code.replace(
    /<DialogTrigger asChild(?:={true})?>\s*<Button([\s\S]*?)>([\s\S]*?)<\/Button>\s*<\/DialogTrigger>/g,
    '<DialogTrigger render={<Button$1>$2</Button>} />'
  );
  // Replace <DialogTrigger asChild> with something else if it's not a button?
  // Let's assume it's always a button for now. Or let's check what it wraps.

  fs.writeFileSync(file, code);
}

['src/pages/inventory.tsx'].forEach(fixFile);

