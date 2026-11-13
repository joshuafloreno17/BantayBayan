import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const OFFICIAL_UIDS = new Set([
    "lA4mlJYUdBSsu8qZjTOSeFet3Tr2",
    "GU9l1duyPxRIear5WWzuSJWYgYq1"
]);

const $ = id => document.getElementById(id);

const ui = {
    date: $("analyticsDateFilter"),
    updated: $("analyticsLastUpdated"),
    total: $("analyticsTotalReports"),
    approval: $("analyticsForApproval"),
    approved: $("analyticsApproved"),
    rejected: $("analyticsRejected"),
    processing: $("analyticsProcessing"),
    resolved: $("analyticsResolved"),
    flood: $("analyticsFloodTotal"),
    floodShare: $("analyticsFloodShare"),
    issues: $("analyticsIssueChart"),
    puroks: $("analyticsPurokChart"),
    activity: $("analyticsRecentActivity"),
    message: $("analyticsMessage")
};

let residentReports = [];
let floodReports = [];
let stopResidents = null;
let stopFloods = null;

function millis(value) {
    if (!value) return 0;

    if (typeof value.toMillis === "function") {
        return value.toMillis();
    }

    if (typeof value.toDate === "function") {
        return value.toDate().getTime();
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    const result = new Date(value).getTime();

    return Number.isFinite(result) ? result : 0;
}

function rangeStart() {
    const now = new Date();
    const filter = ui.date?.value || "all";

    if (filter === "daily") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return start.getTime();
    }

    if (filter === "weekly") {
        return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }

    if (filter === "monthly") {
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        ).getTime();
    }

    return 0;
}

function inPeriod(value) {
    const filter = ui.date?.value || "all";

    if (filter === "all") return true;

    const time = millis(value);

    return time > 0 &&
        time >= rangeStart() &&
        time <= Date.now();
}

function normalizeIssue(report) {
    const value = String(
        report.type ??
        report.issueType ??
        report.issue ??
        report.category ??
        ""
    )
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    if (
        value.includes("garbage") ||
        value.includes("trash") ||
        value.includes("waste")
    ) return "garbage";

    if (
        value.includes("flood") ||
        value.includes("water")
    ) return "flooding";

    if (
        value.includes("canal") ||
        value.includes("drain")
    ) return "canal";

    if (
        value.includes("streetlight") ||
        value.includes("street light") ||
        value.includes("street lamp")
    ) return "streetlight";

    return "others";
}

const issueLabels = {
    garbage: "Garbage",
    flooding: "Flooding",
    canal: "Blocked Canal",
    streetlight: "Streetlight",
    others: "Others"
};

function filteredReports() {
    return [
        ...residentReports.map(report => ({
            ...report,
            _kind: "resident"
        })),
        ...floodReports.map(report => ({
            ...report,
            _kind: "flood"
        }))
    ].filter(report => inPeriod(report.createdAt));
}

function setText(element, value) {
    if (element) element.textContent = String(value);
}

function makeElement(tag, className, value) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (value !== undefined) element.textContent = String(value);

    return element;
}

function renderBars(container, entries, emptyText) {
    if (!container) return;

    container.replaceChildren();

    const maximum = Math.max(
        1,
        ...entries.map(entry => entry.count)
    );

    if (!entries.some(entry => entry.count > 0)) {
        container.appendChild(
            makeElement("p", "analytics-empty", emptyText)
        );
        return;
    }

    entries.forEach(entry => {
        const row = makeElement("div", "analytics-bar-row");
        const heading = makeElement("div", "analytics-bar-heading");

        heading.append(
            makeElement("span", "analytics-bar-label", entry.label),
            makeElement("strong", "analytics-bar-value", entry.count)
        );

        const track = makeElement("div", "analytics-bar-track");
        const fill = makeElement("div", "analytics-bar-fill");

        fill.style.width =
            `${entry.count / maximum * 100}%`;

        track.appendChild(fill);
        row.append(heading, track);
        container.appendChild(row);
    });
}

function formatDate(value) {
    const time = millis(value);

    if (!time) return "Unknown date";

    return new Date(time).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderActivity(reports) {
    if (!ui.activity) return;

    ui.activity.replaceChildren();

    const events = [];

    reports.forEach(report => {
        const label = report._kind === "flood"
            ? "Flood Report"
            : issueLabels[normalizeIssue(report)];

        events.push({
            title: `${label} Submitted`,
            detail: report.purok || "Purok not specified",
            timestamp: report.createdAt
        });

        if (Array.isArray(report.activityHistory)) {
            report.activityHistory.forEach(event => {
                if (!event || !event.timestamp) return;

                events.push({
                    title: event.title || "Report Updated",
                    detail: [
                        report.purok || "Purok not specified",
                        event.value || event.remarks || ""
                    ].filter(Boolean).join(" · "),
                    timestamp: event.timestamp
                });
            });
        }
    });

    const recent = events
        .filter(event => inPeriod(event.timestamp))
        .sort((a, b) => millis(b.timestamp) - millis(a.timestamp))
        .slice(0, 10);

    if (!recent.length) {
        ui.activity.appendChild(
            makeElement(
                "p",
                "analytics-empty",
                "No recent activity for this period."
            )
        );
        return;
    }

    recent.forEach(event => {
        const item = makeElement("div", "analytics-activity-item");
        const marker = makeElement("span", "analytics-activity-marker");
        const content = makeElement("div", "analytics-activity-content");

        content.append(
            makeElement("strong", "", event.title),
            makeElement("div", "analytics-activity-detail", event.detail),
            makeElement("time", "analytics-activity-date", formatDate(event.timestamp))
        );

        item.append(marker, content);
        ui.activity.appendChild(item);
    });
}

function renderAnalytics() {
    const reports = filteredReports();

    const forApproval = reports.filter(report =>
        (report.approvalStatus || "For Approval") === "For Approval"
    ).length;

    const approved = reports.filter(report =>
        report.approvalStatus === "Approved"
    ).length;

    const rejected = reports.filter(report =>
        report.approvalStatus === "Rejected"
    ).length;

    const processing = reports.filter(report =>
        report.status === "Processing"
    ).length;

    const resolved = reports.filter(report =>
        report.status === "Resolved"
    ).length;

    const floods = reports.filter(report =>
        report._kind === "flood"
    ).length;

    setText(ui.total, reports.length);
    setText(ui.approval, forApproval);
    setText(ui.approved, approved);
    setText(ui.rejected, rejected);
    setText(ui.processing, processing);
    setText(ui.resolved, resolved);
    setText(ui.flood, floods);

    const percentage = reports.length
        ? (floods / reports.length * 100).toFixed(1)
        : "0.0";

    setText(ui.floodShare, `${percentage}% of reports`);

    const ordinaryReports = reports.filter(report =>
        report._kind === "resident"
    );

    const issueEntries = Object.keys(issueLabels).map(key => ({
        label: issueLabels[key],
        count: ordinaryReports.filter(report =>
            normalizeIssue(report) === key
        ).length
    }));

    renderBars(
        ui.issues,
        issueEntries,
        "No resident issue reports for this period."
    );

    const purokEntries = Array.from(
        { length: 7 },
        (_, index) => {
            const label = `Purok ${index + 1}`;

            return {
                label,
                count: reports.filter(report =>
                    String(report.purok || "").trim().toLowerCase() ===
                    label.toLowerCase()
                ).length
            };
        }
    );

    const unspecified = reports.filter(report =>
        !/^purok\s*[1-7]$/i.test(
            String(report.purok || "").trim()
        )
    ).length;

    if (unspecified > 0) {
        purokEntries.push({
            label: "Other / Unspecified",
            count: unspecified
        });
    }

    renderBars(
        ui.puroks,
        purokEntries,
        "No Purok data for this period."
    );

    renderActivity(reports);

    setText(
        ui.updated,
        `Last updated: ${new Date().toLocaleTimeString("en-PH")}`
    );
}

function showError(message) {
    if (!ui.message) return;

    ui.message.textContent = message;
    ui.message.className = "alert alert-danger";
}

if (ui.date) {
    ui.date.addEventListener("change", renderAnalytics);
}

onAuthStateChanged(auth, user => {
    if (stopResidents) stopResidents();
    if (stopFloods) stopFloods();

    stopResidents = null;
    stopFloods = null;

    residentReports = [];
    floodReports = [];

    if (!user || !OFFICIAL_UIDS.has(user.uid)) {
        showError("Analytics is available to authorized officials only.");
        renderAnalytics();
        return;
    }

    if (ui.message) {
        ui.message.classList.add("d-none");
    }

    stopResidents = onSnapshot(
        collection(db, "reports"),
        snapshot => {
            residentReports = snapshot.docs.map(document => ({
                id: document.id,
                ...document.data()
            }));

            renderAnalytics();
        },
        error => {
            console.error("Resident analytics error:", error);
            showError("Unable to load resident report analytics. Check Firestore permissions.");
        }
    );

    stopFloods = onSnapshot(
        collection(db, "floodReports"),
        snapshot => {
            floodReports = snapshot.docs.map(document => ({
                id: document.id,
                ...document.data()
            }));

            renderAnalytics();
        },
        error => {
            console.error("Flood analytics error:", error);
            showError("Unable to load flood report analytics. Check Firestore permissions.");
        }
    );
});