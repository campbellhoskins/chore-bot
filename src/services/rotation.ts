import type { Config, Member, Chore, Assignment, WeekState } from '../types/index.js';
import { generateToken } from '../utils/tokens.js';
import { getWeekStart } from '../utils/dates.js';

export class RotationService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;

    // Validate 1:1 mapping
    if (config.members.length !== config.chores.length) {
      throw new Error(
        `Members (${config.members.length}) and chores (${config.chores.length}) must have equal count`
      );
    }
  }

  /**
   * Calculate which chore each member gets based on rotation index.
   * Rotation index increments each week (0 to members.length-1).
   * Each member gets chore at position (memberIndex + rotationIndex) % choresCount
   */
  calculateAssignments(rotationIndex: number): Assignment[] {
    const memberCount = this.config.members.length;
    const assignments: Assignment[] = [];

    for (let i = 0; i < memberCount; i++) {
      const member = this.config.members[i];
      const choreIndex = (i + rotationIndex) % memberCount;
      const chore = this.config.chores[choreIndex];

      assignments.push({
        memberId: member.id,
        choreId: chore.id,
        assignedAt: new Date().toISOString(),
        confirmationToken: generateToken(),
        confirmedAt: null,
        reminderSentAt: null,
      });
    }

    return assignments;
  }

  /**
   * Create new week state with rotated assignments
   */
  createNewWeek(previousRotationIndex: number | null): WeekState {
    const memberCount = this.config.members.length;
    const newIndex =
      previousRotationIndex === null || previousRotationIndex < 0
        ? 0
        : (previousRotationIndex + 1) % memberCount;

    const weekOf = getWeekStart(new Date(), this.config.household.timezone);

    return {
      weekOf: weekOf.toISOString(),
      rotationIndex: newIndex,
      assignments: this.calculateAssignments(newIndex),
    };
  }

  /**
   * Get member by ID
   */
  getMember(memberId: string): Member | undefined {
    return this.config.members.find((m) => m.id === memberId);
  }

  /**
   * Get chore by ID
   */
  getChore(choreId: string): Chore | undefined {
    return this.config.chores.find((c) => c.id === choreId);
  }

  /**
   * Get member and chore for an assignment
   */
  getAssignmentDetails(assignment: Assignment): { member: Member; chore: Chore } {
    const member = this.getMember(assignment.memberId);
    const chore = this.getChore(assignment.choreId);

    if (!member || !chore) {
      throw new Error('Invalid assignment: member or chore not found');
    }

    return { member, chore };
  }

  /**
   * Get all admin members
   */
  getAdmins(): Member[] {
    return this.config.members.filter((m) => m.isAdmin);
  }
}
