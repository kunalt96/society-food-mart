const admin = require('../config/firebase-admin');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the Firebase ID Token
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Attach the decoded user info to the request object
      // Firebase decoded token includes 'uid', 'phone_number', etc.
      req.user = {
        id: decodedToken.uid,
        phone: decodedToken.phone_number,
        email: decodedToken.email,
        ...decodedToken
      };
      
      next();
    } catch (verifyError) {
      console.error('Firebase Token Verification Failed:', verifyError.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
    }
    
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};

module.exports = authMiddleware;
