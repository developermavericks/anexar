const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'anexar-9820c'
  });
}

const db = admin.firestore();

async function initConfig() {
  const docRef = db.doc('settings/google_sheets');
  const snap = await docRef.get();
  
  if (!snap.exists) {
    console.log("Creating default settings/google_sheets document...");
    await docRef.set({
      sheetId: "", // Enter your Google Sheet ID here
      sheetName: "Sheet1",
      updatedAt: new Date().toISOString()
    });
    console.log("Default settings/google_sheets created! Add your sheetId in this document.");
  } else {
    console.log("settings/google_sheets document already exists:", snap.data());
  }
}

initConfig()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error setting up configuration:", err);
    process.exit(1);
  });
