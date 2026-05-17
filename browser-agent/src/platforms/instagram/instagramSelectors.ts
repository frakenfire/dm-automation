export const INSTAGRAM_SELECTORS = {
  // Profile page
  profile_name: 'header h2',
  dm_button: 'div[role="button"]:has-text("메시지 보내기"), div[role="button"]:has-text("Message")', 
  
  // DM window
  dm_input: 'div[contenteditable="true"][role="textbox"]',
  send_button: '//button[text()="보내기" or text()="Send"]',
  
  // Search
  search_button: 'a[href="#"], svg[aria-label*="검색"], svg[aria-label*="Search"]',
  search_input: 'input[aria-label="입력 검색"], input[aria-label="Search input"], input[placeholder*="검색"], input[placeholder*="Search"]',
  search_result_first: 'a[role="link"]:has(div[dir="auto"])',
  
  // Login check (Verified stable selectors)
  logged_in_indicator: 'svg[aria-label*="홈"], svg[aria-label*="Home"], svg[aria-label*="Messenger"], a[href^="/direct/inbox/"]',
  login_username_field: 'input[name="username"]',
  login_password_field: 'input[name="password"]',
  login_form: 'form#loginForm, form[method="post"]',
};
