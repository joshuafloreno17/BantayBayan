import { auth, db } from "./firebase-config.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const floodForm = document.getElementById("floodForm");
const floodMessage = document.getElementById("floodMessage");
const submitButton = document.getElementById("submitFlood");

const purokInput = document.getElementById("floodPurok");
const levelInput = document.getElementById("floodLevel");
const descriptionInput = document.getElementById("floodDescription");
const latitudeInput = document.getElementById("floodLatitude");
const longitudeInput = document.getElementById("floodLongitude");

const photoInput = document.getElementById("floodPhoto");
const photoPreview = document.getElementById("floodPhotoPreview");
const floodAlertsList = document.getElementById("floodAlertsList");

let currentMessageKey = "";
let currentLiteralMessage = "";
let isSubmitting = false;
let previewUrl = null;

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_COMPRESSED_DATA_URL_LENGTH = 650 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function floodText(key) {
    return window.BantayBayanLanguage?.getTranslation(key) || key;
}

function showFloodMessage(messageOrKey, type = "danger", isLiteral = false) {
    currentMessageKey = isLiteral ? "" : messageOrKey;
    currentLiteralMessage = isLiteral ? messageOrKey : "";

    floodMessage.textContent = isLiteral
        ? messageOrKey
        : floodText(messageOrKey);

    floodMessage.className = `alert alert-${type}`;
    floodMessage.setAttribute("role", type === "danger" ? "alert" : "status");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateFloodLanguage() {
    if (currentMessageKey) {
        floodMessage.textContent = floodText(currentMessageKey);
    } else if (currentLiteralMessage) {
        floodMessage.textContent = currentLiteralMessage;
    }

    submitButton.textContent = isSubmitting
        ? floodText("submittingFloodReport")
        : floodText("submitFloodReport");
}

window.addEventListener("bantaybayan:languagechange", updateFloodLanguage);

// Compress the photo to reduce its size before saving it to Firestore.
function compressFloodImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("Please upload a photo of the flooded area."));
            return;
        }

        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
            reject(new Error("Choose a JPG, PNG, or WebP image."));
            return;
        }

        if (file.size > MAX_PHOTO_SIZE) {
            reject(new Error("The original photo must not exceed 5 MB."));
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => {
            reject(new Error("Could not read the selected photo."));
        };

        reader.onload = () => {
            const image = new Image();

            image.onerror = () => {
                reject(new Error("Could not load the selected photo."));
            };

            image.onload = () => {
                const canvas = document.createElement("canvas");
                const maxDimension = 800;

                let width = image.width;
                let height = image.height;

                if (width > maxDimension || height > maxDimension) {
                    const scale = Math.min(
                        maxDimension / width,
                        maxDimension / height
                    );

                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("Could not process the selected photo."));
                    return;
                }

                context.drawImage(image, 0, 0, width, height);

                // Save as compressed JPEG.
                const compressedPhoto = canvas.toDataURL("image/jpeg", 0.55);

                // Leave room for other fields within Firestore's 1 MiB limit.
                if (compressedPhoto.length > MAX_COMPRESSED_DATA_URL_LENGTH) {
                    reject(new Error(
                        "The compressed photo is still too large. Please choose a smaller photo."
                    ));
                    return;
                }

                resolve(compressedPhoto);
            };

            image.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

// Preview and validate the selected photo.
photoInput?.addEventListener("change", function () {
    const file = photoInput.files?.[0];

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }

    photoPreview?.classList.add("d-none");

    if (photoPreview) {
        photoPreview.removeAttribute("src");
    }

    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        photoInput.value = "";
        showFloodMessage(
            "Please select a JPG, PNG, or WebP image.",
            "danger",
            true
        );
        return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
        photoInput.value = "";
        showFloodMessage(
            "The photo must not exceed 5 MB.",
            "danger",
            true
        );
        return;
    }

    previewUrl = URL.createObjectURL(file);

    if (photoPreview) {
        photoPreview.src = previewUrl;
        photoPreview.classList.remove("d-none");
    }
});

// Submit a flood report and its compressed photo.
floodForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (isSubmitting) return;
    if (!floodForm.reportValidity()) return;

    const purok = purokInput.value;
    const floodLevel = levelInput.value;
    const description = descriptionInput.value.trim();
    const photo = photoInput?.files?.[0];

    const latitude = Number(latitudeInput.value);
    const longitude = Number(longitudeInput.value);

    const validPuroks = [
        "Purok 1",
        "Purok 2",
        "Purok 3",
        "Purok 4",
        "Purok 5",
        "Purok 6",
        "Purok 7"
    ];

    const validLevels = ["ankle", "knee", "waist"];

    if (
        !latitudeInput.value ||
        !longitudeInput.value ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        showFloodMessage("selectPinFirst");
        return;
    }

    if (!validPuroks.includes(purok) || !validLevels.includes(floodLevel)) {
        showFloodMessage("selectPurokAndLevel");
        return;
    }

    if (description.length > 500) {
        showFloodMessage("detailsTooLong");
        return;
    }

    if (!photo) {
        showFloodMessage(
            "Please upload a photo of the flooded area.",
            "danger",
            true
        );
        photoInput?.focus();
        return;
    }

    if (
        !ALLOWED_PHOTO_TYPES.includes(photo.type) ||
        photo.size > MAX_PHOTO_SIZE
    ) {
        showFloodMessage(
            "Choose a JPG, PNG, or WebP image up to 5 MB.",
            "danger",
            true
        );
        return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    updateFloodLanguage();

    try {
        showFloodMessage("Compressing photo...", "info", true);

        const compressedPhoto = await compressFloodImage(photo);

        showFloodMessage("Submitting flood report...", "info", true);

const user = auth.currentUser;

if (!user) {
    showFloodMessage(
        "Please log in before submitting a flood report.",
        "danger",
        true
    );
    return;
}

await addDoc(collection(db, "floodReports"), {
    userId: user.uid,
    purok,
    floodLevel,
    description,
    latitude,
    longitude,
    photoUrl: compressedPhoto,
    createdAt: serverTimestamp()
});

        floodForm.reset();

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }

        photoPreview?.classList.add("d-none");

        if (photoPreview) {
            photoPreview.removeAttribute("src");
        }

        document.getElementById("floodClearPin")?.click();

        showFloodMessage("floodReportSuccess", "success");
    } catch (error) {
        console.error("Error submitting flood report:", error);

        if (error.code === "permission-denied") {
            showFloodMessage(
                "Firestore denied this report. Its security rules may need to allow the photoUrl field.",
                "danger",
                true
            );
        } else if (
            error.code === "resource-exhausted" ||
            error.code === "invalid-argument"
        ) {
            showFloodMessage(
                "The photo or report is too large for Firestore. Please choose a smaller photo.",
                "danger",
                true
            );
        } else {
            showFloodMessage(
                error.message || "Could not submit the flood report. Please try again.",
                "danger",
                true
            );
        }
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        updateFloodLanguage();
    }
});

// Monitor flood reports from the last hour.
// Three or more reports from the same Purok trigger an alert.
function startFloodAlertListener() {
    const reportsQuery = query(
        collection(db, "floodReports"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(
        reportsQuery,
        (snapshot) => {
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const recentCounts = {};
            const latestByPurok = {};

            snapshot.forEach((documentSnapshot) => {
                const report = documentSnapshot.data();

                if (!report.purok || !report.createdAt) return;

              const createdAt = report.createdAt.toMillis();

if (createdAt <= 0 || createdAt < oneHourAgo || createdAt > Date.now()) {
    return;
}

                recentCounts[report.purok] =
                    (recentCounts[report.purok] || 0) + 1;

                if (!latestByPurok[report.purok]) {
                    latestByPurok[report.purok] = report;
                }
            });

            renderFloodAlerts(recentCounts, latestByPurok);
        },
        (error) => {
            console.error("Live flood alert error:", error);

            floodAlertsList.textContent =
                "Unable to load live flood alerts. Please refresh the page.";
        }
    );
}

function renderFloodAlerts(counts, latestByPurok) {
    const alertPuroks = Object.keys(counts)
        .filter((purok) => counts[purok] >= 3)
        .sort();

    if (alertPuroks.length === 0) {
        floodAlertsList.innerHTML = `
            <div class="alert alert-success mb-0">
                ✅ No active flood alert based on the 3-report threshold.
            </div>
        `;
        return;
    }

    floodAlertsList.replaceChildren();

    alertPuroks.forEach((purok) => {
        const latestReport = latestByPurok[purok];

        const alertBox = document.createElement("div");
        alertBox.className = "alert alert-danger border-danger mb-3";
        alertBox.setAttribute("role", "alert");

        const heading = document.createElement("h3");
        heading.className = "h6 fw-bold";
        heading.textContent = `🚨 FLOOD WARNING — ${purok}`;

        const count = document.createElement("p");
        count.className = "mb-2";
        count.textContent =
            `${counts[purok]} flood reports recorded in this Purok within the last hour.`;

        const levelNames = {
            ankle: "Ankle-deep",
            knee: "Knee-deep",
            waist: "Waist-deep"
        };

        const level = document.createElement("p");
        level.className = "mb-2";
        level.textContent =
            `Latest reported water level: ${levelNames[latestReport.floodLevel] || "Not specified"}`;

        alertBox.append(heading, count, level);

        const photoUrl = latestReport.photoUrl || latestReport.photo;

        if (photoUrl) {
            const photo = document.createElement("img");
            photo.src = photoUrl;
            photo.alt = `Flood photo for ${purok}`;
            photo.className = "img-fluid rounded border mb-3";
            photo.style.maxHeight = "240px";
            photo.loading = "lazy";
            alertBox.appendChild(photo);
        }

        const mapButton = document.createElement("button");
        mapButton.type = "button";
        mapButton.className = "btn btn-sm btn-outline-danger";
        mapButton.textContent = "View latest report location";

        mapButton.addEventListener("click", () => {
            document.getElementById("floodMap")?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            window.dispatchEvent(
                new CustomEvent("bantaybayan:focusfloodlocation", {
                    detail: {
                        lat: latestReport.latitude,
                        lng: latestReport.longitude,
                        purok
                    }
                })
            );
        });

        alertBox.appendChild(mapButton);
        floodAlertsList.appendChild(alertBox);
    });
}

if (floodForm && floodMessage && submitButton) {
    startFloodAlertListener();
}
