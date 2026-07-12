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

async function check() {
  try {
    const querySnapshot = await getDocs(collection(db, "user_clients"));
    console.log("Documents count in user_clients:", querySnapshot.size);
    querySnapshot.forEach((doc) => {
      console.log(`Document: ${doc.id} =>`, doc.data());
    });
  } catch (e) {
    console.error("Firestore error:", e);
  }
}
check();
