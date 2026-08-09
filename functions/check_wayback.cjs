const axios = require('axios');
const url = 'https://economictimes.indiatimes.com/tech/technology/unacademy-investors-to-get-upgrad-board-seat-as-rs-1955-crore-merger-nears-close/articleshow/132678586.cms';
const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;

async function run() {
    try {
        console.log('Sending request to Wayback API...');
        const res = await axios.get(apiUrl);
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
