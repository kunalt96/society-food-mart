const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/dishes
// @desc    Get all dishes (can be filtered by kitchen_id)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { kitchen_id } = req.query;

    let query = supabase.from('dishes').select('*').eq('is_available', true);

    if (kitchen_id) {
      query = query.eq('kitchen_id', kitchen_id);
    }

    const { data: dishes, error } = await query;

    if (error) throw error;

    res.status(200).json(dishes);
  } catch (err) {
    console.error('Error fetching dishes:', err);
    res.status(500).json({ error: 'Server error fetching dishes' });
  }
});

// @route   POST /api/dishes
// @desc    Add a new dish (Sellers only)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { name, description, price, isVeg, imageUrl } = req.body;

    // First check if the user is a seller in our DB
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !dbUser || dbUser.role !== 'seller') {
      return res.status(403).json({ error: 'Forbidden: Only sellers can add dishes' });
    }

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const { data: newDish, error: dishError } = await supabase
      .from('dishes')
      .insert([
        {
          kitchen_id: user.id, // The seller is the kitchen
          name,
          description: description || '',
          price,
          is_veg: isVeg ?? true,
          image_url: imageUrl || null,
          is_available: true
        }
      ])
      .select()
      .single();

    if (dishError) throw dishError;

    res.status(201).json({ message: 'Dish added successfully', dish: newDish });
  } catch (err) {
    console.error('Error adding dish:', err);
    res.status(500).json({ error: 'Server error adding dish' });
  }
});

module.exports = router;
