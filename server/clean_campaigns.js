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

async function cleanCampaigns() {
  console.log("Fetching campaigns from Firestore...");
  const snap = await getDocs(collection(db, "campaigns"));
  console.log(`Found ${snap.size} documents in 'campaigns'.`);
  
  for (const document of snap.docs) {
    const data = document.data();
    const isTest = !data.description || data.description.toLowerCase().includes('test') || data.name === 'test' || data.title === 'test';
    if (isTest) {
      console.log(`Deleting test campaign: ID=${document.id} | Name="${data.name || data.title}" | Desc="${data.description}"`);
      await deleteDoc(doc(db, "campaigns", document.id));
    } else {
      console.log(`Keeping valid campaign: ID=${document.id} | Name="${data.name || data.title}"`);
    }
  }
  console.log("Campaign clean-up successfully finished!");
}

cleanCampaigns().catch(err => {
  console.error("Failed to clean campaigns:", err);
});
