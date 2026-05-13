import { chromium } from '@playwright/test';

async function debugLiveView() {
    console.log('[시작] 라이브 뷰 무결성 테스트를 시작합니다.');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const broadcast = async (step: string) => {
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 50 });
        const base64 = screenshot.toString('base64');
        console.log(`[SCREENSHOT] ${step}|${base64}`);
        console.log(`[단계] ${step} 화면 캡처 및 전송 완료`);
    };

    try {
        // 1. 구글 접속 테스트
        await page.goto('https://www.google.com');
        await page.waitForTimeout(2000);
        await broadcast('Google Main');

        // 2. 인스타그램 로그인 페이지 테스트
        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForTimeout(3000);
        await broadcast('Instagram Login');

        // 3. 인스타그램 메인 (비로그인 상태)
        await page.goto('https://www.instagram.com/');
        await page.waitForTimeout(2000);
        await broadcast('Instagram Main');

        console.log('[성공] 라이브 뷰 테스트가 완료되었습니다. 모든 화면이 대시보드에 정상 출력되어야 합니다.');
    } catch (e) {
        console.error(`[오류] ${e}`);
    } finally {
        await browser.close();
    }
}

debugLiveView();
