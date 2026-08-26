import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function run() {
  console.log('Launching system Chrome...');
  
  // Typical path for Google Chrome on Windows
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  const browser = await puppeteer.launch({
    headless: false, // Run in headful mode so Cloudflare Turnstile verifies naturally
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  try {
    console.log('Navigating to tradingref.com...');
    await page.goto('https://www.tradingref.com/#editionSelect', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting 10 seconds for verification to complete and page to render...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Save screenshot
    await page.screenshot({ path: 'tradingref_chrome_screenshot.png' });
    console.log('Saved screenshot to tradingref_chrome_screenshot.png');

    // Save html
    const html = await page.content();
    fs.writeFileSync('tradingref_chrome_html.txt', html, 'utf8');
    console.log('Saved HTML to tradingref_chrome_html.txt! Length:', html.length);

    // Extract links
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a, button'));
      return anchors.map(a => ({
        text: a.textContent.trim().replace(/\s+/g, ' '),
        href: a.getAttribute('href') || '',
        tagName: a.tagName,
        id: a.id || '',
        className: a.className || ''
      }));
    });

    fs.writeFileSync('tradingref_chrome_links.json', JSON.stringify(links, null, 2), 'utf8');
    console.log('Saved links to tradingref_chrome_links.json');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

run();
