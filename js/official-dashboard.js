
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// ==========================================
// CONFIGURATION
// ==========================================

const OFFICIAL_UID = "lA4mlJYUdBSsu8qZjTOSeFet3Tr2";

const DEFAULT_MAP_CENTER = [12.8797, 121.7740];
const DEFAULT_MAP_ZOOM = 6;
const REPORT_MAP_ZOOM = 17;

const $ = id => document.getElementById(id);

const ISSUE_LABELS = {
    garbage: "Garbage",
    flooding: "Flooding",
    canal: "Blocked Canal",
    streetlight: "Streetlight",
    others: "Others"
};

const ISSUE_COLORS = {
    garbage: "#198754",
    flooding: "#dc3545",
    canal: "#fd7e14",
    streetlight: "#0d6efd",
    others: "#9333ea"
};

const FLOOD_LEVEL_LABELS = {
    ankle: "Ankle-deep",
    knee: "Knee-deep",
    waist: "Waist-deep",
    "ankle-deep": "Ankle-deep",
    "knee-deep": "Knee-deep",
    "waist-deep": "Waist-deep"
};

const ALLOWED_STATUSES = [
    "Pending",
    "Processing",
    "Resolved",
    "Rejected",
    "Delivered",
    "Cancelled"
];

// ==========================================
// HTML ELEMENTS
// ==========================================

const officialEmail = $("officialEmail");
const dashboardMessage = $("dashboardMessage");

const totalReports = $("totalReports");
const pendingReports = $("pendingReports");
const processingReports = $("processingReports");
const resolvedReports = $("resolvedReports");

const tableBody = $("officialReportsTableBody");
const loadingMessage = $("reportsLoadingMessage");
const emptyMessage = $("reportsEmptyMessage");
const errorMessage = $("reportsErrorMessage");
const visibleReportsCount = $("visibleReportsCount");

const searchInput = $("reportSearch");
const issueFilter = $("issueFilter");
const statusFilter = $("statusFilter");
const refreshButton = $("refreshReportsButton");
const logoutButton = $("officialLogoutButton");

const detailModalElement = $("reportDetailsModal");

const detailModal =
    detailModalElement && window.bootstrap
        ? new bootstrap.Modal(detailModalElement)
        : null;

const saveStatusButton = $("saveReportStatusButton");
const detailStatus = $("detailStatus");
const detailMessage = $("detailMessage");

const totalFloodReportsElement = $("totalFloodReports");
const activeFloodWarningsElement = $("activeFloodWarnings");
const latestFloodReportElement = $("latestFloodReport");
const latestFloodReportTimeElement = $("latestFloodReportTime");
const floodLiveStatus = $("floodLiveStatus");
const floodAlertsList = $("officialFloodAlertsList");
const floodReportsBody = $("officialFloodReportsTableBody");
const floodReportsLoading = $("floodReportsLoading");
const floodReportsError = $("floodReportsError");
const floodReportsEmpty = $("floodReportsEmpty");
const floodReportsCount = $("floodReportsCount");

// ==========================================
// STATE
// ==========================================

let currentUser = null;
let allReports = [];
let allFloodReports = [];

let selectedReport = null;
let selectedReportType = "resident";

let loadingReports = false;

let mainMap = null;
let detailMap = null;
let detailMarker = null;

let mainMarkers = [];
let unsubscribeFloodReports = null;

let userClosingPopup = false;
let refreshingMainMap = false;


// MAP FOCUS STATE
let previousMapView = null;
let restorePreviousMapView = false;
let focusedReportKey = null;

let focusSequence = 0;
let suppressPopupRestore = false;


// ==========================================
// MESSAGES AND HELPERS
// ==========================================

function showDashboardMessage(message, type = "danger") {
    if (!dashboardMessage) return;

    dashboardMessage.textContent = message;
    dashboardMessage.className = `alert alert-${type}`;
}

function hideDashboardMessage() {
    if (!dashboardMessage) return;

    dashboardMessage.textContent = "";
    dashboardMessage.className = "alert d-none";
}

function showDetailMessage(message, type = "danger") {
    if (!detailMessage) return;

    detailMessage.textContent = message;
    detailMessage.className = `alert alert-${type}`;
}

function hideDetailMessage() {
    if (!detailMessage) return;

    detailMessage.textContent = "";
    detailMessage.className = "alert d-none";
}

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function formatDate(timestamp) {
    if (!timestamp) return "Unknown date";

    let date;

    if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getTimestampMillis(timestamp) {
    if (!timestamp) return 0;

    if (typeof timestamp.toMillis === "function") {
        return timestamp.toMillis();
    }

    if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().getTime();
    }

    const date = new Date(timestamp);

    return Number.isNaN(date.getTime())
        ? 0
        : date.getTime();
}

function normalizeIssue(type) {
    const value = String(type || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    if (
        value.includes("garbage") ||
        value.includes("trash") ||
        value.includes("waste")
    ) {
        return "garbage";
    }

    if (value.includes("flood")) {
        return "flooding";
    }

    if (
        value.includes("canal") ||
        value.includes("drain")
    ) {
        return "canal";
    }

    if (
        value.includes("streetlight") ||
        value.includes("street light") ||
        value.includes("street lamp")
    ) {
        return "streetlight";
    }

    if (value === "other" || value === "others") {
        return "others";
    }

    return value;
}

function getReportType(report) {
    return normalizeIssue(
        report?.type ??
        report?.issueType ??
        report?.issue ??
        report?.category ??
        ""
    );
}

function formatIssue(type) {
    const normalized = normalizeIssue(type);

    return ISSUE_LABELS[normalized] || type || "Unknown issue";
}

function getIssueColor(type) {
    return ISSUE_COLORS[normalizeIssue(type)] || "#6c757d";
}

function getFloodLevel(report) {
    const raw =
        report?.floodLevel ??
        report?.waterLevel ??
        report?.water_level ??
        report?.waterLevelDepth ??
        report?.water_level_depth ??
        report?.floodDepth ??
        report?.flood_depth ??
        report?.level ??
        report?.depth ??
        "";

    if (raw === null || raw === undefined || raw === "") {
        return "Not specified";
    }

    const value = String(raw).trim();
    const normalized = value.toLowerCase().replace(/[_\s]+/g, "-");

    return FLOOD_LEVEL_LABELS[normalized] || value;
}

function statusClass(status) {
    const normalized = String(status || "Pending")
        .toLowerCase()
        .replace(/[^a-z]/g, "");

    return `status-${normalized}`;
}

function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = String(text ?? "");

    return cell;
}

function getCoordinates(report) {
    const location = report?.location || {};
    const coordinates = report?.coordinates || {};

    const latitude =
        report?.latitude ??
        report?.lat ??
        report?.selectedLatitude ??
        report?.selectedLat ??
        report?.mapLatitude ??
        report?.mapLat ??
        report?.gpsLatitude ??
        report?.gpsLat ??
        location?.latitude ??
        location?.lat ??
        coordinates?.latitude ??
        coordinates?.lat ??
        coordinates?.[0];

    const longitude =
        report?.longitude ??
        report?.lng ??
        report?.lon ??
        report?.selectedLongitude ??
        report?.selectedLng ??
        report?.selectedLon ??
        report?.mapLongitude ??
        report?.mapLng ??
        report?.gpsLongitude ??
        report?.gpsLng ??
        location?.longitude ??
        location?.lng ??
        location?.lon ??
        coordinates?.longitude ??
        coordinates?.lng ??
        coordinates?.lon ??
        coordinates?.[1];

    if (
        latitude === null ||
        latitude === undefined ||
        latitude === "" ||
        longitude === null ||
        longitude === undefined ||
        longitude === ""
    ) {
        return null;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return null;
    }

    return [lat, lng];
}

function hasCoordinates(report) {
    return getCoordinates(report) !== null;
}

function getReportLocation(report) {
    const parts = [
        report?.barangay,
        report?.cityMunicipality,
        report?.city,
        report?.municipality,
        report?.province,
        report?.region,
        report?.purok
    ].filter(part => typeof part === "string" && part.trim());

    return parts.length
        ? [...new Set(parts)].join(", ")
        : "Location not specified";
}

function getPhotoValue(report) {
    return (
        report?.photoUrl ||
        report?.photoURL ||
        report?.photo ||
        report?.imageUrl ||
        report?.imageURL ||
        report?.image ||
        report?.photoBase64 ||
        report?.imageBase64 ||
        ""
    );
}

function setPhoto(photoValue) {
    const photo = $("detailPhoto");
    const noPhoto = $("detailNoPhoto");

    if (!photo || !noPhoto) return;

    photo.onerror = null;
    photo.onload = null;

    photo.classList.add("d-none");
    noPhoto.classList.add("d-none");
    photo.removeAttribute("src");

    if (
        typeof photoValue !== "string" ||
        !photoValue.trim() ||
        !(
            /^https?:\/\//i.test(photoValue) ||
            /^data:image\//i.test(photoValue)
        )
    ) {
        noPhoto.textContent = "No photo available for this report.";
        noPhoto.classList.remove("d-none");
        return;
    }

    photo.onerror = () => {
        photo.classList.add("d-none");

        noPhoto.textContent =
            "Hindi ma-load ang photo. Pakisuri ang image URL o Firebase Storage permissions.";

        noPhoto.classList.remove("d-none");
    };

    photo.onload = () => {
        photo.classList.remove("d-none");
        noPhoto.classList.add("d-none");
    };

    photo.src = photoValue;
}

// ==========================================
// SUMMARY CARDS
// ==========================================

function updateSummary() {
    if (totalReports) {
        totalReports.textContent = String(allReports.length);
    }

    if (pendingReports) {
        pendingReports.textContent = String(
            allReports.filter(
                report => (report.status || "Pending") === "Pending"
            ).length
        );
    }

    if (processingReports) {
        processingReports.textContent = String(
            allReports.filter(
                report => report.status === "Processing"
            ).length
        );
    }

    if (resolvedReports) {
        resolvedReports.textContent = String(
            allReports.filter(report =>
                ["Resolved", "Delivered"].includes(report.status)
            ).length
        );
    }
}

// ==========================================
// MAIN COMMUNITY MAP — FIXED FOCUS
// ==========================================

function initializeMainMap() {
    if (mainMap || !window.L) return;

    const mapElement = $("reportMap");
    if (!mapElement) return;

    mainMap = L.map(mapElement, {
        zoomControl: true
    }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(mainMap);

    // Ang manual na X lang ang magbabalik sa dating map view.
    mapElement.addEventListener("click", event => {
        const target = event.target;

        if (
            target instanceof Element &&
            target.closest(".leaflet-popup-close-button")
        ) {
            userClosingPopup = true;
        }
    }, true);

    mainMap.on("popupclose", () => {
        if (suppressPopupRestore || refreshingMainMap) return;
        if (!userClosingPopup) return;

        userClosingPopup = false;

        if (!restorePreviousMapView || !previousMapView) return;

        const savedView = previousMapView;

        restorePreviousMapView = false;
        previousMapView = null;
        focusedReportKey = null;
        focusSequence++;

        mainMap.setView(savedView.center, savedView.zoom, {
            animate: false
        });
    });
}

function getReportKey(reportId, reportType) {
    return `${reportType}:${reportId}`;
}

function clearMainMarkers() {
    if (!mainMap) return;

    const previousSuppression = suppressPopupRestore;
    suppressPopupRestore = true;

    try {
        mainMap.closePopup();

        mainMarkers.forEach(item => {
            if (item.marker && mainMap.hasLayer(item.marker)) {
                mainMap.removeLayer(item.marker);
            }
        });

        mainMarkers = [];
    } finally {
        suppressPopupRestore = previousSuppression;
    }
}

function getDisplayPositions(items) {
    const groups = new Map();
    const positions = new Map();

    items.forEach(item => {
        const point = getCoordinates(item.report);
        if (!point) return;

        const key = `${point[0].toFixed(6)},${point[1].toFixed(6)}`;

        if (!groups.has(key)) groups.set(key, []);

        groups.get(key).push({
            ...item,
            point
        });
    });

    groups.forEach(group => {
        group.forEach((item, index) => {
            let point = item.point;

            if (group.length > 1) {
                const angle = (2 * Math.PI * index) / group.length;
                const offset = 0.00012;

                point = [
                    item.point[0] + Math.sin(angle) * offset,
                    item.point[1] + Math.cos(angle) * offset
                ];
            }

            positions.set(
                getReportKey(item.report.id, item.reportType),
                point
            );
        });
    });

    return positions;
}

function addResidentMarker(report, position) {
    if (!mainMap || !position) return;

    const type = getReportType(report);
    const color = getIssueColor(type);

    const marker = L.circleMarker(position, {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1
    }).addTo(mainMap);

    const popup = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = formatIssue(type);
    title.style.color = color;

    const location = document.createElement("div");
    location.textContent = getReportLocation(report);

    const status = document.createElement("div");
    status.textContent = `Status: ${report.status || "Pending"}`;

    const date = document.createElement("div");
    date.textContent = formatDate(report.createdAt);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm btn-primary mt-2";
    button.textContent = "View Details";
    button.addEventListener("click", () => {
        openReportDetails(report.id, "resident");
    });

    popup.append(title, location, status, date, button);
    marker.bindPopup(popup);

    mainMarkers.push({
        reportId: report.id,
        reportType: "resident",
        marker
    });
}

function addFloodMarker(report, position) {
    if (!mainMap || !position) return;

    const marker = L.circleMarker(position, {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: "#dc3545",
        fillOpacity: 1
    }).addTo(mainMap);

    const popup = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = "Flood Report";
    title.style.color = "#dc3545";

    const purok = document.createElement("div");
    purok.textContent = report.purok || "Purok not specified";

    const level = document.createElement("div");
    level.textContent = `Water level: ${getFloodLevel(report)}`;

    const description = document.createElement("div");
    description.textContent =
        report.description || "No description provided.";

    const date = document.createElement("div");
    date.textContent = formatDate(report.createdAt);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm btn-danger mt-2";
    button.textContent = "View Details";
    button.addEventListener("click", () => {
        openReportDetails(report.id, "flood");
    });

    popup.append(title, purok, level, description, date, button);
    marker.bindPopup(popup);

    mainMarkers.push({
        reportId: report.id,
        reportType: "flood",
        marker
    });
}

function findMainMarker(reportId, reportType) {
    return mainMarkers.find(item =>
        item.reportId === reportId &&
        item.reportType === reportType
    );
}

function refreshMainMap() {
    initializeMainMap();

    if (!mainMap || refreshingMainMap) return;

    refreshingMainMap = true;

    const savedCenter = mainMap.getCenter();
    const savedZoom = mainMap.getZoom();

    const keepFocus =
        restorePreviousMapView && focusedReportKey
            ? focusedReportKey
            : null;

    const wasPopupOpen = Boolean(
        mainMap._popup && mainMap.hasLayer(mainMap._popup)
    );

    try {
        clearMainMarkers();

        const items = [
            ...allReports.map(report => ({
                report,
                reportType: "resident"
            })),
            ...allFloodReports.map(report => ({
                report,
                reportType: "flood"
            }))
        ];

        const positions = getDisplayPositions(items);

        items.forEach(item => {
            const key = getReportKey(
                item.report.id,
                item.reportType
            );

            const position = positions.get(key);
            if (!position) return;

            if (item.reportType === "resident") {
                addResidentMarker(item.report, position);
            } else {
                addFloodMarker(item.report, position);
            }
        });

        if (keepFocus) {
            const separator = keepFocus.indexOf(":");
            const reportType = keepFocus.slice(0, separator);
            const reportId = keepFocus.slice(separator + 1);

            const focusedMarker = findMainMarker(
                reportId,
                reportType
            );

            if (focusedMarker) {
                const target = focusedMarker.marker.getLatLng();

                mainMap.setView(
                    [target.lat, target.lng],
                    REPORT_MAP_ZOOM,
                    { animate: false }
                );

                if (wasPopupOpen) {
                    focusedMarker.marker.openPopup();
                }

                return;
            }

            // Nawala na ang naka-focus na report.
            focusedReportKey = null;
            restorePreviousMapView = false;
            previousMapView = null;
        }

        mainMap.setView(savedCenter, savedZoom, {
            animate: false
        });
    } finally {
        refreshingMainMap = false;
    }
}

function focusMapReport(report, reportType) {
    initializeMainMap();

    if (!mainMap) {
        showDashboardMessage(
            "Hindi ma-load ang mapa. Pakisuri ang Leaflet scripts at reportMap element."
        );
        return;
    }

    if (!getCoordinates(report)) {
        showDashboardMessage(
            "Walang valid latitude at longitude ang report na ito.",
            "warning"
        );
        return;
    }

    let markerItem = findMainMarker(report.id, reportType);

    if (!markerItem) {
        refreshMainMap();
        markerItem = findMainMarker(report.id, reportType);
    }

    if (!markerItem) {
        showDashboardMessage(
            "Hindi makita ang marker ng report. Tiyaking may coordinates ito.",
            "warning"
        );
        return;
    }

    hideDashboardMessage();

    // I-save ang normal view nang isang beses lamang.
    if (!restorePreviousMapView || !previousMapView) {
        previousMapView = {
            center: mainMap.getCenter(),
            zoom: mainMap.getZoom()
        };

        restorePreviousMapView = true;
    }

    focusedReportKey = getReportKey(report.id, reportType);

    const thisFocus = ++focusSequence;
    const mapElement = $("reportMap");

    if (mapElement) {
        mapElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // Isara ang lumang popup nang hindi nire-reset ang focus.
    const previousSuppression = suppressPopupRestore;
    suppressPopupRestore = true;

    try {
        mainMap.closePopup();
    } finally {
        suppressPopupRestore = previousSuppression;
    }

    window.setTimeout(() => {
        if (!mainMap || thisFocus !== focusSequence) return;

        let currentMarker = findMainMarker(
            report.id,
            reportType
        );

        if (!currentMarker) {
            refreshMainMap();
            currentMarker = findMainMarker(
                report.id,
                reportType
            );
        }

        if (!currentMarker) {
            showDashboardMessage(
                "Hindi makita ang marker ng napiling report.",
                "warning"
            );
            return;
        }

        mainMap.invalidateSize();

        const target = currentMarker.marker.getLatLng();

        mainMap.setView(
            [target.lat, target.lng],
            REPORT_MAP_ZOOM,
            { animate: false }
        );

        currentMarker.marker.openPopup();
    }, 250);
}

function focusResidentReport(report) {
    focusMapReport(report, "resident");
}

function focusMainFloodReport(report) {
    focusMapReport(report, "flood");
}

// ==========================================
// RESIDENT REPORT TABLE
// ==========================================

function getFilteredReports() {
    const searchTerm =
        searchInput?.value.trim().toLowerCase() || "";

    const selectedIssue = issueFilter?.value || "";
    const selectedStatus = statusFilter?.value || "";

    return allReports.filter(report => {
        const type = getReportType(report);

        const searchableText = [
            report.id,
            type,
            formatIssue(type),
            report.description,
            report.region,
            report.province,
            report.cityMunicipality,
            report.barangay,
            report.purok,
            report.status
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return (
            (!searchTerm || searchableText.includes(searchTerm)) &&
            (!selectedIssue ||
                type === normalizeIssue(selectedIssue)) &&
            (!selectedStatus ||
                (report.status || "Pending") === selectedStatus)
        );
    });
}

function renderReports() {
    if (!tableBody) return;

    tableBody.replaceChildren();

    const filteredReports = getFilteredReports();

    if (loadingMessage) loadingMessage.classList.add("d-none");
    if (errorMessage) errorMessage.classList.add("d-none");

    if (emptyMessage) {
        emptyMessage.classList.toggle(
            "d-none",
            filteredReports.length !== 0
        );
    }

    if (visibleReportsCount) {
        visibleReportsCount.textContent =
            `${filteredReports.length} report${filteredReports.length === 1 ? "" : "s"} shown`;
    }

    filteredReports.forEach(report => {
        const row = document.createElement("tr");
        const type = getReportType(report);

        row.appendChild(createCell(formatDate(report.createdAt)));

        const issueCell = createCell(formatIssue(type));
        issueCell.style.fontWeight = "600";
        issueCell.style.color = getIssueColor(type);
        row.appendChild(issueCell);

        row.appendChild(createCell(getReportLocation(report)));

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = `badge ${statusClass(report.status)}`;
        badge.textContent = report.status || "Pending";

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");

        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.className =
            "btn btn-sm btn-outline-primary me-2 mb-1";
        detailsButton.textContent = "View Details";

        detailsButton.addEventListener("click", () => {
            openReportDetails(report.id, "resident");
        });

        const mapButton = document.createElement("button");
        mapButton.type = "button";
        mapButton.className =
            "btn btn-sm btn-outline-danger mb-1";
        mapButton.textContent = "View Map";

        mapButton.addEventListener("click", () => {
            focusResidentReport(report);
        });

        actionCell.append(detailsButton, mapButton);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
    });
}

async function loadReports() {
    if (loadingReports) return;

    loadingReports = true;

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    if (loadingMessage) {
        loadingMessage.classList.remove("d-none");
        loadingMessage.textContent = "Loading resident reports...";
    }

    if (errorMessage) errorMessage.classList.add("d-none");
    if (emptyMessage) emptyMessage.classList.add("d-none");

    try {
        const snapshot = await getDocs(collection(db, "reports"));

        allReports = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        allReports.sort((a, b) =>
            getTimestampMillis(b.createdAt) -
            getTimestampMillis(a.createdAt)
        );

        updateSummary();
        renderReports();
        refreshMainMap();

        hideDashboardMessage();
    } catch (error) {
        console.error("Failed to load resident reports:", error);

        if (errorMessage) {
            errorMessage.textContent =
                "Hindi ma-load ang resident reports. Pakisuri ang internet connection at Firestore Rules.";

            errorMessage.classList.remove("d-none");
        }

        if (loadingMessage) {
            loadingMessage.classList.add("d-none");
        }
    } finally {
        loadingReports = false;

        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}

// ==========================================
// REPORT DETAILS MODAL
// ==========================================

function openReportDetails(reportId, reportType = "resident") {
    const reportList =
        reportType === "flood"
            ? allFloodReports
            : allReports;

    const report = reportList.find(item => item.id === reportId);

    if (!report) {
        showDashboardMessage("Hindi na makita ang napiling report.");
        return;
    }

    if (!detailModal) {
        showDashboardMessage("Hindi makita ang report details modal.");
        return;
    }

    selectedReport = report;
    selectedReportType = reportType;

    hideDetailMessage();

    const isFlood = reportType === "flood";
    const position = getCoordinates(report);

    setText("detailReportId", `Reference ID: ${report.id}`);

    setText(
        "detailIssueType",
        isFlood ? "Flood Report" : formatIssue(getReportType(report))
    );

    setText("detailDate", formatDate(report.createdAt));

    setText(
        "detailDescription",
        report.description || "No description provided."
    );

    const locationParts = [getReportLocation(report)];

    if (isFlood && report.purok) {
        locationParts.push(report.purok);
    }

    setText(
        "detailLocation",
        [...new Set(locationParts)].join(" · ")
    );

    setText(
        "detailLatitude",
        position ? String(position[0]) : "Not available"
    );

    setText(
        "detailLongitude",
        position ? String(position[1]) : "Not available"
    );

    let floodLevelRow = $("detailFloodLevelRow");

    if (isFlood && !floodLevelRow) {
        const locationElement = $("detailLocation");

        if (locationElement?.parentElement) {
            const wrapper = document.createElement("div");
            wrapper.className = "col-sm-6";
            wrapper.id = "detailFloodLevelRow";

            const label = document.createElement("div");
            label.className = "detail-label";
            label.textContent = "Water Level";

            const value = document.createElement("div");
            value.className = "detail-value";
            value.id = "detailFloodLevel";
            value.textContent = getFloodLevel(report);

            wrapper.append(label, value);
            locationElement.parentElement.after(wrapper);

            floodLevelRow = wrapper;
        }
    }

    if (floodLevelRow) {
        floodLevelRow.classList.toggle("d-none", !isFlood);

        setText(
            "detailFloodLevel",
            isFlood ? getFloodLevel(report) : "—"
        );
    }

    setPhoto(getPhotoValue(report));

    const statusWrapper = detailStatus?.closest(".mb-2");
    const statusNote = detailStatus?.parentElement?.nextElementSibling;

    if (statusWrapper) {
        statusWrapper.classList.toggle("d-none", isFlood);
    }

    if (statusNote && statusNote.tagName === "P") {
        statusNote.classList.toggle("d-none", isFlood);
    }

    if (detailStatus) {
        detailStatus.value = ALLOWED_STATUSES.includes(report.status)
            ? report.status
            : "Pending";
    }

    if (saveStatusButton) {
        saveStatusButton.classList.toggle("d-none", isFlood);
        saveStatusButton.disabled = false;
        saveStatusButton.textContent = "Save Status";
    }

    detailModal.show();
}

// ==========================================
// DETAILS MAP
// ==========================================

function initializeDetailMap() {
    if (detailMap || !window.L) return;

    const mapElement = $("detailMap");

    if (!mapElement) return;

    detailMap = L.map(mapElement).setView(
        DEFAULT_MAP_CENTER,
        DEFAULT_MAP_ZOOM
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(detailMap);
}

if (detailModalElement) {
    detailModalElement.addEventListener("shown.bs.modal", () => {
        initializeDetailMap();

        if (!detailMap) return;

        detailMap.invalidateSize();

        if (detailMarker) {
            detailMap.removeLayer(detailMarker);
            detailMarker = null;
        }

        if (selectedReport && hasCoordinates(selectedReport)) {
            const position = getCoordinates(selectedReport);

            detailMap.setView(position, 16);

            const markerTitle =
                selectedReportType === "flood"
                    ? `Flood Report — ${getFloodLevel(selectedReport)}`
                    : formatIssue(getReportType(selectedReport));

            detailMarker = L.marker(position)
                .addTo(detailMap)
                .bindPopup(markerTitle)
                .openPopup();
        } else {
            detailMap.setView(
                DEFAULT_MAP_CENTER,
                DEFAULT_MAP_ZOOM
            );
        }
    });
}

// ==========================================
// UPDATE REPORT STATUS
// ==========================================

if (saveStatusButton) {
    saveStatusButton.addEventListener("click", async () => {
        if (selectedReportType === "flood") {
            showDetailMessage(
                "Flood report details lang ang ipinapakita rito.",
                "warning"
            );
            return;
        }

        if (!currentUser || currentUser.uid !== OFFICIAL_UID) {
            showDetailMessage(
                "Wala kang pahintulot na mag-update ng report."
            );
            return;
        }

        if (!selectedReport) {
            showDetailMessage("Walang napiling report.");
            return;
        }

        const newStatus = detailStatus?.value;

        if (!ALLOWED_STATUSES.includes(newStatus)) {
            showDetailMessage("Hindi valid ang napiling status.");
            return;
        }

        saveStatusButton.disabled = true;
        saveStatusButton.textContent = "Saving...";

        try {
            await updateDoc(
                doc(db, "reports", selectedReport.id),
                { status: newStatus }
            );

            selectedReport.status = newStatus;

            allReports = allReports.map(report =>
                report.id === selectedReport.id
                    ? { ...report, status: newStatus }
                    : report
            );

            updateSummary();
            renderReports();

            // Panatilihin ang focus ng map kahit mag-update ang status.
            refreshMainMap();

            showDetailMessage(
                "Matagumpay na na-update ang report status.",
                "success"
            );
        } catch (error) {
            console.error("Status update error:", error);

            showDetailMessage(
                "Hindi na-update ang status. Pakisuri ang Firestore Rules at connection."
            );
        } finally {
            saveStatusButton.disabled = false;
            saveStatusButton.textContent = "Save Status";
        }
    });
}

// ==========================================
// FLOOD WARNING LOGIC
// ==========================================

function getReportsFromLastHour() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    return allFloodReports.filter(report => {
        const time = getTimestampMillis(report.createdAt);

        return time > 0 && time >= oneHourAgo && time <= now;
    });
}

function getActivePurokWarnings() {
    const counts = new Map();

    getReportsFromLastHour().forEach(report => {
        if (
            typeof report.purok !== "string" ||
            !report.purok.trim()
        ) {
            return;
        }

        const purok = report.purok.trim();

        if (!counts.has(purok)) {
            counts.set(purok, []);
        }

        counts.get(purok).push(report);
    });

    return [...counts.entries()]
        .filter(([, reports]) => reports.length >= 3)
        .map(([purok, reports]) => ({
            purok,
            count: reports.length,
            latestReport: reports.reduce((latest, report) =>
                getTimestampMillis(report.createdAt) >
                getTimestampMillis(latest.createdAt)
                    ? report
                    : latest
            )
        }))
        .sort((a, b) => b.count - a.count);
}

function renderFloodAlerts() {
    if (!floodAlertsList || !activeFloodWarningsElement) return;

    floodAlertsList.replaceChildren();

    const warnings = getActivePurokWarnings();

    activeFloodWarningsElement.textContent = String(warnings.length);

    if (warnings.length === 0) {
        const message = document.createElement("div");

        message.className = "alert alert-success mb-0";
        message.textContent =
            "Walang active flood warning sa ngayon. Magpapakita rito ng alert kapag may 3 o higit pang flood reports sa parehong Purok sa loob ng isang oras.";

        floodAlertsList.appendChild(message);
        return;
    }

    warnings.forEach(warning => {
        const card = document.createElement("div");
        card.className = "alert alert-danger flood-alert-card mb-3";

        const heading = document.createElement("h4");
        heading.className = "h6 fw-bold";
        heading.textContent = `FLOOD WARNING — ${warning.purok}`;

        const count = document.createElement("p");
        count.className = "mb-1";
        count.textContent =
            `${warning.count} flood reports received within the last hour.`;

        const latest = document.createElement("p");
        latest.className = "small mb-2";
        latest.textContent =
            `Latest report: ${formatDate(warning.latestReport.createdAt)}. Water level: ${getFloodLevel(warning.latestReport)}.`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-sm btn-danger";
        button.textContent = "View Latest Location";
        button.disabled = !hasCoordinates(warning.latestReport);

        button.addEventListener("click", () => {
            focusMainFloodReport(warning.latestReport);
        });

        card.append(heading, count, latest, button);
        floodAlertsList.appendChild(card);
    });
}

// ==========================================
// FLOOD REPORTS TABLE
// ==========================================


function renderFloodReports() {
    if (!floodReportsBody) return;

    floodReportsBody.replaceChildren();

    if (floodReportsCount) {
        floodReportsCount.textContent =
            `${allFloodReports.length} report${allFloodReports.length === 1 ? "" : "s"}`;
    }

    if (totalFloodReportsElement) {
        totalFloodReportsElement.textContent =
            String(allFloodReports.length);
    }

    if (floodReportsLoading) {
        floodReportsLoading.classList.add("d-none");
    }

    if (floodReportsError) {
        floodReportsError.classList.add("d-none");
    }

    if (floodReportsEmpty) {
        floodReportsEmpty.classList.toggle(
            "d-none",
            allFloodReports.length !== 0
        );
    }

    // Latest flood report summary
    const latest = allFloodReports[0];

    if (latest) {
        if (latestFloodReportElement) {
            latestFloodReportElement.textContent =
                `${latest.purok || "Unknown Purok"} · ${getFloodLevel(latest)}`;
        }

        if (latestFloodReportTimeElement) {
            latestFloodReportTimeElement.textContent =
                formatDate(latest.createdAt);
        }
    } else {
        if (latestFloodReportElement) {
            latestFloodReportElement.textContent =
                "No flood reports yet";
        }

        if (latestFloodReportTimeElement) {
            latestFloodReportTimeElement.textContent = "—";
        }
    }

    // Flood reports table — tinanggal ang Photo column.
    allFloodReports.forEach(report => {
        const row = document.createElement("tr");

        // Date
        row.appendChild(
            createCell(formatDate(report.createdAt))
        );

        // Purok
        row.appendChild(
            createCell(report.purok || "Not specified")
        );

        // Water Level
        const levelCell = document.createElement("td");
        const levelBadge = document.createElement("span");

        levelBadge.className = "badge flood-level-badge";
        levelBadge.textContent = getFloodLevel(report);

        levelCell.appendChild(levelBadge);
        row.appendChild(levelCell);

        // Description
        row.appendChild(
            createCell(report.description || "No description")
        );

        // Location
        const locationCell = document.createElement("td");
        const position = getCoordinates(report);

        if (position) {
            const coords = document.createElement("div");

            coords.className = "small mb-2";
            coords.textContent =
                `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`;

            // View Map button
            const mapButton = document.createElement("button");

            mapButton.type = "button";
            mapButton.className =
                "btn btn-sm btn-outline-primary me-1 mb-1";
            mapButton.textContent = "View Map";

            mapButton.addEventListener("click", () => {
                focusMainFloodReport(report);
            });

            // View Details button
            const detailsButton = document.createElement("button");

            detailsButton.type = "button";
            detailsButton.className =
                "btn btn-sm btn-outline-danger mb-1";
            detailsButton.textContent = "View Details";

            detailsButton.addEventListener("click", () => {
                openReportDetails(report.id, "flood");
            });

            locationCell.append(
                coords,
                mapButton,
                detailsButton
            );
        } else {
            locationCell.textContent = "No coordinates";

            const detailsButton = document.createElement("button");

            detailsButton.type = "button";
            detailsButton.className =
                "btn btn-sm btn-outline-danger";
            detailsButton.textContent = "View Details";

            detailsButton.addEventListener("click", () => {
                openReportDetails(report.id, "flood");
            });

            locationCell.appendChild(detailsButton);
        }

        row.appendChild(locationCell);
        floodReportsBody.appendChild(row);
    });

    // Refresh flood warnings and preserve the current map focus.
    renderFloodAlerts();
    refreshMainMap();
}


function handleFloodReportsSnapshot(snapshot) {
    allFloodReports = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

    allFloodReports.sort((a, b) =>
        getTimestampMillis(b.createdAt) -
        getTimestampMillis(a.createdAt)
    );

    if (floodLiveStatus) {
        floodLiveStatus.textContent = "● Live";
        floodLiveStatus.className = "badge bg-success fs-6";
    }

    renderFloodReports();
}

function startFloodReportsListener() {
    if (unsubscribeFloodReports) {
        unsubscribeFloodReports();
        unsubscribeFloodReports = null;
    }

    if (floodLiveStatus) {
        floodLiveStatus.textContent = "Connecting...";
        floodLiveStatus.className = "badge bg-secondary fs-6";
    }

    if (floodReportsLoading) {
        floodReportsLoading.classList.remove("d-none");
    }

    if (floodReportsError) {
        floodReportsError.classList.add("d-none");
    }

    unsubscribeFloodReports = onSnapshot(
        collection(db, "floodReports"),
        snapshot => {
            handleFloodReportsSnapshot(snapshot);

            if (floodReportsLoading) {
                floodReportsLoading.classList.add("d-none");
            }
        },
        error => {
            console.error(
                "Failed to listen to flood reports:",
                error
            );

            if (floodLiveStatus) {
                floodLiveStatus.textContent = "Connection error";
                floodLiveStatus.className = "badge bg-danger fs-6";
            }

            if (floodReportsLoading) {
                floodReportsLoading.classList.add("d-none");
            }

            if (floodReportsError) {
                floodReportsError.textContent =
                    "Hindi ma-load ang live flood reports. Pakisuri ang internet connection at Firestore Rules.";

                floodReportsError.classList.remove("d-none");
            }
        }
    );
}

// I-refresh ang warning count kahit walang bagong Firestore report.
window.setInterval(() => {
    if (currentUser && currentUser.uid === OFFICIAL_UID) {
        renderFloodAlerts();
    }
}, 30000);

// ==========================================
// SEARCH, FILTERS, REFRESH AND LOGOUT
// ==========================================

if (searchInput) {
    searchInput.addEventListener("input", renderReports);
}

if (issueFilter) {
    issueFilter.addEventListener("change", renderReports);
}

if (statusFilter) {
    statusFilter.addEventListener("change", renderReports);
}

if (refreshButton) {
    refreshButton.addEventListener("click", loadReports);
}

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
    await signOut(auth);
    window.location.replace("login.html");
}catch (error) {
            console.error("Logout error:", error);

            showDashboardMessage(
                "Hindi makapag-logout. Pakisubukan ulit."
            );

            logoutButton.disabled = false;
        }
    });
}

// ==========================================
// OFFICIAL AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async user => {
    if (!user) {
        if (unsubscribeFloodReports) {
            unsubscribeFloodReports();
            unsubscribeFloodReports = null;
        }

        window.location.replace("login.html");
        return;
    }

    if (user.uid !== OFFICIAL_UID) {
        await signOut(auth);
       window.location.replace("login.html");
        return;
    }

    currentUser = user;

    if (officialEmail) {
        officialEmail.textContent =
            user.email || "Authorized Official";
    }

    initializeMainMap();

    await loadReports();

    startFloodReportsListener();
});
