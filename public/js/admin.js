
import { auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const OFFICIAL_UID = "lA4mlJYUdBSsu8qZjTOSeFet3Tr2";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

function showLoginMessage(message, type = "danger") {
    loginMessage.textContent = message;
    loginMessage.className = `alert alert-${type}`;
}

onAuthStateChanged(auth, async user => {
    if (!user) return;

    if (user.uid === OFFICIAL_UID) {
       window.location.replace("official-dashboard.html");
        return;
    }

    await signOut(auth);
    showLoginMessage(
        "Ang account na ito ay walang pahintulot na pumasok sa official dashboard."
    );
});

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!loginForm.reportValidity()) return;

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const credential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        if (credential.user.uid !== OFFICIAL_UID) {
            await signOut(auth);
            showLoginMessage(
                "Walang pahintulot ang account na ito para sa official dashboard."
            );
            return;
        }

        showLoginMessage("Login successful. Opening dashboard...", "success");
        window.location.replace("official-dashboard.html");

    } catch (error) {
        console.error("Login error:", error);
        showLoginMessage(
            "Hindi makapag-login. Tingnan ang email at password at subukan ulit."
        );
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});
