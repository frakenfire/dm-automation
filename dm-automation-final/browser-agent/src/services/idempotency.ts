import { GoogleSheetsClient } from '../sheets/googleSheetsClient';

export class IdempotencyService {
  private client: GoogleSheetsClient;

  constructor() {
    this.client = GoogleSheetsClient.getInstance();
  }

  public async isDuplicate(key: string): Promise<boolean> {
    const rows = await this.client.getRows('Send_Log');
    if (!rows || rows.length <= 1) return false;

    const keyIndex = rows[0].indexOf('idempotency_key'); // Assuming we added this column or checking message_hash
    const hashIndex = rows[0].indexOf('message_hash');

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][keyIndex] === key || rows[i][hashIndex] === key) {
        return true;
      }
    }
    return false;
  }
}
