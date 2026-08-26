import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

async function checkTodayPapers() {
  const today = '2026-08-24';
  console.log(`Checking papers in Firestore for date: ${today}`);

  try {
    const q = query(collection(db, 'epapers'), where('date', '==', today));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log('No papers found in Firestore for today.');
      return;
    }

    console.log(`Found ${snap.size} papers for today:`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name}:`);
      console.log(`  Uploaded By: ${data.uploadedBy}`);
      console.log(`  PDF URL: ${data.pdfUrl}`);
      console.log(`  Created At: ${data.createdAt || 'N/A'}`);
    });
  } catch (err) {
    console.error('Error querying Firestore:', err.message);
  }
}

checkTodayPapers();
