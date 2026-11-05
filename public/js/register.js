
import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerButton = document.getElementById("registerButton");

function showMessage(message, type = "danger") {
    registerMessage.textContent = message;
    registerMessage.className = `alert alert-${type}`;
    registerMessage.classList.remove("d-none");
}

registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (!fullName || !email || !password || !confirmPassword) {
        showMessage("Pakikumpleto ang lahat ng fields.", "warning");
        return;
    }

    if (fullName.length > 100) {
        showMessage("Ang pangalan ay hindi dapat lumampas sa 100 characters.", "warning");
        return;
    }

    if (password.length < 6) {
        showMessage("Ang password ay dapat hindi bababa sa 6 characters.", "warning");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Hindi magkapareho ang password at confirmation.", "warning");
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Creating Account...";

    try {
        const credential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await updateProfile(credential.user, {
            displayName: fullName
        });

        await setDoc(doc(db, "users", credential.user.uid), {
            uid: credential.user.uid,
            name: fullName,
            email: credential.user.email,
            role: "resident",
            createdAt: serverTimestamp()
        });

        showMessage(
            "Matagumpay ang registration! Dadalhin ka sa login page...",
            "success"
        );

        registerForm.reset();

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);

    } catch (error) {
        console.error("Registration error:", error);

        let message = "Hindi nagtagumpay ang registration. Subukan ulit.";

        if (error.code === "auth/email-already-in-use") {
            message = "May account na gamit ang email na ito. Mag-login na lang.";
        } else if (error.code === "auth/invalid-email") {
            message = "Hindi valid ang email address.";
        } else if (error.code === "auth/weak-password") {
            message = "Mahina ang password. Gumamit ng hindi bababa sa 6 characters.";
        } else if (error.code === "auth/operation-not-allowed") {
            message = "Hindi pa enabled ang Email/Password sign-in sa Firebase Authentication.";
        } else if (error.code === "permission-denied") {
            message = "Hindi pinayagan ng Firestore Security Rules ang pag-save ng user profile.";
        } else if (error.code === "auth/network-request-failed") {
            message = "May problema sa internet connection. Subukan ulit.";
        }

        showMessage(message, "danger");

    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create Account";
    }
});
