import { chromium } from '@playwright/test';
import { config } from '../config';
import { checkInstagramLogin } from '../platforms/instagram/instagramLoginCheck';
import { sendInstagramDm } from '../platforms/instagram/instagramDmSender';
import { QueueRepository } from '../sheets/queueRepository';
import { LogRepository } from '../sheets/logRepository';

async function runAutoInstagram() {
  console.log('[START] module=runAutoInstagram (FULL AUTONOMOUS MODE)');
  
  const browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: false, // Set to true after you are confident
  });
  
  const page = await browser.newPage();
  const queueRepo = new QueueRepository();
  const logRepo = new LogRepository();

  let sentCount = 0;

  try {
    const isLoggedIn = await checkInstagramLogin(page);
    if (!isLoggedIn) {
      console.error('[ERROR] Instagram NOT LOGGED IN. Please login first.');
      return;
    }
    
    while (sentCount < config.instagram.dailyLimit) {
      const tasks = await queueRepo.getReadyTasks('Instagram');
      if (tasks.length === 0) {
        console.log('[INFO] No more READY tasks. Automation finished.');
        break;
      }
      
      const task = tasks[0];
      console.log(`[PROCESS] queue_id=${task.queue_id} handle=${task.handle}`);
      
      try {
        // Direct Inbox Mode navigation (Hardened path)
        await page.goto('https://www.instagram.com/direct/inbox/');
        await page.waitForTimeout(5000);

        // Click "New Message" button
        const newMessageButton = await page.getByRole('button', { name: /새 메시지|New Message|메시지 보내기|Send Message/i }).first();
        if (await newMessageButton.isVisible()) {
          await newMessageButton.click();
          await page.waitForTimeout(3000);
          
          const searchInput = page.getByRole('textbox', { name: /받는 사람|To/i });
          await searchInput.waitFor({ state: 'visible' });
          await searchInput.fill(task.handle);
          await page.waitForTimeout(4000);
          
          console.log(`[STEP] Selecting the first result from the list...`);
          const resultItem = page.locator('div[role="dialog"] div[role="button"], div[role="dialog"] [role="checkbox"]').first();
          
          try {
            await resultItem.waitFor({ state: 'visible', timeout: 10000 });
            await resultItem.click({ timeout: 5000 });
            console.log('[SUCCESS] First result selected.');
          } catch (e) {
            console.log('[INFO] Direct click failed, trying checkbox fallback...');
            await page.getByRole('checkbox').first().click({ timeout: 5000 }).catch(() => null);
          }
          await page.waitForTimeout(2000);
          
          const nextButton = await page.getByRole('button', { name: /다음|Next|채팅|Chat/i });
          if (await nextButton.isVisible()) {
            await nextButton.click();
            await page.waitForTimeout(4000);
          }
        }

        const status = await sendInstagramDm(page, task.handle, task.message_text, 'auto', task.queue_id);
        
        await queueRepo.updateTaskStatus(task.queue_id, status, new Date().toISOString());
        await logRepo.logSend({
          queue_id: task.queue_id,
          campaign_id: task.campaign_id,
          platform: 'Instagram',
          handle: task.handle,
          message_variant: task.message_variant,
          message_hash: '',
          send_mode: 'auto',
          result: status,
          sent_at: new Date().toISOString()
        });
        
        console.log(`[SUCCESS] queue_id=${task.queue_id} status=${status}`);
        sentCount++;
        console.log(`[PROGRESS] Session sent count: ${sentCount}/${config.instagram.dailyLimit}`);
        
        // Random Delay
        const delay = Math.floor(Math.random() * (config.instagram.maxDelay - config.instagram.minDelay + 1)) + config.instagram.minDelay;
        console.log(`[WAIT] Sleeping for ${delay} seconds...`);
        await page.waitForTimeout(delay * 1000);
        
      } catch (error: any) {
        console.error(`[ERROR] Task ${task.queue_id} failed: ${error.message}`);
        await queueRepo.updateTaskStatus(task.queue_id, 'ERROR', undefined, error.message);
        await logRepo.logError({
          module: 'runAutoInstagram',
          queue_id: task.queue_id,
          platform: 'Instagram',
          handle: task.handle,
          error_code: error.code || 'UNKNOWN',
          error_message: error.message,
          retryable: 'yes'
        });
        // Continue to next task
      }
    }
    
  } finally {
    await browser.close();
  }
}

runAutoInstagram();
