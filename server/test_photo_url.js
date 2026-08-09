async function testUrl() {
  const url1 = 'https://storage.googleapis.com/skribe-media-prod/JournoImage/j_20250228144947.png';
  const url2 = 'https://storage.googleapis.com/skribe-media-prod/JournoImage/836924a1-f17b-4ec0-ba8b-e24f56adf784RAMAVARMAN_400x400.jpg';
  
  for (const url of [url1, url2]) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`URL: ${url} -> Status: ${res.status}`);
    } catch (err) {
      console.log(`URL: ${url} -> Failed: ${err.message}`);
    }
  }
}

testUrl();
