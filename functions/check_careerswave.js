const axios = require('axios');
const { JSDOM } = require('jsdom');

const CAREERSWAVE_PAPERS = [
  { name: 'Dainik Bhaskar', url: 'https://www.careerswave.in/dainik-bhaskar-epaper-pdf-free-download/' },
  { name: 'Dainik Jagran', url: 'https://www.careerswave.in/dainik-jagran-epaper-pdf-free-download/' },
  { name: 'Amar Ujala', url: 'https://www.careerswave.in/amar-ujala-epaper-pdf-free-download/' },
  { name: 'Hindustan', url: 'https://www.careerswave.in/hindustan-epaper-pdf-free-download/' },
  { name: 'Jansatta', url: 'https://www.careerswave.in/jansatta-epaper-pdf-free-download/' },
  { name: 'Navbharat Times', url: 'https://www.careerswave.in/navbharat-times-epaper-pdf-free-download/' },
  { name: 'Hindustan Times', url: 'https://www.careerswave.in/hindustan-times-epaper-pdf-free-download/' },
  { name: 'Dainik Navajyoti', url: 'https://www.careerswave.in/dainik-navajyoti-epaper-pdf-free-download/' },
  { name: 'Punjab Kesari', url: 'https://www.careerswave.in/punjab-kesari-epaper-pdf-free-download/' },
  { name: 'Rashtriya Sahara', url: 'https://www.careerswave.in/rashtriya-sahara-epaper-pdf-free-download/' },
  { name: 'Prabhat Khabar', url: 'https://www.careerswave.in/prabhat-khabar-epaper-pdf-free-download/' },
  { name: 'The Hindu', url: 'https://www.careerswave.in/the-hindu-epaper-pdf-download-for-upsc/' },
  { name: 'Business Line', url: 'https://www.careerswave.in/business-line-epaper-pdf-free-download/' },
  { name: 'The Economic Times', url: 'https://www.careerswave.in/economic-times-epaper-pdf-free-download/' },
  { name: 'Times of India', url: 'https://www.careerswave.in/times-of-india-epaper-pdf-free-download/' },
  { name: 'Business Standard', url: 'https://www.careerswave.in/business-standard-newspaper-in-pdf/' },
  { name: 'Livemint', url: 'https://www.careerswave.in/mint-epaper-pdf-free-download/' },
  { name: 'Financial Express', url: 'https://www.careerswave.in/the-financial-express-epaper-pdf-free-download/' }
];

async function checkAll() {
  console.log("Checking all CareersWave papers for 26 August 2026...");
  const target = "26 August 2026";
  
  for (const paper of CAREERSWAVE_PAPERS) {
    try {
      const res = await axios.get(paper.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const dom = new JSDOM(res.data);
      const rows = dom.window.document.querySelectorAll('.elm-links__row');
      let found = false;
      let latestDate = "None";
      for (const row of rows) {
        const dateText = row.querySelector('.elm-links__date')?.textContent.trim();
        if (dateText) {
          if (latestDate === "None") latestDate = dateText;
          if (dateText.toLowerCase().includes(target.toLowerCase())) {
            found = true;
            break;
          }
        }
      }
      if (found) {
        console.log(`[READY] ${paper.name}: Today's link is available!`);
      } else {
        console.log(`[WAIT] ${paper.name}: Latest available is "${latestDate.replace(':', '')}"`);
      }
    } catch (e) {
      console.log(`[ERROR] Failed to fetch ${paper.name}: ${e.message}`);
    }
  }
}

checkAll();
