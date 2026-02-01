import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../../src/services/history.js';
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

describe('HistoryService', () => {
  let mockState: AppState;

  beforeEach(() => {
    mockState = {
      currentWeek: {
        weekOf: '2026-02-01T00:00:00.000Z',
        rotationIndex: 0,
        assignments: [
          {
            memberId: 'm1',
            choreId: 'c1',
            assignedAt: '2026-02-01T01:00:00.000Z',
            confirmationToken: 'token-current',
            confirmedAt: null,
            reminderSentAt: null,
          },
          {
            memberId: 'm2',
            choreId: 'c2',
            assignedAt: '2026-02-01T01:00:00.000Z',
            confirmationToken: 'token-bob-current',
            confirmedAt: '2026-02-02T10:00:00.000Z',
            reminderSentAt: null,
          },
        ],
      },
      history: [
        {
          weekOf: '2026-01-25T00:00:00.000Z',
          rotationIndex: 3,
          assignments: [
            {
              memberId: 'm1',
              choreId: 'c2',
              assignedAt: '2026-01-25T01:00:00.000Z',
              confirmationToken: 'token-history-1',
              confirmedAt: '2026-01-26T14:30:00.000Z',
              reminderSentAt: null,
            },
            {
              memberId: 'm2',
              choreId: 'c1',
              assignedAt: '2026-01-25T01:00:00.000Z',
              confirmationToken: 'token-bob-history-1',
              confirmedAt: null,
              reminderSentAt: null,
            },
          ],
        },
      ],
      lastUpdated: '2026-02-01T01:00:00.000Z',
    };
  });

  describe('archiveCurrentWeek', () => {
    it('should add current week to history', () => {
      const service = new HistoryService(mockState, mockConfig);
      const originalLength = mockState.history.length;

      service.archiveCurrentWeek();

      expect(mockState.history.length).toBe(originalLength + 1);
      expect(mockState.history[0].weekOf).toBe('2026-02-01T00:00:00.000Z');
    });

    it('should not archive if current week has no assignments', () => {
      mockState.currentWeek.assignments = [];

      const service = new HistoryService(mockState, mockConfig);
      const originalLength = mockState.history.length;

      service.archiveCurrentWeek();

      expect(mockState.history.length).toBe(originalLength);
    });

    it('should keep only last 5 weeks in history', () => {
      // Add more weeks to history to exceed limit
      for (let i = 0; i < 6; i++) {
        mockState.history.push({
          weekOf: `2026-01-${10 + i}T00:00:00.000Z`,
          rotationIndex: i,
          assignments: [],
        });
      }

      const service = new HistoryService(mockState, mockConfig);
      service.archiveCurrentWeek();

      expect(mockState.history.length).toBe(5);
    });

    it('should deep copy current week (not reference)', () => {
      const service = new HistoryService(mockState, mockConfig);
      service.archiveCurrentWeek();

      // Modify current week
      mockState.currentWeek.assignments[0].confirmedAt = 'modified';

      // History should not be affected
      expect(mockState.history[0].assignments[0].confirmedAt).toBeNull();
    });
  });

  describe('getMemberHistory', () => {
    it('should return history for a specific member', () => {
      const service = new HistoryService(mockState, mockConfig);
      const history = service.getMemberHistory('m1');

      expect(history).toHaveLength(2); // Current + 1 history
      expect(history[0].choreName).toBe('Kitchen'); // Current week
      expect(history[1].choreName).toBe('Bathroom'); // Previous week
    });

    it('should include confirmation status', () => {
      const service = new HistoryService(mockState, mockConfig);
      const history = service.getMemberHistory('m1');

      expect(history[0].confirmed).toBe(false); // Current week not confirmed
      expect(history[1].confirmed).toBe(true); // Previous week confirmed
    });

    it('should return up to 4 weeks of history', () => {
      // Add more history
      for (let i = 0; i < 5; i++) {
        mockState.history.push({
          weekOf: `2026-01-${1 + i}T00:00:00.000Z`,
          rotationIndex: i,
          assignments: [
            {
              memberId: 'm1',
              choreId: 'c1',
              assignedAt: `2026-01-${1 + i}T01:00:00.000Z`,
              confirmationToken: `token-${i}`,
              confirmedAt: null,
              reminderSentAt: null,
            },
          ],
        });
      }

      const service = new HistoryService(mockState, mockConfig);
      const history = service.getMemberHistory('m1');

      expect(history.length).toBeLessThanOrEqual(4);
    });

    it('should return empty array for non-existent member', () => {
      const service = new HistoryService(mockState, mockConfig);
      const history = service.getMemberHistory('non-existent');

      expect(history).toHaveLength(0);
    });
  });

  describe('findMemberByToken', () => {
    it('should find member by current week token', () => {
      const service = new HistoryService(mockState, mockConfig);
      const memberId = service.findMemberByToken('token-current');

      expect(memberId).toBe('m1');
    });

    it('should return null for invalid token', () => {
      const service = new HistoryService(mockState, mockConfig);
      const memberId = service.findMemberByToken('invalid-token');

      expect(memberId).toBeNull();
    });

    it('should not find tokens from history', () => {
      const service = new HistoryService(mockState, mockConfig);
      const memberId = service.findMemberByToken('token-history-1');

      expect(memberId).toBeNull();
    });
  });

  describe('getMemberCompletionRate', () => {
    it('should calculate completion rate correctly', () => {
      const service = new HistoryService(mockState, mockConfig);
      const rate = service.getMemberCompletionRate('m1');

      // m1 has 2 assignments: 0 confirmed in current, 1 confirmed in history
      expect(rate.total).toBe(2);
      expect(rate.completed).toBe(1);
    });

    it('should return zero for non-existent member', () => {
      const service = new HistoryService(mockState, mockConfig);
      const rate = service.getMemberCompletionRate('non-existent');

      expect(rate.total).toBe(0);
      expect(rate.completed).toBe(0);
    });
  });
});
