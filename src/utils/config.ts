import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Config } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'config.json');

export async function loadConfig(): Promise<Config> {
  const content = await fs.readFile(CONFIG_PATH, 'utf-8');
  const config: Config = JSON.parse(content);

  // Validate 1:1 mapping
  if (config.members.length !== config.chores.length) {
    throw new Error(
      `Config error: members (${config.members.length}) and chores (${config.chores.length}) must have equal count`
    );
  }

  // Validate at least one admin
  const hasAdmin = config.members.some((m) => m.isAdmin);
  if (!hasAdmin) {
    throw new Error('Config error: at least one member must be an admin');
  }

  return config;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
