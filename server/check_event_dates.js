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
  
  let noDateCount = 0;
  let hasDateCount = 0;
  let statusCounts = {};
  const dateSamples = [];
  const deadlineSamples = [];
  
  snap.forEach(doc => {
    const d = doc.data();
    const date = d.date || '';
    const status = d.status || 'NO_STATUS';
    const deadline = d.nomination_deadline || '';
    
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    if (date) {
      hasDateCount++;
      if (dateSamples.length < 15) dateSamples.push(date);
    } else {
      noDateCount++;
    }
    
    if (deadline && deadlineSamples.length < 15) {
      deadlineSamples.push(deadline);
    }
  });
  
  console.log(`Total events: ${snap.size}`);
  console.log(`Has date field: ${hasDateCount}`);
  console.log(`Missing date field: ${noDateCount}`);
  console.log("Status breakdown:", statusCounts);
  console.log("Date value samples:", dateSamples);
  console.log("Nomination deadline samples:", deadlineSamples);
  process.exit(0);
}

run().catch(console.error);
