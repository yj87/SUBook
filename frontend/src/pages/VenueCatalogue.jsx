import { useEffect, useState } from 'react';
import VenueCard from '../components/VenueCard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const navigation = [
  ['Home', '/student-dashboard'],
  ['Book Venue', '/venues'],
  ['Events', '#'],
  ['FAQ', '#'],
  ['Booking History', '#'],
  ['Lost Item', '#'],
  ['Feedback', '#'],
];

export default function VenueCatalogue() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <header className="border-b border-[#E3DEE0] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center gap-x-14 gap-y-3 px-5 py-3 sm:px-[60px] lg:flex-nowrap lg:py-0">
          <a href="/student-dashboard" className="shrink-0 text-[22px] font-bold text-[#7A1F3D]">SUBook</a>
          <nav aria-label="Main navigation" className="flex flex-1 flex-wrap items-center justify-start gap-x-7 gap-y-2 text-sm lg:justify-between">
            {navigation.map(([label, path]) => (
              <a key={label} href={path} aria-current={label === 'Book Venue' ? 'page' : undefined} className={label === 'Book Venue' ? 'font-semibold text-[#7A1F3D]' : 'hover:text-[#7A1F3D]'}>{label}</a>
            ))}
          </nav>
          <span className="rounded-lg bg-[#7A1F3D] px-6 py-[10px] text-[13px] font-semibold text-white">Student</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-7 sm:px-[60px]">
        <h1 className="text-[28px] font-bold">Select a Venue</h1>
        <p className="mt-1 text-sm text-[#6B6468]">Seven SUB venue types – choose one to check availability</p>
        {loading && <p role="status" className="mt-10 text-[#6B6468]">Loading venues…</p>}
        {!loading && error && <div role="alert" className="mt-8 rounded-xl border border-[#E3DEE0] bg-white p-5">{error}. Please check the backend and Supabase configuration.</div>}
        {!loading && !error && venues.length > 0 && <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{venues.map((venue) => <VenueCard key={venue.venue_id} venue={venue} />)}</div>}
        {!loading && !error && venues.length === 0 && <div className="mt-9 rounded-xl border border-[#E3DEE0] bg-white p-8 text-[#6B6468]">No venues are available in the catalogue yet.</div>}
      </main>
    </div>
  );
}
