import { describe, it, expect, beforeEach } from 'vitest';
import { ConfirmationService } from '../../src/services/confirmation.js';
import type { AppState, Config } from '../../src/types/index.js';

const mockConfig: Config = {
  household: {
    name: 'Test House',
    timezone: 'America/Los_Angeles',
    rotationDay: 0,
    rotationHour: 17,
    reminderHoursAfter: 24,
  },
  members: [
    { id: 'm1', name: 'Alice', phone: '+1111', isAdmin: true },
    { id: 'm2', name: 'Bob', phone: '+2222', isAdmin: false },
  ],
  chores: [
    { id: 'c1', name: 'Kitchen', description: 'Clean kitchen' },
    { id: 'c2', name: 'Bathroom', description: 'Clean bathroom' },
  ],
};

describe('ConfirmationService', () => {
  let mockState: AppState;

  beforeEach(() => {
    // Reset state before each test
    mockState = {
      currentWeek: {
        weekOf: '2026-02-01T00:00:00.000Z',
        rotationIndex: 0,
        assignments: [
          {
            memberId: 'm1',
            choreId: 'c1',
            assignedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
            confirmationToken: 'token-alice',
            confirmedAt: null,
            reminderSentAt: null,
          },
          {
            memberId: 'm2',
            choreId: 'c2',
            assignedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
            confirmationToken: 'token-bob',
            confirmedAt: null,
            reminderSentAt: null,
          },
        ],
      },
      history: [],
      lastUpdated: new Date().toISOString(),
    };
  });

  describe('findByToken', () => {
    it('should find assignment by valid token', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      const assignment = service.findByToken('token-alice');

      expect(assignment).not.toBeNull();
      expect(assignment?.memberId).toBe('m1');
    });

    it('should return null for invalid token', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      const assignment = service.findByToken('invalid-token');

      expect(assignment).toBeNull();
    });
  });

  describe('confirm', () => {
    it('should confirm a valid token', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      const result = service.confirm('token-alice');

      expect(result.success).toBe(true);
      expect(result.assignment?.confirmedAt).not.toBeNull();
    });

    it('should reject an invalid token', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      const result = service.confirm('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject double confirmation', () => {
      const service = new ConfirmationService(mockState, mockConfig);

      // First confirmation
      service.confirm('token-alice');

      // Second confirmation
      const result = service.confirm('token-alice');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already confirmed');
    });

    it('should update the actual state object', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      service.confirm('token-alice');

      // Check original state was modified
      expect(mockState.currentWeek.assignments[0].confirmedAt).not.toBeNull();
    });
  });

  describe('getAssignmentsNeedingReminder', () => {
    it('should return assignments past threshold that are not confirmed', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      const needReminder = service.getAssignmentsNeedingReminder();

      // Only Alice (25 hours ago) should need reminder, Bob (12 hours) is under threshold
      expect(needReminder).toHaveLength(1);
      expect(needReminder[0].confirmationToken).toBe('token-alice');
    });

    it('should exclude already confirmed assignments', () => {
      mockState.currentWeek.assignments[0].confirmedAt = new Date().toISOString();

      const service = new ConfirmationService(mockState, mockConfig);
      const needReminder = service.getAssignmentsNeedingReminder();

      expect(needReminder).toHaveLength(0);
    });

    it('should exclude assignments that already received reminders', () => {
      mockState.currentWeek.assignments[0].reminderSentAt = new Date().toISOString();

      const service = new ConfirmationService(mockState, mockConfig);
      const needReminder = service.getAssignmentsNeedingReminder();

      expect(needReminder).toHaveLength(0);
    });
  });

  describe('markReminderSent', () => {
    it('should set reminderSentAt timestamp', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      const assignment = mockState.currentWeek.assignments[0];

      service.markReminderSent(assignment);

      expect(assignment.reminderSentAt).not.toBeNull();
    });
  });

  describe('getSummary', () => {
    it('should return formatted summary string', () => {
      const service = new ConfirmationService(mockState, mockConfig);
      const summary = service.getSummary();

      expect(summary).toContain('Alice');
      expect(summary).toContain('Kitchen');
      expect(summary).toContain('Pending');
    });

    it('should show Completed status for confirmed chores', () => {
      mockState.currentWeek.assignments[0].confirmedAt = new Date().toISOString();

      const service = new ConfirmationService(mockState, mockConfig);
      const summary = service.getSummary();

      expect(summary).toContain('Alice');
      expect(summary).toContain('Completed');
    });
  });

  describe('allConfirmed', () => {
    it('should return false when some chores are not confirmed', () => {
      const service = new ConfirmationService(mockState, mockConfig);

      expect(service.allConfirmed()).toBe(false);
    });

    it('should return true when all chores are confirmed', () => {
      mockState.currentWeek.assignments[0].confirmedAt = new Date().toISOString();
      mockState.currentWeek.assignments[1].confirmedAt = new Date().toISOString();

      const service = new ConfirmationService(mockState, mockConfig);

      expect(service.allConfirmed()).toBe(true);
    });
  });
});
