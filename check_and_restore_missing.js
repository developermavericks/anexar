import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';

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

function normalize(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
  console.log("Fetching current journalists from Firestore...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  const dbKeys = new Set();
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    // Create name|publication lookup key
    const name = normalize(data.name);
    const pub = normalize(data.publication);
    if (name) {
      dbKeys.add(`${name}|${pub}`);
    }
  });

  console.log(`Currently have ${dbKeys.size} unique (name|publication) profiles in Firestore.`);

  const missingFromJSON = [];
  const missingFromEnriched = [];
  const missingFromAllScraped = [];

  // Helper for address & bio
  const buildAddress = (row) => {
    const parts = [];
    if (row.City) parts.push(row.City);
    if (row.State) parts.push(row.State);
    if (row.Country) parts.push(row.Country);
    return parts.join(", ") || 'Remote';
  };

  const buildBio = (row) => {
    const parts = [];
    if (row.Beat) parts.push(`Beat: ${row.Beat}`);
    if (row.Media_Types) parts.push(`Media: ${row.Media_Types}`);
    if (row.Profile_URL) parts.push(`Profile: ${row.Profile_URL}`);
    return parts.join(" | ") || "Imported from backup.";
  };

  // 1. Check journalists_extracted.json
  const jsonPath = path.resolve('src/data/journalists_extracted.json');
  if (fs.existsSync(jsonPath)) {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    jsonData.forEach(item => {
      const key = `${normalize(item.name)}|${normalize(item.publication)}`;
      if (!dbKeys.has(key)) {
        missingFromJSON.push({
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
      }
    });
  }

  // 2. Check journalists_enriched.xlsx
  const enrichedPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/journalists_enriched.xlsx');
  if (fs.existsSync(enrichedPath)) {
    const workbook = XLSX.readFile(enrichedPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    excelData.forEach(row => {
      if (!row.Name) return;
      const key = `${normalize(row.Name)}|${normalize(row.Publication)}`;
      if (!dbKeys.has(key)) {
        missingFromEnriched.push({
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
        });
      }
    });
  }

  // 3. Check all_scraped_journalists.xlsx
  const allScrapedPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/all_scraped_journalists.xlsx');
  if (fs.existsSync(allScrapedPath)) {
    const workbook = XLSX.readFile(allScrapedPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    excelData.forEach(row => {
      if (!row.Name) return;
      const pub = row.Outlet || row['Publication/Outlet'] || 'Independent';
      const key = `${normalize(row.Name)}|${normalize(pub)}`;
      if (!dbKeys.has(key)) {
        missingFromAllScraped.push({
          name: row.Name,
          role: row.Title || 'Reporter',
          publication: pub,
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
        });
      }
    });
  }

  const totalMissing = missingFromJSON.length + missingFromEnriched.length + missingFromAllScraped.length;
  console.log(`\n=== MISSING PROFILES REPORT ===`);
  console.log(`Missing from JSON: ${missingFromJSON.length}`);
  console.log(`Missing from Enriched Sheet: ${missingFromEnriched.length}`);
  console.log(`Missing from All Scraped Sheet: ${missingFromAllScraped.length}`);
  console.log(`Total Missing Profiles: ${totalMissing}`);

  if (totalMissing === 0) {
    console.log("\n🎉 Everything in your Excel and JSON files is already in your Firestore database!");
    return;
  }

  console.log("\nUploading missing journalists to Firestore...");
  let uploaded = 0;
  
  for (const docData of missingFromJSON) {
    await addDoc(journalistsRef, docData);
    uploaded++;
  }
  
  for (const docData of missingFromEnriched) {
    await addDoc(journalistsRef, docData);
    uploaded++;
  }
  
  for (const docData of missingFromAllScraped) {
    await addDoc(journalistsRef, docData);
    uploaded++;
  }

  console.log(`\n🎉 Success! Uploaded ${uploaded} missing journalists to Firestore. All local data is now completely restored.`);
}

run().catch(console.error);
