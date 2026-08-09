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
  
  let indiaCount = 0;
  let otherCount = 0;
  const samples = [];
  
  snap.forEach(docSnap => {
    const d = docSnap.data();
    const loc = String(d.location || '').trim();
    if (loc === 'India' || loc === 'india' || loc === '') {
      indiaCount++;
      if (samples.length < 15) {
        samples.push({ id: docSnap.id, name: d.event_name || d.name, location: loc, date: d.date || 'N/A' });
      }
    } else {
      otherCount++;
    }
  });
  
  console.log(`Total events: ${snap.size}`);
  console.log(`Events with location "India" or empty: ${indiaCount}`);
  console.log(`Events with exact location: ${otherCount}`);
  console.log("Samples of 'India' or empty location events:", samples);
  process.exit(0);
}

run().catch(console.error);
