document.addEventListener('DOMContentLoaded', loadOptions);

// Background choice interactivity
const bgChoiceRadios = document.querySelectorAll('input[name="bgChoice"]');
const customBgOptionsDiv = document.getElementById('custom-bg-options');
bgChoiceRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (document.querySelector('input[name="bgChoice"]:checked').value === 'custom') {
            customBgOptionsDiv.style.display = 'block';
        } else {
            customBgOptionsDiv.style.display = 'none';
        }
    });
});

// File input preview
const customBgFileInput = document.getElementById('customBgFile');
const customBgPreview = document.getElementById('customBgPreview');
let customBgDataUrl = null; // To store the base64 data of the uploaded file

customBgFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            customBgPreview.src = e.target.result;
            customBgPreview.style.display = 'block';
            customBgDataUrl = e.target.result; // Store for saving
        }
        reader.readAsDataURL(file);
    } else {
        customBgPreview.style.display = 'none';
        customBgPreview.src = "#";
        customBgDataUrl = null;
    }
});


document.getElementById('saveSettings').addEventListener('click', saveOptions);
document.getElementById('addShortcut').addEventListener('click', addShortcutToList);

let shortcuts = []; // Local array to manage shortcuts before saving

function loadOptions() {
    chrome.storage.sync.get(['backgroundChoice', 'customBgUrl', 'fallbackColor', 'shortcuts'], (data) => {
        if (data.backgroundChoice) {
            document.querySelector(`input[name="bgChoice"][value="${data.backgroundChoice}"]`).checked = true;
            if (data.backgroundChoice === 'custom') {
                customBgOptionsDiv.style.display = 'block';
            }
        } else {
            document.querySelector('input[name="bgChoice"][value="apod"]').checked = true; // Default to APOD
        }
        document.getElementById('customBgUrl').value = data.customBgUrl || '';
        document.getElementById('fallbackColor').value = data.fallbackColor || '#202124';
        // Note: We don't load customBgDataUrl into the file input, as it's not possible for security reasons.
        // We only care if it was previously saved. If user wants to change it, they re-upload.
        // We also don't show a preview of a previously uploaded image unless they upload a new one.
        // For simplicity, if `data.customBgDataUrl` exists, we know it's stored.

        shortcuts = data.shortcuts || [];
        renderShortcuts();
    });
}

function saveOptions() {
    const backgroundChoice = document.querySelector('input[name="bgChoice"]:checked').value;
    const customBgUrlValue = document.getElementById('customBgUrl').value;
    const fallbackColor = document.getElementById('fallbackColor').value;

    let settingsToSave = {
        backgroundChoice: backgroundChoice,
        customBgUrl: customBgUrlValue,
        fallbackColor: fallbackColor,
        shortcuts: shortcuts
    };

    // Only save customBgDataUrl if a new file was uploaded in this session
    // or if the user chose 'custom' and didn't clear the previously uploaded image (which isn't explicitly handled here beyond saving)
    if (backgroundChoice === 'custom' && customBgDataUrl) {
        settingsToSave.customBgDataUrl = customBgDataUrl;
    } else if (backgroundChoice === 'custom' && !customBgDataUrl && !customBgUrlValue) {
        // If custom is chosen, but no new file uploaded and no URL, we might want to clear any existing customBgDataUrl
        // For simplicity, if user chose 'custom' and provided a URL, any previous dataURL is implicitly overridden
        // If they chose 'custom' and uploaded a file, that overrides any URL.
        // If they chose 'custom' and did neither, it will fall back.
        // A more robust logic would be to explicitly clear customBgDataUrl if they switch to URL or APOD
        chrome.storage.sync.get(['customBgDataUrl'], (result) => {
            if (result.customBgDataUrl && !customBgUrlValue) { // if old dataUrl exists and no new URL, keep old dataUrl unless new file
                // This part is tricky. If they switch to custom, upload nothing, but had a dataURL, should it persist?
                // Let's assume if they select "custom" and don't provide new info, it uses existing.
                // If they upload a NEW file, customBgDataUrl gets updated.
                // If they provide a URL, customBgDataUrl should ideally be cleared from storage to prioritize the URL.
                // For simplicity, we'll just save what's new. If customBgDataUrl is set, it means a file was processed in this session.
                // To clear it if they switch to URL:
                if (customBgUrlValue) {
                    settingsToSave.customBgDataUrl = null; // Clear if URL is now primary
                }
            }
        });

    }


    chrome.storage.sync.set(settingsToSave, () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => { status.textContent = ''; }, 2000);
    });
}

function renderShortcuts() {
    const listDiv = document.getElementById('shortcuts-list');
    listDiv.innerHTML = ''; // Clear current list

    shortcuts.forEach((shortcut, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('shortcut-entry');

        const textSpan = document.createElement('span');
        textSpan.textContent = `${shortcut.name} (${shortcut.url})`;
        entryDiv.appendChild(textSpan);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteShortcut(index));
        entryDiv.appendChild(deleteButton);

        listDiv.appendChild(entryDiv);
    });
}

function addShortcutToList() {
    if (shortcuts.length >= 30) {
        alert("You can add a maximum of 30 shortcuts.");
        return;
    }
    const name = document.getElementById('shortcutName').value.trim();
    const url = document.getElementById('shortcutUrl').value.trim();

    if (name && url) {
        try {
            new URL(url); // Validate URL
            shortcuts.push({ name, url });
            renderShortcuts();
            document.getElementById('shortcutName').value = '';
            document.getElementById('shortcutUrl').value = '';
        } catch (e) {
            alert("Please enter a valid URL (e.g., https://example.com)");
        }
    } else {
        alert("Please enter both a name and a URL for the shortcut.");
    }
}

function deleteShortcut(index) {
    shortcuts.splice(index, 1);
    renderShortcuts();
}