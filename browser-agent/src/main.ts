import { config } from './config';
import { GoogleSheetsClient } from './sheets/googleSheetsClient';

async function main() {
  console.log('--- Instagram/X Seeding Automation System PoC ---');
  console.log(`Default Send Mode: ${config.defaultSendMode}`);
  
  // Initialization logic here
  console.log('Run with scripts in package.json to see specific platform dry-runs.');
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
