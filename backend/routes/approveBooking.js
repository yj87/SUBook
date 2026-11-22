const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/bookings/:bookingId/approve
router.post('/:bookingId/approve', async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId is required' });
  }

  try {
    const { data, error } = await supabase.rpc('approve_booking_with_capacity', {
      p_booking_id: bookingId,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[approveBooking]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;