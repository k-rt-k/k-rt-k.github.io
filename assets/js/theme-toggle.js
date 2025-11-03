/**
 * Theme Toggle Functionality
 * Handles light/dark mode switching with persistent storage
 */

class ThemeManager {
    constructor() {
        this.themeSwitch = document.getElementById('theme-switch');
        this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        
        this.init();
    }

    init() {
        // Set initial theme based on saved preference or system preference
        const savedTheme = localStorage.getItem('theme');
        const initialTheme = savedTheme || (this.prefersDark.matches ? 'dark' : 'light');
        
        this.setTheme(initialTheme);
        this.updateToggle(initialTheme);
        
        // Event listeners
        this.themeSwitch.addEventListener('change', this.handleThemeToggle.bind(this));
        this.prefersDark.addEventListener('change', this.handleSystemThemeChange.bind(this));
        
        // Smooth transition after initial load
        setTimeout(() => {
            document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        }, 100);
    }

    handleThemeToggle() {
        const newTheme = this.themeSwitch.checked ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.saveTheme(newTheme);
    }

    handleSystemThemeChange(e) {
        // Only respond to system theme changes if user hasn't set a preference
        if (!localStorage.getItem('theme')) {
            const systemTheme = e.matches ? 'dark' : 'light';
            this.setTheme(systemTheme);
            this.updateToggle(systemTheme);
        }
    }

    setTheme(theme) {
        // Security: Validate theme value
        if (theme !== 'light' && theme !== 'dark') {
            theme = 'dark'; // Default to dark if invalid
        }
        
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme } 
        }));
    }

    updateToggle(theme) {
        // Security: Validate theme value
        if (theme === 'light' || theme === 'dark') {
            this.themeSwitch.checked = theme === 'light';
        }
    }

    saveTheme(theme) {
        // Security: Validate before saving to localStorage
        if (theme === 'light' || theme === 'dark') {
            localStorage.setItem('theme', theme);
        }
    }

    getCurrentTheme() {
        return document.documentElement.hasAttribute('data-theme') ? 'light' : 'dark';
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});

// Prevent flash of unstyled content
(function() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Security: Validate saved theme
    let theme = 'dark';
    if (savedTheme === 'light' || savedTheme === 'dark') {
        theme = savedTheme;
    } else if (!prefersDark) {
        theme = 'light';
    }
    
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();