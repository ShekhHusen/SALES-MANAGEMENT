import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

const pdfSearch = "const paymentInfo = paymentRecord ? \\`\\${paymentRecord.receiptNumber} / ₹\\${paymentRecord.amount.toLocaleString()}\\` : '-';";
const pdfReplace = "const paymentDate = paymentRecord?.createdAt ? (paymentRecord.createdAt.seconds ? new Date(paymentRecord.createdAt.seconds * 1000) : new Date(paymentRecord.createdAt)).toLocaleDateString('en-GB') : '';\n      const paymentInfo = paymentRecord ? \\`\\${paymentRecord.receiptNumber} / ₹\\${paymentRecord.amount.toLocaleString()} (\\${paymentDate})\\` : '-';";

content = content.replace(pdfSearch, pdfReplace);

const uiSearch = "{paymentRecord ? \\`\\${paymentRecord.receiptNumber} / ₹\\${paymentRecord.amount.toLocaleString()}\\` : '-'}";
const uiReplace = "{paymentRecord ? \\`\\${paymentRecord.receiptNumber} / ₹\\${paymentRecord.amount.toLocaleString()} (\\${paymentRecord.createdAt ? (paymentRecord.createdAt.seconds ? new Date(paymentRecord.createdAt.seconds * 1000) : new Date(paymentRecord.createdAt)).toLocaleDateString('en-GB') : ''})\\` : '-'}";

content = content.replace(uiSearch, uiReplace);

fs.writeFileSync('src/pages/emi-management.tsx', content);
