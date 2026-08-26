import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync } from 'fs';

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
  const snap = await getDocs(collection(db, 'user_clients'));
  const out = {};
  snap.forEach((docSnap) => {
    out[docSnap.id] = docSnap.data();
  });
  writeFileSync(process.argv[2] || 'user_clients_dump.json', JSON.stringify(out, null, 2));
  console.log('WROTE', Object.keys(out).length, 'docs');
  process.exit(0);
}

run().catch((err) => {
  console.error('ERROR', err);
  process.exit(1);
});
