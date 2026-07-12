import fs from 'fs';
import path from 'path';

const dir = 'C:\\Users\\DEll\\.gemini\\antigravity-ide\\brain\\64a8b73e-0561-43e7-93f6-667a5aa5f1d2';
const files = fs.readdirSync(dir)
  .map(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    return { name: file, mtime: stat.mtime, size: stat.size };
  })
  .sort((a, b) => b.mtime - a.mtime);

console.log("Files sorted by date descending:", files.slice(0, 10));
