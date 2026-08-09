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
    const status = d.status || '';
    let deadline = d.nomination_deadline || '';
    
    // If event is CONCLUDED and nomination deadline is "Open" or empty/N/A
    if (status === 'CONCLUDED') {
      const cleanDeadline = String(deadline).trim().toLowerCase();
      if (cleanDeadline === 'open' || cleanDeadline === 'n/a' || cleanDeadline === '') {
        const ref = doc(db, "events_awards", docSnap.id);
        try {
          await updateDoc(ref, { nomination_deadline: 'Closed', updatedAt: new Date().toISOString() });
          console.log(`[Closed Deadline] Event: "${d.event_name || d.name}" | Status: ${status} | Changed deadline from "${deadline}" to "Closed"`);
          updatedCount++;
        } catch (err) {
          console.warn(`Failed to update deadline for ${docSnap.id}:`, err.message);
        }
      }
    }
  }
  
  console.log(`\nFinished deadline cleanup! Updated ${updatedCount} events to 'Closed' nomination deadline.`);
  process.exit(0);
}

run().catch(console.error);
