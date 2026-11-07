import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { requireMPPAdmin } from '../middleware/auth.js';

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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const ACTIVE_BOOKING_STATUSES = [
  'confirmed',
  'approved_awaiting_payment',
];

const MAX_DAILY_DAYS = 7;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUUID = (value) =>
  typeof value === 'string' && UUID_REGEX.test(value);

// Return date and hour in Malaysia time.
function malaysiaParts(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );

  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

// Validate one-hour slots between 8 AM and midnight.
// Multiple consecutive hours are supported.
function validateBookingTime(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime())
  ) {
    return 'Invalid booking date or time';
  }

  if (start.getTime() <= Date.now()) {
    return 'Booking must be in the future';
  }

  const durationHours =
    (end.getTime() - start.getTime()) / 3600000;

  if (
    !Number.isInteger(durationHours) ||
    durationHours < 1 ||
    durationHours > 16
  ) {
    return 'Duration must be 1 to 16 whole hours';
  }

  const startLocal = malaysiaParts(start);
  const endLocal = malaysiaParts(end);

  if (
    startLocal.minute !== 0 ||
    endLocal.minute !== 0 ||
    startLocal.hour < 8 ||
    startLocal.hour > 23
  ) {
    return 'Slots must use whole hours starting from 8 AM';
  }

  // Enforce a continuous booking within one
  // Malaysia operating day, ending by midnight.
  const midnight = new Date(
    start.getTime() +
    (24 - startLocal.hour) * 3600000
  );

  if (end.getTime() > midnight.getTime()) {
    return 'Bookings cannot extend past midnight';
  }

  return null;
}

// Validate daily booking span: 8 AM day 1 → midnight after day N.
// `dates` is an array of YYYY-MM-DD strings (must be consecutive).
function validateDailyRange(dates, startValue, endValue) {
  if (!Array.isArray(dates) || dates.length < 1) {
    return 'Daily booking requires at least one date';
  }
  if (dates.length > MAX_DAILY_DAYS) {
    return `Daily booking cannot exceed ${MAX_DAILY_DAYS} days`;
  }

  const sorted = [...dates].sort();

  for (let i = 0; i < sorted.length; i++) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sorted[i])) {
      return 'Invalid date format in daily booking';
    }
    if (i > 0) {
      const prev = new Date(`${sorted[i - 1]}T00:00:00+08:00`);
      const curr = new Date(`${sorted[i]}T00:00:00+08:00`);
      if ((curr - prev) / 86400000 !== 1) {
        return 'Daily booking dates must be consecutive';
      }
    }
  }

  const expectedStart = new Date(
    `${sorted[0]}T08:00:00+08:00`
  );
  const lastMidnight = new Date(
    `${sorted[sorted.length - 1]}T00:00:00+08:00`
  );
  const expectedEnd = new Date(
    lastMidnight.getTime() + 24 * 3600000
  );

  const start = new Date(startValue);
  const end = new Date(endValue);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime())
  ) {
    return 'Invalid daily booking time';
  }
  if (start.getTime() !== expectedStart.getTime()) {
    return 'Daily booking must start at 8 AM on the first date';
  }
  if (end.getTime() !== expectedEnd.getTime()) {
    return 'Daily booking must end at midnight after the last date';
  }
  if (start.getTime() <= Date.now()) {
    return 'Booking must be in the future';
  }

  return null;
}

// Authenticate Supabase Auth access token.
// Do not accept profile_id from the request body.
async function requireBookingUser(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer (.+)$/i);

    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { data, error } =
      await supabase.auth.getUser(match[1]);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
      });
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('profile_id, role')
        .eq('profile_id', data.user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return res.status(403).json({
        success: false,
        error: 'User profile not found',
      });
    }

    req.bookingProfile = profile;
    next();
  } catch (error) {
    console.error('Booking authentication error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to verify user',
    });
  }
}

// ========================================
// POST /api/bookings/create-booking
// Supports hourly and daily bookings.
// Category A (is_shared=false): exclusive room.
// Category B (is_shared=true): capacity-sum.
// ========================================

router.post(
  '/create-booking',
  requireBookingUser,
  async (req, res) => {
    try {
        const {
        venueId,
        clubId = null,
        bookingType = 'hourly',
        dates = [],
        event_name,
        purpose,
        phone_no,
        expected_attendees,
        start_time,
        end_time,
      } = req.body || {};

      // ---------- Basic field validation ----------
      if (
        !isUUID(venueId) ||
        (clubId !== null && !isUUID(clubId)) ||
        typeof purpose !== 'string' || !purpose.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or missing booking information',
        });
      }

      if (purpose.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Purpose is too long',
        });
      }

      if (
        event_name != null &&
        (typeof event_name !== 'string' || event_name.length > 200)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Event name is too long',
        });
      }

      if (!['hourly', 'daily'].includes(bookingType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid booking type',
        });
      }

      if (clubId) {
        return res.status(501).json({
          success: false,
          error: 'Club booking authorization is not configured yet',
        });
      }

      // ---------- Fetch venue ----------
      const { data: venue, error: venueError } =
        await supabase
          .from('venues')
          .select(`
            venue_id,
            capacity,
            venue_status,
            hourly_rate,
            hourly_deposit,
            daily_rate,
            daily_deposit,
            is_shared
          `)
          .eq('venue_id', venueId)
          .maybeSingle();

      if (venueError) throw venueError;

      if (!venue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found',
        });
      }

      if (venue.venue_status !== 'available') {
        return res.status(409).json({
          success: false,
          error: 'Venue is currently unavailable',
        });
      }

      const isShared = venue.is_shared === true;
      const capacity = Math.max(
        1,
        Number(venue.capacity) || 1
      );

      // ---------- Attendees ----------
      // Category A: forced to 1.
      // Category B: required, 1..capacity.
      let attendees;
      if (isShared) {
        if (
          !Number.isInteger(expected_attendees) ||
          expected_attendees < 1
        ) {
          return res.status(400).json({
            success: false,
            error:
              'Expected attendees is required for this venue',
          });
        }
        if (expected_attendees > capacity) {
          return res.status(400).json({
            success: false,
            error: `Expected attendees exceed venue capacity (${capacity})`,
          });
        }
        attendees = expected_attendees;
      } else {
        attendees = 1;
      }

      // ---------- Time + pricing ----------
      let quotedRate;
      let quotedDeposit;
      let durationHours;

      if (bookingType === 'hourly') {
        const timeError = validateBookingTime(
          start_time,
          end_time
        );
        if (timeError) {
          return res.status(400).json({
            success: false,
            error: timeError,
          });
        }

        durationHours =
          (new Date(end_time) - new Date(start_time)) /
          3600000;

        quotedRate =
          Number(venue.hourly_rate) * durationHours;
        quotedDeposit = Number(venue.hourly_deposit);
      } else {
        const rangeError = validateDailyRange(
          dates,
          start_time,
          end_time
        );
        if (rangeError) {
          return res.status(400).json({
            success: false,
            error: rangeError,
          });
        }

        durationHours = dates.length * 16;
        quotedRate =
          Number(venue.daily_rate) * dates.length;
        quotedDeposit = Number(venue.daily_deposit);
      }

      if (
        !Number.isFinite(quotedRate) ||
        !Number.isFinite(quotedDeposit) ||
        quotedRate < 0 ||
        quotedDeposit < 0
      ) {
        return res.status(500).json({
          success: false,
          error: 'Venue pricing is not configured',
        });
      }

      // ---------- Overlap / capacity check ----------
      const { data: overlaps, error: overlapError } =
        await supabase
          .from('bookings')
          .select(
            'start_time, end_time, expected_attendees'
          )
          .eq('venue_id', venueId)
          .lt('start_time', new Date(end_time).toISOString())
          .gt('end_time', new Date(start_time).toISOString())
          .in('status', ACTIVE_BOOKING_STATUSES);

      if (overlapError) throw overlapError;

      const active = overlaps || [];

      if (isShared) {
        for (
          let hour = 0;
          hour < durationHours;
          hour++
        ) {
          const slotStart =
            new Date(start_time).getTime() +
            hour * 3600000;
          const slotEnd = slotStart + 3600000;

          const occupied = active
            .filter(
              (b) =>
                new Date(b.start_time).getTime() <
                  slotEnd &&
                new Date(b.end_time).getTime() >
                  slotStart
            )
            .reduce(
              (sum, b) =>
                sum + (Number(b.expected_attendees) || 1),
              0
            );

          if (occupied + attendees > capacity) {
            return res.status(409).json({
              success: false,
              error:
                'Selected slot is at full capacity',
            });
          }
        }
      } else {
        if (active.length > 0) {
          return res.status(409).json({
            success: false,
            error:
              'One or more requested slots are already booked',
          });
        }
      }

      // ---------- Insert ----------
      const { data: booking, error: insertError } =
        await supabase
          .from('bookings')
          .insert({
            profile_id: req.bookingProfile.profile_id,
            club_id: null,
            venue_id: venueId,
            booking_type: bookingType,
            event_name:
              typeof event_name === 'string' && event_name.trim()
                ? event_name.trim()
                : null,
            purpose: purpose.trim(),
            expected_attendees: attendees,
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString(),
            date: new Date(start_time).toISOString(),
            status: 'pending',
            quoted_rate: quotedRate.toFixed(2),
            quoted_deposit: quotedDeposit.toFixed(2),
          })
          .select(
            'booking_id, venue_id, booking_type, status, start_time, end_time, quoted_rate, quoted_deposit'
          )
          .single();

      if (insertError) throw insertError;

      return res.status(201).json({
        success: true,
        message: 'Booking request submitted successfully',
        booking,
      });
    } catch (error) {
      console.error('Create booking error:', error);

      return res.status(500).json({
        success: false,
        error: 'Unable to create booking request',
      });
    }
  }
);

// ========================================
// POST /api/bookings/approve-booking
// MPP admin approves a pending booking
// ========================================

router.post(
  '/approve-booking',
  requireMPPAdmin,
  async (req, res) => {
    const { bookingId } = req.body || {};

    if (!isUUID(bookingId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid bookingId is required',
      });
    }

    try {
      // Atomic capacity check and status transition.
      const { data, error } = await supabase.rpc(
        'approve_booking_with_capacity',
        { p_booking_id: bookingId }
      );

      if (error) {
        console.error('Approval RPC error:', error);

        if (error.code === 'P0001') {
          return res.status(409).json({
            success: false,
            error: error.message,
          });
        }

        return res.status(503).json({
          success: false,
          error: 'Booking approval service unavailable',
        });
      }

      // Approval already committed in the database.
      // Report audit failures separately.
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'APPROVE_BOOKING',
          details: {
            bookingId,
            approved_at: new Date().toISOString(),
          },
        });

      if (logError) {
        console.error('Approval audit log error:', logError);

        return res.status(200).json({
          success: true,
          message:
            'Booking approved, but audit logging failed',
          booking: data,
          audit_logged: false,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Booking approved successfully',
        booking: data,
        audit_logged: true,
      });
    } catch (error) {
      console.error('Approve booking error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;