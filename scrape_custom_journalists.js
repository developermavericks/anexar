import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import XLSX from 'xlsx';

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
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
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

async function getExistingJournalistsMap() {
  console.log("Loading all existing journalists from Firestore to check enrichment status...");
  const snapshot = await getDocs(collection(db, "journalists"));
  const existingMap = new Map();
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const docId = docSnap.id;
    
    // Map by Name & Publication
    if (data.name && data.publication) {
      const key = `${normalize(data.name)}|${normalize(data.publication)}`;
      existingMap.set(key, { docId, ...data });
    }
    
    // Map by name only as fallback (so we can check if it exists by name)
    if (data.name) {
      const keyName = normalize(data.name);
      if (!existingMap.has(keyName)) {
        existingMap.set(keyName, { docId, ...data });
      }
    }
    
    // Map by journalistId if available
    if (data.journalistId) {
      existingMap.set(normalize(data.journalistId), { docId, ...data });
    }
  });
  
  console.log(`Loaded map for ${snapshot.docs.length} Firestore journalists.`);
  return existingMap;
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

function matchesOutlet(searchPub, outlets) {
  const sp = normalize(searchPub);
  if (!sp) return false;
  if (!outlets) return false;
  
  const outletList = Array.isArray(outlets) ? outlets : [outlets];
  for (const o of outletList) {
    if (!o) continue;
    if (typeof o === 'object') {
      const oId = String(o.id || o.intOutletId || o.outletId || '').trim();
      const oName = normalize(o.outletName || o.name || o.vchOutletName || '');
      if (sp === oId) return true;
      if (sp === oName || oName.includes(sp) || sp.includes(oName)) return true;
    } else {
      const strVal = normalize(String(o));
      if (sp === strVal || strVal.includes(sp) || sp.includes(strVal)) return true;
    }
  }
  return false;
}

function scoreMatch(searchName, matchName, searchPub, outlets) {
  const sn = normalize(searchName);
  const mn = normalize(matchName);
  let nameScore = 0;
  if (sn === mn) nameScore = 100;
  else if (sn.includes(mn) || mn.includes(sn)) nameScore = 80;
  
  let pubScore = 0;
  if (matchesOutlet(searchPub, outlets)) {
    pubScore = 100;
  } else {
    const sp = normalize(searchPub);
    const mp = normalize(extractStr(outlets));
    if (sp && mp && (sp.includes(mp) || mp.includes(sp))) {
      pubScore = 70;
    }
  }
  
  return (nameScore * 0.6) + (pubScore * 0.4);
}

async function searchJournalistOnSkribe(name) {
  const url = `https://www.goskribe.com/api/v1/journalist-records/get-journalists/?SearchFilter=${encodeURIComponent(name)}&pageSize=30`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.items || json?.items || json?.data || [];
}

async function run() {
  const existingMap = await getExistingJournalistsMap();
  
  const filePath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/input/journalists.xlsx');
  console.log("Reading input Excel file:", filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Loaded ${rows.length} rows from Excel to process.`);
  let processedCount = 0;
  let savedCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.Name || '').trim();
    const publication = (row.Publication || '').trim();
    
    if (!name) continue;
    
    const key = `${normalize(name)}|${normalize(publication)}`;
    const keyNameOnly = normalize(name);
    
    let existingDoc = existingMap.get(key) || existingMap.get(keyNameOnly);
    
    if (existingDoc) {
      console.log(`[${i + 1}/${rows.length}] [SKIPPED] "${name}" (${publication}) already exists in Firestore database.`);
      continue;
    }
    
    console.log(`[${i + 1}/${rows.length}] [NEW] "${name}" (${publication}) not found in Firestore. Scrapes Skribe.`);
    

    
    console.log(`   -> Searching Skribe for: "${name}" (${publication})...`);
    await delay(1500); // polite search break
    
    let searchResults = [];
    try {
      searchResults = await searchJournalistOnSkribe(name);
    } catch (err) {
      console.error(`Search failed for ${name}: ${err.message}`);
      if (err.message.includes('401') || err.message.includes('403')) {
        console.error("Token invalid/expired. Exiting.");
        process.exit(1);
      }
      continue;
    }
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`   -> [NOT FOUND ON SKRIBE] No results returned for "${name}".`);
      continue;
    }
    
    // Find best match
    let bestMatch = null;
    let bestScore = 0;
    
    for (const item of searchResults) {
      const matchName = item.vchJournalistName || item.name || '';
      const score = scoreMatch(name, matchName, publication, item.outlets || item.outlet);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }
    
    if (!bestMatch || bestScore < 50) {
      console.log(`   -> [NOT MATCHED] Best match score too low (${bestScore.toFixed(0)}%).`);
      continue;
    }
    
    const jId = bestMatch.intJournalistId || bestMatch.id || bestMatch.journalistId;
    const finalPubName = extractStr(bestMatch.outlets || bestMatch.outlet || publication || 'Independent');
    
    console.log(`   -> Found match: "${bestMatch.vchJournalistName}" (${finalPubName}) [Score: ${bestScore.toFixed(0)}%, ID: ${jId}]`);
    
    await delay(1500); // polite detail break
    console.log(`   -> Fetching profile details...`);
    const profile = await fetchProfileDetails(jId) || {};
    
    await delay(1500); // polite articles break
    console.log(`   -> Fetching last 10 articles...`);
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
    
    const email = workEmail || personalEmail || profile.email || profile.vchEmail || bestMatch.email || '';
    const phone = mobile || officePhone || profile.phone || profile.vchPhone || bestMatch.phone || '';
    
    // Parse nested journoSocial
    const social = profile.journoSocial || {};
    const twitter = extractStr(social.vchTwitter || profile.vchTwitter || profile.twitter || bestMatch.twitter || '');
    const linkedin = extractStr(social.vchLinkedinLink || profile.linkedin || bestMatch.linkedin || '');
    const photo = extractStr(profile.photo || bestMatch.photo || '');
    
    // Parse nested location
    let city = '';
    let state = '';
    const locations = profile.journoLocations || [];
    if (Array.isArray(locations) && locations.length > 0 && locations[0]) {
      city = extractStr(locations[0].vchCity || locations[0].city || '');
      state = extractStr(locations[0].vchState || locations[0].state || '');
    }
    if (!city) city = extractStr(profile.city || bestMatch.city || '');
    if (!state) state = extractStr(profile.state || bestMatch.state || '');
    const country = extractStr(profile.country || bestMatch.country || '');
    
    const locationParts = [];
    if (city) locationParts.push(city);
    if (state) locationParts.push(state);
    if (country) locationParts.push(country);
    const location = locationParts.join(", ") || profile.location || bestMatch.location || '';
    const beat = extractStr(profile.beats || bestMatch.beats || bestMatch.beat || '');
    const bio = profile.description || profile.bio || bestMatch.description || bestMatch.bio || '';
    const careerSummary = (profile.journCareerSum || []).map(c => ({
      year: c.year || '',
      toYear: c.toYear || '',
      company: c.company || '',
      description: c.description || ''
    }));
    
    const docData = {
      name: (bestMatch.vchJournalistName || name || '').trim(),
      journalistId: String(jId || ''),
      publication: (finalPubName || '').trim(),
      email: (email || (existingDoc ? existingDoc.email || '' : '')).trim(),
      phone: (phone || (existingDoc ? existingDoc.phone || '' : '')).trim(),
      linkedin: (linkedin || (existingDoc ? existingDoc.linkedin || '' : '')).trim(),
      twitter: (twitter || (existingDoc ? existingDoc.twitter || '' : '')).trim(),
      photo: (photo || (existingDoc ? existingDoc.photo || '' : '')).trim(),
      beat: (beat || (existingDoc ? existingDoc.beat || '' : '')).trim(),
      location: (location || (existingDoc ? existingDoc.location || '' : '')).trim(),
      bio: (bio || (existingDoc ? existingDoc.bio || '' : '')).trim(),
      careerSummary: careerSummary || [],
      articles: articles || [],
      scribeProfile: `https://www.goskribe.com/journalist/${jId}`,
      updatedAt: new Date().toISOString()
    };
    
    try {
      const docId = existingDoc ? existingDoc.docId : String(jId);
      const docRef = doc(db, "journalists", docId);
      
      if (existingDoc) {
        await setDoc(docRef, docData, { merge: true });
        console.log(`   -> SUCCESS: Enriched existing document ${docId} (${docData.name}) with ${articles.length} articles.`);
      } else {
        await setDoc(docRef, {
          ...docData,
          createdAt: new Date().toISOString()
        });
        console.log(`   -> SUCCESS: Created new document ${docId} (${docData.name}) with ${articles.length} articles.`);
      }
      
      savedCount++;
      // Update local maps to prevent duplicate queries within this run
      existingMap.set(key, { docId, ...docData });
      existingMap.set(keyNameOnly, { docId, ...docData });
      existingMap.set(normalize(String(jId)), { docId, ...docData });
      
      // Anti-ban safety breaks after a successful write
      if (savedCount % 15 === 0) {
        console.log(`\n[Anti-Ban Safeguard] Pausing for 30 seconds to prevent rate limits...\n`);
        await delay(30000);
      }
      
    } catch (err) {
      console.error(`   -> Failed writing to Firestore:`, err.message);
    }
    
    processedCount++;
  }
  
  console.log(`\nCustom scrape & enrichment job complete!`);
  console.log(`Checked rows: ${rows.length}`);
  console.log(`Newly saved/enriched: ${savedCount}`);
  process.exit(0);
}

run().catch(console.error);
