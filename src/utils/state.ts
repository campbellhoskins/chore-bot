import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AppState } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, '..', '..', 'data', 'state.json');

export async function loadState(): Promise<AppState> {
  try {
    const content = await fs.readFile(STATE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Return initial empty state if file doesn't exist or is invalid
    return {
      currentWeek: {
        weekOf: '',
        rotationIndex: -1,
        assignments: [],
      },
      history: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function saveState(state: AppState): Promise<void> {
  state.lastUpdated = new Date().toISOString();
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

export function getStatePath(): string {
  return STATE_PATH;
}
