import type { AppState, Config, HistoryEntry } from '../types/index.js';

const MAX_HISTORY_WEEKS = 5;

export class HistoryService {
  private state: AppState;
  private config: Config;

  constructor(state: AppState, config: Config) {
    this.state = state;
    this.config = config;
  }

  /**
   * Archive current week to history (call before creating new week)
   */
  archiveCurrentWeek(): void {
    // Only archive if there are assignments
    if (this.state.currentWeek.assignments.length > 0) {
      // Deep copy current week to history
      this.state.history.unshift(JSON.parse(JSON.stringify(this.state.currentWeek)));

      // Keep only last N weeks
      if (this.state.history.length > MAX_HISTORY_WEEKS) {
        this.state.history = this.state.history.slice(0, MAX_HISTORY_WEEKS);
      }
    }
  }

  /**
   * Get history for a specific member (past month = ~4 weeks)
   */
  getMemberHistory(memberId: string): HistoryEntry[] {
    const allWeeks = [this.state.currentWeek, ...this.state.history];
    const result: HistoryEntry[] = [];

    // Get last 4 weeks
    const recentWeeks = allWeeks.slice(0, 4);

    for (const week of recentWeeks) {
      const assignment = week.assignments.find((a) => a.memberId === memberId);
      if (assignment) {
        const chore = this.config.chores.find((c) => c.id === assignment.choreId);
        if (chore) {
          result.push({
            weekOf: week.weekOf,
            choreName: chore.name,
            choreDescription: chore.description,
            confirmed: assignment.confirmedAt !== null,
            confirmedAt: assignment.confirmedAt,
          });
        }
      }
    }

    return result;
  }

  /**
   * Find member ID by their current week's confirmation token
   */
  findMemberByToken(token: string): string | null {
    const assignment = this.state.currentWeek.assignments.find(
      (a) => a.confirmationToken === token
    );
    return assignment?.memberId || null;
  }

  /**
   * Get total completion rate for a member (across all history)
   */
  getMemberCompletionRate(memberId: string): { completed: number; total: number } {
    const allWeeks = [this.state.currentWeek, ...this.state.history];
    let completed = 0;
    let total = 0;

    for (const week of allWeeks) {
      const assignment = week.assignments.find((a) => a.memberId === memberId);
      if (assignment) {
        total++;
        if (assignment.confirmedAt) {
          completed++;
        }
      }
    }

    return { completed, total };
  }
}
