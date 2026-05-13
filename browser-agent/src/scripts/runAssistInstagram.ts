import { chromium } from '@playwright/test';
import { config } from '../config';
import { checkInstagramLogin } from '../platforms/instagram/instagramLoginCheck';
import { sendInstagramDm } from '../platforms/instagram/instagramDmSender';

async function runAssistInstagram() {
  const targetDisplayName = 'P.CALM Global Official';
  const targetHandle = 'pcalm_official';
  const message = '안녕하세요. P.CALM 글로벌 공식 계정 시딩 자동화 테스트입니다.';

  console.log(`[시작] 인스타그램 시딩 자동화 - 대상: ${targetDisplayName}`);
  
  const browser = await chromium.launchPersistentContext(config.instagram.userDataDir, {
    headless: false,
  });
  
  const page = await browser.newPage();
  
  try {
    const isLoggedIn = await checkInstagramLogin(page);
    if (!isLoggedIn) {
      console.error('[오류] 인스타그램에 로그인되어 있지 않습니다. 먼저 로그인을 해주세요.');
      return;
    }
    
    console.log(`[단계 1] ${targetDisplayName} 계정으로 이동하기 위해 DM 보관함 접속 중...`);
    await page.goto('https://www.instagram.com/direct/inbox/');
    await page.waitForTimeout(5000);

    // 팝업 처리 로직
    const popups = [/나중에 하기|Not Now/i, /닫기|Close/i, /동의하지 않음|Decline/i];
    for (const popup of popups) {
      const btn = page.getByRole('button', { name: popup }).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log(`[단계 2] 새 메시지 창을 열고 ${targetDisplayName} 계정을 검색합니다...`);
    let newMessageButton = page.locator('div[role="button"]').filter({ has: page.locator('svg[aria-label*="메시지"], svg[aria-label*="Message"]') }).first();
    if (!(await newMessageButton.isVisible())) {
      newMessageButton = page.getByRole('button', { name: /새 메시지|New Message|메시지 보내기|Send Message/i }).first();
    }

    if (await newMessageButton.isVisible()) {
      await newMessageButton.click();
      await page.waitForTimeout(2000);
      
      const searchInput = page.getByRole('textbox', { name: /받는 사람|To/i });
      await searchInput.waitFor({ state: 'visible', timeout: 10000 });
      await searchInput.fill(targetHandle);
      await page.waitForTimeout(3000); 
      
      console.log(`[단계 3] 검색 결과에서 ${targetDisplayName}의 동그란 선택 버튼을 클릭합니다...`);
      // 표시 이름(Display Name)을 기준으로 정확한 행을 찾습니다.
      const targetOption = page.locator('div[role="option"]').filter({ hasText: targetDisplayName }).first();
      await targetOption.waitFor({ state: 'visible', timeout: 15000 });

      // 해당 행 안의 체크박스를 정확히 타겟팅합니다.
      const roundButton = targetOption.locator('input[name="IGDRecipientContactSearchResultCheckbox"]');
      await roundButton.click({ force: true });
      await page.waitForTimeout(1500); 
      
      console.log(`[단계 4] ${targetDisplayName}와(과)의 채팅을 시작합니다...`);
      const chatButton = page.getByRole('button', { name: /다음|Next|채팅|Chat/i });
      if (await chatButton.isEnabled()) {
        await chatButton.click({ timeout: 10000 });
        await page.waitForTimeout(3000);
      } else {
        console.log(`[정보] 이미 ${targetDisplayName}와(과)의 대화창이 열려있습니다.`);
      }
    } else {
      console.log(`[정보] 새 메시지 버튼을 찾지 못해 기존 대화 목록에서 ${targetDisplayName}을(를) 확인합니다.`);
    }

    // 메시지 작성 및 전송
    console.log(`[단계 5] ${targetDisplayName} 계정에 메시지를 작성하고 전송합니다...`);
    const result = await sendInstagramDm(page, targetHandle, message, 'auto', 'AUTO-TEST-FINAL');
    
    if (result === 'SENT') {
      console.log(`[성공] ${targetDisplayName} 계정에 메시지 전송을 완료했습니다!`);
      console.log('[확인] 화면에서 전송 결과를 확인하신 후, 브라우저 창을 직접 닫아주세요.');
      
      // 사용자 확인을 위해 창 유지
      await new Promise(resolve => {
        page.on('close', resolve);
      });
    }
    
  } catch (error: any) {
    console.error(`[오류 발생] ${error.message}`);
  } finally {
    await browser.close();
  }
}

runAssistInstagram();
