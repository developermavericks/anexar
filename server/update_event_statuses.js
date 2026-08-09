import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

// Current date of evaluation (August 9, 2026)
const CURRENT_DATE = new Date('2026-08-09T00:00:00Z');

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const cleanStr = String(dateStr).trim();
  
  // Format: 2026-03-07T08:00:00+05:30
  if (cleanStr.includes('T')) {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Format: DD/MM/YYYY
  const parts = cleanStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
}

function parseDeadline(deadlineStr) {
  if (!deadlineStr) return null;
  const clean = String(deadlineStr).trim().toLowerCase();
  if (clean === 'open' || clean === 'closed' || clean === '') return null;
  
  // Strip ordinal suffixes: 20th Feb 2026 -> 20 Feb 2026
  const cleanStr = clean.replace(/(st|nd|rd|th)/gi, '');
  
  // If year is not mentioned, assume 2026
  let strToParse = cleanStr;
  if (!cleanStr.match(/\d{4}/)) {
    strToParse = `${cleanStr} 2026`;
  }
  
  const d = new Date(strToParse);
  if (!isNaN(d.getTime())) return d;
  return null;
}

async function run() {
  console.log("Fetching all events and awards...");
  const snap = await getDocs(collection(db, "events_awards"));
  console.log(`Total events loaded: ${snap.size}`);
  
  let updatedCount = 0;
  
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const eventName = d.event_name || d.name || '';
    const dateStr = d.date || '';
    const deadlineStr = d.nomination_deadline || '';
    const currentStatus = d.status || 'UPCOMING';
    
    let targetStatus = currentStatus;
    
    // Heuristic 1: Parse the main event date
    const parsedEventDate = parseDateStr(dateStr);
    if (parsedEventDate) {
      if (parsedEventDate < CURRENT_DATE) {
        targetStatus = 'CONCLUDED';
      } else {
        targetStatus = 'UPCOMING';
      }
    } else {
      // Heuristic 2: Parse nomination deadline
      const parsedDeadline = parseDeadline(deadlineStr);
      if (parsedDeadline) {
        if (parsedDeadline < CURRENT_DATE) {
          // If deadline has passed, and date is missing, let's assume it concluded or closed
          if (currentStatus === 'NOMINATIONS_OPEN') {
            targetStatus = 'UPCOMING'; // nominations closed
          }
        } else {
          // If deadline is in the future, nominations must be open!
          targetStatus = 'NOMINATIONS_OPEN';
        }
      }
      
      // Heuristic 3: Check year inside event_name
      if (eventName.match(/\b(2023|2024|2025)\b/)) {
        targetStatus = 'CONCLUDED';
      }
      
      // Heuristic 4: Check if days_until_event is negative
      if (typeof d.days_until_event === 'number' && d.days_until_event < 0 && targetStatus !== 'CONCLUDED') {
        // Only mark concluded if the scraped date was clearly in the past
        targetStatus = 'CONCLUDED';
      }
    }
    
    // Update if status changed
    if (targetStatus !== currentStatus) {
      const docRef = doc(db, "events_awards", docSnap.id);
      await updateDoc(docRef, { status: targetStatus, updatedAt: new Date().toISOString() });
      console.log(`Updated status for "${eventName}" | Date: ${dateStr || 'N/A'} | Deadline: ${deadlineStr || 'N/A'} | ${currentStatus} -> ${targetStatus}`);
      updatedCount++;
    }
  }
  
  console.log(`\nStatus update finished! Successfully updated ${updatedCount} events/awards.`);
  process.exit(0);
}

run().catch(console.error);
