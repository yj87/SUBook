import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  value == null || value === ''
    ? '—'
    : `RM${Number(value).toFixed(2)}`;

export default function BookingRequestPlaceholder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const venueId = params.get('venueId') || '';
  const bookingType = params.get('bookingType') || 'hourly';
  const date = params.get('date') || '';
  const dates = params.get('dates') || '';
  const startTime = params.get('startTime') || '';
  const endTime = params.get('endTime') || '';
  const duration = params.get('duration') || '';
  const days = params.get('days') || '';

  const [venue, setVenue] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [purpose, setPurpose] = useState('');
  const [phone, setPhone] = useState('');
  const [attendees, setAttendees] = useState('1');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Initialize role as null to prevent flickering
  const [role, setRole] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setLoadError('You must be signed in.');
            setLoading(false);
          }
          return;
        }

        const [profileRes, venueRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, matric_no, phone_no, role')
            .eq('profile_id', user.id)
            .maybeSingle(),
          fetch(`${API}/api/venues/${encodeURIComponent(venueId)}`),
        ]);

        if (profileRes.error) throw profileRes.error;
        if (!profileRes.data) throw new Error('Profile not found');

        if (!venueRes.ok) {
          const body = await venueRes.json().catch(() => ({}));
          throw new Error(body.error || 'Unable to load venue');
        }
        const venueBody = await venueRes.json();

        if (cancelled) return;

        setProfile(profileRes.data);
        
        // --- FIXED ROLE LOGIC ---
        const currentRole = profileRes.data.role || 'student';
        setRole(currentRole);
        setVenue(venueBody.data);

        // If Club Rep, redirect to the Approval Letter page
        if (currentRole === 'club_representative') {
          const queryParams = params.toString();
          navigate(`/booking-request/approval?${queryParams}`, { replace: true });
          return; // Stop loading the rest of this page
        }

        // Student logic continues here
        const stored = profileRes.data.phone_no || '';
        setPhone(
          stored.startsWith('+60')
            ? stored.slice(3)
            : stored.replace(/^\+/, '')
        );
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [venueId, navigate, params]);

  const isShared = venue?.is_shared === true;

  const summaryRate = bookingType === 'daily'
    ? Number(venue?.daily_rate || 0)
    : Number(venue?.hourly_rate || 0);

  const summaryDeposit = bookingType === 'daily'
    ? Number(venue?.daily_deposit || 0)
    : Number(venue?.hourly_deposit || 0);

  const summaryDays = bookingType === 'daily'
    ? (dates ? dates.split(',').filter(Boolean).length : Number(days) || 0)
    : 0;

  const summaryHours = bookingType === 'hourly'
    ? Number(duration) || 0
    : 0;

  const estimatedRental = bookingType === 'daily'
    ? summaryRate * summaryDays
    : summaryRate * summaryHours;

  const grandTotal = estimatedRental + summaryDeposit;
  
  const dateRangeLabel = bookingType === 'daily'
    ? (() => {
        const list = dates ? dates.split(',').filter(Boolean) : [];
        if (list.length === 0) return '—';
        const first = SHORT_DATE_FORMATTER.format(
          new Date(`${list[0]}T00:00:00+08:00`)
        );
        if (list.length === 1) return first;
        const last = SHORT_DATE_FORMATTER.format(
          new Date(`${list[list.length - 1]}T00:00:00+08:00`)
        );
        return `${first} - ${last}`;
      })()
    : (date
        ? SHORT_DATE_FORMATTER.format(new Date(`${date}T00:00:00+08:00`))
        : '—');

  const timeLabel = bookingType === 'daily'
    ? '8:00 AM – 12:00 AM'
    : (startTime && endTime
        ? `${TIME_FORMATTER.format(new Date(startTime))} – ${TIME_FORMATTER.format(new Date(endTime))}`
        : '—');

  const validate = () => {
    const errors = {};

    const MIN_ADVANCE_DAYS = 3;
    const startDate = new Date(startTime);
    if (Number.isFinite(startDate.getTime())) {
      const MY = 'Asia/Kuala_Lumpur';
      const startParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: MY, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(startDate);                              // "YYYY-MM-DD"

      const todayParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: MY, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date());                             // "YYYY-MM-DD"

      const startDay = new Date(`${startParts}T00:00:00+08:00`);
      const todayDay = new Date(`${todayParts}T00:00:00+08:00`);
      const diffDays = Math.round((startDay - todayDay) / 86400000);

      if (diffDays < MIN_ADVANCE_DAYS) {
        errors.general = `Bookings must be made at least ${MIN_ADVANCE_DAYS} calendar days in advance.`;
      }
    }

    if (!purpose || purpose.trim().length < 10) {
      errors.purpose = 'Please describe the purpose (at least 10 characters).';
    } else if (purpose.length > 2000) {
      errors.purpose = 'Purpose is too long (max 2000 characters).';
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) {
      errors.phone = 'Please enter a valid phone number.';
    }

    if (isShared) {
      const n = Number(attendees);
      if (!Number.isInteger(n) || n < 1) {
        errors.attendees = 'Please enter a valid attendee count.';
      } else if (n > Number(venue.capacity)) {
        errors.attendees = `Maximum ${venue.capacity} attendees for this venue.`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    try {
      setSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired. Please sign in again.');
      }

      const payload = {
        venueId,
        bookingType,
        purpose: purpose.trim(),
        phone_no: `+60${phone.replace(/\D/g, '')}`,
        start_time: startTime,
        end_time: endTime,
      };

      if (bookingType === 'daily') {
        payload.dates = dates.split(',').filter(Boolean);
      }

      if (isShared) {
        payload.expected_attendees = Number(attendees);
      }

      const res = await fetch(`${API}/api/bookings/create-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('Create-booking failed:', res.status, body);
        throw new Error(
          body.error || `Server responded ${res.status}`
        );
      }

      if (!body.booking?.booking_id) {
        console.error('Unexpected response shape:', body);
        throw new Error('Server did not return a booking ID.');
      }

      navigate(
        `/booking-request/success?bookingId=${encodeURIComponent(body.booking.booking_id)}`,
        { replace: true }
      );
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Wait for both venue and role to load before rendering
  if (loading || role === null) {
    return (
      <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
        <TopNavbar role={role || 'student'} onProfileOpen={setIsProfileOpen} />
        <main className="mx-auto max-w-[1280px] px-5 py-7 sm:px-[60px]">
          <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[#6B6468] hover:text-[#7A1F3D]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg> Back</button>
          <p className="mt-10 text-[#6B6468]">Loading booking form...</p>
        </main>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </div>
    );
  }

  if (loadError || !venue) {
    return (
      <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
        <TopNavbar role={role} onProfileOpen={setIsProfileOpen} />
        <main className="mx-auto max-w-[1280px] px-5 py-7 sm:px-[60px]">
          <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[#6B6468] hover:text-[#7A1F3D]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg> Back</button>
          <div className="rounded-xl border border-[#E3DEE0] bg-white p-6">
            <p className="text-sm text-red-700">{loadError || 'Venue unavailable.'}</p>
          </div>
        </main>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
      <TopNavbar role={role} onProfileOpen={setIsProfileOpen} />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-7 sm:px-[60px]">
        <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[#6B6468] hover:text-[#7A1F3D]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg> Back</button>

        <h1 className="text-[28px] font-bold">Personal Booking Form</h1>
        <p className="mt-1 text-sm text-[#6B6468]">
        Complete the form below with your booking details.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,640px)_320px]">
          <section className="rounded-xl border border-[#E3DEE0] bg-white p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[#6B6468]">Full name</label>
                <div className="mt-1.5 flex h-10 items-center rounded-lg border border-[#E3DEE0] bg-[#F9F7F8] px-3 text-[13px] text-[#1F1A1C]">
                  {profile?.full_name || '—'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6468]">Matric number</label>
                <div className="mt-1.5 flex h-10 items-center rounded-lg border border-[#E3DEE0] bg-[#F9F7F8] px-3 text-[13px] text-[#1F1A1C]">
                  {profile?.matric_no || '—'}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="purpose" className="text-xs font-semibold text-[#6B6468]">
                Purpose of activity <span className="text-[#7A1F3D]">*</span>
              </label>
              <textarea
                id="purpose"
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Group dance practice for cultural night rehearsal"
                className="mt-1.5 w-full resize-none rounded-lg border border-[#E3DEE0] bg-white px-3 py-2 text-[13px] focus:border-[#7A1F3D] focus:outline-none"
                disabled={submitting}
              />
              {fieldErrors.purpose && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.purpose}</p>
              )}
            </div>

            <div className="mt-5">
              <label htmlFor="phone" className="text-xs font-semibold text-[#6B6468]">
                Contact information <span className="text-[#7A1F3D]">*</span>
              </label>
              <div className="mt-1.5 flex h-10 overflow-hidden rounded-lg border border-[#E3DEE0] bg-white focus-within:border-[#7A1F3D]">
                <span className="flex items-center bg-[#F9F7F8] px-3 text-[13px] text-[#6B6468]">+60</span>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                  placeholder="12-345 6789"
                  className="w-full px-3 text-[13px] focus:outline-none"
                  disabled={submitting}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

              {isShared && (
              <div className="mt-5">
                <label htmlFor="attendees" className="text-xs font-semibold text-[#6B6468]">
                  Booking for (number of people) <span className="text-[#7A1F3D]">*</span>
                </label>
                <input
                  id="attendees"
                  type="number"
                  min={1}
                  max={Number(venue.capacity)}
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E3DEE0] px-3 text-[13px] focus:border-[#7A1F3D] focus:outline-none"
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-[#6B6468]">
                  Maximum venue capacity: <strong>{venue.capacity}</strong> at a time.
                </p>
                {fieldErrors.attendees && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.attendees}</p>
                )}
              </div>
            )}

            <p className="mt-5 text-xs text-[#6B6468]">
              The system checks for scheduling conflicts on submit.
            </p>

            {fieldErrors.general && (
              <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#7A1F3D]">
                {fieldErrors.general}
              </div>
            )}
            
            {submitError && (
              <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#7A1F3D]">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="h-11 min-w-[200px] rounded-lg bg-[#7A1F3D] px-5 text-[13px] font-semibold text-white hover:bg-[#651830] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Booking'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={submitting}
                className="h-11 rounded-lg border border-[#7A1F3D] bg-white px-5 text-[13px] font-semibold text-[#7A1F3D] hover:bg-[#FAF3F6] disabled:opacity-60"
              >
                Back
              </button>
            </div>
          </section>

          <aside className="h-fit rounded-xl border border-[#E3DEE0] bg-white p-5">
            <h2 className="text-base font-bold text-[#1F1A1C]">Booking Summary</h2>

            {/* Venue */}
            <div className="mt-4 rounded-lg border border-[#E3DEE0] bg-[#F9F7F8] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6468]">Venue</p>
              <p className="mt-0.5 text-sm font-bold text-[#1F1A1C]">{venue.venue_name}</p>
            </div>

            {/* Date + Time */}
            <dl className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Date</dt>
                <dd className="text-right font-semibold text-[#1F1A1C]">{dateRangeLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[#6B6468]">Time</dt>
                <dd className="text-right font-semibold text-[#1F1A1C]">{timeLabel}</dd>
              </div>
              {bookingType === 'hourly' && summaryHours > 0 && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B6468]">Duration</dt>
                  <dd className="text-right font-semibold text-[#1F1A1C]">
                    {summaryHours} hour{summaryHours === 1 ? '' : 's'}
                  </dd>
                </div>
              )}
              {bookingType === 'daily' && summaryDays > 0 && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B6468]">Days</dt>
                  <dd className="text-right font-semibold text-[#1F1A1C]">{summaryDays}</dd>
                </div>
              )}
            </dl>

            {/* Pricing */}
            <div className="mt-4 border-t border-[#E3DEE0] pt-4">
              <dl className="space-y-2 text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B6468]">
                    {bookingType === 'hourly' && summaryHours > 0 ? (
                      <>
                        Hourly rate{' '}
                        <span className="text-[#6B6468]">
                          ({currency(summaryRate)} × {summaryHours} hour{summaryHours === 1 ? '' : 's'})
                        </span>
                      </>
                    ) : bookingType === 'daily' && summaryDays > 0 ? (
                      <>
                        Daily rate{' '}
                        <span className="text-[#6B6468]">
                          ({currency(summaryRate)} × {summaryDays} day{summaryDays === 1 ? '' : 's'})
                        </span>
                      </>
                    ) : (
                      bookingType === 'daily' ? 'Daily rate' : 'Hourly rate'
                    )}
                  </dt>
                  <dd className="text-right font-semibold text-[#1F1A1C]">
                    {currency(
                      bookingType === 'daily'
                        ? summaryRate * summaryDays
                        : summaryRate * summaryHours
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B6468]">Deposit</dt>
                  <dd className="text-right font-semibold text-[#1F1A1C]">{currency(summaryDeposit)}</dd>
                </div>
              </dl>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-[#FAF3F6] px-3 py-2.5">
                <span className="text-[13px] font-semibold text-[#7A1F3D]">Estimated total</span>
                <span className="text-base font-bold text-[#7A1F3D]">{currency(grandTotal)}</span>
              </div>
            </div>

            {summaryDeposit > 0 && (
              <div className="mt-3 rounded-lg border border-[#B7E4C7] bg-[#ECFDF5] px-3 py-2">
                <p className="text-[11px] text-[#17703A]">
                  <span className="font-semibold">Refundable deposit:</span> {currency(summaryDeposit)}.
                  Collectable from MPP after the venue is inspected and left in good condition.
                </p>
              </div>
            )}

            {/* Status */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#FFF3CD] px-3 py-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#8A6D00]" />
              <p className="text-xs font-semibold text-[#8A6D00]">
                Status after submit: Pending Approval
              </p>
            </div>
          </aside>
        </form>
      </main>

      <button
        type="button"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#7A1F3D] text-white shadow-lg"
        aria-label="AI assistant"
      >
        AI
      </button>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}