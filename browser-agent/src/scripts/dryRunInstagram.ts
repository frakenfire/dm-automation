import { chromium } from '@playwright/test';
import { config } from '../config';
import { checkInstagramLogin } from '../platforms/instagram/instagramLoginCheck';
import { sendInstagramDm } from '../platforms/instagram/instagramDmSender';
import { QueueRepository } from '../sheets/queueRepository';

async function dryRunInstagram() {
  console.log('[START] module=dryRunInstagram');
  
  const browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: false,
  });
  
  const page = await browser.newPage();
  
  try {
    const isLoggedIn = await checkInstagramLogin(page);
    if (!isLoggedIn) {
      console.error('[ERROR] platform=Instagram status=LOGIN_REQUIRED message="Please login manually first"');
      return;
    }
    
    const queueRepo = new QueueRepository();
    const tasks = await queueRepo.getReadyTasks('Instagram');
    
    if (tasks.length === 0) {
      console.log('[SKIP] No READY tasks for Instagram in queue');
      // Create a dummy task for demonstration if queue is empty
      const dummyTask = {
        queue_id: 'DRY-IG-001',
        handle: 'pcalm_official', // Using official account as safe target for dry-run
        message_text: '안녕하세요. P.CALM 시딩 테스트 메시지입니다. (Dry-run)',
        platform: 'Instagram'
      };
      
      console.log('[INFO] Running with dummy task for dry-run demonstration');
      await sendInstagramDm(page, dummyTask.handle, dummyTask.message_text, 'dry-run', dummyTask.queue_id);
    } else {
      const task = tasks[0];
      await sendInstagramDm(page, task.handle, task.message_text, 'dry-run', task.queue_id);
      await queueRepo.updateTaskStatus(task.queue_id, 'OPENED');
    }
    
    console.log('[SUCCESS] platform=Instagram status=DRY_RUN_COMPLETED');
  } catch (error: any) {
    console.error(`[ERROR] platform=Instagram error_code=${error.code || 'UNKNOWN'} message="${error.message}"`);
  } finally {
    // Keep browser open for a few seconds to let user see
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

dryRunInstagram();
