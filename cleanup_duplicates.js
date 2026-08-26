import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

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

// Outlet ID to Name Mappings
const OUTLET_MAPPING = {
  "18": "The Economic Times",
  "287": "Mint",
  "294": "The Times of India",
  "2795": "YourStory",
  "2420": "Moneycontrol",
  "21532": "India Today",
  "13800": "CNBC TV18",
  "119659": "NDTV India",
  "236032": "Impact",
  "239611": "ABP News",
  "244275": "News18 India",
  "264666": "ET NOW",
  "228705": "News24",
  "235270": "News18 India",
  "262229": "Wion",
  "188802": "Zee News",
  "256648": "Indian Transport & Logistics News",
  "258382": "India Today",
  "119765": "India TV",
  "242458": "The Times of India",
  "262127": "India Today",
  "250406": "NDTV Profit",
  "256772": "Fortune India",
  "258376": "Silicon India",
  "259150": "The Times of India",
  "262001": "TV9 Bharatvarsh",
  "261684": "Wion",
  "262418": "The Kashmiriyat",
  "256877": "Times Now",
  "233318": "ABP News",
  "256692": "ET NOW",
  "264777": "NDTV India",
  "264734": "The Times of India",
  "218017": "CNBC TV18",
  "237264": "News18 India",
  "7454": "Fortune India",
  "236902": "Times Now",
  "220104": "CNBC TV18",
  "189866": "News18 India",
  "262500": "India Today",
  "263210": "NDTV India",
  "262288": "News24",
  "262211": "India Today",
  "264374": "News24",
  "233111": "NDTV India",
  "247279": "NDTV India",
  "264452": "NDTV India",
  "239716": "Zee News",
  "237218": "India Today",
  "249150": "Zee News",
  "257673": "ET NOW",
  "252923": "India Today",
  "198583": "CNBC TV18",
  "264700": "The Hindu Business Line",
  "263119": "NDTV India",
  "263124": "India Today",
  "263130": "India Today",
  "223663": "Times Now",
  "236501": "The Times of India",
  "264710": "The Times of India",
  "261544": "The Financial Express",
  "229501": "News18 Kannada",
  "262115": "India Today",
  "261870": "News18 India",
  "234262": "India TV",
  "150887": "Fortune India",
  "14403": "ET NOW",
  "264850": "Mathrubhumi",
  "264693": "CNBC TV18",
  "11103": "Mint",
  "256276": "CNBC TV18",
  "219456": "News18 India",
  "230638": "Zee News",
  "255827": "CNBC TV18",
  "264566": "The Economic Times",
  "263136": "India Today",
  "194731": "The Times of India",
  "220259": "ET NOW",
  "261537": "ET NOW",
  "240514": "Republic World",
  "256233": "News18 India",
  "262177": "ABP News",
  "263182": "ABP News",
  "232718": "Times Now Navbharat",
  "212873": "Freelance",
  "239736": "Analytics India Magazine",
  "218769": "India Today",
  "237834": "News18 India",
  "253327": "The Times of India",
  "259068": "News18 India",
  "262269": "NDTV India",
  "264729": "The Times of India",
  "263133": "India Today",
  "257165": "News18 India",
  "264487": "NDTV Profit"
};

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
  console.log("Fetching all journalists from Firestore for safe smart cleanup...");
  const journalistsRef = collection(db, "journalists");
  const snapshot = await getDocs(journalistsRef);
  
  const docs = snapshot.docs.map(d => {
    const data = d.data();
    // Resolve numeric publication name if present
    if (data.publication && /^\d+$/.test(data.publication)) {
      const mapped = OUTLET_MAPPING[data.publication];
      if (mapped) data.publication = mapped;
    }
    return { id: d.id, ...data };
  });
  console.log(`Found ${docs.length} total journalists in collection.`);
  
  const groups = [];
  
  for (const docData of docs) {
    let matchedGroup = null;
    
    // Attempt to match with an existing group
    for (const group of groups) {
      // Safety Rule: Names MUST match exactly (case-insensitive) to be duplicates
      if (normalize(docData.name) !== normalize(group[0].name)) {
        continue;
      }

      // Rule 1: Match by Skribe Journalist ID if both have it
      if (docData.journalistId && group[0].journalistId && docData.journalistId === group[0].journalistId) {
        matchedGroup = group;
        break;
      }
      
      // Rule 2: Match by email if both have it AND it's not a generic placeholder
      if (docData.email && group[0].email && !isGenericEmail(docData.email) && normalize(docData.email) === normalize(group[0].email)) {
        matchedGroup = group;
        break;
      }
      
      // Rule 3: Match by similar publication
      if (isSimilarPublication(docData.publication, group[0].publication)) {
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
  console.log(`Identified ${duplicates.length} duplicate groups to clean up.`);
  
  let totalDeleted = 0;
  let totalMerged = 0;
  
  for (const group of duplicates) {
    // 1. Determine the "primary" document to keep
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
    const redundantDocs = group.slice(1);
    
    console.log(`\nMerging duplicates for: "${primary.name}" at "${primary.publication}"`);
    console.log(`   -> Keeping Primary Doc ID: ${primary.id} (Publication: ${primary.publication})`);
    
    const mergedData = { ...primary };
    
    if (/^\d+$/.test(mergedData.publication)) {
      const mapped = OUTLET_MAPPING[mergedData.publication];
      if (mapped) mergedData.publication = mapped;
    }
    
    if (!Array.isArray(mergedData.articles)) {
      mergedData.articles = [];
    }
    
    for (const r of redundantDocs) {
      if (!mergedData.email && r.email && !isGenericEmail(r.email)) mergedData.email = r.email;
      if (!mergedData.phone && r.phone) mergedData.phone = r.phone;
      if (!mergedData.photo && r.photo) mergedData.photo = r.photo;
      if ((!mergedData.bio || mergedData.bio.includes('No custom')) && r.bio && !r.bio.includes('No custom')) {
        mergedData.bio = r.bio;
      }
      
      // If primary publication is a number, or empty, and the duplicate has a real name:
      if ((!mergedData.publication || /^\d+$/.test(mergedData.publication)) && r.publication && !/^\d+$/.test(r.publication)) {
        mergedData.publication = r.publication;
      }
      
      if (!mergedData.journalistId && r.journalistId) {
        mergedData.journalistId = r.journalistId;
      }
      if (!mergedData.scribeProfile && r.scribeProfile) {
        mergedData.scribeProfile = r.scribeProfile;
      }
      
      if (r.articles && Array.isArray(r.articles)) {
        r.articles.forEach(art => {
          const exists = mergedData.articles.some(existingArt => 
            (art.url && existingArt.url && art.url === existingArt.url) || 
            (art.title && existingArt.title && art.title.toLowerCase().trim() === existingArt.title.toLowerCase().trim())
          );
          if (!exists) {
            mergedData.articles.push(art);
          }
        });
      }
    }
    
    if (mergedData.articles.length > 10) {
      mergedData.articles.sort((a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0));
      mergedData.articles = mergedData.articles.slice(0, 10);
    }
    
    const cleanDocData = { ...mergedData };
    delete cleanDocData.id; 
    cleanDocData.updatedAt = new Date().toISOString();
    
    try {
      await updateDoc(doc(db, "journalists", primary.id), cleanDocData);
      totalMerged++;
      
      for (const r of redundantDocs) {
        console.log(`   -> Deleting duplicate Doc ID: ${r.id} (Publication: ${r.publication})`);
        await deleteDoc(doc(db, "journalists", r.id));
        totalDeleted++;
      }
    } catch (err) {
      console.error(`   -> Error processing merge:`, err.message);
    }
  }
  
  console.log(`\n🎉 Safe Smart Cleanup finished!`);
  console.log(`   - Merged profiles: ${totalMerged}`);
  console.log(`   - Redundant documents deleted: ${totalDeleted}`);
}

run().catch(console.error);
