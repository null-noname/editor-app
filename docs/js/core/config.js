// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaXyH96jd-k3r1MRaDiN9KWo2oN2lpaW4",
  authDomain: "editor-app-29ca6.firebaseapp.com",
  projectId: "editor-app-29ca6",
  storageBucket: "editor-app-29ca6.firebasestorage.app",
  messagingSenderId: "666399306180",
  appId: "1:666399306180:web:619b5765655311d4a03491"
};

const app = initializeApp(firebaseConfig, "EditorApp");
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Set persistence to SESSION to avoid cross-app conflicts
setPersistence(auth, browserSessionPersistence);

export { auth, db, googleProvider };
