import { GoogleSheetsClient } from '../sheets/googleSheetsClient';
import { SHEET_SCHEMA } from '../sheets/schema';

async function setupSheet() {
  const client = GoogleSheetsClient.getInstance();
  
  try {
    const metadata = await client.getSheetMetadata();
    const existingSheets = metadata.sheets?.map((s: any) => s.properties.title) || [];
    
    for (const [sheetName, headers] of Object.entries(SHEET_SCHEMA)) {
      if (!existingSheets.includes(sheetName)) {
        console.log(`Creating sheet: ${sheetName}`);
        await client.createSheet(sheetName);
      } else {
        console.log(`Sheet already exists: ${sheetName}`);
      }
      
      if (headers.length > 0) {
        console.log(`Setting headers for ${sheetName}`);
        await client.setHeader(sheetName, headers);
      }
    }
    
    console.log('Sheet setup completed successfully.');
  } catch (error: any) {
    console.error('Error during sheet setup:', error.message);
    if (error.message.includes('Spreadsheet ID not found')) {
      console.error('Please check your GOOGLE_SHEET_ID in .env file.');
    } else if (error.message.includes('credentials')) {
      console.error('Please check your GOOGLE_APPLICATION_CREDENTIALS in .env file.');
    }
  }
}

setupSheet();
