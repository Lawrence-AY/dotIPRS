const logger = require('../utils/logger');

let admin = null;
let db = null;

function env(name) {
  const value = process.env[name];
  return value === undefined || value === '' ? null : value;
}

function normalizePrivateKey(value) {
  if (!value) return null;
  return value.trim().replace(/\\n/g, '\n');
}

function serviceAccountFromEnv() {
  const projectId = env('FIREBASE_PROJECT_ID');
  const clientEmail = env('FIREBASE_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(env('FIREBASE_PRIVATE_KEY'));

  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    type: env('FIREBASE_TYPE') || 'service_account',
    project_id: projectId,
    private_key_id: env('FIREBASE_PRIVATE_KEY_ID'),
    private_key: privateKey,
    client_email: clientEmail,
    client_id: env('FIREBASE_CLIENT_ID'),
    auth_uri: env('FIREBASE_AUTH_URI') || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: env('FIREBASE_TOKEN_URI') || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: env('FIREBASE_AUTH_PROVIDER_X509_CERT_URL') || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: env('FIREBASE_CLIENT_X509_CERT_URL'),
    universe_domain: env('FIREBASE_UNIVERSE_DOMAIN') || 'googleapis.com'
  };
}

function getFirebaseAdmin() {
  if (admin) return admin;

  try {
    admin = require('firebase-admin');
  } catch (error) {
    logger.warn({ error: error.message }, 'FIREBASE_ADMIN_NOT_INSTALLED');
    return null;
  }

  return admin;
}

function getFirestore() {
  if (db) return db;
  if (process.env.NODE_ENV === 'test' || process.env.FIREBASE_ENABLED === 'false') return null;

  const firebaseAdmin = getFirebaseAdmin();
  const serviceAccount = serviceAccountFromEnv();
  if (!firebaseAdmin || !serviceAccount) return null;

  try {
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount)
      });
    }
    db = firebaseAdmin.firestore();
    return db;
  } catch (error) {
    logger.error({ error: error.message }, 'FIREBASE_INITIALIZATION_FAILED');
    return null;
  }
}

module.exports = {
  getFirestore
};
