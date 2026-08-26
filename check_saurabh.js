import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
  const d1 = await getDoc(doc(db, "journalists", "18FixHo8QilP3BQWblgJ"));
  const d2 = await getDoc(doc(db, "journalists", "7JZ8df8r5dQIPm7c3hWU"));
  
  if (d1.exists()) {
    console.log("Saurabh Sinha 1:", JSON.stringify(d1.data(), null, 2));
  } else {
    console.log("Saurabh Sinha 1 does not exist.");
  }
  
  if (d2.exists()) {
    console.log("Saurabh Sinha 2:", JSON.stringify(d2.data(), null, 2));
  } else {
    console.log("Saurabh Sinha 2 does not exist.");
  }
}

run().catch(console.error);
