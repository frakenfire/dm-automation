import { chromium } from '@playwright/test';
import { config } from '../config';

async function openLogins() {
  console.log('[INFO] Opening login windows...');
  
  const igContext = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: false,
    viewport: { width: 1000, height: 800 }
  });
  const igPage = await igContext.newPage();
  await igPage.goto('https://www.instagram.com/accounts/login/');
  console.log('[READY] Instagram login window opened.');

  const xContext = await chromium.launchPersistentContext(config.x.userDataDir, {
    headless: false,
    viewport: { width: 1000, height: 800 }
  });
  const xPage = await xContext.newPage();
  await xPage.goto('https://x.com/i/flow/login');
  console.log('[READY] X login window opened.');

  console.log('[WAIT] Please login in both windows. Close them when done.');
}

openLogins();
