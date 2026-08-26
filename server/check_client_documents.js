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
  console.log("Fetching documents from Firestore 'client_documents' collection...");
  try {
    const qSnap = await getDocs(collection(db, "client_documents"));
    if (qSnap.empty) {
      console.log("No documents found in 'client_documents' collection.");
      process.exit(0);
    }

    console.log(`Found ${qSnap.size} total documents.\n`);
    const clients = new Map();

    qSnap.forEach(docSnap => {
      const data = docSnap.data();
      const clientName = data.client || 'N/A';
      const fileName = data.fileName || 'N/A';
      const type = data.type || 'N/A';
      const date = data.reportDate || `${data.month || ''} ${data.year || ''}`.trim() || 'N/A';
      
      if (!clients.has(clientName)) {
        clients.set(clientName, []);
      }
      clients.get(clientName).push({ fileName, type, date, id: docSnap.id });
    });

    console.log("Clients and their onboarded reports/trackers:");
    for (const [client, files] of clients.entries()) {
      console.log(`- Client: "${client}"`);
      files.forEach(f => {
        console.log(`  * File: "${f.fileName}" | Type: "${f.type}" | Date: "${f.date}" (Doc ID: ${f.id})`);
      });
    }

  } catch (err) {
    console.error("Error fetching documents:", err.message);
  }
  process.exit(0);
}

run();
