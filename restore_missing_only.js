import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

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

// Simple helper to clean and normalize strings
function normalize(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
  console.log("Fetching all current database profiles to check what's missing...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  const existingKeys = new Set();
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const key = `${normalize(data.name)}|${normalize(data.publication)}`;
    existingKeys.add(key);
  });
  
  console.log(`Currently have ${existingKeys.size} unique profiles in Firestore.`);

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

  let totalRestored = 0;

  // 1. Check & restore from journalists_extracted.json
  const jsonPath = path.resolve('src/data/journalists_extracted.json');
  if (fs.existsSync(jsonPath)) {
    console.log("Checking journalists_extracted.json...");
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    for (const item of jsonData) {
      const key = `${normalize(item.name)}|${normalize(item.publication)}`;
      if (!existingKeys.has(key)) {
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
        existingKeys.add(key);
        totalRestored++;
        console.log(`  -> Restored from JSON: ${item.name} (${item.publication})`);
      }
    }
  }

  // 2. Check & restore from journalists_enriched.xlsx
  const enrichedPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/journalists_enriched.xlsx');
  if (fs.existsSync(enrichedPath)) {
    console.log("Checking journalists_enriched.xlsx...");
    const workbook = XLSX.readFile(enrichedPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    for (const row of excelData) {
      if (!row.Name || row.Scrape_Status === 'NOT_FOUND' || row.Scrape_Status === 'ERROR') continue;
      
      const key = `${normalize(row.Name)}|${normalize(row.Publication)}`;
      if (!existingKeys.has(key)) {
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
        existingKeys.add(key);
        totalRestored++;
        console.log(`  -> Restored from Enriched: ${row.Name} (${row.Publication})`);
      }
    }
  }

  // 3. Check & restore from all_scraped_journalists.xlsx
  const allScrapedPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/all_scraped_journalists.xlsx');
  if (fs.existsSync(allScrapedPath)) {
    console.log("Checking all_scraped_journalists.xlsx...");
    const workbook = XLSX.readFile(allScrapedPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    for (const row of excelData) {
      if (!row.Name) continue;
      
      const pub = row.Outlet || row['Publication/Outlet'] || 'Independent';
      const key = `${normalize(row.Name)}|${normalize(pub)}`;
      if (!existingKeys.has(key)) {
        const docData = {
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
        };
        await addDoc(journalistsRef, docData);
        existingKeys.add(key);
        totalRestored++;
        console.log(`  -> Restored from All Scraped: ${row.Name} (${pub})`);
      }
    }
  }

  console.log(`\n🎉 Restoration finished! Successfully restored ${totalRestored} missing unique profiles without deleting anything.`);
}

run().catch(console.error);
