import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/data/journalists_extracted.json');
try {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  console.log(`journalists_extracted.json has ${data.length} records.`);
} catch (err) {
  console.error("Error reading JSON:", err.message);
}
