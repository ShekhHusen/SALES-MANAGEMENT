import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection, query, limit } from 'firebase/firestore';

const tallyConfig = {
  apiKey: "AIzaSyDxUdNuacE9J08BoebrY4Ax63CD4phZXj4",
  authDomain: "jbmt-reporting.firebaseapp.com",
  projectId: "jbmt-reporting",
  storageBucket: "jbmt-reporting.firebasestorage.app",
  messagingSenderId: "554546722753",
  appId: "1:554546722753:web:c6be832b4d00fbe6bfe140",
  measurementId: "G-JGCWKJPQTG"
};

const tallyApp = initializeApp(tallyConfig, "tallyAnalyzer");
const tallyDb = getFirestore(tallyApp);

async function check() {
  try {
    const colRef = collection(tallyDb, 'followups');
    const snap = await getDocs(query(colRef, limit(1)));
    console.log("Found", snap.size, "documents in 'followups'");
    if (snap.size > 0) {
      console.log(snap.docs[0].data());
    } else {
        const colRef2 = collection(tallyDb, 'followUps');
        const snap2 = await getDocs(query(colRef2, limit(1)));
        console.log("Found", snap2.size, "documents in 'followUps'");
        if (snap2.size > 0) {
            console.log(snap2.docs[0].data());
        }
    }
  } catch(e) {
    console.error(e);
  }
}
check();
