/**
 * Daily reminder script - run by GitHub Actions daily
 * Checks for assignments that are:
 * - Not confirmed
 * - Assigned more than 24 hours ago
 * - Haven't received a reminder yet
 *
 * Sends reminder SMS and marks reminderSentAt
 */

import 'dotenv/config';
import { loadConfig } from '../utils/config.js';
import { loadState, saveState } from '../utils/state.js';
import { RotationService } from '../services/rotation.js';
import { ConfirmationService } from '../services/confirmation.js';
import { createSMSService } from '../services/sms.js';

async function main() {
  console.log('Starting reminder check...');

  // Load config and state
  const config = await loadConfig();
  const state = await loadState();

  // Check if there are any assignments
  if (state.currentWeek.assignments.length === 0) {
    console.log('No assignments for current week, skipping reminders');
    return;
  }

  // Find assignments needing reminders
  const confirmationService = new ConfirmationService(state, config);
  const needReminder = confirmationService.getAssignmentsNeedingReminder();

  if (needReminder.length === 0) {
    console.log('No reminders needed');
    return;
  }

  console.log(`Found ${needReminder.length} assignment(s) needing reminders`);

  // Build URLs
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';

  // Create services
  const rotationService = new RotationService(config);
  const smsService = createSMSService();

  let remindersSent = 0;

  for (const assignment of needReminder) {
    const { member, chore } = rotationService.getAssignmentDetails(assignment);
    const confirmUrl = `${baseUrl}/api/confirm?token=${assignment.confirmationToken}`;

    console.log(`Sending reminder to ${member.name} for: ${chore.name}`);

    try {
      const sid = await smsService.sendReminder(
        member.phone,
        member.name,
        chore.name,
        confirmUrl
      );
      console.log(`  SMS sent: ${sid}`);

      // Mark reminder as sent
      confirmationService.markReminderSent(assignment);
      remindersSent++;
    } catch (error) {
      console.error(`  Failed to send reminder to ${member.name}:`, error);
    }
  }

  // Save state if any reminders were sent
  if (remindersSent > 0) {
    await saveState(state);
    console.log(`State saved - ${remindersSent} reminder(s) marked as sent`);
  }

  console.log('Reminder check complete!');
}

main().catch((error) => {
  console.error('Reminder script failed:', error);
  process.exit(1);
});
