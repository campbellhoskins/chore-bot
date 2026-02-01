# Chore Bot

Four young men in a post-grad house. Zero brooms being picked up. You can imagine how that was going.

Rather than argue about whose turn it was to clean, I built Chore Bot—a system that rotates chores weekly and texts each housemate their assignment. Click a link when you're done, and I get a weekly summary of who actually did their part. No chore wheel debates. No "I thought it was your turn." Just automated accountability via text.

## Overview

A serverless household chore management system that automates weekly chore rotation with SMS notifications, web-based confirmations, and persistent state management—all running on free-tier cloud services.

### Key Features

- **Automated Weekly Rotation** - Fair chore distribution using a rotating index algorithm
- **SMS Notifications** - Assignment alerts and reminder texts via Twilio
- **Web-Based Confirmation** - One-click completion tracking via secure token links
- **Chore History** - View past assignments and completion status
- **Admin Summaries** - Weekly status reports sent to household admins
- **Zero Database** - State persisted directly to GitHub via API

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Actions │────▶│  Node.js Scripts │────▶│   Twilio SMS    │
│   (Scheduler)   │     │  (rotate/remind) │     │   (Outbound)    │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │  state.json    │◀───────────────┐
                        │  (GitHub Repo) │                │
                        └────────────────┘                │
                                 ▲                        │
                                 │                        │
┌─────────────────┐     ┌────────┴─────────┐     ┌───────┴─────────┐
│   User clicks   │────▶│  Vercel API      │────▶│  GitHub API     │
│   confirm link  │     │  (/api/confirm)  │     │  (Octokit)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```


## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20 + TypeScript | Type-safe backend development |
| SMS | Twilio | Reliable SMS delivery with A2P compliance |
| Scheduler | GitHub Actions | Cron-based job execution |
| API Hosting | Vercel | Serverless function endpoints |
| State Storage | JSON + GitHub API | Persistent storage via repo commits |
| Testing | Vitest | Fast unit testing with TypeScript support |

## Project Structure

```
chore-bot/
├── api/                          # Vercel serverless endpoints
│   ├── confirm.ts                # Chore completion confirmation
│   └── history.ts                # View assignment history
├── src/
│   ├── services/                 # Core business logic
│   │   ├── rotation.ts           # Rotation algorithm
│   │   ├── confirmation.ts       # Confirmation tracking
│   │   ├── history.ts            # History management
│   │   └── sms.ts                # Twilio integration
│   ├── scripts/                  # GitHub Actions entrypoints
│   │   ├── rotate.ts             # Weekly rotation job
│   │   ├── remind.ts             # Daily reminder job
│   │   └── summary.ts            # Admin summary job
│   ├── utils/                    # Shared utilities
│   │   ├── config.ts             # Configuration loader
│   │   ├── state.ts              # Local state management
│   │   ├── github.ts             # GitHub API client
│   │   ├── tokens.ts             # Secure token generation
│   │   └── dates.ts              # Timezone utilities
│   └── types/                    # TypeScript interfaces
│       └── index.ts
├── data/
│   ├── config.json               # Household configuration
│   └── state.json                # Current state & history
├── tests/
│   └── services/                 # Unit tests (42 tests)
├── .github/workflows/            # Scheduled automation
│   ├── weekly-rotation.yml       # Sunday 5pm PST
│   ├── daily-reminder.yml        # Daily 6pm PST
│   └── weekly-summary.yml        # Saturday 10am PST
└── vercel.json                   # Vercel configuration
```

## Core Logic

### Rotation Algorithm

The rotation ensures fair chore distribution over time:

```typescript
// Each member gets chore at position: (memberIndex + rotationIndex) % choreCount
// rotationIndex increments weekly, wrapping at member count

function calculateAssignments(members: Member[], chores: Chore[], rotationIndex: number) {
  return members.map((member, memberIndex) => {
    const choreIndex = (memberIndex + rotationIndex) % chores.length;
    return { memberId: member.id, choreId: chores[choreIndex].id };
  });
}
```

**Example with 3 members and 3 chores:**

| Week | Rotation Index | Alice | Bob | Charlie |
|------|----------------|-------|-----|---------|
| 1 | 0 | Kitchen | Bathroom | Vacuuming |
| 2 | 1 | Bathroom | Vacuuming | Kitchen |
| 3 | 2 | Vacuuming | Kitchen | Bathroom |
| 4 | 0 | Kitchen | Bathroom | Vacuuming |

### Confirmation Flow

1. User receives SMS with unique confirmation link
2. Link contains cryptographically random token (32 hex chars)
3. Clicking link hits Vercel endpoint `/api/confirm?token=xxx`
4. Endpoint validates token against current assignments
5. State updated via GitHub API commit
6. Success/error page rendered to user

### State Management

State flows through two paths:

**GitHub Actions (write locally):**
```
Load state.json → Modify in memory → Write state.json → Git commit & push
```

**Vercel API (write remotely):**
```
Load via GitHub API → Modify in memory → Commit via GitHub API
```

## Installation

### Prerequisites

- Node.js 20+
- npm
- Twilio account with US phone number (A2P 10DLC registered)
- Vercel account (free tier)
- GitHub repository

### Setup Steps

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourusername/chore-bot.git
   cd chore-bot
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Twilio credentials
   ```

3. **Configure your household**

   Edit `data/config.json`:
   ```json
   {
     "household": {
       "name": "My House",
       "timezone": "America/Los_Angeles",
       "rotationDay": 0,
       "rotationHour": 17,
       "reminderHoursAfter": 24
     },
     "members": [
       { "id": "member-1", "name": "Alice", "phone": "+15551234567", "isAdmin": true },
       { "id": "member-2", "name": "Bob", "phone": "+15552345678", "isAdmin": false }
     ],
     "chores": [
       { "id": "chore-1", "name": "Kitchen", "description": "Clean counters and mop" },
       { "id": "chore-2", "name": "Bathroom", "description": "Clean toilet and sink" }
     ]
   }
   ```

   **Note:** Number of members must equal number of chores (1:1 mapping).

4. **Deploy to Vercel**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

5. **Configure Vercel environment variables**

   In Vercel Dashboard → Settings → Environment Variables:
   - `GITHUB_TOKEN`: Personal access token with `repo` scope
   - `GITHUB_OWNER`: Your GitHub username
   - `GITHUB_REPO`: Repository name

6. **Configure GitHub secrets**

   In GitHub → Settings → Secrets and variables → Actions:

   **Secrets:**
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER`

   **Variables:**
   - `VERCEL_URL`: Your Vercel deployment URL

7. **Test the system**
   ```bash
   # Run rotation locally
   npm run rotate

   # Check the confirmation link in data/state.json
   # Visit: https://your-app.vercel.app/api/confirm?token=<token>
   ```

## API Endpoints

### GET /api/confirm

Confirms chore completion via token.

**Query Parameters:**
- `token` (required): 32-character confirmation token

**Responses:**
- `200`: Success page with confirmation message
- `400`: Invalid/expired token or already confirmed
- `500`: Server error

### GET /api/history

Displays chore history for a member.

**Query Parameters:**
- `token` (required): Any valid token for the member

**Response:**
- HTML page showing past 4 weeks of chore assignments

## Scheduled Jobs

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `weekly-rotation.yml` | Sunday 5pm PST | Rotate assignments, send SMS |
| `daily-reminder.yml` | Daily 6pm PST | Send reminders for overdue chores |
| `weekly-summary.yml` | Saturday 10am PST | Send admin status summary |

All workflows can be manually triggered from the GitHub Actions tab.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npx tsc --noEmit
```

**Test Coverage:** 42 unit tests covering rotation logic, confirmation handling, and history management.

## Cost Breakdown

| Service | Monthly Cost |
|---------|--------------|
| Twilio phone number | ~$1.15 |
| Twilio A2P 10DLC campaign | ~$2.00 |
| Twilio SMS (~20 messages) | ~$0.20 |
| GitHub Actions | Free |
| Vercel | Free |
| **Total** | **~$3.50/month** |

## Future Enhancements

- [ ] Swap request system between members
- [ ] Vacation/skip week functionality
- [ ] Multiple chore lists (weekly vs monthly)
- [ ] Web dashboard for configuration
- [ ] Slack/Discord integration option

## License

MIT
