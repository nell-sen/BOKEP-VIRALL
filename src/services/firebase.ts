import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA1htQRPEeP07arataGdYpr8dPdZg5mezY",
  authDomain: "code-chat-219c7.firebaseapp.com",
  projectId: "code-chat-219c7",
  storageBucket: "code-chat-219c7.firebasestorage.app",
  messagingSenderId: "833143379454",
  appId: "1:833143379454:web:a3751760d3bfc7ee135caf"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
