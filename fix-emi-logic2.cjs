const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

// Replace enhancedEmis calculation
const enhancedEmisRegex = /const createdAtDate = emi\.startDate \? new Date\(emi\.startDate\) : \(emi\.saleDate \? new Date\(emi\.saleDate\.seconds \* 1000\) : \(emi\.createdAt \? new Date\(emi\.createdAt\.seconds \* 1000\) : new Date\(\)\)\);\n\s*const now = new Date\(\);\n\s*let monthsPassed = \(now\.getFullYear\(\) - createdAtDate\.getFullYear\(\)\) \* 12 \+ now\.getMonth\(\) - createdAtDate\.getMonth\(\);\n\s*if \(now\.getDate\(\) < createdAtDate\.getDate\(\)\) \{\n\s*monthsPassed--;\n\s*\}\n\s*if \(monthsPassed < 0\) monthsPassed = 0;\n\s*const paidEmisCount = emi\.paidEmis \|\| 0;\n\s*let overdueEmisCount = monthsPassed - paidEmisCount;\n\s*if \(overdueEmisCount < 0\) overdueEmisCount = 0;\n\s*let remainingEmisCount = emi\.periodMonths - paidEmisCount - overdueEmisCount;\n\s*if \(remainingEmisCount < 0\) remainingEmisCount = 0;\n\s*const principal = emi\.loanAmount \|\| 0;\n\s*const rate = emi\.interestRate \|\| 0;\n\s*const monthlyRate = rate \/ 12 \/ 100;\n\s*const months = emi\.periodMonths \|\| 0;\n\s*const monthlyEmi = months > 0 \n\s*\? \(rate === 0 \? principal \/ months : \(principal \* monthlyRate \* Math\.pow\(1 \+ monthlyRate, months\)\) \/ \(Math\.pow\(1 \+ monthlyRate, months\) - 1\)\)\n\s*: 0;\n\s*const pendingEmiSum = overdueEmisCount \* monthlyEmi;\n\s*const nextEmiDate = new Date\(createdAtDate\);\n\s*nextEmiDate\.setMonth\(nextEmiDate\.getMonth\(\) \+ paidEmisCount \+ overdueEmisCount \+ 1\);/;

const enhancedEmisReplacement = `const baseDate = emi.startDate ? new Date(emi.startDate) : (emi.saleDate ? new Date(emi.saleDate.seconds * 1000) : (emi.createdAt ? new Date(emi.createdAt.seconds * 1000) : new Date()));
    const now = new Date();
    
    let monthsPassed = (now.getFullYear() - baseDate.getFullYear()) * 12 + now.getMonth() - baseDate.getMonth();
    if (now.getDate() < baseDate.getDate()) {
      monthsPassed--;
    }
    
    let totalDueEmis = monthsPassed;
    if (totalDueEmis < 0) totalDueEmis = 0;
    
    if (emi.startDate) {
      if (now < baseDate) {
        totalDueEmis = 0;
      } else {
        totalDueEmis = monthsPassed + 1;
      }
    }

    const paidEmisCount = emi.paidEmis || 0;
    let overdueEmisCount = totalDueEmis - paidEmisCount;
    if (overdueEmisCount < 0) overdueEmisCount = 0;
    
    let remainingEmisCount = emi.periodMonths - paidEmisCount - overdueEmisCount;
    if (remainingEmisCount < 0) remainingEmisCount = 0;

    const principal = emi.loanAmount || 0;
    const rate = emi.interestRate || 0;
    const monthlyRate = rate / 12 / 100;
    const months = emi.periodMonths || 0;
    const monthlyEmi = months > 0 
      ? (rate === 0 ? principal / months : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
      : 0;

    const pendingEmiSum = overdueEmisCount * monthlyEmi;

    const nextEmiDate = new Date(baseDate);
    const offset = emi.startDate ? 0 : 1;
    nextEmiDate.setMonth(nextEmiDate.getMonth() + paidEmisCount + overdueEmisCount + offset);`;

code = code.replace(enhancedEmisRegex, enhancedEmisReplacement);

// Replace schedule arrays
const scheduleRegex = /const emiDate = new Date\(startDate\);\n\s*emiDate\.setMonth\(emiDate\.getMonth\(\) \+ emiNo\);/g;
const scheduleReplacement = `const emiDate = new Date(startDate);
                              const offset = selectedEmiForView.startDate ? 0 : 1;
                              emiDate.setMonth(emiDate.getMonth() + emiNo - 1 + offset);`;

code = code.replace(scheduleRegex, scheduleReplacement);

fs.writeFileSync('src/pages/emi-management.tsx', code);
