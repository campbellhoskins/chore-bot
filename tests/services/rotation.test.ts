import { describe, it, expect } from 'vitest';
import { RotationService } from '../../src/services/rotation.js';
import type { Config } from '../../src/types/index.js';

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
    { id: 'm3', name: 'Charlie', phone: '+3333', isAdmin: false },
  ],
  chores: [
    { id: 'c1', name: 'Kitchen', description: 'Clean kitchen' },
    { id: 'c2', name: 'Bathroom', description: 'Clean bathroom' },
    { id: 'c3', name: 'Vacuum', description: 'Vacuum floors' },
  ],
};

describe('RotationService', () => {
  describe('constructor', () => {
    it('should throw if members and chores count mismatch', () => {
      const badConfig = {
        ...mockConfig,
        chores: mockConfig.chores.slice(0, 2),
      };

      expect(() => new RotationService(badConfig)).toThrow();
    });

    it('should not throw for valid config', () => {
      expect(() => new RotationService(mockConfig)).not.toThrow();
    });
  });

  describe('calculateAssignments', () => {
    it('should create correct assignments for rotation index 0', () => {
      const service = new RotationService(mockConfig);
      const assignments = service.calculateAssignments(0);

      expect(assignments).toHaveLength(3);
      expect(assignments[0].memberId).toBe('m1');
      expect(assignments[0].choreId).toBe('c1'); // Alice -> Kitchen
      expect(assignments[1].memberId).toBe('m2');
      expect(assignments[1].choreId).toBe('c2'); // Bob -> Bathroom
      expect(assignments[2].memberId).toBe('m3');
      expect(assignments[2].choreId).toBe('c3'); // Charlie -> Vacuum
    });

    it('should rotate assignments correctly for index 1', () => {
      const service = new RotationService(mockConfig);
      const assignments = service.calculateAssignments(1);

      expect(assignments[0].choreId).toBe('c2'); // Alice -> Bathroom
      expect(assignments[1].choreId).toBe('c3'); // Bob -> Vacuum
      expect(assignments[2].choreId).toBe('c1'); // Charlie -> Kitchen
    });

    it('should rotate assignments correctly for index 2', () => {
      const service = new RotationService(mockConfig);
      const assignments = service.calculateAssignments(2);

      expect(assignments[0].choreId).toBe('c3'); // Alice -> Vacuum
      expect(assignments[1].choreId).toBe('c1'); // Bob -> Kitchen
      expect(assignments[2].choreId).toBe('c2'); // Charlie -> Bathroom
    });

    it('should generate unique tokens for each assignment', () => {
      const service = new RotationService(mockConfig);
      const assignments = service.calculateAssignments(0);

      const tokens = assignments.map((a) => a.confirmationToken);
      const uniqueTokens = new Set(tokens);

      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should set confirmedAt and reminderSentAt to null', () => {
      const service = new RotationService(mockConfig);
      const assignments = service.calculateAssignments(0);

      for (const assignment of assignments) {
        expect(assignment.confirmedAt).toBeNull();
        expect(assignment.reminderSentAt).toBeNull();
      }
    });
  });

  describe('createNewWeek', () => {
    it('should start at index 0 for first week (null previous)', () => {
      const service = new RotationService(mockConfig);
      const newWeek = service.createNewWeek(null);

      expect(newWeek.rotationIndex).toBe(0);
    });

    it('should start at index 0 for first week (-1 previous)', () => {
      const service = new RotationService(mockConfig);
      const newWeek = service.createNewWeek(-1);

      expect(newWeek.rotationIndex).toBe(0);
    });

    it('should increment rotation index', () => {
      const service = new RotationService(mockConfig);
      const newWeek = service.createNewWeek(0);

      expect(newWeek.rotationIndex).toBe(1);
    });

    it('should wrap rotation index correctly', () => {
      const service = new RotationService(mockConfig);
      const newWeek = service.createNewWeek(2); // Previous was 2, should wrap to 0

      expect(newWeek.rotationIndex).toBe(0);
    });

    it('should include a valid weekOf date', () => {
      const service = new RotationService(mockConfig);
      const newWeek = service.createNewWeek(null);

      expect(newWeek.weekOf).toBeTruthy();
      expect(() => new Date(newWeek.weekOf)).not.toThrow();
    });
  });

  describe('getAssignmentDetails', () => {
    it('should return member and chore for valid assignment', () => {
      const service = new RotationService(mockConfig);
      const assignments = service.calculateAssignments(0);

      const { member, chore } = service.getAssignmentDetails(assignments[0]);

      expect(member.id).toBe('m1');
      expect(member.name).toBe('Alice');
      expect(chore.id).toBe('c1');
      expect(chore.name).toBe('Kitchen');
    });

    it('should throw for invalid member ID', () => {
      const service = new RotationService(mockConfig);
      const invalidAssignment = {
        memberId: 'invalid',
        choreId: 'c1',
        assignedAt: new Date().toISOString(),
        confirmationToken: 'token',
        confirmedAt: null,
        reminderSentAt: null,
      };

      expect(() => service.getAssignmentDetails(invalidAssignment)).toThrow();
    });
  });

  describe('getAdmins', () => {
    it('should return only admin members', () => {
      const service = new RotationService(mockConfig);
      const admins = service.getAdmins();

      expect(admins).toHaveLength(1);
      expect(admins[0].name).toBe('Alice');
    });
  });
});
