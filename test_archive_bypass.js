import axios from 'axios';

async function testArchive() {
  const targetUrl = 'https://www.thetimes.com/world/asia/article/india-google-data-centre-protest-andhra-pradesh-td5vkzh0s';
  
  // Try archive.is / archive.today endpoints
  const gateways = [
    'https://archive.is/newest/',
    'https://archive.ph/newest/',
    'https://archive.today/newest/'
  ];
  
  console.log("Probing Archive gateways for target URL...");
  
  for (const gateway of gateways) {
    const url = `${gateway}${targetUrl}`;
    console.log(`\nFetching from: ${url}`);
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 15000,
        maxRedirects: 5
      });
      console.log(`Status: ${res.status}`);
      console.log(`Redirected URL: ${res.request.res.responseUrl || url}`);
      const html = res.data;
      console.log(`HTML Length: ${html.length}`);
      
      const hasFullText = html.includes('Sandhama Chandala') || html.includes('mango and cashew trees');
      console.log(`Contains full text: ${hasFullText}`);
      
      if (hasFullText) {
        console.log("SUCCESS! Found full text. Saving sample output...");
        break;
      }
    } catch (err) {
      console.error(`Gateway failed: ${err.message}`);
    }
  }
}

testArchive();
