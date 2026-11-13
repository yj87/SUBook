import { useMemo, useState } from 'react';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  assignOverlapLanes,
  dateKey,
  formatDate,
  formatTime,
  getDayIndex,
  getHourlyPosition,
  normalizeBooking,
} from '../utils/bookingCalendar';
import { BOOKING_STATUS_TONE_CLASSES, getBookingStatusStyle } from '../utils/bookingStatusStyles';

function BookingCard({ booking, onSelect, compact = false, style }) {
  const status = getBookingStatusStyle(booking.status);
  return (
    <button
      type="button"
      title={`${booking.title} · ${booking.venueName}`}
      onClick={() => onSelect(booking)}
      style={style}
      className={`absolute z-[2] min-w-0 overflow-hidden rounded-md border border-l-4 p-1.5 text-left shadow-sm transition hover:z-10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#7A1F3D] ${BOOKING_STATUS_TONE_CLASSES[status.tone]}`}
    >
      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${status.dot}`} />
      <span className="block truncate text-[10px] font-bold leading-tight">{booking.venueName}</span>
      {!compact && <span className="block truncate text-[9px] leading-tight">{booking.title}</span>}
      <span className="block truncate text-[8px] leading-tight opacity-80">
        {booking.type === 'daily' ? 'Full day' : `${formatTime(booking.start)}–${formatTime(booking.end)}`}
      </span>
    </button>
  );
}

function BookingDetails({ booking, onClose }) {
  if (!booking) return null;
  const status = getBookingStatusStyle(booking.status);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="booking-details-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7A1F3D]">Booking details</p>
            <h4 id="booking-details-title" className="mt-1 text-lg font-bold text-[#1F1A1C]">{booking.title}</h4>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-[#6B6468]" aria-label="Close booking details">×</button>
        </div>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="font-semibold text-[#6B6468]">Venue</dt><dd className="min-w-0 break-words text-[#1F1A1C]">{booking.venueName}</dd>
          <dt className="font-semibold text-[#6B6468]">Date</dt><dd className="text-[#1F1A1C]">{formatDate(booking.start)}</dd>
          <dt className="font-semibold text-[#6B6468]">Time</dt><dd className="text-[#1F1A1C]">{booking.type === 'daily' ? 'Full day' : `${formatTime(booking.start)} – ${formatTime(booking.end)}`}</dd>
          <dt className="font-semibold text-[#6B6468]">Type</dt><dd className="text-[#1F1A1C]">{booking.type === 'daily' ? 'Full Day' : 'Hourly'}</dd>
          <dt className="font-semibold text-[#6B6468]">Status</dt><dd className="font-semibold text-[#1F1A1C]"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${status.dot}`} />{status.label}</dd>
        </dl>
        {booking.purpose && booking.purpose !== booking.title && <p className="mt-5 rounded-lg bg-[#FAF8F9] p-3 text-sm text-[#6B6468]">{booking.purpose}</p>}
      </section>
    </div>
  );
}

export default function BookingCalendar({ days, bookings, loading, error, onRetry }) {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const normalized = useMemo(() => bookings.map(normalizeBooking), [bookings]);
  const allDay = normalized.filter((booking) => booking.type === 'daily');
  const hourly = normalized.filter((booking) => booking.type !== 'daily');
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index);

  const dayBookings = (day) => hourly.filter((booking) => getDayIndex(booking, day));
  const allDayBookings = (day) => allDay.filter((booking) => getDayIndex(booking, day));

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-[#E3DEE0]" aria-label="Weekly booking calendar">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] border-b border-[#E3DEE0] bg-white">
            <div className="p-2" />
            {days.map((day) => <div key={dateKey(day)} className="border-l border-[#E3DEE0] px-2 py-3 text-center text-xs font-bold text-[#6B6468]">{formatDate(day)}</div>)}
          </div>

          <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] border-b border-[#E3DEE0] bg-[#FFFDFC]">
            <div className="px-2 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B6468]">All-day</div>
            {days.map((day) => (
              <div key={dateKey(day)} className="min-h-12 border-l border-[#E3DEE0] p-1">
                <div className="flex flex-col gap-1">
                  {allDayBookings(day).map((booking) => <button key={booking.booking_id} type="button" onClick={() => setSelectedBooking(booking)} title={`${booking.venueName} · Full day`} className={`truncate rounded border-l-4 px-2 py-1 text-left text-[10px] font-semibold ${BOOKING_STATUS_TONE_CLASSES[getBookingStatusStyle(booking.status).tone]}`}><span className="mr-1">●</span>{booking.venueName}<span className="ml-1 font-normal">· Full day</span></button>)}
                </div>
              </div>
            ))}
          </div>

          {loading && <div className="p-8 text-center text-sm text-[#6B6468]" role="status">Loading bookings…</div>}
          {!loading && error && <div className="p-8 text-center text-sm text-red-700" role="alert">{error} <button type="button" onClick={onRetry} className="ml-2 font-semibold underline">Try again</button></div>}
          {!loading && !error && normalized.length === 0 && <div className="p-8 text-center text-sm text-[#6B6468]">No bookings for this week.</div>}

          {!loading && !error && normalized.length > 0 && <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))]">
            <div className="relative" style={{ height: `${hours.length * 72}px` }}>{hours.map((hour) => <div key={hour} className="h-[72px] border-b border-[#EEE8EA] px-2 pt-1 text-right text-[10px] font-semibold text-[#6B6468]">{new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(2000, 0, 1, hour))}</div>)}</div>
            {days.map((day) => {
              const positioned = assignOverlapLanes(dayBookings(day));
              const laneCount = Math.max(1, positioned.reduce((max, item) => Math.max(max, item.lane + 1), 0));
              return <div key={dateKey(day)} className="relative border-l border-[#E3DEE0] bg-[#FAF8F9]" style={{ height: `${hours.length * 72}px` }}>
                {hours.map((hour) => <div key={hour} className="pointer-events-none h-[72px] border-b border-[#EEE8EA]" />)}
                {positioned.map(({ booking, lane }) => {
                  const position = getHourlyPosition(booking, day);
                  const gap = 4;
                  return <BookingCard key={booking.booking_id} booking={booking} onSelect={setSelectedBooking} style={{ top: position.top, height: position.height, left: `calc(${lane * (100 / laneCount)}% + ${gap / 2}px)`, width: `calc(${100 / laneCount}% - ${gap}px)` }} compact={position.height < 52} />;
                })}
              </div>;
            })}
          </div>}
        </div>
      </div>
      <BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    </>
  );
}
