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
const GROQ_MODEL = 'llama-3.1-8b-instant';

const INDIAN_CITIES = [
  'mumbai', 'delhi', 'new delhi', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
  'pune', 'ahmedabad', 'jaipur', 'noida', 'gurugram', 'gurgaon', 'indore', 'surat', 'coimbatore',
  'kochi', 'goa', 'patna', 'lucknow', 'chandigarh', 'bhopal', 'dehradun', 'guwahati', 'bhubaneswar',
  'shillong', 'vadodara', 'gwalior', 'ludhiana', 'amritsar', 'kanpur', 'nagpur', 'thane', 'nashik',
  'visakhapatnam', 'mysore', 'trichy', 'madurai', 'agra', 'varanasi', 'ujjain', 'rajkot', 'gandhinagar',
  'pondicherry', 'shimla', 'ranchi', 'raipur', 'trivandrum', 'thiruvananthapuram', 'kozhikode', 'calicut'
];

function findCityLocally(text) {
  if (!text) return null;
  const clean = text.toLowerCase();
  for (const city of INDIAN_CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(clean)) {
      return city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return null;
}

async function callGroqBatch(eventsBatch) {
  const listStr = eventsBatch.map(e => {
    return `ID: ${e.id} | Name: "${e.name}" | Sector: ${e.sector} | Venue: "${e.venue}" | Source URL: "${e.source_url}"`;
  }).join('\n');
  
  const prompt = `You are a professional event researcher. Below is a list of industry events/awards in India with missing specific city locations (currently listed generally as 'India').
Using your knowledge base, extract the specific city in India (e.g. Mumbai, New Delhi, Bengaluru, Pune, Hyderabad, Noida, Chennai, etc.) where they took place (or will take place) in 2025 or 2026.

Rules:
1. Provide the output ONLY as a JSON object with a key "results" containing an array of objects.
2. If you don't know the specific city, leave the "city" field empty.

Events List:
${listStr}

Format of output JSON:
{
  "results": [
    {
      "id": "event ID from the list",
      "city": "Specific City in India" or ""
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

async function run() {
  console.log("Loading all events/awards...");
  const snap = await getDocs(collection(db, "events_awards"));
  
  // Filter for events with location "India" or empty
  const genericLocationDocs = snap.docs.filter(docSnap => {
    const d = docSnap.data();
    const loc = String(d.location || '').trim();
    return loc === 'India' || loc === 'india' || loc === '';
  });
  
  console.log(`Found ${genericLocationDocs.length} events with generic 'India' or empty location.`);
  
  // Phase 1: Local Regex Matching (Fast & 100% Free)
  console.log("\n--- Phase 1: Local City Extraction ---");
  let localUpdated = 0;
  const eventsToEnrich = [];
  
  for (const docSnap of genericLocationDocs) {
    const d = docSnap.data();
    const eventName = d.event_name || d.name || '';
    const sourceUrl = d.source_url || '';
    const sourceTitle = d.source_title || '';
    const venue = d.venue || '';
    const sector = d.sector || '';
    const docId = docSnap.id;
    
    // Check if we can find a city locally from the fields
    let city = findCityLocally(eventName) || findCityLocally(venue) || findCityLocally(sourceUrl) || findCityLocally(sourceTitle);
    
    // Normalize Bangalore -> Bengaluru if found
    if (city === 'Bangalore') city = 'Bengaluru';
    
    if (city) {
      const docRef = doc(db, "events_awards", docId);
      try {
        await updateDoc(docRef, { location: city, updatedAt: new Date().toISOString() });
        console.log(`[Local Update] Found City for "${eventName}": "${city}"`);
        localUpdated++;
      } catch (err) {
        console.warn(`[Local Update] Document ${docId} not found or failed:`, err.message);
      }
    } else {
      eventsToEnrich.push({
        id: docId,
        name: eventName,
        sector,
        venue,
        source_url: sourceUrl
      });
    }
  }
  
  console.log(`Local matching completed. Updated ${localUpdated} cities. ${eventsToEnrich.length} remaining for LLM.`);
  
  // Phase 2: Batched LLM City Retrieval
  console.log("\n--- Phase 2: Batched LLM Location Retrieval ---");
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
      if (!res.id || !res.city) continue;
      
      let city = String(res.city).trim();
      if (city.toLowerCase() === 'india' || city === '') continue;
      
      // Normalize Bangalore
      if (city === 'Bangalore') city = 'Bengaluru';
      
      const docRef = doc(db, "events_awards", res.id);
      try {
        await updateDoc(docRef, { location: city, updatedAt: new Date().toISOString() });
        console.log(`  -> SUCCESS [LLM]: Updated ID: ${res.id} | City: ${city}`);
        llmUpdated++;
      } catch (err) {
        console.warn(`  -> WARNING: Document ${res.id} was not found or failed to update:`, err.message);
      }
    }
    
    // 2-second sleep to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\nEnrichment finished! Local updates: ${localUpdated} | LLM updates: ${llmUpdated}`);
  process.exit(0);
}

run().catch(console.error);
