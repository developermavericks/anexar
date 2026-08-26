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

function normalize(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
  console.log("Fetching all documents from Firestore...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  const docs = snapshot.docs.map(d => d.data());
  const totalCount = docs.length;
  
  // Step 1: Unique Names (strict case-insensitive match on Name only)
  const uniqueNames = new Set();
  // Step 2: Unique Name + Publication combos (case-insensitive match on both Name and Publication)
  const uniqueNamePubs = new Set();
  
  docs.forEach(data => {
    const name = normalize(data.name);
    const pub = normalize(data.publication);
    if (name) {
      uniqueNames.add(name);
      uniqueNamePubs.add(`${name}|${pub}`);
    }
  });

  console.log(`\n=== STEP-BY-STEP DATABASE METRICS ===`);
  console.log(`Step 1: Total Documents in Firestore = ${totalCount}`);
  console.log(`Step 2: Unique Names (by Name only) = ${uniqueNames.size}`);
  console.log(`Step 3: Unique Name + Publication combos = ${uniqueNamePubs.size}`);
  
  console.log(`\nDuplicate breakdown:`);
  console.log(`- You have ${totalCount - uniqueNamePubs.size} duplicate entries (same person at the same publication).`);
}

run().catch(console.error);
