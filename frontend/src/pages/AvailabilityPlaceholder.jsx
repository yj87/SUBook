import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCalendarDays } from '../utils/availabilityCalendar';
import TopNavbar from '../components/TopNavbar';
import ProfileModal from '../components/ProfileModal';
import { supabase } from '../supabaseClient';
import API from '../config/api';

const OPENING_HOUR = 8;
const CLOSING_HOUR = 24;
const TIME_ZONE = 'Asia/Kuala_Lumpur';
const TIME_ZONE_OFFSET = '+08:00';
const MAX_DAILY_DAYS = 7;
const SLOTS_PER_DAY = CLOSING_HOUR - OPENING_HOUR;

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const pad = (value) => String(value).padStart(2, '0');

const monthKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

const parseDateKey = (value) =>
  new Date(`${value}T00:00:00${TIME_ZONE_OFFSET}`);

const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

const MIN_ADVANCE_DAYS = 3;

const minimumBookingDate = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const v = Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );

  const d = new Date(Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day)));
  d.setUTCDate(d.getUTCDate() + MIN_ADVANCE_DAYS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const todayKey = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-MY', {
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});

const formatHour = (hour) => {
  const normalized = hour % 24;
  const period = normalized >= 12 ? 'PM' : 'AM';
  return `${normalized % 12 || 12}:00 ${period}`;
};

const formatSlot = (slot) =>
  `${formatHour(slot.startHour)} – ${formatHour(slot.endHour)}`;

function getSlots(date) {
  return Array.from({ length: SLOTS_PER_DAY }, (_, index) => {
    const startHour = OPENING_HOUR + index;
    const start = new Date(`${date}T${pad(startHour)}:00:00${TIME_ZONE_OFFSET}`);
    const end = new Date(start.getTime() + 3600000);
    return {
      id: `${date}-${startHour}`,
      date,
      startHour,
      endHour: startHour + 1,
      start,
      end,
    };
  });
}

function AvailabilityLegend() {
  const items = [
    { label: 'Locked / reserved', color: '#F8D7DA' },
    { label: 'Unavailable', color: '#E5E5E5' },
    { label: 'Selected', color: '#CDEFD6' },
  ];
  return (
    <div className="mt-7 flex flex-wrap justify-between gap-4 text-xs text-[#6B6468]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <i
            className="h-3.5 w-3.5 rounded-[3px] border border-[#E3DEE0]"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function AvailabilityPlaceholder() {
  const { venueId } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

  const [month, setMonth] = useState(() => {
    const localToday = todayKey();
    const [year, monthNumber] = localToday.split('-').map(Number);
    return new Date(year, monthNumber - 1, 1);
  });

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRange, setSelectedRange] = useState([]);
  const [bookingMode, setBookingMode] = useState('hourly');
  const [dailyDates, setDailyDates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const [selectionHighlight, setSelectionHighlight] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [role, setRole] = useState('student');

const clearSelectionError = () => {
  setSelectionError('');
  setSelectionHighlight('');
};
  
  const monthValue = monthKey(month);
  const today = todayKey();
  const minimumMonth = today.slice(0, 7);

  const currentMonth = useMemo(() => {
    const [year, monthNumber] = monthValue.split('-').map(Number);
    return { year, month: monthNumber - 1 };
  }, [monthValue]);

  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month]
  );

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
    setLoading(true);
    setError('');
    setSelectedRange([]);
    setAvailabilitySlots([]);

    fetch(
      `${API}/api/venues/${encodeURIComponent(venueId)}/availability?month=${monthValue}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Unable to retrieve booking availability');
        }
        return result.data;
      })
      .then((result) => {
        if (!result?.venue || !Array.isArray(result.slots)) {
          throw new Error('Invalid availability response from server');
        }
        setVenue(result.venue);
        setAvailabilitySlots(result.slots);
        setSelectedDate((current) => (current.startsWith(monthValue) ? current : ''));
        setDailyDates((current) => current.filter((d) => d.startsWith(monthValue)));
      })
      .catch((fetchError) => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [venueId, monthValue, retryToken]);

  const slotStatusByStart = useMemo(() => {
    return new Map(
      availabilitySlots.map((slot) => [new Date(slot.start).getTime(), slot])
    );
  }, [availabilitySlots]);

  const slotsForDate = (date) => {
    const tooSoon = date < minimumBookingDate();
    return getSlots(date).map((slot) => {
      const apiSlot = slotStatusByStart.get(slot.start.getTime());
      const reserved = apiSlot?.status === 'fully booked';
      const unavailable =
        tooSoon ||
        venue?.venue_status !== 'available' ||
        slot.start <= new Date() ||
        !apiSlot ||
        apiSlot.status === 'unavailable';
      return {
        ...slot,
        reserved,
        unavailable,
        status: apiSlot?.status || 'unavailable',
        remaining: apiSlot?.remaining ?? null,
      };
    });
  };

  const selectedSlots = useMemo(() => {
    if (!selectedDate || !venue) return [];
    return slotsForDate(selectedDate);
  }, [selectedDate, venue, slotStatusByStart]);

  const dateStatus = (date) => {
    if (!date || date < minimumBookingDate()) return 'unavailable';
    if (venue?.venue_status !== 'available') return 'unavailable';
    const slots = slotsForDate(date);
    if (slots.every((slot) => slot.unavailable)) return 'unavailable';
    if (slots.every((slot) => slot.unavailable || slot.reserved)) return 'reserved';
    return 'available';
  };

  const isDateFullyBookable = (date) => {
    if (!date || date < minimumBookingDate()) return false;
    if (venue?.venue_status !== 'available') return false;
    return slotsForDate(date).every(
      (s) => !s.unavailable && s.status !== 'fully booked'
    );
  };

  const dailyBlockReason = (date) => {
  if (!date) return '';
  if (date < minimumBookingDate()) {
    return 'Bookings require at least 3 calendar days notice';
  }
  if (venue?.venue_status !== 'available') {
    return 'The venue is unavailable';
  }

  const slots = slotsForDate(date);

  // All slots unavailable (past / venue closed / not yet open)
  if (slots.every((s) => s.unavailable)) {
    return 'All time slots are unavailable on this day';
  }

  // ALL slots reserved (fully booked for the day)
  if (slots.every((s) => s.unavailable || s.reserved)) {
    return 'This day is fully booked. Please choose another date';
  }

  // Some slots reserved but not all
  const blocked = slots.find((s) => s.status === 'fully booked');
  if (blocked) {
    return `Not available for full-day booking —— blocked slot starts at ${formatHour(blocked.startHour)}`;
  }

  return '';
};

  const chooseSlot = (slot) => {
    if (slot.unavailable || slot.reserved) return;
    setSelectedRange((current) => {
      if (current.length === 0) return [slot];
      const first = current[0];
      const last = current[current.length - 1];
      const clickedIndex = current.findIndex((item) => item.id === slot.id);
      if (clickedIndex === 0 && current.length === 1) return [];
      if (clickedIndex === 0) return current.slice(1);
      if (clickedIndex === current.length - 1) return current.slice(0, -1);
      if (clickedIndex > 0) return current.slice(0, clickedIndex);
      if (slot.end.getTime() === first.start.getTime()) return [slot, ...current];
      if (slot.start.getTime() === last.end.getTime()) return [...current, slot];
      return [slot];
    });
  };

  const chooseDailyDate = (date) => {
    if (!date) return;

    if (dailyDates.length === 0) {
      if (!isDateFullyBookable(date)) {
        setSelectionError(
          `Can't start on ${SHORT_DATE_FORMATTER.format(parseDateKey(date))} — ${dailyBlockReason(date)}.`
        );
        setSelectionHighlight('');
        return;
      }
      clearSelectionError();
      setDailyDates([date]);
      return;
    }

    const sorted = [...dailyDates].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (dailyDates.includes(date)) {
      if (dailyDates.length === 1) {
        clearSelectionError();
        setDailyDates([]);
        return;
      }
      if (date === first) {
        clearSelectionError();
        setDailyDates(sorted.slice(1));
        return;
      }
      if (date === last) {
        clearSelectionError();
        setDailyDates(sorted.slice(0, -1));
        return;
      }
      setSelectionError(
        `You can only remove days from the ends of your range. Tap ${SHORT_DATE_FORMATTER.format(parseDateKey(first))} or ${SHORT_DATE_FORMATTER.format(parseDateKey(last))} to shrink the range.`
      );
      setSelectionHighlight('');
      return;
    }

    if (date > first && date < last) return;

    const isForward = date === addDays(last, 1);
    const isBackward = date === addDays(first, -1);

    if (isForward || isBackward) {
      if (dailyDates.length >= MAX_DAILY_DAYS) {
        setSelectionError(`Maximum ${MAX_DAILY_DAYS} consecutive days per booking.`);
        setSelectionHighlight('');
        return;
      }
      if (!isDateFullyBookable(date)) {
        setSelectionError(
          `Can't add ${SHORT_DATE_FORMATTER.format(parseDateKey(date))} — ${dailyBlockReason(date)}.`
        );
        setSelectionHighlight('');
        return;
      }
      clearSelectionError();
      const next = isForward
        ? [...dailyDates, date].sort()
        : [date, ...dailyDates].sort();
      setDailyDates(next);
      return;
    }

  setSelectionError(
    `You picked ${SHORT_DATE_FORMATTER.format(parseDateKey(date))}, but days must be consecutive (no gaps).\nYour range: ${SHORT_DATE_FORMATTER.format(parseDateKey(first))} – ${SHORT_DATE_FORMATTER.format(parseDateKey(last))}.\nPlease pick a day just before or after your range to extend it, or tap a selected date again to remove it.`
  );
  setSelectionHighlight('consecutive (no gaps)');
  };

  const isDateSelectedForMode = (date) => {
    if (bookingMode === 'daily') return dailyDates.includes(date);
    return date === selectedDate;
  };

  const chooseDate = (date) => {
    if (!date) return;

    if (date < minimumBookingDate()) {
      setSelectionError(
      'Bookings require at least 3 calendar days advance notice.\nEarliest available date: ' +
      SHORT_DATE_FORMATTER.format(
        new Date(`${minimumBookingDate()}T00:00:00+08:00`)
      )
    );
      setSelectionHighlight('3 calendar days');
      setSelectedDate('');
      setSelectedRange([]);
      return;
    }

    if (bookingMode === 'daily') {
      chooseDailyDate(date);
      return;
    }
    if (dateStatus(date) === 'unavailable') return;
    setSelectedDate(date);
    setSelectedRange([]);
    clearSelectionError();
  };

  const moveMonth = (offset) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    if (monthKey(next) >= minimumMonth) {
      setMonth(next);
      setSelectedDate('');
      setSelectedRange([]);
      setDailyDates([]);
      clearSelectionError();
    }
  };

  const rangeStart = selectedRange[0] || null;
  const rangeEnd = selectedRange[selectedRange.length - 1] || null;

  const selectedDateLabel = selectedDate
    ? SHORT_DATE_FORMATTER.format(parseDateKey(selectedDate))
    : '—';

  const selectedTimeLabel =
    rangeStart && rangeEnd
      ? `${formatHour(rangeStart.startHour)} – ${formatHour(rangeEnd.endHour)}`
      : '—';

  const durationHours =
    rangeStart && rangeEnd
      ? (rangeEnd.end.getTime() - rangeStart.start.getTime()) / 3600000
      : 0;

  const hourlyRate = Number(venue?.hourly_rate || 0);
  const dailyRate = Number(venue?.daily_rate || 0);
  const hourlyDeposit = Number(venue?.hourly_deposit || 0);
  const dailyDeposit = Number(venue?.daily_deposit || 0);

  const sortedDaily = useMemo(() => [...dailyDates].sort(), [dailyDates]);
  const dailyStartDate = sortedDaily[0] || '';
  const dailyEndDate = sortedDaily[sortedDaily.length - 1] || '';

  const dailyStart = dailyStartDate
    ? new Date(`${dailyStartDate}T08:00:00${TIME_ZONE_OFFSET}`)
    : null;

  const dailyEnd = dailyEndDate
    ? new Date(
        new Date(`${dailyEndDate}T00:00:00${TIME_ZONE_OFFSET}`).getTime() + 86400000
      )
    : null;

  const totalRate =
    bookingMode === 'daily'
      ? dailyRate * dailyDates.length
      : hourlyRate * durationHours;

  const estimatedRate =
    bookingMode === 'daily'
      ? dailyDates.length
        ? `RM${totalRate.toFixed(2)}`
        : '—'
      : durationHours
        ? `RM${totalRate.toFixed(2)}`
        : '—';

  const displayedDeposit =
    bookingMode === 'daily' ? dailyDeposit : hourlyDeposit;

  const canContinue =
    !loading &&
    !error &&
    (bookingMode === 'daily'
      ? dailyDates.length > 0 && !!venue
      : selectedDate &&
        selectedRange.length > 0 &&
        selectedRange.every((slot) => {
          const currentSlot = selectedSlots.find((item) => item.id === slot.id);
          return currentSlot && !currentSlot.unavailable && !currentSlot.reserved;
        }));

  const handleContinue = async () => {
    if (!canContinue) return;

    try {
      setError('');
      clearSelectionError();

      const response = await fetch(
        `${API}/api/venues/${encodeURIComponent(venueId)}/availability?month=${monthValue}`
      );
      const result = await response.json();

      if (!response.ok || !Array.isArray(result.data?.slots)) {
        throw new Error(result.error || 'Unable to verify availability');
      }

      const currentSlots = new Map(
        result.data.slots.map((slot) => [new Date(slot.start).getTime(), slot])
      );

      if (bookingMode === 'daily') {
        const stillOk = dailyDates.every((d) =>
          getSlots(d).every((slot) => {
            const latest = currentSlots.get(slot.start.getTime());
            return (
              latest &&
              latest.status !== 'fully booked' &&
              latest.status !== 'unavailable' &&
              slot.start.getTime() > Date.now()
            );
          })
        );

        if (!stillOk) {
          setSelectionError('One or more days are no longer fully available. Please reselect.');
          setSelectionHighlight('');
          return;
        }

        const params = new URLSearchParams({
          bookingType: 'daily',
          venueId: venue.venue_id,
          dates: sortedDaily.join(','),
          startTime: dailyStart.toISOString(),
          endTime: dailyEnd.toISOString(),
          days: String(dailyDates.length),
        });
        navigate(`/booking-request?${params.toString()}`);
        return;
      }

      const stillAvailable = selectedRange.every((slot) => {
        const latest = currentSlots.get(slot.start.getTime());
        return (
          latest &&
          (latest.status === 'available' || latest.status === 'partially booked') &&
          slot.start.getTime() > Date.now()
        );
      });

      if (!stillAvailable) {
        setSelectedRange([]);
        setAvailabilitySlots(result.data.slots);
        throw new Error('One or more selected slots are no longer available. Please select again.');
      }

      const params = new URLSearchParams({
        bookingType: 'hourly',
        venueId: venue.venue_id,
        date: selectedDate,
        startTime: rangeStart.start.toISOString(),
        endTime: rangeEnd.end.toISOString(),
        duration: String(durationHours),
      });
      navigate(`/booking-request?${params.toString()}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
      {/* NAVIGATION */}
      <TopNavbar role={role} onProfileOpen={setIsProfileOpen} />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-7 sm:px-[60px]">
        {loading && (
          <p className="mt-10 text-[#6B6468]">Loading availability...</p>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-xl border border-[#E3DEE0] bg-white p-5">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setRetryToken((v) => v + 1)}
              className="mt-4 rounded-lg bg-[#7A1F3D] px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && venue && (
          <>
          <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[#6B6468] hover:text-[#7A1F3D]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>
            <h1 className="text-[28px] font-bold">
              {venue.venue_name} – Select Date &amp; Time
            </h1>

            <p className="mt-1 text-sm text-[#6B6468]">
              {bookingMode === 'hourly'
                ? 'Pick a date, then choose consecutive hour slots.'
                : `Pick consecutive days (max ${MAX_DAILY_DAYS}). Click the first date, then click the next day to extend the range.`}
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[560px]">
              <button
                type="button"
                onClick={() => {
                  setBookingMode('hourly');
                  setDailyDates([]);
                  clearSelectionError();
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  bookingMode === 'hourly'
                    ? 'border-[#7A1F3D] bg-[#FAF3F6] ring-2 ring-[#7A1F3D]/20'
                    : 'border-[#E3DEE0] bg-white hover:border-[#7A1F3D]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      bookingMode === 'hourly'
                        ? 'border-[#7A1F3D] bg-[#7A1F3D]'
                        : 'border-[#B8B0B3] bg-white'
                    }`}
                  >
                    {bookingMode === 'hourly' && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="text-base font-bold text-[#1F1A1C]">Book by Hour</span>
                </div>
                <span className="pl-7 text-xs text-[#6B6468]">
                  Choose specific time slots (1–16 hours)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBookingMode('daily');
                  setSelectedRange([]);
                  clearSelectionError();
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  bookingMode === 'daily'
                    ? 'border-[#7A1F3D] bg-[#FAF3F6] ring-2 ring-[#7A1F3D]/20'
                    : 'border-[#E3DEE0] bg-white hover:border-[#7A1F3D]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      bookingMode === 'daily'
                        ? 'border-[#7A1F3D] bg-[#7A1F3D]'
                        : 'border-[#B8B0B3] bg-white'
                    }`}
                  >
                    {bookingMode === 'daily' && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="text-base font-bold text-[#1F1A1C]">Book by Day</span>
                </div>
                <span className="pl-7 text-xs text-[#6B6468]">
                  Whole days (8 AM–12 AM), up to {MAX_DAILY_DAYS} consecutive days
                </span>
              </button>
            </div>

            <div className="mt-7 grid gap-6 xl:grid-cols-[520px_300px_295px]">
              <section
                className="rounded-xl border border-[#E3DEE0] bg-white p-4 sm:p-5"
                aria-label="Availability calendar"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">{MONTH_FORMATTER.format(month)}</h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={monthValue === minimumMonth}
                      onClick={() => moveMonth(-1)}
                      className="h-8 w-8 rounded border border-[#E3DEE0] disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMonth(1)}
                      className="h-8 w-8 rounded border border-[#E3DEE0]"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-[#6B6468]">
                  {WEEKDAYS.map((day, index) => (
                    <span key={index}>{day}</span>
                  ))}
                </div>
                  
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {calendarDays.map((date, index) => {
                    const status = dateStatus(date);
                    const selected = isDateSelectedForMode(date);
                                        const tooSoon =
                      !!date && date < minimumBookingDate();

                    const disabled =
                      !date ||
                      tooSoon ||
                      (bookingMode === 'daily'
                        ? !isDateFullyBookable(date)
                        : status === 'unavailable');

                    return (
                      <button
                        key={date || `empty-${index}`}
                        type="button"
                        aria-disabled={disabled}
                        onClick={() => {
                          if (!date) return;
                          if (tooSoon) {
                            setSelectionError(
                            'Bookings require at least 3 calendar days advance notice.\nEarliest available date: ' + 
                            SHORT_DATE_FORMATTER.format(new Date(`${minimumBookingDate()}T00:00:00+08:00`))
                            );
                            setSelectionHighlight('3 calendar days');
                            setSelectedDate('');
                            setSelectedRange([]);
                            return;
                          }
                          if (bookingMode === 'daily' && !isDateFullyBookable(date)) {
                            setSelectionError(
                              `Cannot select ${SHORT_DATE_FORMATTER.format(parseDateKey(date))}: ${dailyBlockReason(date)}`
                            );
                            setSelectionHighlight('');
                            return;
                          }
                          if (bookingMode === 'hourly' && status === 'unavailable') {
                            return;
                          }
                          
                          if (bookingMode === 'hourly' && status === 'reserved') {
                            setSelectedDate(date);
                            setSelectedRange([]);
                            setSelectionError(
                            'All slots on this date are already reserved. Please choose another date.'
                            );
                            return;
                          }
                          chooseDate(date);
                        }}
                        aria-pressed={selected}
                        title={
                          tooSoon
                            ? 'Bookings require at least 3 calendar days advance notice'
                            : undefined
                        }
                        className={`aspect-square rounded-lg border border-[#E3DEE0] p-2 text-left text-[13px]
                          ${
                            selected
                              ? 'bg-[#CDEFD6] font-bold'
                              : tooSoon
                                ? 'bg-[#E5E5E5] text-[#9C9598] cursor-not-allowed'
                                : status === 'reserved'
                                  ? 'bg-[#F8D7DA]'
                                  : status === 'unavailable'
                                    ? 'bg-[#E5E5E5] text-[#6B6468] cursor-not-allowed'
                                    : 'bg-white hover:border-[#7A1F3D]'
                          }
                          ${!date ? 'invisible' : ''}
                        `}
                      >
                        {date ? Number(date.slice(-2)) : ''}
                      </button>
                    );
                  })}
                </div>

                <AvailabilityLegend />
              </section>

                {bookingMode === 'hourly' ? (
                <section aria-label="Time slots">
                  <h2 className="text-base font-bold">
                    Time slots
                    {selectedDate ? ` – ${selectedDateLabel}` : ''}
                  </h2>

                  {selectionError && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-xs text-[#7A1F3D]">
                    {selectionHighlight && selectionError.includes(selectionHighlight)
                      ? selectionError.split(selectionHighlight).map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                      <strong className="font-semibold">{selectionHighlight}</strong>
                      )}
                      </span>
                      ))
                    : selectionError}
                    </p>
                  )}

                  {!selectedDate && (
                    <p className="mt-4 text-sm text-[#6B6468]">
                      Select a date to view time slots.
                    </p>
                  )}

                  {selectedDate && (
                    <div className="mt-4 space-y-2.5">
                      {selectedSlots.map((slot) => {
                        const isSelected = selectedRange.some(
                          (item) => item.id === slot.id
                        );
                        const disabled = slot.unavailable || slot.reserved;

                        let statusLabel = 'Available';
                        if (slot.unavailable) statusLabel = 'Unavailable';
                        else if (slot.reserved) statusLabel = 'Reserved';
                        else if (isSelected) statusLabel = 'Selected';
                        else if (slot.status === 'partially booked') {
                          statusLabel = `${slot.remaining} left`;
                        }

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => chooseSlot(slot)}
                            aria-pressed={isSelected}
                            className={`flex min-h-[46px] w-full items-center justify-between rounded-lg border px-4 text-left text-[13px] transition-colors
                              ${
                                slot.unavailable
                                  ? 'border-[#E3DEE0] bg-[#E5E5E5]'
                                  : slot.reserved
                                    ? 'border-[#E3DEE0] bg-[#F8D7DA]'
                                    : isSelected
                                      ? 'border-[#6DAB7A] bg-[#CDEFD6]'
                                      : 'border-[#E3DEE0] bg-white hover:border-[#7A1F3D]'
                              }
                            `}
                          >
                            <span>{formatSlot(slot)}</span>
                            <span className="text-xs font-semibold text-[#6B6468]">
                              {statusLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <section aria-label="Daily selection summary">
                  <h2 className="text-base font-bold">Selected days</h2>

                  {selectionError && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-xs text-[#7A1F3D]">
                    {selectionHighlight && selectionError.includes(selectionHighlight)
                      ? selectionError.split(selectionHighlight).map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                      <strong className="font-semibold">{selectionHighlight}</strong>
                      )}
                      </span>
                      ))
                    : selectionError}
                    </p>
                  )}

                  {dailyDates.length === 0 && (
                    <p className="mt-4 text-sm text-[#6B6468]">
                      Pick 1–{MAX_DAILY_DAYS} consecutive dates from the calendar.
                    </p>
                  )}

                  {dailyDates.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {sortedDaily.map((d) => (
                        <div
                          key={d}
                          className="flex min-h-[42px] items-center justify-between rounded-lg border border-[#6DAB7A] bg-[#CDEFD6] px-4 text-[13px]"
                        >
                          <span>{SHORT_DATE_FORMATTER.format(parseDateKey(d))}</span>
                          <span className="text-xs font-semibold text-[#17703A]">
                            Full day
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <aside
                className="h-fit rounded-xl border border-[#E3DEE0] bg-white p-5"
                aria-label="Booking summary"
              >
                <h2 className="text-base font-bold">Estimated fee</h2>

                <div className="mt-5 space-y-3 text-[13px] text-[#6B6468]">
                  <p>Venue: {venue.venue_name}</p>

                  {bookingMode === 'hourly' && (
                    <>
                      <p>
                        Date:{' '}
                        {selectedDate
                          ? `${selectedDateLabel} ${selectedDate.slice(0, 4)}`
                          : '—'}
                      </p>
                      <p>Time: {selectedTimeLabel}</p>
                      <p>
                        Duration:{' '}
                        {durationHours
                          ? `${durationHours} hour${durationHours === 1 ? '' : 's'}`
                          : '—'}
                      </p>
                      <p>
                        Hourly rate:{' '}
                        {venue.hourly_rate != null
                          ? `RM${Number(venue.hourly_rate).toFixed(2)}`
                          : '—'}
                      </p>
                    </>
                  )}

                  {bookingMode === 'daily' && (
                    <>
                      <p>Days: {dailyDates.length || '—'}</p>
                      <p>
                        Dates:{' '}
                        {dailyDates.length
                          ? `${SHORT_DATE_FORMATTER.format(
                              parseDateKey(dailyStartDate)
                            )} – ${SHORT_DATE_FORMATTER.format(
                              parseDateKey(dailyEndDate)
                            )}`
                          : '—'}
                      </p>
                      <p>
                        Daily rate:{' '}
                        {venue.daily_rate != null
                          ? `RM${Number(venue.daily_rate).toFixed(2)}`
                          : '—'}
                      </p>
                    </>
                  )}

                  <p className="font-semibold text-[#1F1A1C]">
                    Estimated rental: {estimatedRate}
                  </p>

                  <p>
                    Deposit:{' '}
                    {displayedDeposit != null
                      ? `RM${displayedDeposit.toFixed(2)}`
                      : '—'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={handleContinue}
                  className="mt-7 h-[42px] w-full rounded-lg bg-[#7A1F3D] text-[13px] font-semibold text-white hover:bg-[#651830] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>

                {bookingMode === 'hourly' && selectedRange.length > 0 && (
                  <p className="mt-3 text-center text-xs text-[#6B6468]">
                    {selectedRange.length} consecutive hour
                    {selectedRange.length === 1 ? '' : 's'} selected
                  </p>
                )}

                {bookingMode === 'daily' && dailyDates.length > 0 && (
                  <p className="mt-3 text-center text-xs text-[#6B6468]">
                    {dailyDates.length} full day
                    {dailyDates.length === 1 ? '' : 's'} selected
                  </p>
                )}
              </aside>
            </div>
          </>
        )}
      </main>

      <div className="fixed bottom-5 right-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#7A1F3D] text-lg font-bold text-white">
        AI
      </div>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}