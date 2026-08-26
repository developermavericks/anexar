import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

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

async function renameOldMurfDocs() {
  const coll = collection(db, "client_documents");
  const q1 = query(coll, where("client", "==", "Murf AI"));
  const q2 = query(coll, where("client", "==", "Murf-AI"));
  const q3 = query(coll, where("client", "==", "Mur AI"));
  const q4 = query(coll, where("client", "==", "mur ai"));
  
  const snaps = [
    await getDocs(q1),
    await getDocs(q2),
    await getDocs(q3),
    await getDocs(q4)
  ];
  
  let count = 0;
  for (const snap of snaps) {
    for (const docSnap of snap.docs) {
      const docRef = doc(db, "client_documents", docSnap.id);
      const data = docSnap.data();
      const updated = {
        client: 'Nur AI',
        fileName: data.fileName.replace(/Murf AI/g, 'Nur AI')
                               .replace(/Murf-AI/g, 'Nur AI')
                               .replace(/Mur AI/g, 'Nur AI')
                               .replace(/mur ai/g, 'Nur AI')
      };
      await updateDoc(docRef, updated);
      console.log(`Renamed document ${docSnap.id}: ${data.fileName} -> ${updated.fileName}`);
      count++;
    }
  }
  console.log(`Finished renaming ${count} Mur/Murf AI documents in database.`);
  process.exit(0);
}

renameOldMurfDocs().catch(console.error);
