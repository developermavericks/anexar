const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const axios = require('axios');
const { JSDOM } = require('jsdom');

let chromium = null;
let puppeteerExtra = null;
let stealth = null;

let chromiumPathPromise = null;
function ensureChromiumPath() {
  if (!chromiumPathPromise) {
    chromium = require('@sparticuz/chromium');
    puppeteerExtra = require('puppeteer-extra');
    stealth = require('puppeteer-extra-plugin-stealth');
    puppeteerExtra.use(stealth());

    chromiumPathPromise = chromium.executablePath().then((execPath) => {
      process.env.PUPPETEER_EXECUTABLE_PATH = execPath;
      return execPath;
    });
  }
  return chromiumPathPromise;
}

const DISPLAY_NAMES = {
  "The Hindu": "The Hindu",
  "The H. Edition": "The Hindu",
  "The Indian Express": "The Indian Express",
  "Indian E. Paper": "The Indian Express",
  "The Times of India": "The Times of India",
  "T.O.I Daily": "The Times of India",
  "Hindustan Times": "Hindustan Times",
  "H.T. Daily": "Hindustan Times",
  "Hindustan T. Edition": "Hindustan Times",
  "Dainik Bhaskar": "Dainik Bhaskar",
  "D.B. Daily": "Dainik Bhaskar",
  "Dainik B. Edition": "Dainik Bhaskar",
  "Business Line": "Business Line",
  "Business L. Edition": "Business Line",
  "Livemint": "Livemint",
  "Live M. Paper": "Livemint",
  "The Economic Times": "The Economic Times",
  "Economic T. Daily": "The Economic Times",
  "Financial Express": "Financial Express",
  "Financial E. Paper": "Financial Express",
  "Business Standard": "Business Standard",
  "Business S. Edition": "Business Standard"
};

const CAREERSWAVE_PAPERS = [
  {
    name: 'Dainik Bhaskar',
    url: 'https://www.careerswave.in/dainik-bhaskar-epaper-pdf-free-download/'
  },
  {
    name: 'Dainik Jagran',
    url: 'https://www.careerswave.in/dainik-jagran-epaper-pdf-free-download/'
  },
  {
    name: 'Amar Ujala',
    url: 'https://www.careerswave.in/amar-ujala-epaper-pdf-free-download/'
  },
  {
    name: 'Hindustan',
    url: 'https://www.careerswave.in/hindustan-epaper-pdf-free-download/'
  },
  {
    name: 'Jansatta',
    url: 'https://www.careerswave.in/jansatta-epaper-pdf-free-download/'
  },
  {
    name: 'Navbharat Times',
    url: 'https://www.careerswave.in/navbharat-times-epaper-pdf-free-download/'
  },
  {
    name: 'Hindustan Times',
    url: 'https://www.careerswave.in/hindustan-times-epaper-pdf-free-download/'
  },
  {
    name: 'Dainik Navajyoti',
    url: 'https://www.careerswave.in/dainik-navajyoti-epaper-pdf-free-download/'
  },
  {
    name: 'Punjab Kesari',
    url: 'https://www.careerswave.in/punjab-kesari-epaper-pdf-free-download/'
  },
  {
    name: 'Rashtriya Sahara',
    url: 'https://www.careerswave.in/rashtriya-sahara-epaper-pdf-free-download/'
  },
  {
    name: 'Prabhat Khabar',
    url: 'https://www.careerswave.in/prabhat-khabar-epaper-pdf-free-download/'
  },
  {
    name: 'The Hindu',
    url: 'https://www.careerswave.in/the-hindu-epaper-pdf-download-for-upsc/'
  },
  {
    name: 'Business Line',
    url: 'https://www.careerswave.in/business-line-epaper-pdf-free-download/'
  },
  {
    name: 'The Economic Times',
    url: 'https://www.careerswave.in/economic-times-epaper-pdf-free-download/'
  },
  {
    name: 'Times of India',
    url: 'https://www.careerswave.in/times-of-india-epaper-pdf-free-download/'
  },
  {
    name: 'Business Standard',
    url: 'https://www.careerswave.in/business-standard-newspaper-in-pdf/'
  },
  {
    name: 'Livemint',
    url: 'https://www.careerswave.in/mint-epaper-pdf-free-download/'
  },
  {
    name: 'Financial Express',
    url: 'https://www.careerswave.in/the-financial-express-epaper-pdf-free-download/'
  }
];

const getOfficialName = (name) => {
  return DISPLAY_NAMES[name] || name;
};

// Automates bypassing of zdrive link (Blogger/ePaperWala source)
async function downloadZDrivePdf(browser, zdriveUrl) {
  const page = await browser.newPage();
  let directDownloadLink = null;

  const responseListener = async response => {
    const url = response.url();
    if (url.includes('/file/generate')) {
      try {
        const json = await response.json();
        if (json.download_link) {
          directDownloadLink = json.download_link;
        }
      } catch (err) {}
    }
  };
  page.on('response', responseListener);

  const popupListener = async target => {
    const newPage = await target.page();
    if (newPage) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await newPage.close().catch(() => {});
    }
  };
  browser.on('targetcreated', popupListener);

  try {
    await page.goto(zdriveUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('#freeBtn', { visible: true, timeout: 35000 });
    await page.click('#freeBtn');
    
    await page.waitForSelector('button.btn-secondary', { visible: true, timeout: 35000 });
    await page.click('button.btn-secondary');
    
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
      if (foundCreate) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!foundCreate) throw new Error('Timeout waiting for "Create Download Link" button');

    let foundDownload = false;
    for (let attempts = 0; attempts < 30; attempts++) {
      foundDownload = await page.evaluate((text) => {
        const btns = [...document.querySelectorAll('button, a')];
        const btn = btns.find(b => b.textContent.includes(text));
        return !!btn;
      }, 'Click Here to Download');
      if (foundDownload) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!foundDownload) throw new Error('Timeout waiting for "Click Here to Download" button');

    await page.evaluate((text) => {
      const btns = [...document.querySelectorAll('button, a')];
      const btn = btns.find(b => b.textContent.includes(text));
      if (btn) btn.click();
    }, 'Click Here to Download');
    
    for (let i = 0; i < 30; i++) {
      if (directDownloadLink) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!directDownloadLink) {
      throw new Error('Failed to intercept direct download link');
    }

    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const userAgent = await page.evaluate(() => navigator.userAgent);

    const response = await axios.get(directDownloadLink, {
      headers: {
        'User-Agent': userAgent,
        'Cookie': cookieStr,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      responseType: 'arraybuffer'
    });

    return response.data;
  } finally {
    page.off('response', responseListener);
    browser.off('targetcreated', popupListener);
    await page.close().catch(() => {});
  }
}

// Downloads directly from Google Drive public URL (CareersWave source)
async function downloadGDrivePdf(driveLink) {
  const driveIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!driveIdMatch) {
    throw new Error('Could not extract Google Drive file ID from link.');
  }

  const driveId = driveIdMatch[1];
  const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
  
  const pdfResponse = await axios.get(directDownloadUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  return pdfResponse.data;
}

// Scrapes and uploads Hindi papers from CareersWave
async function scrapeCareersWave(db, bucket, formattedDate) {
  console.log('[START] Crawling CareersWave Hindi papers...');
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const [yearStr, monthStr, dayStr] = formattedDate.split('-');
  const dayInt = parseInt(dayStr, 10);
  const monthName = months[parseInt(monthStr, 10) - 1];
  const targetDateLabel = `${dayInt} ${monthName} ${yearStr}`; // e.g. "23 August 2026"
  console.log(`CareersWave target date label: "${targetDateLabel}"`);

  for (const paper of CAREERSWAVE_PAPERS) {
    const docId = `${formattedDate}_${paper.name.replace(/\s+/g, '_').toLowerCase()}`;
    const docRef = db.collection('epapers').doc(docId);

    // Check if already published
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      console.log(`[SKIP] ${paper.name} already published for ${formattedDate}`);
      continue;
    }

    console.log(`[PROCESS] CareersWave: Checking ${paper.name} from ${paper.url}...`);
    try {
      const pageRes = await axios.get(paper.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const dom = new JSDOM(pageRes.data);
      const document = dom.window.document;
      const rows = document.querySelectorAll('.elm-links__row');

      let driveLink = null;
      for (const row of rows) {
        const dateText = row.querySelector('.elm-links__date')?.textContent.trim();
        if (dateText && dateText.toLowerCase().includes(targetDateLabel.toLowerCase())) {
          driveLink = row.querySelector('a.elm-links__download')?.getAttribute('href');
          break;
        }
      }

      if (!driveLink) {
        console.log(`[INFO] CareersWave: Link not available yet for ${paper.name} on ${targetDateLabel}`);
        continue;
      }

      console.log(`[DOWNLOAD] CareersWave: Downloading ${paper.name} from GDrive link: ${driveLink}`);
      const pdfBuffer = await downloadGDrivePdf(driveLink);
      console.log(`[DOWNLOADED] Successfully fetched ${paper.name} (${pdfBuffer.length} bytes)`);

      const safeName = paper.name.replace(/\s+/g, '_');
      const storagePath = `epapers/${formattedDate}_${safeName}.pdf`;
      const file = bucket.file(storagePath);

      console.log(`[STORAGE] Uploading to: ${storagePath}...`);
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf'
        }
      });

      console.log('[STORAGE] Making file publicly readable...');
      await file.makePublic();

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
      console.log(`[FIRESTORE] Saving document meta with URL: ${downloadUrl}`);

      await docRef.set({
        name: paper.name,
        date: formattedDate,
        pdfUrl: downloadUrl,
        uploadedBy: 'Auto Scraper System (CareersWave)',
        createdAt: new Date().toISOString()
      });

      console.log(`[SUCCESS] Published ${paper.name} for ${formattedDate}!`);

    } catch (err) {
      console.error(`[ERROR] CareersWave processing failed for ${paper.name}:`, err.message);
    }
  }
}

exports.autoFetchEPapers = onSchedule(
  {
    schedule: '*/15 * * * *', // Run every 15 minutes, 24 hours a day
    timeZone: 'Asia/Kolkata',
    memory: '1GiB',
    timeoutSeconds: 300
  },
  async (event) => {
    console.log('[START] Scheduled epaper scraper run...');
    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    // Calculate today's date in IST for CareersWave
    const todayIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const year = todayIST.getFullYear();
    const month = String(todayIST.getMonth() + 1).padStart(2, '0');
    const day = String(todayIST.getDate()).padStart(2, '0');
    const formattedToday = `${year}-${month}-${day}`; // e.g. "2026-08-24"
    console.log(`Today's IST Date for CareersWave: ${formattedToday}`);

    let formattedDate = formattedToday;

    try {
      const feedUrl = 'https://epaperwala11.blogspot.com/feeds/posts/default?alt=json';
      const feedResponse = await axios.get(feedUrl);
      const entry = feedResponse.data.feed.entry?.[0];

      if (entry) {
        const title = entry.title.$t;
        console.log(`Latest post title: "${title}"`);

        const dateMatch = title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          formattedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          console.log(`Extracted Date: ${formattedDate}`);
        }

        const htmlContent = entry.content.$t;
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;

        const resourceItems = document.querySelectorAll('.ep-resource-item');
        const validPapers = [];
        resourceItems.forEach(item => {
          const paperTitle = item.querySelector('.ep-card-title')?.textContent.trim();
          const href = item.querySelector('a.ep-access-btn')?.getAttribute('href');

          if (paperTitle && href && href.startsWith('https://zdrive.to')) {
            const officialName = getOfficialName(paperTitle);
            validPapers.push({ originalName: paperTitle, officialName, url: href });
          }
        });

        console.log(`Found ${validPapers.length} valid newspaper links to check from Blogspot.`);
        
        if (validPapers.length > 0) {
          await ensureChromiumPath();

          const browser = await puppeteerExtra.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
          });

          try {
            for (const paper of validPapers) {
              const docId = `${formattedDate}_${paper.officialName.replace(/\s+/g, '_').toLowerCase()}`;
              const docRef = db.collection('epapers').doc(docId);

              // Check if already published
              const docSnap = await docRef.get();
              if (docSnap.exists) {
                console.log(`[SKIP] ${paper.officialName} already published for ${formattedDate}`);
                continue;
              }

              console.log(`[PROCESS] Scraping ${paper.officialName} from ${paper.url}...`);
              try {
                const pdfBuffer = await downloadZDrivePdf(browser, paper.url);
                console.log(`[DOWNLOADED] Successfully fetched ${paper.officialName} (${pdfBuffer.length} bytes)`);

                const safeName = paper.officialName.replace(/\s+/g, '_');
                const storagePath = `epapers/${formattedDate}_${safeName}.pdf`;
                const file = bucket.file(storagePath);

                console.log(`[STORAGE] Uploading to: ${storagePath}...`);
                await file.save(pdfBuffer, {
                  metadata: {
                    contentType: 'application/pdf'
                  }
                });

                console.log('[STORAGE] Making file publicly readable...');
                await file.makePublic();

                const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
                console.log(`[FIRESTORE] Saving document meta with URL: ${downloadUrl}`);

                await docRef.set({
                  name: paper.officialName,
                  date: formattedDate,
                  pdfUrl: downloadUrl,
                  uploadedBy: 'Auto Scraper System',
                  createdAt: new Date().toISOString()
                });

                console.log(`[SUCCESS] Published ${paper.officialName} for ${formattedDate}!`);
              } catch (paperErr) {
                console.error(`[FAILED] Error processing ${paper.officialName}:`, paperErr.message);
              }
            }
          } finally {
            await browser.close();
          }
        }
      }
    } catch (err) {
      console.error('[ERROR] Blogspot scraper cycle crashed:', err.message);
    }

    // Run CareersWave scraper with today's actual IST date
    try {
      await scrapeCareersWave(db, bucket, formattedToday);
    } catch (cwErr) {
      console.error('[ERROR] CareersWave scraper cycle crashed:', cwErr.message);
    }

    console.log('[FINISHED] Auto scraper cycle completed.');
  }
);
