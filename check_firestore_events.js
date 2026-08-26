import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, orderBy } from 'firebase/firestore';

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
  try {
    const eventsRef = collection(db, "events_awards");
    const q = query(eventsRef, orderBy("createdAt", "desc"), limit(10));
    const snapshot = await getDocs(q);
    
    console.log(`Successfully fetched ${snapshot.size} events from Firestore.`);
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`Doc ID: ${docSnap.id} => Name: "${data.event_name || data.name}", Type: "${data.event_type || data.type || data.category}", Dates: "${data.date}", Venue: "${data.venue}", Location: "${data.location}", Confidence: ${data.confidence}%, Source: "${data.source_url}"`);
    });
  } catch (err) {
    console.error("Error reading Firestore:", err.message);
  }
}

run();
