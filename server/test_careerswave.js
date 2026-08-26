import axios from 'axios';
import { JSDOM } from 'jsdom';
import fs from 'fs';

async function testCareersWave() {
  const url = 'https://www.careerswave.in/dainik-bhaskar-epaper-pdf-free-download/';
  const targetDateLabel = '23 August 2026';
  
  console.log('Fetching page:', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const dom = new JSDOM(res.data);
    const document = dom.window.document;

    const rows = document.querySelectorAll('.elm-links__row');
    console.log(`Found ${rows.length} date rows on CareersWave page.`);

    let driveLink = null;
    for (const row of rows) {
      const dateText = row.querySelector('.elm-links__date')?.textContent.trim();
      console.log('Row date found:', dateText);

      if (dateText && dateText.toLowerCase().includes(targetDateLabel.toLowerCase())) {
        driveLink = row.querySelector('a.elm-links__download')?.getAttribute('href');
        console.log(`MATCH FOUND! Drive Link: ${driveLink}`);
        break;
      }
    }

    if (!driveLink) {
      console.log(`Error: Could not find row for date: ${targetDateLabel}`);
      return;
    }

    // Extract Google Drive ID
    const driveIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!driveIdMatch) {
      console.log('Error: Could not extract Google Drive file ID from link.');
      return;
    }

    const driveId = driveIdMatch[1];
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
    console.log(`Google Drive File ID: ${driveId}`);
    console.log(`Direct Download URL: ${directDownloadUrl}`);

    console.log('Downloading PDF bytes from Google Drive...');
    const pdfResponse = await axios.get(directDownloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    fs.writeFileSync('dainik_bhaskar_test.pdf', pdfResponse.data);
    console.log(`Successfully saved PDF! Size: ${pdfResponse.data.byteLength} bytes`);

  } catch (err) {
    console.error('Error during test:', err.message);
  }
}

testCareersWave();
