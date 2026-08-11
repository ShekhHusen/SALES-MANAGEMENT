import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

content = content.replace(
  '<div className="flex justify-between items-start w-full">',
  '<div className="flex justify-between items-start w-full pr-8">'
);

fs.writeFileSync('src/pages/emi-management.tsx', content);
