
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    doc,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const reportForm = document.getElementById("reportForm");
const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitReport");

const issueTypeInput = document.getElementById("issueType");
const descriptionInput = document.getElementById("description");
const photoInput = document.getElementById("photo");
const contactNameInput = document.getElementById("contactName");
const contactInfoInput = document.getElementById("contactInfo");

const regionInput = document.getElementById("region");
const provinceInput = document.getElementById("province");
const cityMunicipalityInput = document.getElementById("cityMunicipality");
const barangayInput = document.getElementById("barangay");

const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");

let currentUser = null;
let authReady = false;

console.log("BantayBayan report.js loaded!");

function showMessage(message, type = "danger") {
    formMessage.textContent = message;
    formMessage.className = `alert alert-${type}`;
}

function hideMessage() {
    formMessage.textContent = "";
    formMessage.className = "alert d-none";
}

function getSelectedText(selectElement) {
    return selectElement?.selectedOptions?.[0]?.textContent?.trim() || "";
}

// Wait for Firebase authentication to finish loading.
const authReadyPromise = new Promise((resolve) => {
    let resolved = false;

    onAuthStateChanged(
        auth,
        (user) => {
            currentUser = user;
            authReady = true;

            if (!user) {
                window.location.replace("login.html");
            }

            if (!resolved) {
                resolved = true;
                resolve(user);
            }
        },
        (error) => {
            console.error("Authentication error:", error);

            showMessage(
                "Hindi ma-verify ang iyong account. Subukang mag-login ulit."
            );

            if (!resolved) {
                resolved = true;
                resolve(null);
            }
        }
    );
});

// Compress the selected photo before saving it to Firestore.
function compressImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("Mangyaring pumili ng larawan."));
            return;
        }

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            reject(new Error("JPG, PNG, o WebP lamang ang tinatanggap."));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            reject(new Error("Ang larawan ay dapat hindi lalampas sa 5 MB."));
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => {
            reject(new Error("Hindi mabasa ang napiling larawan."));
        };

        reader.onload = () => {
            const image = new Image();

            image.onerror = () => {
                reject(new Error("Hindi ma-load ang larawan."));
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
                    reject(new Error("Hindi ma-process ang larawan."));
                    return;
                }

                context.drawImage(image, 0, 0, width, height);

                const compressedPhoto = canvas.toDataURL(
                    "image/jpeg",
                    0.6
                );

                if (compressedPhoto.length > 700 * 1024) {
                    reject(
                        new Error(
                            "Masyadong malaki ang larawan kahit na-compress. " +
                            "Pumili ng mas maliit na larawan."
                        )
                    );
                    return;
                }

                resolve(compressedPhoto);
            };

            image.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

// Validate and submit the report.
reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();

    if (submitButton.disabled) {
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        const user = await authReadyPromise;

        if (!user || !authReady || !currentUser) {
            showMessage("Kailangan mong mag-login bago mag-submit ng report.");
            return;
        }

        const type = issueTypeInput.value;
        const description = descriptionInput.value.trim();
        const contactName = contactNameInput.value.trim();
        const contactInfo = contactInfoInput.value.trim();
        const photoFile = photoInput.files[0];

        // Validate issue type.
        const validTypes = [
            "garbage",
            "flooding",
            "canal",
            "streetlight",
            "others"
        ];

        if (!validTypes.includes(type)) {
            showMessage("Pumili ng valid na type of issue.");
            return;
        }

        // Read the selected administrative locations.
        const regionCode = regionInput.value;
        const provinceCode = provinceInput.value;
        const cityMunicipalityCode = cityMunicipalityInput.value;
        const barangayCode = barangayInput.value;

        const region = getSelectedText(regionInput);
        const province = provinceCode === "__NO_PROVINCE__"
            ? ""
            : getSelectedText(provinceInput);
        const cityMunicipality = getSelectedText(cityMunicipalityInput);
        const barangay = getSelectedText(barangayInput);

        // Validate the selected locations.
        if (!regionCode || !region) {
            showMessage("Pumili ng Region.");
            regionInput.focus();
            return;
        }

        if (
            !provinceCode ||
            (provinceCode !== "__NO_PROVINCE__" && !province)
        ) {
            showMessage("Pumili ng Province.");
            provinceInput.focus();
            return;
        }

        if (
            !cityMunicipalityCode ||
            !cityMunicipality ||
            cityMunicipalityCode === "__NO_CITY__"
        ) {
            showMessage("Pumili ng City/Municipality.");
            cityMunicipalityInput.focus();
            return;
        }

        if (!barangayCode || !barangay) {
            showMessage("Pumili ng Barangay.");
            barangayInput.focus();
            return;
        }

        // Validate description.
        if (description.length < 5 || description.length > 1000) {
            showMessage(
                "Ang description ay dapat 5 hanggang 1000 characters."
            );
            return;
        }

        // Validate the map pin.
        const latitude = Number(latitudeInput.value);
        const longitude = Number(longitudeInput.value);

        if (
            latitudeInput.value.trim() === "" ||
            longitudeInput.value.trim() === "" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            showMessage(
                "Pumili muna ng eksaktong lokasyon sa mapa bago mag-submit."
            );

            document.getElementById("reportMap")?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            return;
        }

        // Validate contact information.
        if (!contactName || contactName.length > 100) {
            showMessage(
                "Ilagay ang iyong pangalan (hanggang 100 characters)."
            );
            return;
        }

        if (!contactInfo || contactInfo.length > 200) {
            showMessage(
                "Ilagay ang iyong contact information (hanggang 200 characters)."
            );
            return;
        }

        if (!reportForm.checkValidity()) {
            reportForm.reportValidity();
            showMessage("Pakikumpleto ang lahat ng required fields.");
            return;
        }

        if (!photoFile) {
            showMessage("Mangyaring mag-upload ng larawan ng problema.");
            return;
        }

        // Compress photo.
        showMessage("Pinoproseso ang larawan...", "info");

        const compressedPhoto = await compressImage(photoFile);

        // Create report and private contact documents together.
        const reportRef = doc(collection(db, "reports"));
        const contactRef = doc(db, "reportContacts", reportRef.id);

        const batch = writeBatch(db);

        batch.set(reportRef, {
            userId: user.uid,
            type: type,

            region: region,
            regionCode: regionCode,

            province: province,
            provinceCode: provinceCode === "__NO_PROVINCE__"
                ? ""
                : provinceCode,

            cityMunicipality: cityMunicipality,
            cityMunicipalityCode: cityMunicipalityCode,

            barangay: barangay,
            barangayCode: barangayCode,

            description: description,
            status: "Pending",
            createdAt: serverTimestamp(),
            photo: compressedPhoto,
            latitude: latitude,
            longitude: longitude
        });

        batch.set(contactRef, {
            reportId: reportRef.id,
            name: contactName,
            contact: contactInfo,
            createdAt: serverTimestamp()
        });

        await batch.commit();

        showMessage(
            `Matagumpay na na-submit ang report mo! Reference ID: ${reportRef.id}`,
            "success"
        );

        reportForm.reset();

        // Clear the selected map pin after successful submission.
        latitudeInput.value = "";
        longitudeInput.value = "";

        document.getElementById("clearLocation")?.click();

        // Bumalik sa pinakataas pagkatapos ma-submit ang report.
window.scrollTo({
    top: 0,
    behavior: "smooth"
});


    } catch (error) {
        console.error("Report submission error:", error);

        if (error.code === "permission-denied") {
            showMessage(
                "Hindi pinayagan ng Firestore Rules ang submission. " +
                "Kailangan munang i-update ang rules para sa bagong location fields."
            );
        } else {
            showMessage(
                error.message ||
                "Hindi na-submit ang report. Pakisubukan ulit."
            );
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Report";
    }
});