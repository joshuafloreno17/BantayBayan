import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const OFFICIAL_UIDS = new Set([
    "lA4mlJYUdBSsu8qZjTOSeFet3Tr2",
    "GU9l1duyPxRIear5WWzuSJWYgYq1"
]);

const $ = id => document.getElementById(id);
// ==========================================
// ANNOUNCEMENT AUDIT LOG HELPER
// ==========================================

async function commitAnnouncementAudit(
    announcementRef,
    operation,
    announcementTitle,
    updateData = null
) {
    if (!currentUser || !OFFICIAL_UIDS.has(currentUser.uid)) {
        throw new Error("Unauthorized announcement audit action.");
    }

    const batch = writeBatch(db);
    const auditRef = doc(collection(db, "auditLogs"));

    if (operation === "create") {
        batch.set(announcementRef, updateData);
    } else {
        batch.update(announcementRef, updateData);
    }

    const actionDetails = {
        archive: {
            action: "announcement_archived",
            details: `Announcement archived: ${announcementTitle}`
        },
        update: {
            action: "announcement_updated",
            details: `Announcement updated: ${announcementTitle}`
        },
        publish: {
            action: "announcement_published",
            details: `Announcement published: ${announcementTitle}`
        }
    };

    const selectedAction = actionDetails[operation === "create" ? "publish" : operation];

    if (!selectedAction) {
        throw new Error("Invalid announcement audit operation.");
    }

    batch.set(auditRef, {
        actorUid: currentUser.uid,
        actorEmail: currentUser.email || "",
        action: selectedAction.action,
        targetCollection: "announcements",
        targetId: announcementRef.id,
        targetLabel: String(announcementTitle).slice(0, 200),
        details: selectedAction.details.slice(0, 1000),
        timestamp: serverTimestamp()
    });

    await batch.commit();
}

// ==========================================
// END ANNOUNCEMENT AUDIT LOG HELPER
// ==========================================

const form = $("announcementForm");
const titleInput = $("announcementTitle");
const messageInput = $("announcementMessage");
const categoryInput = $("announcementCategory");
const priorityInput = $("announcementPriority");
const statusInput = $("announcementStatus");
const expiresInput = $("announcementExpiresAt");
const editIdInput = $("announcementEditId");

const saveButton = $("saveAnnouncementButton");
const cancelButton = $("cancelAnnouncementEdit");
const feedback = $("officialAnnouncementMessage");
const list = $("officialAnnouncementsList");
const count = $("officialAnnouncementCount");
const loading = $("officialAnnouncementsLoading");
const empty = $("officialAnnouncementsEmpty");

let currentUser = null;
let unsubscribeAnnouncements = null;
let announcements = [];

function showMessage(message, type = "info") {
    feedback.textContent = message;
    feedback.className = `alert alert-${type}`;
}

function hideMessage() {
    feedback.textContent = "";
    feedback.className = "alert d-none";
}

function timestampMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
    const millis = timestampMillis(value);
    if (!millis) return "Date unavailable";

    return new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(millis));
}

function toLocalDateTime(value) {
    const millis = timestampMillis(value);
    if (!millis) return "";

    const date = new Date(millis);
    const pad = number => String(number).padStart(2, "0");

    return (
        date.getFullYear() + "-" +
        pad(date.getMonth() + 1) + "-" +
        pad(date.getDate()) + "T" +
        pad(date.getHours()) + ":" +
        pad(date.getMinutes())
    );
}

function resetForm() {
    form.reset();
    editIdInput.value = "";
    statusInput.value = "Published";
    categoryInput.value = "Flood Warning";
    priorityInput.value = "Normal";

    saveButton.disabled = false;
    saveButton.innerHTML =
        '<i class="fa-solid fa-paper-plane me-2" aria-hidden="true"></i> Publish Announcement';

    cancelButton.classList.add("d-none");
}

function createTextElement(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    return element;
}

function renderAnnouncements() {
    list.replaceChildren();

    announcements.sort((a, b) =>
        timestampMillis(b.createdAt) - timestampMillis(a.createdAt)
    );

    count.textContent =
        `${announcements.length} announcement${announcements.length === 1 ? "" : "s"}`;

    empty.classList.toggle("d-none", announcements.length > 0);

    announcements.forEach(item => {
        const card = document.createElement("article");
        card.className = "announcement-record";

        const top = document.createElement("div");
        top.className = "d-flex flex-wrap justify-content-between gap-2";

        const heading = createTextElement("h4", "h6 fw-bold mb-1", item.title);
        const badges = document.createElement("div");
        badges.className = "d-flex flex-wrap gap-2";

        const priority = createTextElement(
            "span",
            `badge ${item.priority === "Critical" ? "text-bg-danger" :
                item.priority === "High" ? "text-bg-warning" : "text-bg-secondary"}`,
            item.priority
        );

        const status = createTextElement(
            "span",
            `badge ${item.status === "Published" ? "text-bg-success" : "text-bg-dark"}`,
            item.status
        );

        badges.append(priority, status);
        top.append(heading, badges);

        const metadata = createTextElement(
            "div",
            "small text-secondary mb-2",
            `${item.category} • Posted ${formatDate(item.createdAt)}`
        );

        const body = createTextElement("p", "announcement-message mb-2", item.message);

        const expiry = createTextElement(
            "div",
            "small text-secondary mb-3",
            item.expiresAt
                ? `Expires: ${formatDate(item.expiresAt)}`
                : "No expiration"
        );

        const actions = document.createElement("div");
        actions.className = "d-flex flex-wrap gap-2";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "btn btn-sm btn-outline-primary";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => editAnnouncement(item));

        const archive = document.createElement("button");
        archive.type = "button";
        archive.className = "btn btn-sm btn-outline-danger";
        archive.textContent = item.status === "Archived" ? "Archived" : "Archive";
        archive.disabled = item.status === "Archived";
        archive.addEventListener("click", () => archiveAnnouncement(item));

        actions.append(edit, archive);
        card.append(top, metadata, body, expiry, actions);
        list.appendChild(card);
    });
}

function editAnnouncement(item) {
    editIdInput.value = item.id;
    titleInput.value = item.title || "";
    messageInput.value = item.message || "";
    categoryInput.value = item.category || "General Advisory";
    priorityInput.value = item.priority || "Normal";
    statusInput.value = item.status || "Published";
    expiresInput.value = toLocalDateTime(item.expiresAt);

    saveButton.innerHTML =
        '<i class="fa-solid fa-floppy-disk me-2" aria-hidden="true"></i> Save Changes';

    cancelButton.classList.remove("d-none");
    hideMessage();

    $("officialAnnouncements").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function archiveAnnouncement(item) {
    if (!currentUser) return;

    const confirmed = window.confirm(
        `Archive "${item.title}"? Residents will no longer see this announcement.`
    );

    if (!confirmed) return;

    try {
        await commitAnnouncementAudit(
            doc(db, "announcements", item.id),
            "archive",
            item.title,
            {
                status: "Archived",
                updatedAt: serverTimestamp()
            }
        );

        showMessage("Announcement archived successfully.", "success");
    } catch (error) {
        console.error("Announcement archive failed:", error);
        showMessage(
            "Unable to archive announcement. Please check your connection and Firestore Rules.",
            "danger"
        );
    }
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || !OFFICIAL_UIDS.has(currentUser.uid)) {
        showMessage("Unauthorized account.", "danger");
        return;
    }

    const title = titleInput.value.trim();
    const message = messageInput.value.trim();
    const category = categoryInput.value;
    const priority = priorityInput.value;
    const status = statusInput.value;

    if (title.length < 5 || title.length > 120) {
        showMessage("Title must contain 5 to 120 characters.", "warning");
        return;
    }

    if (message.length < 10 || message.length > 3000) {
        showMessage("Message must contain 10 to 3,000 characters.", "warning");
        return;
    }

    const validCategories = [
        "Flood Warning",
        "Evacuation",
        "Weather Alert",
        "Road Closure",
        "General Advisory"
    ];

    if (!validCategories.includes(category) ||
        !["Normal", "High", "Critical"].includes(priority) ||
        !["Published", "Archived"].includes(status)) {
        showMessage("Please select valid announcement settings.", "warning");
        return;
    }

    let expiresAt = null;

    if (expiresInput.value) {
        const expirationDate = new Date(expiresInput.value);

        if (Number.isNaN(expirationDate.getTime())) {
            showMessage("Please enter a valid expiration date.", "warning");
            return;
        }

        if (status === "Published" && expirationDate.getTime() <= Date.now()) {
            showMessage("A published announcement must expire in the future.", "warning");
            return;
        }

        expiresAt = Timestamp.fromDate(expirationDate);
    }

    const editingId = editIdInput.value;

    saveButton.disabled = true;

    try {
        if (editingId) {
            await commitAnnouncementAudit(
                doc(db, "announcements", editingId),
                "update",
                title,
                {
                    title,
                    message,
                    category,
                    priority,
                    status,
                    expiresAt,
                    updatedAt: serverTimestamp()
                }
            );

            showMessage("Announcement updated successfully.", "success");
        } else {
            const newAnnouncementRef = doc(collection(db, "announcements"));

            await commitAnnouncementAudit(
                newAnnouncementRef,
                "create",
                title,
                {
                    title,
                    message,
                    category,
                    priority,
                    status: "Published",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: currentUser.uid,
                    expiresAt
                }
            );

            showMessage("Announcement published successfully.", "success");
        }

        resetForm();
    } catch (error) {
        console.error("Announcement save failed:", error);

        showMessage(
            "Unable to save announcement. Check your internet connection and Firestore Rules.",
            "danger"
        );
    } finally {
        saveButton.disabled = false;
    }
});

cancelButton.addEventListener("click", () => {
    resetForm();
    hideMessage();
});

function stopAnnouncementListener() {
    if (unsubscribeAnnouncements) {
        unsubscribeAnnouncements();
        unsubscribeAnnouncements = null;
    }
}

function startAnnouncementListener() {
    stopAnnouncementListener();

    loading.classList.remove("d-none");

    unsubscribeAnnouncements = onSnapshot(
        collection(db, "announcements"),
        snapshot => {
            announcements = snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

            loading.classList.add("d-none");
            renderAnnouncements();
        },
        error => {
            console.error("Official announcements listener failed:", error);
            loading.classList.add("d-none");
            showMessage(
                "Unable to load announcements. Please check Firestore access.",
                "danger"
            );
        }
    );
}

onAuthStateChanged(auth, user => {
    if (!user || !OFFICIAL_UIDS.has(user.uid)) {
        currentUser = null;
        stopAnnouncementListener();
        return;
    }

    currentUser = user;
    startAnnouncementListener();
});

window.addEventListener("beforeunload", stopAnnouncementListener);