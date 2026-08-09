import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
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

function getPageToken(page) {
  const tokenObj = { page };
  const tokenStr = JSON.stringify(tokenObj);
  return Buffer.from(tokenStr).toString('base64');
}

function extractStr(val) {
  if (!val) return '';
  if (Array.isArray(val)) {
    return val.map(v => {
      if (typeof v === 'object' && v !== null) {
        return v.outletName || v.name || v.cityName || v.city || v.stateName || v.state || v.countryName || v.country || v.beatName || v.categoryName || '';
      }
      return String(v);
    }).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    return val.outletName || val.name || val.cityName || val.city || val.stateName || val.state || val.countryName || val.country || val.beatName || val.categoryName || '';
  }
  return String(val);
}

async function run() {
  const env = loadEnv();
  const jwt = env.SKRIBE_JWT_TOKEN;
  const cookie = env.SKRIBE_COOKIE;
  
  if (!jwt || !cookie) {
    console.error("Error: Credentials not found in .env");
    process.exit(1);
  }
  
  console.log(`Starting Scrape for India Today journalists... Target: 500 records`);
  
  const headers = {
    'Authorization': `Bearer ${jwt}`,
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  };
  
  let totalProcessed = 0;
  const targetLimit = 500;
  let page = 1;
  let hasMore = true;
  
  const journalistsRef = collection(db, "journalists");
  
  while (hasMore && totalProcessed < targetLimit) {
    console.log(`\n--- Fetching Page ${page} ---`);
    // OutletFilter=1540 is India Today on Skribe
    let url = `https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=1540&SearchFilter=&pageSize=60`;
    if (page > 1) {
      url += `&token=${getPageToken(page)}`;
    }
    
    let items = [];
    try {
      const res = await fetch(url, { headers });
      if (res.status !== 200) {
        console.error(`Search API failed with status ${res.status}`);
        break;
      }
      const json = await res.json();
      items = json?.data?.items || json?.items || json?.data || [];
      if (!Array.isArray(items)) {
        if (json?.data && Array.isArray(json.data.items)) {
          items = json.data.items;
        } else {
          items = [];
        }
      }
    } catch (err) {
      console.error(`Search API fetch error: ${err.message}`);
      break;
    }
    
    if (items.length === 0) {
      console.log("No more journalists found.");
      break;
    }
    
    console.log(`Found ${items.length} records on page ${page}. Processing profiles...`);
    
    for (const searchItem of items) {
      if (totalProcessed >= targetLimit) {
        hasMore = false;
        break;
      }
      
      const name = (searchItem.vchJournalistName || searchItem.name || '').trim();
      const journalistId = searchItem.intJournalistId || searchItem.id || searchItem.journalistId;
      const publication = extractStr(searchItem.outlets || searchItem.outlet || 'India Today');
      
      if (!name || !journalistId) continue;
      
      console.log(`[${totalProcessed + 1}/${targetLimit}] Fetching profile details for: ${name} (ID: ${journalistId})`);
      
      // Delay for safety (2 seconds)
      await sleep(2000);
      
      let profile = {};
      try {
        const detailUrl = `https://www.goskribe.com/api/v1/journalists/get-journalist-by-id?Id=${journalistId}`;
        const resDetail = await fetch(detailUrl, { headers });
        if (resDetail.status === 200) {
          const detailJson = await resDetail.json();
          profile = detailJson?.data || {};
        } else {
          console.warn(`   -> WARNING: Failed to fetch profile details (status: ${resDetail.status})`);
        }
      } catch (err) {
        console.warn(`   -> WARNING: Detail fetch error: ${err.message}`);
      }
      
      // Extract properties
      const title = searchItem.vchJournoTitle || profile.vchJournoTitle || profile.journoTitle || 'Reporter';
      
      // Parse nested contactDetails
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
      
      const email = workEmail || personalEmail || profile.email || profile.vchEmail || searchItem.email || '';
      const phone = mobile || officePhone || profile.phone || profile.vchPhone || searchItem.phone || '';
      
      // Parse nested journoSocial
      const social = profile.journoSocial || {};
      const twitter = extractStr(social.vchTwitter || profile.vchTwitter || profile.twitter || searchItem.twitter || '');
      const linkedin = extractStr(social.vchLinkedinLink || profile.linkedin || searchItem.linkedin || '');
      const photo = extractStr(profile.photo || searchItem.photo || '');
      
      // Parse nested location
      let city = '';
      let state = '';
      const locations = profile.journoLocations || [];
      if (Array.isArray(locations) && locations.length > 0 && locations[0]) {
        city = extractStr(locations[0].vchCity || locations[0].city || '');
        state = extractStr(locations[0].vchState || locations[0].state || '');
      }
      if (!city) city = extractStr(profile.city || searchItem.city || '');
      if (!state) state = extractStr(profile.state || searchItem.state || '');
      const country = extractStr(profile.country || searchItem.country || '');
      
      const beat = extractStr(profile.beat || searchItem.beat || 'General');
      const mediaTypes = extractStr(profile.mediaTypes || searchItem.mediaTypes || '');
      const profileUrl = `https://www.goskribe.com/journalistProfile/${journalistId}`;
      
      // Construct address
      const locationParts = [];
      if (city) locationParts.push(city);
      if (state) locationParts.push(state);
      if (country) locationParts.push(country);
      const address = locationParts.join(", ") || 'Remote';
      
      // Construct bio
      const bioParts = [];
      if (beat) bioParts.push(`Beat: ${beat}`);
      if (mediaTypes) bioParts.push(`Media: ${mediaTypes}`);
      bioParts.push(`Profile: ${profileUrl}`);
      const bio = bioParts.join(" | ");
      
      const docData = {
        name,
        role: title,
        publication,
        category: beat,
        email,
        phone,
        address,
        bio,
        twitter,
        linkedin,
        scribeProfile: profileUrl,
        journalistId: String(journalistId),
        mediaTypes,
        city,
        state,
        country,
        photo,
        updatedAt: new Date().toISOString()
      };
      
      // Look up if duplicate exists in Firestore
      const q = query(journalistsRef, where("name", "==", name), where("publication", "==", publication));
      const qSnap = await getDocs(q);
      
      if (!qSnap.empty) {
        // Update existing record
        const docId = qSnap.docs[0].id;
        await updateDoc(doc(db, "journalists", docId), docData);
        console.log(`   -> SUCCESS: Updated existing: ${name}`);
      } else {
        // Insert new record
        await addDoc(journalistsRef, {
          ...docData,
          createdAt: new Date().toISOString()
        });
        console.log(`   -> SUCCESS: Added new: ${name}`);
      }
      
      totalProcessed++;
    }
    
    page++;
    // Sleep between page requests
    await sleep(2000);
  }
  
  console.log(`\nScrape finished! Successfully processed ${totalProcessed} India Today journalists.`);
  process.exit(0);
}

run().catch(console.error);
