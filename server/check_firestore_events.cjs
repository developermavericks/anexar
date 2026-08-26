const admin = require('firebase-admin');

// Initialize Firebase Admin using default credentials (local application credentials)
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'anexar-9820c'
  });
}

const db = admin.firestore();

async function run() {
  try {
    const snapshot = await db.collection('events_awards').orderBy('createdAt', 'desc').limit(20).get();
    console.log(`Successfully fetched ${snapshot.size} events from Firestore.`);
    snapshot.forEach(docSnap => {
      console.log(`Doc ID: ${docSnap.id} =>`, docSnap.data());
    });
  } catch (err) {
    console.error("Error reading Firestore:", err.message);
  }
}

run();
