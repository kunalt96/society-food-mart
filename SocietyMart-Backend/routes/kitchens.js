const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/kitchens
// @desc    Get all active kitchens (sellers) for the marketplace
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Fetch all users who have the role of 'seller'
    const { data: kitchens, error } = await supabase
      .from('users')
      .select('id, full_name, society_id, flat_number')
      .eq('role', 'seller');

    if (error) throw error;

    res.status(200).json(kitchens);
  } catch (err) {
    console.error('Error fetching kitchens:', err);
    res.status(500).json({ error: 'Server error fetching kitchens' });
  }
});

// @route   GET /api/kitchens/:id
// @desc    Get a specific kitchen details and their dishes
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const kitchenId = req.params.id;

    // Fetch the kitchen profile
    const { data: kitchen, error: kitchenError } = await supabase
      .from('users')
      .select('id, full_name, society_id, flat_number')
      .eq('id', kitchenId)
      .eq('role', 'seller')
      .single();

    if (kitchenError) {
      return res.status(404).json({ error: 'Kitchen not found' });
    }

    // Fetch the dishes for this kitchen
    const { data: dishes, error: dishesError } = await supabase
      .from('dishes')
      .select('*')
      .eq('kitchen_id', kitchenId)
      .eq('is_available', true);

    if (dishesError) throw dishesError;

    res.status(200).json({
      kitchen,
      dishes: dishes || []
    });

  } catch (err) {
    console.error('Error fetching kitchen details:', err);
    res.status(500).json({ error: 'Server error fetching kitchen details' });
  }
});

module.exports = router;
