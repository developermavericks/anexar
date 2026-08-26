import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CREDENTIALS_PATH = path.resolve('credentials.json');
const TOKEN_PATH = path.resolve('token.json');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function run() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error("Error: credentials.json not found in root directory.");
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const redirect_uri = redirect_uris[0] || 'http://localhost';

  // Generate auth URL
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly'
  ];
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${client_id}&` +
    `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent`;

  console.log('\n=== GOOGLE OAUTH AUTHORIZATION ===');
  console.log('1. Open the following URL in your browser and log in with developerteam@themavericksindia.com:');
  console.log('\x1b[36m%s\x1b[0m', authUrl);
  console.log('\n2. After authorizing, copy the "code" parameter from the URL address bar (e.g., http://localhost/?code=4/0AdQt8...)');
  
  const code = await askQuestion('\nEnter the authorization code here: ');
  if (!code) {
    console.error("Error: No code provided.");
    process.exit(1);
  }

  console.log('\nExchanging code for tokens...');
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: code.trim(),
        client_id,
        client_secret,
        redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    if (res.status !== 200) {
      const errText = await res.text();
      console.error(`Token exchange failed (status: ${res.status}): ${errText}`);
      process.exit(1);
    }

    const tokens = await res.json();
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('\nSUCCESS! Token saved successfully to token.json.');
    console.log('You can now run the Gmail parser script.');
  } catch (err) {
    console.error('Error during token exchange:', err.message);
  }
  process.exit(0);
}

run().catch(console.error);
