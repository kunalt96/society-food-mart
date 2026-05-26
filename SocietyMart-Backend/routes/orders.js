const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/orders
// @desc    Retrieve orders for the authenticated user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Extract phone from authenticated user (set by auth middleware)
    const phone = req.user?.phone;
    if (!phone) {
      return res.status(401).json({ error: 'Unauthenticated: phone not found' });
    }

    // Fetch user id based on phone number
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (userError || !userData) {
      console.error('User fetch error:', userError?.message);
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userData.id;

    // Retrieve orders for the user, including related user and kitchen info
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(id, full_name, phone, email, flat_number),
        kitchen:cloud_kitchens(id, name, society_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve orders' });
    }

    res.status(200).json(orders || []);
  } catch (err) {
    console.error('Fetch Orders Server Error:', err);
    res.status(500).json({ error: 'Internal server error fetching orders' });
  }
});

module.exports = router;
