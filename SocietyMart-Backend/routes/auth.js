const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/auth/login
// @desc    Check if user exists in Supabase by Phone Number and sync profile
// @access  Private (Requires Firebase Bearer token)
router.post('/login', authMiddleware, async (req, res) => {
  try {
    const user = req.user; // Provided by authMiddleware (decoded from Firebase)

    console.log(`[Auth] Checking user with Phone: ${user.phone}`);

    const phone = user.phone || null;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number not found in token' });
    }

    // 1. Check if user already exists in our Supabase 'users' table using Phone Number
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    // PGRST116 means 0 rows returned, which is expected for new users
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[Auth] Database fetch error:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }

    // 2. If user does NOT exist, return new user skeleton (without Firebase UID)
    if (!existingUser) {
      console.log(`[Auth] User with phone ${phone} not found. Returning new user skeleton.`);

      const newUserSkeleton = {
        full_name: '',
        email: user.email || '',
        phone: phone,
        society_id: null,
        flat_number: '',
        role: ['buyer']
      };

      return res.status(200).json({
        isNewUser: true,
        user: newUserSkeleton,
        message: 'Welcome! Please complete your profile.'
      });
    }

    let userWithSociety = existingUser;

    if (existingUser.society_id) {
      const { data: societyData, error: societyError } = await supabase
        .from('societies')
        .select('*')
        .eq('id', existingUser.society_id)
        .single();

      if (societyError && societyError.code !== 'PGRST116') {
        console.warn('[Auth] Failed to fetch society details:', societyError.message);
      }

      userWithSociety = {
        ...existingUser,
        society: societyData || null,
      };
    }

    // 3. User exists - check if registration is complete
    const isNewUser = !existingUser.full_name || !existingUser.society_id;

    console.log(`[Auth] User found. Status: ${isNewUser ? 'Incomplete Registration' : 'Returning User'}`);

    res.status(200).json({
      isNewUser,
      user: userWithSociety,
      message: isNewUser ? 'Welcome! Please complete your profile.' : 'Welcome back!'
    });

  } catch (err) {
    console.error('[Auth] Login Route Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/complete-registration
// @desc    Create or update user profile with full name, society, and flat details matching by Phone Number
// @access  Private
router.post('/complete-registration', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { fullName, societyId, flatNumber, role } = req.body;

    if (!fullName || !societyId || !role || (Array.isArray(role) && role.length === 0)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const phone = user.phone;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number not found in token' });
    }

    const roleArray = Array.isArray(role) ? role : [role];

    console.log(`[Auth] Upserting profile for Phone: ${phone}`);

    // Upsert the profile using phone as matching key (no Firebase UID column used)
    const { data: updatedUser, error } = await supabase
      .from('users')
      .upsert({
        phone: phone,
        email: user.email || null,
        full_name: fullName,
        society_id: societyId,
        flat_number: flatNumber,
        role: roleArray
      }, {
        onConflict: 'phone'
      })
      .select()
      .single();

    if (error) {
      console.error('[Auth] Error upserting user profile:', error);
      return res.status(500).json({ error: 'Failed to complete registration' });
    }

    res.status(200).json({
      message: 'Registration completed successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('[Auth] Registration Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Formally log out user on backend
// @access  Private
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    console.log(`[Auth] User logged out successfully for Phone: ${req.user.phone}`);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[Auth] Logout route error:', err);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

module.exports = router;
