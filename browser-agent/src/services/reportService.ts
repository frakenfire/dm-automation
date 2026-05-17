import { GoogleSheetsClient } from '../sheets/googleSheetsClient';

export class ReportService {
  private client: GoogleSheetsClient;

  constructor() {
    this.client = GoogleSheetsClient.getInstance();
  }

  public async generatePoCReport() {
    console.log('[INFO] Generating PoC Report...');
    const historyRows = await this.client.getRows('Run_History');
    const logRows = await this.client.getRows('Send_Log');
    const errorRows = await this.client.getRows('Error_Log');

    const totalRuns = historyRows ? historyRows.length - 1 : 0;
    const totalSent = logRows ? logRows.filter((r: string[]) => r.some(c => c === 'SENT' || c === 'DRY_RUN_SUCCESS')).length : 0;
    const totalErrors = errorRows ? errorRows.length - 1 : 0;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRuns,
        totalSent,
        totalErrors,
        successRate: totalRuns > 0 ? (totalSent / (totalSent + totalErrors)) * 100 : 0
      },
      platformBreakdown: {
        Instagram: logRows?.filter((r: string[]) => r.includes('Instagram')).length || 0,
        X: logRows?.filter((r: string[]) => r.includes('X')).length || 0
      }
    };

    console.log('--- PoC RESULT REPORT ---');
    console.log(JSON.stringify(report, null, 2));
    console.log('-------------------------');
    
    return report;
  }
}
