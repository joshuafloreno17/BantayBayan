import { db } from "./firebase-config.js";
import {
    collection,
    onSnapshot,
    query,
    where,
    Timestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// Community Issue Map + Flood Watch para sa index.html.

const FLOOD_THRESHOLD = 3;              // ilang report bago mag-warning
const FLOOD_WINDOW_MS = 60 * 60 * 1000; // 1 oras
const FLOOD_AREA_RADIUS_M = 200;        // laki ng pulang bilog

const STATUS_COLORS = {
    Pending: "#dc3545",     // pula
    Processing: "#ffc107",  // dilaw
    Resolved: "#198754",    // berde
    Rejected: "#6c757d",
    Delivered: "#6c757d",
    Cancelled: "#6c757d"
};

const TYPE_LABELS = {
    garbage: "Garbage / Basura",
    flooding: "Flooding / Baha",
    canal: "Blocked Canal / Baradong Kanal",
    streetlight: "Broken Streetlight / Sirang Ilaw",
    others: "Other Problems / Iba Pa"
};

const mapElement = document.getElementById("map");
const floodBanner = document.getElementById("floodBanner");

function hasValidCoords(item) {
    return (
        typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude) &&
        Math.abs(item.latitude) <= 90 &&
        Math.abs(item.longitude) <= 180
    );
}

function buildReportPopup(report) {
    const popup = document.createElement("div");
    popup.style.maxWidth = "220px";

    if (typeof report.photo === "string" && report.photo.startsWith("data:image/")) {
        const img = document.createElement("img");
        img.src = report.photo;
        img.alt = "Report photo";
        img.style.width = "100%";
        img.style.borderRadius = "6px";
        img.style.marginBottom = "6px";
        popup.appendChild(img);
    }

    const title = document.createElement("strong");
    title.textContent = TYPE_LABELS[report.type] || report.type || "Community issue";

    const details = document.createElement("div");
    details.textContent = `${report.purok || "Unknown purok"} — ${report.status || "Pending"}`;

    const description = document.createElement("div");
    description.className = "small text-secondary";
    description.textContent = report.description || "";

    popup.append(title, details, description);
    return popup;
}

if (mapElement && typeof L !== "undefined") {
    const config = typeof BARANGAY_CONFIG !== "undefined" ? BARANGAY_CONFIG : null;
    const center = config
        ? [config.center.lat, config.center.lng]
        : [14.0683, 121.3256];
    const zoom = config?.zoom || 14;

    const map = L.map("map").setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const reportMarkers = L.layerGroup().addTo(map);
    const floodAreas = L.layerGroup().addTo(map);

    // ---------- Community reports ----------
    onSnapshot(
        collection(db, "reports"),
        (snapshot) => {
            reportMarkers.clearLayers();

            snapshot.forEach((reportDoc) => {
                const report = reportDoc.data();

                // Kailangan ng totoong coordinates; huwag manghula mula sa purok.
                if (!hasValidCoords(report)) return;

                const color = STATUS_COLORS[report.status] || STATUS_COLORS.Pending;

                L.circleMarker([report.latitude, report.longitude], {
                    radius: 8,
                    color,
                    fillColor: color,
                    fillOpacity: 0.85
                })
                    .bindPopup(buildReportPopup(report))
                    .addTo(reportMarkers);
            });
        },
        (error) => console.error("Map reports error:", error)
    );

    // ---------- Flood Watch ----------
    // Ang query ay kumukuha lang ng mga report mula noong binuksan ang page
    // minus 1 oras; ang eksaktong 1-oras na window ay sinasala ulit sa
    // renderFloodWatch para mawala ang luma habang bukas ang page.
    let recentFloodReports = [];

    function renderFloodWatch() {
        const cutoff = Date.now() - FLOOD_WINDOW_MS;
        const byPurok = {};

        recentFloodReports.forEach((report) => {
            const createdAt = report.createdAt?.toMillis?.();
            if (!report.purok || !createdAt || createdAt < cutoff) return;

            (byPurok[report.purok] ||= []).push(report);
        });

        const flooded = Object.keys(byPurok)
            .filter((purok) => byPurok[purok].length >= FLOOD_THRESHOLD)
            .sort();

        // Pulang bilog sa gitna ng mga flood report ng bawat purok.
        floodAreas.clearLayers();

        flooded.forEach((purok) => {
            const located = byPurok[purok].filter(hasValidCoords);
            if (located.length === 0) return;

            const lat = located.reduce((sum, r) => sum + r.latitude, 0) / located.length;
            const lng = located.reduce((sum, r) => sum + r.longitude, 0) / located.length;

            L.circle([lat, lng], {
                radius: FLOOD_AREA_RADIUS_M,
                color: "#dc3545",
                fillColor: "#dc3545",
                fillOpacity: 0.3
            })
                .bindPopup(`🚨 Flood warning: ${purok} (${byPurok[purok].length} reports sa huling 1 oras)`)
                .addTo(floodAreas);
        });

        if (!floodBanner) return;

        if (flooded.length === 0) {
            floodBanner.classList.add("d-none");
            floodBanner.textContent = "";
        } else {
            floodBanner.textContent =
                `🚨 FLOOD WARNING: ${flooded.join(", ")} — ` +
                `${FLOOD_THRESHOLD} o higit pang flood report sa loob ng 1 oras. Mag-ingat at lumikas kung kailangan.`;
            floodBanner.classList.remove("d-none");
        }
    }

    const floodQuery = query(
        collection(db, "floodReports"),
        where("createdAt", ">=", Timestamp.fromMillis(Date.now() - FLOOD_WINDOW_MS))
    );

    onSnapshot(
        floodQuery,
        (snapshot) => {
            recentFloodReports = snapshot.docs.map((d) => d.data());
            renderFloodWatch();
        },
        (error) => console.error("Flood watch error:", error)
    );

    // I-refresh bawat minuto para mawala ang warning kapag lumampas na sa 1 oras.
    setInterval(renderFloodWatch, 60 * 1000);
}
