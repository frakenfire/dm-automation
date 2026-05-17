import { Page } from '@playwright/test';
import { INSTAGRAM_SELECTORS } from './instagramSelectors';
import { ScreenshotService } from '../../services/screenshotService';

export async function sendInstagramDm(
  page: Page, 
  handle: string, 
  message: string, 
  mode: 'dry-run' | 'assist' | 'auto',
  queueId: string
) {
  const currentUrl = page.url();
  if (!currentUrl.includes('/direct/')) {
    console.log(`[단계] 인스타그램 프로필에서 DM 버튼을 찾는 중: ${handle}`);
    
    // 팝업 정리 (프로필 이동 직후 - onetap, 알림 등 모든 팝업)
    const popupLabels = [/나중에 하기|Not Now/i, /정보 저장|Save Info/i, /닫기|Close/i];
    for (const label of popupLabels) {
      const btn = page.getByRole('button', { name: label }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(1000);
      }
    }

    // 만약 스토리 창이 열려있다면 (X 버튼) 닫기
    const closeStoryBtn = page.locator('svg[aria-label*="닫기"], svg[aria-label*="Close"]').first();
    if (await closeStoryBtn.isVisible().catch(() => false)) {
      await closeStoryBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // DM 버튼 대기 및 클릭 (텍스트 기반 XPath 사용)
    const dmButton = page.locator(INSTAGRAM_SELECTORS.dm_button).first();
    try {
      console.log(`[단계] '메시지 보내기' 버튼을 찾는 중...`);
      await dmButton.waitFor({ state: 'visible', timeout: 10000 });
      await dmButton.click({ force: true, delay: 500 });
      console.log(`[단계] DM 채팅 팝업을 열었습니다.`);
    } catch (e) {
      const screenshot = await ScreenshotService.capture(page, queueId);
      throw { code: 'DM_BUTTON_CLICK_FAILED', message: '메시지 보내기 버튼을 찾지 못했거나 클릭할 수 없습니다.', screenshot };
    }
  }
  
  // DM 페이지 로딩 대기
  await page.waitForURL(url => url.toString().includes('/direct/'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // 알림 설정 팝업 (자주 나타남)
  const notNowButton = page.getByRole('button', { name: /나중에 하기|Not Now/i }).first();
  if (await notNowButton.isVisible().catch(() => false)) {
    await notNowButton.click().catch(() => {});
    console.log('[정보] 알림 팝업을 닫았습니다.');
    await page.waitForTimeout(1000);
  }

  // 메시지 입력창 찾기 (더 견고한 셀렉터 및 대기)
  const messageInput = page.locator([
    'div[contenteditable="true"][role="textbox"]',
    'div[aria-label*="메시지"]',
    'div[aria-label*="Message"]',
    'textarea[placeholder*="메시지"]'
  ].join(', ')).last();
  
  try {
    await messageInput.waitFor({ state: 'visible', timeout: 15000 });
    await messageInput.click({ force: true });
    await page.waitForTimeout(1000);
    
    console.log(`[단계] 메시지 작성 중: ${handle}`);
    await messageInput.focus();
    await page.keyboard.type(message, { delay: 100 });
    await page.waitForTimeout(1000);
  } catch (e) {
    const screenshot = await ScreenshotService.capture(page, queueId);
    throw { code: 'DM_INPUT_INTERACTION_FAILED', message: 'DM 입력창 상호작용 실패', screenshot };
  }
  
  if (mode === 'dry-run' || mode === 'assist') {
    return mode === 'dry-run' ? 'DRY_RUN_SUCCESS' : 'OPENED';
  }

  console.log(`[단계] 메시지 전송 중: ${handle}`);
  
  // 전송 버튼 클릭 (SVG 기반 및 텍스트 기반 병행)
  const sendButton = page.locator([
    'button:has-text("보내기")',
    'button:has-text("Send")',
    'div[role="button"]:has(svg[aria-label*="보내기"])',
    'div[role="button"]:has(svg[aria-label*="Send"])'
  ].join(', ')).first();

  try {
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();
    console.log('[성공] 전송 버튼 클릭으로 완료');
  } catch (e) {
    console.log('[정보] 전송 버튼 대신 Enter 키로 전송을 시도합니다.');
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(2000); // 전송 확인 대기
  return 'SENT';
}
