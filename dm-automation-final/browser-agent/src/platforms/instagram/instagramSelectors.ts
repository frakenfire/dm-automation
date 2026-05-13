export const INSTAGRAM_SELECTORS = {
  // Profile page
  profile_name: 'header h2',
  dm_button: '//div[text()="메시지 보내기" or text()="Message" or contains(@class, "x1i10hfl")]', // XPath for "Message" button
  
  // DM window
  dm_input: 'div[aria-label="메시지...", "Message..."]',
  send_button: '//button[text()="보내기" or text()="Send"]',
  
  // Login check
  login_form: 'form#loginForm',
};
