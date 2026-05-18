const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/orders
// @desc    Retrieve customer orders filtered by user_id (buyer) or kitchen_id (seller)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, kitchen_id } = req.query;

    if (!user_id && !kitchen_id) {
      return res.status(400).json({ 
        error: 'Query parameter "user_id" or "kitchen_id" is required to filter orders' 
      });
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        user:users(id, full_name, phone, email, flat_number),
        kitchen:cloud_kitchens(id, name, society_id)
      `);

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (kitchen_id) {
      query = query.eq('kitchen_id', kitchen_id);
    }

    // Sort by newest orders first
    const { data: orders, error } = await query.order('created_at', { ascending: false });

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
