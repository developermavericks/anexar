import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import XLSX from 'xlsx';
import path from 'path';

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
  console.log("Fetching journalists from Firestore...");
  const querySnapshot = await getDocs(collection(db, "journalists"));
  
  const unscraped = [];
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    // A document is considered unscraped if it does NOT have a scribeProfile field
    if (!data.scribeProfile) {
      unscraped.push({
        Name: data.name || '',
        Publication: data.publication || 'Independent'
      });
    }
  });
  
  console.log(`Found ${unscraped.length} unscraped journalists.`);
  
  if (unscraped.length === 0) {
    console.log("All journalists have already been scraped!");
    process.exit(0);
  }
  
  // Write to input/journalists.xlsx
  const filePath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/input/journalists.xlsx');
  console.log("Writing to:", filePath);
  
  const worksheet = XLSX.utils.json_to_sheet(unscraped);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Journalists");
  XLSX.writeFile(workbook, filePath);
  
  console.log("Export complete!");
  process.exit(0);
}

run().catch(console.error);
