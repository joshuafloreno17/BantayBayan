
import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const OFFICIAL_UID = "lA4mlJYUdBSsu8qZjTOSeFet3Tr2";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

let loginInProgress = false;
let redirectStarted = false;

function showMessage(message, type = "danger") {
    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.className = `alert alert-${type}`;
    loginMessage.classList.remove("d-none");
}

function redirectByAccount(user) {
    if (!user || redirectStarted) return;

    redirectStarted = true;

    if (user.uid === OFFICIAL_UID) {
        window.location.replace("official-dashboard.html");
    } else {
        window.location.replace("dashboard.html");
    }
}

onAuthStateChanged(auth, user => {
    // Huwag mag-redirect agad kapag binuksan ang login page.
    // Magre-redirect lang pagkatapos ng matagumpay na login.
    return;
});

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (loginInProgress) return;
        if (!loginForm.reportValidity()) return;

        const email = document.getElementById("email")?.value.trim();
        const password = document.getElementById("password")?.value;

        if (!email || !password) {
            showMessage("Pakilagay ang email at password.", "warning");
            return;
        }

        loginInProgress = true;

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
        }

        try {
            const credential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            showMessage(
                "Matagumpay ang login! Binubuksan ang dashboard...",
                "success"
            );

            redirectByAccount(credential.user);

        } catch (error) {
            console.error("Login error:", error);

            let message = "Hindi nagtagumpay ang login. Subukan ulit.";

            if (
                error.code === "auth/invalid-credential" ||
                error.code === "auth/user-not-found" ||
                error.code === "auth/wrong-password"
            ) {
                message = "Mali ang email o password.";
            } else if (error.code === "auth/invalid-email") {
                message = "Hindi valid ang email address.";
            } else if (error.code === "auth/too-many-requests") {
                message = "Masyadong maraming pagtatangka. Subukan ulit mamaya.";
            } else if (error.code === "auth/network-request-failed") {
                message = "May problema sa internet connection.";
            }

            loginInProgress = false;
            showMessage(message, "danger");

        } finally {
            if (loginButton && !redirectStarted) {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
            }
        }
    });
} else {
    console.error("Hindi makita ang loginForm sa login.html");
}
