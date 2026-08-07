import fs from 'fs';
let code = fs.readFileSync('src/contexts/GlobalDataContext.tsx', 'utf8');

code = code.replace(/        isInitialSnapshot = false;\n\n        isInitialSnapshot = false;/, '        isInitialSnapshot = false;');
fs.writeFileSync('src/contexts/GlobalDataContext.tsx', code);
