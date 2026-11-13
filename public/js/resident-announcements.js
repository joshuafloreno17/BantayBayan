import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

const list = $("residentAnnouncementsList");
const feedback = $("residentAnnouncementsMessage");
const count = $("residentAnnouncementCount");

let currentUser = null;
let unsubscribeNoExpiry = null;
let unsubscribeFutureExpiry = null;

let noExpiryAnnouncements = [];
let futureExpiryAnnouncements = [];

const translations = {
    en: {
        loading: "Loading announcements...",
        empty: "There are no active announcements at this time.",
        error: "Unable to load announcements. Please try again later.",
        posted: "Posted",
        expires: "Expires",
        noExpiry: "No expiration",
        critical: "CRITICAL",
        high: "HIGH",
        normal: "NORMAL",
        flood: "Flood Warning",
        evacuation: "Evacuation",
        weather: "Weather Alert",
        road: "Road Closure",
        general: "General Advisory",
        count: "announcements",
        announcement: "announcement"
    },
    fil: {
        loading: "Kinukuha ang mga anunsyo...",
        empty: "Walang aktibong anunsyo sa ngayon.",
        error: "Hindi ma-load ang mga anunsyo. Pakisubukan muli mamaya.",
        posted: "Ipinaskil",
        expires: "Mawawalan ng bisa",
        noExpiry: "Walang expiration",
        critical: "KRITIKAL",
        high: "MATAAS",
        normal: "NORMAL",
        flood: "Babala sa Baha",
        evacuation: "Paglikas",
        weather: "Babala sa Panahon",
        road: "Pagsasara ng Kalsada",
        general: "Pangkalahatang Abiso",
        count: "mga anunsyo",
        announcement: "anunsyo"
    }
};

function language() {
    const selected = window.BantayBayanLanguage?.getCurrentLanguage?.() || "en";
    return selected === "fil" ? "fil" : "en";
}

function t(key) {
    return translations[language()][key] || key;
}

function getMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
    const millis = getMillis(value);
    if (!millis) return "—";

    return new Intl.DateTimeFormat(
        language() === "fil" ? "fil-PH" : "en-PH",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(new Date(millis));
}

function categoryLabel(category) {
    const map = {
        "Flood Warning": "flood",
        "Evacuation": "evacuation",
        "Weather Alert": "weather",
        "Road Closure": "road",
        "General Advisory": "general"
    };

    return t(map[category] || "general");
}

function priorityLabel(priority) {
    const map = {
        Critical: "critical",
        High: "high",
        Normal: "normal"
    };

    return t(map[priority] || "normal");
}

function showMessage(message, type = "info") {
    feedback.textContent = message;
    feedback.className = `alert alert-${type}`;
}

function createText(tag, className, value) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
}

function getActiveAnnouncements() {
    const now = Date.now();
    const combined = new Map();

    [...noExpiryAnnouncements, ...futureExpiryAnnouncements].forEach(item => {
        const expiry = item.expiresAt ? getMillis(item.expiresAt) : null;

        if (expiry !== null && expiry <= now) return;
        if (item.status !== "Published") return;

        combined.set(item.id, item);
    });

    return [...combined.values()].sort((a, b) =>
        getMillis(b.createdAt) - getMillis(a.createdAt)
    );
}

function renderAnnouncements() {
    list.replaceChildren();

    const items = getActiveAnnouncements();

    count.textContent =
        `${items.length} ${items.length === 1 ? t("announcement") : t("count")}`;

    if (!items.length) {
        showMessage(t("empty"), "info");
        return;
    }

    feedback.className = "alert d-none";
    feedback.textContent = "";

    items.forEach(item => {
        const critical = item.priority === "Critical";
        const card = document.createElement("article");

        card.className = `resident-announcement-card ${critical ? "announcement-critical" : ""}`;

        const header = document.createElement("div");
        header.className = "d-flex flex-wrap justify-content-between align-items-start gap-2";

        const title = createText("h3", "h5 fw-bold mb-2", item.title);

        const priority = createText(
            "span",
            `badge ${critical ? "text-bg-danger" :
                item.priority === "High" ? "text-bg-warning" : "text-bg-secondary"}`,
            priorityLabel(item.priority)
        );

        header.append(title, priority);

        const category = createText(
            "div",
            "announcement-category small fw-semibold mb-2",
            categoryLabel(item.category)
        );

        const message = createText(
            "p",
            "announcement-message mb-3",
            item.message
        );

        const posted = createText(
            "div",
            "small text-secondary",
            `${t("posted")}: ${formatDate(item.createdAt)}`
        );

        const expiry = createText(
            "div",
            "small text-secondary",
            item.expiresAt
                ? `${t("expires")}: ${formatDate(item.expiresAt)}`
                : t("noExpiry")
        );

        const footer = document.createElement("div");
        footer.className = "announcement-meta";
        footer.append(posted, expiry);

        card.append(header, category, message, footer);
        list.appendChild(card);
    });
}

function mergeAndRender() {
    renderAnnouncements();
}

function stopAnnouncementListeners() {
    if (unsubscribeNoExpiry) {
        unsubscribeNoExpiry();
        unsubscribeNoExpiry = null;
    }

    if (unsubscribeFutureExpiry) {
        unsubscribeFutureExpiry();
        unsubscribeFutureExpiry = null;
    }
}

function startAnnouncementListeners() {
    stopAnnouncementListeners();

    noExpiryAnnouncements = [];
    futureExpiryAnnouncements = [];

    showMessage(t("loading"), "info");

    const announcementsRef = collection(db, "announcements");

    const noExpiryQuery = query(
        announcementsRef,
        where("status", "==", "Published"),
        where("expiresAt", "==", null)
    );

    const futureExpiryQuery = query(
        announcementsRef,
        where("status", "==", "Published"),
        where("expiresAt", ">", Timestamp.now())
    );

    unsubscribeNoExpiry = onSnapshot(
        noExpiryQuery,
        snapshot => {
            noExpiryAnnouncements = snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

            mergeAndRender();
        },
        error => {
            console.error("No-expiration announcements listener failed:", error);
            showMessage(t("error"), "danger");
        }
    );

    unsubscribeFutureExpiry = onSnapshot(
        futureExpiryQuery,
        snapshot => {
            futureExpiryAnnouncements = snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

            mergeAndRender();
        },
        error => {
            console.error("Future-expiration announcements listener failed:", error);
            showMessage(t("error"), "danger");
        }
    );
}

onAuthStateChanged(auth, user => {
    if (!user) {
        currentUser = null;
        stopAnnouncementListeners();
        return;
    }

    currentUser = user;
    startAnnouncementListeners();
});

window.addEventListener("bantaybayan:languagechange", () => {
    if (currentUser) renderAnnouncements();
});

window.setInterval(() => {
    if (currentUser) renderAnnouncements();
}, 30000);

window.addEventListener("beforeunload", stopAnnouncementListeners);