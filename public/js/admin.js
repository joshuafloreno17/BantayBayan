import { auth } from "./firebase-config.js";
import { isOfficial } from "./official-check.js";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

function showLoginMessage(message, type = "danger") {
    loginMessage.textContent = message;
    loginMessage.className = `alert alert-${type}`;
}

function resetButton() {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
}

// Dito lang chine-check kung official ang naka-login, para iisa ang daan
// (pagbukas ng page at pagkatapos mag-sign in).
onAuthStateChanged(auth, async user => {
    if (!user) return;

    if (await isOfficial(user)) {
        showLoginMessage("Login successful. Opening dashboard...", "success");
        window.location.replace("official-dashboard.html");
        return;
    }

    await signOut(auth);
    resetButton();
    showLoginMessage(
        "Walang pahintulot ang account na ito para sa official dashboard. " +
        "Kung resident ka, gamitin ang Resident Login."
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

        await signInWithEmailAndPassword(auth, email, password);
        // Ang onAuthStateChanged sa itaas ang magre-redirect o magsa-sign out.
    } catch (error) {
        console.error("Login error:", error);
        showLoginMessage(
            "Hindi makapag-login. Tingnan ang email at password at subukan ulit."
        );
        resetButton();
    }
});
