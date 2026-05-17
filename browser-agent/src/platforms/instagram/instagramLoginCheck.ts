import { Page } from '@playwright/test';
import { INSTAGRAM_SELECTORS } from './instagramSelectors';

export async function checkInstagramLogin(page: Page): Promise<boolean> {
  console.log('[정보] 인스타그램 접속 및 로그인 상태 확인 중...');
  
  const currentUrl = page.url();
  
  // 1. URL 기반 즉시 판별
  if (currentUrl.includes('/accounts/login')) {
    console.log('[정보] 로그인 페이지가 감지되었습니다.');
    return false;
  }
  
  if (currentUrl.includes('/accounts/onetap')) {
    console.log('[정보] 로그인 정보 저장 페이지(onetap)가 감지되었습니다. 로그인 성공으로 간주합니다.');
    return true;
  }

  // 2. 인스타그램 도메인에 없으면 홈으로 이동
  if (!currentUrl.includes('instagram.com')) {
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' }).catch(() => {});
  }

  // 3. 로그인 필드(username)가 보이면 즉시 로그아웃 판단
  const isLoginPage = await page.$(INSTAGRAM_SELECTORS.login_username_field);
  if (isLoginPage) {
    console.log('[정보] 로그아웃 상태(로그인 폼 감지)입니다.');
    return false;
  }

  // 4. 긍정적 로그인 지표(Home icon 등) 대기
  try {
    // 5초 동안 로그인 완료 상태를 나타내는 요소가 나타나는지 확인
    await page.waitForSelector(INSTAGRAM_SELECTORS.logged_in_indicator, { timeout: 5000 });
    console.log('[정보] 로그인 상태가 확인되었습니다.');
    return true;
  } catch (e) {
    // 5. 아무것도 안 보이면 보수적으로 로그아웃으로 간주
    console.log('[경고] 로그인 상태를 확신할 수 없어 로그아웃으로 간주합니다.');
    return false;
  }
}

export async function waitForInstagramLogin(page: Page, timeoutMs: number = 10 * 60 * 1000): Promise<boolean> {
  console.log('[단계] 인스타그램 로그인 대기 중...');
  
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    // 매 루프마다 현재 페이지 상태 확인
    const usernameField = await page.$(INSTAGRAM_SELECTORS.login_username_field);
    const loggedInIcon = await page.$(INSTAGRAM_SELECTORS.logged_in_indicator);
    const currentUrl = page.url();

    if (loggedInIcon && !currentUrl.includes('/accounts/login')) {
      console.log('[성공] 로그인이 감지되었습니다.');
      
      // 로그인 직후 초기 팝업 정리
      await page.waitForTimeout(3000);
      const buttonsToClick = [/나중에 하기|Not Now/i, /정보 저장|Save Info/i, /닫기|Close/i];
      for (const label of buttonsToClick) {
        const btn = page.getByRole('button', { name: label }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
      return true;
    }

    if (Date.now() - startTime < 10000 && !usernameField && !loggedInIcon) {
        // 초반 10초 동안은 메시지를 중복 출력하지 않음
    } else if (usernameField || currentUrl.includes('/accounts/login')) {
        // 아직 로그인 폼이 있으면 대기 메시지 유지
    }

    await page.waitForTimeout(3000);
  }

  console.error('[오류] 로그인 대기 시간이 초과되었습니다.');
  return false;
}
