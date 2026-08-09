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
  
  const headers = {
    'Authorization': `Bearer ${jwt}`,
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
  
  const url = `https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=294&MediaFilter=1&SearchFilter=&pageSize=10`;
  
  try {
    const res = await fetch(url, { headers });
    if (res.status === 200) {
      const json = await res.json();
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log(`Failed status: ${res.status}`);
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

run();
