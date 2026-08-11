const fs = require('fs');
let code = fs.readFileSync('src/pages/follow-ups.tsx', 'utf-8');

const regex = /      if \(!fu\.nextDate\) return;\n      \n      const nextDateStr = fu\.nextDate; \/\/ assuming YYYY-MM-DD\n      const nextDate = new Date\(nextDateStr\);\n      \n      if \(nextDate <= threeDaysFromNow\) \{/;

const replacement = `      if (!fu.nextDate) return;
      
      const nextDateStr = fu.nextDate; // assuming YYYY-MM-DD
      const nextDate = new Date(nextDateStr);
      
      if (true) { // Show all follow ups for now`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/follow-ups.tsx', code);
