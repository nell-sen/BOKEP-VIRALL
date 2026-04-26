// Firebase initialization (modular SDK via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, limit, startAfter,
  getDocs, getDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1htQRPEeP07arataGdYpr8dPdZg5mezY",
  authDomain: "code-chat-219c7.firebaseapp.com",
  projectId: "code-chat-219c7",
  storageBucket: "code-chat-219c7.firebasestorage.app",
  messagingSenderId: "833143379454",
  appId: "1:833143379454:web:a3751760d3bfc7ee135caf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Expose to other modules
window.__fb = {
  db, collection, addDoc, query, orderBy, limit, startAfter,
  getDocs, getDoc, doc, serverTimestamp
};
