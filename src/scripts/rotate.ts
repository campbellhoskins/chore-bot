/**
 * Weekly rotation script - run by GitHub Actions every Sunday at 5pm PST
 * 1. Archives current week to history
 * 2. Creates new week with rotated assignments
 * 3. Sends assignment SMS to each member
 * 4. Saves updated state
 */

import 'dotenv/config';
import { loadConfig } from '../utils/config.js';
import { loadState, saveState } from '../utils/state.js';
import { RotationService } from '../services/rotation.js';
import { HistoryService } from '../services/history.js';
import { createSMSService } from '../services/sms.js';

async function main() {
  console.log('Starting weekly rotation...');

  // Load config and state
  const config = await loadConfig();
  const state = await loadState();

  console.log(`Household: ${config.household.name}`);
  console.log(`Members: ${config.members.length}`);
  console.log(`Chores: ${config.chores.length}`);

  // Archive current week to history
  const historyService = new HistoryService(state, config);
  if (state.currentWeek.assignments.length > 0) {
    historyService.archiveCurrentWeek();
    console.log('Archived previous week to history');
  }

  // Create new week with rotated assignments
  const rotationService = new RotationService(config);
  const previousIndex = state.currentWeek.rotationIndex;
  state.currentWeek = rotationService.createNewWeek(previousIndex);

  console.log(`New rotation index: ${state.currentWeek.rotationIndex}`);
  console.log(`Week of: ${state.currentWeek.weekOf}`);

  // Build URLs
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';

  // Create SMS service and send assignments
  const smsService = createSMSService();

  for (const assignment of state.currentWeek.assignments) {
    const { member, chore } = rotationService.getAssignmentDetails(assignment);

    const confirmUrl = `${baseUrl}/api/confirm?token=${assignment.confirmationToken}`;
    const historyUrl = `${baseUrl}/api/history?token=${assignment.confirmationToken}`;

    console.log(`Sending assignment to ${member.name}: ${chore.name}`);

    try {
      const sid = await smsService.sendAssignment(
        member.phone,
        member.name,
        chore.name,
        chore.description,
        confirmUrl,
        historyUrl
      );
      console.log(`  SMS sent: ${sid}`);
    } catch (error) {
      console.error(`  Failed to send SMS to ${member.name}:`, error);
    }
  }

  // Save updated state
  await saveState(state);
  console.log('State saved successfully');

  console.log('Weekly rotation complete!');
}

main().catch((error) => {
  console.error('Rotation script failed:', error);
  process.exit(1);
});
