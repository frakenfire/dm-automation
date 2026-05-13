const { chromium } = require('playwright');
const path = require('path');

async function debug() {
  const userDataDir = path.resolve(__dirname, '../../user_data');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
  });

  const page = await browser.newPage();
  try {
    console.log('Navigating to Direct Inbox...');
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'debug_inbox.png', fullPage: true });
    console.log('Screenshot saved to debug_inbox.png');
    
    const url = page.url();
    console.log('Current URL:', url);
    
    if (url.includes('login')) {
      console.log('Status: REDIRECTED TO LOGIN');
    } else {
      console.log('Status: LOGGED IN');
    }
  } catch (e) {
    console.error('Error during debug:', e);
  } finally {
    await browser.close();
  }
}

debug();
