
const mapElement = document.getElementById("reportMap");

if (!mapElement || typeof L === "undefined") {
    console.error("BantayBayan: Map element or Leaflet is missing.");
} else {
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const locationMessage = document.getElementById("locationMessage");
    const searchInput = document.getElementById("mapSearch");
    const searchButton = document.getElementById("searchLocation");
    const currentLocationButton = document.getElementById("useMyLocation");
    const clearButton = document.getElementById("clearLocation");

    const map = L.map("reportMap").setView([12.8797, 121.7740], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    let marker = null;

    function updateCoordinates(lat, lng) {
        latitudeInput.value = lat;
        longitudeInput.value = lng;

        if (locationMessage) {
            locationMessage.textContent =
                `Selected coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    }

    function setPin(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        if (!marker) {
            marker = L.marker([lat, lng], {
                draggable: true
            }).addTo(map);

            marker.on("dragend", () => {
                const position = marker.getLatLng();
                updateCoordinates(position.lat, position.lng);
            });
        } else {
            marker.setLatLng([lat, lng]);
        }

        updateCoordinates(lat, lng);
    }

    map.on("click", (event) => {
        setPin(event.latlng.lat, event.latlng.lng);
    });

    async function searchLocation() {
        const query = searchInput.value.trim();

        if (!query) {
            locationMessage.textContent = "Enter a place or landmark to search.";
            return;
        }

        searchButton.disabled = true;
        searchButton.textContent = "Searching...";

        try {
            const url = new URL("https://nominatim.openstreetmap.org/search");
            url.searchParams.set("q", query);
            url.searchParams.set("format", "jsonv2");
            url.searchParams.set("limit", "5");
            url.searchParams.set("countrycodes", "ph");

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Location search request failed.");
            }

            const results = await response.json();

            if (!results.length) {
                locationMessage.textContent =
                    "No matching location found. Try another search.";
                return;
            }

            const result = results[0];
            const lat = Number(result.lat);
            const lng = Number(result.lon);

            map.setView([lat, lng], 16);
            setPin(lat, lng);
            locationMessage.textContent =
                `${result.display_name} (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        } catch (error) {
            console.error("BantayBayan location search error:", error);
            locationMessage.textContent =
                "Search failed. Check your internet connection and try again.";
        } finally {
            searchButton.disabled = false;
            searchButton.innerHTML =
                '<i class="fa-solid fa-magnifying-glass me-1"></i> Search';
        }
    }

    searchButton?.addEventListener("click", searchLocation);

    searchInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchLocation();
        }
    });

    currentLocationButton?.addEventListener("click", () => {
        if (!navigator.geolocation) {
            locationMessage.textContent =
                "Your browser does not support location access.";
            return;
        }

        currentLocationButton.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                map.setView([lat, lng], 17);
                setPin(lat, lng);

                currentLocationButton.disabled = false;
            },
            (error) => {
                console.error("BantayBayan geolocation error:", error);

                locationMessage.textContent =
                    "Unable to get your location. Allow location access in your browser and try again.";

                currentLocationButton.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });

    clearButton?.addEventListener("click", () => {
        if (marker) {
            map.removeLayer(marker);
            marker = null;
        }

        latitudeInput.value = "";
        longitudeInput.value = "";

        locationMessage.textContent = "No location selected yet.";
    });

    // Fix the map dimensions after the page finishes laying out.
    requestAnimationFrame(() => map.invalidateSize());
    window.addEventListener("resize", () => map.invalidateSize());

    console.log("BantayBayan report map initialized successfully.");
}
