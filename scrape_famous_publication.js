import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';

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

function loadEnv() {
  const envPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/.env');
  if (!fs.existsSync(envPath)) {
    console.error("Error: Scraper .env file not found at:", envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();
const jwt = env.SKRIBE_JWT_TOKEN;
const cookie = env.SKRIBE_COOKIE;

if (!jwt) {
  console.error("Error: SKRIBE_JWT_TOKEN not set in scraper .env.");
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${jwt}`,
  'Accept': 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://www.goskribe.com/journalist-search'
};
if (cookie) {
  headers['Cookie'] = cookie;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalize(str) {
  return String(str || '').trim().toLowerCase();
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

async function getExistingJournalistKeys() {
  console.log("Loading existing journalists from Firestore...");
  const snapshot = await getDocs(collection(db, "journalists"));
  const keys = new Set();
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.name) {
      keys.add(normalize(data.name));
    }
    if (docSnap.id) {
      keys.add(normalize(docSnap.id));
    }
    if (data.scribeProfile) {
      const parts = data.scribeProfile.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) keys.add(normalize(lastPart));
    }
  });
  console.log(`Loaded ${keys.size} duplicate prevention keys.`);
  return keys;
}

async function findOutletId(pubName) {
  console.log(`Searching Skribe for outlet: "${pubName}"...`);
  const url = `https://www.goskribe.com/api/v1/journalist-records/get-outlet-filter?pageSize=10000&pageNumber=1`;
  const res = await fetch(url, { headers });
  
  if (res.status === 401) {
    console.error("\n❌ Error: Skribe API returned 401 Unauthorized. Your token in .env is expired!");
    process.exit(1);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch outlets: status ${res.status}`);
  }
  
  const json = await res.json();
  const data = json.data || json.items || [];
  
  const searchLower = pubName.toLowerCase();
  let bestMatch = null;
  
  for (const item of data) {
    const name = item.value || item.label || item.name || item.vchOutletName || '';
    if (name.toLowerCase().includes(searchLower)) {
      bestMatch = item;
      break;
    }
  }
  
  if (!bestMatch) {
    console.log("Outlets in list:");
    data.slice(0, 15).forEach(o => {
      const name = o.value || o.label || o.name || o.vchOutletName || '';
      const id = o.id || '';
      console.log(` - ${name} (ID: ${id})`);
    });
    throw new Error(`No publication matching "${pubName}" was found in Skribe.`);
  }
  
  const bestName = bestMatch.value || bestMatch.label || bestMatch.name || bestMatch.vchOutletName || '';
  const bestId = bestMatch.id || '';
  console.log(`Matched: "${bestName}" (ID: ${bestId})`);
  return { id: bestId, name: bestName };
}


async function fetchProfileDetails(journalistId) {
  const url = `https://www.goskribe.com/api/v1/journalists/get-journalist-by-id?Id=${journalistId}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

async function fetchRecentArticles(journalistId) {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  const formatDate = (date) => date.toISOString().split('T')[0];
  const startDate = formatDate(sixMonthsAgo);
  const endDate = formatDate(today);

  const url = `https://www.goskribe.com/api/v1/smart-profiles/journalist-portfolio-by-jid?Jid=${journalistId}&pageSize=10&CurrentPage=1&StartDate=${startDate}&EndDate=${endDate}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const json = await res.json();
  const rawArticles = json?.data || [];
  if (Array.isArray(rawArticles)) {
    return rawArticles.map(art => ({
      title: art.vchtitle || '',
      url: art.vchurl || '',
      publishDate: art.dtmpublishdate || '',
      sentiment: art.vchsentiment || 'neutral',
      summary: art.mtxtarticlesummary || '',
      website: art.vchwebsite || ''
    }));
  }
  return [];
}

async function run() {
  const args = process.argv.slice(2);
  const targetPub = args[0];
  const limit = parseInt(args[1]) || 50;
  
  if (!targetPub) {
    console.log("Usage: node scrape_famous_publication.js \"<publication_name>\" [limit]");
    console.log("Example: node scrape_famous_publication.js \"Bloomberg\" 50");
    process.exit(0);
  }
  
  const existingKeys = await getExistingJournalistKeys();
  const outlet = await findOutletId(targetPub);
  
  console.log(`Starting paginated search for journalists under outlet ID ${outlet.id}...`);
  let page = 1;
  let totalSaved = 0;
  let hasMore = true;
  
  while (hasMore && totalSaved < limit) {
    console.log(`\n--- Fetching Page ${page} ---`);
    let url = `https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=${outlet.id}&pageSize=60`;
    
    if (page > 1) {
      const tokenJson = JSON.stringify({ page });
      const tokenParam = Buffer.from(tokenJson).toString('base64');
      url += `&token=${tokenParam}`;
    }
    
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch page ${page}: status ${res.status}`);
      break;
    }
    
    const json = await res.json();
    const items = json.data || json.items || [];
    if (items.length === 0) {
      console.log("No more journalists found.");
      break;
    }
    

    
    for (const item of items) {
      if (totalSaved >= limit) break;
      
      const name = (item.vchJournalistName || item.name || '').trim();
      const jId = item.intJournalistId || item.id || item.journalistId;
      
      if (!name || !jId) continue;
      
      const normName = normalize(name);
      const normId = normalize(String(jId));
      
      if (existingKeys.has(normName) || existingKeys.has(normId)) {
        console.log(`   -> [SKIPPED] ${name} (ID: ${jId}) already exists in Firestore.`);
        continue;
      }
      
      // Safety pause every 15 items to prevent detection
      if (totalSaved > 0 && totalSaved % 15 === 0) {
        console.log(`\n[Anti-Ban Protection] Pausing for 30 seconds...`);
        await delay(30000);
      }
      
      console.log(`[${totalSaved + 1}/${limit}] Fetching details: ${name} (ID: ${jId})...`);
      await delay(4000); // Polite 4-second rate limit
      
      const profile = await fetchProfileDetails(jId) || {};
      
      await delay(4000); // Polite 4-second rate limit
      console.log(`   -> Fetching last 10 articles for: ${name}...`);
      const articles = await fetchRecentArticles(jId);
      
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
      
      const email = workEmail || personalEmail || profile.email || profile.vchEmail || item.email || '';
      const phone = mobile || officePhone || profile.phone || profile.vchPhone || item.phone || '';
      
      // Parse nested journoSocial
      const social = profile.journoSocial || {};
      const twitter = extractStr(social.vchTwitter || profile.vchTwitter || profile.twitter || item.twitter || '');
      const linkedin = extractStr(social.vchLinkedinLink || profile.linkedin || item.linkedin || '');
      const photo = extractStr(profile.photo || item.photo || '');
      
      // Parse nested location
      let city = '';
      let state = '';
      const locations = profile.journoLocations || [];
      if (Array.isArray(locations) && locations.length > 0 && locations[0]) {
        city = extractStr(locations[0].vchCity || locations[0].city || '');
        state = extractStr(locations[0].vchState || locations[0].state || '');
      }
      if (!city) city = extractStr(profile.city || item.city || '');
      if (!state) state = extractStr(profile.state || item.state || '');
      const country = extractStr(profile.country || item.country || '');
      
      const locationParts = [];
      if (city) locationParts.push(city);
      if (state) locationParts.push(state);
      if (country) locationParts.push(country);
      const location = locationParts.join(", ") || profile.location || item.location || '';
      const beat = extractStr(profile.beats || item.beats || item.beat || '');
      const bio = profile.description || profile.bio || item.description || item.bio || '';
      const careerSummary = (profile.journCareerSum || []).map(c => ({
        year: c.year || '',
        toYear: c.toYear || '',
        company: c.company || '',
        description: c.description || ''
      }));
      
      const docData = {
        name,
        journalistId: String(jId),
        publication: outlet.name,
        email,
        phone,
        linkedin,
        twitter,
        photo,
        beat,
        location,
        bio,
        careerSummary,
        articles,
        scribeProfile: `https://www.goskribe.com/journalist/${jId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = doc(db, "journalists", String(jId));
      try {
        await setDoc(docRef, docData);
        console.log(`   -> SUCCESS: Saved new journalist: ${name} (ID: ${jId})`);
        totalSaved++;
      } catch (err) {
        console.error(`   -> Failed writing to Firestore:`, err.message);
      }
      
      existingKeys.add(normName);
      existingKeys.add(normId);
    }
    
    page++;
    await delay(5000); // Wait between page crawls
  }
  
  console.log(`\nJob complete! Scraped and imported ${totalSaved} new journalists.`);
  process.exit(0);
}

run().catch(console.error);
