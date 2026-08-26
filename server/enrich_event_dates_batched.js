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

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

const INDIAN_CITIES = [
  'mumbai', 'delhi', 'new delhi', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
  'pune', 'ahmedabad', 'jaipur', 'noida', 'gurugram', 'gurgaon', 'indore', 'surat', 'coimbatore',
  'kochi', 'goa', 'patna', 'lucknow', 'chandigarh', 'bhopal', 'dehradun', 'guwahati', 'bhubaneswar',
  'shillong', 'vadodara', 'gwalior', 'ludhiana', 'amritsar', 'kanpur', 'nagpur', 'thane', 'nashik',
  'visakhapatnam', 'mysore', 'trichy', 'madurai', 'agra', 'varanasi', 'ujjain', 'rajkot', 'gandhinagar',
  'pondicherry', 'shimla', 'ranchi', 'raipur', 'trivandrum', 'thiruvananthapuram', 'kozhikode', 'calicut'
];

// Helper to normalize strings for city matching
function findCityLocally(text) {
  if (!text) return null;
  const clean = text.toLowerCase();
  for (const city of INDIAN_CITIES) {
    // Match whole word or pattern
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(clean)) {
      // capitalize city
      return city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return null;
}

async function callGroqBatch(eventsBatch) {
  const listStr = eventsBatch.map(e => {
    return `ID: ${e.id} | Name: "${e.name}" | Sector: ${e.sector} | Source Title: "${e.source_title}" | Source URL: "${e.source_url}"`;
  }).join('\n');
  
  const prompt = `You are a professional event researcher. Below is a batch of industry events/awards in India with missing exact dates and city locations.
Using your knowledge base, extract the exact date (in DD/MM/YYYY format) and the specific city in India where they take place/took place in 2025 or 2026.

Rules:
1. Provide the output ONLY as a JSON object with a single key "results" containing an array of objects.
2. If you don't know the exact date for an event, leave the "date" field empty.
3. If you don't know the city, leave the "city" field empty.
4. If you don't know the venue or organizer, leave them empty.

Events List:
${listStr}

Format of output JSON:
{
  "results": [
    {
      "id": "event ID from the list",
      "date": "DD/MM/YYYY" or "",
      "city": "Specific City in India" or "",
      "venue": "Exact Venue Name" or "",
      "organizer": "Organizer Name" or ""
    }
  ]
}
`;

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
      const errText = await res.text().catch(() => '');
      console.error(`Groq batch failed with status: ${res.status}. Body: ${errText}`);
      return null;
    }
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error(`Groq batch error:`, err);
    return null;
  }
}

const CURRENT_DATE = new Date('2026-08-09T00:00:00Z');

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
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
  
  // Phase 1: Local Regex Matching (Fast & 100% Free)
  console.log("\n--- Phase 1: Local City & Date Extraction ---");
  let localUpdated = 0;
  const eventsToEnrich = [];
  
  for (const docSnap of missingDateDocs) {
    const d = docSnap.data();
    const eventName = d.event_name || d.name || '';
    const sourceUrl = d.source_url || '';
    const sourceTitle = d.source_title || '';
    const venue = d.venue || '';
    const sector = d.sector || '';
    const docId = docSnap.id;
    
    // Check if we can find a city locally
    let city = findCityLocally(eventName) || findCityLocally(venue) || findCityLocally(sourceUrl) || findCityLocally(sourceTitle);
    
    // Check if we can find a year locally
    let year = null;
    const yearMatch = eventName.match(/\b(2024|2025|2026|2027)\b/);
    if (yearMatch) year = yearMatch[1];
    
    if (city && d.location !== city) {
      const docRef = doc(db, "events_awards", docId);
      try {
        await updateDoc(docRef, { location: city, updatedAt: new Date().toISOString() });
        console.log(`[Local Update] Found City for "${eventName}": "${city}"`);
        localUpdated++;
      } catch (err) {
        console.warn(`[Local Update] Document ${docId} not found or failed to update:`, err.message);
      }
    }
    
    eventsToEnrich.push({
      id: docId,
      name: eventName,
      sector,
      source_title: sourceTitle,
      source_url: sourceUrl,
      current_location: city || d.location || 'India',
      status: d.status || 'UPCOMING'
    });
  }
  
  console.log(`Local matching completed. Updated ${localUpdated} cities.`);
  
  // Phase 2: Batched LLM Extraction (Cost-efficient)
  console.log("\n--- Phase 2: Batched LLM Date & Location Retrieval ---");
  const BATCH_SIZE = 25;
  let llmUpdated = 0;
  
  for (let i = 0; i < eventsToEnrich.length; i += BATCH_SIZE) {
    const batch = eventsToEnrich.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eventsToEnrich.length / BATCH_SIZE)} (size: ${batch.length})...`);
    
    const response = await callGroqBatch(batch);
    if (!response || !response.results) {
      console.log("  -> Batch failed or returned empty results.");
      continue;
    }
    
    for (const res of response.results) {
      if (!res.id) continue;
      
      const docRef = doc(db, "events_awards", res.id);
      const updates = {};
      
      if (res.date) {
        updates.date = res.date;
        const parsedDate = parseDateStr(res.date);
        if (parsedDate) {
          updates.status = parsedDate < CURRENT_DATE ? 'CONCLUDED' : 'UPCOMING';
        }
      }
      if (res.city) updates.location = res.city;
      if (res.venue) updates.venue = res.venue;
      if (res.organizer) updates.organizer = res.organizer;
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        try {
          await updateDoc(docRef, updates);
          console.log(`  -> SUCCESS [LLM]: Updated ID: ${res.id} | Date: ${res.date || 'N/A'} | City: ${res.city || 'N/A'} | Venue: ${res.venue || 'N/A'} | Status: ${updates.status || 'N/A'}`);
          llmUpdated++;
        } catch (err) {
          console.warn(`  -> WARNING: Document ${res.id} was not found or failed to update:`, err.message);
        }
      }
    }
    
    // 2-second sleep to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\nEnrichment finished! Local updates: ${localUpdated} | LLM updates: ${llmUpdated}`);
  process.exit(0);
}

run().catch(console.error);
