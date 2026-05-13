import { google } from 'googleapis';
import { config } from '../config';

export class GoogleSheetsClient {
  private static instance: GoogleSheetsClient;
  private auth: any;
  private sheets: any;

  private constructor() {
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: config.googleCredentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    } catch (e) {
      console.warn('[WARN] Google Sheets credentials not found. Switching to MOCK MODE.');
      this.sheets = null;
    }
  }

  public static getInstance(): GoogleSheetsClient {
    if (!GoogleSheetsClient.instance) {
      GoogleSheetsClient.instance = new GoogleSheetsClient();
    }
    return GoogleSheetsClient.instance;
  }

  public async getRows(sheetName: string, range: string = 'A:Z') {
    if (!this.sheets || !config.googleSheetId) {
      // Return mock data based on sheet name
      if (sheetName === 'Outreach_Queue') {
        return [
          ['queue_id', 'campaign_id', 'platform', 'handle', 'profile_url', 'message_variant', 'message_text', 'send_mode', 'status', 'idempotency_key', 'scheduled_at', 'sent_at', 'last_error'],
          ['IG-TEST-001', 'CAMP-001', 'Instagram', 'pcalm_global_official', 'https://instagram.com/pcalm_global_official', 'A', '안녕하세요. 피캄 제품 협찬 관련하여 DM 드립니다!', 'auto', 'READY', 'KEY-1', '', '', ''],
          ['X-TEST-001', 'CAMP-001', 'X', 'pcalm_official', 'https://x.com/pcalm_official', 'B', 'Hello. This is a test message.', 'dry-run', 'READY', 'KEY-2', '', '', '']
        ];
      }
      return [[]];
    }
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheetId,
      range: `${sheetName}!${range}`,
    });
    return response.data.values;
  }

  public async appendRow(sheetName: string, values: any[]) {
    if (!this.sheets || !config.googleSheetId) {
      console.log(`[MOCK] Appending to ${sheetName}:`, values);
      return;
    }
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  }

  public async updateCell(sheetName: string, range: string, value: any) {
    if (!this.sheets || !config.googleSheetId) {
      console.log(`[MOCK] Updating ${sheetName} ${range}:`, value);
      return;
    }
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });
  }

  public async getSheetMetadata() {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: config.googleSheetId,
    });
    return response.data;
  }

  public async createSheet(title: string) {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.googleSheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title,
              },
            },
          },
        ],
      },
    });
  }

  public async setHeader(sheetName: string, headers: string[]) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });
  }
}
