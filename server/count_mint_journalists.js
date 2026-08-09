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

function getPageToken(page) {
  const tokenObj = { page };
  const tokenStr = JSON.stringify(tokenObj);
  return Buffer.from(tokenStr).toString('base64');
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
  
  let totalCount = 0;
  let page = 1;
  let hasMore = true;
  
  console.log("Counting total journalists for Mint (Outlet ID: 287)...");
  
  while (hasMore) {
    let url = `https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=287&SearchFilter=&pageSize=100`;
    if (page > 1) {
      url += `&token=${getPageToken(page)}`;
    }
    
    try {
      const res = await fetch(url, { headers });
      if (res.status !== 200) {
        console.error(`Request failed on page ${page} with status ${res.status}`);
        break;
      }
      
      const json = await res.json();
      const items = json?.data?.items || json?.items || json?.data || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        hasMore = false;
        break;
      }
      
      totalCount += items.length;
      console.log(`Page ${page}: found ${items.length} records. Current total: ${totalCount}`);
      
      if (items.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
      break;
    }
  }
  
  console.log(`\nFinal Result: Total journalists on Mint: ${totalCount}`);
  process.exit(0);
}

run().catch(console.error);
