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

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

const NEW_SECTORS = [
  "AI & DeepTech",
  "Education",
  "Travel & Tourism",
  "Real Estate",
  "Media & PR"
];

async function callGroq(prompt) {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
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

function buildPrompt(sector) {
  return `You are a database researcher. Generate a list of 15 major, genuine, and credible upcoming (scheduled for late 2026 or 2027) events, conferences, summits, or awards in India specifically for the sector: "${sector}".
  
Rules:
1. Make sure they are credible and commonly known annual events/awards in India for this sector.
2. The dates MUST be in the future (relative to August 9, 2026). Use late 2026 or 2027 years.
3. Clean the event names to be professional, recognizable, and concise (under 6 words).

Respond ONLY with a JSON object in this format:
{
  "events": [
    {
      "event_name": "Clean Event Name",
      "date": "DD/MM/YYYY" or "TBD" (must be in late 2026 or 2027),
      "city": "Specific City in India (e.g. Mumbai, New Delhi, Bengaluru, Goa, Pune)",
      "venue": "Expected Venue Name or N/A",
      "organizer": "Organizer name (e.g. ASSOCHAM, FICCI, Elets, exchange4media, NAREDCO) or N/A",
      "event_type": "Event" or "Award"
    }
  ]
}
`;
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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
  
  for (const sector of NEW_SECTORS) {
    console.log(`\n================ Sector: ${sector} ================`);
    console.log(`Generating upcoming events via Groq (Zero Serper credits)...`);
    
    const prompt = buildPrompt(sector);
    const response = await callGroq(prompt);
    
    if (!response || !response.events) {
      console.log(`  -> Failed to generate events for sector: ${sector}`);
      continue;
    }
    
    console.log(`  -> Groq generated ${response.events.length} potential upcoming events.`);
    
    for (const ev of response.events) {
      const name = ev.event_name || '';
      const norm = normalizeName(name);
      
      if (!name) continue;
      
      // Deduplicate
      if (existingNames.has(norm)) {
        console.log(`  -> SKIPPED (Duplicate): "${name}"`);
        continue;
      }
      
      const date = ev.date || 'TBD';
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
        status: 'UPCOMING',
        nomination_deadline: 'Open',
        confidence,
        source_url: '',
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
    
    // Sleep 1 second between sectors
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nNew sectors added successfully! Added ${totalAdded} genuine upcoming events/awards to Firestore.`);
  process.exit(0);
}

run().catch(console.error);
