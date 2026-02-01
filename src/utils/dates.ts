/**
 * Get the start of the week (Sunday) for a given date in the specified timezone.
 * Returns a Date object set to midnight UTC of that Sunday.
 */
export function getWeekStart(date: Date, _timezone: string): Date {
  // Create a new date to avoid mutating the original
  const d = new Date(date);

  // Get day of week (0 = Sunday)
  const day = d.getUTCDay();

  // Subtract days to get to Sunday
  d.setUTCDate(d.getUTCDate() - day);

  // Set to midnight UTC
  d.setUTCHours(0, 0, 0, 0);

  return d;
}

/**
 * Format a date for display (e.g., "Feb 1, 2026")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if a given number of hours have passed since a timestamp
 */
export function hoursElapsed(since: string, hours: number): boolean {
  const sinceTime = new Date(since).getTime();
  const now = Date.now();
  const elapsed = (now - sinceTime) / (1000 * 60 * 60);
  return elapsed >= hours;
}
