import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

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

const photoByVenue = {
  'dance studio': 'Dance Studio.png',
  'seminar hall': 'Seminar Hall.png',
  'small meeting room': 'Small Meeting Room.png',
  'union parliament committee': 'Union Parliament Committee.png',
  'common meeting room': 'Common Meeting Room.png',
  'activity hall': 'Activity Hall.png',
  'open space': 'Open Space.png',
};

const money = (value) => (
  value == null || value === '' || !Number.isFinite(Number(value))
    ? 'Not set'
    : `RM ${Number(value).toFixed(2)}`
);

export default function VenueDetails() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadVenue() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API}/api/venues/${encodeURIComponent(venueId)}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to retrieve venue');
        setVenue(result.data);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') setError(fetchError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadVenue();
    return () => controller.abort();
  }, [venueId]);

  const photos = useMemo(() => {
    const photo = photoByVenue[String(venue?.venue_name || '').toLowerCase().trim()];
    return photo ? [`/venue-images/${photo}`] : [];
  }, [venue]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F6F4F5] text-[#6B6468]" role="status">Loading venue details…</div>;
  }

  if (error || !venue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F4F5] px-5 text-center">
        <p role="alert" className="rounded-xl border border-[#E3DEE0] bg-white p-6 text-[#6B6468]">{error || 'Venue not found'}</p>
        <Link to="/venues" className="font-semibold text-[#7A1F3D] hover:underline">Back to venue catalogue</Link>
      </div>
    );
  }

  const isAvailable = venue.venue_status === 'available';
  const activePhoto = selectedPhoto || photos[0] || '';

  return (
    <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
      <header className="border-b border-[#E3DEE0] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center gap-x-14 gap-y-3 px-5 py-3 sm:px-[60px] lg:flex-nowrap lg:py-0">
          <Link to="/student-dashboard" className="shrink-0 text-[22px] font-bold text-[#7A1F3D]">SUBook</Link>
          <nav aria-label="Main navigation" className="flex flex-1 flex-wrap items-center justify-start gap-x-7 gap-y-2 text-sm lg:justify-between">
            {navigation.map(([label, path]) => (
              <a key={label} href={path} aria-current={label === 'Book Venue' ? 'page' : undefined} className={label === 'Book Venue' ? 'font-semibold text-[#7A1F3D]' : 'hover:text-[#7A1F3D]'}>{label}</a>
            ))}
          </nav>
          <span className="rounded-lg bg-[#7A1F3D] px-6 py-[10px] text-[13px] font-semibold text-white">Student</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-7 sm:px-[60px]">
        <button type="button" onClick={() => navigate(-1)} className="mb-5 text-sm font-medium text-[#6B6468] hover:text-[#7A1F3D]">← Back</button>
        <h1 className="text-[28px] font-bold sm:text-[32px]">{venue.venue_name} – Venue Details</h1>
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-[#E3DEE0] bg-white p-4 sm:p-5" aria-label={`${venue.venue_name} photos`}>
            <div className="h-[260px] overflow-hidden rounded-lg bg-[#E9DDE1] sm:h-[390px]">
              {activePhoto ? <img src={activePhoto} alt={venue.venue_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-[#6B6468]">Venue image unavailable</div>}
            </div>
            {photos.length > 0 && (
              <div className="mt-3 flex gap-3">
                {photos.map((photo) => <button type="button" key={photo} onClick={() => setSelectedPhoto(photo)} className={`h-16 w-20 overflow-hidden rounded-md border-2 ${selectedPhoto === photo ? 'border-[#7A1F3D]' : 'border-transparent'}`}><img src={photo} alt="" className="h-full w-full object-cover" /></button>)}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#E3DEE0] bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1F1A1C]">{venue.venue_name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6468]">{venue.description || 'Venue details are available for your booking planning.'}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${isAvailable ? 'bg-[#EAF5EE] text-[#23613A]' : 'bg-[#F8E9EC] text-[#8B2949]'}`}>{isAvailable ? 'Available' : 'Unavailable'}</span>
            </div>
            <p className="mt-5 text-sm font-medium text-[#6B6468]">Maximum Capacity: <span className="font-bold text-[#1F1A1C]">{venue.capacity} people</span></p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-[#F6F4F5] p-4">
                <h3 className="text-sm font-bold text-[#7A1F3D]">Standard Booking Rate</h3>
                <p className="mt-3 text-sm text-[#6B6468]">Hourly: <strong className="text-[#1F1A1C]">{money(venue.hourly_rate)}</strong></p>
                <p className="mt-1 text-sm text-[#6B6468]">Daily: <strong className="text-[#1F1A1C]">{money(venue.daily_rate)}</strong></p>
              </div>
              <div className="rounded-lg bg-[#F6F4F5] p-4">
                <h3 className="text-sm font-bold text-[#7A1F3D]">Applicable Deposit</h3>
                <p className="mt-3 text-sm text-[#6B6468]">Hourly: <strong className="text-[#1F1A1C]">{money(venue.hourly_deposit)}</strong></p>
                <p className="mt-1 text-sm text-[#6B6468]">Daily: <strong className="text-[#1F1A1C]">{money(venue.daily_deposit)}</strong></p>
              </div>
            </div>

            <div className="mt-7 border-t border-[#E3DEE0] pt-5">
              <h3 className="text-base font-bold">Facilities</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B6468]">Facilities information is not included in the current venue catalogue data.</p>
            </div>

            <div className="mt-5 border-t border-[#E3DEE0] pt-5">
              <h3 className="text-base font-bold">Booking Requirements</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#6B6468]">
                <li>Submit your booking request at least 3 working days before the event.</li>
                <li>Use the venue only for the approved event purpose and return it in good condition.</li>
                <li>Club representatives must provide an event approval letter during the booking process.</li>
              </ul>
            </div>

            <button type="button" disabled={!isAvailable} onClick={() => navigate(`/venues/${encodeURIComponent(venue.venue_id)}/availability`)} className="mt-7 flex h-11 w-full items-center justify-center rounded-lg bg-[#7A1F3D] text-sm font-semibold text-white transition-colors hover:bg-[#651830] disabled:cursor-not-allowed disabled:opacity-50">{isAvailable ? 'Select Slot' : 'Venue Unavailable'}</button>
          </section>
        </div>
      </main>
    </div>
  );
}
