import type { AppState, Assignment, Config } from '../types/index.js';
import { hoursElapsed } from '../utils/dates.js';

export interface ConfirmResult {
  success: boolean;
  assignment?: Assignment;
  error?: string;
}

export class ConfirmationService {
  private state: AppState;
  private config: Config;

  constructor(state: AppState, config: Config) {
    this.state = state;
    this.config = config;
  }

  /**
   * Find assignment by confirmation token in current week
   */
  findByToken(token: string): Assignment | null {
    return (
      this.state.currentWeek.assignments.find((a) => a.confirmationToken === token) ||
      null
    );
  }

  /**
   * Confirm a chore completion
   */
  confirm(token: string): ConfirmResult {
    const assignment = this.findByToken(token);

    if (!assignment) {
      return { success: false, error: 'Invalid or expired confirmation token' };
    }

    if (assignment.confirmedAt) {
      return { success: false, error: 'Chore already confirmed', assignment };
    }

    assignment.confirmedAt = new Date().toISOString();
    return { success: true, assignment };
  }

  /**
   * Get assignments that need reminders (threshold hours passed, not confirmed, no reminder sent)
   */
  getAssignmentsNeedingReminder(): Assignment[] {
    const threshold = this.config.household.reminderHoursAfter;

    return this.state.currentWeek.assignments.filter((assignment) => {
      // Skip if already confirmed or already reminded
      if (assignment.confirmedAt || assignment.reminderSentAt) {
        return false;
      }

      // Check if enough time has passed
      return hoursElapsed(assignment.assignedAt, threshold);
    });
  }

  /**
   * Mark reminder as sent for an assignment
   */
  markReminderSent(assignment: Assignment): void {
    assignment.reminderSentAt = new Date().toISOString();
  }

  /**
   * Get confirmation status summary for admin
   */
  getSummary(): string {
    const lines: string[] = [];

    for (const assignment of this.state.currentWeek.assignments) {
      const member = this.config.members.find((m) => m.id === assignment.memberId);
      const chore = this.config.chores.find((c) => c.id === assignment.choreId);

      if (!member || !chore) continue;

      const status = assignment.confirmedAt ? 'Completed' : 'Pending';

      lines.push(`${member.name}: ${chore.name} - ${status}`);
    }

    return lines.join('\n');
  }

  /**
   * Check if all chores are confirmed
   */
  allConfirmed(): boolean {
    return this.state.currentWeek.assignments.every((a) => a.confirmedAt !== null);
  }
}
