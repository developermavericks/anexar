import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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
const GROQ_MODEL = 'llama-3.1-8b-instant'; // lightweight and very fast, perfect for this!

async function serperSearch(query) {
  try {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'in', num: 5 })
    });
    if (!res.ok) {
      console.error(`Serper search failed for "${query}": ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Serper error:`, err);
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
    if (!res.ok) {
      console.error(`Groq failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error(`Groq error:`, err);
    return null;
  }
}

function buildPrompt(eventName, organicResults) {
  const snippets = (organicResults || []).map((r, i) => `[${i}] ${r.title}: ${r.snippet}`).join('\n');
  return `You are analyzing search results to find the exact date (or start/end date) and city/location in India where the event takes place for: "${eventName}".
  
Search Results:
${snippets}

Respond with a JSON object in this exact format:
{
  "date": "DD/MM/YYYY" (or empty string if not found),
  "city": "specific city name in India (e.g. Mumbai, New Delhi, Bengaluru) if found",
  "venue": "exact venue name if found",
  "organizer": "organizer name if found"
}
`;
}

// Current date of evaluation (August 9, 2026)
const CURRENT_DATE = new Date('2026-08-09T00:00:00Z');

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const cleanStr = String(dateStr).trim();
  const parts = cleanStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

async function run() {
  console.log("Loading all events/awards...");
  const snap = await getDocs(collection(db, "events_awards"));
  
  // Filter for events with empty dates
  const missingDateDocs = snap.docs.filter(docSnap => {
    const d = docSnap.data();
    return !d.date || d.date === 'TBD';
  });
  
  console.log(`Found ${missingDateDocs.length} events with missing dates.`);
  
  let successCount = 0;
  let index = 0;
  
  for (const docSnap of missingDateDocs) {
    index++;
    const d = docSnap.data();
    const eventName = d.event_name || d.name || '';
    const sector = d.sector || '';
    const docId = docSnap.id;
    
    console.log(`\n[${index}/${missingDateDocs.length}] Searching date for: "${eventName}" (Sector: ${sector})`);
    
    const query = `${eventName} ${sector} India 2026 date`;
    const searchRes = await serperSearch(query);
    
    if (!searchRes || !searchRes.organic || searchRes.organic.length === 0) {
      console.log("  -> No search results found.");
      continue;
    }
    
    const prompt = buildPrompt(eventName, searchRes.organic);
    const extracted = await callGroq(prompt);
    
    if (extracted && (extracted.date || extracted.city || extracted.venue || extracted.organizer)) {
      const updates = {};
      if (extracted.date) {
        updates.date = extracted.date;
        // Recalculate status based on the newly discovered date
        const parsedDate = parseDateStr(extracted.date);
        if (parsedDate) {
          updates.status = parsedDate < CURRENT_DATE ? 'CONCLUDED' : 'UPCOMING';
        }
      }
      if (extracted.city) {
        updates.location = extracted.city;
      }
      if (extracted.venue) updates.venue = extracted.venue;
      if (extracted.organizer) updates.organizer = extracted.organizer;
      updates.updatedAt = new Date().toISOString();
      
      const docRef = doc(db, "events_awards", docId);
      await updateDoc(docRef, updates);
      console.log(`  -> SUCCESS: Updated details! Date: ${extracted.date || 'N/A'} | City: ${extracted.city || 'N/A'} | Venue: ${extracted.venue || 'N/A'} | Organizer: ${extracted.organizer || 'N/A'} | Status: ${updates.status || d.status}`);
      successCount++;
    } else {
      console.log("  -> Groq could not extract details.");
    }
    
    // Add 1.5 seconds delay to prevent rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log(`\nEnrichment finished! Successfully retrieved dates for ${successCount} events/awards.`);
  process.exit(0);
}

run().catch(console.error);
