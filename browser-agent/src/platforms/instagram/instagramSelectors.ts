export const INSTAGRAM_SELECTORS = {
  // Profile page — DM button (프로필에서 메시지 보내기 버튼)
  dm_button: [
    'div[role="button"]:has-text("메시지 보내기")',
    'div[role="button"]:has-text("Message")',
    'a[role="button"]:has-text("메시지 보내기")',
    'a[role="button"]:has-text("Message")',
  ].join(', '),

  // DM input (대화창 입력)
  dm_input: 'div[contenteditable="true"][role="textbox"]',
  send_button: [
    'div[role="button"]:has(svg[aria-label*="보내기"])',
    'div[role="button"]:has(svg[aria-label*="Send"])',
    'button:has-text("보내기")',
    'button:has-text("Send")',
  ].join(', '),

  // 검색 — nav 사이드바에서 검색 아이콘을 찾는 셀렉터
  // a[href="#"] 는 너무 광범위하여 제거
  search_button: [
    'a[href*="/explore/search"]',
    'nav a:has(svg[aria-label*="검색"])',
    'nav a:has(svg[aria-label*="Search"])',
    'a:has(svg[aria-label="검색"])',
    'a:has(svg[aria-label="Search"])',
    'svg[aria-label="검색"]',
    'svg[aria-label="Search"]',
  ].join(', '),
  search_input: [
    'input[aria-label="입력 검색"]',
    'input[aria-label="Search input"]',
    'input[placeholder*="검색"]',
    'input[placeholder*="Search"]',
  ].join(', '),
  search_result_first: 'a[role="link"]:has(div[dir="auto"])',

  // 로그인 확인 — 안정적인 지표들
  logged_in_indicator: [
    'svg[aria-label="홈"]',
    'svg[aria-label="Home"]',
    'a[href="/direct/inbox/"]',
    'a[href^="/direct/inbox"]',
    'span[aria-label*="프로필"]',
    'img[data-testid="user-avatar"]',
  ].join(', '),
  login_username_field: 'input[name="username"]',
  login_password_field: 'input[name="password"]',
  login_form: 'form#loginForm, form[method="post"]',
};
