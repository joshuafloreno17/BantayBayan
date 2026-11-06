
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

// ==========================================
// DOM ELEMENTS
// ==========================================
const reportForm = document.getElementById("reportForm");
const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitReport");

const issueTypeInput = document.getElementById("issueType");
const regionInput = document.getElementById("region");
const provinceInput = document.getElementById("province");
const cityMunicipalityInput = document.getElementById("cityMunicipality");
const barangayInput = document.getElementById("barangay");
const purokInput = document.getElementById("purok");

const descriptionInput = document.getElementById("description");
const photoInput = document.getElementById("photo");
const contactNameInput = document.getElementById("contactName");
const contactInfoInput = document.getElementById("contactInfo");

const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const mapElement = document.getElementById("reportMap");

let currentUser = null;
let authReady = false;

console.log("BantayBayan report.js loaded!");

// ==========================================
// AUTHENTICATION
// ==========================================
const authReadyPromise = new Promise((resolve) => {
    let resolved = false;

    onAuthStateChanged(
        auth,
        (user) => {
            currentUser = user;
            authReady = true;

            if (!user) {
                window.location.replace("resident-login.html");
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

// ==========================================
// MESSAGE HELPERS
// ==========================================
function hideMessage() {
    if (!formMessage) return;

    formMessage.replaceChildren();
    formMessage.className = "alert d-none";
}

function showMessage(message, type = "danger") {
    if (!formMessage) {
        console.error(message);
        return;
    }

    formMessage.replaceChildren();
    formMessage.className = `alert alert-${type}`;
    formMessage.setAttribute("role", "alert");

    const messageText = document.createElement("p");
    messageText.className = "mb-0";
    messageText.textContent = message;

    formMessage.appendChild(messageText);

    formMessage.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function showValidationErrors(errors) {
    if (!formMessage) return;

    formMessage.replaceChildren();
    formMessage.className = "alert alert-danger";
    formMessage.setAttribute("role", "alert");
    formMessage.setAttribute("aria-live", "assertive");

    const heading = document.createElement("h6");
    heading.className = "alert-heading fw-bold";
    heading.textContent = "Pakikumpleto o ayusin ang mga sumusunod:";

    formMessage.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "mb-0 ps-3";

    errors.forEach((error) => {
        const item = document.createElement("li");
        item.className = "mb-1";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-link text-start p-0";
        button.style.textDecoration = "underline";
        button.textContent = error.message;

        button.addEventListener("click", () => {
            if (error.target === "map") {
                mapElement?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                return;
            }

            const field = error.target;

            if (field && typeof field.focus === "function") {
                field.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                field.focus();
            }
        });

        item.appendChild(button);
        list.appendChild(item);
    });

    formMessage.appendChild(list);

    formMessage.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function getSelectedText(selectElement) {
    return selectElement?.selectedOptions?.[0]?.textContent?.trim() || "";
}

// ==========================================
// FIELD HIGHLIGHTING
// ==========================================
function markInvalid(field) {
    if (!field) return;

    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
}

function clearInvalid(field) {
    if (!field) return;

    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
}

function clearAllInvalidFields() {
    [
        issueTypeInput,
        regionInput,
        provinceInput,
        cityMunicipalityInput,
        barangayInput,
        purokInput,
        descriptionInput,
        photoInput,
        contactNameInput,
        contactInfoInput
    ].forEach(clearInvalid);
}

[
    issueTypeInput,
    regionInput,
    provinceInput,
    cityMunicipalityInput,
    barangayInput,
    purokInput,
    descriptionInput,
    photoInput,
    contactNameInput,
    contactInfoInput
].forEach((field) => {
    field?.addEventListener("change", () => clearInvalid(field));
    field?.addEventListener("input", () => clearInvalid(field));
});

// ==========================================
// PHOTO VALIDATION AND COMPRESSION
// ==========================================
function validatePhoto(file) {
    if (!file) {
        return "Mag-upload ng larawan ng problema.";
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        return "Hindi suportadong format ng larawan. JPG, PNG, o WebP lamang.";
    }

    if (file.size > 5 * 1024 * 1024) {
        return "Ang larawan ay dapat hindi lalampas sa 5 MB.";
    }

    return null;
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const photoError = validatePhoto(file);

        if (photoError) {
            reject(new Error(photoError));
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

// ==========================================
// VALIDATE ALL FIELDS TOGETHER
// ==========================================
function collectValidationErrors() {
    const errors = [];

    clearAllInvalidFields();

    function addError(message, target) {
        errors.push({ message, target });

        if (target !== "map") {
            markInvalid(target);
        }
    }

    // Issue type
    const validTypes = [
        "garbage",
        "flooding",
        "canal",
        "streetlight",
        "others"
    ];

    if (!validTypes.includes(issueTypeInput?.value)) {
        addError("Pumili ng valid na uri ng problema.", issueTypeInput);
    }

    // Region
    const regionCode = regionInput?.value || "";
    const region = getSelectedText(regionInput);

    if (!regionCode || !region) {
        addError("Pumili ng Region.", regionInput);
    }

    // Province: some areas legitimately have no province.
    const provinceCode = provinceInput?.value || "";
    const province = provinceCode === "__NO_PROVINCE__"
        ? ""
        : getSelectedText(provinceInput);

    if (
        !provinceCode ||
        (provinceCode !== "__NO_PROVINCE__" && !province)
    ) {
        addError("Pumili ng Province kung mayroon.", provinceInput);
    }

    // City / Municipality
    const cityMunicipalityCode = cityMunicipalityInput?.value || "";
    const cityMunicipality = getSelectedText(cityMunicipalityInput);

    if (
        !cityMunicipalityCode ||
        cityMunicipalityCode === "__NO_CITY__" ||
        !cityMunicipality
    ) {
        addError("Pumili ng City/Municipality.", cityMunicipalityInput);
    }

    // Barangay
    const barangayCode = barangayInput?.value || "";
    const barangay = getSelectedText(barangayInput);

    if (!barangayCode || !barangay) {
        addError("Pumili ng Barangay.", barangayInput);
    }

    // Purok
    const validPuroks = [
        "Purok 1",
        "Purok 2",
        "Purok 3",
        "Purok 4",
        "Purok 5",
        "Purok 6",
        "Purok 7"
    ];

    if (!validPuroks.includes(purokInput?.value)) {
        addError("Pumili ng Purok.", purokInput);
    }

    // Description
    const description = descriptionInput?.value.trim() || "";

    if (description.length < 5 || description.length > 1000) {
        addError(
            "Ang description ay dapat 5 hanggang 1000 characters.",
            descriptionInput
        );
    }

    // Map coordinates
    const latitudeText = latitudeInput?.value.trim() || "";
    const longitudeText = longitudeInput?.value.trim() || "";

    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);

    if (
        !latitudeText ||
        !longitudeText ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        addError(
            "Pumili ng eksaktong lokasyon sa mapa.",
            "map"
        );
    }

    // Photo
    const photoFile = photoInput?.files?.[0] || null;
    const photoError = validatePhoto(photoFile);

    if (photoError) {
        addError(photoError, photoInput);
    }

    // Contact name
    const contactName = contactNameInput?.value.trim() || "";

    if (!contactName || contactName.length > 100) {
        addError(
            "Ilagay ang iyong pangalan (1 hanggang 100 characters).",
            contactNameInput
        );
    }

    // Contact information
    const contactInfo = contactInfoInput?.value.trim() || "";

    if (!contactInfo || contactInfo.length > 200) {
        addError(
            "Ilagay ang iyong contact information (1 hanggang 200 characters).",
            contactInfoInput
        );
    }

    return {
        errors,
        data: {
            type: issueTypeInput.value,
            region,
            regionCode,
            province,
            provinceCode: provinceCode === "__NO_PROVINCE__"
                ? ""
                : provinceCode,
            cityMunicipality,
            cityMunicipalityCode,
            barangay,
            barangayCode,
            purok: purokInput?.value || "",
            description,
            latitude,
            longitude,
            photoFile,
            contactName,
            contactInfo
        }
    };
}

// ==========================================
// FORM SUBMISSION
// ==========================================
reportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitButton?.disabled) {
        return;
    }

    const originalButtonHTML = submitButton?.innerHTML || "Submit Report";

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
    }

    try {
        const user = await authReadyPromise;

        if (!user || !authReady || !currentUser) {
            showMessage(
                "Kailangan mong mag-login bago mag-submit ng report."
            );
            return;
        }

        // Check every field before attempting any database write.
        const validation = collectValidationErrors();

        if (validation.errors.length > 0) {
            showValidationErrors(validation.errors);
            return;
        }

        const {
            type,
            region,
            regionCode,
            province,
            provinceCode,
            cityMunicipality,
            cityMunicipalityCode,
            barangay,
            barangayCode,
            purok,
            description,
            latitude,
            longitude,
            photoFile,
            contactName,
            contactInfo
        } = validation.data;

        // Process the photo only after all fields are valid.
        showMessage("Pinoproseso ang larawan...", "info");

        const compressedPhoto = await compressImage(photoFile);

        // Create the report and private contact documents together.
        const reportRef = doc(collection(db, "reports"));
        const contactRef = doc(db, "reportContacts", reportRef.id);

        const batch = writeBatch(db);

        batch.set(reportRef, {
            userId: user.uid,
            type,

            region,
            regionCode,

            province,
            provinceCode,

            cityMunicipality,
            cityMunicipalityCode,

            barangay,
            barangayCode,

            purok,
            description,

            status: "Pending",
            createdAt: serverTimestamp(),
            photo: compressedPhoto,
            latitude,
            longitude
        });

        batch.set(contactRef, {
            reportId: reportRef.id,
            name: contactName,
            contact: contactInfo,
            createdAt: serverTimestamp()
        });

        await batch.commit();

        // Report saved successfully.
        clearAllInvalidFields();

        showMessage(
            `Matagumpay na na-submit ang report mo! Reference ID: ${reportRef.id}`,
            "success"
        );

        reportForm.reset();

        if (latitudeInput) latitudeInput.value = "";
        if (longitudeInput) longitudeInput.value = "";

        document.getElementById("clearLocation")?.click();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        console.error("Report submission error:", error);

        if (error.code === "permission-denied") {
            showMessage(
                "Hindi pinayagan ng Firestore Rules ang submission. " +
                "Tiyaking na-publish ang updated rules at tama ang report fields."
            );
        } else {
            showMessage(
                error.message ||
                "Hindi na-submit ang report. Pakisubukan ulit."
            );
        }
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
        }
    }
});

if (!reportForm) {
    console.error("BantayBayan: Hindi makita ang reportForm sa report.html.");
}

if (!purokInput) {
    console.error(
        'BantayBayan: Hindi makita ang element na may id="purok". ' +
        "Tiyaking tugma ang ID sa report.html."
    );
}
