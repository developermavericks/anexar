import axios from 'axios';
import { JSDOM } from 'jsdom';

async function checkJagran() {
  const url = 'https://www.careerswave.in/dainik-jagran-epaper-pdf-free-download/';
  console.log('Fetching Dainik Jagran status from CareersWave...');
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const dom = new JSDOM(res.data);
    const document = dom.window.document;
    const rows = document.querySelectorAll('.elm-links__row');
    
    console.log(`\nFound ${rows.length} rows on the page.`);
    console.log('Top 5 rows currently listed:');
    
    let count = 0;
    for (const row of rows) {
      if (count >= 5) break;
      const dateText = row.querySelector('.elm-links__date')?.textContent.trim();
      const link = row.querySelector('a.elm-links__download')?.getAttribute('href');
      console.log(`- Date: "${dateText}" | Link: "${link}"`);
      count++;
    }
    
  } catch (err) {
    console.error('Error fetching page:', err.message);
  }
}

checkJagran();
