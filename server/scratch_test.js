const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

// Load env manually
const dotenvPath = path.join(__dirname, '../.env');
if (fs.existsSync(dotenvPath)) {
  const envConfig = fs.readFileSync(dotenvPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length > 1) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

async function run() {
  const url = 'https://the-ken.com/story/tata-1mg-refused-to-get-carried-away-in-the-e-pharmacy-battle-its-in-no-mood-to-change-its-mind/';
  console.log('Testing URL:', url);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Cook strings
  const cookiesStr = process.env.SESSION_COOKIES_THEKEN || '';
  if (cookiesStr) {
    const cookieArray = cookiesStr.split(';').map(pair => {
      const trimmed = pair.trim();
      const equalIdx = trimmed.indexOf('=');
      if (equalIdx > 0) {
        const name = trimmed.slice(0, equalIdx);
        const value = decodeURIComponent(trimmed.slice(equalIdx + 1));
        return {
          name,
          value,
          domain: 'the-ken.com', // host-only match
          path: '/',
          secure: true,
          httpOnly: true
        };
      }
      return null;
    }).filter(Boolean);

    await page.setCookie(...cookieArray);
    console.log('Injected cookies:', cookieArray.map(c => c.name));
  } else {
    console.log('No cookies found in env!');
  }

  // Set JS enabled (some sites require it to process cookie authentication and page assembly)
  await page.setJavaScriptEnabled(true);

  // Set spoof headers
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.google.com/'
  });

  // Intercept requests to inspect Cookie headers
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().startsWith('https://the-ken.com/story/')) {
      console.log('--- Request Headers for main page ---');
      console.log(req.headers());
    }
    req.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Take a screenshot
    const screenshotPath = path.join(__dirname, 'test_screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Saved screenshot to:', screenshotPath);

    // Save HTML
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'test_page.html'), html);
    console.log('Saved HTML to test_page.html');
  } catch (err) {
    console.error('Error during loading:', err);
  } finally {
    await browser.close();
  }
}

run();
