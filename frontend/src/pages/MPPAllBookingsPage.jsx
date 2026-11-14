import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MPPSidebar from '../components/MPPSidebar';
import ProfileModal from '../components/ProfileModal';
import { API_BASE_URL, fetchVenues } from '../config/api';
import { dateKey, formatDate, formatTime, normalizeBooking } from '../utils/bookingCalendar';
import { getBookingStatusStyle } from '../utils/bookingStatusStyles';
import { supabase } from '../supabaseClient';

const PAGE_SIZE = 5;

function BookingDetails({ booking, onClose }) {
  if (!booking) return null;
  const status = getBookingStatusStyle(booking.status);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onMouseDown={onClose}>
    <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#7A1F3D]">Booking details</p><h2 className="mt-1 text-lg font-bold text-[#1F1A1C]">{booking.title}</h2></div><button type="button" onClick={onClose} className="text-2xl leading-none text-[#6B6468]" aria-label="Close booking details">&times;</button></div>
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm"><dt className="font-semibold text-[#6B6468]">Booking Reference</dt><dd className="break-words font-mono text-[#1F1A1C]">{booking.booking_ref || '—'}</dd><dt className="font-semibold text-[#6B6468]">Venue</dt><dd className="text-[#1F1A1C]">{booking.venueName}</dd><dt className="font-semibold text-[#6B6468]">Date</dt><dd className="text-[#1F1A1C]">{formatDate(booking.start)}</dd><dt className="font-semibold text-[#6B6468]">Time</dt><dd className="text-[#1F1A1C]">{booking.type === 'daily' ? 'Full day' : `${formatTime(booking.start)} – ${formatTime(booking.end)}`}</dd><dt className="font-semibold text-[#6B6468]">Status</dt><dd className="font-semibold text-[#1F1A1C]"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${status.dot}`} />{status.label}</dd></dl>
    </section>
  </div>;
}

function statusLabel(status) {
  if (status === 'pending_approval') return 'Pending Approval';
  if (status === 'approved_awaiting_payment') return 'Awaiting Payment';
  return getBookingStatusStyle(status).label;
}

export default function MPPAllBookingsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState(params.get('scope') === 'past' ? 'past' : 'active');
  const [search, setSearch] = useState('');
  const [venueId, setVenueId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => { fetchVenues().then((body) => setVenues(body.data || [])).catch(() => setVenues([])); }, []);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Your admin session has expired. Please sign in again.');
        const query = new URLSearchParams({ scope });
        if (venueId) query.set('venue_id', venueId);
        const response = await fetch(`${API_BASE_URL}/api/bookings/management?${query}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load bookings');
        if (!cancelled) setBookings((body.bookings || []).map(normalizeBooking));
      } catch (loadError) { if (!cancelled) { setError(loadError.message); setBookings([]); } }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [scope, venueId]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const requester = booking.profiles?.full_name || '';
      const matchesSearch = !query || [requester, booking.booking_ref, booking.booking_id, booking.title].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = !statusFilter || booking.status === statusFilter;
      const matchesDate = !dateFilter || dateKey(booking.start) === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bookings, dateFilter, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const visibleBookings = filteredBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectScope = (next) => { setScope(next); setPage(1); setParams(next === 'active' ? {} : { scope: next }); };
  const activeCount = scope === 'active' ? bookings.length : undefined;

  return <div className="flex min-h-screen bg-[#F6F4F5]"><MPPSidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} setIsProfileOpen={setIsProfileOpen} /><main className="min-w-0 flex-1 p-4 md:p-10">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-[#6B6468]">Calendar <span className="mx-1">/</span> <span className="font-semibold text-[#7A1F3D]">All Bookings</span></p><h1 className="mt-2 text-2xl font-bold text-[#1F1A1C] md:text-[28px]">All Bookings</h1><p className="mt-1 text-sm text-[#6B6468]">MPP – Student Union Building</p></div><div className="text-right"><p className="text-xs font-semibold text-[#1F1A1C]">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</p><p className="mt-1 text-[10px] text-[#6B6468]">All students, clubs & societies</p></div></div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><button type="button" onClick={() => selectScope('active')} className={`rounded-full px-5 py-2 text-xs font-semibold ${scope === 'active' ? 'bg-[#7A1F3D] text-white' : 'bg-[#E3DEE0] text-[#1F1A1C]'}`}>Active bookings ({activeCount ?? '…'})</button><button type="button" onClick={() => selectScope('past')} className={`rounded-full px-5 py-2 text-xs font-semibold ${scope === 'past' ? 'bg-[#7A1F3D] text-white' : 'bg-[#E3DEE0] text-[#1F1A1C]'}`}>Past bookings</button></div><button type="button" onClick={() => navigate('/mpp-dashboard/calendar')} className="text-xs font-semibold text-[#7A1F3D]">Calendar</button></div>
    <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(240px,1fr)_auto_auto_auto]"><div className="flex items-center rounded-lg border border-[#E3DEE0] bg-white px-3"><span className="mr-2 text-[#6B6468]">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search requester or booking ID" className="w-full bg-transparent py-2 text-xs outline-none" /></div><select value={venueId} onChange={(event) => { setVenueId(event.target.value); setPage(1); }} className="rounded-lg border border-[#E3DEE0] bg-white px-3 py-2 text-xs text-[#6B6468]"><option value="">All venues</option>{venues.map((venue) => <option key={venue.venue_id} value={venue.venue_id}>{venue.venue_name}</option>)}</select><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-lg border border-[#E3DEE0] bg-white px-3 py-2 text-xs text-[#6B6468]"><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="approved_awaiting_payment">Awaiting Payment</option><option value="pending_approval">Pending Approval</option></select><input type="date" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1); }} aria-label="Filter by date" title="Select a date" className="rounded-lg border border-[#E3DEE0] bg-white px-3 py-2 text-xs text-[#6B6468]" /></div>
    {loading && <div className="rounded-xl border border-[#E3DEE0] bg-white p-10 text-center text-sm text-[#6B6468]">Loading bookings…</div>}{!loading && error && <div className="rounded-xl border border-red-200 bg-white p-10 text-center text-sm text-red-700">{error}</div>}{!loading && !error && <div className="overflow-hidden rounded-xl border border-[#E3DEE0] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-[#E3DEE0] bg-[#FAF8F9] text-[10px] text-[#6B6468]"><tr><th className="px-4 py-3">Requester</th><th className="px-4 py-3">Venue / Booking ID</th><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{visibleBookings.map((booking) => { const status = getBookingStatusStyle(booking.status); const requester = booking.profiles?.full_name || 'Unknown requester'; const role = booking.profiles?.role === 'club_representative' ? 'Club' : 'Student'; return <tr key={booking.booking_id} className="border-b border-[#EEE8EA] align-middle hover:bg-[#FAF8F9]"><td className="px-4 py-3"><p className="font-semibold text-[#1F1A1C]">{requester}</p><p className="mt-1 text-[10px] text-[#6B6468]">{role}{booking.profiles?.matric_no ? ` · ${booking.profiles.matric_no}` : ''}</p></td><td className="px-4 py-3"><p className="font-semibold text-[#1F1A1C]">{booking.venueName}</p><p className="mt-1 font-mono text-[10px] text-[#6B6468]">{booking.booking_ref || '—'}</p></td><td className="px-4 py-3 text-[#6B6468]"><p className="text-[#1F1A1C]">{formatDate(booking.start)}</p><p className="mt-1 text-[10px]">{booking.type === 'daily' ? 'Full day' : `${formatTime(booking.start)}–${formatTime(booking.end)}`}</p></td><td className="max-w-[180px] px-4 py-3 text-[#6B6468]">{booking.purpose || booking.title}</td><td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.tone === 'green' ? 'bg-[#CDEFD6] text-[#17703A]' : status.tone === 'red' ? 'bg-red-100 text-red-800' : 'bg-[#FFF3CD] text-[#8A6D00]'}`}>{statusLabel(booking.status)}</span></td><td className="px-4 py-3"><button type="button" onClick={() => setSelected(booking)} className="inline-flex items-center gap-1 rounded-lg border border-[#E3DEE0] bg-[#FAF8F9] px-2.5 py-1.5 text-[10px] font-semibold text-[#7A1F3D]"><span>◉</span> View Details</button></td></tr>; })}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[10px] text-[#6B6468]"><span>Showing {filteredBookings.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredBookings.length)} of {filteredBookings.length} {scope} bookings</span><div className="flex items-center gap-3"><span>{PAGE_SIZE} per page</span><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="disabled:opacity-30">‹</button>{Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 3).map((value) => <button type="button" key={value} onClick={() => setPage(value)} className={`h-6 w-6 rounded-md ${page === value ? 'bg-[#7A1F3D] text-white' : ''}`}>{value}</button>)}<button type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="disabled:opacity-30">›</button></div></div></div>}
  </main><ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} /><BookingDetails booking={selected} onClose={() => setSelected(null)} /></div>;
}
