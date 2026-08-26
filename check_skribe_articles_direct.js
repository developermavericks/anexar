import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  if (!fs.existsSync(envPath)) return {};
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
const token = env.SKRIBE_JWT_TOKEN;
const cookie = env.SKRIBE_COOKIE;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.goskribe.com/'
};
if (cookie) {
  headers['Cookie'] = cookie;
}

async function run() {
  console.log("Loading Moneycontrol journalists from Firestore...");
  const snap = await getDocs(collection(db, "journalists"));
  
  const mcJournos = [];
  snap.forEach(d => {
    const data = d.data();
    if (String(data.publication || '').toLowerCase().includes('moneycontrol') && data.journalistId) {
      mcJournos.push({ name: data.name, id: data.journalistId });
    }
  });
  
  console.log(`Found ${mcJournos.length} Moneycontrol journalists with Skribe IDs in DB.`);
  if (mcJournos.length === 0) return;
  
  // Pick first 3 as sample
  const sample = mcJournos.slice(0, 3);
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  const formatDate = (date) => date.toISOString().split('T')[0];
  const startDate = formatDate(sixMonthsAgo);
  const endDate = formatDate(today);

  for (const j of sample) {
    console.log(`\nFetching raw articles for: ${j.name} (Skribe ID: ${j.id})`);
    const articlesUrl = `https://www.goskribe.com/api/v1/smart-profiles/journalist-portfolio-by-jid?Jid=${j.id}&pageSize=10&CurrentPage=1&StartDate=${startDate}&EndDate=${endDate}`;
    
    try {
      const res = await fetch(articlesUrl, { headers });
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        const json = await res.json();
        console.log(`Response JSON Keys:`, Object.keys(json));
        console.log(`Response Data Type:`, typeof json.data, Array.isArray(json.data) ? `Array (length: ${json.data.length})` : 'Object');
        console.log(`Response JSON sample:`, JSON.stringify(json, null, 2).slice(0, 1000));
      }
    } catch (err) {
      console.error("Error fetching:", err.message);
    }
  }
}

run().catch(console.error);
