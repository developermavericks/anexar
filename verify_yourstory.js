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
  console.log("Checking YourStory journalists in Firestore...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const yourstoryDocs = docs.filter(d => 
    String(d.publication || '').toLowerCase().includes('yourstory')
  );
  
  console.log(`\n=== YOURSTORY VERIFICATION ===`);
  console.log(`Total YourStory Journalists Found: ${yourstoryDocs.length}`);
  
  const sample = yourstoryDocs.slice(0, 5);
  console.log(`\nSample Profiles (First 5):`);
  sample.forEach((doc, i) => {
    const articleCount = Array.isArray(doc.articles) ? doc.articles.length : 0;
    console.log(`\n[${i + 1}] Name: "${doc.name}"`);
    console.log(`    - Role: "${doc.role || 'Reporter'}"`);
    console.log(`    - Email: "${doc.email || 'None'}"`);
    console.log(`    - Phone: "${doc.phone || 'None'}"`);
    console.log(`    - Articles Count: ${articleCount}`);
    if (articleCount > 0) {
      console.log(`    - Latest Article: "${doc.articles[0].title}" (${doc.articles[0].publishDate})`);
    }
  });
}

run().catch(console.error);
