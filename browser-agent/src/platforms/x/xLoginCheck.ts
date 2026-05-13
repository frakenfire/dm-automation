import { Page } from '@playwright/test';
import { X_SELECTORS } from './xSelectors';

export async function checkXLogin(page: Page): Promise<boolean> {
  await page.goto('https://x.com/home');
  const loginButton = await page.$(X_SELECTORS.login_button);
  return !loginButton;
}
