import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

function cleanValue(val, keyField) {
  if (!val) return '';
  
  if (Array.isArray(val)) {
    return val.map(v => {
      if (typeof v === 'object' && v !== null) {
        return v[keyField] || v.name || v.cityName || v.stateName || v.countryName || v.outletName || v.beatName || v.categoryName || '';
      }
      return String(v);
    }).filter(Boolean).join(', ');
  }
  
  if (typeof val === 'object' && val !== null) {
    return val[keyField] || val.name || val.cityName || val.stateName || val.countryName || val.outletName || val.beatName || val.categoryName || '';
  }
  
  const strVal = String(val).trim();
  // Filter out any literal "[object Object]" strings
  if (strVal.toLowerCase().includes('[object object]')) {
    return '';
  }
  return strVal;
}

async function fixDatabase() {
  console.log("Loading all journalists from Firestore...");
  const snapshot = await getDocs(collection(db, "journalists"));
  console.log(`Found ${snapshot.size} journalists. Cleaning fields...`);
  
  let updatedCount = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;
    
    // Clean each field
    const cleanCategory = cleanValue(data.category, 'beatName');
    const cleanCity = cleanValue(data.city, 'city');
    const cleanState = cleanValue(data.state, 'state');
    const cleanCountry = cleanValue(data.country, 'country');
    
    // Reconstruct address cleanly
    const locationParts = [];
    if (cleanCity) locationParts.push(cleanCity);
    if (cleanState) locationParts.push(cleanState);
    if (cleanCountry) locationParts.push(cleanCountry);
    let cleanAddress = locationParts.join(", ");
    
    if (!cleanAddress) {
      const origAddress = String(data.address || '').trim();
      if (!origAddress.toLowerCase().includes('[object object]') && origAddress) {
        cleanAddress = origAddress;
      } else {
        cleanAddress = 'Remote';
      }
    }
    
    // Check if we actually need to update this document
    const origCategoryStr = Array.isArray(data.category) || typeof data.category === 'object' ? '' : String(data.category || '');
    const origCityStr = Array.isArray(data.city) || typeof data.city === 'object' ? '' : String(data.city || '');
    const origStateStr = Array.isArray(data.state) || typeof data.state === 'object' ? '' : String(data.state || '');
    const origCountryStr = Array.isArray(data.country) || typeof data.country === 'object' ? '' : String(data.country || '');
    const origAddressStr = String(data.address || '');
    
    const needsUpdate = 
      cleanCategory !== origCategoryStr ||
      cleanCity !== origCityStr ||
      cleanState !== origStateStr ||
      cleanCountry !== origCountryStr ||
      cleanAddress !== origAddressStr ||
      (typeof data.category === 'object') ||
      (typeof data.city === 'object') ||
      (typeof data.state === 'object') ||
      (typeof data.country === 'object');
      
    if (needsUpdate) {
      const docRef = doc(db, "journalists", docId);
      await updateDoc(docRef, {
        category: cleanCategory || 'General',
        city: cleanCity,
        state: cleanState,
        country: cleanCountry,
        address: cleanAddress,
        updatedAt: new Date().toISOString()
      });
      console.log(`Updated ID: ${docId} | Name: ${data.name}`);
      console.log(`  -> Category: "${cleanCategory}"`);
      console.log(`  -> Address: "${cleanAddress}"`);
      updatedCount++;
    }
  }
  
  console.log(`\nCleanup finished! Cleaned and updated ${updatedCount} documents.`);
  process.exit(0);
}

fixDatabase().catch(console.error);
