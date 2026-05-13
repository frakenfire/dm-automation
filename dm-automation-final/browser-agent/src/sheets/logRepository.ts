import { GoogleSheetsClient } from './googleSheetsClient';

export class LogRepository {
  private client: GoogleSheetsClient;

  constructor() {
    this.client = GoogleSheetsClient.getInstance();
  }

  public async logSend(data: {
    queue_id: string;
    campaign_id: string;
    platform: string;
    handle: string;
    message_variant: string;
    message_hash: string;
    send_mode: string;
    result: string;
    error_code?: string;
    screenshot_path?: string;
    sent_at: string;
  }) {
    const values = [
      new Date().toISOString(),
      data.queue_id,
      data.campaign_id,
      data.platform,
      data.handle,
      data.message_variant,
      data.message_hash,
      data.send_mode,
      data.result,
      data.error_code || '',
      data.screenshot_path || '',
      data.sent_at
    ];
    await this.client.appendRow('Send_Log', values);
  }

  public async logError(data: {
    module: string;
    queue_id?: string;
    platform?: string;
    handle?: string;
    error_code: string;
    error_message: string;
    screenshot_path?: string;
    retryable: string;
  }) {
    const values = [
      new Date().toISOString(),
      data.module,
      data.queue_id || '',
      data.platform || '',
      data.handle || '',
      data.error_code,
      data.error_message,
      data.screenshot_path || '',
      data.retryable
    ];
    await this.client.appendRow('Error_Log', values);
  }

  public async logHistory(data: {
    module: string;
    started_at: string;
    ended_at: string;
    target_count: number;
    success_count: number;
    fail_count: number;
    skipped_count: number;
    result: string;
  }) {
    const values = [
      `RUN-${Date.now()}`,
      data.module,
      data.started_at,
      data.ended_at,
      data.target_count,
      data.success_count,
      data.fail_count,
      data.skipped_count,
      data.result
    ];
    await this.client.appendRow('Run_History', values);
  }
}
