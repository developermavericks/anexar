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
  console.log("Searching for journalists named 'Satyam' in Firestore...");
  const snap = await getDocs(collection(db, "journalists"));
  
  const matches = [];
  snap.forEach(d => {
    const data = d.data();
    const name = String(data.name || '').toLowerCase();
    if (name.includes('satyam')) {
      matches.push({ id: d.id, ...data });
    }
  });

  console.log(`Found ${matches.length} journalist(s) with 'Satyam' in their name:\n`);
  matches.forEach((m, idx) => {
    console.log(`[${idx + 1}] Name: "${m.name}"`);
    console.log(`    Doc ID: ${m.id}`);
    console.log(`    Publication: ${m.publication}`);
    console.log(`    Email: ${m.email || 'N/A'}`);
    console.log(`    Phone: ${m.phone || 'N/A'}`);
    console.log(`    Journalist ID: ${m.journalistId || 'N/A'}`);
    console.log(`-----------------------------------------------`);
  });
}

run().catch(console.error);
