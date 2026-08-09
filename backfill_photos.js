import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

// Simple manual .env parser
function loadEnv() {
  const envPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
  return env;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const env = loadEnv();
  const jwt = env.SKRIBE_JWT_TOKEN;
  const cookie = env.SKRIBE_COOKIE;
  
  if (!jwt || !cookie) {
    console.error("Error: SKRIBE_JWT_TOKEN or SKRIBE_COOKIE not found in scraper .env file.");
    process.exit(1);
  }
  
  console.log("Loading journalists from Firestore...");
  const snapshot = await getDocs(collection(db, "journalists"));
  const journalists = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.journalistId && !data.photo) {
      journalists.push({ id: docSnap.id, ...data });
    }
  });
  
  console.log(`Found ${journalists.length} journalists matching criteria (has journalistId, missing photo).`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < journalists.length; i++) {
    const j = journalists[i];
    console.log(`[${i + 1}/${journalists.length}] Fetching photo for: ${j.name} (ID: ${j.journalistId})`);
    
    // Mimic real human browser headers
    const headers = {
      'Authorization': `Bearer ${jwt}`,
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.goskribe.com',
      'Referer': `https://www.goskribe.com/journalistProfile/${j.journalistId}`
    };
    
    try {
      const url = `https://www.goskribe.com/api/v1/journalists/get-journalist-by-id?Id=${j.journalistId}`;
      const res = await fetch(url, { headers });
      
      if (res.status === 200) {
        const json = await res.json();
        const photo = json?.data?.photo || '';
        
        if (photo) {
          const docRef = doc(db, "journalists", j.id);
          await updateDoc(docRef, {
            photo: photo,
            updatedAt: new Date().toISOString()
          });
          console.log(`   -> SUCCESS: Photo filename found: ${photo}`);
          successCount++;
        } else {
          console.log(`   -> WARNING: Profile loaded, but no photo filename is present.`);
        }
      } else {
        console.error(`   -> FAILED: Status code ${res.status}`);
        failCount++;
      }
    } catch (err) {
      console.error(`   -> ERROR fetching: ${err.message}`);
      failCount++;
    }
    
    // Standard safety pause between sequential API calls (1.5 seconds)
    await sleep(1500);
  }
  
  console.log(`\nBackfill complete!`);
  console.log(`Successfully updated: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  process.exit(0);
}

run().catch(console.error);
