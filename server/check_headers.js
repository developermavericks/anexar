import axios from 'axios';

const url = 'https://firebasestorage.googleapis.com/v0/b/anexar-9820c.firebasestorage.app/o/epapers%2F2026-08-23_The_Hindu.pdf?alt=media&token=4411b23c-59c1-4616-bc23-77e1b981cdd5';

async function checkHeaders() {
  try {
    console.log('Sending HEAD request to:', url);
    const res = await axios.head(url);
    console.log('Status:', res.status);
    console.log('Headers:');
    console.log(JSON.stringify(res.headers, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkHeaders();
