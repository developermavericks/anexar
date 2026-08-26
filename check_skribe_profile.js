import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve('.env');
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

const endpoints = [
  'https://www.goskribe.com/api/v1/auth/user',
  'https://www.goskribe.com/api/v1/users/profile',
  'https://www.goskribe.com/api/v1/dashboard/usage',
  'https://www.goskribe.com/api/v1/users/quota',
  'https://www.goskribe.com/api/v1/journalists/get-user-limits',
  'https://www.goskribe.com/api/v1/user/limits',
  'https://www.goskribe.com/api/v1/auth/me'
];

async function check() {
  console.log("Checking Skribe endpoints for account/credit details...");
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers });
      console.log(`Endpoint: ${url} -> Status: ${res.status}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log("Response Text (truncated):", text.slice(0, 1000));
      }
    } catch (err) {
      console.log(`Endpoint: ${url} -> Error: ${err.message}`);
    }
  }
}

check();
