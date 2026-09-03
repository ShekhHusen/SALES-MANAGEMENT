import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const tallyConfig = {
  apiKey: "AIzaSyDxUdNuacE9J08BoebrY4Ax63CD4phZXj4",
  authDomain: "jbmt-reporting.firebaseapp.com",
  projectId: "jbmt-reporting",
  storageBucket: "jbmt-reporting.firebasestorage.app",
  messagingSenderId: "554546722753",
  appId: "1:554546722753:web:c6be832b4d00fbe6bfe140",
  measurementId: "G-JGCWKJPQTG"
};

const app = initializeApp(tallyConfig, "check-fy");
const db = getFirestore(app);

async function run() {
  const collectionsToCheck = ['fiscalYears', 'financialYears', 'companies', 'settings'];
  for (const c of collectionsToCheck) {
    console.log(`Checking ${c}...`);
    try {
      const snap = await getDocs(query(collection(db, c), limit(2)));
      console.log(`${c} size: ${snap.size}`);
      snap.forEach(doc => console.log(` - ${doc.id}:`, Object.keys(doc.data())));
    } catch (e) {
      console.log(`Error on ${c}: ${e.message}`);
    }
  }
}
run().catch(console.error);
