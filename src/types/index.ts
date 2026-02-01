/** Member of the household */
export interface Member {
  id: string;
  name: string;
  phone: string; // E.164 format (e.g., +15551234567)
  isAdmin: boolean;
}

/** Chore definition */
export interface Chore {
  id: string;
  name: string;
  description: string;
}

/** Household settings */
export interface HouseholdConfig {
  name: string;
  timezone: string;
  rotationDay: number; // 0 = Sunday, 1 = Monday, etc.
  rotationHour: number; // 24-hour format
  reminderHoursAfter: number;
}

/** Full configuration file structure */
export interface Config {
  household: HouseholdConfig;
  members: Member[];
  chores: Chore[];
}

/** Single chore assignment for a week */
export interface Assignment {
  memberId: string;
  choreId: string;
  assignedAt: string; // ISO 8601
  confirmationToken: string;
  confirmedAt: string | null;
  reminderSentAt: string | null;
}

/** State for a single week */
export interface WeekState {
  weekOf: string; // ISO 8601, start of week
  rotationIndex: number;
  assignments: Assignment[];
}

/** Full application state */
export interface AppState {
  currentWeek: WeekState;
  history: WeekState[];
  lastUpdated: string;
}

/** API response for confirmation endpoint */
export interface ConfirmationResponse {
  success: boolean;
  message: string;
  memberName?: string;
  choreName?: string;
}

/** History entry for display */
export interface HistoryEntry {
  weekOf: string;
  choreName: string;
  choreDescription: string;
  confirmed: boolean;
  confirmedAt: string | null;
}
