/**
 * Calendar date manipulation utilities
 * All functions work with JavaScript Date objects
 */

/**
 * Get all days in a month (for calendar grid display)
 * Returns a 42-element array (6 weeks x 7 days) to fill calendar grid
 */
export function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Get first day of month
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

  // Get last day of month
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const days: Date[] = [];

  // Add days from previous month to fill first week
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Add all days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to complete 6 weeks (42 days)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * Get the 7 days of the current week (Sunday to Saturday)
 */
export function getWeekDays(date: Date): Date[] {
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const days: Date[] = [];

  // Get Sunday of this week
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);

  // Add all 7 days
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    days.push(day);
  }

  return days;
}

/**
 * Get the first moment of the month (00:00:00)
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get the last moment of the month (23:59:59.999)
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get the first moment of the week (Sunday 00:00:00)
 */
export function startOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * Get the last moment of the week (Saturday 23:59:59.999)
 */
export function endOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + (6 - dayOfWeek));
  saturday.setHours(23, 59, 59, 999);
  return saturday;
}

/**
 * Get the first moment of the day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

/**
 * Get the last moment of the day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(23, 59, 59, 999);
  return day;
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is the same month as another date
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Get month name (e.g., "January", "February")
 */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long" });
}

/**
 * Get short month name (e.g., "Jan", "Feb")
 */
export function getShortMonthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

/**
 * Get day name (e.g., "Monday", "Tuesday")
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * Get short day name (e.g., "Mon", "Tue")
 */
export function getShortDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Format date for input[type="date"] (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

/**
 * Group publications by date key (YYYY-MM-DD)
 */
export function groupPublicationsByDate<T extends { published_at: string }>(
  publications: T[]
): Record<string, T[]> {
  return publications.reduce((acc, pub) => {
    const date = new Date(pub.published_at);
    const dateKey = formatDateForInput(date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(pub);
    return acc;
  }, {} as Record<string, T[]>);
}
