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

async function check() {
  const snap = await getDocs(collection(db, 'model_training_data'));
  const docs = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  // Sort by createdAt asc
  docs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  
  docs.forEach((data, idx) => {
    console.log(`[Row ${idx + 2}] Headline: ${data.headline}`);
    console.log(`  - DocId: ${data.id}`);
    console.log(`  - CreatedAt: ${data.createdAt}`);
    console.log(`  - ScreenshotUrl: ${data.screenshotUrl}`);
  });
  process.exit(0);
}

check().catch(console.error);
