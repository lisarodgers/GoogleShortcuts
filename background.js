const NASA_API_KEY_BG = 'myapikeyhere'; // Replace with your actual key
const APOD_API_URL_BG = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY_BG}`;

chrome.runtime.onInstalled.addListener(() => {
    console.log("Custom New Tab extension installed/updated.");
    scheduleAPODFetch();
    fetchAndCacheAPOD(); // Fetch immediately on install/update
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

async function fetchAndCacheAPOD() {
    console.log("Background: Attempting to fetch and cache APOD.");
    try {
        const response = await fetch(APOD_API_URL_BG);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.media_type === 'image') {
            const apodDataToCache = {
                date: data.date,
                title: data.title,
                url: data.hdurl || data.url, // Prefer HD URL
                explanation: data.explanation
            };
            chrome.storage.local.set({ apodData: apodDataToCache }, () => {
                console.log("APOD data fetched and cached successfully:", apodDataToCache);
            });
        } else {
            console.warn("Today's APOD is not an image, not caching:", data);
            // Optionally, you could try fetching the previous day's image as a fallback here
            // or clear the cache so the new_tab page knows to use its own fallback.
            chrome.storage.local.remove('apodData', () => {
                console.log("Cleared APOD cache as today's content is not an image.");
            });
        }
    } catch (error) {
        console.error("Background: Failed to fetch or cache APOD:", error);
    }
}