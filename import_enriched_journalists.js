import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  const filePath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/journalists_enriched.xlsx');
  console.log("Reading file:", filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Loaded ${data.length} records from Excel.`);
  
  const journalistsRef = collection(db, "journalists");
  let added = 0;
  let updated = 0;
  let deleted = 0;
  let skippedNotFound = 0;
  
  for (const row of data) {
    const name = (row.Name || '').trim();
    const publication = (row.Publication || '').trim();
    
    if (!name) continue;
    
    // Check if duplicate exists
    const q = query(journalistsRef, where("name", "==", name), where("publication", "==", publication));
    const querySnapshot = await getDocs(q);
    
    const scrapeStatus = row.Scrape_Status || 'NOT_FOUND';
    
    if (scrapeStatus === 'NOT_FOUND' || scrapeStatus === 'ERROR') {
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const docRef = doc(db, "journalists", docId);
        await deleteDoc(docRef);
        console.log(`Deleted junk/not found record: ${name} (${publication})`);
        deleted++;
      } else {
        console.log(`Skipped (not found on Skribe): ${name} (${publication})`);
        skippedNotFound++;
      }
      continue;
    }
    
    // Construct address
    const locationParts = [];
    if (row.City) locationParts.push(row.City);
    if (row.State) locationParts.push(row.State);
    if (row.Country) locationParts.push(row.Country);
    const address = locationParts.join(", ");
    
    // Construct bio
    const bioParts = [];
    if (row.Beat) bioParts.push(`Beat: ${row.Beat}`);
    if (row.Media_Types) bioParts.push(`Media: ${row.Media_Types}`);
    if (row.Profile_URL) bioParts.push(`Profile: ${row.Profile_URL}`);
    const bio = bioParts.join(" | ") || "Enriched via Skribe Scraper.";
    
    const docData = {
      name: name,
      role: row.Title || 'Reporter',
      publication: publication,
      category: row.Beat || 'General',
      email: row.Email || '',
      phone: row.Phone || '',
      address: address || 'Remote',
      bio: bio,
      // Extra metadata preserved in Firestore
      twitter: row.Twitter || '',
      linkedin: row.LinkedIn || '',
      scribeProfile: row.Profile_URL || '',
      journalistId: row.Journalist_ID || '',
      mediaTypes: row.Media_Types || '',
      city: row.City || '',
      state: row.State || '',
      country: row.Country || '',
      photo: row.Photo || '',
      updatedAt: new Date().toISOString()
    };
    
    if (!querySnapshot.empty) {
      // Update existing document with new metadata fields
      const docId = querySnapshot.docs[0].id;
      const docRef = doc(db, "journalists", docId);
      await updateDoc(docRef, docData);
      console.log(`Updated existing: ${name} (${publication})`);
      updated++;
    } else {
      // Insert new document
      await addDoc(journalistsRef, {
        ...docData,
        createdAt: new Date().toISOString()
      });
      console.log(`Added: ${name} (${publication})`);
      added++;
    }
  }
  
  console.log(`\nImport finished!`);
  console.log(`Added (new): ${added}`);
  console.log(`Updated (existing): ${updated}`);
  console.log(`Deleted (junk/not found): ${deleted}`);
  console.log(`Skipped not found (not in db): ${skippedNotFound}`);
  process.exit(0);
}

run().catch(console.error);
