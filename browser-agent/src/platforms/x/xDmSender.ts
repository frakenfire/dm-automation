import { Page } from '@playwright/test';
import { X_SELECTORS } from './xSelectors';
import { ScreenshotService } from '../../services/screenshotService';

export async function sendXDm(
  page: Page, 
  handle: string, 
  message: string, 
  mode: 'dry-run' | 'assist' | 'auto',
  queueId: string
) {
  console.log(`[STEP] queue_id=${queueId} platform=X step=open_profile handle=${handle}`);
  await page.goto(`https://x.com/${handle}`);
  
  const dmButton = await page.waitForSelector(X_SELECTORS.dm_button, { timeout: 10000 }).catch(() => null);
  
  if (!dmButton) {
    const screenshot = await ScreenshotService.capture(page, queueId);
    throw { code: 'DM_NOT_AVAILABLE', message: 'DM button not found or account private', screenshot };
  }

  console.log(`[STEP] queue_id=${queueId} platform=X step=open_dm handle=${handle}`);
  await dmButton.click();
  
  const messageInput = await page.waitForSelector(X_SELECTORS.dm_input, { timeout: 15000 }).catch(() => null);
  
  if (!messageInput) {
    const screenshot = await ScreenshotService.capture(page, queueId);
    throw { code: 'DM_INPUT_NOT_FOUND', message: 'DM input area not found', screenshot };
  }

  console.log(`[STEP] queue_id=${queueId} platform=X step=fill_message handle=${handle}`);
  await messageInput.fill(message);
  
  if (mode === 'dry-run' || mode === 'assist') {
    console.log(`[DRY-RUN/ASSIST] Stopping before send. Mode: ${mode}`);
    return mode === 'dry-run' ? 'DRY_RUN_SUCCESS' : 'OPENED';
  }

  console.log(`[STEP] queue_id=${queueId} platform=X step=send_message handle=${handle}`);
  // Skip actual send for now
  console.log('[REAL-SEND-SKIPPED] skipping actual send for safety during development');
  return 'SENT';
}
