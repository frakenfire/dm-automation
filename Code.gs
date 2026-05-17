/******************************************************************************
 * LWC 온보딩 & 설문 자동화 시스템 (Code.gs)
 * 
 * 주요 기능:
 * 1) 입사자 일정 도래(시작안내, D+3, D+30, D+60, D+90) 시 메일 발송 자동화
 * 2) 7단계 검증 및 clasp/Apps Script 세이프티 가이드 적용
 * 3) [시뮬레이션] 드라이런(Dry-Run) 모드 탑재: 실제 전송/시트 수정 없이 미리보기 시트 생성
 * 4) 동적 컬럼 맵핑: 시트의 열 순서가 변경되더라도 헤더 이름을 찾아 자동 보정
 * 5) 중복 트리거 방지(멱등성 보장) 및 상세 발송 로그 구축
 ******************************************************************************/

// 공통 설정 상수
const ONBOARDING_CONFIG = {
  SHEET_NAME_TARGETS: '온보딩 대상자',
  SHEET_NAME_TEMPLATES: '메일 템플릿',
  SHEET_NAME_LOGS: '발송 로그',
  SHEET_NAME_PREVIEW: '발송_미리보기',
  TIMEZONE: 'Asia/Seoul',
  TRIGGER_FUNC: 'runDailyOnboardingAutomation'
};

/**
 * 1. 스프레드시트 오픈 시 커스텀 메뉴 등록
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('온보딩 자동화')
    .addItem('🔍 [시뮬레이션] 오늘 대기 메일 예측 (Dry-Run)', 'menuDryRun')
    .addItem('✉️ [실제 실행] 오늘 대기 메일 전체 발송', 'menuLiveRun')
    .addItem('🧪 [테스트] ys.lee@pcalm.co.kr 로 메일 발송', 'runTestOnboardingMailForYSLee')
    .addSeparator()
    .addItem('⚙️ [트리거] 매일 오전 9시 자동 발송 설치', 'installDailyTrigger')
    .addItem('❌ [트리거] 자동 발송 트리거 전체 삭제', 'deleteDailyTrigger')
    .addToUi();
}

/**
 * 메뉴 호출용 함수: Dry-Run 시뮬레이션 실행
 */
function menuDryRun() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('시뮬레이션을 시작합니다. 실제 메일은 발송되지 않습니다.', 'Dry-Run 시작', 3);
  try {
    runOnboardingAutomation(true);
    ss.toast('시뮬레이션이 끝났습니다. 발송_미리보기 시트를 확인하세요.', '완료', 5);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Dry-Run 중 오류 발생: ' + String(err));
  }
}

/**
 * 메뉴 호출용 함수: 실서버 라이브 실행
 */
function menuLiveRun() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '🚨 실제 메일 발송 알림',
    '조건을 만족하는 온보딩 대상자 및 리더에게 실제 메일을 전송하고 데이터를 기록하시겠습니까?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    ui.alert('실행이 취소되었습니다.');
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('실제 발송을 시작합니다.', 'Live-Run 시작', 3);
  try {
    runOnboardingAutomation(false);
    ss.toast('전체 대상자에 대한 메일 발송 및 기록이 완료되었습니다.', '완료', 5);
  } catch (err) {
    ui.alert('Live-Run 중 오류 발생: ' + String(err));
  }
}

/**
 * 트리거 실행 전용 Entry Point (매일 아침 9시 트리거 등)
 */
function runDailyOnboardingAutomation() {
  console.log('[TRIGGER_START] runDailyOnboardingAutomation - Live-Run 실행');
  try {
    runOnboardingAutomation(false);
    console.log('[TRIGGER_END] 자동화 배치 정상 완료');
  } catch (err) {
    console.error('[TRIGGER_FAIL] 자동화 배치 에러: ' + String(err));
  }
}

/**
 * 2. 자동화 핵심 오케스트레이션 로직
 * @param {boolean} dryRun - True 시 실제 메일 발송 및 원본 데이터 변경을 하지 않고 preview 시트 생성
 */
function runOnboardingAutomation(dryRun) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 필수 시트 로드 및 자기 복구
  const targetSheet = getOrCreateSheet_(ss, ONBOARDING_CONFIG.SHEET_NAME_TARGETS);
  const templateSheet = getOrCreateSheet_(ss, ONBOARDING_CONFIG.SHEET_NAME_TEMPLATES);
  const logSheet = getOrCreateSheet_(ss, ONBOARDING_CONFIG.SHEET_NAME_LOGS);
  
  // 1단계: 동적 컬럼 인덱스 매핑 (헤더 자동 감지)
  const targetMap = getHeaderMap_(targetSheet);
  const templateMap = getHeaderMap_(templateSheet);
  
  validateRequiredHeaders_(targetMap, [
    '사번', '성명', '이메일', '입사일', '온보딩리더', '리더이메일',
    '시작안내', 'd+3예정일', 'd+3발송일', 'd+3응답여부',
    'd+30예정일', 'd+30발송여부', 'd+30응답완료',
    'd+60예정일', 'd+60발송여부', 'd+60응답완료',
    'd+90예정일', 'd+90발송여부', 'd+90응답완료'
  ], ONBOARDING_CONFIG.SHEET_NAME_TARGETS);

  validateRequiredHeaders_(templateMap, [
    '구분', '제목템플릿', '본문템플릿'
  ], ONBOARDING_CONFIG.SHEET_NAME_TEMPLATES);

  // 2단계: 메일 템플릿 로드 & 정제
  const templates = loadTemplates_(templateSheet, templateMap);
  
  // 3단계: 대상자 전체 데이터 조회
  const lastRow = targetSheet.getLastRow();
  if (lastRow < 2) {
    console.log('[SKIP] 대상자 데이터가 없습니다.');
    return;
  }
  
  const rawValues = targetSheet.getRange(2, 1, lastRow - 1, targetSheet.getLastColumn()).getValues();
  const previewRows = [];
  const logRows = [];
  const cellUpdates = []; // {row, col, value} 형태로 모아서 일괄 업데이트
  
  // 오늘 날짜 및 요일
  const todayStr = formatDate_(new Date(), 'yyyy-MM-dd');
  
  // 4단계: 루프 돌며 조건 확인
  rawValues.forEach((row, idx) => {
    const rowNum = idx + 2;
    
    // 대상자 정보 매핑 객체
    const emp = {
      no: getValueByHeader_(row, targetMap, '번호'),
      employeeId: String(getValueByHeader_(row, targetMap, '사번')).trim(),
      name: String(getValueByHeader_(row, targetMap, '성명')).trim(),
      division: String(getValueByHeader_(row, targetMap, '본부')).trim(),
      team: String(getValueByHeader_(row, targetMap, '팀')).trim(),
      part: String(getValueByHeader_(row, targetMap, '파트')).trim(),
      email: String(getValueByHeader_(row, targetMap, '이메일')).trim(),
      position: String(getValueByHeader_(row, targetMap, '직책')).trim(),
      joinDate: getValueByHeader_(row, targetMap, '입사일'),
      leaderName: String(getValueByHeader_(row, targetMap, '온보딩리더')).trim(),
      leaderEmail: String(getValueByHeader_(row, targetMap, '리더이메일')).trim(),
      
      // 발송 및 일정 상태
      startNoticeSent: String(getValueByHeader_(row, targetMap, '시작안내')).trim(),
      d3Date: getValueByHeader_(row, targetMap, 'd+3예정일'),
      d3Sent: String(getValueByHeader_(row, targetMap, 'd+3발송일')).trim(),
      d30Date: getValueByHeader_(row, targetMap, 'd+30예정일'),
      d30Sent: String(getValueByHeader_(row, targetMap, 'd+30발송여부')).trim(),
      d60Date: getValueByHeader_(row, targetMap, 'd+60예정일'),
      d60Sent: String(getValueByHeader_(row, targetMap, 'd+60발송여부')).trim(),
      d90Date: getValueByHeader_(row, targetMap, 'd+90예정일'),
      d90Sent: String(getValueByHeader_(row, targetMap, 'd+90발송여부')).trim()
    };
    
    if (!emp.name || !emp.email) {
      return; // 필수 인적사항 누락 행 건너뛰기
    }
    
    // 각 일정별 체크 및 메일 전송
    // ----------------------------------------------------
    // [1] 시작 안내 (온보딩 첫날/또는 대기상태)
    // ----------------------------------------------------
    if (!emp.startNoticeSent && isTodayOrPast_(emp.joinDate)) {
      processMailJob_(emp, '시작안내', emp.leaderEmail || emp.email, templates, dryRun, cellUpdates, targetMap['시작안내'], rowNum, previewRows, logRows);
    }
    
    // ----------------------------------------------------
    // [2] D+3 설문 메일
    // ----------------------------------------------------
    if (!emp.d3Sent && emp.d3Date && isTodayOrPast_(emp.d3Date)) {
      // 템플릿 우선 순위: 설문D+3 -> D+3 -> 시작안내 (백업)
      processMailJob_(emp, '설문D+3', emp.email, templates, dryRun, cellUpdates, targetMap['d+3발송일'], rowNum, previewRows, logRows);
    }
    
    // ----------------------------------------------------
    // [3] D+30 설문 메일 (설문1차)
    // ----------------------------------------------------
    if (!emp.d30Sent && emp.d30Date && isTodayOrPast_(emp.d30Date)) {
      processMailJob_(emp, '설문1차', emp.email, templates, dryRun, cellUpdates, targetMap['d+30발송여부'], rowNum, previewRows, logRows);
    }
    
    // ----------------------------------------------------
    // [4] D+60 설문 메일 (설문2차)
    // ----------------------------------------------------
    if (!emp.d60Sent && emp.d60Date && isTodayOrPast_(emp.d60Date)) {
      processMailJob_(emp, '설문2차', emp.email, templates, dryRun, cellUpdates, targetMap['d+60발송여부'], rowNum, previewRows, logRows);
    }
    
    // ----------------------------------------------------
    // [5] D+90 설문 메일 (설문3차)
    // ----------------------------------------------------
    if (!emp.d90Sent && emp.d90Date && isTodayOrPast_(emp.d90Date)) {
      processMailJob_(emp, '설문3차', emp.email, templates, dryRun, cellUpdates, targetMap['d+90발송여부'], rowNum, previewRows, logRows);
    }
  });
  
  // 5단계: 일괄 쓰기 및 사후 처리
  if (dryRun) {
    renderPreviewSheet_(ss, previewRows);
  } else {
    // Live Run인 경우, 셀 정보 일괄 반영 및 발송 로그 저장
    cellUpdates.forEach(update => {
      targetSheet.getRange(update.row, update.col).setValue(update.value);
    });
    
    if (logRows.length > 0) {
      appendLogs_(logSheet, logRows);
    }
  }
}

/**
 * 개별 발송 로직 처리 (플레이스홀더 치환, 검증, 발송)
 */
function processMailJob_(emp, stageKey, recipientEmail, templates, dryRun, cellUpdates, updateColIndex, rowNum, previewRows, logRows) {
  // 스테이지 키에 맞는 템플릿 로드
  const template = getTemplateForStage_(stageKey, templates);
  
  if (!template) {
    const errorMsg = 'FAIL: 구분=[' + stageKey + ']에 해당하는 메일 템플릿 없음';
    console.warn('[TEMPLATE_MISSING] row=' + rowNum + ' name=' + emp.name + ' stage=' + stageKey);
    
    if (!dryRun) {
      logRows.push([
        new Date(),
        emp.employeeId,
        emp.name,
        stageKey,
        recipientEmail,
        '',
        'FAIL',
        errorMsg
      ]);
    }
    return;
  }
  
  if (!recipientEmail || recipientEmail.indexOf('@') === -1) {
    const errorMsg = 'FAIL: 유효하지 않은 이메일 주소 (' + recipientEmail + ')';
    console.warn('[EMAIL_ERROR] row=' + rowNum + ' name=' + emp.name + ' stage=' + stageKey);
    
    if (!dryRun) {
      logRows.push([
        new Date(),
        emp.employeeId,
        emp.name,
        stageKey,
        recipientEmail,
        '',
        'FAIL',
        errorMsg
      ]);
    }
    return;
  }
  
  // 플레이스홀더 치환
  const resolvedSubject = replacePlaceholders_(template.subject, emp, template.link);
  const resolvedBody = replacePlaceholders_(template.body, emp, template.link);
  
  if (dryRun) {
    previewRows.push([
      emp.name,
      emp.employeeId,
      emp.email,
      stageKey,
      recipientEmail,
      resolvedSubject,
      resolvedBody.substring(0, 300) + '...' // HTML 요약
    ]);
  } else {
    try {
      // 실제 메일 전송
      GmailApp.sendEmail(recipientEmail, resolvedSubject, '', {
        htmlBody: resolvedBody,
        name: 'LWC 온보딩 파트너'
      });
      
      const todayStr = formatDate_(new Date(), 'yyyy-MM-dd HH:mm');
      cellUpdates.push({
        row: rowNum,
        col: updateColIndex,
        value: todayStr // 발송일자/완료 상태 업데이트
      });
      
      logRows.push([
        new Date(),
        emp.employeeId,
        emp.name,
        stageKey,
        recipientEmail,
        resolvedSubject,
        'SENT',
        'OK'
      ]);
      console.log('[SENT_SUCCESS] name=' + emp.name + ' stage=' + stageKey + ' to=' + recipientEmail);
    } catch (e) {
      const errorMsg = 'FAIL: ' + String(e);
      logRows.push([
        new Date(),
        emp.employeeId,
        emp.name,
        stageKey,
        recipientEmail,
        resolvedSubject,
        'FAIL',
        errorMsg
      ]);
      console.error('[SENT_FAIL] name=' + emp.name + ' stage=' + stageKey + ' err=' + errorMsg);
    }
  }
}

/**
 * 3. 템플릿 매핑 및 치환 유틸리티
 */
function getTemplateForStage_(stageKey, templates) {
  // 별칭/바인딩 우선순위 처리
  let key = stageKey.toLowerCase();
  
  // D+3인 경우, d+3 또는 설문d+3 등이 없을 때 시작안내로 자동 폴백 지원
  if (key === '설문d+3' || key === 'd+3') {
    return templates['설문d+3'] || templates['d+3'] || templates['설문d3'] || templates['d3'] || templates['시작안내'];
  }
  
  return templates[key];
}

/**
 * 플레이스홀더 치환 함수
 */
function replacePlaceholders_(templateStr, emp, link) {
  if (!templateStr) return '';
  
  let res = templateStr;
  
  // 핵심 정보 변환
  res = res.replace(/{성명}/g, emp.name || '');
  res = res.replace(/{사번}/g, emp.employeeId || '');
  res = res.replace(/{본부}/g, emp.division || '');
  res = res.replace(/{팀}/g, emp.team || '');
  res = res.replace(/{파트}/g, emp.part || '');
  res = res.replace(/{직책}/g, emp.position || '');
  res = res.replace(/{입사일}/g, formatDate_(emp.joinDate));
  res = res.replace(/{온보딩 리더}/g, emp.leaderName || '');
  res = res.replace(/{리더 이메일}/g, emp.leaderEmail || '');
  
  // 링크 관련 치환
  const finalLink = link || '';
  res = res.replace(/{설문지 링크}/g, finalLink);
  res = res.replace(/{설문 링크}/g, finalLink);
  res = res.replace(/{링크}/g, finalLink);
  
  return res;
}

/**
 * 4. 시트 제어 및 라이브러리 유틸리티
 */
function getHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  
  headers.forEach((h, i) => {
    // 띄어쓰기를 없애고 모두 소문자로 변경하여 일치율 확보
    const key = String(h || '').trim().replace(/\s+/g, '').toLowerCase();
    if (key) {
      map[key] = i + 1; // 1-based index
    }
  });
  return map;
}

function getValueByHeader_(rowValues, headerMap, keyName) {
  const normalizedKey = keyName.toLowerCase();
  const colIndex = headerMap[normalizedKey];
  if (!colIndex) return '';
  return rowValues[colIndex - 1];
}

function loadTemplates_(sheet, headerMap) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  
  const cGubun = headerMap['구분'];
  const cSubject = headerMap['제목템플릿'];
  const cBody = headerMap['본문템플릿'];
  const cLink = headerMap['설문지링크'] || headerMap['설문링크'] || headerMap['링크'];
  
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const templates = {};
  
  values.forEach(row => {
    const gubunVal = String(row[cGubun - 1] || '').trim();
    if (!gubunVal) return;
    
    const key = gubunVal.replace(/\s+/g, '').toLowerCase();
    templates[key] = {
      gubun: gubunVal,
      subject: String(row[cSubject - 1] || ''),
      body: String(row[cBody - 1] || ''),
      link: cLink ? String(row[cLink - 1] || '') : ''
    };
  });
  return templates;
}

function validateRequiredHeaders_(headerMap, requiredKeys, sheetName) {
  const missing = [];
  requiredKeys.forEach(k => {
    if (!headerMap[k]) {
      missing.push(k);
    }
  });
  
  if (missing.length > 0) {
    throw new Error('시트 [' + sheetName + ']에 필수 헤더가 누락되었습니다: ' + missing.join(', '));
  }
}

/**
 * 5. 날짜 포맷팅 및 비교 유틸리티
 */
function parseDate_(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  
  if (typeof val === 'number') {
    // 시트 날짜 시리얼
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + val * 86400000);
  }
  
  const s = String(val).trim();
  if (!s) return null;
  
  const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return new Date(parsed);
  return null;
}

function isTodayOrPast_(targetVal) {
  const d = parseDate_(targetVal);
  if (!d) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(d.getTime());
  target.setHours(0, 0, 0, 0);
  
  return target.getTime() <= today.getTime();
}

function formatDate_(date, formatStr = 'yyyy-MM-dd') {
  const d = parseDate_(date);
  if (!d) return '';
  return Utilities.formatDate(d, ONBOARDING_CONFIG.TIMEZONE, formatStr);
}

/**
 * 6. 드라이런 렌더러 & 사후 처리
 */
function renderPreviewSheet_(ss, previewRows) {
  let sh = ss.getSheetByName(ONBOARDING_CONFIG.SHEET_NAME_PREVIEW);
  if (sh) {
    sh.clear();
  } else {
    sh = ss.insertSheet(ONBOARDING_CONFIG.SHEET_NAME_PREVIEW);
  }
  
  const headers = [['성명', '사번', '이메일', '구분/단계', '수신이메일', '발송제목', '본문(HTML 요약)']];
  sh.getRange(1, 1, 1, headers[0].length).setValues(headers).setFontWeight('bold').setBackground('#e6f4ea');
  sh.setFrozenRows(1);
  
  if (previewRows.length > 0) {
    sh.getRange(2, 1, previewRows.length, headers[0].length).setValues(previewRows);
    sh.autoResizeColumns(1, headers[0].length);
  } else {
    sh.getRange(2, 1).setValue('오늘 발송 예정인 메일이 없습니다.');
  }
  ss.setActiveSheet(sh);
}

function appendLogs_(sheet, logRows) {
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
}

function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === ONBOARDING_CONFIG.SHEET_NAME_LOGS) {
      sh.appendRow(['일시', '사번', '성명', '액션', '수신자', '제목', '결과', '비고']).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

/**
 * 7. 멱등성 보장형 트리거 설치 및 관리
 */
function installDailyTrigger() {
  const fn = ONBOARDING_CONFIG.TRIGGER_FUNC;
  
  // 기존 중복 트리거 전체 정리 (멱등성 확보)
  deleteDailyTrigger();
  
  // 오전 9시에 일일 자동 발송 트리거 설치
  ScriptApp.newTrigger(fn)
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(0)
    .inTimezone(ONBOARDING_CONFIG.TIMEZONE)
    .create();
  
  SpreadsheetApp.getActiveSpreadsheet().toast('매일 오전 9시 발송 트리거가 정상적으로 설치되었습니다.', '설치 완료', 5);
  console.log('[TRIGGER_INSTALLED] fn=' + fn + ' time=09:00 daily');
}

function deleteDailyTrigger() {
  const fn = ONBOARDING_CONFIG.TRIGGER_FUNC;
  let count = 0;
  
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === fn) {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  });
  
  if (count > 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('기존에 생성된 ' + count + '개의 자동 발송 트리거를 삭제했습니다.', '삭제 완료', 5);
    console.log('[TRIGGER_DELETED] count=' + count + ' trigger=' + fn);
  }
}

/**
 * 8. 테스트 발송 전용 함수 (ys.lee@pcalm.co.kr)
 */
function runTestOnboardingMailForYSLee() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('ys.lee@pcalm.co.kr 로 테스트 메일 4종 발송을 시작합니다...', '테스트 발송', 3);
  
  try {
    const targetSheet = getOrCreateSheet_(ss, ONBOARDING_CONFIG.SHEET_NAME_TARGETS);
    const templateSheet = getOrCreateSheet_(ss, ONBOARDING_CONFIG.SHEET_NAME_TEMPLATES);
    const targetMap = getHeaderMap_(targetSheet);
    const templateMap = getHeaderMap_(templateSheet);
    const templates = loadTemplates_(templateSheet, templateMap);
    
    // 테스트 수신자 더미 객체
    const emp = {
      name: '테스트(홍길동)',
      employeeId: 'TEST-YSL',
      division: '피칼름사업본부',
      team: '글로벌성장팀',
      part: '자동화인프라',
      email: 'ys.lee@pcalm.co.kr',
      position: '매니저',
      joinDate: new Date(),
      leaderName: '온보딩멘토',
      leaderEmail: 'ys.lee@pcalm.co.kr'
    };
    
    // 온보딩 단계별 4대 템플릿 테스트 발송
    const testStages = ['시작안내', '설문1차', '설문2차', '설문3차'];
    let sentCount = 0;
    
    testStages.forEach(stageKey => {
      const template = getTemplateForStage_(stageKey, templates);
      if (template) {
        const resolvedSubject = '[TEST] ' + replacePlaceholders_(template.subject, emp, template.link);
        const resolvedBody = replacePlaceholders_(template.body, emp, template.link);
        
        GmailApp.sendEmail('ys.lee@pcalm.co.kr', resolvedSubject, '', {
          htmlBody: resolvedBody,
          name: 'LWC 온보딩 파트너 (테스트)'
        });
        sentCount++;
        console.log('[TEST_SENT] stage=' + stageKey + ' to=ys.lee@pcalm.co.kr');
      }
    });
    
    ss.toast('성공적으로 ' + sentCount + '개의 테스트 메일을 발송했습니다!', '완료', 5);
  } catch (err) {
    SpreadsheetApp.getUi().alert('테스트 메일 발송 중 오류 발생: ' + String(err));
  }
}
