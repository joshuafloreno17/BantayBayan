
import { db } from "./firebase-config.js";
import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const mapElement = document.getElementById("map");

if (mapElement && typeof L !== "undefined") {
    const center = [14.0683, 121.3256];

    const map = L.map("map").setView(center, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const reportMarkers = L.layerGroup().addTo(map);

    function markerColor(status) {
        if (status === "Resolved") return "#198754";
        if (status === "In Progress") return "#fd7e14";
        return "#dc3545";
    }

    onSnapshot(
        collection(db, "reports"),
        snapshot => {
            reportMarkers.clearLayers();

            snapshot.forEach(reportDoc => {
                const report = reportDoc.data();

                // A marker requires real coordinates saved with the report.
                // Do not invent a location from the purok name alone.
                if (
                    typeof report.latitude !== "number" ||
                    typeof report.longitude !== "number" ||
                    !Number.isFinite(report.latitude) ||
                    !Number.isFinite(report.longitude) ||
                    report.latitude < -90 ||
                    report.latitude > 90 ||
                    report.longitude < -180 ||
                    report.longitude > 180
                ) {
                    return;
                }

                const marker = L.circleMarker(
                    [report.latitude, report.longitude],
                    {
                        radius: 8,
                        color: markerColor(report.status),
                        fillColor: markerColor(report.status),
                        fillOpacity: 0.8
                    }
                );

                const popup = document.createElement("div");
                const title = document.createElement("strong");
                title.textContent = report.type || "Community issue";

                const details = document.createElement("p");
                details.textContent = `${report.purok || "Unknown purok"} — ${report.status || "Pending"}`;

                const description = document.createElement("p");
                description.textContent = report.description || "";

                popup.append(title, details, description);
                marker.bindPopup(popup);
                marker.addTo(reportMarkers);
            });
        },
        error => {
            console.error("Map reports error:", error);
        }
    );
}
