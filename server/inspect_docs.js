const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

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

async function inspect() {
  const q = query(collection(db, 'journalists'), limit(15));
  const s = await getDocs(q);
  s.forEach(docSnap => {
    const data = docSnap.data();
    console.log('--- Document ID:', docSnap.id, 'Name:', data.name);
    console.log('  publication:', data.publication);
    console.log('  category:', typeof data.category, data.category);
    console.log('  address:', typeof data.address, data.address);
    console.log('  city:', typeof data.city, data.city);
    console.log('  state:', typeof data.state, data.state);
    console.log('  country:', typeof data.country, data.country);
  });
  process.exit(0);
}

inspect();
