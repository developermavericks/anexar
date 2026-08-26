import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function checkBcgDetails() {
  const q = query(collection(db, "client_documents"), where("client", "==", "BCG"));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`Document: ${data.fileName}`);
    if (data.rows) {
      data.rows.forEach((row, i) => {
        const rowStr = JSON.stringify(row).toLowerCase();
        if (rowStr.includes('mur') || rowStr.includes('nur')) {
          console.log(`  Row ${i}: ${JSON.stringify(row)}`);
        }
      });
    }
  });
}

checkBcgDetails().catch(console.error);
