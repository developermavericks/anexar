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
  
  let upcoming = 0;
  let concluded = 0;
  
  snap.forEach(docSnap => {
    const d = docSnap.data();
    if (d.status === 'UPCOMING') {
      upcoming++;
    } else if (d.status === 'CONCLUDED') {
      concluded++;
    }
  });
  
  console.log(`Current Database Stats:`);
  console.log(`Upcoming events: ${upcoming}`);
  console.log(`Concluded events: ${concluded}`);
  process.exit(0);
}

run().catch(console.error);
