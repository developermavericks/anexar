import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load root .env manually
function loadRootEnv() {
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim();
          process.env[key] = val;
        }
      });
    }
  } catch (err) {
    // Ignore
  }
}
loadRootEnv();

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

const SERPER_KEY = process.env.SERPER_API_KEY || 'a1197e2fb88842f0105953569dd4d4f11031c5bb';
const GROQ_KEY = process.env.GROQ_API_KEY || '';

const SERPER_URL = 'https://google.serper.dev/search';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

const SECTOR_QUERIES = {
  "BFSI": [
    "upcoming fintech awards India 2026 2027",
    "upcoming banking technology summits India 2026 2027",
    "upcoming BFSI conclaves India 2026 2027"
  ],
  "Technology": [
    "upcoming technology conclaves India 2026 2027",
    "upcoming startup summit awards India 2026 2027",
    "upcoming SaaS AI conference India 2026 2027"
  ],
  "MarTech": [
    "upcoming marketing excellence awards India 2026 2027",
    "upcoming advertising martech summit India 2026 2027",
    "upcoming brand equity summits India 2026 2027"
  ],
  "Human Resources": [
    "upcoming HR tech summit awards India 2026 2027",
    "upcoming talent development conclave India 2026 2027",
    "upcoming best places to work awards India 2026 2027"
  ],
  "eCommerce": [
    "upcoming retail congress awards India 2026 2027",
    "upcoming ecommerce summits India 2026 2027",
    "upcoming D2C founders conclave India 2026 2027"
  ],
  "Automotive": [
    "upcoming electric vehicle EV summits India 2026 2027",
    "upcoming commercial vehicle forum India 2026 2027",
    "upcoming transport logistics expo India 2026 2027"
  ],
  "Healthcare": [
    "upcoming healthcare pharma summits India 2026 2027",
    "upcoming medical leadership awards India 2026 2027",
    "upcoming biotech pharma conclave India 2026 2027"
  ]
};

async function serperSearch(query) {
  try {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'in', num: 10 })
    });
    if (res.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return serperSearch(query);
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function callGroq(prompt) {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
    if (res.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return callGroq(prompt);
    }
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}

function buildPrompt(organicResults, sector) {
  const snippets = (organicResults || []).map((r, i) => `[${i}] ${r.title}: ${r.snippet}`).join('\n');
  return `You are a database researcher. Analyze the search results and extract a list of genuinely UPCOMING events, conclaves, summits, or awards in India taking place after August 9, 2026 (or late 2026, 2027).
  
Rules:
1. Only include events that are UPCOMING. Discard any events that have already concluded (years 2025, 2024, 2023, etc.).
2. Clean up event names to be professional and concise (under 6 words).
3. The sector for these is: "${sector}".

Search Results:
${snippets}

Respond ONLY with a JSON object in this format:
{
  "events": [
    {
      "event_name": "Clean Event Name",
      "date": "DD/MM/YYYY" or "TBD" (must be future),
      "city": "Specific City in India",
      "venue": "Venue name or N/A",
      "organizer": "Organizer name or N/A",
      "event_type": "Event" or "Award"
    }
  ]
}
`;
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const CURRENT_DATE = new Date('2026-08-09T00:00:00Z');

function parseDateStr(dateStr) {
  if (!dateStr || dateStr === 'TBD') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

async function run() {
  console.log("Loading existing events from Firestore to prevent duplication...");
  const snap = await getDocs(collection(db, "events_awards"));
  const existingNames = new Set();
  
  snap.forEach(docSnap => {
    const d = docSnap.data();
    const name = d.event_name || d.name || '';
    if (name) existingNames.add(normalizeName(name));
  });
  
  console.log(`Loaded ${existingNames.size} existing events for deduplication.\n`);
  
  let totalAdded = 0;
  
  for (const [sector, queries] of Object.entries(SECTOR_QUERIES)) {
    console.log(`\n================ Sector: ${sector} ================`);
    
    for (let qIndex = 0; qIndex < queries.length; qIndex++) {
      const query = queries[qIndex];
      console.log(`\nQuery ${qIndex + 1}/${queries.length}: "${query}"`);
      
      const searchRes = await serperSearch(query);
      if (!searchRes || !searchRes.organic || searchRes.organic.length === 0) {
        console.log("  -> No search results found.");
        continue;
      }
      
      const prompt = buildPrompt(searchRes.organic, sector);
      const response = await callGroq(prompt);
      
      if (!response || !response.events) {
        console.log("  -> Groq returned empty or invalid JSON.");
        continue;
      }
      
      console.log(`  -> Groq found ${response.events.length} potential upcoming events.`);
      
      for (const ev of response.events) {
        const name = ev.event_name || '';
        const norm = normalizeName(name);
        
        if (!name) continue;
        
        // Deduplicate
        if (existingNames.has(norm)) {
          console.log(`  -> SKIPPED (Duplicate): "${name}"`);
          continue;
        }
        
        let date = ev.date || 'TBD';
        let status = 'UPCOMING';
        
        // Check date
        const parsedDate = parseDateStr(date);
        if (parsedDate && parsedDate < CURRENT_DATE) {
          console.log(`  -> SKIPPED (Concluded date ${date}): "${name}"`);
          continue; // skip past events
        }
        
        // Hard filter: if year is explicitly 2025/2024/2023, skip
        if (date.includes('2025') || date.includes('2024') || date.includes('2023')) {
          console.log(`  -> SKIPPED (Concluded year in date ${date}): "${name}"`);
          continue;
        }
        if (name.includes('2025') || name.includes('2024') || name.includes('2023')) {
          console.log(`  -> SKIPPED (Concluded year in name): "${name}"`);
          continue;
        }
        
        let location = ev.city || 'India';
        if (location.toLowerCase() === 'india' || location === '') {
          location = 'India';
        } else {
          location = location === 'Bangalore' ? 'Bengaluru' : location;
        }
        
        const venue = ev.venue || 'N/A';
        const confidence = (date && date !== 'TBD' && location !== 'India' && venue !== 'N/A') ? 90 : 75;
        
        const docData = {
          event_name: name,
          name: name,
          date,
          location,
          venue,
          organizer: ev.organizer || 'N/A',
          sector,
          event_type: ev.event_type || 'Event',
          status,
          nomination_deadline: 'Open',
          confidence,
          source_url: searchRes.organic[0]?.link || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        try {
          const docRef = await addDoc(collection(db, "events_awards"), docData);
          console.log(`  -> ADDED SUCCESS: ID: ${docRef.id} | Name: "${name}" | Date: ${date} | City: ${location} | Conf: ${confidence}%`);
          existingNames.add(norm); // add to local set to prevent duplicate in next batches
          totalAdded++;
        } catch (err) {
          console.error(`  -> FAILED to write document:`, err.message);
        }
      }
      
      // Sleep 2 seconds between queries
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\nUpcoming events research finished! Successfully added ${totalAdded} genuine upcoming events/awards to Firestore.`);
  process.exit(0);
}

run().catch(console.error);
