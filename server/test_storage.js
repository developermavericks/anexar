import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';

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

async function runTest() {
  console.log('Testing Firestore write...');
  try {
    const testDocRef = doc(db, 'epapers', 'test_auth_check');
    await setDoc(testDocRef, {
      name: 'Test Paper',
      date: '2026-08-23',
      test: true,
      createdAt: new Date().toISOString()
    });
    console.log('Firestore write: SUCCESS!');
    
    // Cleanup Firestore
    await deleteDoc(testDocRef);
    console.log('Firestore cleanup: SUCCESS!');
  } catch (err) {
    console.error('Firestore error:', err.message);
  }

  console.log('Testing Storage upload...');
  try {
    const testStorageRef = ref(storage, 'epapers/test_auth_check.txt');
    const buffer = Buffer.from('Hello from test script');
    await uploadBytes(testStorageRef, buffer);
    console.log('Storage upload: SUCCESS!');

    // Cleanup Storage
    await deleteObject(testStorageRef);
    console.log('Storage cleanup: SUCCESS!');
  } catch (err) {
    console.error('Storage error:', err.message);
  }
}

runTest();
