import { chromium } from '@playwright/test';
import { config } from '../config';
import { checkInstagramLogin } from '../platforms/instagram/instagramLoginCheck';
import { sendInstagramDm } from '../platforms/instagram/instagramDmSender';

async function runAssistInstagram() {
  // Dashboard runner: auto RPA mode.
  // The file name is kept for package/script compatibility, but this runner sends automatically.
  const targetHandle = process.env.TARGET_HANDLE || 'pcalm_official';
  const targetDisplayName = process.env.TARGET_DISPLAY_NAME || targetHandle;
  const message = process.env.TARGET_MESSAGE || '안녕하세요. P.CALM 글로벌 공식 계정 시딩 자동화 테스트입니다.';
  const isHeadless = process.env.HEADLESS === 'true';
  const queueId = process.env.QUEUE_ID || `DASHBOARD-IG-${Date.now()}`;

  console.log(`[시작] 인스타그램 AUTO RPA 발송 - 대상: @${targetHandle} (${targetDisplayName})`);

  const browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: isHeadless,
  });

  const page = await browser.newPage();

  try {
    const isLoggedIn = await checkInstagramLogin(page);
    if (!isLoggedIn) {
      console.error('[오류] 인스타그램에 로그인되어 있지 않습니다. 먼저 로그인을 해주세요.');
      return;
    }

    console.log(`[단계 1] @${targetHandle} 프로필로 이동합니다.`);
    await page.goto(`https://www.instagram.com/${targetHandle}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const popups = [/나중에 하기|Not Now/i, /닫기|Close/i, /동의하지 않음|Decline/i];
    for (const popup of popups) {
      const btn = page.getByRole('button', { name: popup }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log(`[단계 2] @${targetHandle} 계정에 AUTO RPA로 메시지를 발송합니다.`);
    const result = await sendInstagramDm(page, targetHandle, message, 'auto', queueId);

    if (result === 'SENT') {
      console.log(`[성공] @${targetHandle} 계정에 메시지 전송을 완료했습니다.`);
      console.log('[확인] 화면에서 전송 결과를 확인하신 후, 브라우저 창을 직접 닫아주세요.');

      await new Promise(resolve => {
        page.on('close', resolve);
      });
    }

  } catch (error: any) {
    console.error(`[오류 발생] ${error.message || error.code || error}`);
  } finally {
    await browser.close();
  }
}

runAssistInstagram();
