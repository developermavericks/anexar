import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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

async function renameMasterLinks() {
  const oldDocRef = doc(db, "client_master_links", "Murf AI");
  const oldDocSnap = await getDoc(oldDocRef);
  
  if (oldDocSnap.exists()) {
    const data = oldDocSnap.data();
    const newDocRef = doc(db, "client_master_links", "Nur AI");
    await setDoc(newDocRef, data);
    await deleteDoc(oldDocRef);
    console.log("Renamed master links document ID from Murf AI to Nur AI");
  } else {
    console.log("No master links document found under Murf AI.");
  }
  
  const oldDocRef2 = doc(db, "client_master_links", "Murf-AI");
  const oldDocSnap2 = await getDoc(oldDocRef2);
  
  if (oldDocSnap2.exists()) {
    const data = oldDocSnap2.data();
    const newDocRef2 = doc(db, "client_master_links", "Nur AI");
    await setDoc(newDocRef2, data);
    await deleteDoc(oldDocRef2);
    console.log("Renamed master links document ID from Murf-AI to Nur AI");
  } else {
    console.log("No master links document found under Murf-AI.");
  }
  
  process.exit(0);
}

renameMasterLinks().catch(console.error);
