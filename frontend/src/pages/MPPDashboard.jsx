import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import ProfileModal from '../components/ProfileModal';
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
  const [loggingOut, setLoggingOut] = useState(false);
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

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-[220px] bg-[#7A1F3D] text-white flex flex-col justify-between shrink-0 h-full transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          <div className="px-6 pt-6 pb-4 flex justify-between items-center">
            <div>
              <h1 className="text-[22px] font-bold">SUBook</h1>
              <p className="text-[#E9C7D3] text-xs">MPP Admin</p>
            </div>
            <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <nav className="flex flex-col mt-4">
            <a href="#" className="bg-[#5E1730] px-6 py-4 text-sm font-semibold">Dashboard</a>
            <a href="#" className="px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors">My Approval</a>
            <a href="#" className="px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors">Calendar</a>
            <a href="#" className="px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors">Venue Management</a>
            <a href="#" className="px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors">Transaction History</a>
            <a href="#" className="px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors">Reports & Analytics</a>
          </nav>
        </div>

        <div className="p-6 border-t border-[#5E1730] flex flex-col gap-4">
          <button
            onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }}
            className="text-left text-sm font-semibold hover:text-[#E9C7D3] transition-colors cursor-pointer"
          >
            Profile Settings
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 text-left text-sm font-semibold hover:text-[#E9C7D3] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loggingOut && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {loggingOut ? 'Logging out…' : 'Log Out'}
          </button>
        </div>
      </aside>

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
            <button className="bg-[#F2B705] text-[#1F1A1C] text-[13px] font-semibold rounded-lg px-6 h-11 hover:bg-yellow-500 transition-colors w-full md:w-auto cursor-pointer">
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
