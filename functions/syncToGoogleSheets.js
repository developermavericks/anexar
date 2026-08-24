const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
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

const performSync = async () => {
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
  
  // 2. Fetch all training data documents from Firestore, sorted by createdAt asc
  const snapshot = await db.collection("model_training_data")
    .orderBy("createdAt", "asc")
    .get();
    
  // 3. Map Firestore documents to rows matching the 11-column training layout
  const headers = ["id", "article_id", "headline", "human_relevant", "human_age_bracket", "reviewed_at", "batch_id", "reviewer_reason", "reviewer_initials", "sector", "publication"];
  const rows = snapshot.docs.map((doc, idx) => {
    const d = doc.data();
    const displayId = `anexar_${idx + 1}`;
    return [
      displayId,
      "", // article_id
      d.headline || "",
      d.human_relevant !== undefined ? d.human_relevant : 1,
      d.human_age_bracket || "general",
      d.reviewed_at || formatReviewedAt(d.createdAt) || "",
      d.batch_id || "Anexar_batch",
      d.reviewer_reason || d.reason || "",
      d.reviewer_initials || d.addedBy || "",
      (d.sector || "").toLowerCase(),
      d.paperName || ""
    ];
  });
  
  // 4. Authenticate using Application Default Credentials (ADC)
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  // 5. Clear current sheet contents to prevent overlap
  console.log(`Clearing Google Sheet range: ${sheetName}!A1:Z`);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:Z`,
  });
  
  // 6. Write fresh clean dataset
  console.log(`Uploading ${rows.length} rows to Google Sheet ${sheetId} (tab: ${sheetName})...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows]
    }
  });
  
  return { success: true, count: rows.length };
};

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
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
