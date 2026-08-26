import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function run() {
  const e3Data = {
    cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/16AbQMygKpWhYmvhmyFc7oxcz5WNsYacs/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
    filteredDocUrl: '',
    masterDocUrl: '',
    updatedAt: new Date().toISOString()
  };

  try {
    console.log("Setting master links for 'E3 Electric AI' in Firestore...");
    await setDoc(doc(db, "client_master_links", "E3 Electric AI"), e3Data);
    console.log("SUCCESS: Set 'E3 Electric AI'");

    console.log("Setting master links for 'E3 Electric.AI' in Firestore...");
    await setDoc(doc(db, "client_master_links", "E3 Electric.AI"), e3Data);
    console.log("SUCCESS: Set 'E3 Electric.AI'");
    
  } catch (err) {
    console.error("Error setting links in Firestore:", err.message);
  }
  process.exit(0);
}

run();
