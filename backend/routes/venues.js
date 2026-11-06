
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL
  ?.replace(/\/rest\/v1\/?$/, '');

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

console.log('Venue Supabase configuration:', {
  configured: true,
  projectUrl: supabaseUrl,
  keyType: supabaseKey.startsWith('sb_secret_')
    ? 'secret'
    : 'legacy-or-other',
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Adjust these to match your actual booking statuses.
const ACTIVE_BOOKING_STATUSES = [
  'confirmed',
  'approved_awaiting_payment',
];

// Validate month format: YYYY-MM
const isValidMonth = (value) => {
  return (
    typeof value === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
  );
};

// Check whether two time intervals overlap.
const isOverlapping = (
  bookingStart,
  bookingEnd,
  slotStart,
  slotEnd
) => {
  return (
    new Date(bookingStart).getTime() <
    new Date(slotEnd).getTime() &&
    new Date(bookingEnd).getTime() >
    new Date(slotStart).getTime()
  );
};

// Malaysia uses UTC+08:00.
// Convert Malaysia local date/time to UTC Date.
const malaysiaDate = (year, monthIndex, day, hour) => {
  return new Date(
    Date.UTC(year, monthIndex, day, hour - 8)
  );
};

// ========================================
// GET /api/venues
// Retrieve all venues
// ========================================

router.get('/venues', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Supabase configuration is missing',
      });
    }

    const { data, error } = await supabase
      .from('venues')
      .select(`
        venue_id,
        venue_name,
        capacity,
        description,
        hourly_rate,
        hourly_deposit,
        daily_rate,
        daily_deposit,
        venue_status
      `)
      .order('venue_name', {
        ascending: true,
      });

    if (error) {
      console.error('Venue query error:', error.message);

      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve venue information',
      });
    }

    return res.status(200).json({
      success: true,
      count: data?.length ?? 0,
      data: data ?? [],
    });

  } catch (error) {
    console.error('Venue API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ========================================
// GET /api/venues/:venueId
// Retrieve individual venue details
// ========================================

router.get('/venues/:venueId', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Supabase configuration is missing',
      });
    }

    const { venueId } = req.params;

    const { data, error } = await supabase
      .from('venues')
      .select(`
        venue_id,
        venue_name,
        capacity,
        description,
        hourly_rate,
        hourly_deposit,
        daily_rate,
        daily_deposit,
        venue_status,
        is_shared,
        max_concurrent_bookings
      `)
      .eq('venue_id', venueId)
      .maybeSingle();

    if (error) {
      console.error('Venue detail error:', error.message);

      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve venue information',
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found',
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Venue detail API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ========================================
// GET /api/venues/:venueId/availability
// Example: ?month=2026-11
//
// SCRUM-18 - Venue Availability Calendar
// ========================================

router.get(
  '/venues/:venueId/availability',
  async (req, res) => {
    const { venueId } = req.params;
    const { month } = req.query;

    // Validate request
    if (!venueId || !isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        error:
          'A valid venue ID and month (YYYY-MM) are required',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Supabase configuration is missing',
      });
    }

    try {
      // ====================================
      // STEP 1: CALCULATE MONTH RANGE
      // ====================================

      const [year, monthNumber] = month
        .split('-')
        .map(Number);

      const monthIndex = monthNumber - 1;

      const daysInMonth = new Date(
        Date.UTC(year, monthNumber, 0)
      ).getUTCDate();

      // Start of month in Malaysia time
      const monthStart = malaysiaDate(
        year,
        monthIndex,
        1,
        0
      );

      // Start of next month in Malaysia time
      const monthEnd = malaysiaDate(
        year,
        monthIndex + 1,
        1,
        0
      );

      // ====================================
      // STEP 2: FETCH VENUE DETAILS
      // ====================================

      const {
        data: venue,
        error: venueError,
      } = await supabase
        .from('venues')
        .select(`
          venue_id,
          venue_name,
          capacity,
          hourly_rate,
          hourly_deposit,
          daily_rate,
          daily_deposit,
          venue_status,
          is_shared,
          max_concurrent_bookings
        `)
        .eq('venue_id', venueId)
        .maybeSingle();

      if (venueError) {
        console.error(
          'Venue availability query error:',
          venueError.message
        );

        return res.status(500).json({
          success: false,
          error: 'Unable to retrieve venue information',
        });
      }

      if (!venue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found',
        });
      }

      // ====================================
      // STEP 3: FETCH ACTIVE BOOKINGS
      // ====================================

      const {
        data: bookings,
        error: bookingError,
      } = await supabase
        .from('bookings')
        .select('start_time, end_time, status')
        .eq('venue_id', venueId)
        .lt('start_time', monthEnd.toISOString())
        .gt('end_time', monthStart.toISOString())
        .in('status', ACTIVE_BOOKING_STATUSES);

      if (bookingError) {
        console.error(
          'Booking availability query error:',
          bookingError.message
        );

        return res.status(500).json({
          success: false,
          error: 'Unable to retrieve booking availability',
        });
      }

      // ====================================
      // STEP 4: SHARED VENUE SETTINGS
      // ====================================

      const isShared = venue.is_shared === true;

      const maxConcurrentBookings = isShared
        ? Math.max(
          1,
          Number(venue.max_concurrent_bookings) || 1
        )
        : 1;

      // ====================================
      // STEP 5: GENERATE ONE-HOUR SLOTS
      // Operating hours: 8 AM - 12 AM
      // 16 slots per day
      // ====================================

      const slots = [];

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        for (
          let hour = 8;
          hour < 24;
          hour++
        ) {
          const slotStart = malaysiaDate(
            year,
            monthIndex,
            day,
            hour
          );

          const slotEnd = new Date(
            slotStart.getTime() + 60 * 60 * 1000
          );

          // =================================
          // STEP 6: CHECK BOOKING OVERLAP
          // =================================

          const overlappingBookings = (
            bookings ?? []
          ).filter((booking) =>
            isOverlapping(
              booking.start_time,
              booking.end_time,
              slotStart,
              slotEnd
            )
          );

          const bookingsCount =
            overlappingBookings.length;

          // =================================
          // STEP 7: DETERMINE AVAILABILITY
          // =================================

          let status = 'available';

          let remaining =
            maxConcurrentBookings - bookingsCount;

          if (bookingsCount >= maxConcurrentBookings) {
            status = 'fully booked';
            remaining = 0;
          } else if (isShared && bookingsCount > 0) {
            status = 'partially booked';
          }

          // =================================
          // STEP 8: STORE SLOT RESULT
          // =================================

          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),

            bookingsCount,

            status,

            isShared,

            maxConcurrentBookings,

            remaining: Math.max(0, remaining),
          });
        }
      }

      // ====================================
      // STEP 9: RETURN AVAILABILITY
      // ====================================

      return res.status(200).json({
        success: true,

        data: {
          venue,
          month,
          daysInMonth,
          operatingHours: {
            start: '08:00',
            end: '00:00',
            slotDurationMinutes: 60,
            timezone: 'Asia/Kuala_Lumpur',
          },
          slots,
        },
      });

    } catch (error) {
      console.error(
        'Venue availability API error:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// ========================================
// EXPORT ROUTER
// ========================================

export default router;
