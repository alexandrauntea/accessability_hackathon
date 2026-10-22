// Owner: Alexandra (foundation). Single place that initialises Firebase.
import { initializeApp, getApps } from 'firebase/app';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, connectAuthEmulator, Auth } from 'firebase/auth';
// @ts-ignore -- exported by the React Native build of firebase/auth, missing from the web typings
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { config } from './config';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);
// Web: browser persistence (default). Expo Go: AsyncStorage so the anonymous account survives reloads.
function makeAuth(): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch { return getAuth(app); } // already initialised (fast refresh)
}
export const auth = makeAuth();
export const db = getFirestore(app);
export const functions = getFunctions(app, config.functionsRegion);

if (config.useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
