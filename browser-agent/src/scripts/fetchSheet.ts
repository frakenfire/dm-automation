import { GoogleSheetsClient } from '../sheets/googleSheetsClient';

async function fetchSheet() {
  try {
    const client = GoogleSheetsClient.getInstance();
    const rows = await client.getRows('Outreach_Queue');
    if (!rows || rows.length === 0) {
      console.log(JSON.stringify([]));
      return;
    }

    // Convert raw rows to object format
    const headers = rows[0];
    const dataList = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const item: any = {};
      headers.forEach((header: string, index: number) => {
        item[header] = row[index] || '';
      });
      dataList.push(item);
    }

    console.log(JSON.stringify(dataList));
  } catch (error: any) {
    console.error(`[ERROR] Sheet fetch failed: ${error.message}`);
    process.exit(1);
  }
}

fetchSheet();
