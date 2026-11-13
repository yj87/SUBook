export const CALENDAR_TIMEZONE = 'Asia/Kuala_Lumpur';
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 24;

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALENDAR_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const dateKey = (value) => dateFormatter.format(new Date(value));

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getMalaysiaWeek = (now = new Date()) => {
  const parts = dateKey(now).split('-').map(Number);
  const monday = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};

export const normalizeBooking = (booking) => ({
  ...booking,
  title: booking.event_name || booking.purpose || 'Untitled booking',
  venueName: booking.venues?.venue_name || 'Venue',
  type: booking.booking_type === 'daily' ? 'daily' : 'hourly',
  start: new Date(booking.start_time),
  end: new Date(booking.end_time),
});

export const isVisibleBooking = (booking) =>
  ['pending_approval', 'approved_awaiting_payment', 'confirmed'].includes(booking.status);

export const getDayIndex = (booking, day) => {
  const key = dateKey(day);
  const startKey = dateKey(booking.start);
  const endKey = dateKey(new Date(booking.end.getTime() - 1));
  return key >= startKey && key <= endKey;
};

export const getHourlyPosition = (booking, day) => {
  const dayStart = new Date(day);
  dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(DAY_END_HOUR, 0, 0, 0);
  const start = Math.max(booking.start.getTime(), dayStart.getTime());
  const end = Math.min(booking.end.getTime(), dayEnd.getTime());
  const top = ((start - dayStart.getTime()) / 3600000) * 72;
  const height = Math.max(28, ((end - start) / 3600000) * 72 - 4);
  return { top, height };
};

export const assignOverlapLanes = (bookings) => {
  const lanes = [];
  return [...bookings]
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .map((booking) => {
      let lane = lanes.findIndex((lastEnd) => lastEnd <= booking.start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(booking.end);
      } else {
        lanes[lane] = booking.end;
      }
      return { booking, lane };
    });
};

export const formatTime = (value) => new Intl.DateTimeFormat('en-US', {
  timeZone: CALENDAR_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

export const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  timeZone: CALENDAR_TIMEZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}).format(new Date(value));
