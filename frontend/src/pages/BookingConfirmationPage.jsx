import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import ProfileModal from '../components/ProfileModal';
import { supabase } from '../supabaseClient';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kuala_Lumpur',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-MY', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kuala_Lumpur',
});

const currency = (value) =>
  value == null || value === '' ? '—' : `RM${Number(value).toFixed(2)}`;

export default function BookingConfirmationPage() {
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId') || '';

  const [booking, setBooking] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState('student');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dashboardPath =
    role === 'club_representative' ? '/club-dashboard'
    : role === 'mpp_admin' ? '/mpp-dashboard'
    : '/student-dashboard';

  const faqPath =
    role === 'club_representative' ? '/club-faq' : '/student-faq';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!bookingId) {
          setError('No booking reference provided.');
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('You must be signed in to view this confirmation.');
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (profile?.role) setRole(profile.role);

        const { data: row, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            booking_id,
            booking_ref,
            venue_id,
            booking_type,
            purpose,
            expected_attendees,
            start_time,
            end_time,
            status,
            quoted_rate,
            quoted_deposit,
            submitted_at
          `)
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (bookingError) throw bookingError;
        if (!row) throw new Error('Booking not found.');

        if (cancelled) return;
        setBooking(row);

        const venueRes = await fetch(
          `${API}/api/venues/${encodeURIComponent(row.venue_id)}`
        );
        if (venueRes.ok) {
          const body = await venueRes.json();
          if (!cancelled) setVenue(body.data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [bookingId]);

  const copyReference = async () => {
    if (!booking?.booking_ref) return;
    try {
      await navigator.clipboard.writeText(booking.booking_ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  };

  const total = Number(booking?.quoted_rate || 0) + Number(booking?.quoted_deposit || 0);

  const dateLabel = booking
    ? SHORT_DATE_FORMATTER.format(new Date(booking.start_time))
    : '—';

  const timeLabel = booking
    ? booking.booking_type === 'daily'
      ? '8:00 AM – 12:00 AM'
      : `${TIME_FORMATTER.format(new Date(booking.start_time))} – ${TIME_FORMATTER.format(new Date(booking.end_time))}`
    : '—';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
        <TopNavbar role={role} onProfileOpen={setIsProfileOpen} />
        <main className="mx-auto max-w-[1280px] px-5 py-16 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#7A1F3D] border-t-transparent" />
          <p className="mt-4 text-sm text-[#6B6468]">Loading confirmation…</p>
        </main>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
        <TopNavbar role={role} onProfileOpen={setIsProfileOpen} />
        <main className="mx-auto max-w-[1280px] px-5 py-16">
          <div className="mx-auto max-w-lg rounded-xl border border-[#E3DEE0] bg-white p-6 text-center">
            <p className="text-sm text-red-700">{error || 'Booking not found.'}</p>
            <Link
              to="/venues"
              className="mt-4 inline-block rounded-lg bg-[#7A1F3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#651830]"
            >
              ← Back to venues
            </Link>
          </div>
        </main>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
      <TopNavbar role={role} onProfileOpen={setIsProfileOpen} />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 sm:px-[60px]">
        <div className="mx-auto max-w-[640px]">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#CDEFD6] shadow-sm">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5L10 17.5L19 8.5"
                  stroke="#17703A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h1 className="mt-6 text-center text-[28px] font-bold">
            Booking Submitted Successfully
          </h1>
          <p className="mt-2 text-center text-sm text-[#6B6468]">
            Your booking request is now awaiting MPP review.
          </p>

          {/* Status badge */}
          <div className="mt-6 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF3CD] px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#8A6D00]" />
              <span className="text-xs font-semibold text-[#8A6D00]">
                Pending Approval
              </span>
            </span>
          </div>

          {/* Summary */}
          <div className="mt-8 rounded-xl border border-[#E3DEE0] bg-white p-6">
            <h2 className="text-base font-bold text-[#1F1A1C]">Booking Summary</h2>

            <dl className="mt-4 space-y-3 text-[13px]">
                <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Booking reference</dt>
                <dd className="flex items-center gap-2 text-right font-mono font-semibold text-[#1F1A1C]">
                  <span>{booking.booking_ref || '—'}</span>
                  <button
                    type="button"
                    onClick={copyReference}
                    className="text-[#7A1F3D] hover:underline cursor-pointer"
                    title="Copy booking reference"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Venue</dt>
                <dd className="text-right font-semibold text-[#1F1A1C]">
                  {venue?.venue_name || '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Booking type</dt>
                <dd className="text-right font-semibold text-[#1F1A1C]">
                  {booking.booking_type === 'daily' ? 'Full day' : 'Hourly'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Date</dt>
                <dd className="text-right font-semibold text-[#1F1A1C]">{dateLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Time</dt>
                <dd className="text-right font-semibold text-[#1F1A1C]">{timeLabel}</dd>
              </div>
              {booking.expected_attendees > 1 && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B6468]">Attendees</dt>
                  <dd className="text-right font-semibold text-[#1F1A1C]">
                    {booking.expected_attendees}
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Purpose</dt>
                <dd className="max-w-[60%] text-right font-semibold text-[#1F1A1C]">
                  {booking.purpose}
                </dd>
              </div>

              <div className="border-t border-[#E3DEE0] pt-3">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B6468]">
                    {booking.booking_type === 'daily' ? 'Daily rental' : 'Hourly rental'}
                  </dt>
                  <dd className="text-right font-semibold text-[#1F1A1C]">
                    {currency(booking.quoted_rate)}
                  </dd>
                </div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <dt className="text-[#6B6468]">Refundable deposit</dt>
                  <dd className="text-right font-semibold text-[#1F1A1C]">
                    {currency(booking.quoted_deposit)}
                  </dd>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-[#FAF3F6] px-3 py-2.5">
                  <span className="text-[13px] font-semibold text-[#7A1F3D]">Total</span>
                  <span className="text-base font-bold text-[#7A1F3D]">
                    {currency(total)}
                  </span>
                </div>
                <p className="mt-2 text-center text-[11px] text-[#6B6468]">
                  Deposit is refundable after the venue is returned in good condition.
                </p>
              </div>
            </dl>
          </div>

          {/* What next */}
          <div className="mt-6 rounded-xl border border-[#E3DEE0] bg-white p-6">
            <h2 className="text-base font-bold text-[#1F1A1C]">What happens next?</h2>
            <ol className="mt-4 space-y-3 text-[13px] text-[#6B6468]">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF3F6] text-xs font-bold text-[#7A1F3D]">1</span>
                <span>MPP will reviews your booking request.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF3F6] text-xs font-bold text-[#7A1F3D]">2</span>
                <span>If approved, you'll receive a notification and be required to pay within a 24-hour deadline.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF3F6] text-xs font-bold text-[#7A1F3D]">3</span>
                <span>Once paid, your booking will be confirmed.</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/venues"
              className="rounded-lg border border-[#7A1F3D] bg-white px-5 py-3 text-[13px] font-semibold text-[#7A1F3D] hover:bg-[#FAF3F6]"
            >
              Book another venue
            </Link>
            <Link
              to={dashboardPath}
              className="rounded-lg bg-[#7A1F3D] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#651830]"
            >
              Back to Dashboard
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-[#6B6468]">
            Need help? Check the{' '}
            <Link to={faqPath} className="font-semibold text-[#7A1F3D] hover:underline">
              FAQ
            </Link>{' '}
            or contact MPP.
          </p>
        </div>
      </main>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}