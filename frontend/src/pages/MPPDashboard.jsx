import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../components/ProfileModal';

// Helper to get the dates for the current week (Monday to Sunday)
const getWeekDays = () => {
  const current = new Date();
  const day = current.getDay();
  // Calculate distance to Monday (if today is Sunday (0), distance is 6)
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(current.setDate(diff));
  monday.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

// Generate time slots from 8 AM to 12 AM
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', 
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'
];

export default function MPPDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const navigate = useNavigate();
  const weekDays = getWeekDays();

  // Format the week range string (e.g., "2 - 8 Nov 2026")
  const startDay = weekDays[0].getDate();
  const endDay = weekDays[6].getDate();
  const month = weekDays[0].toLocaleDateString('en-GB', { month: 'short' });
  const year = weekDays[0].getFullYear();
  const dateRangeStr = `${startDay} - ${endDay} ${month} ${year}`;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // 1. Fetch Stats
      const [totalRes, pendingRes, confirmedRes] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('submitted_at', startOfMonth.toISOString()),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')
      ]);

      setStats({
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        confirmed: confirmedRes.count || 0
      });

      // 2. Fetch Calendar Bookings
      // Get start and end of the week in ISO format to match your TIMESTAMPTZ column
      const startOfWeek = weekDays[0].toISOString();
      const endOfWeek = new Date(weekDays[6]);
      endOfWeek.setHours(23, 59, 59, 999); // Ensure we get bookings up to the end of Sunday

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (venue_name)
        `)
        .eq('status', 'confirmed')
        .gte('date', startOfWeek)
        .lte('date', endOfWeek.toISOString());

      setBookings(bookingsData || []);
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

 const handleLogout = async () => {
    setLoggingOut(true);
    sessionStorage.removeItem('intended_portal');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error.message);
      setLoggingOut(false);
      return;
    }

    setTimeout(() => {
      window.location.replace('/login');
    }, 600);
  };

  const formatTimeLabel = (timeStr) => {
    const [hour] = timeStr.split(':');
    let h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:00 ${ampm}`;
  };

  const getBookingForSlot = (dateObj, timeSlot) => {
    // Compare dates using local timezone YYYY-MM-DD to avoid UTC offset issues
    const dateString = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
    
    return bookings.find(booking => {
      // Parse booking date the same way
      const bookingDateObj = new Date(booking.date);
      const bookingDateString = new Date(bookingDateObj.getTime() - (bookingDateObj.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
        
      if (bookingDateString !== dateString) return false;

      const bookingStart = booking.start_time.substring(11, 16); // Extracts "HH:MM" from ISO string
      const slotEnd = timeSlot === '00:00' ? '24:00' : `${(parseInt(timeSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;

      return bookingStart >= timeSlot && bookingStart < slotEnd;
    });
  };

  return (
    <div className="flex h-screen bg-[#F6F4F5] overflow-hidden relative">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
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
          <button onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }} className="text-left text-sm font-semibold hover:text-[#E9C7D3] transition-colors cursor-pointer">
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

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col p-4 md:p-10 overflow-hidden h-full">
        
        {/* Mobile Header */}
        <div className="flex justify-between items-center md:block mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-[#1F1A1C] p-1 -ml-1" onClick={() => setIsMobileMenuOpen(true)} cursor-pointer>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div>
              <h2 className="text-[#1F1A1C] text-2xl md:text-[28px] font-bold">Admin Dashboard</h2>
              <p className="text-[#6B6468] text-sm">MPP – Student Union Building</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="flex flex-wrap gap-4 md:gap-6 mb-8 shrink-0 w-full">
          <div className="bg-white rounded-xl border border-[#E3DEE0] flex-1 min-w-[140px] p-4 md:p-5 shadow-sm">
            <p className="text-[#6B6468] text-[10px] md:text-xs font-semibold mb-2">Total bookings (this month)</p>
            <p className="text-[#7A1F3D] text-2xl md:text-[28px] font-bold">{loading ? '...' : stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E3DEE0] flex-1 min-w-[140px] p-4 md:p-5 shadow-sm">
            <p className="text-[#6B6468] text-[10px] md:text-xs font-semibold mb-2">Pending approvals</p>
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

        {/* Calendar Section */}
        <div className="bg-white rounded-xl border border-[#E3DEE0] p-4 md:p-6 shadow-sm flex flex-col flex-grow overflow-hidden">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
              <h3 className="text-[#1F1A1C] text-lg md:text-xl font-bold">This Week</h3>
              {/* ADDED DATE RANGE HERE */}
              <span className="text-[#6B6468] text-sm font-medium">({dateRangeStr})</span>
            </div>
            <button className="bg-[#F2B705] text-[#1F1A1C] text-[11px] md:text-[11px] font-semibold rounded-lg px-4 py-2 hover:bg-yellow-500 transition-colors cursor-pointer">
              View Full Calendar →
            </button>
          </div>

          {/* Responsive Scrollable Calendar Grid */}
          <div className="flex-grow overflow-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="min-w-[800px] flex flex-col gap-2 pb-4">
              
              {/* Header Row (Days) */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] md:grid-cols-[80px_repeat(7,1fr)] gap-1 md:gap-2 sticky top-0 bg-white z-10">
                <div></div>
                {weekDays.map((day, index) => (
                  <div key={index} className="text-center text-[#6B6468] text-[10px] md:text-xs font-semibold pb-2">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              {timeSlots.map((time, timeIndex) => (
                <div key={time} className="grid grid-cols-[60px_repeat(7,1fr)] md:grid-cols-[80px_repeat(7,1fr)] gap-1 md:gap-2 h-[70px]">
                  
                  {/* Time Label */}
                  <div className="flex items-start justify-end text-[#6B6468] text-[9px] md:text-[11px] font-semibold pr-1 md:pr-2 pt-1">
                    {formatTimeLabel(time)}
                  </div>

                  {/* Day Cells */}
                  {weekDays.map((day, dayIndex) => {
                    const booking = getBookingForSlot(day, time);
                    
                    return (
                      <div key={dayIndex} className="bg-[#FAF8F9] border border-[#E3DEE0] rounded-md p-1">
                        {booking && (
                          <div className="w-full h-full bg-[#CDEFD6] rounded p-1 md:p-2 overflow-hidden flex flex-col gap-0.5 shadow-sm">
                            <p className="text-[#17703A] text-[8px] md:text-[10px] font-semibold leading-tight truncate">
                              {booking.event_name}
                            </p>
                            <p className="text-[#17703A] text-[7px] md:text-[9px] leading-tight truncate">
                              - {booking.venues?.venue_name || 'Venue'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

            </div>
          </div>
        </div>

      </main>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}