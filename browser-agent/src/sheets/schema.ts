export const SHEET_SCHEMA = {
  Config: [
    'campaign_id', 'platform', 'product_name', 'target_country', 
    'min_followers', 'max_followers', 'keywords', 'hashtags', 
    'form_link', 'daily_send_limit', 'send_mode', 'active'
  ],
  Raw_Instagram: [],
  Raw_X: [],
  Scoring: [],
  Outreach_Queue: [
    'queue_id', 'campaign_id', 'platform', 'handle', 'profile_url', 
    'message_variant', 'message_text', 'send_mode', 'status', 
    'idempotency_key', 'scheduled_at', 'sent_at', 'last_error'
  ],
  Message_Template: ['template_id', 'platform', 'variant', 'text'],
  Send_Log: [
    'logged_at', 'queue_id', 'campaign_id', 'platform', 'handle', 
    'message_variant', 'message_hash', 'send_mode', 'result', 
    'error_code', 'screenshot_path', 'sent_at'
  ],
  Reply_Log: [],
  Form_Response: [],
  Fulfillment: [],
  Upload_Tracking: [],
  Suppression: ['platform', 'handle', 'reason', 'added_at'],
  Error_Log: [
    'error_at', 'module', 'queue_id', 'platform', 'handle', 
    'error_code', 'error_message', 'screenshot_path', 'retryable'
  ],
  Run_History: [
    'run_id', 'module', 'started_at', 'ended_at', 'target_count', 
    'success_count', 'fail_count', 'skipped_count', 'result'
  ]
};

export type SheetName = keyof typeof SHEET_SCHEMA;
