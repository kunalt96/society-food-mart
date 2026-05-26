const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from multiple likely locations (monorepo root, backend folder)
const dotenv = require('dotenv');
const triedEnvFiles = [];
const tryLoadEnv = (p) => {
  try {
    const res = dotenv.config({ path: p });
    triedEnvFiles.push(p);
    return res && !res.error;
  } catch (e) {
    return false;
  }
};

// Try monorepo .env, backend .env, then parent dirs
tryLoadEnv(path.join(__dirname, '../.env'));
tryLoadEnv(path.join(__dirname, '../SocietyMart-Backend/.env'));
tryLoadEnv(path.join(__dirname, '../../.env'));

const app = express();
const PORT = process.env.ADMIN_PORT || 5002;

// Supabase Initialization (after loading envs)
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Warning: Supabase credentials missing. Tried files:', triedEnvFiles.join(', '));
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);

// Express Config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Config
app.use(session({
  secret: process.env.SESSION_SECRET || 'societymart-admin-secret-key-13579',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Admin credentials
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware to protect routes
const requireLogin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.redirect('/login');
  }
};

// SQL helper query for missing tables
const SOCIETIES_SQL = `
CREATE TABLE societies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
`;

// Helper: Safely fetch societies to prevent server crash on missing table
async function safeGetSocieties() {
  try {
    const { data, error } = await supabase.from('societies').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return { data: [], error: 'missing_table' };
      }
      throw error;
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching societies:', err.message);
    return { data: [], error: 'missing_table' };
  }
}

// @route   GET /
app.get('/', (req, res) => {
  if (req.session && req.session.isAdmin) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// @route   GET /login
app.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

// @route   POST /login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'Invalid admin username or password.' });
  }
});

// @route   GET /logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// @route   GET /dashboard
app.get('/dashboard', requireLogin, async (req, res) => {
  let societiesCount = 0;
  let kitchensCount = 0;
  let dishesCount = 0;
  let usersCount = 0;

  // 1. Get societies count
  try {
    const { data: societies } = await safeGetSocieties();
    societiesCount = societies ? societies.length : 0;
  } catch (err) {
    console.error('Dashboard Error fetching societies:', err.message);
  }

  // 2. Get active kitchens count (from cloud_kitchens)
  try {
    const { data: kitchens, error: kitchenError } = await supabase
      .from('cloud_kitchens')
      .select('id');
    if (kitchenError) throw kitchenError;
    kitchensCount = kitchens ? kitchens.length : 0;
  } catch (err) {
    console.error('Dashboard Error fetching kitchens:', err.message);
  }

  // 3. Get total dishes count
  try {
    const { data: dishes, error: dishesError } = await supabase
      .from('dishes')
      .select('id');
    if (dishesError) throw dishesError;
    dishesCount = dishes ? dishes.length : 0;
  } catch (err) {
    console.error('Dashboard Error fetching dishes:', err.message);
  }

  // 4. Get registered users count
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');
    if (usersError) throw usersError;
    usersCount = users ? users.length : 0;
  } catch (err) {
    console.error('Dashboard Error fetching users:', err.message);
  }

  res.render('dashboard', {
    page: 'dashboard',
    stats: {
      societiesCount,
      kitchensCount,
      dishesCount,
      usersCount
    }
  });
});

// @route   GET /societies
app.get('/societies', requireLogin, async (req, res) => {
  const { data: societies, error } = await safeGetSocieties();
  
  let errorMsg = null;
  if (error === 'missing_table') {
    errorMsg = `⚠️ The 'societies' table does not exist in your Supabase database yet. Please run the following SQL query in your Supabase SQL Editor to create it:\n\n${SOCIETIES_SQL}`;
  }

  res.render('societies', {
    page: 'societies',
    societies,
    successMsg: req.query.success || null,
    errorMsg
  });
});

// @route   POST /societies/add
app.post('/societies/add', requireLogin, async (req, res) => {
  const { name, address, latitude, longitude } = req.body;
  // Basic validation
  if (!name || !address) {
    return res.redirect('/societies?error=Name and address are required.');
  }
  try {
    const { error } = await supabase.from('societies').insert({
      name,
      address,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        return res.redirect('/societies?error=missing_table');
      }
      return res.redirect('/societies?error=' + encodeURIComponent(error.message));
    }

    res.redirect('/societies?success=' + encodeURIComponent('Society registered successfully!'));
  } catch (err) {
    console.error('Error adding society:', err.message);
    res.redirect('/societies?error=' + encodeURIComponent('Failed to add society.'));
  }
});

// @route   POST /societies/delete/:id
app.post('/societies/delete/:id', requireLogin, async (req, res) => {
  const societyId = req.params.id;
  try {
    const { error } = await supabase.from('societies').delete().eq('id', societyId);
    if (error) throw error;
    res.redirect('/societies?success=Society deleted successfully.');
  } catch (err) {
    console.error('Error deleting society:', err.message);
    res.redirect('/societies');
  }
});

// @route   GET /kitchens
app.get('/kitchens', requireLogin, async (req, res) => {
  try {
    // 1. Fetch all cloud kitchens
    const { data: kitchensList, error: kitchenError } = await supabase
      .from('cloud_kitchens')
      .select('*')
      .order('created_at', { ascending: false });

    if (kitchenError) throw kitchenError;

    // 2. Fetch all users who have a registered kitchen
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .not('kitchen_id', 'is', null);

    if (userError) throw userError;

    // 3. Fetch housing societies
    const { data: societies } = await safeGetSocieties();
    const societyMap = {};
    if (societies) {
      societies.forEach(s => {
        societyMap[s.id] = s.name;
      });
    }

    // Build user map lookup key by kitchen_id
    const userMap = {};
    if (users) {
      users.forEach(u => {
        userMap[u.kitchen_id] = u;
      });
    }

    // 4. Combine data
    const kitchens = (kitchensList || []).map(k => {
      const owner = userMap[k.id] || {};
      return {
        id: k.id,
        name: k.name,
        description: k.description,
        is_verified: k.is_verified,
        is_active: k.is_active,
        full_name: owner.full_name || 'Home Chef',
        phone: owner.phone || 'N/A',
        email: owner.email || 'N/A',
        flat_number: owner.flat_number || 'N/A',
        societyName: societyMap[k.society_id] || 'Default Community'
      };
    });

    res.render('kitchens', {
      page: 'kitchens',
      kitchens,
      successMsg: req.query.success || null
    });
  } catch (err) {
    console.error('Error in /kitchens page:', err.message);
    res.render('kitchens', { page: 'kitchens', kitchens: [] });
  }
});

// @route   PUT /kitchens/verify/:id
// @desc    Approve/verify a cloud kitchen request and grant seller role
app.put('/kitchens/verify/:id', requireLogin, async (req, res) => {
  const kitchenId = req.params.id;
  try {
    // 1. Mark kitchen as verified
    const { error: kitchenError } = await supabase
      .from('cloud_kitchens')
      .update({ is_verified: true })
      .eq('id', kitchenId);

    if (kitchenError) throw kitchenError;

    // 2. Grant seller role to the kitchen owner
    const { data: dbUser, error: userFetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('kitchen_id', kitchenId)
      .maybeSingle();

    if (userFetchError) throw userFetchError;

    if (dbUser) {
      const existingRoles = Array.isArray(dbUser.role) ? dbUser.role : [dbUser.role];
      const updatedRoles = existingRoles.includes('seller')
        ? existingRoles
        : [...existingRoles, 'seller'];

      const { error: roleUpdateError } = await supabase
        .from('users')
        .update({ role: updatedRoles })
        .eq('id', dbUser.id);

      if (roleUpdateError) throw roleUpdateError;
    }

    res.json({ success: true, message: 'Kitchen verified and seller role granted.' });
  } catch (err) {
    console.error('Error verifying kitchen:', err.message);
    res.status(500).json({ error: 'Failed to verify kitchen.' });
  }
});

// @route   POST /kitchens/delete/:id
// @desc    Terminate a seller kitchen: unlinks user profile, removes dishes, and deletes kitchen row
app.post('/kitchens/delete/:id', requireLogin, async (req, res) => {
  const kitchenId = req.params.id;
  try {
    // 1. Find the associated user with this kitchen_id
    const { data: dbUser, error: userFetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('kitchen_id', kitchenId)
      .maybeSingle();

    if (userFetchError) throw userFetchError;

    // 2. Unlink user from kitchen and remove 'seller' role
    if (dbUser) {
      const roles = Array.isArray(dbUser.role) ? dbUser.role : [dbUser.role || 'buyer'];
      const updatedRoles = roles.filter(r => r !== 'seller');
      
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          kitchen_id: null,
          role: updatedRoles.length > 0 ? updatedRoles : ['buyer']
        })
        .eq('id', dbUser.id);

      if (userUpdateError) throw userUpdateError;
    }

    // 3. Delete dishes belonging to this kitchen to prevent foreign key errors
    const { error: dishesError } = await supabase
      .from('dishes')
      .delete()
      .eq('kitchen_id', kitchenId);

    if (dishesError) throw dishesError;
    
    // 4. Delete the cloud kitchen row itself
    const { error: kitchenDeleteError } = await supabase
      .from('cloud_kitchens')
      .delete()
      .eq('id', kitchenId);

    if (kitchenDeleteError) throw kitchenDeleteError;

    res.redirect('/kitchens?success=Seller kitchen terminated successfully.');
  } catch (err) {
    console.error('Error deleting kitchen:', err.message);
    res.redirect('/kitchens');
  }
});

// @route   GET /dishes
app.get('/dishes', requireLogin, async (req, res) => {
  try {
  let errorMsg = null;
  let successMsg = null;
    if (dishError) throw dishError;

    const { data: users } = await supabase.from('users').select('id, full_name');
    const userMap = {};
    if (users) {
      users.forEach(u => {
        userMap[u.id] = u.full_name;
      });
    }

    const dishes = (dishesList || []).map(d => ({
      ...d,
      chefName: userMap[d.kitchen_id] || 'Home Chef'
    }));

    res.render('dishes', {
      page: 'dishes',
      dishes,
      successMsg: req.query.success || null
    });
  } catch (err) {
    console.error('Error loading /dishes view:', err.message);
    res.render('dishes', { page: 'dishes', dishes: [] });
  }
});

// @route   POST /dishes/delete/:id
app.post('/dishes/delete/:id', requireLogin, async (req, res) => {
  const dishId = req.params.id;
  try {
    const { error } = await supabase.from('dishes').delete().eq('id', dishId);
    if (error) throw error;
    res.redirect('/dishes?success=Dish listing permanently removed.');
  } catch (err) {
    console.error('Error deleting dish:', err.message);
    res.redirect('/dishes');
  }
});

// @route   GET /users
app.get('/users', requireLogin, async (req, res) => {
  try {
    const { data: memberList, error: memberError } = await supabase.from('users').select('*');
    if (memberError) throw memberError;

    const { data: societies } = await safeGetSocieties();
    const societyMap = {};
    if (societies) {
      societies.forEach(s => {
        societyMap[s.id] = s.name;
      });
    }

    const users = (memberList || []).map(m => ({
      ...m,
      societyName: societyMap[m.society_id] || 'Default Community'
    }));

    res.render('users', {
      page: 'users',
      users,
      successMsg: req.query.success || null
    });
  } catch (err) {
    console.error('Error in /users directory view:', err.message);
    res.render('users', { page: 'users', users: [] });
  }
});

// @route   POST /users/delete/:id
app.post('/users/delete/:id', requireLogin, async (req, res) => {
  const memberId = req.params.id;
  try {
    // 1. Delete dishes if user is a seller to avoid constraint failure
    await supabase.from('dishes').delete().eq('kitchen_id', memberId);
    
    // 2. Delete user row
    const { error } = await supabase.from('users').delete().eq('id', memberId);
    if (error) throw error;

    res.redirect('/users?success=User account deleted successfully.');
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.redirect('/users');
  }
});

// Run server
app.listen(PORT, () => {
  console.log(`🚀 SocietyMart Admin Center is running on port ${PORT}`);
  console.log(`🔑 Default Credentials: username: 'admin' | password: 'admin123'`);
});
