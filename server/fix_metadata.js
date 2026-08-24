import { initializeApp } from 'firebase/app';
import { getStorage, ref, updateMetadata } from 'firebase/storage';
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
const storage = getStorage(app);

async function fixMetadata() {
  console.log('Fetching list of published ePapers...');
  try {
    const snapshot = await getDocs(collection(db, "epapers"));
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Found ${list.length} papers in database.`);

    for (const paper of list) {
      if (paper.date === '2026-08-23') {
        const safeName = paper.name.replace(/\s+/g, '_');
        const storagePath = `epapers/${paper.date}_${safeName}.pdf`;
        const fileRef = ref(storage, storagePath);

        console.log(`Updating metadata for: ${storagePath}...`);
        try {
          await updateMetadata(fileRef, {
            contentType: 'application/pdf'
          });
          console.log(`[SUCCESS] Updated contentType to application/pdf for ${paper.name}`);
        } catch (storageErr) {
          console.error(`[ERROR] Failed to update storage file metadata:`, storageErr.message);
        }
      }
    }
    console.log('All metadata updates completed!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixMetadata();
