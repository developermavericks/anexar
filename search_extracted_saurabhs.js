import fs from 'fs';
import path from 'path';

const fileContent = fs.readFileSync(path.resolve('src/data/journalists_extracted.json'), 'utf8');
const data = JSON.parse(fileContent);

const matches = data.filter(r => String(r.name || '').trim().toLowerCase().includes('saurabh sinha'));
console.log(`Found ${matches.length} matches for Saurabh Sinha in journalists_extracted.json:`);
matches.forEach((m, i) => {
  console.log(`Match ${i + 1}: Publication = "${m.publication}"`);
});
