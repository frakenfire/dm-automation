import { chromium } from '@playwright/test';
import { config } from '../config';
import { checkInstagramLogin } from '../platforms/instagram/instagramLoginCheck';
import { sendInstagramDm } from '../platforms/instagram/instagramDmSender';

async function testSendInstagram() {
  console.log('[START] module=testSendInstagram TARGET=@pcalm_official');
  
  const browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: false,
  });
  
  const page = await browser.newPage();
  
  try {
    const isLoggedIn = await checkInstagramLogin(page);
    if (!isLoggedIn) {
      console.error('[ERROR] Instagram NOT LOGGED IN. Please run login script first.');
      return;
    }
    
    const targetHandle = 'pcalm_official';
    const message = '안녕하세요. P.CALM 시딩 자동화 시스템 실전 테스트 발송입니다. (Direct Inbox Mode)';
    
    console.log(`[STEP] Navigating to direct inbox...`);
    await page.goto('https://www.instagram.com/direct/inbox/');
    await page.waitForTimeout(5000);

    // Click "New Message" button or central "Send Message" button
    let newMessageButton = await page.getByRole('button', { name: /새 메시지|New Message|메시지 보내기|Send Message/i }).first();
    if (await newMessageButton.isVisible()) {
      await newMessageButton.click();
      await page.waitForTimeout(3000);
      
      // Search for handle
      console.log(`[STEP] Searching for handle: ${targetHandle}`);
      const searchInput = page.locator('input[name="query"], input[placeholder*="검색"], input[placeholder*="Search"]');
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(targetHandle);
      await page.waitForTimeout(4000);
      
      // Select the target from search results - More robust selection
      console.log(`[STEP] Selecting target from results...`);
      const resultItem = page.locator('div[role="dialog"] div[role="button"], div[role="dialog"] span').filter({ hasText: targetHandle }).first();
      await resultItem.click();
      await page.waitForTimeout(2000);
      
      // Click "Next" or "Chat" button
      const nextButton = await page.getByRole('button', { name: /다음|Next|채팅|Chat/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(4000);
      }
    }
    
    const result = await sendInstagramDm(page, targetHandle, message, 'auto', 'TEST-SEND-002');
    console.log(`[FINISH] Result: ${result}`);
    
  } catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
  } finally {
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

testSendInstagram();
