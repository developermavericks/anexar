const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const puppeteerExtra = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteerExtra.use(stealth());

// Locate Chrome on Windows
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

let executablePath = null;
for (const p of chromePaths) {
  if (fs.existsSync(p)) {
    executablePath = p;
    break;
  }
}

console.log("Starting manual ePaper scrape...");
console.log("Chrome Executable Path:", executablePath || "Default");

// Initialize Firebase Client SDK (uses Web API credentials)
const firebaseConfig = {
  apiKey: "AIzaSyCB_pSS1-1VFkdHjzN2W8ozW55W0lF3BD8",
  authDomain: "anexar-9820c.firebaseapp.com",
  projectId: "anexar-9820c",
  storageBucket: "anexar-9820c.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
const storage = getStorage(app);

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
  { name: 'Dainik Bhaskar', url: 'https://www.careerswave.in/dainik-bhaskar-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Dainik Jagran', url: 'https://www.careerswave.in/dainik-jagran-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Amar Ujala', url: 'https://www.careerswave.in/amar-ujala-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Hindustan', url: 'https://www.careerswave.in/hindustan-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Jansatta', url: 'https://www.careerswave.in/jansatta-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Navbharat Times', url: 'https://www.careerswave.in/navbharat-times-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Hindustan Times', url: 'https://www.careerswave.in/hindustan-times-epaper-pdf-free-download/', language: 'English' },
  { name: 'Dainik Navajyoti', url: 'https://www.careerswave.in/dainik-navajyoti-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Punjab Kesari', url: 'https://www.careerswave.in/punjab-kesari-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Rashtriya Sahara', url: 'https://www.careerswave.in/rashtriya-sahara-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'Prabhat Khabar', url: 'https://www.careerswave.in/prabhat-khabar-epaper-pdf-free-download/', language: 'Hindi' },
  { name: 'The Hindu', url: 'https://www.careerswave.in/the-hindu-epaper-pdf-download-for-upsc/', language: 'English' },
  { name: 'Business Line', url: 'https://www.careerswave.in/business-line-epaper-pdf-free-download/', language: 'English' },
  { name: 'The Economic Times', url: 'https://www.careerswave.in/economic-times-epaper-pdf-free-download/', language: 'English' },
  { name: 'Times of India', url: 'https://www.careerswave.in/times-of-india-epaper-pdf-free-download/', language: 'English' },
  { name: 'Business Standard', url: 'https://www.careerswave.in/business-standard-newspaper-in-pdf/', language: 'English' },
  { name: 'Livemint', url: 'https://www.careerswave.in/mint-epaper-pdf-free-download/', language: 'English' },
  { name: 'Financial Express', url: 'https://www.careerswave.in/the-financial-express-epaper-pdf-free-download/', language: 'English' }
];

const getOfficialName = (name) => DISPLAY_NAMES[name] || name;

async function downloadGDrivePdf(driveLink) {
  const driveIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!driveIdMatch) throw new Error('Could not extract GDrive file ID.');
  const driveId = driveIdMatch[1];
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
  
  const res = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  return res.data;
}

async function downloadZDrivePdf(browser, zdriveUrl) {
  const page = await browser.newPage();
  let directDownloadLink = null;

  const responseListener = async response => {
    const url = response.url();
    if (url.includes('/file/generate')) {
      try {
        const json = await response.json();
        if (json.download_link) directDownloadLink = json.download_link;
      } catch (err) {}
    }
  };
  page.on('response', responseListener);

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
          btn.click();
          return true;
        }
        return false;
      }, 'Create Download Link');
      if (foundCreate) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    let foundDownload = false;
    for (let attempts = 0; attempts < 30; attempts++) {
      foundDownload = await page.evaluate((text) => {
        const btns = [...document.querySelectorAll('button, a')];
        return !!btns.find(b => b.textContent.includes(text));
      }, 'Click Here to Download');
      if (foundDownload) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    await page.evaluate((text) => {
      const btns = [...document.querySelectorAll('button, a')];
      const btn = btns.find(b => b.textContent.includes(text));
      if (btn) btn.click();
    }, 'Click Here to Download');
    
    for (let i = 0; i < 30; i++) {
      if (directDownloadLink) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (!directDownloadLink) throw new Error('Failed to intercept direct download link');

    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const userAgent = await page.evaluate(() => navigator.userAgent);

    const response = await axios.get(directDownloadLink, {
      headers: { 'User-Agent': userAgent, 'Cookie': cookieStr },
      responseType: 'arraybuffer'
    });
    return response.data;
  } finally {
    page.off('response', responseListener);
    await page.close().catch(() => {});
  }
}

async function run() {
  const todayIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const formattedToday = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
  
  console.log("Scraping for date:", formattedToday);

  // 1. Careerswave
  console.log("\n--- Crawling CareersWave ---");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const targetDateLabel = `${todayIST.getDate()} ${months[todayIST.getMonth()]} ${todayIST.getFullYear()}`;
  console.log(`CareersWave target label: "${targetDateLabel}"`);
  
  for (const paper of CAREERSWAVE_PAPERS) {
    const docId = `${formattedToday}_${paper.name.replace(/\s+/g, '_').toLowerCase()}`;
    
    try {
      const docSnap = await getDoc(doc(db, "epapers", docId));
      if (docSnap.exists()) {
        console.log(`[SKIP] CareersWave: ${paper.name} already exists`);
        continue;
      }

      console.log(`[PROCESS] CareersWave: Checking ${paper.name} from ${paper.url}...`);
      const pageRes = await axios.get(paper.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
      const dom = new JSDOM(pageRes.data);
      const rows = dom.window.document.querySelectorAll('.elm-links__row');
      let driveLink = null;
      for (const row of rows) {
        const dateText = row.querySelector('.elm-links__date')?.textContent.trim();
        if (dateText && dateText.toLowerCase().includes(targetDateLabel.toLowerCase())) {
          const downloadLinks = Array.from(row.querySelectorAll('a.elm-links__download'));
          if (downloadLinks.length > 0) {
            if (paper.language === 'English') {
              const englishLink = downloadLinks.find(a => a.textContent.trim().toLowerCase().includes('english'));
              driveLink = (englishLink || downloadLinks[downloadLinks.length - 1]).getAttribute('href');
            } else {
              const hindiLink = downloadLinks.find(a => a.textContent.trim().toLowerCase().includes('hindi'));
              driveLink = (hindiLink || downloadLinks[0]).getAttribute('href');
            }
          }
          break;
        }
      }

      if (driveLink) {
        console.log(`[FOUND] GDrive Link for ${paper.name}: ${driveLink}`);
        const pdfBuffer = await downloadGDrivePdf(driveLink);
        const storagePath = `epapers/${formattedToday}_${paper.name.replace(/\s+/g, '_')}.pdf`;
        const storageRef = ref(storage, storagePath);
        
        console.log(`[STORAGE] Uploading file to ${storagePath}...`);
        await uploadBytes(storageRef, pdfBuffer, { contentType: 'application/pdf' });
        const downloadUrl = await getDownloadURL(storageRef);
        
        await setDoc(doc(db, "epapers", docId), {
          name: paper.name,
          date: formattedToday,
          pdfUrl: downloadUrl,
          uploadedBy: 'Auto Scraper System (CareersWave)',
          createdAt: new Date().toISOString()
        });
        console.log(`[SUCCESS] Uploaded and saved ${paper.name}`);
      } else {
        console.log(`[INFO] No link available for ${paper.name}`);
      }
    } catch (e) {
      console.error(`[ERROR] Careerswave failed for ${paper.name}:`, e.message);
    }
  }

  // 2. ePaperWala
  console.log("\n--- Crawling ePaperWala Blogspot ---");
  try {
    const feedUrl = 'https://epaperwala11.blogspot.com/feeds/posts/default?alt=json';
    const feedResponse = await axios.get(feedUrl);
    const entry = feedResponse.data.feed.entry?.[0];
    if (entry) {
      const htmlContent = entry.content.$t;
      const dom = new JSDOM(htmlContent);
      const resourceItems = dom.window.document.querySelectorAll('.ep-resource-item');
      const validPapers = [];
      resourceItems.forEach(item => {
        const paperTitle = item.querySelector('.ep-card-title')?.textContent.trim();
        const href = item.querySelector('a.ep-access-btn')?.getAttribute('href');
        if (paperTitle && href && href.startsWith('https://zdrive.to')) {
          validPapers.push({ originalName: paperTitle, officialName: getOfficialName(paperTitle), url: href });
        }
      });

      if (validPapers.length > 0) {
        console.log(`Found ${validPapers.length} papers in blogspot post. Launching visible browser...`);
        const browser = await puppeteerExtra.launch({
          headless: false,
          defaultViewport: null,
          ...(executablePath ? { executablePath } : {})
        });

        try {
          for (const paper of validPapers) {
            const docId = `${formattedToday}_${paper.officialName.replace(/\s+/g, '_').toLowerCase()}`;
            const docSnap = await getDoc(doc(db, "epapers", docId));
            if (docSnap.exists()) {
              console.log(`[SKIP] ePaperWala: ${paper.officialName} already exists`);
              continue;
            }

            console.log(`[PROCESS] ePaperWala: Scraping ${paper.officialName} from ${paper.url}...`);
            try {
              const pdfBuffer = await downloadZDrivePdf(browser, paper.url);
              const storagePath = `epapers/${formattedToday}_${paper.officialName.replace(/\s+/g, '_')}.pdf`;
              const storageRef = ref(storage, storagePath);
              
              console.log(`[STORAGE] Uploading file to ${storagePath}...`);
              await uploadBytes(storageRef, pdfBuffer, { contentType: 'application/pdf' });
              const downloadUrl = await getDownloadURL(storageRef);
              
              await setDoc(doc(db, "epapers", docId), {
                name: paper.officialName,
                date: formattedToday,
                pdfUrl: downloadUrl,
                uploadedBy: 'Auto Scraper System',
                createdAt: new Date().toISOString()
              });
              console.log(`[SUCCESS] Uploaded and saved ${paper.officialName}`);
            } catch (err) {
              console.error(`[ERROR] ePaperWala failed for ${paper.officialName}:`, err.message);
            }
          }
        } finally {
          await browser.close();
        }
      }
    }
  } catch (e) {
    console.error(`[ERROR] ePaperWala feed fetch failed:`, e.message);
  }

  console.log("\nScrape complete!");
}

run().catch(console.error);
