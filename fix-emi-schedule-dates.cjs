const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

const regex = /const startDate = selectedEmiForView\.saleDate \? new Date\(selectedEmiForView\.saleDate\.seconds \* 1000\) : \(selectedEmiForView\.createdAt \? new Date\(selectedEmiForView\.createdAt\.seconds \* 1000\) : new Date\(\)\);/g;
const replacement = `const startDate = selectedEmiForView.startDate ? new Date(selectedEmiForView.startDate) : (selectedEmiForView.saleDate ? new Date(selectedEmiForView.saleDate.seconds * 1000) : (selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date()));`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/emi-management.tsx', code);
