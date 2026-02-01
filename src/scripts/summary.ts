/**
 * Weekly summary script - run by GitHub Actions on Saturday
 * Sends a summary of the current week's chore status to all admins
 */

import 'dotenv/config';
import { loadConfig } from '../utils/config.js';
import { loadState } from '../utils/state.js';
import { RotationService } from '../services/rotation.js';
import { ConfirmationService } from '../services/confirmation.js';
import { createSMSService } from '../services/sms.js';

async function main() {
  console.log('Starting weekly summary...');

  // Load config and state
  const config = await loadConfig();
  const state = await loadState();

  // Check if there are any assignments
  if (state.currentWeek.assignments.length === 0) {
    console.log('No assignments for current week, skipping summary');
    return;
  }

  // Get summary
  const confirmationService = new ConfirmationService(state, config);
  const summary = confirmationService.getSummary();

  console.log('Current week summary:');
  console.log(summary);

  // Get admins
  const rotationService = new RotationService(config);
  const admins = rotationService.getAdmins();

  if (admins.length === 0) {
    console.log('No admins configured, skipping SMS');
    return;
  }

  // Create SMS service and send to admins
  const smsService = createSMSService();

  for (const admin of admins) {
    console.log(`Sending summary to admin: ${admin.name}`);

    try {
      const sid = await smsService.sendAdminSummary(admin.phone, admin.name, summary);
      console.log(`  SMS sent: ${sid}`);
    } catch (error) {
      console.error(`  Failed to send summary to ${admin.name}:`, error);
    }
  }

  console.log('Weekly summary complete!');
}

main().catch((error) => {
  console.error('Summary script failed:', error);
  process.exit(1);
});
