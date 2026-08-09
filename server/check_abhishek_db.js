import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  const q = query(collection(db, "journalists"), where("name", "==", "Abhishek De"));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log("Found Abhishek De in Firestore!");
    snap.forEach(d => {
      console.log(JSON.stringify(d.data(), null, 2));
    });
  } else {
    console.log("Abhishek De not found in Firestore.");
  }
  process.exit(0);
}

run().catch(console.error);
