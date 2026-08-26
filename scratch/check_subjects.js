import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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

async function listSubjects() {
  const token = await getAccessToken();
  const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=subject:"Daily News Briefing:"&maxResults=50`;
  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(`Found ${data.messages?.length || 0} messages.`);
  
  if (data.messages) {
    for (const msg of data.messages) {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detail = await detailRes.json();
      const subjectHeader = detail.payload.headers.find(h => h.name.toLowerCase() === 'subject');
      console.log(`Msg ID: ${msg.id} | Subject: ${subjectHeader?.value}`);
    }
  }
}

listSubjects().catch(console.error);
