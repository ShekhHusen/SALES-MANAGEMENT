import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const tallyConfig = {
  apiKey: "AIzaSyDxUdNuacE9J08BoebrY4Ax63CD4phZXj4",
  authDomain: "jbmt-reporting.firebaseapp.com",
  projectId: "jbmt-reporting",
  storageBucket: "jbmt-reporting.firebasestorage.app",
  messagingSenderId: "554546722753",
  appId: "1:554546722753:web:c6be832b4d00fbe6bfe140"
};
const app = initializeApp(tallyConfig, "check-fy-root");
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'fiscalYears'));
  snap.forEach(d => console.log(d.id, d.data()));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
