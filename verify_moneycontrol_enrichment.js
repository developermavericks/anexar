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
  console.log("Verifying Moneycontrol profiles in Firestore...");
  const snap = await getDocs(collection(db, "journalists"));
  
  let totalMc = 0;
  let hasEmail = 0;
  let hasPhone = 0;
  let hasArticles = 0;
  let totalArticles = 0;

  snap.forEach(d => {
    const data = d.data();
    if (String(data.publication || '').toLowerCase().includes('moneycontrol')) {
      totalMc++;
      if (data.email && data.email.trim() !== '') hasEmail++;
      if (data.phone && data.phone.trim() !== '') hasPhone++;
      
      const articles = data.articles || [];
      if (articles.length > 0) {
        hasArticles++;
        totalArticles += articles.length;
      }
    }
  });

  console.log(`\n=== MONEYCONTROL STATUS ===`);
  console.log(`Total Moneycontrol Profiles: ${totalMc}`);
  console.log(`With Email: ${hasEmail}`);
  console.log(`With Phone: ${hasPhone}`);
  console.log(`With Articles: ${hasArticles} (Total Articles: ${totalArticles})`);
}

run().catch(console.error);
