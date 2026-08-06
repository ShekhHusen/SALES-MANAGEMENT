import fs from 'fs';
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf8');

const replacement = `
    } catch (error: any) {
      console.error('Error updating document process', error);
      if (error?.code === 'not-found' || error?.message?.includes('not found') || error?.message?.includes('No document to update')) {
        toast.error('This file (sale record) has been deleted. Cannot save process.');
      } else {
        toast.error('Failed to save document process');
      }
      handleFirestoreError(error, OperationType.UPDATE, \`sales/\${selectedSale.id}\`);
`;

code = code.replace(/    \} catch \(error: any\) \{\s*console\.error\('Error updating document process', error\);\s*if \(error\?\.code === 'not-found'\) \{\s*toast\.error\('This sale record has been deleted\. Cannot save process\.'\);\s*\} else \{\s*toast\.error\('Failed to save document process'\);\s*\}\s*handleFirestoreError\(error, OperationType\.UPDATE, `sales\/\$\{selectedSale\.id\}`\);/, replacement.trim());
fs.writeFileSync('src/pages/process-document.tsx', code);
