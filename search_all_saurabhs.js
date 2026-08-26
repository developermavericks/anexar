import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/journalists_enriched.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const rows = data.filter(r => String(r.Name || '').trim().toLowerCase().includes('saurabh sinha'));
console.log(`Found ${rows.length} rows for Saurabh Sinha:`);
rows.forEach((row, i) => {
  console.log(`Row ${i + 1}: Publication = "${row.Publication}", Scrape_Status = "${row.Scrape_Status}", Email = "${row.Email}"`);
});
