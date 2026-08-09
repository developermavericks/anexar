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
  
  const url = 'https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=434&SearchFilter=&pageSize=10';
  const res = await fetch(url, { headers });
  if (res.status === 200) {
    const json = await res.json();
    console.log("Full response keys:", Object.keys(json));
    if (json.data) {
      console.log("Data keys:", Object.keys(json.data));
      console.log("totalCount:", json.data.totalCount || json.data.count || json.totalCount);
    }
  } else {
    console.error(`Failed with status: ${res.status}`);
  }
}

run().catch(console.error);
