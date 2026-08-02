import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getDataConnect } from "firebase/data-connect";
import { connectorConfig } from "./dataconnect";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCIcvphAtwx7rup-aV3MZPDK0w-xCN1Xoc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "eshop-app-6119d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "eshop-app-6119d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "eshop-app-6119d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "18064875571",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:18064875571:web:0cd166f0bc0446c7bc0346"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const dataConnect = getDataConnect(app, connectorConfig);
