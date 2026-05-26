const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

function normalizeRoles(role) {
  if (Array.isArray(role)) return role;
  if (typeof role === 'string' && role.trim()) return [role.trim()];
  return [];
}

// @route   POST /api/kitchens
// @desc    Register a new cloud kitchen request (buyer can become seller)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { name, description, imageUrl, societyId } = req.body;

    if (!name || !societyId) {
      return res.status(400).json({ error: 'Name and housing society ID are required' });
    }

    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, role, kitchen_id')
      .eq('phone', user.phone)
      .single();

    if (userError || !dbUser) {
      return res.status(404).json({ error: 'User profile not found. Please complete registration first.' });
    }

    if (dbUser.kitchen_id) {
      return res.status(400).json({ error: 'Kitchen already exists for this user' });
    }

    const { data: newKitchen, error: kitchenError } = await supabase
      .from('cloud_kitchens')
      .insert([
        {
          society_id: societyId,
          name,
          description: description || '',
          image_url: imageUrl || '',
          is_active: true,
          is_verified: false
        }
      ])
      .select()
      .single();

    if (kitchenError) {
      console.error('Error creating cloud kitchen:', kitchenError.message);
      return res.status(500).json({ error: 'Failed to register cloud kitchen' });
    }

    const updatedRoles = Array.from(new Set([...normalizeRoles(dbUser.role), 'buyer', 'seller']));

    const { error: updateError } = await supabase
      .from('users')
      .update({ kitchen_id: newKitchen.id, role: updatedRoles })
      .eq('id', dbUser.id);

    if (updateError) {
      console.error('Error linking kitchen to user profile:', updateError.message);
      // Attempt clean up of dangling kitchen to prevent ghost records
      await supabase.from('cloud_kitchens').delete().eq('id', newKitchen.id);
      return res.status(500).json({ error: 'Failed to link kitchen to owner profile' });
    }

    res.status(201).json({
      message: 'Verification is in progress and you will be assigned a kitchen id soon.',
      kitchen: newKitchen
    });

  } catch (err) {
    console.error('Register Cloud Kitchen Server Error:', err);
    res.status(500).json({ error: 'Internal server error during kitchen registration' });
  }
});

// @route   GET /api/kitchens
// @desc    Get all active and verified cloud kitchens
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: kitchens, error } = await supabase
      .from('cloud_kitchens')
      .select(`
        *,
        society:societies(*),
        dishes:dishes(*)
      `)
      .eq('is_active', true)
      .eq('is_verified', true);

    if (error) {
      console.error('Error fetching cloud kitchens:', error.message);
      return res.status(500).json({ error: 'Failed to fetch cloud kitchens list' });
    }

    res.status(200).json(kitchens);

  } catch (err) {
    console.error('Fetch Kitchens Server Error:', err);
    res.status(500).json({ error: 'Internal server error fetching cloud kitchens list' });
  }
});

// @route   GET /api/kitchens/:id
// @desc    Get a specific cloud kitchen detail, including verification state
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const kitchenId = req.params.id;

    const { data: kitchen, error } = await supabase
      .from('cloud_kitchens')
      .select(`
        *,
        society:societies(*),
        dishes:dishes(*)
      `)
      .eq('id', kitchenId)
      .single();

    if (error || !kitchen) {
      return res.status(404).json({ error: 'Cloud kitchen not found' });
    }

    const activeDishes = (kitchen.dishes || []).filter(dish => dish.is_available);

    res.status(200).json({
      kitchen: {
        ...kitchen,
        dishes: undefined // clean response payload redundancy
      },
      dishes: activeDishes
    });

  } catch (err) {
    console.error('Fetch Kitchen Details Server Error:', err);
    res.status(500).json({ error: 'Internal server error fetching kitchen details' });
  }
});

module.exports = router;
