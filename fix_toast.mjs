import fs from 'fs';
let code = fs.readFileSync('src/contexts/GlobalDataContext.tsx', 'utf8');

const replacement = `
        if (mapFunc) docs = docs.map(mapFunc);
        if (sortFunc) docs = docs.sort(sortFunc);

        isInitialSnapshot = false;
`;

code = code.replace(/        if \(mapFunc\) docs = docs\.map\(mapFunc\);\n        if \(sortFunc\) docs = docs\.sort\(sortFunc\);\n\n        if \(\!snapshot\.metadata\.hasPendingWrites && \!isInitialSnapshot\) \{[\s\S]*?\}\n\n        isInitialSnapshot = false;/, replacement.trim() + '\n\n        isInitialSnapshot = false;');
fs.writeFileSync('src/contexts/GlobalDataContext.tsx', code);
