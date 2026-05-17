import { chromium, BrowserContext } from '@playwright/test';
import { config } from '../config';
import { checkInstagramLogin, waitForInstagramLogin } from '../platforms/instagram/instagramLoginCheck';
import { sendInstagramDm } from '../platforms/instagram/instagramDmSender';
import { INSTAGRAM_SELECTORS } from '../platforms/instagram/instagramSelectors';

function resolveTargetHandles(): string[] {
  const isTest = process.env.TEST_MODE === 'true';
  const targetHandles = process.env.TARGET_HANDLES;
  const targetHandle = process.env.TARGET_HANDLE;

  if (isTest) {
    return ['pcalm.kr', 'pcalm_official'];
  }
  if (targetHandles) {
    return targetHandles.split(',').map(h => h.trim()).filter(h => h.length > 0);
  }
  if (targetHandle) {
    return targetHandle.split(',').map(h => h.trim()).filter(h => h.length > 0);
  }
  return ['pcalm_official'];
}

async function runAssistInstagram() {
  const targetHandles = resolveTargetHandles();
  const message = process.env.TARGET_MESSAGE || '안녕하세요. P.CALM 시딩 자동화 시스템 실전 테스트 발송입니다.';
  let isHeadless = process.env.HEADLESS === 'true';
  const isTest = process.env.TEST_MODE === 'true';
  const queueIdPrefix = process.env.QUEUE_ID || `DASHBOARD-IG-${Date.now()}`;

  console.log(`[시작] 인스타그램 DM 자동 발송 프로세스 (모드: ${isTest ? '테스트' : '운영'})`);
  console.log(`[대상] 총 ${targetHandles.length}건: ${targetHandles.join(', ')}`);
  
  let browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: isHeadless,
  });

  let page = await browser.newPage();

  const broadcast = async (step: string) => {
    try {
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 50 });
      const base64 = screenshot.toString('base64');
      console.log(`[SCREENSHOT] ${step}|${base64}`);
    } catch (e) {}
  };

  try {
    // 1. 로그인 확인 및 대기
    console.log('[단계] 로그인 상태를 확인 중입니다...');
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' }).catch(() => {});
    await broadcast('Initial Page');
    let isLoggedIn = await checkInstagramLogin(page);
    
    if (!isLoggedIn) {
      console.log('[알림] 인스타그램 로그인이 필요합니다.');
      if (isHeadless) {
        await browser.close();
        isHeadless = false;
        browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
          headless: false,
        });
        page = await browser.newPage();
      }
      
      const loginSuccess = await waitForInstagramLogin(page);
      if (!loginSuccess) {
        console.error('[오류] 로그인이 되지 않아 작업을 종료합니다.');
        return;
      }
    } else {
      console.log('[단계] 초기 팝업 여부를 확인합니다.');
      const buttonsToClick = [/나중에 하기|Not Now/i, /정보 저장|Save Info/i, /닫기|Close/i];
      for (const label of buttonsToClick) {
        const btn = page.getByRole('button', { name: label }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    }

    // 2. 발송 루프
    let successCount = 0;
    let failureCount = 0;

    for (const handle of targetHandles) {
      try {
        console.log(`[단계] ${isTest ? '테스트 ' : ''}DM 발송 시작: @${handle}`);
        
        // 검색 버튼 클릭 (재시도 로직 포함)
        let searchBtn = page.locator(INSTAGRAM_SELECTORS.search_button).first();
        try {
          await searchBtn.waitFor({ state: 'visible', timeout: 10000 });
          await searchBtn.click({ force: true });
        } catch (e) {
          console.log('[정보] 검색 버튼을 찾는 데 실패하여 홈으로 이동 후 재시도합니다.');
          await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
          searchBtn = page.locator(INSTAGRAM_SELECTORS.search_button).first();
          await searchBtn.waitFor({ state: 'visible', timeout: 10000 });
          await searchBtn.click({ force: true });
        }
        
        await page.waitForTimeout(2000);
        await broadcast(`Search Open: @${handle}`);
        
        // 검색어 입력
        const searchInput = page.locator(INSTAGRAM_SELECTORS.search_input);
        await searchInput.fill(handle);
        await page.waitForTimeout(3000);
        await broadcast(`Search Filled: @${handle}`);
        
        // 검색 결과 클릭 (가장 첫 번째 결과를 클릭)
        const firstResult = page.locator('div[role="none"] > a[role="link"], a[role="link"]:has(div) div[role="none"]').first();
        await firstResult.waitFor({ state: 'visible', timeout: 10000 });
        await firstResult.click();
        await page.waitForTimeout(3000);
        await broadcast(`Profile Opened: @${handle}`);

        const queueId = `${queueIdPrefix}-${handle}`;
        // 테스트 모드일 경우 'assist' (타이핑까지만), 운영 모드일 경우 'auto' (실제 전송)
        const result = await sendInstagramDm(page, handle, message, isTest ? 'assist' : 'auto', queueId);
        await broadcast(`DM Action Complete: @${handle}`);
        
        if (result === 'SENT' || result === 'OPENED') {
          successCount++;
          console.log(`[성공] @${handle} 계정에 메시지 전송을 완료했습니다. (모드: ${isTest ? '테스트' : '운영'})`);
        } else {
          failureCount++;
          console.error(`[오류] @${handle} 발송 결과: ${result}`);
        }
        
        // 다음 계정 발송을 위해 상태 초기화 (홈으로 이동)
        console.log(`[단계] 다음 계정 준비를 위해 상태를 초기화합니다...`);
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

      } catch (err: any) {
        failureCount++;
        console.error(`[오류] @${handle} 발송 실패: ${err.message || err}`);
        await page.goto('https://www.instagram.com/').catch(() => {});
      }
    }

    console.log(`[완료] DM 발송 종료 - 성공: ${successCount}건, 실패: ${failureCount}건`);

  } catch (error: any) {
    console.error(`[치명적 오류 발생] ${error.message || error.code || error}`);
  } finally {
    await browser.close();
  }
}

runAssistInstagram();
