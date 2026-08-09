import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

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

// Normalizes name to group duplicates
function getNormalizedKey(eventName, location) {
  const name = String(eventName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const loc = String(location || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return `${name}||${loc}`;
}

async function run() {
  console.log("Fetching all events to detect duplicates...");
  const snap = await getDocs(collection(db, "events_awards"));
  console.log(`Total events loaded: ${snap.size}`);
  
  const groups = {};
  
  snap.forEach(docSnap => {
    const id = docSnap.id;
    const d = docSnap.data();
    const name = d.event_name || d.name || '';
    const location = d.location || d.venue || 'India';
    const key = getNormalizedKey(name, location);
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push({ id, name, location, createdAt: d.createdAt || '' });
  });
  
  let duplicateCount = 0;
  let totalToDelete = 0;
  const docsToDelete = [];
  
  for (const [key, list] of Object.entries(groups)) {
    if (list.length > 1) {
      duplicateCount++;
      // Keep the oldest one (first created or first found), delete the rest
      const sorted = list.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      console.log(`Duplicate Group found for key: "${key}"`);
      sorted.forEach((item, idx) => {
        const action = idx === 0 ? "KEEP" : "DELETE";
        console.log(`  -> [${action}] Doc ID: ${item.id} | Name: "${item.name}" | CreatedAt: ${item.createdAt}`);
        if (idx > 0) {
          docsToDelete.push(item.id);
          totalToDelete++;
        }
      });
    }
  }
  
  console.log(`\nFound ${duplicateCount} unique events with duplicates.`);
  console.log(`Total duplicate documents to delete: ${totalToDelete}`);
  
  if (totalToDelete > 0) {
    console.log("Starting deletion of duplicates...");
    let deleted = 0;
    for (const id of docsToDelete) {
      await deleteDoc(doc(db, "events_awards", id));
      deleted++;
      if (deleted % 10 === 0) {
        console.log(`Deleted ${deleted}/${totalToDelete} documents...`);
      }
    }
    console.log("All duplicates successfully deleted!");
  } else {
    console.log("No duplicate documents found to delete.");
  }
  
  process.exit(0);
}

run().catch(console.error);
