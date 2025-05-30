const NASA_API_KEY = 'IRPLTJSVaxe4YiXQY0Qd920NVxCBmWbyvisWffOc'; // Replace with your actual key
const APOD_API_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
const DEFAULT_FALLBACK_COLOR = '#202124'; // Dark gray

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupSearch();
    setupOptionsLink();

});

function setDefaultBackground() {
   document.body.style.backgroundImage = 'none';
  document.body.style.backgroundColor = '#1e1e1e'; // Any default color you prefer
}

function setupOptionsLink() {
    const optionsLink = document.getElementById('options-link');
    if (optionsLink) {
        optionsLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
        });
    }
}


async function loadSettings() {
    chrome.storage.sync.get(['backgroundChoice', 'customBgUrl', 'customBgDataUrl', 'shortcuts', 'fallbackColor'], async (data) => {
        const { backgroundChoice, customBgUrl, customBgDataUrl, shortcuts = [], fallbackColor = DEFAULT_FALLBACK_COLOR } = data;

        // Set background
        if (backgroundChoice === 'apod'  && data.apiKey) {
            try {
                const apodData = await getAPOD();
                if (apodData && apodData.hdurl) {
                    document.body.style.backgroundImage = `url('${apodData.hdurl}')`;
                     // Adjust text color for better contrast if APOD is dark
                    document.body.style.color = '#ffffff'; // Example, might need more sophisticated logic
                    updateLinkColors('#ffffff');
                } else {
                    applyFallbackBackground(customBgUrl, customBgDataUrl, fallbackColor);
                }
            } catch (error) {
                console.error("Error loading APOD:", error);
                applyFallbackBackground(customBgUrl, customBgDataUrl, fallbackColor);
            }
        } else if (backgroundChoice === 'custom') {
            if (customBgDataUrl) { // Prefer uploaded data URL
                document.body.style.backgroundImage = `url('${customBgDataUrl}')`;
            } else if (customBgUrl) {
                document.body.style.backgroundImage = `url('${customBgUrl}')`;
            } else {
                document.body.style.backgroundColor = fallbackColor;
            }
            // Potentially adjust text color based on custom background here too
        } else {
            document.body.style.backgroundColor = fallbackColor; // Default if no choice
        }

        // Load shortcuts
        loadShortcuts(shortcuts);
    });
}

function updateLinkColors(color) {
    const links = document.querySelectorAll('.top-nav a');
    links.forEach(link => link.style.color = color);
    const shortcutNames = document.querySelectorAll('.shortcut-name');
    shortcutNames.forEach(name => name.style.color = color);
     const searchButton = document.querySelector('#search-form button');
    if (searchButton) { // Ensure button text is visible
        // A simple heuristic: if background is dark, make button text lighter
        // This needs to be smarter if the APOD image itself is very light.
        // For simplicity, we assume APOD is generally dark or you have a dark theme.
        searchButton.style.color = '#3c4043'; // Default Google button text
        searchButton.style.backgroundColor = '#f8f9fa'; // Default Google button bg
    }
}


async function getAPOD() {
    // Check local storage first (cached by background script)
    const today = new Date().toISOString().split('T')[0];
    const result = await chrome.storage.local.get(['apodData']);
    if (result.apodData && result.apodData.date === today && result.apodData.url) {
        console.log("Using cached APOD data for today.");
        return { hdurl: result.apodData.url, title: result.apodData.title };
    }

    // If not cached or outdated, fetch from API
    console.log("Fetching new APOD data.");
    try {
        const response = await fetch(APOD_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.media_type === 'image') {
            // Cache it in local storage via background.js or directly if no background script for this
            chrome.storage.local.set({ apodData: { date: data.date, url: data.hdurl || data.url, title: data.title } });
            return { hdurl: data.hdurl || data.url, title: data.title };
        } else {
            console.warn("Today's APOD is not an image:", data);
            return null; // Or fetch previous day's image
        }
    } catch (error) {
        console.error("Failed to fetch APOD:", error);
        return null;
    }
}

function applyFallbackBackground(customBgUrl, customBgDataUrl, fallbackColor) {
    if (customBgDataUrl) {
        document.body.style.backgroundImage = `url('${customBgDataUrl}')`;
    } else if (customBgUrl) {
        document.body.style.backgroundImage = `url('${customBgUrl}')`;
    } else {
        document.body.style.backgroundColor = fallbackColor;
    }
     updateLinkColors(DEFAULT_FALLBACK_COLOR === fallbackColor ? '#5f6368' : '#ffffff'); // Adjust link colors for fallback
}

function loadShortcuts(shortcuts = []) {
    const grid = document.getElementById('shortcuts-grid');
    grid.innerHTML = ''; // Clear existing shortcuts

    // Ensure we have placeholders for up to 30 shortcuts (3 rows x 10 columns)
    const totalSlots = 30;
    for (let i = 0; i < totalSlots; i++) {
        const shortcut = shortcuts[i];
        const shortcutItem = document.createElement('a');
        shortcutItem.classList.add('shortcut-item');

        if (shortcut && shortcut.url) {
            shortcutItem.href = shortcut.url;
            shortcutItem.title = shortcut.name;

            const iconDiv = document.createElement('div');
            iconDiv.classList.add('shortcut-icon');
            const img = document.createElement('img');
            try {
                const domain = new URL(shortcut.url).hostname;
                img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            } catch (e) {
                // Invalid URL, or can't get domain
                img.src = ''; // Or a default icon
                console.warn("Could not get domain for favicon: ", shortcut.url);
            }
            img.alt = ''; // Decorative
            iconDiv.appendChild(img);

            const nameDiv = document.createElement('div');
            nameDiv.classList.add('shortcut-name');
            nameDiv.textContent = shortcut.name;

            shortcutItem.appendChild(iconDiv);
            shortcutItem.appendChild(nameDiv);
        } else {
            // Create an empty slot or a placeholder look
            shortcutItem.classList.add('empty-slot');
            // You can style .empty-slot in CSS if you want visible empty placeholders
        }
        grid.appendChild(shortcutItem);
    }
}

function setupSearch() {
    const searchForm = document.getElementById('search-form');
    const searchBar = document.getElementById('search-bar');

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchBar.value.trim();
        if (query) {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
    });
}