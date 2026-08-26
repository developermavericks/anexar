import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  console.log("Checking Moneycontrol journalists in Firestore...");
  const journalistsRef = collection(db, "journalists");
  
  // Since query is case-sensitive, we'll fetch all and filter locally to be sure
  const snapshot = await getDocs(journalistsRef);
  const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const moneycontrolDocs = docs.filter(d => 
    String(d.publication || '').toLowerCase().includes('moneycontrol')
  );
  
  console.log(`\nFound ${moneycontrolDocs.length} Moneycontrol journalists in Firestore:`);
  
  moneycontrolDocs.forEach((doc, i) => {
    const articleCount = Array.isArray(doc.articles) ? doc.articles.length : 0;
    console.log(`[${i + 1}] Name: "${doc.name}" | Doc ID: ${doc.id} | Articles count: ${articleCount}`);
    if (articleCount > 0) {
      console.log(`      Latest Article: "${doc.articles[0].title || 'No Title'}" (${doc.articles[0].publishDate || 'No Date'})`);
    }
  });
}

run().catch(console.error);
