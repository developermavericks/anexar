import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Firebase Config
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

async function inspect(label, ids) {
  console.log(`\n--- Inspecting Group: ${label} ---`);
  for (const id of ids) {
    const docRef = doc(db, "journalists", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      console.log(`Doc ID: ${id}`);
      console.log(`  - Name: ${d.name}`);
      console.log(`  - Publication: ${d.publication}`);
      console.log(`  - Email: ${d.email}`);
      console.log(`  - Phone: ${d.phone}`);
      console.log(`  - JournalistId: ${d.journalistId}`);
    } else {
      console.log(`Doc ID: ${id} (DOES NOT EXIST anymore)`);
    }
  }
}

async function run() {
  // Let's inspect Gaurav Gupta
  await inspect("Gaurav Gupta", ["B2x75Yr00ie7orXSQGF0", "K5dMUFIjgt9zLNLsHoWA"]);
  
  // Let's inspect Kanishk Singh
  await inspect("Kanishk Singh", ["Ax6HQjO4s25o0M3BBkPU", "BjVxaULFrNDlVLuPwXL1"]);
  
  // Let's inspect Rishika Kashyap
  await inspect("Rishika Kashyap", ["U5C5KBMSzcss9tpPpn6B", "9n8BnNJvZ9pVncCehzsP"]);
}

run().catch(console.error);
