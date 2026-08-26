import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function run() {
  const journalistsRef = collection(db, "journalists");
  
  // 1. Clear out current journalists to have a clean reset
  console.log("Clearing current collection...");
  const snapshot = await getDocs(journalistsRef);
  let cleared = 0;
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "journalists", docSnap.id));
    cleared++;
  }
  console.log(`Cleared ${cleared} documents from Firestore.`);

  // Helper to construct address
  const buildAddress = (row) => {
    const parts = [];
    if (row.City) parts.push(row.City);
    if (row.State) parts.push(row.State);
    if (row.Country) parts.push(row.Country);
    return parts.join(", ") || 'Remote';
  };

  // Helper to construct bio
  const buildBio = (row) => {
    const parts = [];
    if (row.Beat) parts.push(`Beat: ${row.Beat}`);
    if (row.Media_Types) parts.push(`Media: ${row.Media_Types}`);
    if (row.Profile_URL) parts.push(`Profile: ${row.Profile_URL}`);
    return parts.join(" | ") || "Imported from backup.";
  };

  let totalAdded = 0;

  // 2. Import from journalists_extracted.json
  const jsonPath = path.resolve('src/data/journalists_extracted.json');
  if (fs.existsSync(jsonPath)) {
    console.log("Seeding from journalists_extracted.json...");
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    for (const item of jsonData) {
      await addDoc(journalistsRef, {
        name: item.name || '',
        role: item.role || 'Reporter',
        publication: item.publication || 'Independent',
        category: item.category || 'General',
        email: item.email || '',
        phone: item.phone || '',
        address: item.address || '',
        bio: item.bio || '',
        createdAt: new Date().toISOString()
      });
      totalAdded++;
    }
  }

  // 3. Import from journalists_enriched.xlsx
  const enrichedPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/journalists_enriched.xlsx');
  if (fs.existsSync(enrichedPath)) {
    console.log("Seeding from journalists_enriched.xlsx...");
    const workbook = XLSX.readFile(enrichedPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    for (const row of excelData) {
      if (!row.Name) continue;
      
      const docData = {
        name: row.Name,
        role: row.Title || 'Reporter',
        publication: row.Publication || 'Independent',
        category: row.Beat || 'General',
        email: row.Email || '',
        phone: row.Phone || '',
        address: buildAddress(row),
        bio: buildBio(row),
        twitter: row.Twitter || '',
        linkedin: row.LinkedIn || '',
        scribeProfile: row.Profile_URL || '',
        journalistId: row.Journalist_ID || '',
        mediaTypes: row.Media_Types || '',
        city: row.City || '',
        state: row.State || '',
        country: row.Country || '',
        photo: row.Photo || '',
        createdAt: new Date().toISOString()
      };
      await addDoc(journalistsRef, docData);
      totalAdded++;
    }
  }

  // 4. Import from all_scraped_journalists.xlsx
  const allScrapedPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/all_scraped_journalists.xlsx');
  if (fs.existsSync(allScrapedPath)) {
    console.log("Seeding from all_scraped_journalists.xlsx...");
    const workbook = XLSX.readFile(allScrapedPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    for (const row of excelData) {
      if (!row.Name) continue;
      
      const docData = {
        name: row.Name,
        role: row.Title || 'Reporter',
        publication: row.Outlet || row['Publication/Outlet'] || 'Independent',
        category: row.Beat || 'General',
        email: row.Email || '',
        phone: row.Phone || '',
        address: buildAddress(row),
        bio: buildBio(row),
        twitter: row.Twitter || '',
        linkedin: row.LinkedIn || '',
        scribeProfile: row.Profile_URL || '',
        journalistId: row.Journalist_ID || '',
        mediaTypes: row.Media_Types || '',
        city: row.City || '',
        state: row.State || '',
        photo: row.Photo || '',
        createdAt: new Date().toISOString()
      };
      await addDoc(journalistsRef, docData);
      totalAdded++;
    }
  }

  console.log(`\n🎉 Rebuild complete! Successfully loaded ${totalAdded} documents into Firestore.`);
}

run().catch(console.error);
