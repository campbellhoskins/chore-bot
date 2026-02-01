import { Octokit } from '@octokit/rest';
import type { AppState } from '../types/index.js';

const STATE_PATH = 'data/state.json';

export class GitHubStateManager {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async loadState(): Promise<{ state: AppState; sha: string }> {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: STATE_PATH,
    });

    if ('content' in data && typeof data.content === 'string') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return {
        state: JSON.parse(content),
        sha: data.sha,
      };
    }

    throw new Error('Unable to load state file from GitHub');
  }

  async saveState(state: AppState, currentSha: string, message: string): Promise<void> {
    state.lastUpdated = new Date().toISOString();

    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: STATE_PATH,
      message,
      content: Buffer.from(JSON.stringify(state, null, 2)).toString('base64'),
      sha: currentSha,
    });
  }
}

/**
 * Create GitHub state manager from environment variables
 */
export function createGitHubStateManager(): GitHubStateManager {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error(
      'Missing GitHub environment variables. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO'
    );
  }

  return new GitHubStateManager(token, owner, repo);
}
