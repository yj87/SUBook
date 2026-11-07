import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ProfileModal from '../components/ProfileModal';
import TopNavbar from '../components/TopNavbar';

export default function ClubDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const fetchClubBookings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('club_id')
        .eq('representative_id', user.id)
        .single();

      if (clubError || !clubData) {
        console.log("No club found for this user.");
        setLoading(false);
        return;
      }

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (venue_name)
        `)
        .eq('club_id', clubData.club_id)
        .order('submitted_at', { ascending: false });

      if (!bookingsError) {
        setBookings(bookingsData || []);
      }
      setLoading(false);
    };

    fetchClubBookings();
  }, []);

  const formatDateTime = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const dateStr = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '');
    const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '');
    
    return `${dateStr} · ${startTime}–${endTime}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_approval':
        return <span className="inline-block bg-[#FFF3CD] text-[#8A6D00] text-xs font-semibold px-3 py-1.5 rounded-lg">Pending Approval</span>;
      case 'approved_awaiting_payment':
        return <span className="inline-block bg-[#DCE8FF] text-[#1F4FA3] text-xs font-semibold px-3 py-1.5 rounded-lg">Approved – Awaiting Payment</span>;
      case 'confirmed':
        return <span className="inline-block bg-[#D4F1DC] text-[#17703A] text-xs font-semibold px-3 py-1.5 rounded-lg">Confirmed</span>;
      case 'rejected':
        return <span className="inline-block bg-[#FFE5E5] text-[#D32F2F] text-xs font-semibold px-3 py-1.5 rounded-lg">Rejected</span>;
      default:
        return <span className="inline-block bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4F5] flex flex-col">
      <TopNavbar role="club_representative" onProfileOpen={setIsProfileOpen} />
      
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex-grow">
        
        <div className="mb-8">
          <h2 className="text-[#1F1A1C] text-2xl md:text-[28px] font-bold">Club Dashboard</h2>
          <p className="text-[#6B6468] text-sm">Computing Society</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-[#E3DEE0] shadow-sm">
            <p className="text-[#6B6468] text-xs font-semibold mb-2">Total Bookings</p>
            <p className="text-[#7A1F3D] text-[28px] font-bold">{loading ? '...' : bookings.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E3DEE0] shadow-sm">
            <p className="text-[#6B6468] text-xs font-semibold mb-2">Upcoming Bookings</p>
            <p className="text-[#7A1F3D] text-[28px] font-bold">{loading ? '...' : bookings.filter(b => b.status === 'confirmed').length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E3DEE0] shadow-sm">
            <p className="text-[#6B6468] text-xs font-semibold mb-2">Pending Approvals</p>
            <p className="text-[#7A1F3D] text-[28px] font-bold">{loading ? '...' : bookings.filter(b => b.status === 'pending_approval').length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E3DEE0] shadow-sm">
            <p className="text-[#6B6468] text-xs font-semibold mb-2">Published Events</p>
            <p className="text-[#7A1F3D] text-[28px] font-bold">0</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => window.location.href='/venues'} className="bg-[#7A1F3D] text-white text-[13px] font-semibold w-full sm:w-[180px] py-3 rounded-lg hover:bg-[#5c162d] transition-colors cursor-pointer">
            Book Venue
          </button>
          <button className="bg-[#F2B705] text-[#1F1A1C] text-[13px] font-semibold w-full sm:w-[180px] py-3 rounded-lg hover:bg-yellow-600 transition-colors cursor-pointer">
            Publish Event
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#E3DEE0] shadow-sm p-4 md:p-6">
          <h3 className="text-[#1F1A1C] text-lg md:text-xl font-bold mb-4">Booking History</h3>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-[#E3DEE0]">
                  <th className="py-3 text-[#1F1A1C] text-sm font-semibold">Event Name</th>
                  <th className="py-3 text-[#1F1A1C] text-sm font-semibold">Venue</th>
                  <th className="py-3 text-[#1F1A1C] text-sm font-semibold">Date & Time</th>
                  <th className="py-3 text-[#1F1A1C] text-sm font-semibold">Status</th>
                  <th className="py-3 text-[#1F1A1C] text-sm font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="py-8 text-center text-[#6B6468]">Loading bookings...</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-[#6B6468]">No bookings found for this club.</td></tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.booking_id} className="border-b border-[#E3DEE0] last:border-0">
                      <td className="py-4 text-[#1F1A1C] text-sm font-semibold">{booking.event_name}</td>
                      <td className="py-4 text-[#1F1A1C] text-sm font-semibold">{booking.venues?.venue_name || 'Unknown Venue'}</td>
                      <td className="py-4 text-[#6B6468] text-[13px]">{formatDateTime(booking.start_time, booking.end_time)}</td>
                      <td className="py-4">{getStatusBadge(booking.status)}</td>
                      <td className="py-4 text-right">
                        {booking.status === 'approved_awaiting_payment' && (
                          <button className="bg-[#F2B705] text-[#1F1A1C] text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-yellow-500 transition-colors">
                            Proceed to Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}