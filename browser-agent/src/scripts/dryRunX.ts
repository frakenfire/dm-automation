import { chromium } from '@playwright/test';
import { config } from '../config';
import { checkXLogin } from '../platforms/x/xLoginCheck';
import { sendXDm } from '../platforms/x/xDmSender';
import { QueueRepository } from '../sheets/queueRepository';

async function dryRunX() {
  console.log('[START] module=dryRunX');
  
  const browser = await chromium.launchPersistentContext(config.x.userDataDir, {
    headless: false,
  });
  
  const page = await browser.newPage();
  
  try {
    const isLoggedIn = await checkXLogin(page);
    if (!isLoggedIn) {
      console.error('[ERROR] platform=X status=LOGIN_REQUIRED message="Please login manually first"');
      return;
    }
    
    const queueRepo = new QueueRepository();
    const tasks = await queueRepo.getReadyTasks('X');
    
    if (tasks.length === 0) {
      console.log('[SKIP] No READY tasks for X in queue');
      // Create a dummy task for demonstration
      const dummyTask = {
        queue_id: 'DRY-X-001',
        handle: 'pcalm_official', 
        message_text: 'Hello. This is a P.CALM seeding test message. (Dry-run)',
        platform: 'X'
      };
      
      console.log('[INFO] Running with dummy task for dry-run demonstration');
      await sendXDm(page, dummyTask.handle, dummyTask.message_text, 'dry-run', dummyTask.queue_id);
    } else {
      const task = tasks[0];
      await sendXDm(page, task.handle, task.message_text, 'dry-run', task.queue_id);
      await queueRepo.updateTaskStatus(task.queue_id, 'OPENED');
    }
    
    console.log('[SUCCESS] platform=X status=DRY_RUN_COMPLETED');
  } catch (error: any) {
    console.error(`[ERROR] platform=X error_code=${error.code || 'UNKNOWN'} message="${error.message}"`);
  } finally {
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

dryRunX();
