import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Firebase Config
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

const CREDENTIALS_PATH = path.resolve('credentials.json');
const TOKEN_PATH = path.resolve('token.json');

async function getAccessToken() {
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
    throw new Error("Credentials or Token file missing. Run gmail_auth.js first.");
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

  const { client_id, client_secret } = credentials.installed;

  // Refresh token if necessary or fetch new access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  if (res.status !== 200) {
    const errText = await res.text();
    throw new Error(`Failed to refresh access token: ${errText}`);
  }

  const newTokens = await res.json();
  const updatedTokens = { ...tokens, ...newTokens };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedTokens, null, 2));

  return updatedTokens.access_token;
}

async function getDocxAttachmentContent(payload, messageId, accessToken) {
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.filename.endsWith('.docx') && part.body && part.body.attachmentId) {
        const attachmentId = part.body.attachmentId;
        console.log(`   -> Found .docx attachment: "${part.filename}". Fetching attachment data...`);
        const attachUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
        const res = await fetch(attachUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.status === 200) {
          const data = await res.json();
          const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
          const buffer = Buffer.from(base64, 'base64');
          const result = await mammoth.convertToHtml({ buffer }, {
            convertImage: mammoth.images.imgElement(function(image) {
              return { src: "" };
            })
          });
          return result.value;
        } else {
          console.warn(`   -> Failed to fetch attachment data. Status: ${res.status}`);
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
        const res = await fetch(attachUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.status === 200) {
          const data = await res.json();
          const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
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
          
          if (jsonData.length === 0) {
            console.warn("      -> Sheet is empty.");
            continue;
          }
          
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
            return {
              ...row,
              'Link': linkVal
            };
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
          
          return {
            headers,
            rows: rowsWithLinks
          };
        } else {
          console.warn(`   -> Failed to fetch attachment data. Status: ${res.status}`);
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
    return {
      client,
      dateLabel: match[2].trim()
    };
  }
  return { client: 'Google', dateLabel: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) };
}

async function run() {
  console.log("Refreshing Gmail access token...");
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error("Auth error:", err.message);
    process.exit(1);
  }

  console.log("Searching for Daily News Briefing emails in Gmail...");
  
  let dateFilter = 'newer_than:2d';
  const args = process.argv.slice(2);
  if (args.includes('--yesterday')) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}`;
    
    dateFilter = `after:${yesterdayStr} before:${todayStr}`;
    console.log(`Filtering strictly for yesterday's briefings (${yesterdayStr} to ${todayStr})...`);
  } else if (args.includes('--today')) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    
    dateFilter = `after:${todayStr}`;
    console.log(`Filtering strictly for today's briefings (after ${todayStr})...`);
  }

  // Search queries for briefs from developerteam
  const queryStr = `from:developerteam@themavericksindia.com subject:"Daily News Briefing:" ${dateFilter}`;
  const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(queryStr)}&maxResults=30`;

  let messages = [];
  try {
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.status !== 200) {
      const errText = await res.text();
      console.error("Gmail Search API failed:", errText);
      process.exit(1);
    }
    const json = await res.json();
    messages = json.messages || [];
  } catch (err) {
    console.error("Error calling Gmail search:", err.message);
    process.exit(1);
  }

  if (messages.length === 0) {
    console.log("No matching news briefing emails found in inbox.");
    process.exit(0);
  }

  console.log(`Found ${messages.length} recent briefing emails. Processing...`);

  const pressRef = collection(db, "client_documents");

  for (const msg of messages) {
    console.log(`\nFetching details for message ID: ${msg.id}`);
    const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
    
    try {
      const res = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.status !== 200) {
        console.warn(`Could not fetch details for message ${msg.id}`);
        continue;
      }
      
      const email = await res.json();
      const headers = email.payload.headers || [];
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
      const subject = subjectHeader ? subjectHeader.value : 'Daily News Briefing: Google';
      
      console.log(`Subject: "${subject}"`);
      const { client, dateLabel } = parseSubject(subject);
      
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
        console.warn("No HTML body, .docx, or .xlsx attachment found in this message. Skipping.");
        continue;
      }
      
      // Parse month and year from dateLabel
      // Date label format e.g. "August 10, 2026"
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
        uploadedBy: 'Gmail Ingestion API',
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

      // Ensure content fits within Firestore's 1MB document limit (1,048,576 bytes)
      if (docData.content && Buffer.byteLength(docData.content, 'utf8') > 1000000) {
        console.warn(`   -> WARNING: Document content for ${client} on ${dateLabel} is too large (${Buffer.byteLength(docData.content, 'utf8')} bytes). Purging images to save space.`);
        docData.content = docData.content.replace(/<img[^>]*>/gi, '');
        if (Buffer.byteLength(docData.content, 'utf8') > 1000000) {
          console.warn(`   -> WARNING: Still too large. Truncating content to prevent Firestore write failure.`);
          docData.content = docData.content.substring(0, 900000) + '<p><strong>... [Briefing Truncated due to size limit]</strong></p>';
        }
      }
      
      // Check if already uploaded (by gmailMessageId OR client + fileName to prevent duplicates)
      const qExist = query(pressRef, where("gmailMessageId", "==", msg.id));
      let qSnap = await getDocs(qExist);

      if (qSnap.empty) {
        const qName = query(pressRef, where("client", "==", client), where("fileName", "==", docData.fileName));
        qSnap = await getDocs(qName);
      }
      
      if (!qSnap.empty) {
        const docId = qSnap.docs[0].id;
        await updateDoc(doc(db, "client_documents", docId), docData);
        console.log(`   -> SUCCESS: Updated existing entry for ${client} (${dateLabel}) in client_documents.`);
      } else {
        await addDoc(pressRef, docData);
        console.log(`   -> SUCCESS: Added new entry for ${client} (${dateLabel}) to client_documents.`);
      }
      
    } catch (err) {
      console.error(`Error processing message ${msg.id}:`, err.message);
    }
  }

  console.log("\nAll messages parsed and synced successfully!");
  process.exit(0);
}

run().catch(console.error);
