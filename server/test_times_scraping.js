import puppeteer from 'puppeteer';

async function run() {
  const url = 'https://www.thetimes.com/world/asia/article/india-google-data-centre-protest-andhra-pradesh-td5vkzh0s';
  console.log("Launching Puppeteer with JS disabled and Googlebot User-Agent...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setJavaScriptEnabled(false);
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.google.com/',
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const html = await page.content();
    console.log(`Successfully fetched! HTML length: ${html.length}`);
    
    // Check for paywall keywords or full text paragraphs
    const hasPaywallText = html.includes('Register') || html.includes('Subscribe') || html.includes('unlock');
    const hasFullText = html.includes('Sandhama Chandala') || html.includes(' mango and cashew trees');
    
    console.log(`Has paywall markers: ${hasPaywallText}`);
    console.log(`Has full article content (Sandhama Chandala): ${hasFullText}`);
    
    // Find title and print a snippet
    const bodyIndex = html.indexOf('Sandhama Chandala');
    if (bodyIndex !== -1) {
      console.log("Snippet from found text:\n", html.slice(bodyIndex - 200, bodyIndex + 500));
    } else {
      console.log("Sample HTML section around article body:\n", html.slice(0, 1000));
    }
  } catch (err) {
    console.error("Scraping failed:", err.message);
  } finally {
    await browser.close();
  }
}

run();
