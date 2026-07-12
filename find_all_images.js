import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        files = files.concat(walk(filePath));
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext)) {
        files.push(filePath);
      }
    }
  });
  return files;
}

const allImages = walk(process.cwd());
console.log("All images in workspace:", allImages);
