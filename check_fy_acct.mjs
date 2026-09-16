import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, limit, where } from 'firebase/firestore';

const tallyConfig = {
  apiKey: "AIzaSyDxUdNuacE9J08BoebrY4Ax63CD4phZXj4",
  authDomain: "jbmt-reporting.firebaseapp.com",
  projectId: "jbmt-reporting",
  storageBucket: "jbmt-reporting.firebasestorage.app",
  messagingSenderId: "554546722753",
  appId: "1:554546722753:web:c6be832b4d00fbe6bfe140"
};

const app = initializeApp(tallyConfig, "check-fy-acct");
const db = getFirestore(app);

async function run() {
  const accountName = "SHIV SHANKAR SAHANI-E RICKSHAW";
  
  // Find account ID first
  const q = query(collection(db, 'accounts'), where('name', '==', accountName), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("Account not found");
    return;
  }
  const acct = snap.docs[0];
  const acctId = acct.id;
  console.log("Account ID:", acctId);
  console.log("Account global data:", acct.data());

  // Check accounts/{id}/fiscalYears
  const fySnap = await getDocs(collection(db, `accounts/${acctId}/fiscalYears`));
  console.log(`\naccounts/${acctId}/fiscalYears size:`, fySnap.size);
  fySnap.forEach(d => console.log(d.id, d.data()));

  // Check fiscalYears/{fyId}/accounts/{acctId}
  const fys = await getDocs(collection(db, 'fiscalYears'));
  for (const fy of fys.docs) {
    console.log(`\nChecking fiscalYears/${fy.id}/accounts/${acctId}...`);
    const docSnap = await getDoc(doc(db, `fiscalYears/${fy.id}/accounts/${acctId}`));
    if (docSnap.exists()) {
      console.log("FOUND:", docSnap.data());
    } else {
      console.log("Not found.");
    }
  }
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
