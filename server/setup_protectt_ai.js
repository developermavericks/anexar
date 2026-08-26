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
  const protecttData = {
    cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/1_8CFzeMtOE2iUpcFpMwnE6RHDPZrym0B/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
    filteredDocUrl: '',
    masterDocUrl: '',
    updatedAt: new Date().toISOString()
  };

  try {
    console.log("Setting master links for 'Protectt.ai' in Firestore...");
    await setDoc(doc(db, "client_master_links", "Protectt.ai"), protecttData);
    console.log("SUCCESS: Set 'Protectt.ai'");

    console.log("Setting master links for 'protectt.ai' in Firestore...");
    await setDoc(doc(db, "client_master_links", "protectt.ai"), protecttData);
    console.log("SUCCESS: Set 'protectt.ai'");
    
  } catch (err) {
    console.error("Error setting links in Firestore:", err.message);
  }
  process.exit(0);
}

run();
