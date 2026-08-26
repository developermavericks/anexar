const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp({
    storageBucket: 'anexar-9820c.firebasestorage.app'
  });
} catch (e) {
  // Already initialized
}

const bucket = admin.storage().bucket();

async function setCors() {
  console.log('Updating CORS configuration for bucket:', bucket.name);
  await bucket.setCorsConfiguration([
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      origin: ['*'], // Allow all origins (localhost and production hosting)
      responseHeader: ['Content-Type', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'Authorization'],
    },
  ]);
  console.log('CORS configuration updated successfully!');
  process.exit(0);
}

setCors().catch(err => {
  console.error('Failed to configure CORS:', err.message);
  process.exit(1);
});
