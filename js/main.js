// main.js
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // Initialize Theme Manager (Illustrator UI colors)
    if (typeof themeManager !== 'undefined') {
        themeManager.init();
    }

    // Initialize logic modules
    Presets.init();
    Colors.init();
    if (typeof FontPicker !== 'undefined') {
        FontPicker.init();
    }
    UI.init();

    // Load user's last used configuration
    Presets.loadLastUsed();
});
