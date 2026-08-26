import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output/journalists_enriched.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const row = data.find(r => String(r.Name || '').trim().toLowerCase().includes('akshita nandagopal'));
if (row) {
  console.log("Found Akshita Nandagopal row in Excel:");
  console.log(JSON.stringify(row, null, 2));
} else {
  console.log("Akshita Nandagopal NOT found in Excel.");
}
