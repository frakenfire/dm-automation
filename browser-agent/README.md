# Instagram/X Outbound Seeding Automation System PoC

## Setup
1. `npm install`
2. Place `credentials.json` (Google Service Account) in root.
3. `cp .env.example .env` and configure.
4. `npm run setup:sheet`

## Dry-run
- `npm run dryrun:instagram`
- `npm run dryrun:x`

## Structure
- `src/sheets`: Google Sheets API integration.
- `src/platforms`: Platform-specific browser automation logic.
- `src/services`: Business logic (A/B testing, rate limiting, etc).
- `src/scripts`: Executable entry points.
