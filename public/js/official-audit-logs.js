import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const OFFICIAL_UIDS = new Set([
    "lA4mlJYUdBSsu8qZjTOSeFet3Tr2",
    "GU9l1duyPxRIear5WWzuSJWYgYq1"
]);

const $ = id => document.getElementById(id);

const section = $("officialAuditLogs");
const searchInput = $("auditLogSearch");
const actionFilter = $("auditLogActionFilter");
const tableBody = $("auditLogsTableBody");
const loading = $("auditLogsLoading");
const empty = $("auditLogsEmpty");
const error = $("auditLogsError");

let auditEntries = [];
let unsubscribeAuditLogs = null;

const ACTION_LABELS = {
    report_approved: "Report Approved",
    report_rejected: "Report Rejected",
    report_status_updated: "Report Status Updated",
    personnel_assigned: "Personnel Assigned",
    personnel_unassigned: "Personnel Unassigned",
    announcement_published: "Announcement Published",
    announcement_updated: "Announcement Updated",
    announcement_archived: "Announcement Archived"
};

function formatAuditDate(value) {
    if (!value) return "Date unavailable";

    const date = typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value || "—";
    return cell;
}

function renderAuditLogs() {
    if (!tableBody) return;

    const search = (searchInput?.value || "").trim().toLowerCase();
    const selectedAction = actionFilter?.value || "all";

    const filtered = auditEntries.filter(entry => {
        const matchesAction =
            selectedAction === "all" || entry.action === selectedAction;

        const searchable = [
            entry.actorEmail,
            entry.actorUid,
            entry.action,
            ACTION_LABELS[entry.action],
            entry.targetCollection,
            entry.targetId,
            entry.targetLabel,
            entry.details
        ].join(" ").toLowerCase();

        return matchesAction && searchable.includes(search);
    });

    tableBody.replaceChildren();

    filtered.forEach(entry => {
        const row = document.createElement("tr");

        row.append(
            createCell(formatAuditDate(entry.timestamp)),
            createCell(entry.actorEmail || entry.actorUid),
            createCell(ACTION_LABELS[entry.action] || entry.action),
            createCell(entry.targetCollection),
            createCell(entry.targetLabel || entry.targetId),
            createCell(entry.details)
        );

        tableBody.appendChild(row);
    });

    if (empty) {
        empty.classList.toggle("d-none", filtered.length > 0);
    }
}

function showAuditError(message) {
    if (!error) return;
    error.textContent = message;
    error.classList.remove("d-none");
}

function startAuditListener() {
    if (unsubscribeAuditLogs) {
        unsubscribeAuditLogs();
        unsubscribeAuditLogs = null;
    }

    if (loading) loading.classList.remove("d-none");
    if (error) error.classList.add("d-none");

    const auditQuery = query(
        collection(db, "auditLogs"),
        orderBy("timestamp", "desc"),
        limit(300)
    );

    unsubscribeAuditLogs = onSnapshot(
        auditQuery,
        snapshot => {
            auditEntries = snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

            if (loading) loading.classList.add("d-none");
            renderAuditLogs();
        },
        listenerError => {
            console.error("Audit Logs listener error:", listenerError);

            if (loading) loading.classList.add("d-none");

            showAuditError(
                "Unable to load audit logs. Check Firestore Rules and connection."
            );
        }
    );
}

if (searchInput) {
    searchInput.addEventListener("input", renderAuditLogs);
}

if (actionFilter) {
    actionFilter.addEventListener("change", renderAuditLogs);
}

onAuthStateChanged(auth, user => {
    if (!user || !OFFICIAL_UIDS.has(user.uid)) {
        if (unsubscribeAuditLogs) {
            unsubscribeAuditLogs();
            unsubscribeAuditLogs = null;
        }

        auditEntries = [];

        if (tableBody) tableBody.replaceChildren();
        if (loading) loading.classList.add("d-none");

        showAuditError("Unauthorized account. Official access only.");
        return;
    }

    startAuditListener();
});

window.addEventListener("beforeunload", () => {
    if (unsubscribeAuditLogs) unsubscribeAuditLogs();
});