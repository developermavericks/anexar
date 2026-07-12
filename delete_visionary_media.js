import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCB_pSS1-1VFkdHjzN2W8ozW55W0lF3BD8",
  authDomain: "anexar-9820c.firebaseapp.com",
  projectId: "anexar-9820c",
  storageBucket: "anexar-9820c.firebasestorage.app",
  messagingSenderId: "1069657020241",
  appId: "1:1069657020241:web:741f0a7c4ecf003aede570"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clean() {
  console.log("Searching for 'Visionary Media' press releases in Firestore...");
  const q = query(collection(db, "press_releases"), where("client", "==", "Visionary Media"));
  const snapshot = await getDocs(q);
  
  console.log(`Found ${snapshot.size} documents to delete.`);
  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, "press_releases", document.id));
    console.log(`Deleted document: ${document.id}`);
  }
  console.log("Cleanup finished successfully!");
  process.exit(0);
}

clean().catch(err => {
  console.error("Error cleaning database:", err);
  process.exit(1);
});
