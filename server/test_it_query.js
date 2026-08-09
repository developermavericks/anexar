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
  
  // Test with different query parameters
  const urls = [
    'https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=1540&MediaFilter=1&SearchFilter=&pageSize=10',
    'https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=1540&SearchFilter=&pageSize=10',
    'https://www.goskribe.com/api/v1/journalist-records/get-journalists/?OutletFilter=1540&MediaFilter=2&SearchFilter=&pageSize=10'
  ];
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`\nTesting URL ${i + 1}: ${urls[i]}`);
    const res = await fetch(urls[i], { headers });
    console.log(`Status: ${res.status}`);
    if (res.status === 200) {
      const json = await res.json();
      const items = json?.data?.items || json?.items || json?.data || [];
      console.log(`Items count: ${Array.isArray(items) ? items.length : 'not an array'}`);
      if (Array.isArray(items) && items.length > 0) {
        console.log("First item:", items[0].vchJournalistName || items[0].name);
      }
    }
  }
}

run().catch(console.error);
