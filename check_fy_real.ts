import { tallyDb } from './src/lib/tallyFirebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function run() {
  const collectionsToCheck = ['fiscalYears', 'financialYears', 'companies', 'settings'];
  for (const c of collectionsToCheck) {
    console.log(`Checking ${c}...`);
    try {
      const snap = await getDocs(query(collection(tallyDb, c), limit(2)));
      console.log(`${c} size: ${snap.size}`);
      snap.forEach(doc => console.log(` - ${doc.id}:`, Object.keys(doc.data())));
    } catch (e) {
      console.log(`Error on ${c}`);
    }
  }
}
run().catch(console.error);
