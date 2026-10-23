
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAbX6iNJjZ9lIqm4lACQKpA3-uwheny2DQ",
    authDomain: "bantay-bayan-27d5b.firebaseapp.com",
    projectId: "bantay-bayan-27d5b",
    appId: "1:504070553604:web:653d0fc151afc8fee2b551"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
