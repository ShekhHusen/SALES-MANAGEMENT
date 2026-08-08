import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

content = content.replace(
  "const { overdueEmisCount, remainingEmisCount, pendingEmiSum, nextEmiDate, monthlyEmi, isCompleted } = emi;",
  "const { overdueEmisCount, remainingEmisCount, pendingEmiSum, nextEmiDate, monthlyEmi, isCompleted } = emi;\n                  const paidEmisCount = emi.paidEmis || 0;"
);

fs.writeFileSync('src/pages/emi-management.tsx', content);
