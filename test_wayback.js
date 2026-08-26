async function testWayback() {
  const targetUrl = 'https://www.thetimes.com/world/asia/article/india-google-data-centre-protest-andhra-pradesh-td5vkzh0s';
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;
  console.log("Checking Wayback Machine for target URL...");
  try {
    const res = await fetch(api, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const text = await res.text();
    console.log("Wayback API response length:", text.length);
    console.log("Raw response (first 500 chars):", text.slice(0, 500));
    const json = JSON.parse(text);
    console.log("Wayback API JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error checking Wayback:", err.message);
  }
}

testWayback();
