# GoogleShortcuts
Yet another extension to manage shortcuts.

## NASA API Key

This extension fetches the NASA Astronomy Picture of the Day (APOD) to use as a
background. To make requests you must supply your own NASA API key. Edit the
constants at the top of `new_tab.js` and `background.js` and replace the
placeholder `YOUR_NASA_API_KEY` with your actual key. You can obtain a free API
key from <https://api.nasa.gov/>.

```javascript
// new_tab.js
const NASA_API_KEY = 'YOUR_NASA_API_KEY';

// background.js
const NASA_API_KEY_BG = 'YOUR_NASA_API_KEY';
```

Keeping the placeholder value will disable APOD features until a valid key is
provided.
