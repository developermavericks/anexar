import puppeteer from 'puppeteer';
import fs from 'fs';
import axios from 'axios';

async function testPuppeteer() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  let directDownloadLink = null;

  // Intercept the AJAX call response
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/file/generate')) {
      console.log(`[API RESPONSE FOUND] URL: ${url}`);
      try {
        const json = await response.json();
        if (json.download_link) {
          directDownloadLink = json.download_link;
          console.log('[DIRECT DOWNLOAD LINK EXTRACED]:', directDownloadLink);
        }
      } catch (err) {
        console.error('Failed to parse response JSON:', err.message);
      }
    }
  });

  // Intercept and close popups
  browser.on('targetcreated', async target => {
    const newPage = await target.page();
    if (newPage) {
      console.log('Popup tab opened:', newPage.url());
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('Closing popup tab:', newPage.url());
      await newPage.close().catch(() => {});
    }
  });

  const url = 'https://zdrive.to/E1x3Apvemyk6';
  try {
    console.log('Opening page:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Waiting for #freeBtn...');
    await page.waitForSelector('#freeBtn', { visible: true, timeout: 15000 });
    
    console.log('Clicking #freeBtn...');
    await page.click('#freeBtn');
    
    console.log('Waiting for button.btn-secondary (Start Download Process) to be visible...');
    await page.waitForSelector('button.btn-secondary', { visible: true, timeout: 15000 });
    
    console.log('Clicking Start Download Process...');
    await page.click('button.btn-secondary');
    
    // Find the next button "Create Download Link"
    console.log('Waiting for "Create Download Link" button to be visible...');
    let foundCreate = false;
    for (let attempts = 0; attempts < 30; attempts++) {
      foundCreate = await page.evaluate((text) => {
        const btns = [...document.querySelectorAll('button, a')];
        const btn = btns.find(b => b.textContent.includes(text));
        if (btn) {
          const style = window.getComputedStyle(btn);
          if (style.display !== 'none' && style.visibility !== 'hidden' && btn.getBoundingClientRect().width > 0) {
            btn.click();
            return true;
          }
        }
        return false;
      }, 'Create Download Link');
      
      if (foundCreate) {
        console.log('Found and clicked "Create Download Link" button.');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!foundCreate) {
      throw new Error('Timeout waiting for "Create Download Link" button');
    }

    // Wait for "Click Here to Download" to appear
    console.log('Waiting for "Click Here to Download" button...');
    let foundDownload = false;
    for (let attempts = 0; attempts < 30; attempts++) {
      foundDownload = await page.evaluate((text) => {
        const btns = [...document.querySelectorAll('button, a')];
        const btn = btns.find(b => b.textContent.includes(text));
        return !!btn;
      }, 'Click Here to Download');

      if (foundDownload) {
        console.log('Found "Click Here to Download"!');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!foundDownload) {
      throw new Error('Timeout waiting for "Click Here to Download" button');
    }

    console.log('Natively clicking "Click Here to Download" to trigger download...');
    await page.evaluate((text) => {
      const btns = [...document.querySelectorAll('button, a')];
      const btn = btns.find(b => b.textContent.includes(text));
      if (btn) btn.click();
    }, 'Click Here to Download');
    
    console.log('Waiting 10 seconds for API response to be intercepted...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    if (directDownloadLink) {
      console.log('Extracting cookies and user-agent from page...');
      const cookies = await page.cookies();
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const userAgent = await page.evaluate(() => navigator.userAgent);
      
      console.log('Downloading PDF directly using Axios in Node...');
      const response = await axios.get(directDownloadLink, {
        headers: {
          'User-Agent': userAgent,
          'Cookie': cookieStr,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        responseType: 'arraybuffer'
      });
      
      fs.writeFileSync('22_aug_TH.pdf', response.data);
      console.log('Successfully saved file as 22_aug_TH.pdf! Size:', response.data.length, 'bytes');
    } else {
      console.log('Error: Could not retrieve direct download link.');
    }
    
  } catch (err) {
    console.error('Error during Puppeteer run:', err.message);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

testPuppeteer();
