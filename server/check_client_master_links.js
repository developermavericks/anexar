import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  console.log("Fetching documents from Firestore 'client_master_links' collection...");
  try {
    const qSnap = await getDocs(collection(db, "client_master_links"));
    if (qSnap.empty) {
      console.log("No documents found in 'client_master_links' collection.");
      process.exit(0);
    }

    console.log(`Found ${qSnap.size} total documents.\n`);

    qSnap.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`- Document ID (Client Name): "${docSnap.id}"`);
      console.log(`  * cumulativeSheetUrl: "${data.cumulativeSheetUrl || ''}"`);
      console.log(`  * filteredDocUrl: "${data.filteredDocUrl || ''}"`);
      console.log(`  * masterDocUrl: "${data.masterDocUrl || ''}"`);
    });

  } catch (err) {
    console.error("Error fetching documents:", err.message);
  }
  process.exit(0);
}

run();
