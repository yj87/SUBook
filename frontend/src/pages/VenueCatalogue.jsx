import { useEffect, useState } from 'react';
import VenueCard from '../components/VenueCard';
import TopNavbar from '../components/TopNavbar';
import ProfileModal from '../components/ProfileModal';
import { supabase } from '../supabaseClient';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function VenueCatalogue() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('student');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (!cancelled && !error && profile?.role) {
        setRole(profile.role);
      }
    };
    loadRole();
    return () => { cancelled = true; };
  }, []);

  
  useEffect(() => {
    const controller = new AbortController();

    async function loadVenues() {
      try {
        const response = await fetch(`${API}/api/venues`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to retrieve venues');
        const result = await response.json();
        setVenues(result.data || []);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') setError(fetchError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadVenues();
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
        <TopNavbar role={role} onProfileOpen={setIsProfileOpen} />
      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-7 sm:px-[60px]">
        <h1 className="text-[28px] font-bold">Select a Venue</h1>
        <p className="mt-1 text-sm text-[#6B6468]">Seven SUB venue types – choose one to check availability</p>
        {loading && <p role="status" className="mt-10 text-[#6B6468]">Loading venues…</p>}
        {!loading && error && <div role="alert" className="mt-8 rounded-xl border border-[#E3DEE0] bg-white p-5">{error}. Please check the backend and Supabase configuration.</div>}
        {!loading && !error && venues.length > 0 && <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{venues.map((venue) => <VenueCard key={venue.venue_id} venue={venue} />)}</div>}
        {!loading && !error && venues.length === 0 && <div className="mt-9 rounded-xl border border-[#E3DEE0] bg-white p-8 text-[#6B6468]">No venues are available in the catalogue yet.</div>}
      </main>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}