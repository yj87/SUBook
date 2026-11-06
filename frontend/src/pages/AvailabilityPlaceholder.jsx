
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCalendarDays } from '../utils/availabilityCalendar';
import API from '../config/api';

const OPENING_HOUR = 8;
const CLOSING_HOUR = 24;
const TIME_ZONE = 'Asia/Kuala_Lumpur';
const TIME_ZONE_OFFSET = '+08:00';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const pad = (value) => String(value).padStart(2, '0');

const monthKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

const parseDateKey = (value) =>
  new Date(`${value}T00:00:00${TIME_ZONE_OFFSET}`);

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

// Generate 16 hourly slots: 8 AM until midnight.
function getSlots(date) {
  return Array.from(
    { length: CLOSING_HOUR - OPENING_HOUR },
    (_, index) => {
      const startHour = OPENING_HOUR + index;

      const start = new Date(
        `${date}T${pad(startHour)}:00:00${TIME_ZONE_OFFSET}`
      );

      // Adding one hour handles 11 PM -> midnight correctly.
      const end = new Date(start.getTime() + 3600000);

      return {
        id: `${date}-${startHour}`,
        date,
        startHour,
        endHour: startHour + 1,
        start,
        end,
      };
    }
  );
}

const navigation = [
  ['Home', '/student-dashboard'],
  ['Book Venue', '/venues'],
  ['Events', '#'],
  ['FAQ', '#'],
  ['Booking History', '#'],
  ['Lost Item', '#'],
  ['Feedback', '#'],
];

// ========================================
// AVAILABILITY LEGEND
// ========================================

function AvailabilityLegend() {
  const items = [
    { label: 'Locked / reserved', color: '#F8D7DA' },
    { label: 'Unavailable', color: '#E5E5E5' },
    { label: 'Selected', color: '#CDEFD6' },
  ];

  return (
    <div className="mt-7 flex flex-wrap justify-between gap-4 text-xs text-[#6B6468]">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2"
        >
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

// ========================================
// MAIN AVAILABILITY PAGE
// ========================================

export default function AvailabilityPlaceholder() {
  const { venueId } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    const localToday = todayKey();
    const [year, monthNumber] = localToday.split('-').map(Number);
    return new Date(year, monthNumber - 1, 1);
  });

  const [selectedDate, setSelectedDate] = useState('');

  // IMPORTANT:
  // Use an array of selected slots instead of one selectedSlot.
  const [selectedRange, setSelectedRange] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  const monthValue = monthKey(month);
  const today = todayKey();
  const minimumMonth = today.slice(0, 7);

  const currentMonth = useMemo(() => {
    const [year, monthNumber] = monthValue.split('-').map(Number);

    return {
      year,
      month: monthNumber - 1,
    };
  }, [monthValue]);

  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month]
  );

  // ========================================
  // FETCH VENUE AVAILABILITY
  // ========================================

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
          throw new Error(
            result.error || 'Unable to retrieve booking availability'
          );
        }

        return result.data;
      })
      .then((result) => {
        if (!result?.venue || !Array.isArray(result.slots)) {
          throw new Error('Invalid availability response from server');
        }

        setVenue(result.venue);
        setAvailabilitySlots(result.slots);

        setSelectedDate((current) =>
          current.startsWith(monthValue) ? current : ''
        );
      })
      .catch((fetchError) => {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [venueId, monthValue, retryToken]);

  // ========================================
  // MAP BACKEND SLOT AVAILABILITY
  // ========================================

  const slotStatusByStart = useMemo(() => {
    return new Map(
      availabilitySlots.map((slot) => [
        new Date(slot.start).getTime(),
        slot,
      ])
    );
  }, [availabilitySlots]);

  const slotsForDate = (date) => {
    return getSlots(date).map((slot) => {
      const apiSlot = slotStatusByStart.get(
        slot.start.getTime()
      );

      const reserved = apiSlot?.status === 'fully booked';

      const unavailable =
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
    if (!selectedDate || !venue) {
      return [];
    }

    return slotsForDate(selectedDate);
  }, [selectedDate, venue, slotStatusByStart]);

  // ========================================
  // CALENDAR DATE STATUS
  // ========================================

  const dateStatus = (date) => {
    if (!date || date < today) {
      return 'unavailable';
    }

    if (venue?.venue_status !== 'available') {
      return 'unavailable';
    }

    const slots = slotsForDate(date);

    if (slots.every((slot) => slot.unavailable)) {
      return 'unavailable';
    }

    if (
      slots.every(
        (slot) => slot.unavailable || slot.reserved
      )
    ) {
      return 'reserved';
    }

    return 'available';
  };

  // ========================================
  // MULTIPLE SLOT SELECTION LOGIC
  // ========================================

  const chooseSlot = (slot) => {
    if (slot.unavailable || slot.reserved) {
      return;
    }

    setSelectedRange((current) => {
      // First selected slot.
      if (current.length === 0) {
        return [slot];
      }

      const first = current[0];
      const last = current[current.length - 1];

      const clickedIndex = current.findIndex(
        (item) => item.id === slot.id
      );

      // Clicking the only selected slot clears selection.
      if (clickedIndex === 0 && current.length === 1) {
        return [];
      }

      // Clicking the first selected slot removes it.
      if (clickedIndex === 0) {
        return current.slice(1);
      }

      // Clicking the last selected slot removes it.
      if (clickedIndex === current.length - 1) {
        return current.slice(0, -1);
      }

      // Clicking inside the selected range shortens the range.
      if (clickedIndex > 0) {
        return current.slice(0, clickedIndex);
      }

      // Extend selection backwards by one hour.
      if (
        slot.end.getTime() === first.start.getTime()
      ) {
        return [slot, ...current];
      }

      // Extend selection forwards by one hour.
      if (
        slot.start.getTime() === last.end.getTime()
      ) {
        return [...current, slot];
      }

      // Clicking a non-adjacent available slot starts a new range.
      return [slot];
    });
  };

  const chooseDate = (date) => {
    if (!date || dateStatus(date) === 'unavailable') {
      return;
    }

    setSelectedDate(date);

    // Clear selection whenever the user chooses a date.
    setSelectedRange([]);
  };

  const moveMonth = (offset) => {
    const next = new Date(
      month.getFullYear(),
      month.getMonth() + offset,
      1
    );

    if (monthKey(next) >= minimumMonth) {
      setMonth(next);
      setSelectedDate('');
      setSelectedRange([]);
    }
  };

  // ========================================
  // BOOKING SUMMARY CALCULATION
  // ========================================

  const rangeStart = selectedRange[0] || null;
  const rangeEnd =
    selectedRange[selectedRange.length - 1] || null;

  const selectedDateLabel = selectedDate
    ? SHORT_DATE_FORMATTER.format(parseDateKey(selectedDate))
    : '—';

  const selectedTimeLabel =
    rangeStart && rangeEnd
      ? `${formatHour(rangeStart.startHour)} – ${formatHour(rangeEnd.endHour)}`
      : '—';

  const durationHours =
    rangeStart && rangeEnd
      ? (rangeEnd.end.getTime() -
        rangeStart.start.getTime()) / 3600000
      : 0;

  const hourlyRate = Number(venue?.hourly_rate || 0);

  const totalRate = hourlyRate * durationHours;

  const estimatedRate = durationHours
    ? `RM${totalRate.toFixed(2)}`
    : '—';

  // Always use the newest availability data.
  const canContinue =
    !loading &&
    !error &&
    selectedDate &&
    selectedRange.length > 0 &&
    selectedRange.every((slot) => {
      const currentSlot = selectedSlots.find(
        (item) => item.id === slot.id
      );

      return (
        currentSlot &&
        !currentSlot.unavailable &&
        !currentSlot.reserved
      );
    });

  // ========================================
  // CONTINUE TO BOOKING FORM
  // ========================================

  const handleContinue = async () => {
    if (!canContinue || !rangeStart || !rangeEnd) {
      return;
    }

    try {
      setError('');

      // Revalidate availability before proceeding.
      const response = await fetch(
        `${API}/api/venues/${encodeURIComponent(venueId)}/availability?month=${monthValue}`
      );

      const result = await response.json();

      if (!response.ok || !Array.isArray(result.data?.slots)) {
        throw new Error(
          result.error || 'Unable to verify availability'
        );
      }

      const currentSlots = new Map(
        result.data.slots.map((slot) => [
          new Date(slot.start).getTime(),
          slot,
        ])
      );

      const stillAvailable = selectedRange.every((slot) => {
        const latest = currentSlots.get(slot.start.getTime());

        return (
          latest &&
          (latest.status === 'available' ||
            latest.status === 'partially booked') &&
          slot.start.getTime() > Date.now()
        );
      });

      if (!stillAvailable) {
        setSelectedRange([]);
        setAvailabilitySlots(result.data.slots);
        throw new Error(
          'One or more selected slots are no longer available. Please select again.'
        );
      }

      const params = new URLSearchParams({
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

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
      {/* NAVIGATION */}
      <header className="border-b border-[#E3DEE0] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center gap-x-14 gap-y-3 px-5 py-3 sm:px-[60px] lg:flex-nowrap lg:py-0">
          <Link
            to="/student-dashboard"
            className="shrink-0 text-[22px] font-bold text-[#7A1F3D]"
          >
            SUBook
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex flex-1 flex-wrap items-center justify-start gap-x-7 gap-y-2 text-sm lg:justify-between"
          >
            {navigation.map(([label, path]) => (
              <a
                key={label}
                href={path}
                className={
                  label === 'Book Venue'
                    ? 'font-semibold text-[#7A1F3D]'
                    : 'hover:text-[#7A1F3D]'
                }
              >
                {label}
              </a>
            ))}
          </nav>

          <span className="rounded-lg bg-[#7A1F3D] px-6 py-[10px] text-[13px] font-semibold text-white">
            Student
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-7 sm:px-[60px]">
        {/* LOADING */}
        {loading && (
          <p className="mt-10 text-[#6B6468]">
            Loading availability...
          </p>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="mt-6 rounded-xl border border-[#E3DEE0] bg-white p-5">
            <p className="text-sm text-red-700">
              {error}
            </p>

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
            <h1 className="text-[28px] font-bold">
              {venue.venue_name} – Select Date &amp; Time
            </h1>

            <p className="mt-1 text-sm text-[#6B6468]">
              Check colour indicators, then choose available
              consecutive time slots.
            </p>

            <div className="mt-7 grid gap-6 xl:grid-cols-[520px_300px_295px]">

              {/* CALENDAR */}
              <section
                className="rounded-xl border border-[#E3DEE0] bg-white p-4 sm:p-5"
                aria-label="Availability calendar"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">
                    {MONTH_FORMATTER.format(month)}
                  </h2>

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
                    const selected = date === selectedDate;

                    return (
                      <button
                        key={date || `empty-${index}`}
                        type="button"
                        disabled={
                          !date || status === 'unavailable'
                        }
                        onClick={() => chooseDate(date)}
                        aria-pressed={selected}
                        className={`aspect-square rounded-lg border border-[#E3DEE0] p-2 text-left text-[13px]
                          ${selected
                            ? 'bg-[#CDEFD6] font-bold'
                            : status === 'reserved'
                              ? 'bg-[#F8D7DA]'
                              : status === 'unavailable'
                                ? 'bg-[#E5E5E5] text-[#6B6468]'
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

              {/* MULTIPLE TIME SLOT SELECTOR */}
              <section aria-label="Time slots">
                <h2 className="text-base font-bold">
                  Time slots
                  {selectedDate
                    ? ` – ${selectedDateLabel}`
                    : ''}
                </h2>

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

                      const disabled =
                        slot.unavailable || slot.reserved;

                      let statusLabel = 'Available';

                      if (slot.unavailable) {
                        statusLabel = 'Unavailable';
                      } else if (slot.reserved) {
                        statusLabel = 'Reserved';
                      } else if (isSelected) {
                        statusLabel = 'Selected';
                      } else if (
                        slot.status === 'partially booked'
                      ) {
                        statusLabel =
                          `${slot.remaining} left`;
                      }

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => chooseSlot(slot)}
                          aria-pressed={isSelected}
                          className={`flex min-h-[46px] w-full items-center justify-between rounded-lg border px-4 text-left text-[13px] transition-colors
                            ${slot.unavailable
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

              {/* BOOKING SUMMARY */}
              <aside
                className="h-fit rounded-xl border border-[#E3DEE0] bg-white p-5"
                aria-label="Booking summary"
              >
                <h2 className="text-base font-bold">
                  Estimated fee
                </h2>

                <div className="mt-5 space-y-3 text-[13px] text-[#6B6468]">
                  <p>
                    Venue: {venue.venue_name}
                  </p>

                  <p>
                    Date: {selectedDate
                      ? `${selectedDateLabel} ${selectedDate.slice(0, 4)}`
                      : '—'}
                  </p>

                  <p>
                    Time: {selectedTimeLabel}
                  </p>

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

                  <p className="font-semibold text-[#1F1A1C]">
                    Estimated rental: {estimatedRate}
                  </p>

                  <p>
                    Deposit:{' '}
                    {venue.hourly_deposit != null
                      ? `RM${Number(venue.hourly_deposit).toFixed(2)}`
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

                {selectedRange.length > 0 && (
                  <p className="mt-3 text-center text-xs text-[#6B6468]">
                    {selectedRange.length} consecutive
                    hour{selectedRange.length === 1 ? '' : 's'} selected
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
    </div>
  );
}