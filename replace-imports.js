import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir('./src');
for (const file of files) {
  if (file.includes('trackedFirestore.ts')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("'firebase/firestore'")) {
    // Only replace if it's importing methods
    if (!file.includes('firebase.ts')) {
        content = content.replace(/from\s+['"]firebase\/firestore['"]/g, "from '@/lib/trackedFirestore'");
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
    }
  }
}
