import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

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
  const q = query(
    collection(db, "journalists"),
    orderBy("updatedAt", "desc"),
    limit(3)
  );
  
  const snap = await getDocs(q);
  console.log("INSPECTING LAST 3 UPDATED JOURNALISTS IN FIRESTORE:\n");
  
  snap.forEach(docSnap => {
    console.log(`Document ID: ${docSnap.id}`);
    console.log(JSON.stringify(docSnap.data(), null, 2));
    console.log("-------------------------------------------\n");
  });
  
  process.exit(0);
}

run().catch(console.error);
