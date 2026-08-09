import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const jwt = env.SKRIBE_JWT_TOKEN;
  const cookie = env.SKRIBE_COOKIE;
  
  if (!jwt) {
    console.error("Error: SKRIBE_JWT_TOKEN not found");
    process.exit(1);
  }
  
  const headers = {
    'Authorization': `Bearer ${jwt}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  };
  
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  
  // Empty filters to get the total directory
  const url = `https://www.goskribe.com/api/v1/journalist-records/get-journalists/?pageSize=1`;
  const res = await fetch(url, { headers });
  
  if (res.status === 200) {
    const json = await res.json();
    console.log("JSON response keys:", Object.keys(json));
    if (json.data) {
      console.log("JSON data keys:", Object.keys(json.data));
      console.log("Total Count Field (json.data.totalCount):", json.data.totalCount);
      console.log("Total Count Field (json.data.totalRecords):", json.data.totalRecords);
      console.log("Total Count Field (json.data.total):", json.data.total);
    }
  } else {
    console.error(`Failed with status: ${res.status}`);
  }
  process.exit(0);
}

run().catch(console.error);
