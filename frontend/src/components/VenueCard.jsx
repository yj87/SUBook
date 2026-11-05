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

export default function VenueCard({ venue }) {
  const photo = photoByVenue[String(venue.venue_name || '').toLowerCase().trim()];
  const isAvailable = venue.venue_status === 'available';
  const pricing = [
    { title: 'Hourly', rate: venue.hourly_rate, deposit: venue.hourly_deposit, unit: '/ hour' },
    { title: 'Daily', rate: venue.daily_rate, deposit: venue.daily_deposit, unit: '/ day' },
  ];

  return (
    <article className="flex min-h-[315px] flex-col overflow-hidden rounded-xl border border-[#E3DEE0] bg-white">
      <div className="h-[100px] shrink-0 bg-[#E9DDE1]">
        {photo && (
          <img
            src={`/venue-images/${photo}`}
            alt={venue.venue_name}
            className="h-full w-full object-cover"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h2 className="min-h-[36px] text-[15px] font-bold leading-snug">{venue.venue_name}</h2>
        <p className="mt-1 text-xs text-[#6B6468]">Capacity: {venue.capacity} people</p>
        {venue.description && <p className="mt-2 text-xs text-[#6B6468]">{venue.description}</p>}
        <div className="my-4 grid grid-cols-2 divide-x divide-[#E3DEE0] rounded-lg bg-[#F6F4F5] py-3">
          {pricing.map(({ title, rate, deposit, unit }) => (
            <div key={title} className="px-2">
              <p className="text-[11px] font-semibold text-[#6B6468]">{title}</p>
              <p className="mt-1 text-[13px] font-bold text-[#7A1F3D]">
                {money(rate)}
                {rate != null && rate !== '' && <span className="text-[10px] font-normal text-[#6B6468]"> {unit}</span>}
              </p>
              <p className="mt-1 text-[11px] text-[#6B6468]">Deposit: {money(deposit)}</p>
            </div>
          ))}
        </div>
        <a
          href={isAvailable ? `/venues/${encodeURIComponent(venue.venue_id)}` : undefined}
          aria-disabled={!isAvailable}
          onClick={(event) => { if (!isAvailable) event.preventDefault(); }}
          className={`mt-auto flex h-[38px] items-center justify-center rounded-lg bg-[#7A1F3D] px-2 text-center text-[13px] font-semibold text-white ${isAvailable ? 'hover:bg-[#651830]' : 'pointer-events-none opacity-50'}`}
        >
          Check Availability
        </a>
      </div>
    </article>
  );
}
