const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, connectFirestoreEmulator } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'ai-studio-e5e03ab2-ddcf-42bf-a5fd-8bf5f05d41ff'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log('sales:', (await getDocs(collection(db, 'sales'))).docs.length);
  process.exit(0);
}
test();
