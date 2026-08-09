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

async function callGroqBatch(eventsBatch) {
  const listStr = eventsBatch.map(e => {
    return `ID: ${e.id} | Name: "${e.name}" | Sector: ${e.sector} | Location: "${e.location}" | Venue: "${e.venue}"`;
  }).join('\n');
  
  const prompt = `You are a database sanitization assistant. You are cleaning a list of events and awards in India.
Some names are already proper (e.g. "Global Fintech Fest", "ET HR Conclave").
Others are weird, long sentences, social media captions, or news snippets (e.g. "Honoured to be a speaker at AgriBeyond", "What started as a vision to simplify", "As India's business landscape evolves, leadership continues").

For each item in the list below:
1. Determine if the name is a proper, understandable event/award name (under 6 words, sounds like a real conference, expo, conclave, or award).
2. If it is NOT proper, rewrite it into a clean, professional, and understandable name for the event or award (e.g. rewrite "Honoured to be a speaker at AgriBeyond" -> "AgriBeyond Conclave", "What started as a vision to simplify" -> "BFSI Innovation Conclave", "As India's business landscape evolves" -> "India Leadership Summit"). Keep the original sector, city, or year context if present.
3. Make sure the name is clean, professional, and directly understandable on a dashboard.

Input List:
${listStr}

Respond ONLY with a JSON object in this exact format:
{
  "results": [
    {
      "id": "item ID",
      "newName": "new clean name (or the original name if it was already proper)"
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
  console.log(`Total events loaded: ${snap.size}`);
  
  const events = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    events.push({
      id: docSnap.id,
      name: d.event_name || d.name || '',
      sector: d.sector || '',
      location: d.location || '',
      venue: d.venue || ''
    });
  });
  
  const BATCH_SIZE = 30;
  let updatedCount = 0;
  
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(events.length / BATCH_SIZE)} (size: ${batch.length})...`);
    
    const response = await callGroqBatch(batch);
    if (!response || !response.results) {
      console.log("  -> Batch failed or returned empty results.");
      continue;
    }
    
    for (const res of response.results) {
      if (!res.id || !res.newName) continue;
      
      const original = batch.find(e => e.id === res.id);
      if (!original) continue;
      
      const cleanNewName = res.newName.trim();
      if (cleanNewName !== original.name && cleanNewName !== '') {
        const docRef = doc(db, "events_awards", res.id);
        try {
          await updateDoc(docRef, { event_name: cleanNewName, updatedAt: new Date().toISOString() });
          console.log(`  -> SUCCESS: Renamed "${original.name}" -> "${cleanNewName}"`);
          updatedCount++;
        } catch (err) {
          console.warn(`  -> FAILED to update document ${res.id}:`, err.message);
        }
      }
    }
    
    // 1.5 seconds delay between batches
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log(`\nSanitization finished! Successfully cleaned up ${updatedCount} event names.`);
  process.exit(0);
}

run().catch(console.error);
