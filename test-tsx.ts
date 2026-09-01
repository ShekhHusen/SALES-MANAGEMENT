import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const tallyConfig = {
  apiKey: "AIzaSyDxUdNuacE9J08BoebrY4Ax63CD4phZXj4",
  authDomain: "jbmt-reporting.firebaseapp.com",
  projectId: "jbmt-reporting",
  storageBucket: "jbmt-reporting.firebasestorage.app",
  messagingSenderId: "554546722753",
  appId: "1:554546722753:web:c6be832b4d00fbe6bfe140",
  measurementId: "G-JGCWKJPQTG"
};

const app = initializeApp(tallyConfig, "test3");
const db = getFirestore(app);

async function run() {
  try {
    console.log("Fetching...");
    const q = query(collection(db, "transactions"), limit(2));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
    console.log("Done");
  } catch (e) {
    console.error("Error fetching:", e);
  }
}

run();
