
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const residentName = document.getElementById("residentName");
const residentEmail = document.getElementById("residentEmail");
const logoutButton = document.getElementById("logoutButton");

const reportsMessage = document.getElementById("reportsMessage");
const reportsTableWrapper = document.getElementById("reportsTableWrapper");
const reportsTableBody = document.getElementById("reportsTableBody");
const reportCount = document.getElementById("reportCount");

let currentUser = null;
let unsubscribeReports = null;
let unsubscribeFloodReports = null;

let ordinaryReports = [];
let floodReports = [];
let activeFilter = "all";
let listenerErrors = 0;

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
            noEmail: "No email available",
            otherIssue: "Other issue",
            floodReport: "Flood Report",
            logoutLoading: "Logging out...",
            logoutError: "Logout failed. Please try again.",
            logout: "Logout",
            pending: "Pending",
            inProgress: "In Progress",
            resolved: "Resolved",
            rejected: "Rejected",
            allReports: "All Reports",
            floodReports: "Flood Reports",
            otherIssues: "Other Issues",
            garbage: "Garbage / Trash Problem",
            flooding: "Flooding",
            canal: "Canal / Drainage Problem",
            streetlight: "Broken Streetlight",
            others: "Other Community Problem",
            noFilteredReports: "No reports match this filter."
        },
        fil: {
            loading: "Kinukuha ang iyong mga ulat...",
            noReports: "Wala ka pang ulat. Piliin ang Mag-ulat ng Isyu upang magsumite.",
            error: "Hindi ma-load ang mga ulat. Pakisuri ang iyong koneksyon at subukan muli.",
            report: "ulat",
            reports: "mga ulat",
            noEmail: "Walang email na available",
            otherIssue: "Iba pang isyu",
            floodReport: "Ulat sa Baha",
            logoutLoading: "Nagla-logout...",
            logoutError: "Hindi nagtagumpay ang pag-logout. Pakisubukan muli.",
            logout: "Mag-logout",
            pending: "Nakabinbin",
            inProgress: "Isinasagawa",
            resolved: "Nalutas",
            rejected: "Tinanggihan",
            allReports: "Lahat ng Ulat",
            floodReports: "Mga Ulat sa Baha",
            otherIssues: "Iba Pang Isyu",
            garbage: "Basura",
            flooding: "Pagbaha",
            canal: "Baradong Kanal",
            streetlight: "Sirang Ilaw sa Kalsada",
            others: "Iba Pang Problema sa Komunidad",
            noFilteredReports: "Walang ulat na tumutugma sa filter na ito."
        }
    };

    return messages[language]?.[key] ?? fallback;
}

function showReportsMessage(message, type = "info") {
    reportsMessage.textContent = message;
    reportsMessage.className = `alert alert-${type} mb-0`;
    reportsMessage.classList.remove("d-none");
}

function getStatusKey(status) {
    const normalized = String(status || "Pending")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    if (["resolved", "completed"].includes(normalized)) {
        return "resolved";
    }

    if (["in progress", "processing"].includes(normalized)) {
        return "inProgress";
    }

    if (["rejected", "cancelled"].includes(normalized)) {
        return "rejected";
    }

    return "pending";
}

function getStatusClass(status) {
    switch (getStatusKey(status)) {
        case "resolved":
            return "text-bg-success";
        case "inProgress":
            return "text-bg-primary";
        case "rejected":
            return "text-bg-danger";
        default:
            return "text-bg-warning";
    }
}

function displayStatus(status) {
    const key = getStatusKey(status);

    const fallback = {
        pending: "Pending",
        inProgress: "In Progress",
        resolved: "Resolved",
        rejected: "Rejected"
    };

    return translate(key, fallback[key]);
}

function getTimestampMillis(timestamp) {
    if (!timestamp) return 0;

    if (typeof timestamp.toMillis === "function") {
        return timestamp.toMillis();
    }

    if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().getTime();
    }

    return 0;
}

function formatDate(timestamp) {
    const milliseconds = getTimestampMillis(timestamp);

    if (!milliseconds) {
        return getLanguage() === "fil" ? "Hindi available" : "Not available";
    }

    return new Date(milliseconds).toLocaleString(
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
    cell.textContent = value || "—";
    row.appendChild(cell);
    return cell;
}

function updateReportCount(count) {
    reportCount.textContent =
        `${count} ${count === 1
            ? translate("report", "report")
            : translate("reports", "reports")}`;
}

function getReportLocation(report, isFlood) {
    if (isFlood) {
        return report.purok || "—";
    }

    return [
        report.barangay,
        report.cityMunicipality,
        report.province
    ].filter(Boolean).join(", ") || "—";
}

function normalizeIssueType(type) {
    return String(type || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
}

function getReportType(report, isFlood) {
    if (isFlood) {
        const level = String(report.floodLevel || "").trim();

        return level
            ? `${translate("floodReport", "Flood Report")} - ${level}`
            : translate("floodReport", "Flood Report");
    }

    const type = normalizeIssueType(report.type);

    const issueTypes = {
        garbage: ["garbage", "Garbage / Trash Problem"],
        trash: ["garbage", "Garbage / Trash Problem"],
        flooding: ["flooding", "Flooding"],
        flood: ["flooding", "Flooding"],
        canal: ["canal", "Canal / Drainage Problem"],
        drainage: ["canal", "Canal / Drainage Problem"],
        streetlight: ["streetlight", "Broken Streetlight"],
        others: ["others", "Other Community Problem"],
        other: ["others", "Other Community Problem"]
    };

    const issue = issueTypes[type];

    return issue
        ? translate(issue[0], issue[1])
        : translate("otherIssue", "Other issue");
}

function renderReports() {
    reportsTableBody.replaceChildren();

    const allReports = [
        ...ordinaryReports.map(report => ({
            ...report,
            reportKind: "issue"
        })),
        ...floodReports.map(report => ({
            ...report,
            reportKind: "flood"
        }))
    ].sort((a, b) =>
        getTimestampMillis(b.createdAt) -
        getTimestampMillis(a.createdAt)
    );

    const filteredReports = allReports.filter(report => {
        if (activeFilter === "flood") {
            return report.reportKind === "flood";
        }

        if (activeFilter === "garbage") {
            return report.reportKind === "issue" &&
                ["garbage", "trash"].includes(
                    normalizeIssueType(report.type)
                );
        }

        if (activeFilter === "flooding") {
            return report.reportKind === "issue" &&
                ["flooding", "flood"].includes(
                    normalizeIssueType(report.type)
                );
        }

        if (activeFilter === "canal") {
            return report.reportKind === "issue" &&
                ["canal", "drainage"].includes(
                    normalizeIssueType(report.type)
                );
        }

        if (activeFilter === "streetlight") {
            return report.reportKind === "issue" &&
                normalizeIssueType(report.type) === "streetlight";
        }

        if (activeFilter === "others") {
            return report.reportKind === "issue" &&
                ["others", "other"].includes(
                    normalizeIssueType(report.type)
                );
        }

        if (activeFilter === "issue") {
            return report.reportKind === "issue";
        }

        return true;
    });

    updateReportCount(filteredReports.length);

    if (listenerErrors > 0) {
        reportsTableWrapper.classList.add("d-none");
        showReportsMessage(
            translate("error", "Unable to load reports."),
            "danger"
        );
        return;
    }

    if (allReports.length === 0) {
        reportsTableWrapper.classList.add("d-none");
        showReportsMessage(
            translate("noReports", "You have no reports yet."),
            "info"
        );
        return;
    }

    if (filteredReports.length === 0) {
        reportsTableWrapper.classList.remove("d-none");
        reportsTableBody.replaceChildren();

        showReportsMessage(
            translate("noFilteredReports", "No reports match this filter."),
            "info"
        );
        return;
    }

    filteredReports.forEach(report => {
        const row = document.createElement("tr");
        const isFlood = report.reportKind === "flood";

        addCell(row, getReportType(report, isFlood));
        addCell(row, getReportLocation(report, isFlood));
        addCell(row, formatDate(report.createdAt));

        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        statusBadge.className = `badge ${getStatusClass(report.status)}`;
        statusBadge.textContent = displayStatus(report.status);

        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        reportsTableBody.appendChild(row);
    });

    reportsMessage.classList.add("d-none");
    reportsTableWrapper.classList.remove("d-none");
}

function listenToMyReports(user) {
    if (unsubscribeReports) unsubscribeReports();
    if (unsubscribeFloodReports) unsubscribeFloodReports();

    ordinaryReports = [];
    floodReports = [];
    listenerErrors = 0;

    reportsTableBody.replaceChildren();
    reportsTableWrapper.classList.add("d-none");
    updateReportCount(0);

    showReportsMessage(
        translate("loading", "Loading your reports...")
    );

    const ordinaryQuery = query(
        collection(db, "reports"),
        where("userId", "==", user.uid)
    );

    const floodQuery = query(
        collection(db, "floodReports"),
        where("userId", "==", user.uid)
    );

    unsubscribeReports = onSnapshot(
        ordinaryQuery,
        snapshot => {
            ordinaryReports = snapshot.docs.map(documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));

            renderReports();
        },
        error => {
            console.error("Error loading ordinary reports:", error);
            listenerErrors++;
            renderReports();
        }
    );

    unsubscribeFloodReports = onSnapshot(
        floodQuery,
        snapshot => {
            floodReports = snapshot.docs.map(documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));

            renderReports();
        },
        error => {
            console.error("Error loading flood reports:", error);
            listenerErrors++;
            renderReports();
        }
    );
}

function stopReportListeners() {
    if (unsubscribeReports) {
        unsubscribeReports();
        unsubscribeReports = null;
    }

    if (unsubscribeFloodReports) {
        unsubscribeFloodReports();
        unsubscribeFloodReports = null;
    }
}

function setupReportFilter() {
    let filter = document.getElementById("reportFilter");

    if (!filter) {
        filter = document.createElement("select");
        filter.id = "reportFilter";
        filter.className = "form-select mb-3";
        filter.setAttribute("aria-label", "Filter reports");

        reportsTableWrapper.parentNode.insertBefore(
            filter,
            reportsTableWrapper
        );
    }

    const currentValue = filter.value || activeFilter;

    const filterOptions = [
        ["all", "allReports", "All Reports"],
        ["flood", "floodReports", "Flood Reports"],
        ["issue", "otherIssues", "Other Issues"],
        ["garbage", "garbage", "Garbage / Trash Problem"],
        ["flooding", "flooding", "Flooding"],
        ["canal", "canal", "Canal / Drainage Problem"],
        ["streetlight", "streetlight", "Broken Streetlight"],
        ["others", "others", "Other Community Problem"]
    ];

    filter.replaceChildren();

    filterOptions.forEach(([value, key, fallback]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = translate(key, fallback);
        filter.appendChild(option);
    });

    filter.value = filterOptions.some(option => option[0] === currentValue)
        ? currentValue
        : "all";

    activeFilter = filter.value;

    filter.onchange = () => {
        activeFilter = filter.value;
        renderReports();
    };
}

onAuthStateChanged(auth, user => {
    if (!user) {
        stopReportListeners();
        currentUser = null;
        window.location.replace("login.html");
        return;
    }

    currentUser = user;

    residentName.textContent = user.displayName || "Resident";
    residentEmail.textContent =
        user.email || translate("noEmail", "No email available");

    setupReportFilter();
    listenToMyReports(user);
});

window.addEventListener("bantaybayan:languagechange", () => {
    if (currentUser) {
        setupReportFilter();
        renderReports();
    }
});

document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => {
        if (currentUser) {
            setupReportFilter();
            renderReports();
        }
    });
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = translate("logoutLoading", "Logging out...");

    try {
        stopReportListeners();
        await signOut(auth);
        window.location.replace("login.html");
    } catch (error) {
        console.error("Logout error:", error);

        alert(translate("logoutError", "Logout failed. Please try again."));

        logoutButton.disabled = false;
        logoutButton.textContent = translate("logout", "Logout");
    }
});
