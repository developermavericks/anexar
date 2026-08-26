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

function normalize(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isGenericEmail(email) {
  const e = normalize(email);
  return !e || 
         e.includes('undefined') || 
         e.includes('contact@media.com') || 
         e.includes('imported@email.com') || 
         e.includes('goskribe.com') || 
         e.includes('temp') || 
         e.includes('email.com');
}

function isSimilarPublication(pub1, pub2) {
  const p1 = normalize(pub1);
  const p2 = normalize(pub2);
  
  if (!p1 || !p2) return false; 
  if (p1 === p2) return true;
  if (/^\d+$/.test(p1) || /^\d+$/.test(p2)) return true;
  if (p1.includes(p2) || p2.includes(p1)) return true;
  
  return false;
}

async function run() {
  console.log("Fetching current collection size...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const totalCount = docs.length;
  
  // Group to count unique journalists
  const groups = [];
  
  for (const docData of docs) {
    let matchedGroup = null;
    
    for (const group of groups) {
      if (docData.journalistId && group[0].journalistId && docData.journalistId === group[0].journalistId) {
        matchedGroup = group;
        break;
      }
      
      if (docData.email && group[0].email && !isGenericEmail(docData.email) && normalize(docData.email) === normalize(group[0].email)) {
        matchedGroup = group;
        break;
      }
      
      if (normalize(docData.name) === normalize(group[0].name) && isSimilarPublication(docData.publication, group[0].publication)) {
        matchedGroup = group;
        break;
      }
    }
    
    if (matchedGroup) {
      matchedGroup.push(docData);
    } else {
      groups.push([docData]);
    }
  }
  
  const uniqueCount = groups.length;
  const duplicateCount = totalCount - uniqueCount;
  
  console.log(`\n=== DATABASE STATISTICS ===`);
  console.log(`Current Total Documents in Firestore: ${totalCount}`);
  console.log(`Total Unique Journalists (Groups): ${uniqueCount}`);
  console.log(`Redundant Duplicate Documents to Clean: ${duplicateCount}`);
}

run().catch(console.error);
