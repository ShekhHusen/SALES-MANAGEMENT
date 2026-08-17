const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

// Update EmiRecord interface
code = code.replace(
  "  saleDate?: Timestamp;\n}",
  "  saleDate?: Timestamp;\n  startDate?: string;\n  isClosed?: boolean;\n  closedAt?: Timestamp;\n  closedReason?: string;\n}"
);

// Update createdAtDate logic
const createdAtRegex = /const createdAtDate = emi\.saleDate \? new Date\(emi\.saleDate\.seconds \* 1000\) : \(emi\.createdAt \? new Date\(emi\.createdAt\.seconds \* 1000\) : new Date\(\)\);/;
const createdAtReplacement = `const createdAtDate = emi.startDate ? new Date(emi.startDate) : (emi.saleDate ? new Date(emi.saleDate.seconds * 1000) : (emi.createdAt ? new Date(emi.createdAt.seconds * 1000) : new Date()));`;
code = code.replace(createdAtRegex, createdAtReplacement);

fs.writeFileSync('src/pages/emi-management.tsx', code);
