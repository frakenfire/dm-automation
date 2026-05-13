import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  googleSheetId: process.env.GOOGLE_SHEET_ID || '',
  googleCredentialsPath: path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'credentials.json'),
  
  instagram: {
    userDataDir: path.resolve(process.cwd(), process.env.INSTAGRAM_USER_DATA_DIR || './user_data/instagram'),
    dailyLimit: parseInt(process.env.DAILY_SEND_LIMIT_INSTAGRAM || '50', 10),
    minDelay: parseInt(process.env.IG_MIN_DELAY || '90', 10),
    maxDelay: parseInt(process.env.IG_MAX_DELAY || '300', 10),
  },
  
  x: {
    userDataDir: path.resolve(process.cwd(), process.env.X_USER_DATA_DIR || './user_data/x'),
    dailyLimit: parseInt(process.env.DAILY_SEND_LIMIT_X || '50', 10),
    minDelay: parseInt(process.env.X_MIN_DELAY || '60', 10),
    maxDelay: parseInt(process.env.X_MAX_DELAY || '180', 10),
  },
  
  dryRun: {
    minDelay: parseInt(process.env.DRY_RUN_DELAY_MIN || '1', 10),
    maxDelay: parseInt(process.env.DRY_RUN_DELAY_MAX || '3', 10),
  },
  
  defaultSendMode: (process.env.DEFAULT_SEND_MODE || 'dry-run') as 'dry-run' | 'assist' | 'auto',
};
