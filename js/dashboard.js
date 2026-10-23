
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const residentName = document.getElementById("residentName");
const residentEmail = document.getElementById("residentEmail");
const logoutButton = document.getElementById("logoutButton");

const reportsMessage = document.getElementById("reportsMessage");
const reportsTableWrapper = document.getElementById("reportsTableWrapper");
const reportsTableBody = document.getElementById("reportsTableBody");
const reportCount = document.getElementById("reportCount");

let currentUser = null;
let isLoading = false;

function getLanguage() {
    return window.BantayBayanLanguage?.getCurrentLanguage?.() || "en";
}

function translate(key, fallback) {
    const language = getLanguage();

    const messages = {
        en: {
            loading: "Loading your reports...",
            noReports: "You have no reports yet. Select Report an Issue to submit one.",
            error: "Unable to load reports. Please check your connection and try again.",
            report: "report",
            reports: "reports",
            unavailable: "Not available",
            noEmail: "No email available",
            otherIssue: "Other issue",
            logoutLoading: "Logging out...",
            logoutError: "Logout failed. Please try again.",
            logout: "Logout"
        },
        fil: {
            loading: "Kinukuha ang iyong mga ulat...",
            noReports: "Wala ka pang ulat. Piliin ang Mag-ulat ng Isyu upang magsumite.",
            error: "Hindi ma-load ang mga ulat. Pakisuri ang iyong koneksyon at subukan muli.",
            report: "ulat",
            reports: "mga ulat",
            unavailable: "Hindi available",
            noEmail: "Walang email na available",
            otherIssue: "Iba pang isyu",
            logoutLoading: "Nagla-logout...",
            logoutError: "Hindi nagtagumpay ang pag-logout. Pakisubukan muli.",
            logout: "Mag-logout"
        }
    };

    return messages[language]?.[key] ?? fallback;
}

function showReportsMessage(message, type = "info") {
    reportsMessage.textContent = message;
    reportsMessage.className = `alert alert-${type} mb-0`;
    reportsMessage.classList.remove("d-none");
}

function getStatusClass(status) {
    switch ((status || "Pending").toLowerCase()) {
        case "resolved":
        case "completed":
        case "delivered":
            return "text-bg-success";

        case "processing":
        case "in progress":
            return "text-bg-primary";

        case "rejected":
        case "cancelled":
            return "text-bg-danger";

        default:
            return "text-bg-warning";
    }
}

function formatDate(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") {
        return getLanguage() === "fil" ? "Hindi available" : "Not available";
    }

    return timestamp.toDate().toLocaleString(
        getLanguage() === "fil" ? "fil-PH" : "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}

function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    row.appendChild(cell);
    return cell;
}

function updateReportCount(count) {
    const language = getLanguage();

    if (language === "fil") {
        reportCount.textContent =
            `${count} ${count === 1 ? "ulat" : "mga ulat"}`;
    } else {
        reportCount.textContent =
            `${count} ${count === 1 ? "report" : "reports"}`;
    }
}

async function loadMyReports(user) {
    if (isLoading) return;
    isLoading = true;

    reportsTableBody.replaceChildren();
    reportsTableWrapper.classList.add("d-none");
    updateReportCount(0);

    showReportsMessage(translate("loading", "Loading your reports..."));

    try {
        const reportsQuery = query(
            collection(db, "reports"),
            where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(reportsQuery);

        if (snapshot.empty) {
            showReportsMessage(
                translate("noReports", "You have no reports yet."),
                "info"
            );
            return;
        }

        const reports = snapshot.docs
            .map(reportDocument => ({
                id: reportDocument.id,
                ...reportDocument.data()
            }))
            .sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() ?? 0;
                const dateB = b.createdAt?.toMillis?.() ?? 0;
                return dateB - dateA;
            });

        reports.forEach(report => {
            const row = document.createElement("tr");

            addCell(
                row,
                report.type || translate("otherIssue", "Other issue")
            );

            // Current report.js saves barangay, not purok.
            addCell(row, report.purok || report.barangay || "—");

            addCell(row, formatDate(report.createdAt));

            const statusCell = document.createElement("td");
            const statusBadge = document.createElement("span");

            statusBadge.className =
                `badge ${getStatusClass(report.status)}`;

            statusBadge.textContent = report.status || "Pending";

            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            reportsTableBody.appendChild(row);
        });

        updateReportCount(reports.length);
        reportsMessage.classList.add("d-none");
        reportsTableWrapper.classList.remove("d-none");

    } catch (error) {
        console.error("Failed to load reports:", error);

        showReportsMessage(
            translate("error", "Unable to load reports."),
            "danger"
        );
    } finally {
        isLoading = false;
    }
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = user;

    residentName.textContent = user.displayName || "Resident";
    residentEmail.textContent =
        user.email || translate("noEmail", "No email available");

    await loadMyReports(user);
});

// Update dynamic dashboard messages when the language changes.
document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => {
        if (!currentUser) return;

        if (reportsMessage.classList.contains("d-none") === false) {
            const message = reportsMessage.textContent;

            if (
                message.includes("Loading") ||
                message.includes("Kinukuha")
            ) {
                showReportsMessage(translate("loading", "Loading your reports..."));
            } else if (
                message.includes("Wala ka pang") ||
                message.includes("You have no reports")
            ) {
                showReportsMessage(translate("noReports", "You have no reports yet."));
            } else if (
                message.includes("Hindi ma-load") ||
                message.includes("Unable to load")
            ) {
                showReportsMessage(translate("error", "Unable to load reports."), "danger");
            }
        }

        updateReportCount(
            reportsTableBody.querySelectorAll("tr").length
        );
    });
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = translate("logoutLoading", "Logging out...");

    try {
        await signOut(auth);
        window.location.replace("login.html");
    } catch (error) {
        console.error("Logout error:", error);

        alert(translate("logoutError", "Logout failed. Please try again."));

        logoutButton.disabled = false;
        logoutButton.textContent = translate("logout", "Logout");
    }
});
