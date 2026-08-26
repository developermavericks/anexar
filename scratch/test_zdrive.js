import axios from 'axios';
import fs from 'fs';

async function testZDrive() {
  const url = 'https://zdrive.to/E1x3Apvemyk6';
  try {
    console.log('Fetching:', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    console.log('Status:', response.status);
    console.log('HTML length:', response.data.length);
    fs.writeFileSync('scratch/zdrive_output.html', response.data);
    console.log('Saved output to scratch/zdrive_output.html');
  } catch (error) {
    console.error('Error fetching ZDrive:', error.message);
  }
}

testZDrive();
