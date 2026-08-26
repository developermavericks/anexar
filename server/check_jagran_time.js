import axios from 'axios';

async function checkJagranTime() {
  const url = 'https://www.careerswave.in/dainik-jagran-epaper-pdf-free-download/';
  console.log('Fetching Dainik Jagran last-modified metadata...');
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = res.data;
    
    // Find modified_time meta tag
    const modifiedMatch = html.match(/property="article:modified_time" content="([^"]+)"/);
    const updatedMatch = html.match(/property="og:updated_time" content="([^"]+)"/);
    
    console.log('\nResults:');
    if (modifiedMatch) {
      console.log(`- Article Modified Time: ${modifiedMatch[1]}`);
    } else {
      console.log('- Article Modified Time: Not found');
    }
    
    if (updatedMatch) {
      console.log(`- OG Updated Time: ${updatedMatch[1]}`);
    } else {
      console.log('- OG Updated Time: Not found');
    }
    
  } catch (err) {
    console.error('Error fetching page:', err.message);
  }
}

checkJagranTime();
