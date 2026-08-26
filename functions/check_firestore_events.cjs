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
      const data = docSnap.data();
      console.log(`Doc ID: ${docSnap.id} => Name: "${data.event_name || data.name}", Type: "${data.event_type || data.type || data.category}", Dates: "${data.date}", Venue: "${data.venue}", Location: "${data.location}", Confidence: ${data.confidence}%, Source: "${data.source_url}"`);
    });
  } catch (err) {
    console.error("Error reading Firestore:", err.message);
  }
}

run();
