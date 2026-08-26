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
  console.log("Analyzing missing details by publication in Firestore...");
  const snap = await getDocs(collection(db, "journalists"));
  
  const pubStats = {};

  snap.forEach(docSnap => {
    const data = docSnap.data();
    let pub = data.publication || 'Independent';
    
    // Normalize numeric outlet IDs to clean names for display
    if (pub === '21532') pub = 'India Today';
    else if (pub === '259150') pub = 'The Times of India';
    else if (pub === '264666') pub = 'ET NOW';
    else if (pub === '18') pub = 'The Economic Times';
    else if (pub === '2420') pub = 'Moneycontrol';
    else if (pub === '2795') pub = 'YourStory';
    else if (pub === '287') pub = 'Mint';
    else if (pub === '434') pub = 'News18';
    else if (pub === '1326') pub = 'The Hindu';
    
    if (!pubStats[pub]) {
      pubStats[pub] = { total: 0, missingEmail: 0, missingPhone: 0, missingPhoto: 0, missingArticles: 0 };
    }
    
    pubStats[pub].total++;
    if (!data.email || data.email.trim() === '') pubStats[pub].missingEmail++;
    if (!data.phone || data.phone.trim() === '') pubStats[pub].missingPhone++;
    if (!data.photo || data.photo.trim() === '') pubStats[pub].missingPhoto++;
    
    const articleCount = Array.isArray(data.articles) ? data.articles.length : 0;
    if (articleCount === 0) pubStats[pub].missingArticles++;
  });

  console.log(`\n=== MISSING DETAILS REPORT BY PUBLICATION ===`);
  console.log(String("Publication").padEnd(30) + " | Total | No Email | No Phone | No DP | No Articles");
  console.log("-".repeat(80));
  
  // Sort publications by total count descending
  const sortedPubs = Object.keys(pubStats).sort((a, b) => pubStats[b].total - pubStats[a].total);
  
  sortedPubs.forEach(pub => {
    const stats = pubStats[pub];
    console.log(
      pub.substring(0, 30).padEnd(30) + " | " +
      String(stats.total).padEnd(5) + " | " +
      String(stats.missingEmail).padEnd(8) + " | " +
      String(stats.missingPhone).padEnd(8) + " | " +
      String(stats.missingPhoto).padEnd(5) + " | " +
      String(stats.missingArticles)
    );
  });
}

run().catch(console.error);
