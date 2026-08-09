const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const jwt = env.SKRIBE_JWT_TOKEN;
  const cookie = env.SKRIBE_COOKIE;
  
  const headers = {
    'Authorization': `Bearer ${jwt}`,
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  };
  
  const url = 'https://www.goskribe.com/api/v1/journalists/get-journalist-by-id?Id=223654';
  const res = await fetch(url, { headers });
  console.log(`Status: ${res.status}`);
  if (res.status === 200) {
    const json = await res.json();
    console.log("JSON response keys:", Object.keys(json));
    console.log("JSON data keys:", Object.keys(json.data || {}));
    console.log("Profile Data snippet:");
    console.log(JSON.stringify(json.data, null, 2));
  } else {
    const text = await res.text();
    console.error(`Failed: ${text}`);
  }
}

run().catch(console.error);
