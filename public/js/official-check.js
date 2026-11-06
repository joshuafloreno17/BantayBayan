import { db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// Official ang user kapag may document siya sa officials/{uid}.
// Ginagawa ang document na ito sa Firebase console lang (Firestore Rules
// ang pumipigil sa ibang mag-write), kaya hindi ito mapepeke sa browser.
export async function isOfficial(user) {
    if (!user) return false;

    try {
        const snapshot = await getDoc(doc(db, "officials", user.uid));
        return snapshot.exists();
    } catch (error) {
        console.error("Official check error:", error);
        return false;
    }
}
