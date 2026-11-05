import { Link, useSearchParams } from 'react-router-dom';

export default function BookingRequestPlaceholder() {
  const [params] = useSearchParams();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F4F5] px-5 font-inter text-[#1F1A1C]">
      <section className="w-full max-w-lg rounded-xl border border-[#E3DEE0] bg-white p-7">
        <h1 className="text-2xl font-bold">Booking request</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6B6468]">Your venue and time selection has been preserved. The booking request form will be connected here when that flow is available.</p>
        <dl className="mt-5 space-y-2 text-sm text-[#6B6468]">
          <div className="flex justify-between gap-4"><dt>Venue ID</dt><dd className="font-semibold text-[#1F1A1C]">{params.get('venueId') || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt>Date</dt><dd className="font-semibold text-[#1F1A1C]">{params.get('date') || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt>Start</dt><dd className="font-semibold text-[#1F1A1C]">{params.get('startTime') || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt>End</dt><dd className="font-semibold text-[#1F1A1C]">{params.get('endTime') || '—'}</dd></div>
        </dl>
        <Link to={params.get('venueId') ? `/venues/${encodeURIComponent(params.get('venueId'))}/availability` : '/venues'} className="mt-7 inline-flex rounded-lg bg-[#7A1F3D] px-5 py-3 text-sm font-semibold text-white">Back to availability</Link>
      </section>
    </main>
  );
}
