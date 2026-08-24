const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const axios = require('axios');

const CREDENTIALS_PATH = path.resolve(__dirname, 'credentials.json');
const TOKEN_PATH = path.resolve(__dirname, 'token.json');

async function getAccessToken() {
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
    throw new Error("Credentials or Token file missing in function environment.");
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

  const { client_id, client_secret } = credentials.installed;

  // Refresh Google OAuth token
  const res = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
    client_id,
    client_secret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token'
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (res.status !== 200) {
    throw new Error(`Failed to refresh access token: ${res.statusText}`);
  }

  const newTokens = res.data;
  return newTokens.access_token;
}

async function getDocxAttachmentContent(payload, messageId, accessToken) {
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.filename.endsWith('.docx') && part.body && part.body.attachmentId) {
        const attachmentId = part.body.attachmentId;
        console.log(`   -> Found .docx attachment: "${part.filename}". Fetching attachment data...`);
        const attachUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
        const res = await axios.get(attachUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.status === 200) {
          const base64 = res.data.data.replace(/-/g, '+').replace(/_/g, '/');
          const buffer = Buffer.from(base64, 'base64');
          const result = await mammoth.convertToHtml({ buffer }, {
            convertImage: mammoth.images.imgElement(function(image) {
              return { src: "" };
            })
          });
          return result.value;
        }
      }
      const nestedContent = await getDocxAttachmentContent(part, messageId, accessToken);
      if (nestedContent) return nestedContent;
    }
  }
  return null;
}

async function getExcelAttachmentData(payload, messageId, accessToken) {
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.filename.endsWith('.xlsx') && part.body && part.body.attachmentId) {
        const attachmentId = part.body.attachmentId;
        console.log(`   -> Found .xlsx attachment: "${part.filename}". Fetching attachment data...`);
        const attachUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
        const res = await axios.get(attachUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.status === 200) {
          const base64 = res.data.data.replace(/-/g, '+').replace(/_/g, '/');
          const buffer = Buffer.from(base64, 'base64');
          
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const range = XLSX.utils.decode_range(worksheet['!ref']);
          let headerRowIndex = range.s.r;
          
          for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 10); ++r) {
            let isHeader = false;
            for (let c = range.s.c; c <= range.e.c; ++c) {
              const cellAddress = XLSX.utils.encode_cell({ r, c });
              const cell = worksheet[cellAddress];
              if (cell && cell.v) {
                const val = cell.v.toString().toLowerCase();
                if (val.includes('title of the article') || val.includes('link of the article') || val.includes('headline') || val.includes('publication') || val.includes('link')) {
                  isHeader = true;
                  break;
                }
              }
            }
            if (isHeader) {
              headerRowIndex = r;
              break;
            }
          }
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: "" });
          if (jsonData.length === 0) continue;
          
          const startRow = headerRowIndex + 1;
          const rowsWithLinks = jsonData.map((row, i) => {
            const r = i + startRow;
            let linkVal = "";
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r, c: C });
              const cell = worksheet[cellAddress];
              if (cell && cell.l && cell.l.Target) {
                linkVal = cell.l.Target;
                break;
              }
            }
            return { ...row, 'Link': linkVal };
          });
          
          const allKeys = new Set();
          rowsWithLinks.forEach(row => {
            Object.keys(row).forEach(key => {
              if (key && !key.startsWith('__EMPTY')) {
                allKeys.add(key);
              }
            });
          });
          allKeys.add('Link');
          const headers = Array.from(allKeys);
          
          return { headers, rows: rowsWithLinks };
        }
      }
      const nestedData = await getExcelAttachmentData(part, messageId, accessToken);
      if (nestedData) return nestedData;
    }
  }
  return null;
}

function getHtmlBody(payload) {
  if (payload.body && payload.body.data && payload.mimeType === 'text/html') {
    return payload.body.data;
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const html = getHtmlBody(part);
      if (html) return html;
    }
  }
  return null;
}

function decodeBase64Url(data) {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function parseSubject(subject) {
  const match = subject.match(/Daily News Briefing:\s*([^-]+)\s*-\s*(.+)/i);
  if (match) {
    let client = match[1].trim();
    if (client.toLowerCase() === 'murf ai' || client.toLowerCase() === 'murf-ai' || client.toLowerCase() === 'mur ai' || client.toLowerCase() === 'murai') {
      client = 'Murf AI';
    }
    if (client.toLowerCase() === 'google1') {
      client = 'Google';
    }
    return { client, dateLabel: match[2].trim() };
  }
  return { client: 'Google', dateLabel: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) };
}

exports.syncGmailBriefings = onSchedule(
  {
    schedule: '*/15 10-13 * * *', // Run every 15 mins between 10:00 AM and 1:59 PM IST
    timeZone: 'Asia/Kolkata',
    memory: '512MiB',
    timeoutSeconds: 240
  },
  async (event) => {
    console.log('[START] Scheduled Gmail briefings sync run...');
    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();

    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch (err) {
      console.error('[ERROR] Gmail Token refresh failed:', err.message);
      return;
    }

    // Filter recent 2 days to catch up
    const queryStr = `from:developerteam@themavericksindia.com subject:"Daily News Briefing:" newer_than:2d`;
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(queryStr)}&maxResults=20`;

    let messages = [];
    try {
      const searchRes = await axios.get(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      messages = searchRes.data.messages || [];
    } catch (err) {
      console.error('[ERROR] Failed to fetch emails:', err.message);
      return;
    }

    if (messages.length === 0) {
      console.log('No recent Daily News Briefing emails found.');
      return;
    }

    console.log(`Processing ${messages.length} emails...`);

    const colRef = db.collection('client_documents');

    for (const msg of messages) {
      try {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const detailRes = await axios.get(detailUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        const email = detailRes.data;
        const headers = email.payload.headers || [];
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
        const subject = subjectHeader ? subjectHeader.value : 'Daily News Briefing: Google';

        const { client, dateLabel } = parseSubject(subject);
        console.log(`Processing: "${subject}"`);

        let cleanHtml = null;
        let excelData = null;

        const rawHtmlBody = getHtmlBody(email.payload);
        if (rawHtmlBody) {
          cleanHtml = decodeBase64Url(rawHtmlBody);
        } else {
          cleanHtml = await getDocxAttachmentContent(email.payload, msg.id, accessToken);
        }

        if (!cleanHtml) {
          excelData = await getExcelAttachmentData(email.payload, msg.id, accessToken);
        }

        if (!cleanHtml && !excelData) {
          console.log(`No content found in message ${msg.id}. Skipping.`);
          continue;
        }

        const dateParts = dateLabel.split(' ');
        const month = dateParts[0] || 'August';
        const year = dateParts[2] ? dateParts[2].replace(',', '') : '2026';

        let reportDateStr = new Date().toISOString().split('T')[0];
        try {
          const parsedDate = new Date(dateLabel);
          if (!isNaN(parsedDate.getTime())) {
            reportDateStr = parsedDate.toISOString().split('T')[0];
          }
        } catch (e) {}

        const docData = {
          client,
          fileName: excelData
            ? `${client} Daily Tracker - ${dateLabel}`
            : `${client} Daily News Briefing - ${dateLabel}`,
          month,
          year,
          type: excelData ? 'excel' : 'docx',
          fileSize: excelData ? '250 KB' : '150 KB',
          uploadedBy: 'Gmail Ingestion Cloud API',
          reportDate: reportDateStr,
          gmailMessageId: msg.id,
          createdAt: new Date().toISOString()
        };

        if (excelData) {
          docData.headers = excelData.headers;
          docData.rows = excelData.rows;
        } else {
          docData.content = cleanHtml;
        }

        // Limit document size
        if (docData.content && Buffer.byteLength(docData.content, 'utf8') > 1000000) {
          docData.content = docData.content.replace(/<img[^>]*>/gi, '');
          if (Buffer.byteLength(docData.content, 'utf8') > 1000000) {
            docData.content = docData.content.substring(0, 900000) + '<p><strong>... [Briefing Truncated due to size limit]</strong></p>';
          }
        }

        // Check duplicates
        const qExist = colRef.where("gmailMessageId", "==", msg.id);
        let qSnap = await qExist.get();

        if (qSnap.empty) {
          const qName = colRef.where("client", "==", client).where("fileName", "==", docData.fileName);
          qSnap = await qName.get();
        }

        if (!qSnap.empty) {
          const docId = qSnap.docs[0].id;
          await colRef.doc(docId).update(docData);
          console.log(`[UPDATED] Entry for ${client} (${dateLabel})`);
        } else {
          await colRef.add(docData);
          console.log(`[ADDED] Entry for ${client} (${dateLabel})`);
        }

      } catch (msgErr) {
        console.error(`Error processing email ${msg.id}:`, msgErr.message);
      }
    }

    console.log('[FINISHED] Scheduled Gmail briefings sync completed.');
  }
);
