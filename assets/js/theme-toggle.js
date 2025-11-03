/**
 * Theme Toggle Functionality
 * Handles light/dark mode switching with persistent storage
 */

// Theme Configuration Constants
const THEME_CONFIG = {
    // Element IDs
    ELEMENTS: {
        THEME_SWITCH: 'theme-switch'
    },
    
    // Theme Values
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    },
    
    // Storage Keys
    STORAGE: {
        THEME_KEY: 'theme'
    },
    
    // Attributes
    ATTRIBUTES: {
        DATA_THEME: 'data-theme'
    },
    
    // Events
    EVENTS: {
        THEME_CHANGED: 'themeChanged'
    },
    
    // Media Queries
    MEDIA_QUERIES: {
        PREFERS_DARK: '(prefers-color-scheme: dark)'
    },
    
    // Transition Settings
    TRANSITIONS: {
        INITIAL_DELAY: 100, // milliseconds
        DURATION: 0.3, // seconds
        PROPERTIES: 'background-color 0.3s ease, color 0.3s ease'
    }
};

class ThemeManager {
    constructor() {
        this.themeSwitch = document.getElementById(THEME_CONFIG.ELEMENTS.THEME_SWITCH);
        this.prefersDark = window.matchMedia(THEME_CONFIG.MEDIA_QUERIES.PREFERS_DARK);
        
        this.init();
    }

    init() {
        // Set initial theme based on saved preference or system preference
        const savedTheme = localStorage.getItem(THEME_CONFIG.STORAGE.THEME_KEY);
        const initialTheme = savedTheme || (this.prefersDark.matches ? THEME_CONFIG.THEMES.DARK : THEME_CONFIG.THEMES.LIGHT);
        
        this.setTheme(initialTheme);
        this.updateToggle(initialTheme);
        
        // Event listeners
        this.themeSwitch.addEventListener('change', this.handleThemeToggle.bind(this));
        this.prefersDark.addEventListener('change', this.handleSystemThemeChange.bind(this));
        
        // Smooth transition after initial load
        setTimeout(() => {
            document.body.style.transition = THEME_CONFIG.TRANSITIONS.PROPERTIES;
        }, THEME_CONFIG.TRANSITIONS.INITIAL_DELAY);
    }

    handleThemeToggle() {
        const newTheme = this.themeSwitch.checked ? THEME_CONFIG.THEMES.LIGHT : THEME_CONFIG.THEMES.DARK;
        this.setTheme(newTheme);
        this.saveTheme(newTheme);
    }

    handleSystemThemeChange(e) {
        // Only respond to system theme changes if user hasn't set a preference
        if (!localStorage.getItem(THEME_CONFIG.STORAGE.THEME_KEY)) {
            const systemTheme = e.matches ? THEME_CONFIG.THEMES.DARK : THEME_CONFIG.THEMES.LIGHT;
            this.setTheme(systemTheme);
            this.updateToggle(systemTheme);
        }
    }

    setTheme(theme) {
        // Security: Validate theme value
        if (theme !== THEME_CONFIG.THEMES.LIGHT && theme !== THEME_CONFIG.THEMES.DARK) {
            theme = THEME_CONFIG.THEMES.DARK; // Default to dark if invalid
        }
        
        if (theme === THEME_CONFIG.THEMES.LIGHT) {
            document.documentElement.setAttribute(THEME_CONFIG.ATTRIBUTES.DATA_THEME, THEME_CONFIG.THEMES.LIGHT);
        } else {
            document.documentElement.removeAttribute(THEME_CONFIG.ATTRIBUTES.DATA_THEME);
        }
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent(THEME_CONFIG.EVENTS.THEME_CHANGED, { 
            detail: { theme } 
        }));
    }

    updateToggle(theme) {
        // Security: Validate theme value
        if (theme === THEME_CONFIG.THEMES.LIGHT || theme === THEME_CONFIG.THEMES.DARK) {
            this.themeSwitch.checked = theme === THEME_CONFIG.THEMES.LIGHT;
        }
    }

    saveTheme(theme) {
        // Security: Validate before saving to localStorage
        if (theme === THEME_CONFIG.THEMES.LIGHT || theme === THEME_CONFIG.THEMES.DARK) {
            localStorage.setItem(THEME_CONFIG.STORAGE.THEME_KEY, theme);
        }
    }

    getCurrentTheme() {
        return document.documentElement.hasAttribute(THEME_CONFIG.ATTRIBUTES.DATA_THEME) ? THEME_CONFIG.THEMES.LIGHT : THEME_CONFIG.THEMES.DARK;
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});

// Prevent flash of unstyled content
(function() {
    const savedTheme = localStorage.getItem(THEME_CONFIG.STORAGE.THEME_KEY);
    const prefersDark = window.matchMedia(THEME_CONFIG.MEDIA_QUERIES.PREFERS_DARK).matches;
    
    // Security: Validate saved theme
    let theme = THEME_CONFIG.THEMES.DARK;
    if (savedTheme === THEME_CONFIG.THEMES.LIGHT || savedTheme === THEME_CONFIG.THEMES.DARK) {
        theme = savedTheme;
    } else if (!prefersDark) {
        theme = THEME_CONFIG.THEMES.LIGHT;
    }
    
    if (theme === THEME_CONFIG.THEMES.LIGHT) {
        document.documentElement.setAttribute(THEME_CONFIG.ATTRIBUTES.DATA_THEME, THEME_CONFIG.THEMES.LIGHT);
    }
})();