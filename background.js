const NASA_API_KEY_BG = 'myapikeyhere'; // Replace with your actual key
const APOD_API_URL_BG = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY_BG}`;

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed/updated.");
    chrome.storage.sync.get(['backgroundChoice', 'apiKey'], (data) => {
        if (data.backgroundChoice === 'apod' && data.apiKey) {
            scheduleAPODFetch();
            fetchAndCacheAPOD(data.apiKey); // ✅ pass user key
        } else {
            console.log("APOD not enabled or API key missing. Skipping APOD fetch.");
        }
    });
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'fetchAPOD') {
        console.log("Alarm triggered: Fetching APOD.");
        fetchAndCacheAPOD();
    }
});

function scheduleAPODFetch() {
    // Clear any existing alarm to avoid duplicates
    chrome.alarms.clear('fetchAPOD', (wasCleared) => {
        // Fetch daily. APOD updates around midnight EST, which is morning UTC.
        // Let's schedule it for early UTC.
        chrome.alarms.create('fetchAPOD', {
            // when: Date.now() + 60000, // For testing: in 1 minute
            periodInMinutes: 1440 // 24 hours
        });
        console.log("APOD fetch alarm scheduled.");
    });
}

async function fetchAndCacheAPOD(apiKey) {
    console.log("Background: Attempting to fetch and cache APOD.");
    const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.media_type === 'image') {
            const apodDataToCache = {
                date: data.date,
                title: data.title,
                url: data.hdurl || data.url,
                explanation: data.explanation
            };
            chrome.storage.local.set({ apodData: apodDataToCache }, () => {
                console.log("APOD data fetched and cached:", apodDataToCache);
            });
        } else {
            chrome.storage.local.remove('apodData', () => {
                console.log("Non-image APOD. Cache cleared.");
            });
        }
    } catch (error) {
        console.error("Background: Failed to fetch or cache APOD:", error);
    }
}
