import { describe, expect, it } from 'vitest';
import { getCalendarDays } from './availabilityCalendar';

describe('getCalendarDays', () => {
  it('aligns November 2026 on Sunday and returns 30 dates', () => {
    const days = getCalendarDays(2026, 10);
    expect(days.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(days[6]).toBe('2026-11-01');
    expect(days.filter(Boolean)).toHaveLength(30);
    expect(days).toHaveLength(42);
  });

  it('supports leap-year February', () => {
    expect(getCalendarDays(2028, 1).filter(Boolean)).toHaveLength(29);
    expect(getCalendarDays(2027, 1).filter(Boolean)).toHaveLength(28);
  });
});
