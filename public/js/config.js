/* ===================================
   BantayBayan - Barangay Configuration
   =================================== */

// Sample barangay map location.
// Palitan ang coordinates kapag alam na
// ang eksaktong lokasyon ng inyong barangay.

const BARANGAY_CONFIG = {
    name: "Sample Barangay",

    // Sample coordinates for San Pablo City, Laguna.
    // These are for development only.
    center: {
        lat: 14.0683,
        lng: 121.3256
    },

    // Initial zoom level of the community map.
    zoom: 14,

    // Sample list of puroks.
    puroks: [
        "Purok 1",
        "Purok 2",
        "Purok 3",
        "Purok 4",
        "Purok 5",
        "Purok 6",
        "Purok 7"
    ],

    // Supported community issue types.
    issueTypes: [
        {
            value: "garbage",
            label: "Garbage / Basura"
        },
        {
            value: "flooding",
            label: "Flooding / Baha"
        },
        {
            value: "canal",
            label: "Blocked Canal / Baradong Kanal"
        },
        {
            value: "streetlight",
            label: "Broken Streetlight / Sirang Ilaw"
        },
        {
            value: "others",
            label: "Other Problems / Iba Pa"
        }
    ],

    // Allowed flood severity levels.
    floodLevels: [
        {
            value: "ankle",
            label: "Ankle-deep"
        },
        {
            value: "knee",
            label: "Knee-deep"
        },
        {
            value: "waist",
            label: "Waist-deep"
        }
    ]
};