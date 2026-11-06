import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import EventCard from '../components/EventCard';
import ProfileModal from '../components/ProfileModal';
import TopNavbar from '../components/TopNavbar';

export default function StudentDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (!error) {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F4F5] flex flex-col">
      <TopNavbar role="student" onProfileOpen={setIsProfileOpen} />

      <div className="bg-[#7A1F3D] w-full py-16 px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <h2 className="text-white text-3xl md:text-[40px] font-bold leading-tight max-w-[700px]">
            Book SUB venues.<br />Discover campus events.
          </h2>
          <p className="text-[#F3DCE4] text-sm md:text-base max-w-[482px]">
            One centralized platform for UTM students, clubs and societies.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <button onClick={() => window.location.href='/venues'} className="bg-[#F2B705] text-[#1F1A1C] font-semibold text-[13px] w-[160px] py-3 rounded-lg hover:bg-yellow-500 transition-colors flex justify-center items-center cursor-pointer">
              Book Venue
            </button>
            <button className="border border-white text-white font-semibold text-[13px] w-[160px] py-3 rounded-lg hover:bg-white/10 transition-colors flex justify-center items-center cursor-pointer">
              Browse Events
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-8 py-8 flex-grow">
        <h3 className="text-[#1F1A1C] text-xl font-bold mb-6">Upcoming & ongoing events</h3>
        
        {loading ? (
          <p className="text-[#6B6468]">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-[#6B6468]">No events found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard 
                key={event.event_id}
                title={event.event_name}
                club={event.club_name}
                date={event.event_date}
                startTime={event.start_time}
                endTime={event.end_time}
                venue={event.venue_name}
                isOpen={event.registration_open}
                imageUrl={event.poster_url}
              />
            ))}
          </div>
        )}
      </main>

      <button className="fixed bottom-8 right-8 bg-[#7A1F3D] w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-[#5c162d] transition-colors z-50 cursor-pointer">
        <span className="text-white text-lg font-bold">AI</span>
      </button>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}