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

async function run() {
  console.log("Loading all events/awards...");
  const snap = await getDocs(collection(db, "events_awards"));
  console.log(`Loaded ${snap.size} documents.`);
  
  let deadlineUpdated = 0;
  let confidenceUpdated = 0;
  
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const status = d.status || '';
    const date = d.date || '';
    const loc = d.location || '';
    const venue = d.venue || '';
    let deadline = d.nomination_deadline || '';
    const currentConf = d.confidence || 50;
    
    const docId = docSnap.id;
    const ref = doc(db, "events_awards", docId);
    const updates = {};
    
    // 1. Deadline Fix
    if (status === 'CONCLUDED') {
      const cleanDeadline = String(deadline).trim().toLowerCase();
      if (cleanDeadline === 'open' || cleanDeadline === 'n/a' || cleanDeadline === '') {
        updates.nomination_deadline = 'Closed';
        deadlineUpdated++;
      }
    }
    
    // 2. Confidence Boost
    if (date && date !== 'TBD' && loc && loc.toLowerCase() !== 'india' && loc !== '') {
      let targetConf = 75; // High
      if (venue && venue !== 'N/A' && venue !== '') {
        targetConf = 90; // Platinum
      }
      
      const newConf = updates.confidence || currentConf;
      if (newConf < targetConf) {
        updates.confidence = targetConf;
        confidenceUpdated++;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      try {
        await updateDoc(ref, updates);
        console.log(`[Updated] "${d.event_name || d.name}":`, updates);
      } catch (err) {
        console.warn(`Failed to update doc ${docId}:`, err.message);
      }
    }
  }
  
  console.log(`\nFinal Cleanup Completed!`);
  console.log(`Deadlines updated to Closed: ${deadlineUpdated}`);
  console.log(`Confidence scores boosted: ${confidenceUpdated}`);
  process.exit(0);
}

run().catch(console.error);
