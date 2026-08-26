import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

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

async function cleanMeetings() {
  console.log("Fetching meeting requests from Firestore...");
  const snap = await getDocs(collection(db, "meetings"));
  console.log(`Found ${snap.size} documents in 'meetings'.`);
  
  for (const document of snap.docs) {
    const data = document.data();
    console.log(`Deleting meeting: ID=${document.id} | Topic="${data.topic}" | RequestedBy="${data.clientEmail || 'N/A'}"`);
    await deleteDoc(doc(db, "meetings", document.id));
  }
  console.log("All meeting requests successfully cleared from Firestore!");
}

cleanMeetings().catch(err => {
  console.error("Failed to clean meetings:", err);
});
