const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'ai-studio-e5e03ab2-ddcf-42bf-a5fd-8bf5f05d41ff'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const q = await getDocs(collection(db, 'salesFollowUps'));
  console.log('salesFollowUps:', q.docs.map(d => d.data()));
  process.exit(0);
}
test();
