import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadConfig } from '../src/utils/config.js';
import { createGitHubStateManager } from '../src/utils/github.js';
import { ConfirmationService } from '../src/services/confirmation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests (clicking a link)
  if (req.method !== 'GET') {
    return res.status(405).send(renderPage({
      title: 'Method Not Allowed',
      message: 'This endpoint only accepts GET requests.',
      success: false,
    }));
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send(renderPage({
      title: 'Invalid Link',
      message: 'This confirmation link is invalid or has expired.',
      success: false,
    }));
  }

  try {
    const config = await loadConfig();
    const githubManager = createGitHubStateManager();

    // Load state from GitHub
    const { state, sha } = await githubManager.loadState();

    const confirmationService = new ConfirmationService(state, config);
    const result = confirmationService.confirm(token);

    if (result.success && result.assignment) {
      // Save updated state to GitHub
      await githubManager.saveState(
        state,
        sha,
        `chore: confirmed ${result.assignment.memberId} chore completion`
      );

      const member = config.members.find((m) => m.id === result.assignment!.memberId);
      const chore = config.chores.find((c) => c.id === result.assignment!.choreId);

      return res.status(200).send(renderPage({
        title: 'Chore Confirmed!',
        message: `Thank you, ${member?.name}! Your completion of "${chore?.name}" has been recorded.`,
        success: true,
      }));
    } else {
      return res.status(400).send(renderPage({
        title: 'Confirmation Issue',
        message: result.error || 'Unable to confirm this chore.',
        success: false,
      }));
    }
  } catch (error) {
    console.error('Confirmation error:', error);
    return res.status(500).send(renderPage({
      title: 'Error',
      message: 'An error occurred. Please try again later.',
      success: false,
    }));
  }
}

function renderPage(data: { title: string; message: string; success: boolean }): string {
  const bgColor = data.success ? '#10B981' : '#EF4444';
  const icon = data.success ? '✓' : '✗';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${data.title} - Chore Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, ${bgColor}22, ${bgColor}44);
      padding: 1rem;
    }
    .card {
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${bgColor};
      color: white;
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    h1 {
      color: #1F2937;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }
    p {
      color: #6B7280;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${data.title}</h1>
    <p>${data.message}</p>
  </div>
</body>
</html>`;
}
