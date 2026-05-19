const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from parent directory monorepo .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.ADMIN_PORT || 5002;

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Warning: Supabase credentials missing in monorepo .env file!');
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
  try {
    // 1. Get societies count
    const { data: societies } = await safeGetSocieties();
    const societiesCount = societies.length;

    // 2. Get active kitchens count (role contains 'seller')
    const { data: kitchens } = await supabase.from('users').select('id').cs('role', ['seller']);
    const kitchensCount = kitchens ? kitchens.length : 0;

    // 3. Get total dishes count
    const { data: dishes } = await supabase.from('dishes').select('id');
    const dishesCount = dishes ? dishes.length : 0;

    // 4. Get registered users count
    const { data: users } = await supabase.from('users').select('id');
    const usersCount = users ? users.length : 0;

    res.render('dashboard', {
      page: 'dashboard',
      stats: {
        societiesCount,
        kitchensCount,
        dishesCount,
        usersCount
      }
    });
  } catch (err) {
    console.error('Dashboard Stats Error:', err);
    res.render('dashboard', {
      page: 'dashboard',
      stats: { societiesCount: 0, kitchensCount: 0, dishesCount: 0, usersCount: 0 }
    });
  }
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
      throw error;
    }

    res.redirect('/societies?success=Society registered successfully!');
  } catch (err) {
    console.error('Error adding society:', err.message);
    res.redirect('/societies');
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
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .cs('role', ['seller']);

    if (userError) throw userError;

    const { data: societies } = await safeGetSocieties();
    const societyMap = {};
    if (societies) {
      societies.forEach(s => {
        societyMap[s.id] = s.name;
      });
    }

    const kitchens = (users || []).map(u => ({
      ...u,
      societyName: societyMap[u.society_id] || 'Default Community'
    }));

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

// @route   POST /kitchens/delete/:id
app.post('/kitchens/delete/:id', requireLogin, async (req, res) => {
  const kitchenId = req.params.id;
  try {
    // 1. Delete dishes belonging to this kitchen first to avoid foreign key errors
    await supabase.from('dishes').delete().eq('kitchen_id', kitchenId);
    
    // 2. Delete the user
    const { error } = await supabase.from('users').delete().eq('id', kitchenId);
    if (error) throw error;

    res.redirect('/kitchens?success=Seller kitchen deleted successfully.');
  } catch (err) {
    console.error('Error deleting kitchen:', err.message);
    res.redirect('/kitchens');
  }
});

// @route   GET /dishes
app.get('/dishes', requireLogin, async (req, res) => {
  try {
    const { data: dishesList, error: dishError } = await supabase.from('dishes').select('*');
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
