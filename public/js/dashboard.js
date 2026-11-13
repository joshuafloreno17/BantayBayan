
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

const notificationTitle = document.getElementById("notificationTitle");

const reportsMessage = document.getElementById("reportsMessage");
const reportsTableWrapper = document.getElementById("reportsTableWrapper");
const reportsTableBody = document.getElementById("reportsTableBody");
const reportCount = document.getElementById("reportCount");
// Resident report photo viewer
const reportPhotosModalElement = document.getElementById("reportPhotosModal");
const reportPhotosModal = reportPhotosModalElement && window.bootstrap
    ? new window.bootstrap.Modal(reportPhotosModalElement)
    : null;

const reportActivityModalElement = document.getElementById("reportActivityModal");
const reportActivityModal = reportActivityModalElement && window.bootstrap
    ? new window.bootstrap.Modal(reportActivityModalElement)
    : null;

function setResidentPhoto(imageId, emptyId, photoValue, emptyMessage) {
    const image = document.getElementById(imageId);
    const empty = document.getElementById(emptyId);

    if (!image || !empty) return;

    image.classList.add("d-none");
    image.removeAttribute("src");
    empty.classList.remove("d-none");
    empty.textContent = emptyMessage;

    if (
        typeof photoValue !== "string" ||
        !photoValue.trim() ||
        !(/^https?:\/\//i.test(photoValue) || /^data:image\//i.test(photoValue))
    ) {
        return;
    }

    image.onload = () => {
        image.classList.remove("d-none");
        empty.classList.add("d-none");
    };

    image.onerror = () => {
        image.classList.add("d-none");
        empty.textContent = "Unable to load this photo.";
        empty.classList.remove("d-none");
    };

    image.src = photoValue;
}

function openReportPhotos(report) {
    if (!reportPhotosModal) {
        console.error("Report Photos modal is unavailable.");
        return;
    }

    const beforePhoto =
        report.photoUrl ||
        report.photoURL ||
        report.photo ||
        report.imageUrl ||
        report.imageURL ||
        report.image ||
        report.photoBase64 ||
        report.imageBase64 ||
        "";

    const afterPhoto =
        report.resolutionPhoto ||
        report.afterPhoto ||
        report.resolvedPhoto ||
        "";

    setResidentPhoto(
        "residentBeforePhoto",
        "residentBeforePhotoEmpty",
        beforePhoto,
        "No Before Photo available."
    );

    setResidentPhoto(
        "residentAfterPhoto",
        "residentAfterPhotoEmpty",
        afterPhoto,
        "No After Photo uploaded yet."
    );

    reportPhotosModal.show();
}

function openReportActivity(report) {
    if (!reportActivityModal) {
        console.error("Report Activity modal is unavailable.");
        return;
    }

    const timeline = document.getElementById("reportActivityTimeline");
    const subtitle = document.getElementById("reportActivitySubtitle");

    if (!timeline || !subtitle) {
        console.error("Report Activity modal elements are missing.");
        return;
    }

    const isFlood = report.reportKind === "flood";

    subtitle.textContent =
        getReportType(report, isFlood) +
        " Ã¢â‚¬Â¢ " +
        getReportLocation(report, isFlood);

    timeline.replaceChildren();

    const events = [
        {
            type: "submission",
            title: "Report Submitted",
            value: report.approvalStatus || "For Approval",
            remarks: "",
            timestamp: report.createdAt
        },
        ...(Array.isArray(report.activityHistory)
            ? report.activityHistory
            : [])
    ]
        .filter(event => getTimestampMillis(event.timestamp) > 0)
        .sort((a, b) =>
            getTimestampMillis(a.timestamp) -
            getTimestampMillis(b.timestamp)
        );

    if (events.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "alert alert-secondary mb-0";
        emptyMessage.textContent = "No activity information is available.";
        timeline.appendChild(emptyMessage);
    }

    events.forEach(event => {
        const item = document.createElement("div");
        item.className = "border-start border-3 ps-3 pb-4 ms-2";

        const heading = document.createElement("div");
        heading.className = "fw-semibold";
        heading.textContent = event.title || "Report Updated";

        const value = document.createElement("span");
        value.className = "badge bg-light text-dark border mt-2";
        value.textContent = event.value || "";

        const date = document.createElement("div");
        date.className = "small text-secondary mt-2";
        date.textContent = formatDate(event.timestamp);

        item.appendChild(heading);

        if (event.value) {
            item.appendChild(value);
        }

        item.appendChild(date);

        if (event.remarks) {
            const remarks = document.createElement("p");
            remarks.className = "small mb-0 mt-2";
            remarks.textContent = event.remarks;
            item.appendChild(remarks);
        }

        timeline.appendChild(item);
    });

    reportActivityModal.show();
}

let currentUser = null;
let unsubscribeReports = null;
let unsubscribeFloodReports = null;

let ordinaryReports = [];
let floodReports = [];
let activeFilter = "all";
let listenerErrors = 0;

// Resident notification state
let notificationState = null;
let notificationStateKey = "";
let notificationItems = [];
let notificationReportsLoaded = false;
let notificationFloodReportsLoaded = false;

let notificationBell = null;
let notificationBadge = null;
let notificationPanel = null;
let notificationList = null;
let notificationMarkAllButton = null;

// Notification DOM references
notificationBell = document.getElementById("notificationBell");
notificationBadge = document.getElementById("notificationBadge");
notificationPanel = document.getElementById("notificationPanel");
notificationList = document.getElementById("notificationList");
notificationMarkAllButton = document.getElementById("notificationMarkAllButton");

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
            noFilteredReports: "No reports match this filter.", notificationTitle: "Notifications", noNotifications: "No official updates yet.", markAllRead: "Mark all as read", reportApproved: "Report Approved", reportRejected: "Report Rejected", statusUpdated: "Status Updated", officialUpdate: "Official Update"
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
            noFilteredReports: "Walang ulat na tumutugma sa filter na ito.", notificationTitle: "Mga Abiso", noNotifications: "Wala pang opisyal na update.", markAllRead: "Markahang nabasa lahat", reportApproved: "Naaprubahan ang Ulat", reportRejected: "Tinanggihan ang Ulat", statusUpdated: "Na-update ang Status", officialUpdate: "Opisyal na Update"
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

// RESIDENT NOTIFICATION FUNCTIONS

function saveNotificationState() {
    if (!notificationStateKey || !notificationState) return;

    try {
        localStorage.setItem(
            notificationStateKey,
            JSON.stringify(notificationState)
        );
    } catch (error) {
        console.error("Unable to save notification state:", error);
    }
}

function getNotificationEventKey(report, event) {
    return [
        report.reportKind || "issue",
        report.id || "",
        getTimestampMillis(event.timestamp),
        event.type || "",
        event.value || "",
        event.actorUid || ""
    ].join("|");
}

function collectNotificationEvents() {
    const reports = [
        ...ordinaryReports.map(report => ({
            ...report,
            reportKind: "issue"
        })),
        ...floodReports.map(report => ({
            ...report,
            reportKind: "flood"
        }))
    ];

    const events = [];

    reports.forEach(report => {
        if (!Array.isArray(report.activityHistory)) return;

        report.activityHistory.forEach(event => {
            if (!event || !["approval", "status"].includes(event.type)) {
                return;
            }

            const key = getNotificationEventKey(report, event);

            events.push({
                key,
                report,
                event,
                timestamp: getTimestampMillis(event.timestamp),
                isRead: false
            });
        });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
}

function reconcileNotifications() {
    if (!notificationReportsLoaded || !notificationFloodReportsLoaded) {
        return;
    }

    const events = collectNotificationEvents();

    if (!notificationState) {
        try {
            const saved = localStorage.getItem(notificationStateKey);
            notificationState = saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error("Unable to read notification state:", error);
            notificationState = null;
        }
    }

    if (
        !notificationState ||
        !Array.isArray(notificationState.knownKeys) ||
        !Array.isArray(notificationState.readKeys)
    ) {
        const existingKeys = events.map(item => item.key);

        notificationState = {
            knownKeys: existingKeys,
            readKeys: existingKeys
        };

        saveNotificationState();
    } else {
        events.forEach(item => {
            if (!notificationState.knownKeys.includes(item.key)) {
                notificationState.knownKeys.push(item.key);
            }
        });

        saveNotificationState();
    }

    const readKeys = new Set(notificationState.readKeys);

    notificationItems = events.map(item => ({
        ...item,
        isRead: readKeys.has(item.key)
    }));

    renderNotifications();
}

function updateNotificationReports(kind, reports) {
    if (kind === "issue") {
        notificationReportsLoaded = true;
    } else if (kind === "flood") {
        notificationFloodReportsLoaded = true;
    } else {
        console.warn("Unknown notification report kind:", kind);
        return;
    }

    reconcileNotifications();
}

function initializeNotifications(user) {
    if (!user || !user.uid) return;

    notificationStateKey = `bantaybayan_notifications_${user.uid}`;

    notificationReportsLoaded = false;
    notificationFloodReportsLoaded = false;
    notificationItems = [];

    try {
        const saved = localStorage.getItem(notificationStateKey);
        notificationState = saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error("Unable to initialize notifications:", error);
        notificationState = null;
    }

    if (notificationTitle) {
        notificationTitle.textContent = translate(
            "notificationTitle",
            "Notifications"
        );
    }

    if (notificationMarkAllButton) {
        notificationMarkAllButton.textContent = translate(
            "markAllRead",
            "Mark all as read"
        );
    }

    if (notificationBell) {
        notificationBell.setAttribute(
            "aria-label",
            translate("notificationTitle", "Notifications")
        );
    }

    if (notificationMarkAllButton) {
        notificationMarkAllButton.onclick = markAllNotificationsRead;
    }

    renderNotifications();
}

// END NOTIFICATION INITIALIZATION
function markNotificationRead(key) {
    if (!notificationState || !key) return;

    if (!notificationState.readKeys.includes(key)) {
        notificationState.readKeys.push(key);
    }

    saveNotificationState();
    reconcileNotifications();
}

function markAllNotificationsRead() {
    if (!notificationState) return;

    notificationState.readKeys = [
        ...notificationState.knownKeys
    ];

    saveNotificationState();
    reconcileNotifications();
}

function renderNotifications() {
    if (!notificationList) return;

    notificationList.replaceChildren();

    const unreadCount = notificationItems.filter(
        item => !item.isRead
    ).length;

    if (notificationBadge) {
        notificationBadge.textContent = unreadCount > 99
            ? "99+"
            : String(unreadCount);

        notificationBadge.classList.toggle(
            "d-none",
            unreadCount === 0
        );
    }

    if (notificationMarkAllButton) {
        notificationMarkAllButton.disabled = unreadCount === 0;
    }

    if (notificationItems.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "text-muted text-center small mb-0 p-3";
        emptyMessage.textContent = translate(
            "noNotifications",
            "No official updates yet."
        );

        notificationList.appendChild(emptyMessage);
        return;
    }

    notificationItems.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "list-group-item list-group-item-action text-start";

        if (!item.isRead) {
            button.classList.add("list-group-item-light");
        }

        const title = document.createElement("div");
        title.className = "fw-semibold small";

        const eventTitle = item.event.title || "";

        if (eventTitle === "Report Approved") {
            title.textContent = translate(
                "reportApproved",
                "Report Approved"
            );
        } else if (eventTitle === "Report Rejected") {
            title.textContent = translate(
                "reportRejected",
                "Report Rejected"
            );
        } else if (eventTitle === "Status Updated") {
            title.textContent = translate(
                "statusUpdated",
                "Status Updated"
            );
        } else {
            title.textContent = translate(
                "officialUpdate",
                "Official Update"
            );
        }

        const details = document.createElement("div");
        details.className = "small text-muted";
        details.textContent = [
            item.report.issueType || item.report.type || "Report",
            item.event.value || ""
        ].filter(Boolean).join(" Ã¢â‚¬â€ ");

        button.append(title, details);

        if (item.event.remarks) {
            const remarks = document.createElement("div");
            remarks.className = "small text-muted mt-1";
            remarks.textContent = item.event.remarks;
            button.appendChild(remarks);
        }

        button.addEventListener("click", () => {
            markNotificationRead(item.key);

            if (notificationPanel) {
                notificationPanel.classList.remove("show");
            }

            openReportActivity(item.report);
        });

        notificationList.appendChild(button);
    });
}

// END RESIDENT NOTIFICATION FUNCTIONS
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
    cell.textContent = value || "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â";
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
        return report.purok || "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â";
    }

    return [
        report.barangay,
        report.cityMunicipality,
        report.province
    ].filter(Boolean).join(", ") || "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â";
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

const approvalBadge = document.createElement("span");
const approvalStatus = report.approvalStatus || "For Approval";

approvalBadge.className =
    approvalStatus === "Approved"
        ? "badge bg-success d-block mb-1"
        : approvalStatus === "Rejected"
            ? "badge bg-danger d-block mb-1"
            : "badge bg-warning text-dark d-block mb-1";

approvalBadge.textContent = approvalStatus;
statusCell.appendChild(approvalBadge);

if (approvalStatus === "Rejected" && report.rejectionReason) {
    const rejectionNote = document.createElement("div");
    rejectionNote.className = "small text-danger mt-1 text-wrap";
    rejectionNote.textContent = "Reason: " + report.rejectionReason;
    statusCell.appendChild(rejectionNote);
}

const statusBadge = document.createElement("span");
statusBadge.className = `badge ${getStatusClass(report.status)}`;
statusBadge.textContent = displayStatus(report.status);

statusCell.appendChild(statusBadge);
row.appendChild(statusCell);

        const expectedAssistanceCell = document.createElement("td");

        if (report.status === "Processing") {
            expectedAssistanceCell.textContent = report.expectedAssistanceAt
                ? formatDate(report.expectedAssistanceAt)
                : "Not scheduled yet";
        } else {
            expectedAssistanceCell.textContent = "Ã¢â‚¬â€";
        }

        row.appendChild(expectedAssistanceCell);

        const photosCell = document.createElement("td");
        const photosButton = document.createElement("button");

        photosButton.type = "button";
        photosButton.className = "btn btn-sm btn-outline-primary";
        photosButton.innerHTML = '<i class="fa-solid fa-images me-1" aria-hidden="true"></i> View Photos';

        photosButton.addEventListener("click", () => {
            openReportPhotos(report);
        });

        photosCell.appendChild(photosButton);
        row.appendChild(photosCell);

        const activityCell = document.createElement("td");
        const activityButton = document.createElement("button");

        activityButton.type = "button";
        activityButton.className = "btn btn-sm btn-outline-success";
        activityButton.textContent = "View Activity";

        activityButton.addEventListener("click", () => {
            openReportActivity(report);
        });

        activityCell.appendChild(activityButton);
        row.appendChild(activityCell);

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

    notificationReportsLoaded = false;
    notificationFloodReportsLoaded = false;

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

            updateNotificationReports("issue", ordinaryReports);

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

            updateNotificationReports("flood", floodReports);

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
        window.location.replace("resident-login.html");
        return;
    }

    currentUser = user;

    initializeNotifications(user);


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

        if (notificationTitle) {
            notificationTitle.textContent = translate("notificationTitle", "Notifications");
        }

        if (notificationMarkAllButton) {
            notificationMarkAllButton.textContent = translate("markAllRead", "Mark all as read");
        }

        renderNotifications();
    }
});

document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => {
        if (currentUser) {
            setupReportFilter();
            renderReports();
        }

        if (notificationTitle) {
            notificationTitle.textContent = translate("notificationTitle", "Notifications");
        }

        if (notificationMarkAllButton) {
            notificationMarkAllButton.textContent = translate("markAllRead", "Mark all as read");
        }

        renderNotifications();
    });
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = translate("logoutLoading", "Logging out...");

    try {
        stopReportListeners();
        await signOut(auth);
        window.location.replace("resident-login.html");
    } catch (error) {
        console.error("Logout error:", error);

        alert(translate("logoutError", "Logout failed. Please try again."));

        logoutButton.disabled = false;
        logoutButton.textContent = translate("logout", "Logout");
    }
});
