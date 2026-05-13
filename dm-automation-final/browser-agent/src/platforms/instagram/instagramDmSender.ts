import { Page } from '@playwright/test';
import { INSTAGRAM_SELECTORS } from './instagramSelectors';
import { ScreenshotService } from '../../services/screenshotService';

export async function sendInstagramDm(
  page: Page, 
  handle: string, 
  message: string, 
  mode: 'dry-run' | 'assist' | 'auto',
  queueId: string
) {
  const currentUrl = page.url();
  if (!currentUrl.includes('/direct/')) {
    console.log(`[단계] 인스타그램 프로필 여는 중: ${handle}`);
    await page.goto(`https://www.instagram.com/${handle}/`);
    
    // Check if DM button exists
    const dmButton = await page.waitForSelector(INSTAGRAM_SELECTORS.dm_button, { timeout: 10000 }).catch(() => null);
    
    if (!dmButton) {
      const screenshot = await ScreenshotService.capture(page, queueId);
      throw { code: 'DM_NOT_AVAILABLE', message: 'DM button not found', screenshot };
    }

    console.log(`[단계] DM 창 여는 중: ${handle}`);
    await dmButton.click();
  } else {
    console.log(`[정보] 이미 DM 보관함에 있습니다. 메시지 입력을 준비합니다.`);
  }
  
  // Handle "Turn on Notifications" popup if it appears
  const notNowButton = await page.getByRole('button', { name: /나중에 하기|Not Now/i }).first();
  if (await notNowButton.isVisible()) {
    await notNowButton.click();
    console.log('[정보] 알림 팝업을 닫았습니다.');
  }

  // Robust selector for message input (handles both full page and popup)
  const messageInput = page.locator([
    'div[contenteditable="true"]',
    'div[role="textbox"][aria-label*="메시지"]',
    'div[role="textbox"][aria-label*="Message"]',
    'textarea[placeholder*="메시지"]',
    'textarea[placeholder*="Message"]'
  ].join(', ')).last();
  
  try {
    console.log('[INFO] Waiting for DM input area...');
    await messageInput.waitFor({ state: 'visible', timeout: 15000 });
    console.log('[정보] DM 입력창을 찾았습니다.');
    
    // Ensure the input is clickable and in view
    await messageInput.scrollIntoViewIfNeeded();
    await messageInput.click({ force: true });
    await page.waitForTimeout(1000); // Small pause for stability
    
    console.log(`[단계] 메시지 작성 중: ${handle}`);
    await messageInput.focus();
    await page.keyboard.type(message, { delay: 100 }); // Slower typing for realism
  } catch (e) {
    const screenshot = await ScreenshotService.capture(page, queueId);
    throw { code: 'DM_INPUT_INTERACTION_FAILED', message: 'Failed to interact with DM input', screenshot };
  }
  
  if (mode === 'dry-run' || mode === 'assist') {
    console.log(`[건너뜀] 테스트/준자동 모드이므로 전송 전 중단합니다. 모드: ${mode}`);
    return mode === 'dry-run' ? 'DRY_RUN_SUCCESS' : 'OPENED';
  }

  console.log(`[단계] 메시지 전송 중: ${handle}`);
  
  // Try to click send button, fallback to Enter key
  const sendButton = page.locator('div[role="button"]').filter({ has: page.locator('svg[aria-label*="보내기"], svg[aria-label*="Send"]') }).first();
  try {
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click({ timeout: 5000 });
    console.log('[성공] 전송 버튼 클릭으로 메시지를 보냈습니다.');
  } catch (e) {
    console.log('[정보] 전송 버튼을 찾지 못해 Enter 키로 전송을 시도합니다.');
    await page.keyboard.press('Enter');
    console.log('[성공] Enter 키로 메시지를 보냈습니다.');
  }
  return 'SENT';
}
