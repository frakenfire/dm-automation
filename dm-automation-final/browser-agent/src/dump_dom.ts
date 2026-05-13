import { chromium } from '@playwright/test';
import { config } from './config';
import * as fs from 'fs';

async function dumpDom() {
  console.log('[DEBUG] Starting DOM dump...');
  const browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: false,
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.instagram.com/direct/inbox/');
    await page.waitForTimeout(5000);

    // Click New Message
    const newMessageButton = page.locator('div[role="button"]').filter({ has: page.locator('svg[aria-label*="메시지"], svg[aria-label*="Message"]') }).first();
    await newMessageButton.click();
    await page.waitForTimeout(2000);

    // Search
    const searchInput = page.getByRole('textbox', { name: /받는 사람|To/i });
    await searchInput.fill('pcalm_official');
    await page.waitForTimeout(5000);

    // Dump DOM of the dialog
    const dialog = page.locator('div[role="dialog"]');
    const html = await dialog.innerHTML();
    fs.writeFileSync('dom_dump.txt', html);
    console.log('[DEBUG] DOM dump saved to dom_dump.txt');

  } catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
  } finally {
    await browser.close();
  }
}

dumpDom();
