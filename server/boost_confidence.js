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
  
  let updatedCount = 0;
  
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const date = d.date || '';
    const loc = d.location || '';
    const venue = d.venue || '';
    const currentConf = d.confidence || 50;
    
    // If the event has a valid date and a specific city location (not 'India' or empty)
    if (date && date !== 'TBD' && loc && loc.toLowerCase() !== 'india' && loc !== '') {
      let targetConf = 75; // High
      
      // If it also has a venue, it is highly verified!
      if (venue && venue !== 'N/A' && venue !== '') {
        targetConf = 90; // Platinum
      }
      
      if (currentConf < targetConf) {
        const ref = doc(db, "events_awards", docSnap.id);
        try {
          await updateDoc(ref, { confidence: targetConf, updatedAt: new Date().toISOString() });
          console.log(`[Boost Confidence] Event: "${d.event_name || d.name}" | Date: ${date} | Location: ${loc} | Confidence: ${currentConf}% -> ${targetConf}%`);
          updatedCount++;
        } catch (err) {
          console.warn(`Failed to update confidence for ${docSnap.id}:`, err.message);
        }
      }
    }
  }
  
  console.log(`\nFinished confidence boosting! Boosted confidence scores for ${updatedCount} verified events.`);
  process.exit(0);
}

run().catch(console.error);
