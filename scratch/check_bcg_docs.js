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

async function checkBcg() {
  const q = query(collection(db, "client_documents"), where("client", "==", "BCG"));
  const snapshot = await getDocs(q);
  console.log(`Found ${snapshot.size} BCG documents.`);
  if (snapshot.size > 0) {
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    console.log(`FileName: ${data.fileName}`);
    console.log(`Headers: ${JSON.stringify(data.headers)}`);
    console.log(`Rows count: ${data.rows?.length}`);
    console.log(`First 10 rows:`);
    console.log(data.rows?.slice(0, 10));
  }
}

checkBcg().catch(console.error);
