async function testRecommend() {
  const url = 'https://us-central1-anexar-9820c.cloudfunctions.net/recommend';
  const body = {
    type: 'journalists',
    query: 'technology and startups'
  };
  
  try {
    console.log(`Calling live recommendations endpoint: ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testRecommend();
