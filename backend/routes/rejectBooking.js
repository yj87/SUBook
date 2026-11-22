const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MIN_REASON = 10;
const MAX_REASON = 500;

// POST /api/bookings/:bookingId/reject
router.post('/:bookingId/reject', async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body || {};

  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId is required' });
  }

  const trimmed = String(reason ?? '').trim();
  if (trimmed.length < MIN_REASON) {
    return res.status(400).json({
      error: `Reason must be at least ${MIN_REASON} characters.`,
    });
  }
  if (trimmed.length > MAX_REASON) {
    return res.status(400).json({
      error: `Reason must be at most ${MAX_REASON} characters.`,
    });
  }

  try {
    const { data, error } = await supabase.rpc('reject_booking', {
      p_booking_id: bookingId,
      p_reason: trimmed,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[rejectBooking]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;