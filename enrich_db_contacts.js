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
    console.error("Error: Credentials not found in .env");
    process.exit(1);
  }
  
  const headers = {
    'Authorization': `Bearer ${jwt}`,
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  };
  
  console.log("Fetching all journalists from Firestore...");
  const snap = await getDocs(collection(db, "journalists"));
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  
  console.log(`Total documents loaded: ${docs.length}`);
  
  // Filter for records that need enrichment (have journalistId, but lack email or phone or socials)
  const targets = docs.filter(d => {
    const id = d.journalistId || '';
    if (!id) return false;
    
    // Check if fields are empty
    const hasEmptyField = !d.email || !d.phone || !d.linkedin || !d.twitter;
    return hasEmptyField;
  });
  
  console.log(`Found ${targets.length} journalists needing contact detail enrichment.`);
  
  let successCount = 0;
  
  for (let i = 0; i < targets.length; i++) {
    const j = targets[i];
    const jId = j.journalistId;
    
    console.log(`[${i + 1}/${targets.length}] Fetching contact details for: ${j.name} (ID: ${jId})...`);
    
    // Safe delay (250 milliseconds) to prevent rate limits
    await sleep(250);
    
    try {
      const url = `https://www.goskribe.com/api/v1/journalists/get-journalist-by-id?Id=${jId}`;
      const res = await fetch(url, { headers });
      
      if (res.status === 200) {
        const json = await res.json();
        const profile = json?.data || {};
        
        // Extract emails and phones from nested contactDetails
        let workEmail = '';
        let personalEmail = '';
        let mobile = '';
        let officePhone = '';
        
        const contacts = profile.contactDetails || [];
        if (Array.isArray(contacts)) {
          for (const c of contacts) {
            if (!c) continue;
            const ctype = String(c.type || '').toLowerCase();
            const cval = String(c.value || '').trim();
            if (ctype.includes('work email')) {
              workEmail = cval;
            } else if (ctype.includes('personal email')) {
              personalEmail = cval;
            } else if (ctype.includes('email') && !workEmail) {
              workEmail = cval;
            } else if (ctype.includes('mobile')) {
              mobile = cval;
            } else if (ctype.includes('phone')) {
              officePhone = cval;
            }
          }
        }
        
        const email = workEmail || personalEmail || profile.email || profile.vchEmail || j.email || '';
        const phone = mobile || officePhone || profile.phone || profile.vchPhone || j.phone || '';
        
        // Extract socials from nested journoSocial
        const social = profile.journoSocial || {};
        const twitter = social.vchTwitter || profile.vchTwitter || j.twitter || '';
        const linkedin = social.vchLinkedinLink || profile.linkedin || j.linkedin || '';
        
        const updateData = {
          email,
          phone,
          twitter,
          linkedin,
          updatedAt: new Date().toISOString()
        };
        
        // Update document
        await updateDoc(doc(db, "journalists", j.id), updateData);
        console.log(`   -> SUCCESS: Updated details for ${j.name} | Email: ${email || 'N/A'} | Phone: ${phone || 'N/A'} | LinkedIn: ${linkedin || 'N/A'}`);
        successCount++;
      } else {
        console.warn(`   -> WARNING: Failed status ${res.status}`);
      }
    } catch (err) {
      console.error(`   -> ERROR processing ${j.name}: ${err.message}`);
    }
  }
  
  console.log(`\nEnrichment finished! Successfully enriched ${successCount} journalists.`);
  process.exit(0);
}

run().catch(console.error);
