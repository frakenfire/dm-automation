import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export class ScreenshotService {
  private static screenshotDir = path.resolve(process.cwd(), 'screenshots');

  public static async capture(page: Page, queueId: string): Promise<string> {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    const filename = `${queueId}_${Date.now()}.png`;
    const filePath = path.join(this.screenshotDir, filename);
    
    await page.screenshot({ path: filePath });
    return filePath;
  }
}
