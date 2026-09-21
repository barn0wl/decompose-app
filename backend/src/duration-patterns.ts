// prisma/data/duration-patterns.ts
// Time-of-day and day-of-week multipliers applied to motorized transit durations.
// These are static config, tuned for Abidjan traffic patterns.
// Walking edges are NOT affected (walking is not traffic-sensitive).

export interface TimeOfDayBucket {
  hours: number[];        // 24h local time (GMT for Abidjan)
  multiplier: number;
  label: string;
}

export const TIME_OF_DAY_MULTIPLIERS: TimeOfDayBucket[] = [
  { hours: [0, 1, 2, 3, 4],       multiplier: 0.75, label: 'Night' },
  { hours: [5, 6],                 multiplier: 0.85, label: 'Early morning' },
  { hours: [7, 8, 9],              multiplier: 1.6,  label: 'Morning rush' },
  { hours: [10, 11, 12, 13, 14],   multiplier: 1.1,  label: 'Midday' },
  { hours: [15, 16, 17, 18, 19],   multiplier: 1.7,  label: 'Evening rush' },
  { hours: [20, 21, 22, 23],       multiplier: 0.9,  label: 'Evening' },
];

export const DAY_OF_WEEK_MULTIPLIERS: Record<number, number> = {
  0: 1.0,   // Sunday
  1: 1.15,  // Monday
  2: 1.15,  // Tuesday
  3: 1.15,  // Wednesday
  4: 1.15,  // Thursday
  5: 1.25,  // Friday
  6: 1.0,   // Saturday
};

/**
 * Get the time-of-day multiplier for a given date.
 * Uses UTC hours — Abidjan is GMT (UTC+0), so no offset needed.
 */
export function getTimeOfDayMultiplier(at: Date): { multiplier: number; label: string } {
  const hour = at.getUTCHours();
  for (const bucket of TIME_OF_DAY_MULTIPLIERS) {
    if (bucket.hours.includes(hour)) {
      return { multiplier: bucket.multiplier, label: bucket.label };
    }
  }
  // Fallback (should never happen)
  return { multiplier: 1.0, label: 'Unknown' };
}

/**
 * Get the day-of-week multiplier for a given date.
 * 0 = Sunday, 6 = Saturday (matches Date.getUTCDay()).
 */
export function getDayOfWeekMultiplier(at: Date): number {
  const dow = at.getUTCDay();
  return DAY_OF_WEEK_MULTIPLIERS[dow] ?? 1.0;
}

/**
 * Composite multiplier: timeOfDay × dayOfWeek.
 * Applied to motorized edge durations at query time.
 */
export function getCompositeDurationMultiplier(at: Date): {
  multiplier: number;
  timeOfDayLabel: string;
} {
  const tod = getTimeOfDayMultiplier(at);
  const dow = getDayOfWeekMultiplier(at);
  return {
    multiplier: tod.multiplier * dow,
    timeOfDayLabel: tod.label,
  };
}
