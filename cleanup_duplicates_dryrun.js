import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase Config
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

// Simple helper to clean and normalize strings
function normalize(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Check if email is generic/placeholder
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

// Check if publication names are similar or one is a numeric ID
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
  console.log("Fetching all journalists from Firestore for duplicate dry-run...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${docs.length} total journalists in collection.`);
  
  const groups = [];
  
  for (const docData of docs) {
    let matchedGroup = null;
    
    // Attempt to match with an existing group
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
  
  const duplicates = groups.filter(g => g.length > 1);
  console.log(`\n=== DRY RUN SUMMARY ===`);
  console.log(`Identified ${duplicates.length} duplicate groups.`);
  
  let totalWillDelete = 0;
  
  duplicates.forEach((group, index) => {
    // Sort to determine primary
    group.sort((a, b) => {
      const getScore = (doc) => {
        let score = 0;
        if (doc.email && !isGenericEmail(doc.email)) score += 20;
        if (doc.phone && !doc.phone.includes('undefined')) score += 15;
        if (doc.photo) score += 10;
        if (doc.bio && doc.bio !== 'No custom bio or pitching insight available for this contact.') score += 5;
        if (doc.publication && !/^\d+$/.test(doc.publication)) score += 10;
        if (doc.articles && Array.isArray(doc.articles)) score += doc.articles.length;
        return score;
      };
      return getScore(b) - getScore(a);
    });
    
    const primary = group[0];
    let finalPublication = primary.publication;
    
    const redundant = group.slice(1);
    redundant.forEach(r => {
      if ((!finalPublication || /^\d+$/.test(finalPublication)) && r.publication && !/^\d+$/.test(r.publication)) {
        finalPublication = r.publication;
      }
    });
    
    console.log(`\n[${index + 1}] "${primary.name}"`);
    console.log(`    -> KEEPING: Doc ID: ${primary.id} (Publication will resolve to: "${finalPublication}")`);
    
    redundant.forEach(r => {
      console.log(`    -> WILL DELETE DUPLICATE: Doc ID: ${r.id} (Current Publication: "${r.publication}")`);
      totalWillDelete++;
    });
  });
  
  console.log(`\nDry run complete. Running this would safely delete ${totalWillDelete} duplicates and keep the primary documents with full details.`);
}

run().catch(console.error);
