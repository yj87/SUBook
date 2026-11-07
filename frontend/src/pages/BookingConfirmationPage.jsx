import { Link, useSearchParams } from 'react-router-dom';

export default function BookingConfirmationPage() {
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId') || '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F4F5] px-5 font-inter">
      <section className="w-full max-w-lg rounded-xl border border-[#E3DEE0] bg-white p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#CDEFD6]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5L10 17.5L19 8.5" stroke="#17703A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold">Booking submitted</h1>
        <p className="mt-2 text-sm text-[#6B6468]">
          Your request has been sent to MPP for approval.
        </p>
        <p className="mt-4 rounded-lg bg-[#F9F7F8] px-3 py-2 text-xs text-[#6B6468]">
          Reference: <span className="font-semibold text-[#1F1A1C]">{bookingId || '—'}</span>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/venues"
            className="rounded-lg border border-[#7A1F3D] px-4 py-2 text-sm font-semibold text-[#7A1F3D] hover:bg-[#FAF3F6]"
          >
            Book another
          </Link>
          <Link
            to="/student-dashboard"
            className="rounded-lg bg-[#7A1F3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#651830]"
          >
            Back to Dashboard
          </Link>
        </div>
        <p className="mt-6 text-xs text-[#6B6468]">
          (C4 will replace this with the full reference + summary.)
        </p>
      </section>
    </main>
  );
}