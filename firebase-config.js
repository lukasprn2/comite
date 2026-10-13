import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmi9aL4oXkqCokL_0nM70zyuexTQcrZj4",
  authDomain: "comite-f1488.firebaseapp.com",
  projectId: "comite-f1488",
  storageBucket: "comite-f1488.firebasestorage.app",
  messagingSenderId: "892199685134",
  appId: "1:892199685134:web:b25f78d61bd6245c68005f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
