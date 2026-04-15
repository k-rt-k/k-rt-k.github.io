/**
 * Theme Toggle Functionality
 * Handles light/dark mode switching with persistent storage
 */

const THEME_CONFIG = {
    STORAGE_KEY: 'theme',
    LIGHT: 'light',
    DARK: 'dark',
    DATA_THEME: 'data-theme',
    EVENT: 'themeChanged'
};

function isLight() {
    return document.documentElement.hasAttribute(THEME_CONFIG.DATA_THEME);
}

function setTheme(light) {
    if (light) {
        document.documentElement.setAttribute(THEME_CONFIG.DATA_THEME, THEME_CONFIG.LIGHT);
    } else {
        document.documentElement.removeAttribute(THEME_CONFIG.DATA_THEME);
    }
    localStorage.setItem(THEME_CONFIG.STORAGE_KEY, light ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK);
    document.dispatchEvent(new CustomEvent(THEME_CONFIG.EVENT, {
        detail: { theme: light ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK }
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('darkModeToggle');
    toggle.addEventListener('click', () => setTheme(!isLight()));

    // Smooth transition after initial load
    setTimeout(() => {
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }, 100);
});

// Prevent flash of unstyled content
(function() {
    const saved = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let light = false;
    if (saved === THEME_CONFIG.LIGHT) {
        light = true;
    } else if (saved === THEME_CONFIG.DARK) {
        light = false;
    } else if (!prefersDark) {
        light = true;
    }

    if (light) {
        document.documentElement.setAttribute(THEME_CONFIG.DATA_THEME, THEME_CONFIG.LIGHT);
    }
})();
