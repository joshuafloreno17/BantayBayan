
const API_BASE = "https://psgc.cloud/api/v2";

document.addEventListener("DOMContentLoaded", () => {
    const regionSelect = document.getElementById("region");
    const provinceSelect = document.getElementById("province");
    const citySelect = document.getElementById("cityMunicipality");
    const barangaySelect = document.getElementById("barangay");
    const message = document.getElementById("administrativeMessage");

    if (!regionSelect || !provinceSelect || !citySelect || !barangaySelect) {
        console.error("BantayBayan: May nawawalang location dropdown ID.");
        return;
    }

    const NO_PROVINCE = "__NO_PROVINCE__";

    function showMessage(text, isError = false) {
        if (!message) return;
        message.textContent = text;
        message.style.color = isError ? "#dc3545" : "#198754";
    }

    function setOptions(select, placeholder, items = []) {
        select.replaceChildren();

        const first = document.createElement("option");
        first.value = "";
        first.textContent = placeholder;
        select.appendChild(first);

        items.forEach(item => {
            const option = document.createElement("option");
            option.value = item.code;
            option.textContent = item.name;
            select.appendChild(option);
        });

        select.disabled = items.length === 0;
    }



async function fetchList(path) {
    const url = `${API_BASE}${path}`;

    console.log("BantayBayan: Fetching PSGC data:", url);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`PSGC API error: ${response.status} (${url})`);
    }

    const result = await response.json();
    const data = Array.isArray(result) ? result : result.data;

    if (!Array.isArray(data)) {
        console.error("Unexpected PSGC API response:", result);
        throw new Error("Invalid PSGC API response format.");
    }

    return data
        .filter(item => item.code && item.name)
        .map(item => ({
            code: String(item.code),
            name: String(item.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}


    function resetBelow(level) {
        if (level <= 1) {
            setOptions(provinceSelect, "Select province");
        }
        if (level <= 2) {
            setOptions(citySelect, "Select city/municipality");
        }
        if (level <= 3) {
            setOptions(barangaySelect, "Select barangay");
        }
    }

    async function loadRegions() {
        regionSelect.disabled = true;
        resetBelow(1);
        showMessage("Loading regions...");

        try {
            const regions = await fetchList("/regions/");
            setOptions(regionSelect, "Select region", regions);
            regionSelect.disabled = false;
            showMessage("Regions loaded. Piliin ang iyong region.");
        } catch (error) {
            console.error("BantayBayan region loading error:", error);
            setOptions(regionSelect, "Failed to load regions");
            showMessage(
                "Hindi ma-load ang regions. Check internet connection at Console.",
                true
            );
        }
    }

    regionSelect.addEventListener("change", async () => {
        const regionCode = regionSelect.value;
        resetBelow(1);

        if (!regionCode) {
            showMessage("Pumili muna ng region.");
            return;
        }

        regionSelect.disabled = true;
        showMessage("Loading provinces...");

        try {
            let provinces = await fetchList(
                `/regions/${encodeURIComponent(regionCode)}/provinces/`
            );

            if (provinces.length > 0) {
                setOptions(provinceSelect, "Select province", provinces);
                showMessage("Piliin ang province.");
            } else {
                // May mga region, gaya ng NCR, na walang provinces.
                setOptions(provinceSelect, "No province needed", [
                    { code: NO_PROVINCE, name: "Not applicable" }
                ]);
                provinceSelect.value = NO_PROVINCE;
                provinceSelect.disabled = true;

                await loadCitiesForRegion(regionCode);
            }
        } catch (error) {
            console.error("BantayBayan province loading error:", error);
            showMessage("Hindi ma-load ang provinces. Subukang muli.", true);
        } finally {
            regionSelect.disabled = false;
        }
    });

    async function loadCitiesForRegion(regionCode) {
        setOptions(citySelect, "Loading cities/municipalities...");
        setOptions(barangaySelect, "Select barangay");

        try {
            const cities = await fetchList(
                `/regions/${encodeURIComponent(regionCode)}/cities-municipalities/`
            );

            setOptions(citySelect, "Select city/municipality", cities);
            showMessage("Piliin ang city o municipality.");
        } catch (error) {
            console.error("BantayBayan city loading error:", error);
            setOptions(citySelect, "Failed to load cities");
            showMessage("Hindi ma-load ang cities/municipalities.", true);
        }
    }

    provinceSelect.addEventListener("change", async () => {
        const provinceCode = provinceSelect.value;
        resetBelow(2);

        if (!provinceCode || provinceCode === NO_PROVINCE) return;

        provinceSelect.disabled = true;
        showMessage("Loading cities/municipalities...");

        try {
            const cities = await fetchList(
                `/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities/`
            );

            setOptions(citySelect, "Select city/municipality", cities);
            showMessage("Piliin ang city o municipality.");
        } catch (error) {
            console.error("BantayBayan city loading error:", error);
            showMessage("Hindi ma-load ang cities/municipalities.", true);
        } finally {
            provinceSelect.disabled = false;
        }
    });

    citySelect.addEventListener("change", async () => {
        const cityCode = citySelect.value;
        resetBelow(3);

        if (!cityCode) return;

        citySelect.disabled = true;
        showMessage("Loading barangays...");

        try {
            const barangays = await fetchList(
                `/cities-municipalities/${encodeURIComponent(cityCode)}/barangays/`
            );

            setOptions(barangaySelect, "Select barangay", barangays);
            showMessage("Piliin ang barangay.");
        } catch (error) {
            console.error("BantayBayan barangay loading error:", error);
            showMessage("Hindi ma-load ang barangays. Subukang muli.", true);
        } finally {
            citySelect.disabled = false;
        }
    });

    loadRegions();
});
