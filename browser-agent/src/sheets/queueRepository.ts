import { GoogleSheetsClient } from './googleSheetsClient';

export interface OutreachTask {
  queue_id: string;
  campaign_id: string;
  platform: string;
  handle: string;
  profile_url: string;
  message_variant: string;
  message_text: string;
  send_mode: string;
  status: string;
  idempotency_key: string;
}

export class QueueRepository {
  private client: GoogleSheetsClient;

  constructor() {
    this.client = GoogleSheetsClient.getInstance();
  }

  public async getReadyTasks(platform: string): Promise<OutreachTask[]> {
    const rows = await this.client.getRows('Outreach_Queue');
    if (!rows || rows.length <= 1) return [];

    const headers = rows[0];
    const tasks: OutreachTask[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const task: any = {};
      headers.forEach((header: string, index: number) => {
        task[header] = row[index];
      });

      if (task.status === 'READY' && task.platform === platform) {
        tasks.push(task as OutreachTask);
      }
    }

    return tasks;
  }

  public async updateTaskStatus(queueId: string, status: string, sentAt?: string, error?: string) {
    const rows = await this.client.getRows('Outreach_Queue');
    if (!rows) return;

    const queueIdIndex = rows[0].indexOf('queue_id');
    const statusIndex = rows[0].indexOf('status');
    const sentAtIndex = rows[0].indexOf('sent_at');
    const lastErrorIndex = rows[0].indexOf('last_error');

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][queueIdIndex] === queueId) {
        await this.client.updateCell('Outreach_Queue', `${String.fromCharCode(65 + statusIndex)}${i + 1}`, status);
        if (sentAt && sentAtIndex !== -1) {
          await this.client.updateCell('Outreach_Queue', `${String.fromCharCode(65 + sentAtIndex)}${i + 1}`, sentAt);
        }
        if (error && lastErrorIndex !== -1) {
          await this.client.updateCell('Outreach_Queue', `${String.fromCharCode(65 + lastErrorIndex)}${i + 1}`, error);
        }
        break;
      }
    }
  }
}
