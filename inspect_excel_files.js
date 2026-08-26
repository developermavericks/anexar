import XLSX from 'xlsx';
import path from 'path';

function inspect(fileName) {
  const filePath = path.resolve('author_database_wizikey (2)/author_database_wizikey/skribe_api_scraper/output', fileName);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`\nFile: ${fileName}`);
    console.log(`  - Total Rows: ${data.length}`);
    if (data.length > 0) {
      console.log(`  - Keys: ${Object.keys(data[0]).join(', ')}`);
    }
  } catch (err) {
    console.error(`Failed to inspect ${fileName}:`, err.message);
  }
}

inspect("all_scraped_journalists.xlsx");
inspect("journalists_enriched.xlsx");
inspect("journalists_exported.xlsx");
