import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MPPSidebar from '../components/MPPSidebar';
import ProfileModal from '../components/ProfileModal';
import { API_BASE_URL, fetchVenues } from '../config/api';
import { assignOverlapLanes, dateKey, formatDate, formatTime, normalizeBooking } from '../utils/bookingCalendar';
import { getBookingStatusStyle } from '../utils/bookingStatusStyles';
import { supabase } from '../supabaseClient';

const CALENDAR_VIEWS = ['monthly', 'weekly', 'daily', 'list'];
const toMalaysiaDate = (value) => new Date(`${dateKey(value)}T00:00:00+08:00`);
const addDays = (value, days) => {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};
const startOfWeek = (value) => {
  const result = toMalaysiaDate(value);
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - (day === 0 ? 6 : day - 1));
  return result;
};
const startOfMonthGrid = (value) => {
  const monthStart = toMalaysiaDate(value);
  monthStart.setUTCDate(1);
  const day = monthStart.getUTCDay();
  monthStart.setUTCDate(monthStart.getUTCDate() - day);
  return monthStart;
};
const formatHour = (hour) => new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(2000, 0, 1, hour));
const formatWeekHeading = (start, end) => {
  const startParts = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).formatToParts(start);
  const endParts = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).formatToParts(end);
  const startMonth = startParts.find((part) => part.type === 'month')?.value;
  const startDay = startParts.find((part) => part.type === 'day')?.value;
  const endMonth = endParts.find((part) => part.type === 'month')?.value;
  const endDay = endParts.find((part) => part.type === 'day')?.value;
  const year = endParts.find((part) => part.type === 'year')?.value;
  return startMonth === endMonth ? `${startMonth} ${startDay} – ${endDay}, ${year}` : `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
};

function BookingDetails({ booking, onClose }) {
  if (!booking) return null;
  const status = getBookingStatusStyle(booking.status);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="calendar-booking-details" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7A1F3D]">Booking details</p>
            <h2 id="calendar-booking-details" className="mt-1 text-lg font-bold text-[#1F1A1C]">{booking.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-[#6B6468]" aria-label="Close booking details">×</button>
        </div>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="font-semibold text-[#6B6468]">Booking Reference</dt><dd className="min-w-0 break-words text-[#1F1A1C]">{booking.booking_ref || '—'}</dd>
          <dt className="font-semibold text-[#6B6468]">Venue</dt><dd className="text-[#1F1A1C]">{booking.venueName}</dd>
          <dt className="font-semibold text-[#6B6468]">Date</dt><dd className="text-[#1F1A1C]">{formatDate(booking.start)}</dd>
          <dt className="font-semibold text-[#6B6468]">Time</dt><dd className="text-[#1F1A1C]">{booking.type === 'daily' ? 'Full day' : `${formatTime(booking.start)} – ${formatTime(booking.end)}`}</dd>
          <dt className="font-semibold text-[#6B6468]">Type</dt><dd className="text-[#1F1A1C]">{booking.type === 'daily' ? 'Full Day' : 'Hourly'}</dd>
          <dt className="font-semibold text-[#6B6468]">Status</dt><dd className="font-semibold text-[#1F1A1C]"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${status.dot}`} />{status.label}</dd>
        </dl>
      </section>
    </div>
  );
}

function BookingChip({ booking, onClick, compact = false, timeline = false }) {
  const status = getBookingStatusStyle(booking.status);
  return <button type="button" onClick={() => onClick(booking)} title={`${booking.title} · ${booking.venueName} · ${booking.booking_ref || 'No reference'}`} className={`block h-full w-full overflow-hidden rounded border-l-4 px-2 py-1 text-left text-[10px] ${status.tone === 'green' ? 'border-emerald-300 bg-[#CDEFD6] text-[#17703A]' : 'border-slate-300 bg-slate-50 text-slate-800'}`}>
    {timeline ? <><span className="block truncate font-bold leading-tight">{booking.title}</span><span className="block truncate text-[9px] leading-tight">{booking.venueName}</span><span className="block truncate text-[9px] leading-tight">{booking.type === 'daily' ? 'Full day' : `${formatTime(booking.start)}–${formatTime(booking.end)}`}</span></> : <><span className="mr-1">{booking.venueName}</span>{!compact && <span className="font-normal">· {booking.title}</span>}</>}
  </button>;
}

function MonthlyView({ date, bookings, onSelect }) {
  const first = startOfMonthGrid(date);
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index));
  const monthKey = dateKey(date).slice(0, 7);
  return <div className="overflow-x-auto rounded-xl border border-[#E3DEE0] bg-white"><div className="min-w-[760px]">
    <div className="grid grid-cols-7 border-b border-[#E3DEE0]">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <div key={day} className="p-3 text-center text-xs font-semibold text-[#6B6468]">{day}</div>)}</div>
    <div className="grid grid-cols-7">{days.map((day) => {
      const items = bookings.filter((booking) => dateKey(booking.start) <= dateKey(day) && dateKey(booking.end) >= dateKey(day));
      const inMonth = dateKey(day).startsWith(monthKey);
      return <div key={dateKey(day)} className={`min-h-[112px] border-b border-l border-[#E3DEE0] p-2 ${inMonth ? 'bg-white' : 'bg-[#FAF8F9]'}`}><p className={`mb-1 text-xs font-semibold ${dateKey(day) === dateKey(new Date()) ? 'text-[#7A1F3D]' : inMonth ? 'text-[#1F1A1C]' : 'text-[#C0BAC0]'}`}>{day.getUTCDate()}</p><div className="space-y-1">{items.slice(0, 3).map((booking) => <BookingChip key={booking.booking_id} booking={booking} onClick={onSelect} compact />)}{items.length > 3 && <button type="button" className="text-[10px] font-semibold text-[#17703A]" onClick={() => onSelect(items[3])}>+{items.length - 3} more</button>}</div></div>;
    })}</div>
  </div></div>;
}

function TimelineView({ date, bookings, onSelect, daily = false }) {
  const days = daily ? [toMalaysiaDate(date)] : Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
  const startHour = 8;
  const endHour = 24;
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const gridColumns = { gridTemplateColumns: `64px repeat(${days.length}, minmax(120px, 1fr))` };
  return <div className="overflow-auto rounded-xl border border-[#E3DEE0] bg-white"><div className="min-w-[820px]">
    <div className="grid border-b border-[#E3DEE0]" style={gridColumns}> <div className="p-3 text-[10px] font-semibold uppercase text-[#6B6468]">Time</div>{days.map((day) => <div key={dateKey(day)} className="border-l border-[#E3DEE0] p-3 text-center text-xs font-semibold uppercase text-[#6B6468]">{formatDate(day)}</div>)}</div>
    {bookings.some((booking) => booking.type === 'daily') && <div className="grid border-b border-[#E3DEE0] bg-[#FFFDFC]" style={gridColumns}><div className="p-2 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B6468]">All-day</div>{days.map((day) => <div key={dateKey(day)} className="border-l border-[#E3DEE0] p-1">{bookings.filter((booking) => booking.type === 'daily' && dateKey(booking.start) <= dateKey(day) && dateKey(booking.end) >= dateKey(day)).map((booking) => <BookingChip key={booking.booking_id} booking={booking} onClick={onSelect} />)}</div>)}</div>}
     <div className="grid" style={gridColumns}> <div>{hours.map((hour) => <div key={hour} className="h-[68px] border-b border-[#EEE8EA] pr-2 pt-1 text-right text-[10px] text-[#6B6468]">{formatHour(hour)}</div>)}</div>{days.map((day) => { const items = bookings.filter((booking) => dateKey(booking.start) <= dateKey(day) && dateKey(booking.end) >= dateKey(day) && booking.type !== 'daily'); const positioned = assignOverlapLanes(items); const laneCount = Math.max(1, positioned.reduce((max, item) => Math.max(max, item.lane + 1), 0)); return <div key={dateKey(day)} className="relative border-l border-[#E3DEE0] bg-[#FAF8F9]" style={{ height: `${hours.length * 68}px` }}>{hours.map((hour) => <div key={hour} className="h-[68px] border-b border-[#EEE8EA]" />)}{positioned.map(({ booking, lane }) => { const timelineStart = day.getTime() + startHour * 3600000; const timelineEnd = day.getTime() + endHour * 3600000; const start = Math.max(booking.start.getTime(), timelineStart); const end = Math.min(booking.end.getTime(), timelineEnd); return <div key={booking.booking_id} className="absolute px-0.5" style={{ top: `${Math.max(0, (start - timelineStart) / 3600000 * 68)}px`, height: `${Math.max(28, (end - start) / 3600000 * 68 - 3)}px`, left: `calc(${lane * 100 / laneCount}% + 2px)`, width: `calc(${100 / laneCount}% - 4px)` }}><BookingChip booking={booking} onClick={onSelect} timeline /></div>; })}</div>; })}</div>
  </div></div>;
}

function BookingList({ bookings, onSelect }) {
  return <div className="overflow-x-auto rounded-xl border border-[#E3DEE0] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#E3DEE0] bg-[#FAF8F9] text-xs uppercase tracking-wide text-[#6B6468]"><tr><th className="px-4 py-3">Booking Reference</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Venue</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{bookings.map((booking) => { const status = getBookingStatusStyle(booking.status); return <tr key={booking.booking_id} className="border-b border-[#EEE8EA] hover:bg-[#FAF8F9]"><td className="px-4 py-3 font-mono text-xs"><button type="button" className="font-semibold text-[#7A1F3D]" onClick={() => onSelect(booking)}>{booking.booking_ref || '—'}</button></td><td className="px-4 py-3 font-semibold text-[#1F1A1C]">{booking.title}</td><td className="px-4 py-3 text-[#6B6468]">{booking.venueName}</td><td className="px-4 py-3 text-[#6B6468]">{formatDate(booking.start)}</td><td className="px-4 py-3 text-[#6B6468]">{booking.type === 'daily' ? 'Full day' : `${formatTime(booking.start)} – ${formatTime(booking.end)}`}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${status.tone === 'green' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{status.label}</span></td></tr>; })}</tbody></table>{bookings.length === 0 && <p className="p-10 text-center text-sm text-[#6B6468]">No bookings found.</p>}</div>;
}

export default function MPPCalendarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(CALENDAR_VIEWS.includes(params.get('view')) ? params.get('view') : 'monthly');
  const [date, setDate] = useState(new Date());
  const [venueId, setVenueId] = useState('');
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchVenues().then((body) => setVenues(body.data || [])).catch(() => setVenues([])); }, []);
  const range = useMemo(() => {
    if (view === 'monthly') { const start = startOfMonthGrid(date); return [start, addDays(start, 42)]; }
    if (view === 'weekly') { const start = startOfWeek(date); return [start, addDays(start, 7)]; }
    return [toMalaysiaDate(date), addDays(toMalaysiaDate(date), 1)];
  }, [date, view]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Your admin session has expired. Please sign in again.');
        const endpoint = view === 'list' ? `${API_BASE_URL}/api/bookings/management?scope=active&confirmed_only=true${venueId ? `&venue_id=${encodeURIComponent(venueId)}` : ''}` : `${API_BASE_URL}/api/bookings/calendar?start=${encodeURIComponent(range[0].toISOString())}&end=${encodeURIComponent(range[1].toISOString())}${venueId ? `&venue_id=${encodeURIComponent(venueId)}` : ''}`;
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load bookings');
        if (!cancelled) setBookings((body.bookings || []).map(normalizeBooking));
      } catch (loadError) { if (!cancelled) { setError(loadError.message); setBookings([]); } }
      finally { if (!cancelled) setLoading(false); }
    };
    load(); return () => { cancelled = true; };
  }, [range, venueId, view]);

  const shift = (amount) => { const next = new Date(date); if (view === 'monthly') next.setMonth(next.getMonth() + amount); else next.setDate(next.getDate() + (view === 'weekly' ? amount * 7 : amount)); setDate(next); };
  const changeView = (next) => { setView(next); setParams(next === 'monthly' ? {} : { view: next }); };
  const heading = view === 'monthly' ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date) : view === 'weekly' ? formatWeekHeading(range[0], addDays(range[1], -1)) : formatDate(date);

  return <div className="flex min-h-screen bg-[#F6F4F5]"><MPPSidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} setIsProfileOpen={setIsProfileOpen} /><main className="min-w-0 flex-1 p-4 md:p-10"><div className="mb-6 flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-[#1F1A1C] md:text-[28px]">Calendar</h1><p className="text-sm text-[#6B6468]">Event Schedule</p></div><button type="button" onClick={() => navigate('/mpp-dashboard/bookings')} className="rounded-full bg-[#7A1F3D] px-5 py-2.5 text-xs font-semibold text-white">All Bookings</button></div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex rounded-lg bg-[#E3DEE0] p-1">{CALENDAR_VIEWS.map((item) => <button type="button" key={item} onClick={() => changeView(item)} className={`rounded-md px-4 py-2 text-xs font-semibold capitalize ${view === item ? 'bg-[#7A1F3D] text-white' : 'text-[#6B6468]'}`}>{item}</button>)}</div><div className="flex flex-wrap items-center gap-2"><select value={venueId} onChange={(event) => setVenueId(event.target.value)} className="rounded-lg border border-[#E3DEE0] bg-white px-3 py-2 text-sm text-[#1F1A1C]"><option value="">All venues</option>{venues.map((venue) => <option key={venue.venue_id} value={venue.venue_id}>{venue.venue_name}</option>)}</select>{view !== 'list' && <><button type="button" onClick={() => shift(-1)} className="rounded-md bg-[#E3DEE0] px-3 py-2 text-lg leading-none">‹</button><button type="button" onClick={() => setDate(new Date())} className="rounded-md border border-[#E3DEE0] bg-white px-3 py-2 text-xs font-semibold">Today</button><button type="button" onClick={() => shift(1)} className="rounded-md bg-[#E3DEE0] px-3 py-2 text-lg leading-none">›</button></>}</div></div>
    <h2 className="mb-4 text-lg font-bold text-[#1F1A1C]">{view === 'list' ? 'Active Bookings' : heading}</h2>
    {loading && <div className="rounded-xl border border-[#E3DEE0] bg-white p-10 text-center text-sm text-[#6B6468]">Loading bookings…</div>}{!loading && error && <div className="rounded-xl border border-red-200 bg-white p-10 text-center text-sm text-red-700">{error}</div>}{!loading && !error && view === 'monthly' && <MonthlyView date={date} bookings={bookings} onSelect={setSelectedBooking} />}{!loading && !error && view === 'weekly' && <TimelineView date={date} bookings={bookings} onSelect={setSelectedBooking} />}{!loading && !error && view === 'daily' && <TimelineView date={date} bookings={bookings} onSelect={setSelectedBooking} daily />}{!loading && !error && view === 'list' && <BookingList bookings={bookings} onSelect={setSelectedBooking} />}
  </main><ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} /><BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} /></div>;
}
