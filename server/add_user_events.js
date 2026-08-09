import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
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

const newEvents = [
  // Group 1: Automotive & Transport
  "Financial Express Commercial Vehicle Conclave",
  "India E-Mobility Show 2023",
  "Advanced Automotive Tech Forum 2023",
  "Commercial Vehicle Forum",
  "2nd India E-Commerce Summit 2023",
  "Urban Mobility India Conference and Expo",
  "Auto EV India 2023",
  // Group 2: BFSI & Fintech
  "Banking Frontiers NBFCs Tomorrow",
  "Banking Frontiers Technoviti And Finnoviti",
  "India NBFC Summit & Awards 2023",
  "India Banking Summit And Awards",
  "Elets The Banking and Finance Post Gamechanger Summit",
  "ET BFSI CIO Conclave 2023",
  "BFSI Innovation and Technology Summit",
  "ET CFO Turning Point",
  "Banking and Finance: The Key to India's Recovery?",
  "The Banking Revolution",
  "IBEX India 11th International Trade Fair and Conference on Banking Technology, Equipment & Services",
  "World BFSI Congress and Awards 2023",
  "13th NBFC100 Tech Summit",
  "ET BFSI NBFC Connect",
  "Elets BFSI CTO Summit",
  // Group 3: Tech & Startups
  "Zinnov Confluence",
  "Nasscom SME Confluence",
  "Nasscom Global Inclusion Summit",
  "Nasscom Annual Technology Conference",
  "Nasscom NasTech",
  "YourStory TechSparks",
  "BFSI and Fintech Summit 2023",
  "Nasscom Technology and Leadership Forum 2023",
  "Fintech Festival India",
  "India Fintech Conclave",
  "Fintech India Innovation Awards",
  "Festival Of Fintech 2023",
  "VCCircle FinServ Summit",
  "Global Fintech Fest 2023",
  "Fintech India Summit and Awards",
  "India FinTech Forum’s IFTA 2022",
  "NBFC Fintech Conclave and Awards 2023",
  "Payments Innovation Summit, 8th June, Mumbai",
  "BNPL & DL India Show 2023",
  "2ND EDITION FINTECH INDIA SUMMIT & AWARDS 2023",
  "NBFC & FinTech EXCELLENCE AWARDS 2023",
  // Group 4: Human Resources (HR)
  "The Economic Times Best Organizations for Women",
  "BW Nurturing Talent for Future Conclave",
  "People First HR Excellence Awards",
  "Tech HR 2023",
  "People Matters Total Rewards And Wellbeing Conference (8th Edition)",
  "The Happiest Workplaces Awards",
  "AmbitionBox Best Places to Work in India Awards 2023",
  "Are You In The List",
  "Best Workplaces for Innovators 2023",
  "Inc. Best Workplaces",
  "Digital Workplace Summit",
  "HR Distinction Awards",
  "The Economic Times Human Capital Awards",
  "Nextech India HR Summit",
  "ET Future Ready Organisations",
  "HR Tech & Summit 2023",
  "Great Place To work for all summit",
  // Group 5: eCommerce & D2C
  "BW Marketing world D2C summit| Razorpay",
  "Techsparks Mumbai",
  "CX Plus 2023 by ET Brand Equity",
  "Internet Commerce Summit",
  "Gartner Marketing Conference and Symposium",
  "Future of Retail & E-commerce Summit & Awards 2023",
  "DIGIXX AWARDS 2022 - Real Awards for Real Achiever's",
  "IRec (The Indian Retail & eRetail Congress) 2023",
  "D2C India Bengaluru",
  "D2C Summit and Awards",
  "Internet Commerce Summit",
  "ET Brand Equity Martech Asia 2023 summit",
  "e4M D2C Revolution 2023",
  "D2C FOUNDERS MEET",
  "Inc42:India's Largest D2C & Ecommerce Conference",
  "ScaleUp by Inc42"
];

async function serperSearch(query) {
  try {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'in', num: 4 })
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

function buildPrompt(name, organicResults) {
  const snippets = (organicResults || []).map((r, i) => `[${i}] ${r.title}: ${r.snippet}`).join('\n');
  return `Analyze the search snippets to extract structured details for the event/award: "${name}".
  
Search Results:
${snippets}

Respond ONLY with a JSON object in this format:
{
  "event_name": "a cleaned, professional, recognizable name of the event/award (under 6 words)",
  "date": "DD/MM/YYYY" (or empty string if not found),
  "city": "specific city name in India where the event took place/takes place (e.g. Mumbai, New Delhi, Bengaluru, Pune, Hyderabad, Chennai, Coimbatore, Noida, Gurugram, Indore)",
  "venue": "exact venue name (e.g. Grand Hyatt, Jio World Convention Centre, Taj Palace)",
  "organizer": "organizer name (e.g. Elets, Nasscom, Economic Times, Inc42, BW Businessworld)",
  "sector": "one of: Automotive, Transport, EV, Commercial vehicle, eCommerce, Retail, D2C, BFSI, Fintech, Human Resources, Technology, MarTech, Startups",
  "event_type": "Event" or "Award"
}
`;
}

const CURRENT_DATE = new Date('2026-08-09T00:00:00Z');

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

async function run() {
  console.log(`Starting to add and resolve ${newEvents.length} new events/awards...`);
  
  let successCount = 0;
  
  for (let i = 0; i < newEvents.length; i++) {
    const rawName = newEvents[i];
    console.log(`\n[${i + 1}/${newEvents.length}] Searching Web for: "${rawName}"`);
    
    const searchRes = await serperSearch(`${rawName} India date venue city`);
    const prompt = buildPrompt(rawName, searchRes?.organic || []);
    const ext = await callGroq(prompt);
    
    if (ext) {
      const finalName = ext.event_name || rawName;
      let date = ext.date || 'TBD';
      let location = ext.city || 'India';
      let status = 'UPCOMING';
      let confidence = 50;
      
      // If name or date implies 2023 or 2022
      if (rawName.includes('2023') || rawName.includes('2022') || date.includes('2023') || date.includes('2022')) {
        status = 'CONCLUDED';
      }
      
      const parsedDate = parseDateStr(date);
      if (parsedDate) {
        status = parsedDate < CURRENT_DATE ? 'CONCLUDED' : 'UPCOMING';
      }
      
      if (location.toLowerCase() === 'india' || location === '') {
        location = 'India';
      } else {
        location = location === 'Bangalore' ? 'Bengaluru' : location;
      }
      
      if (date && date !== 'TBD' && location !== 'India') {
        confidence = (ext.venue && ext.venue !== 'N/A') ? 90 : 75;
      }
      
      const docData = {
        event_name: finalName,
        name: finalName,
        date,
        location,
        venue: ext.venue || 'N/A',
        organizer: ext.organizer || 'N/A',
        sector: ext.sector || 'Technology',
        event_type: ext.event_type || 'Event',
        status,
        nomination_deadline: status === 'CONCLUDED' ? 'Closed' : 'Open',
        confidence,
        source_url: searchRes?.organic?.[0]?.link || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        const docRef = await addDoc(collection(db, "events_awards"), docData);
        console.log(`  -> ADDED SUCCESS: ID: ${docRef.id} | Name: "${finalName}" | Date: ${date} | City: ${location} | Status: ${status} | Conf: ${confidence}%`);
        successCount++;
      } catch (err) {
        console.error(`  -> FAILED to write document:`, err.message);
      }
    } else {
      console.log(`  -> Failed to resolve structured details for: "${rawName}"`);
    }
    
    // 1.5 seconds sleep between items
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log(`\nAll new events processed. Added ${successCount} events/awards to Firestore.`);
  process.exit(0);
}

run().catch(console.error);
