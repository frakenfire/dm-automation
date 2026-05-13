import { Page } from '@playwright/test';
import { INSTAGRAM_SELECTORS } from './instagramSelectors';

export async function checkInstagramLogin(page: Page): Promise<boolean> {
  await page.goto('https://www.instagram.com/');
  const loginForm = await page.$(INSTAGRAM_SELECTORS.login_form);
  return !loginForm;
}
