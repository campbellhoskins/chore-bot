import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadConfig } from '../src/utils/config.js';
import { createGitHubStateManager } from '../src/utils/github.js';
import { HistoryService } from '../src/services/history.js';
import type { HistoryEntry } from '../src/types/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send(renderErrorPage('Method not allowed'));
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send(renderErrorPage('Invalid or missing token'));
  }

  try {
    const config = await loadConfig();
    const githubManager = createGitHubStateManager();

    // Load state from GitHub
    const { state } = await githubManager.loadState();

    const historyService = new HistoryService(state, config);

    // Find member by their current confirmation token
    const memberId = historyService.findMemberByToken(token);

    if (!memberId) {
      return res.status(404).send(renderErrorPage('Member not found. This link may have expired.'));
    }

    const member = config.members.find((m) => m.id === memberId);
    const history = historyService.getMemberHistory(memberId);

    return res.status(200).send(renderHistoryPage(member!.name, history));
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).send(renderErrorPage('An error occurred. Please try again later.'));
  }
}

function renderHistoryPage(memberName: string, history: HistoryEntry[]): string {
  const rows = history
    .map((h) => {
      const weekDate = new Date(h.weekOf).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const status = h.confirmed ? 'Completed' : 'Pending';
      const statusColor = h.confirmed ? '#10B981' : '#F59E0B';
      const statusBg = h.confirmed ? '#D1FAE5' : '#FEF3C7';

      return `
      <tr>
        <td>${weekDate}</td>
        <td>
          <div class="chore-name">${h.choreName}</div>
          <div class="chore-desc">${h.choreDescription}</div>
        </td>
        <td>
          <span class="status" style="background: ${statusBg}; color: ${statusColor};">
            ${status}
          </span>
        </td>
      </tr>
    `;
    })
    .join('');

  const emptyState =
    history.length === 0
      ? '<p class="empty">No chore history found.</p>'
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${memberName}'s Chore History - Chore Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 1.5rem;
      background: #F3F4F6;
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    h1 {
      color: #1F2937;
      margin-bottom: 0.5rem;
      font-size: 1.5rem;
    }
    .subtitle {
      color: #6B7280;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 1rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid #E5E7EB;
    }
    th {
      color: #6B7280;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .chore-name {
      font-weight: 500;
      color: #1F2937;
    }
    .chore-desc {
      font-size: 0.875rem;
      color: #6B7280;
      margin-top: 0.25rem;
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .empty {
      text-align: center;
      color: #6B7280;
      padding: 2rem;
    }
    @media (max-width: 480px) {
      .container { padding: 1rem; }
      th, td { padding: 0.75rem 0.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${memberName}'s Chore History</h1>
    <p class="subtitle">Past month of chore assignments</p>
    ${emptyState}
    ${history.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Week Of</th>
          <th>Chore</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    ` : ''}
  </div>
</body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Error - Chore Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #FEE2E2;
      padding: 1rem;
    }
    .card {
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
    }
    h1 { color: #DC2626; margin-bottom: 1rem; }
    p { color: #6B7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
