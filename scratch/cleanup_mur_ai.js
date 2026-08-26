import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, deleteDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';

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

async function cleanup() {
  const coll = collection(db, "client_documents");
  
  // 1. Delete all docs where client is "Mur AI" or "mur ai"
  const qMur1 = query(coll, where("client", "==", "Mur AI"));
  const qMur2 = query(coll, where("client", "==", "mur ai"));
  const snapMur1 = await getDocs(qMur1);
  const snapMur2 = await getDocs(qMur2);
  
  let deleteCount = 0;
  for (const docSnap of [...snapMur1.docs, ...snapMur2.docs]) {
    await deleteDoc(doc(db, "client_documents", docSnap.id));
    console.log(`Deleted "Mur AI" document ${docSnap.id}: ${docSnap.data().fileName}`);
    deleteCount++;
  }
  console.log(`Deleted total of ${deleteCount} "Mur AI" documents.`);

  // 2. Rename all "Nur AI" / "nur ai" documents back to "Murf AI"
  const qNur1 = query(coll, where("client", "==", "Nur AI"));
  const qNur2 = query(coll, where("client", "==", "nur ai"));
  const snapNur1 = await getDocs(qNur1);
  const snapNur2 = await getDocs(qNur2);
  
  let renameCount = 0;
  for (const docSnap of [...snapNur1.docs, ...snapNur2.docs]) {
    const docRef = doc(db, "client_documents", docSnap.id);
    const data = docSnap.data();
    const updated = {
      client: 'Murf AI',
      fileName: data.fileName.replace(/Nur AI/g, 'Murf AI').replace(/nur ai/g, 'Murf AI')
    };
    await updateDoc(docRef, updated);
    console.log(`Renamed Nur AI document ${docSnap.id} to Murf AI: ${data.fileName} -> ${updated.fileName}`);
    renameCount++;
  }
  console.log(`Renamed total of ${renameCount} Nur AI documents to Murf AI.`);

  // 3. Clean up client_master_links
  const nurLinkRef = doc(db, "client_master_links", "Nur AI");
  const nurLinkSnap = await getDoc(nurLinkRef);
  if (nurLinkSnap.exists()) {
    const data = nurLinkSnap.data();
    data.client = "Murf AI";
    const murfLinkRef = doc(db, "client_master_links", "Murf AI");
    await setDoc(murfLinkRef, data);
    await deleteDoc(nurLinkRef);
    console.log("Renamed master links document from Nur AI to Murf AI");
  }

  const murLinkRef = doc(db, "client_master_links", "Mur AI");
  const murLinkSnap = await getDoc(murLinkRef);
  if (murLinkSnap.exists()) {
    await deleteDoc(murLinkRef);
    console.log("Deleted master links document for Mur AI");
  }

  console.log("Cleanup completed successfully!");
  process.exit(0);
}

cleanup().catch(console.error);
