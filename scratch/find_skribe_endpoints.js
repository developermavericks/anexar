import fs from 'fs';
import path from 'path';

async function run() {
  console.log("Fetching profile page HTML...");
  const res = await fetch("https://www.goskribe.com/journalistProfile/246958");
  const html = await res.text();
  
  // Find all JS chunks
  const regex = /\/_(?:next|chunks)\/[^"]+\.js/g;
  let matches = html.match(regex) || [];
  
  // Clean query strings (like ?dpl=...)
  matches = matches.map(m => m.split('?')[0]);
  
  // Remove duplicates
  matches = [...new Set(matches)];
  
  console.log(`Found ${matches.length} JS chunk paths:`, matches);
  
  for (const chunkPath of matches) {
    const url = `https://www.goskribe.com${chunkPath}`;
    console.log(`Downloading ${url}...`);
    try {
      const chunkRes = await fetch(url);
      if (chunkRes.status === 200) {
        const js = await chunkRes.text();
        
        // Search for keywords (like get-, journalists, records, etc.)
        // Let's do a wider search for anything with get- or articles or portfolio or wizikey
        const regexes = [
          /get-[a-zA-Z0-9_-]+/g,
          /portfolio/gi,
          /articles/gi,
          /v1\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g
        ];
        
        let found = [];
        for (const rx of regexes) {
          let m;
          while ((m = rx.exec(js)) !== null) {
            found.push(m[0]);
          }
        }
        
        if (found.length > 0) {
          // Unique and filter
          const uniqueFound = [...new Set(found)];
          if (uniqueFound.length > 0) {
            console.log(`\n>>> FOUND MATCHES IN CHUNK: ${chunkPath}`);
            console.log(uniqueFound);
            
            // Let's also print 100 characters around the match to see the context!
            uniqueFound.slice(0, 10).forEach(keyword => {
              const idx = js.indexOf(keyword);
              if (idx !== -1) {
                console.log(`Context for "${keyword}": ... ${js.substring(Math.max(0, idx - 100), Math.min(js.length, idx + 100))} ...`);
              }
            });
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch chunk ${chunkPath}:`, err);
    }
  }
}

run().catch(console.error);
