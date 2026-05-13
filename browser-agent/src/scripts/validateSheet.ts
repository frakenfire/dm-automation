import { GoogleSheetsClient } from '../sheets/googleSheetsClient';
import { SHEET_SCHEMA } from '../sheets/schema';

async function validateSheet() {
  const client = GoogleSheetsClient.getInstance();
  
  try {
    const metadata = await client.getSheetMetadata();
    const existingSheets = metadata.sheets?.map((s: any) => s.properties.title) || [];
    
    let isValid = true;
    
    for (const [sheetName, expectedHeaders] of Object.entries(SHEET_SCHEMA)) {
      if (!existingSheets.includes(sheetName)) {
        console.error(`Missing sheet: ${sheetName}`);
        isValid = false;
        continue;
      }
      
      if (expectedHeaders.length > 0) {
        const rows = await client.getRows(sheetName, '1:1');
        const actualHeaders = rows?.[0] || [];
        
        const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
        if (missingHeaders.length > 0) {
          console.error(`Missing headers in ${sheetName}: ${missingHeaders.join(', ')}`);
          isValid = false;
        }
      }
    }
    
    if (isValid) {
      console.log('Sheet validation successful.');
    } else {
      console.error('Sheet validation failed. Please run setupSheet script.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Error during sheet validation:', error.message);
    process.exit(1);
  }
}

validateSheet();
