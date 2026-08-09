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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  
  const url = 'https://www.goskribe.com/api/v1/journalist-records/get-outlet-filter?pageSize=10000&pageNumber=1';
  console.log("Fetching outlet filters...");
  const res = await fetch(url, { headers });
  
  if (res.status === 200) {
    const json = await res.json();
    const data = json?.data || json?.items || json || [];
    console.log(`Total outlets returned: ${data.length}`);
    if (data.length > 0) {
      console.log("Structure of first item:", JSON.stringify(data[0]));
    }
    
    // Search for specific top target publications
    const queries = ['mint', 'yourstory', 'ndtv', 'moneycontrol', 'inc42'];
    const matches = data.filter(item => {
      const name = String(item.name || item.vchOutletName || item.label || item.value || '').toLowerCase();
      return queries.some(q => name.includes(q));
    });
    
    console.log("\nMatching target outlets:");
    matches.forEach(m => {
      console.log(`- Name: "${m.name || m.vchOutletName || m.value}" | ID: ${m.id || m.value}`);
    });
  } else {
    console.error(`Failed with status code: ${res.status}`);
  }
}

run().catch(console.error);
