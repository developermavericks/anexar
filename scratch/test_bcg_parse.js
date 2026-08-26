import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const CREDENTIALS_PATH = path.resolve('credentials.json');
const TOKEN_PATH = path.resolve('token.json');

async function getAccessToken() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const { client_id, client_secret } = credentials.installed;
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
  const newTokens = await res.json();
  return newTokens.access_token;
}

async function getExcelAttachmentData(payload, messageId, accessToken) {
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.filename.endsWith('.xlsx') && part.body && part.body.attachmentId) {
        const attachmentId = part.body.attachmentId;
        const attachUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
        const res = await fetch(attachUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(base64, 'base64');
        return buffer;
      }
      const nested = await getExcelAttachmentData(part, messageId, accessToken);
      if (nested) return nested;
    }
  }
  return null;
}

async function testParse() {
  const token = await getAccessToken();
  // Fetch the BCG message
  const msgId = '19fe9d7c991991b6';
  const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}`;
  const detailRes = await fetch(detailUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const detail = await detailRes.json();
  const buffer = await getExcelAttachmentData(detail.payload, msgId, token);
  
  if (buffer) {
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
          if (val.includes('title of the article') || val.includes('link of the article') || val.includes('headline')) {
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
    
    console.log(`Detected header row index: ${headerRowIndex}`);
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: "" });
    console.log(`Parsed rows count: ${jsonData.length}`);
    console.log(`Headers: ${Object.keys(jsonData[0] || {})}`);
    console.log(`First row:`, jsonData[0]);
  } else {
    console.log("No excel attachment found.");
  }
}

testParse().catch(console.error);
