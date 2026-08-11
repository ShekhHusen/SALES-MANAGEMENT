import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

content = content.replace(
  '  fileNumber?: string;',
  '  fileNumber?: string;\n  saleDate?: Timestamp;'
);

content = content.replace(
  /const startDate = selectedEmiForView\.createdAt \? new Date\(selectedEmiForView\.createdAt\.seconds \* 1000\) \: new Date\(\);/g,
  "const startDate = selectedEmiForView.saleDate ? new Date(selectedEmiForView.saleDate.seconds * 1000) : (selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date());"
);

content = content.replace(
  /const createdAtDate = emi\.createdAt \? new Date\(emi\.createdAt\.seconds \* 1000\) : new Date\(\);/g,
  "const createdAtDate = emi.saleDate ? new Date(emi.saleDate.seconds * 1000) : (emi.createdAt ? new Date(emi.createdAt.seconds * 1000) : new Date());"
);

fs.writeFileSync('src/pages/emi-management.tsx', content);
