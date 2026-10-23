
const translations = {
    en: {
        home: "Home",
        about: "About",
        howItWorks: "How It Works",
        dashboard: "Dashboard",
        reportIssue: "Report an Issue",
        myReports: "My Reports",
        logout: "Logout",

        heroBadge: "Your Community, Your Voice",
        heroTitle: "Together for a safe and clean barangay.",
        heroDescription: "BantayBayan connects residents and their community through accessible digital information and tools that support a safer barangay.",
        heroInstruction: "Create an account or log in to access the resident dashboard and available BantayBayan services.",
        login: "Login",
        createAccount: "Create an Account",
        communityWatch: "BantayBayan Community Watch",
        communityDescription: "A digital platform designed to strengthen the connection between residents and their community.",
        community: "Community",
        saferBarangay: "Safer Barangay",
        aboutLabel: "ABOUT BANTAYBAYAN",
        aboutTitle: "A connected community starts with cooperation.",
        aboutDescription: "BantayBayan is a community-focused platform designed to make useful barangay information and digital services more accessible to residents.",
        communityMatters: "Your community matters.",
        cooperationDescription: "Cooperation between residents and local officials can help build a safer, cleaner, and more informed community.",
        simpleAccessible: "SIMPLE AND ACCESSIBLE",
        gettingStarted: "Getting Started with BantayBayan",
        gettingStartedDescription: "Follow these steps to access your resident account.",
        stepOneTitle: "1. Create an Account",
        stepOneDescription: "Register using your name, email address, and a secure password.",
        stepTwoTitle: "2. Log In",
        stepTwoDescription: "Sign in to access the resident dashboard using your registered account.",
        stepThreeTitle: "3. Access Your Dashboard",
        stepThreeDescription: "Explore the features available to you after signing in.",
        welcomeTitle: "Welcome to BantayBayan",
        welcomeDescription: "Join your community by creating an account or signing in to continue.",
        getStarted: "Get Started",
        footerDescription: "Community Reporting and Flood Monitoring System",
        footerMessage: "Working together for a safer and cleaner community.",

        residentPortal: "RESIDENT PORTAL",
        welcome: "Welcome",
        residentWelcomeMessage: "Let's work together to keep our community safe, clean, and orderly.",
        myAccount: "My Account",
        resident: "Resident",
        communityReports: "Community Reports",
        communityReportsDescription: "Report problems you notice in your barangay.",
        problemInArea: "Is there a problem in your area?",
        reportInstructions: "Submit a report about garbage, flooding, clogged canals, broken streetlights, and other community concerns.",
        myReportsDescription: "Reports you have submitted.",
        issue: "Issue",
        purok: "Purok",
        dateSubmitted: "Date Submitted",
        status: "Status",
        dashboardFooter: "© 2026 BantayBayan | Community Reporting System",
        loadingReports: "Loading your reports...",
        noReports: "You have no reports yet. Select Report an Issue to submit one.",
        reportError: "Unable to load reports. Please check your connection and try again.",

        // Report Page
        reportPageTitle: "Report a Community Issue",
        communityReporting: "Community Reporting",
        reportPageDescription: "Help your community by reporting a problem and selecting its exact location.",
        typeOfIssue: "Type of Issue",
        selectIssue: "Select an issue",
        garbageIssue: "Garbage / Trash",
        floodingIssue: "Flooding",
        canalIssue: "Blocked Canal",
        streetlightIssue: "Broken Streetlight",
        otherIssue: "Other Problems",
        locationInformation: "Location Information",
        locationInstructions: "Select where the problem happened, starting from the region down to the barangay.",
        region: "Region",
        province: "Province",
        cityMunicipality: "City / Municipality",
        barangay: "Barangay",
        exactLocation: "Exact Location of the Problem",
        pinInstructions: "Select your administrative location, then click the exact spot on the map to place a pin. Drag the marker to adjust it.",
        mapSearchPlaceholder: "Search a place or landmark...",
        search: "Search",
        searching: "Searching...",
        useCurrentLocation: "Use My Current Location",
        clearPin: "Clear Pin",
        locationRequired: "Select the exact location on the map before submitting.",
        noLocationSelected: "No location selected yet.",
        locationSelected: "Location selected.",
        locationPermissionDenied: "Location permission was denied. Please enable location access or select a location on the map.",
        locationUnavailable: "Your current location is unavailable. Please select a location on the map.",
        locationTimeout: "Location request timed out. Please try again.",
        placeNotFound: "No matching place was found. Try another search.",
        searchError: "Unable to search for that place. Please try again.",
        mapSearchRequired: "Enter a place or landmark to search.",
        loadingRegions: "Loading regions...",
        selectRegionFirst: "Select a region first",
        selectProvinceFirst: "Select a province first",
        selectCityFirst: "Select a city / municipality first",
        loadingLocations: "Loading Philippine locations...",
        locationsReady: "Philippine locations loaded.",
        locationsError: "Unable to load Philippine locations. Please refresh the page and try again.",
        loadingProvinces: "Loading provinces...",
        loadingCities: "Loading cities / municipalities...",
        loadingBarangays: "Loading barangays...",
        selectRegion: "Select a region",
        selectProvince: "Select a province",
        selectCity: "Select a city / municipality",
        selectBarangay: "Select a barangay",
        noProvince: "No province (NCR)",
        noProvinces: "No provinces available.",
        noCities: "No cities / municipalities found.",
        noBarangays: "No barangays found.",
        selectLocationFirst: "Select your region and administrative location first.",
        description: "Description",
        descriptionPlaceholder: "Describe the problem and its location...",
        descriptionHelp: "Enter 5 to 1000 characters.",
        photo: "Photo",
        photoHelp: "A photo of the problem is required. JPG, PNG, or WebP; up to 5 MB before compression.",
        yourName: "Your Name",
        yourNamePlaceholder: "Enter your name",
        contactInformation: "Contact Information",
        contactPlaceholder: "Phone number or email",
        contactHelp: "An authorized barangay official may use this for follow-up.",
        submitReport: "Submit Report",
        submittingReport: "Submitting...",
        reportFormReminder: "Make sure all information is correct and complete before submitting.",
        reportSuccess: "Your report was submitted successfully!",
        reportSubmitError: "Unable to submit your report. Please try again.",
        reportFooter: "Community Reporting and Flood Monitoring System",

        // Flood Watch
        floodWatch: "Flood Watch",
        floodBadge: "Community Flood Monitoring",
        floodDescription: "Report flooding in your area to help keep your community informed.",
        safetyReminder: "Safety Reminder:",
        safetyMessage: "If there is immediate danger, move to a safe place and contact barangay officials or emergency services. Never walk or drive through fast-moving floodwater.",
        chooseFloodLocation: "📍 Choose Flood Location",
        floodLocationDescription: "Find the area and click the map to place a pin.",
        instructions: "Instructions:",
        floodMapInstructions: "Zoom in on your area, then click the exact flood location on the map. You can drag the pin to adjust its position.",
        searchLocation: "Search Location",
        floodSearchPlaceholder: "Enter a barangay or place name",
        mapNavigationHelp: "You can also zoom and drag directly on the map.",
        useMyLocation: "◎ Use My Location",
        selectedCoordinates: "Selected Coordinates",
        latitude: "Latitude",
        longitude: "Longitude",
        floodReportDetails: "Flood Report Details",
        selectPurok: "Select a purok",
        waterLevel: "Water Level",
        selectWaterLevel: "Select water level",
        ankleDeep: "Ankle-deep — up to the ankles",
        kneeDeep: "Knee-deep — up to the knees",
        waistDeep: "Waist-deep — up to the waist",
        additionalDetails: "Additional Details (optional)",
        floodDetailsPlaceholder: "Example: water is rising near the canal.",
        submitFloodReport: "Submit Flood Report",
        submittingFloodReport: "Submitting...",
        floodFormReminder: "Select the correct location and provide the most accurate information you can.",
        noBrowserLocation: "Your browser does not support location services.",
        enterSearch: "Enter a place or barangay to search.",
        selectPinFirst: "Select a flood location on the map before submitting.",
        selectPurokAndLevel: "Please select a valid purok and water level.",
        detailsTooLong: "Details must not exceed 500 characters.",
        floodReportSuccess: "Your flood report was submitted successfully!",
        floodReportError: "Unable to submit the flood report. Please try again.",
        floodPermissionError: "Firestore rules do not allow this report to be saved. Please check the database rules.",
        mapPinPopup: "Selected flood report location."
    },

    fil: {
        home: "Tahanan",
        about: "Tungkol sa Amin",
        howItWorks: "Paano Ito Gumagana",
        dashboard: "Dashboard",
        reportIssue: "Mag-ulat ng Isyu",
        myReports: "Aking mga Ulat",
        logout: "Mag-logout",

        heroBadge: "Ang Iyong Komunidad, Ang Iyong Boses",
        heroTitle: "Sama-sama para sa ligtas at malinis na barangay.",
        heroDescription: "Pinag-uugnay ng BantayBayan ang mga residente at ang kanilang komunidad sa pamamagitan ng madaling ma-access na impormasyon at digital na mga kagamitan para sa mas ligtas na barangay.",
        heroInstruction: "Gumawa ng account o mag-login upang ma-access ang resident dashboard at mga serbisyong available sa BantayBayan.",
        login: "Mag-login",
        createAccount: "Gumawa ng Account",
        communityWatch: "BantayBayan: Bantay Komunidad",
        communityDescription: "Isang digital na plataporma na naglalayong palakasin ang ugnayan ng mga residente at ng kanilang komunidad.",
        community: "Komunidad",
        saferBarangay: "Mas Ligtas na Barangay",
        aboutLabel: "TUNGKOL SA BANTAYBAYAN",
        aboutTitle: "Nagsisimula sa pagtutulungan ang nagkakaisang komunidad.",
        aboutDescription: "Ang BantayBayan ay isang platapormang nakatuon sa komunidad upang mas mapadali ang pag-access ng mga residente sa mahahalagang impormasyon at digital na serbisyo ng barangay.",
        communityMatters: "Mahalaga ang iyong komunidad.",
        cooperationDescription: "Ang pagtutulungan ng mga residente at lokal na opisyal ay makatutulong sa pagbuo ng mas ligtas, malinis, at maalam na komunidad.",
        simpleAccessible: "SIMPLE AT MADALING GAMITIN",
        gettingStarted: "Pagsisimula sa BantayBayan",
        gettingStartedDescription: "Sundin ang mga hakbang na ito upang ma-access ang iyong resident account.",
        stepOneTitle: "1. Gumawa ng Account",
        stepOneDescription: "Magrehistro gamit ang iyong pangalan, email address, at ligtas na password.",
        stepTwoTitle: "2. Mag-login",
        stepTwoDescription: "Mag-sign in gamit ang iyong rehistradong account upang ma-access ang resident dashboard.",
        stepThreeTitle: "3. Buksan ang Dashboard",
        stepThreeDescription: "Tingnan ang mga feature na maaari mong gamitin pagkatapos mag-sign in.",
        welcomeTitle: "Maligayang pagdating sa BantayBayan",
        welcomeDescription: "Makibahagi sa iyong komunidad sa pamamagitan ng paggawa ng account o pag-sign in.",
        getStarted: "Magsimula",
        footerDescription: "Sistema ng Pag-uulat sa Komunidad at Pagsubaybay sa Baha",
        footerMessage: "Sama-sama para sa mas ligtas at malinis na komunidad.",

        residentPortal: "PORTAL NG RESIDENTE",
        welcome: "Maligayang pagdating",
        residentWelcomeMessage: "Magtulungan tayo upang mapanatiling ligtas, malinis, at maayos ang ating komunidad.",
        myAccount: "Aking Account",
        resident: "Residente",
        communityReports: "Mga Ulat ng Komunidad",
        communityReportsDescription: "Iulat ang mga problemang napapansin mo sa inyong barangay.",
        problemInArea: "May problema ba sa inyong lugar?",
        reportInstructions: "Magsumite ng ulat tungkol sa basura, baha, baradong kanal, sirang streetlight, at iba pang problema sa komunidad.",
        myReportsDescription: "Mga ulat na iyong ipinasa.",
        issue: "Isyu",
        purok: "Purok",
        dateSubmitted: "Petsa ng Pagsumite",
        status: "Katayuan",
        dashboardFooter: "© 2026 BantayBayan | Sistema ng Pag-uulat sa Komunidad",
        loadingReports: "Kinukuha ang iyong mga ulat...",
        noReports: "Wala ka pang ulat. Piliin ang Mag-ulat ng Isyu upang magsumite.",
        reportError: "Hindi ma-load ang mga ulat. Pakisuri ang iyong koneksyon at subukan muli.",

        // Report Page
        reportPageTitle: "Mag-ulat ng Problema sa Komunidad",
        communityReporting: "Pag-uulat sa Komunidad",
        reportPageDescription: "Tulungan ang komunidad sa pamamagitan ng pag-uulat ng problema at pagpili ng eksaktong lokasyon nito.",
        typeOfIssue: "Uri ng Isyu",
        selectIssue: "Pumili ng isyu",
        garbageIssue: "Basura",
        floodingIssue: "Pagbaha",
        canalIssue: "Baradong Kanal",
        streetlightIssue: "Sirang Streetlight",
        otherIssue: "Iba Pang Problema",
        locationInformation: "Impormasyon ng Lokasyon",
        locationInstructions: "Piliin kung saan nangyari ang problema, mula sa rehiyon hanggang barangay.",
        region: "Rehiyon",
        province: "Probinsya",
        cityMunicipality: "Lungsod / Munisipalidad",
        barangay: "Barangay",
        exactLocation: "Eksaktong Lokasyon ng Problema",
        pinInstructions: "Piliin ang lokasyon sa mga dropdown, pagkatapos ay i-click ang eksaktong lugar sa mapa para maglagay ng pin. Maaari mong i-drag ang marker upang itama ito.",
        mapSearchPlaceholder: "Maghanap ng lugar o landmark...",
        search: "Maghanap",
        searching: "Naghahanap...",
        useCurrentLocation: "Gamitin ang Kasalukuyan Kong Lokasyon",
        clearPin: "Alisin ang Pin",
        locationRequired: "Pumili muna ng eksaktong lokasyon sa mapa bago magsumite.",
        noLocationSelected: "Wala pang napipiling lokasyon.",
        locationSelected: "Napili na ang lokasyon.",
        locationPermissionDenied: "Hindi pinayagan ang pag-access sa lokasyon. Payagan ito sa browser o pumili ng lokasyon sa mapa.",
        locationUnavailable: "Hindi makuha ang kasalukuyan mong lokasyon. Pumili ng lokasyon sa mapa.",
        locationTimeout: "Nag-time out ang pagkuha ng lokasyon. Subukan muli.",
        placeNotFound: "Walang nahanap na katugmang lugar. Subukan ang ibang paghahanap.",
        searchError: "Hindi mahanap ang lugar. Pakisubukang muli.",
        mapSearchRequired: "Maglagay ng pangalan ng lugar o landmark na hahanapin.",
        loadingRegions: "Kinukuha ang mga rehiyon...",
        selectRegionFirst: "Pumili muna ng rehiyon",
        selectProvinceFirst: "Pumili muna ng probinsya",
        selectCityFirst: "Pumili muna ng lungsod / munisipalidad",
        loadingLocations: "Kinukuha ang mga lokasyon sa Pilipinas...",
        locationsReady: "Na-load na ang mga lokasyon sa Pilipinas.",
        locationsError: "Hindi ma-load ang mga lokasyon sa Pilipinas. I-refresh ang page at subukan muli.",
        loadingProvinces: "Kinukuha ang mga probinsya...",
        loadingCities: "Kinukuha ang mga lungsod / munisipalidad...",
        loadingBarangays: "Kinukuha ang mga barangay...",
        selectRegion: "Pumili ng rehiyon",
        selectProvince: "Pumili ng probinsya",
        selectCity: "Pumili ng lungsod / munisipalidad",
        selectBarangay: "Pumili ng barangay",
        noProvince: "Walang probinsya (NCR)",
        noProvinces: "Walang available na probinsya.",
        noCities: "Walang nahanap na lungsod / munisipalidad.",
        noBarangays: "Walang nahanap na barangay.",
        selectLocationFirst: "Piliin muna ang rehiyon at iba pang detalye ng lokasyon.",
        description: "Paglalarawan",
        descriptionPlaceholder: "Ilarawan ang problema at ang lokasyon nito...",
        descriptionHelp: "Maglagay ng 5 hanggang 1000 character.",
        photo: "Larawan",
        photoHelp: "Kinakailangang mag-upload ng larawan ng problema. JPG, PNG, o WebP; hanggang 5 MB bago i-compress.",
        yourName: "Iyong Pangalan",
        yourNamePlaceholder: "Ilagay ang iyong pangalan",
        contactInformation: "Impormasyon sa Pakikipag-ugnayan",
        contactPlaceholder: "Numero ng telepono o email",
        contactHelp: "Maaaring gamitin ito ng awtorisadong opisyal ng barangay para sa follow-up.",
        submitReport: "Isumite ang Ulat",
        submittingReport: "Isinusumite...",
        reportFormReminder: "Tiyaking tama at kumpleto ang lahat ng impormasyon bago isumite.",
        reportSuccess: "Matagumpay na naisumite ang iyong ulat!",
        reportSubmitError: "Hindi maisumite ang iyong ulat. Pakisubukang muli.",
        reportFooter: "Sistema ng Pag-uulat sa Komunidad at Pagsubaybay sa Baha",

        // Flood Watch
        floodWatch: "Bantay sa Baha",
        floodBadge: "Pagsubaybay sa Baha ng Komunidad",
        floodDescription: "Iulat ang baha sa inyong lugar upang makatulong na maipaalam ito sa komunidad.",
        safetyReminder: "Paalala sa Kaligtasan:",
        safetyMessage: "Kung may agarang panganib, pumunta sa ligtas na lugar at makipag-ugnayan sa mga opisyal ng barangay o emergency services. Huwag maglakad o magmaneho sa rumaragasang baha.",
        chooseFloodLocation: "📍 Piliin ang Lokasyon ng Baha",
        floodLocationDescription: "Hanapin ang lugar at i-click ang mapa upang maglagay ng pin.",
        instructions: "Mga Panuto:",
        floodMapInstructions: "I-zoom ang inyong lugar, pagkatapos ay i-click ang eksaktong lokasyon ng baha sa mapa. Maaari mong i-drag ang pin upang itama ito.",
        searchLocation: "Maghanap ng Lokasyon",
        floodSearchPlaceholder: "Ilagay ang barangay o pangalan ng lugar",
        mapNavigationHelp: "Maaari ring mag-zoom at mag-drag nang direkta sa mapa.",
        useMyLocation: "◎ Gamitin ang Aking Lokasyon",
        selectedCoordinates: "Napiling Coordinates",
        latitude: "Latitude",
        longitude: "Longitude",
        floodReportDetails: "Detalye ng Ulat sa Baha",
        selectPurok: "Pumili ng purok",
        waterLevel: "Taas ng Tubig",
        selectWaterLevel: "Piliin ang taas ng tubig",
        ankleDeep: "Hanggang bukung-bukong",
        kneeDeep: "Hanggang tuhod",
        waistDeep: "Hanggang baywang",
        additionalDetails: "Karagdagang Detalye (opsyonal)",
        floodDetailsPlaceholder: "Halimbawa: tumataas ang tubig malapit sa kanal.",
        submitFloodReport: "Isumite ang Ulat sa Baha",
        submittingFloodReport: "Isinusumite...",
        floodFormReminder: "Piliin ang tamang lokasyon at magbigay ng pinakatumpak na impormasyong kaya mo.",
        noBrowserLocation: "Hindi suportado ng browser ang pagkuha ng lokasyon.",
        enterSearch: "Ilagay ang barangay o pangalan ng lugar na hahanapin.",
        selectPinFirst: "Pumili muna ng lokasyon ng baha sa mapa bago magsumite.",
        selectPurokAndLevel: "Pumili ng wastong purok at taas ng tubig.",
        detailsTooLong: "Hindi dapat lumampas sa 500 character ang detalye.",
        floodReportSuccess: "Matagumpay na naisumite ang iyong ulat sa baha!",
        floodReportError: "Hindi naisumite ang ulat sa baha. Pakisubukang muli.",
        floodPermissionError: "Hindi pinapayagan ng Firestore rules ang pag-save ng ulat. Kailangang suriin ang database rules.",
        mapPinPopup: "Napiling lokasyon ng ulat sa baha."
    }
};

const LANGUAGE_KEY = "bantayBayanLanguage";

let currentLanguage = "en";

function getSavedLanguage() {
    try {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        return translations[saved] ? saved : "en";
    } catch (error) {
        return "en";
    }
}

function installLanguageStyles() {
    if (document.getElementById("bantayBayanLanguageStyles")) return;

    const style = document.createElement("style");
    style.id = "bantayBayanLanguageStyles";

    style.textContent = `
        .language-switch {
            display: inline-flex !important;
            align-items: center;
            gap: 4px;
            padding: 4px;
            border: 1px solid #dee2e6;
            border-radius: 30px;
            background: #e9ecef;
        }

        .language-switch button[data-language] {
            border: none;
            border-radius: 24px;
            padding: 7px 14px;
            background: transparent;
            color: #495057;
            font-weight: 500;
            cursor: pointer;
            transition: background-color .2s ease, color .2s ease;
        }

        .language-switch button[data-language].active {
            background: #ffffff !important;
            color: #0d6efd !important;
            box-shadow: 0 1px 4px rgba(0, 0, 0, .12);
        }

        @media (max-width: 576px) {
            .language-switch button[data-language] {
                padding: 6px 10px;
                font-size: 0.875rem;
            }
        }
    `;

    document.head.appendChild(style);
}

function prepareLanguageButtons() {
    const buttons = document.querySelectorAll("[data-language]");

    buttons.forEach(button => {
        if (!translations[button.dataset.language]) return;

        const container = button.parentElement;

        if (container) {
            container.classList.add("language-switch");
        }

        button.type = "button";
    });
}

function applyLanguage(language) {
    if (!translations[language]) return;

    currentLanguage = language;

    try {
        localStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
        console.warn("Unable to save language preference.", error);
    }

    document.documentElement.lang = language === "fil" ? "fil" : "en";

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;
        const translatedText = translations[language][key];

        if (translatedText !== undefined) {
            element.textContent = translatedText;
        }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
        const key = element.dataset.i18nPlaceholder;
        const translatedText = translations[language][key];

        if (translatedText !== undefined) {
            element.placeholder = translatedText;
        }
    });

    document.querySelectorAll("[data-language]").forEach(button => {
        const isActive = button.dataset.language === language;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    window.dispatchEvent(
        new CustomEvent("bantaybayan:languagechange", {
            detail: { language }
        })
    );
}

function initializeLanguage() {
    installLanguageStyles();
    prepareLanguageButtons();

    document.querySelectorAll("[data-language]").forEach(button => {
        if (button.dataset.languageBound === "true") return;

        button.addEventListener("click", () => {
            applyLanguage(button.dataset.language);
        });

        button.dataset.languageBound = "true";
    });

    applyLanguage(getSavedLanguage());
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLanguage);
} else {
    initializeLanguage();
}

window.BantayBayanLanguage = {
    applyLanguage,
    getCurrentLanguage: () => currentLanguage,
    getTranslation: key => translations[currentLanguage][key] ?? key
};
