import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  console.log("Analyzing Firestore database for overall Skribe credit usage...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  let totalDocs = 0;
  let enrichedCount = 0;
  let withArticlesCount = 0;
  let totalArticlesLoaded = 0;

  snapshot.docs.forEach(docSnap => {
    totalDocs++;
    const data = docSnap.data();
    
    // An entry was scraped/enriched from Skribe if it has a valid journalistId or scribeProfile
    if (data.journalistId && data.journalistId !== "") {
      enrichedCount++;
    }
    
    if (Array.isArray(data.articles) && data.articles.length > 0) {
      withArticlesCount++;
      totalArticlesLoaded += data.articles.length;
    }
  });

  console.log(`\n=== OVERALL SKRIBE USAGE ANALYSIS ===`);
  console.log(`Total Documents in Firestore: ${totalDocs}`);
  console.log(`Successfully Enriched Profiles (Skribe IDs found): ${enrichedCount}`);
  console.log(`Profiles with Articles Attached: ${withArticlesCount}`);
  console.log(`Total Articles Fetched: ${totalArticlesLoaded}`);
  
  // Approximate Total Requests:
  // - 1 profile detail request per enriched profile
  // - 1 article search request per profile with articles
  // - 1 search page request per ~60 journalists (estimate)
  const approxRequests = enrichedCount + withArticlesCount + Math.ceil(enrichedCount / 60);
  console.log(`Approximate Total API Requests Sent Ever: ${approxRequests}`);
}

run().catch(console.error);
