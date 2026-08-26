import axios from 'axios';

async function testEndpoint() {
  const url = 'https://us-central1-anexar-9820c.cloudfunctions.net/getEPapersByDate';
  console.log(`Sending GET request to: ${url}`);

  try {
    const res = await axios.get(url);
    console.log('\nResponse HTTP Status:', res.status);
    console.log('Response Payload:\n', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('API Call Failed:', err.message);
    if (err.response) {
      console.error('Response details:', err.response.data);
    }
  }
}

testEndpoint();
