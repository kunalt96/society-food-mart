const admin = require('firebase-admin');
const path = require('path');

// We expect the service account JSON to be in the backend root
// You can download this from Firebase Console -> Project Settings -> Service Accounts
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase Admin failed to initialize. Make sure serviceAccountKey.json is in the backend directory.');
}

module.exports = admin;
