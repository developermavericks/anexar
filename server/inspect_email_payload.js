import fs from 'fs';
import path from 'path';

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

async function run() {
  const accessToken = await getAccessToken();
  
  console.log("Searching for Google briefings...");
  const queryStr = 'from:developerteam@themavericksindia.com subject:"Daily News Briefing: Google"';
  const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(queryStr)}&maxResults=3`;
  const sRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const sJson = await sRes.json();
  const messages = sJson.messages || [];
  
  if (messages.length === 0) {
    console.log("No Google briefings found.");
    return;
  }
  
  console.log(`Found ${messages.length} messages. Inspecting the first one (ID: ${messages[0].id})...`);
  
  const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messages[0].id}?format=full`;
  const res = await fetch(detailUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const email = await res.json();
  
  console.log("MimeType:", email.payload.mimeType);
  console.log("Body exists:", !!email.payload.body);
  console.log("Body data size:", email.payload.body?.size || 0);
  console.log("Parts count:", email.payload.parts ? email.payload.parts.length : 0);
  
  function inspectPart(part, depth = 0) {
    const indent = "  ".repeat(depth);
    console.log(`${indent}Part: mimeType=${part.mimeType}, filename="${part.filename || ''}", hasData=${!!(part.body && part.body.data)}, hasParts=${!!part.parts}`);
    if (part.parts) {
      part.parts.forEach(p => inspectPart(p, depth + 1));
    }
  }
  
  inspectPart(email.payload);
}

run().catch(console.error);
