import { chromium } from '@playwright/test';
import { config } from '../config';
import { checkInstagramLogin, waitForInstagramLogin } from '../platforms/instagram/instagramLoginCheck';
import { sendInstagramDm } from '../platforms/instagram/instagramDmSender';
import { QueueRepository, OutreachTask } from '../sheets/queueRepository';

async function runBulkInstagram() {
  const repository = new QueueRepository();
  let isHeadless = process.env.HEADLESS === 'true';
  const isTest = process.env.TEST_MODE === 'true';

  console.log(`[시작] 인스타그램 대량 DM 발송 프로세스 가동 (모드: ${isTest ? '테스트' : '운영'})`);

  // 1. 작업 목록 가져오기
  const tasks = await repository.getReadyTasks('Instagram');
  if (tasks.length === 0) {
    console.log('[종료] 대기 중인 발송 작업이 없습니다.');
    return;
  }
  console.log(`[정보] 총 ${tasks.length}건의 대기 작업을 발견했습니다.`);

  // 2. 브라우저 초기화
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
    // 3. 로그인 확인
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
    }

    // 4. 발송 루프
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`\n[진행] (${i + 1}/${tasks.length}) @${task.handle} 발송 시도 중...`);

      try {
        // 상태를 'PROCESSING'으로 업데이트
        await repository.updateTaskStatus(task.queue_id, 'PROCESSING');
        await broadcast(`Processing @${task.handle}`);

        // 발송 수행 (isTest면 assist 모드, 아니면 시트의 send_mode 사용)
        const mode = isTest ? 'assist' : (task.send_mode as 'dry-run' | 'assist' | 'auto');
        const result = await sendInstagramDm(page, task.handle, task.message_text, mode, task.queue_id);
        await broadcast(`Completed @${task.handle}`);

        if (result === 'SENT' || result === 'OPENED' || result === 'DRY_RUN_SUCCESS') {
          console.log(`[성공] @${task.handle} 발송 완료 (결과: ${result})`);
          await repository.updateTaskStatus(task.queue_id, 'SUCCESS', new Date().toISOString());
          successCount++;
        } else {
          throw new Error(`알 수 없는 결과: ${result}`);
        }

      } catch (error: any) {
        const errorMsg = error.message || '알 수 없는 오류';
        console.error(`[실패] @${task.handle}: ${errorMsg}`);
        await repository.updateTaskStatus(task.queue_id, 'FAILED', undefined, errorMsg);
        failureCount++;
      }

      // 다음 발송 전 지연 (마지막 작업이 아닐 때만)
      if (i < tasks.length - 1) {
        const min = isTest ? config.dryRun.minDelay : config.instagram.minDelay;
        const max = isTest ? config.dryRun.maxDelay : config.instagram.maxDelay;
        const delay = Math.floor(Math.random() * (max - min + 1) + min);
        
        console.log(`[대기] 다음 발송까지 ${delay}초 동안 휴식합니다 (차단 방지)...`);
        await page.waitForTimeout(delay * 1000);
        
        // 상태 초기화를 위해 홈으로 이동
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' }).catch(() => {});
      }
    }

    console.log(`\n[완료] 모든 대기열 작업이 종료되었습니다.`);
    console.log(`최종 결과 - 성공: ${successCount}건, 실패: ${failureCount}건`);

  } catch (error: any) {
    console.error(`[치명적 오류] ${error.message || error}`);
  } finally {
    await browser.close();
  }
}

runBulkInstagram();
