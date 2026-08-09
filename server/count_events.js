import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCB_pSS1-1VFkdHjzN2W8ozW55W0lF3BD8',
  authDomain: 'anexar-9820c.firebaseapp.com',
  projectId: 'anexar-9820c',
  storageBucket: 'anexar-9820c.firebasestorage.app',
  messagingSenderId: '1069657020241',
  appId: '1:1069657020241:web:741f0a7c4ecf003aede570'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, "events_awards"));
  console.log(`Total documents in 'events_awards' collection: ${snap.size}`);
  
  if (snap.size > 0) {
    console.log("Sample document keys:");
    let printed = false;
    snap.forEach(doc => {
      if (!printed) {
        console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
        printed = true;
      }
    });
  }
  process.exit(0);
}

run().catch(console.error);
