import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase Config
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
  console.log("Fetching all journalists from Firestore...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  console.log(`Found ${snapshot.size} total journalists in collection.`);
  
  const map = new Map();
  const duplicates = [];
  
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const name = (data.name || '').trim();
    const publication = (data.publication || '').trim();
    
    if (!name) return;
    
    const key = `${name.toLowerCase()}|${publication.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push({ id, name, publication, createdAt: data.createdAt });
  });
  
  for (const [key, list] of map.entries()) {
    if (list.length > 1) {
      duplicates.push({
        key,
        count: list.length,
        items: list
      });
    }
  }
  
  if (duplicates.length === 0) {
    console.log("\n🎉 Awesome! No duplicate journalists found in the Firestore database.");
  } else {
    console.log(`\n⚠️ Found ${duplicates.length} duplicate journalist names:`);
    duplicates.forEach((dup, i) => {
      console.log(`\n[${i + 1}] "${dup.items[0].name}" at "${dup.items[0].publication}" (${dup.count} entries):`);
      dup.items.forEach(item => {
        console.log(`  - Doc ID: ${item.id} | Created: ${item.createdAt || 'N/A'}`);
      });
    });
  }
}

run().catch(console.error);
