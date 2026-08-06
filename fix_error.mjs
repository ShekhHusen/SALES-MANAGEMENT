import fs from 'fs';
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf8');

const replacement = `
    } catch (error: any) {
      console.error('Error updating document process', error);
      if (error?.code === 'not-found' || error?.message?.includes('not found') || error?.message?.includes('No document to update')) {
        toast.error('This file (sale record) has been deleted. Cannot save.');
      } else {
        toast.error('Failed to save document process');
      }
      handleFirestoreError(error, OperationType.UPDATE, \`sales/\${selectedSale.id}\`);
    } finally {
`;

code = code.replace(/    \} catch \(error: any\) \{\s*console\.error\('Error updating document process', error\);\s*toast\.error\('Failed to save document process'\);\s*handleFirestoreError\(error, OperationType\.UPDATE, `sales\/\$\{selectedSale\.id\}`\);\s*\} finally \{/, replacement.trim());
fs.writeFileSync('src/pages/process-document.tsx', code);
