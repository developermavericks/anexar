import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();
const token = env.SKRIBE_JWT_TOKEN;
const cookie = env.SKRIBE_COOKIE;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.goskribe.com/'
};
if (cookie) {
  headers['Cookie'] = cookie;
}

async function run() {
  const url = `https://www.goskribe.com/api/v1/journalist-records/get-journalists/?pageSize=1`;
  console.log(`Making request to Skribe to inspect headers with correct credentials...`);
  try {
    const res = await fetch(url, { headers });
    console.log(`Status: ${res.status}`);
    console.log(`=== Response Headers ===`);
    for (const [key, val] of res.headers.entries()) {
      console.log(`${key}: ${val}`);
    }
  } catch (err) {
    console.error("Error fetching Skribe:", err.message);
  }
}

run();
