import { chromium } from '@playwright/test';
import { checkInstagramLogin } from './src/platforms/instagram/instagramLoginCheck';
import { config } from './src/config';

async function testLoginCheck() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Testing with Instagram Login page...');
  await page.goto('https://www.instagram.com/accounts/login/');
  const isLoggedIn = await checkInstagramLogin(page);
  console.log('Is Logged In?', isLoggedIn);
  
  await browser.close();
}

testLoginCheck();
