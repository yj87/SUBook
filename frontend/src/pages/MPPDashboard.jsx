import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProfileModal from '../components/ProfileModal';
import MPPSidebar from '../components/MPPSidebar';
import BookingCalendar from '../components/BookingCalendar';
import { API_BASE_URL } from '../config/api';
import { addDays, dateKey, getMalaysiaWeek } from '../utils/bookingCalendar';

export default function MPPDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [popover, setPopover] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const popoverRef = useRef(null);
  const weekDays = useMemo(() => getMalaysiaWeek(), []);

  const startDay = weekDays[0].getDate();
  const endDay = weekDays[6].getDate();
  const month = weekDays[0].toLocaleDateString('en-GB', { month: 'short' });
  const year = weekDays[0].getFullYear();
  const dateRangeStr = `${startDay} - ${endDay} ${month} ${year}`;

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

        const [totalRes, pendingRes, confirmedRes] = await Promise.all([
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: false }).limit(1)
            .gte('submitted_at', startOfMonth.toISOString()),
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: false }).limit(1)
            .in('status', ['pending_approval', 'payment_submitted']),
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: false }).limit(1)
            .eq('status', 'confirmed'),
        ]);

        if (cancelled) return;

        if (totalRes.error) console.error('Stats total:', totalRes.error);
        if (pendingRes.error) console.error('Stats pending:', pendingRes.error);
        if (confirmedRes.error) console.error('Stats confirmed:', confirmedRes.error);

        setStats({
          total: totalRes.count ?? 0,
          pending: pendingRes.count ?? 0,
          confirmed: confirmedRes.count ?? 0,
        });

        const startOfWeek = new Date(`${dateKey(weekDays[0])}T00:00:00+08:00`);
        const endOfWeek = addDays(startOfWeek, 7);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Your admin session has expired. Please sign in again.');

        const calendarResponse = await fetch(
          `${API_BASE_URL}/api/bookings/calendar?start=${encodeURIComponent(startOfWeek.toISOString())}&end=${encodeURIComponent(endOfWeek.toISOString())}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        
        const calendarBody = await calendarResponse.json();
        if (!calendarResponse.ok) throw new Error(calendarBody.error || 'Unable to load calendar bookings');

        if (cancelled) return;

        setCalendarError('');
        setBookings(calendarBody.bookings || []);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Calendar data:', error);
        setCalendarError(error.message || 'Unable to load calendar bookings');
        setBookings([]);
        setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { cancelled = true; };
  }, [refreshKey, weekDays]);

  const formatTimeLabel = (timeStr) => {
    const [hour] = timeStr.split(':');
    let h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:00 ${ampm}`;
  };

  const openPopover = (e, cellBookings, day, time) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      anchorRect: rect,
      bookings: cellBookings,
      title: `${day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTimeLabel(time)}`,
    });
  };

  const renderPopover = () => {
    if (!popover) return null;
    const { anchorRect, bookings: cellBookings, title } = popover;
    const popoverWidth = 288;
    const margin = 8;

    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    let top = anchorRect.bottom + margin;

    if (left < margin) left = margin;
    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }

    const estimatedHeight = Math.min(cellBookings.length * 60 + 60, 360);
    if (top + estimatedHeight > window.innerHeight - margin) {
      top = anchorRect.top - estimatedHeight - margin;
    }

    return (
      <div
        ref={popoverRef}
        style={{ position: 'fixed', left, top, width: popoverWidth }}
        className="z-[100] rounded-xl border border-[#E3DEE0] bg-white shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-[#E3DEE0] px-4 py-2.5">
          <p className="text-xs font-bold text-[#7A1F3D]">{title}</p>
          <button
            onClick={() => setPopover(null)}
            className="text-[#6B6468] hover:text-[#7A1F3D] text-lg leading-none cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-[#F0EBED]">
          {cellBookings.map((booking) => (
            <div key={booking.booking_id} className="px-4 py-2.5">
              <p className="text-sm font-semibold text-[#1F1A1C]">{booking.event_name}</p>
              <p className="mt-0.5 text-xs text-[#6B6468]">
                {booking.venues?.venue_name || 'Venue'} · {new Date(booking.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–{new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }; 

  const handleLogout = async () => {
    setLoggingOut(true);
    sessionStorage.removeItem('intended_portal');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      setLoggingOut(false);
      return;
    }
    setTimeout(() => window.location.replace('/login'), 600);
  };

  return (
    <div className="flex h-screen bg-[#F6F4F5] overflow-hidden relative">
      
      <MPPSidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        setIsProfileOpen={setIsProfileOpen} 
      />

      <main className="flex-1 flex flex-col p-4 md:p-10 overflow-hidden h-full">

        <div className="flex justify-between items-center md:block mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-[#1F1A1C] p-1 -ml-1 cursor-pointer" onClick={() => setIsMobileMenuOpen(true)}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div>
              <h2 className="text-[#1F1A1C] text-2xl md:text-[28px] font-bold">Admin Dashboard</h2>
              <p className="text-[#6B6468] text-sm">MPP – Student Union Building</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 md:gap-6 mb-8 shrink-0 w-full">
          <div className="bg-white rounded-xl border border-[#E3DEE0] flex-1 min-w-[140px] p-4 md:p-5 shadow-sm">
            <p className="text-[#6B6468] text-[10px] md:text-xs font-semibold mb-2">Submitted this month</p>
            <p className="text-[#7A1F3D] text-2xl md:text-[28px] font-bold">{loading ? '...' : stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E3DEE0] flex-1 min-w-[140px] p-4 md:p-5 shadow-sm">
            <p className="text-[#6B6468] text-[10px] md:text-xs font-semibold mb-2">Awaiting action</p>
            <p className="text-[#7A1F3D] text-2xl md:text-[28px] font-bold">{loading ? '...' : stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E3DEE0] flex-1 min-w-[140px] p-4 md:p-5 shadow-sm">
            <p className="text-[#6B6468] text-[10px] md:text-xs font-semibold mb-2">Confirmed bookings</p>
            <p className="text-[#7A1F3D] text-2xl md:text-[28px] font-bold">{loading ? '...' : stats.confirmed}</p>
          </div>

          <div className="w-full md:w-auto flex items-center justify-start md:justify-end">
            <button 
              onClick={() => navigate('/mpp-dashboard/requests')} 
              className="bg-[#F2B705] text-[#1F1A1C] text-[13px] font-semibold rounded-lg px-6 h-11 hover:bg-yellow-500 transition-colors w-full md:w-auto cursor-pointer"
            >
              View Pending →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E3DEE0] p-4 md:p-6 shadow-sm flex flex-col flex-grow overflow-hidden">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
              <h3 className="text-[#1F1A1C] text-lg md:text-xl font-bold">This Week</h3>
              <span className="text-[#6B6468] text-sm font-medium">({dateRangeStr})</span>
            </div>
            <button className="bg-[#F2B705] text-[#1F1A1C] text-[11px] font-semibold rounded-lg px-4 py-2 hover:bg-yellow-500 transition-colors cursor-pointer">
              View Full Calendar →
            </button>
          </div>

          <div className="min-h-0 flex-grow overflow-auto pb-1">
            <BookingCalendar
              days={weekDays}
              bookings={bookings}
              loading={loading}
              error={calendarError}
              onRetry={() => setRefreshKey((value) => value + 1)}
            />
          </div>
        </div>

      </main>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}