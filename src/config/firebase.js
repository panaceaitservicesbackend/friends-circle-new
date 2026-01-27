const admin = require('firebase-admin');
const path = require('path');

// Load service account JSON directly
const serviceAccount = require('../../config/firebaseServiceAccount.json');

// Initialize Firebase Admin SDK ONCE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin initialized with service account');
}

// Export messaging
const getMessaging = () => admin.messaging();

module.exports = {
  admin,
  getMessaging,
};
