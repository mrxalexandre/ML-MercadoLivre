import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCeSna9Y33zSWGhTIHLtBEPXKlPDeDYFL8",
  authDomain: "gen-lang-client-0477083622.firebaseapp.com",
  projectId: "gen-lang-client-0477083622",
  storageBucket: "gen-lang-client-0477083622.firebasestorage.app",
  messagingSenderId: "496939035388",
  appId: "1:496939035388:web:1881dbe7b0b152a69b8579"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-meliviewer-46744334-6939-470b-8a30-7e6d0395c8c2");
export const auth = getAuth(app);
