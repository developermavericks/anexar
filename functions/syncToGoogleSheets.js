const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// Helper formatting function matching the frontend format
const formatReviewedAt = (dateInput) => {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    // Generate simulated microseconds suffix to match exact pattern length
    const micro = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}${micro}`;
  } catch (e) {
    return "";
  }
};

const syncCollection = async (db, sheets, spreadsheetId, collectionName, sheetTabName) => {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets.some(s => s.properties.title === sheetTabName);
    if (!sheetExists) {
      console.log(`Sheet "${sheetTabName}" does not exist. Creating...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: sheetTabName }
            }
          }]
        }
      });
    }
  } catch (sheetErr) {
    console.error(`Error checking/creating sheet tab ${sheetTabName}:`, sheetErr);
  }

  const snapshot = await db.collection(collectionName).orderBy("createdAt", "asc").get();
  
  const headers = ["id", "article_id", "headline", "human_relevant", "human_age_bracket", "reviewed_at", "batch_id", "reviewer_reason", "reviewer_initials", "sector", "publication", "screenshot_url"];
  
  const rows = snapshot.docs.map((doc, idx) => {
    const d = doc.data();
    const displayId = `anexar_${idx + 1}`;
    
    return [
      displayId,
      d.article_id || doc.id,
      d.headline || "",
      d.human_relevant !== undefined ? d.human_relevant : 1,
      d.human_age_bracket || "general",
      d.reviewed_at || formatReviewedAt(d.createdAt) || "",
      d.batch_id || "Anexar_batch",
      d.reviewer_reason || d.reason || "",
      d.reviewer_initials || d.addedBy || "",
      (d.sector || "").toLowerCase(),
      d.sourceType === "website" ? (d.publication || "") : (d.paperName || ""),
      d.screenshotUrl ? `=HYPERLINK("${d.screenshotUrl}", IMAGE("${d.screenshotUrl}"))` : ""
    ];
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetTabName}!A1:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows]
    }
  });

  return rows.length;
};

const performSync = async () => {
  try {
    admin.app();
  } catch (e) {
    admin.initializeApp();
  }
  const db = admin.firestore();
  
  let sheetId = "1zvuZObXsYPw1OBitE9fZ8kUef2AGIwOoyxLiIdQ9UhE";
  let sheetName = "Sheet1";
  
  try {
    const configSnap = await db.doc('settings/google_sheets').get();
    if (configSnap.exists) {
      const config = configSnap.data();
      if (config.sheetId) sheetId = config.sheetId;
      if (config.sheetName) sheetName = config.sheetName;
    } else {
      console.log("Auto-creating settings/google_sheets document with default sheet ID...");
      await db.doc('settings/google_sheets').set({
        sheetId: sheetId,
        sheetName: sheetName,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn("Firestore config read failed, using default fallback sheet ID:", err.message);
  }
  
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  let targetSheetName = sheetName;
  if (targetSheetName === "Sheet1") targetSheetName = "Model_Training_Data";

  console.log("Syncing all training data to:", targetSheetName);
  const count = await syncCollection(db, sheets, sheetId, "model_training_data", targetSheetName);
  
  return { success: true, count };
};

exports.performSync = performSync;

// 1. Scheduled sync (runs every 4 hours)
exports.syncToGoogleSheetsScheduled = onSchedule({
  schedule: '0 */4 * * *',
  timeZone: 'Asia/Kolkata',
  timeoutSeconds: 300
}, async (event) => {
  console.log("Triggering scheduled Google Sheets sync...");
  try {
    const result = await performSync();
    console.log(`Scheduled sync successful! Synchronized ${result.count} rows.`);
  } catch (err) {
    console.error("Scheduled Google Sheets sync failed:", err);
  }
});

// 2. Direct HTTP sync (for manually triggering via web hook or web UI)
exports.syncToGoogleSheetsHttp = onRequest({
  cors: true,
  timeoutSeconds: 300
}, async (req, res) => {
  try {
    const result = await performSync();
    res.status(200).json({
      success: true,
      message: `Successfully synchronized all data to Google Sheets!`,
      count: result.count
    });
  } catch (err) {
    console.error("HTTP Google Sheets sync failed:", err);
    let clientEmail = "unknown";
    try {
      const axios = require('axios');
      const metadataRes = await axios.get(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email',
        { headers: { 'Metadata-Flavor': 'Google' }, timeout: 2000 }
      );
      clientEmail = metadataRes.data.trim();
    } catch (metadataErr) {
      try {
        const auth = new google.auth.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const client = await auth.getClient();
        clientEmail = client.email || client.credentials?.client_email || "unknown";
      } catch (authErr) {}
    }
    res.status(550).json({
      success: false,
      error: `${err.message} (Service Account Email: ${clientEmail})`
    });
  }
});

// 3. Real-time sync on any Firestore document write (create, update, delete)
exports.syncToGoogleSheetsOnWrite = onDocumentWritten({
  document: 'model_training_data/{docId}',
  timeoutSeconds: 300
}, async (event) => {
  console.log("Model training data change detected in Firestore. Syncing to Google Sheets...");
  try {
    const result = await performSync();
    console.log(`Real-time sync successful! Synchronized ${result.count} rows.`);
  } catch (err) {
    console.error("Real-time Google Sheets sync failed:", err);
  }
});
