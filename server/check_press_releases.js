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
  console.log("Fetching documents from Firestore 'press_releases' collection...");
  try {
    const qSnap = await getDocs(collection(db, "press_releases"));
    if (qSnap.empty) {
      console.log("No documents found in 'press_releases' collection.");
      process.exit(0);
    }

    console.log(`Found ${qSnap.size} total documents.\n`);
    const clients = new Map();

    qSnap.forEach(docSnap => {
      const data = docSnap.data();
      const clientName = data.client || 'N/A';
      const fileName = data.fileName || 'N/A';
      const type = data.type || 'N/A';
      
      if (!clients.has(clientName)) {
        clients.set(clientName, []);
      }
      clients.get(clientName).push({ fileName, type, id: docSnap.id });
    });

    console.log("Clients and their trackers/reports:");
    for (const [client, files] of clients.entries()) {
      console.log(`- Client: "${client}"`);
      files.forEach(f => {
        console.log(`  * File: "${f.fileName}" | Type: ${f.type} (Doc ID: ${f.id})`);
      });
    }

  } catch (err) {
    console.error("Error fetching documents:", err.message);
  }
  process.exit(0);
}

run();
