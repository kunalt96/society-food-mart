const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

const ALLOWED_CATEGORIES = ['starters', 'main-course', 'desserts', 'bakery', 'miscellaneous'];

async function getDbUserByPhone(phone) {
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('id, role, kitchen_id')
    .eq('phone', phone)
    .single();

  return { dbUser, error };
}

function hasSellerRole(role) {
  if (Array.isArray(role)) return role.includes('seller');
  return role === 'seller';
}

// @route   GET /api/dishes
// @desc    Get public dishes list (optionally filtered by kitchen_id)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { kitchen_id } = req.query;

    let query = supabase.from('dishes').select('*').eq('is_available', true);

    if (kitchen_id) {
      query = query.eq('kitchen_id', kitchen_id);
    }

    const { data: dishes, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(dishes || []);
  } catch (err) {
    console.error('Error fetching dishes:', err);
    res.status(500).json({ error: 'Server error fetching dishes' });
  }
});

// @route   GET /api/dishes/mine
// @desc    Get all dishes for logged-in seller kitchen (includes unavailable)
// @access  Private
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const { dbUser, error: userError } = await getDbUserByPhone(req.user.phone);

    if (userError || !dbUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!hasSellerRole(dbUser.role)) {
      return res.status(403).json({ error: 'Forbidden: Only sellers can view seller dishes' });
    }

    if (!dbUser.kitchen_id) {
      return res.status(400).json({ error: 'No registered kitchen found for this user profile.' });
    }

    const { data: dishes, error: dishesError } = await supabase
      .from('dishes')
      .select('*')
      .eq('kitchen_id', dbUser.kitchen_id)
      .order('created_at', { ascending: false });

    if (dishesError) {
      return res.status(500).json({ error: 'Failed to fetch seller dishes' });
    }

    res.status(200).json({ dishes: dishes || [], kitchenId: dbUser.kitchen_id });
  } catch (err) {
    console.error('Error fetching seller dishes:', err);
    res.status(500).json({ error: 'Server error fetching seller dishes' });
  }
});

// @route   POST /api/dishes
// @desc    Add a new dish (seller only)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { name, description, price, imageUrl, category, isAvailable } = req.body;

    if (!name || price === undefined || price === null || category === undefined) {
      return res.status(400).json({ error: 'Name, category and price are required' });
    }

    const normalizedCategory = String(category).toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a valid number greater than 0' });
    }

    const { dbUser, error: userError } = await getDbUserByPhone(user.phone);

    if (userError || !dbUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!hasSellerRole(dbUser.role)) {
      return res.status(403).json({ error: 'Forbidden: Only sellers can add dishes' });
    }

    if (!dbUser.kitchen_id) {
      return res.status(400).json({
        error: 'No registered kitchen found for this user profile. Please register a kitchen first.'
      });
    }

    const { data: newDish, error: dishError } = await supabase
      .from('dishes')
      .insert([
        {
          kitchen_id: dbUser.kitchen_id,
          name: String(name).trim(),
          description: description ? String(description).trim() : '',
          price: parsedPrice,
          image_url: imageUrl || null,
          category: normalizedCategory,
          is_available: typeof isAvailable === 'boolean' ? isAvailable : false,
        }
      ])
      .select()
      .single();

    if (dishError) {
      console.error('Error adding dish:', dishError.message);
      return res.status(500).json({ error: 'Failed to add dish' });
    }

    res.status(201).json({
      message: 'Dish added successfully',
      dish: newDish
    });
  } catch (err) {
    console.error('Error adding dish server error:', err);
    res.status(500).json({ error: 'Server error adding dish' });
  }
});

// @route   PATCH /api/dishes/:id/availability
// @desc    Toggle/update dish availability for seller's own kitchen dish
// @access  Private
router.patch('/:id/availability', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available boolean is required' });
    }

    const { dbUser, error: userError } = await getDbUserByPhone(req.user.phone);

    if (userError || !dbUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!hasSellerRole(dbUser.role)) {
      return res.status(403).json({ error: 'Forbidden: Only sellers can update dish availability' });
    }

    if (!dbUser.kitchen_id) {
      return res.status(400).json({ error: 'No registered kitchen found for this user profile.' });
    }

    const { data: existingDish, error: dishFetchError } = await supabase
      .from('dishes')
      .select('id, kitchen_id, is_available')
      .eq('id', id)
      .single();

    if (dishFetchError || !existingDish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    if (String(existingDish.kitchen_id) !== String(dbUser.kitchen_id)) {
      return res.status(403).json({ error: 'Forbidden: You can update only your own kitchen dishes' });
    }

    const { data: updatedDish, error: updateError } = await supabase
      .from('dishes')
      .update({ is_available })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update dish availability' });
    }

    res.status(200).json({ message: 'Dish availability updated', dish: updatedDish });
  } catch (err) {
    console.error('Error updating dish availability:', err);
    res.status(500).json({ error: 'Server error updating dish availability' });
  }
});

module.exports = router;
