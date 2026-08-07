import fs from 'fs';
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf8');

const replacement = `
      // Complete document process without saving otherDetails/documents to DB
      await updateDoc(doc(db, 'sales', selectedSale.id), {
        documentationCompleted: true,
        otherDetails: deleteField()
      });
`;

code = code.replace(/      await updateDoc\(doc\(db, 'sales', selectedSale\.id\), \{\s*documentationCompleted: true,\s*otherDetails: \{[\s\S]*?images\s*\}\s*\}\);/, replacement.trim());
fs.writeFileSync('src/pages/process-document.tsx', code);
