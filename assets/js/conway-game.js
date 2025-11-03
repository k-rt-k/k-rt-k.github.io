/**
 * Conway's Game of Life Implementation
 * High-performance client-side simulation with interactive features
 */

// Configuration Constants
const CONFIG = {
    // DOM Element IDs
    ELEMENTS: {
        CANVAS: 'conway-canvas',
        PLAY_PAUSE_BTN: 'play-pause-btn',
        SPEED_SLIDER: 'speed-slider',
        SPEED_CONTROL: 'speed-control',
        SPEED_LABEL: 'speed-label',
        BTN_ICON: '.btn-icon'
    },
    
    // Game Settings
    GAME: {
        CELL_SIZE: 12,
        INITIAL_UPDATE_INTERVAL: 100, // milliseconds
        INITIAL_RANDOM_CELLS: 64
    },
    
    // Speed Settings (Logarithmic scale)
    SPEED: {
        SLIDER_MIN: 0,
        SLIDER_MAX: 100,
        SLIDER_DEFAULT: 50, // Maps to 1x
        MIN_SPEED: 0.1,     // 0.1x speed
        MAX_SPEED: 10,      // 10x speed
        BASE_INTERVAL: 200  // Base update interval in milliseconds at 1x speed
    },
    
    // Mobile Settings
    MOBILE: {
        BREAKPOINT: 768, // pixels
        CANVAS_SCALE: 1.5,
        LONG_PRESS_DURATION: 500 // milliseconds
    },
    
    // Theme Colors
    THEME_COLORS: {
        DARK: {
            BACKGROUND: '#0a0a0a',
            CELL: '#ffffff'
        },
        LIGHT: {
            BACKGROUND: '#ffffff',
            CELL: '#212529'
        }
    },
    
    // Conway's Game of Life Rules
    RULES: {
        SURVIVAL_MIN: 2,
        SURVIVAL_MAX: 3,
        BIRTH_COUNT: 3
    },
    
    // Canvas Settings
    CANVAS: {
        ALPHA_ENABLED: false,
        DESYNCHRONIZED: true,
        CELL_PADDING: 1,
        CELL_BORDER: 2
    },
    
    // Performance Settings
    PERFORMANCE: {
        RESIZE_DEBOUNCE: 150, // milliseconds
        TRANSITION_DELAY: 100  // milliseconds
    },
    
    // Event Keys
    KEYS: {
        SPACE: 'Space'
    },
    
    // SVG Icons
    ICONS: {
        PAUSE: '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>',
        PLAY: '<path d="M8 5v14l11-7z"/>'
    },
    
    // CSS Classes
    CLASSES: {
        PAUSED: 'paused',
        PLAYING: 'playing',
        VISIBLE: 'visible'
    },
    
    // Cursor Styles
    CURSORS: {
        DEFAULT: 'default',
        CROSSHAIR: 'crosshair'
    },
    
    // Random Cell Probability
    RANDOM_CELL_THRESHOLD: 0.7,
    
    // Data Attributes
    ATTRIBUTES: {
        THEME: 'data-theme'
    }
};

class ConwayGameOfLife {
    constructor() {
        this.canvas = document.getElementById(CONFIG.ELEMENTS.CANVAS);
        
        if (!this.canvas) {
            throw new Error('Canvas element not found!');
        }
        
        this.ctx = this.canvas.getContext('2d', { 
            alpha: CONFIG.CANVAS.ALPHA_ENABLED,
            desynchronized: CONFIG.CANVAS.DESYNCHRONIZED
        });
        
        this.playPauseBtn = document.getElementById(CONFIG.ELEMENTS.PLAY_PAUSE_BTN);
        this.speedSlider = document.getElementById(CONFIG.ELEMENTS.SPEED_SLIDER);
        this.speedControl = document.getElementById(CONFIG.ELEMENTS.SPEED_CONTROL);
        
        // Game state
        this.isPlaying = true;
        this.cellSize = CONFIG.GAME.CELL_SIZE;
        this.grid = null;
        this.nextGrid = null;
        this.rows = 0;
        this.cols = 0;
        
        // Performance optimizations
        this.animationId = null;
        this.lastUpdateTime = 0;
        this.updateInterval = CONFIG.GAME.INITIAL_UPDATE_INTERVAL;
        this.needsRedraw = true; // Track if redraw is needed
        this.gridChanged = false; // Track if grid actually changed
        
        // Cache theme colors to avoid DOM lookups every frame
        this.currentTheme = 'dark';
        this.bgColor = CONFIG.THEME_COLORS.DARK.BACKGROUND;
        this.cellColor = CONFIG.THEME_COLORS.DARK.CELL;
        
        // Mobile support
        this.isMobile = window.innerWidth <= CONFIG.MOBILE.BREAKPOINT;
        this.isLongPress = false;
        this.longPressTimer = null;
        
        // Store bound functions for cleanup
        this.boundResizeCanvas = null;
        this.boundThemeChange = null;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.initializeGrid();
        this.setupEventListeners();
        this.loadInitialPattern();
        this.updateThemeColors();
        
        this.canvas.classList.add(CONFIG.CLASSES.PLAYING);
        this.canvas.style.cursor = CONFIG.CURSORS.DEFAULT;
        this.needsRedraw = true;

        this.gameLoop();
        
        this.boundThemeChange = () => {
            this.updateThemeColors();
            this.needsRedraw = true;
        };
        document.addEventListener('themeChanged', this.boundThemeChange);
    }

    setupCanvas() {
        // Set initial canvas dimensions immediately (before setting up resize handler)
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Set canvas size based on container
        if (this.isMobile) {
            // Larger scrollable area for mobile
            this.canvas.width = window.innerWidth * CONFIG.MOBILE.CANVAS_SCALE;
            this.canvas.height = window.innerHeight * CONFIG.MOBILE.CANVAS_SCALE;
        } else {
            this.canvas.width = containerRect.width;
            this.canvas.height = containerRect.height;
        }
        
        // Calculate grid dimensions
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
        
        // Debounce resize handler for better performance
        let resizeTimeout;
        this.boundResizeCanvas = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const container = this.canvas.parentElement;
                const containerRect = container.getBoundingClientRect();
                
                // Set canvas size based on container
                if (this.isMobile) {
                    // Larger scrollable area for mobile
                    this.canvas.width = window.innerWidth * CONFIG.MOBILE.CANVAS_SCALE;
                    this.canvas.height = window.innerHeight * CONFIG.MOBILE.CANVAS_SCALE;
                } else {
                    this.canvas.width = containerRect.width;
                    this.canvas.height = containerRect.height;
                }
                
                // Calculate grid dimensions
                this.cols = Math.floor(this.canvas.width / this.cellSize);
                this.rows = Math.floor(this.canvas.height / this.cellSize);
                
                // Recreate grids with new dimensions
                if (this.grid) {
                    const oldGrid = this.grid;
                    this.initializeGrid();
                    this.transferGridData(oldGrid);
                }
                
                this.needsRedraw = true;
            }, CONFIG.PERFORMANCE.RESIZE_DEBOUNCE);
        };

        window.addEventListener('resize', this.boundResizeCanvas);
    }

    initializeGrid() {
        this.grid = new Array(this.rows);
        this.nextGrid = new Array(this.rows);
        
        for (let i = 0; i < this.rows; i++) {
            this.grid[i] = new Array(this.cols).fill(false);
            this.nextGrid[i] = new Array(this.cols).fill(false);
        }
    }

    transferGridData(oldGrid) {
        if (!oldGrid) return;
        
        const minRows = Math.min(this.rows, oldGrid.length);
        const minCols = Math.min(this.cols, oldGrid[0]?.length || 0);
        
        for (let i = 0; i < minRows; i++) {
            for (let j = 0; j < minCols; j++) {
                this.grid[i][j] = oldGrid[i][j];
            }
        }
    }

    /**
     * Convert slider value (0-100) to speed multiplier (0.1x to 10x) using logarithmic scale
     * At slider value 50, speed is 1x
     * @param {number} sliderValue - Value from slider (0-100)
     * @returns {number} Speed multiplier (0.1 to 10)
     */
    sliderToSpeed(sliderValue) {
        // Logarithmic mapping:
        // slider 0 -> 0.1x (log10(0.1) = -1)
        // slider 50 -> 1x (log10(1) = 0)
        // slider 100 -> 10x (log10(10) = 1)
        
        // Normalize slider to range [-1, 1]
        const normalized = (sliderValue - CONFIG.SPEED.SLIDER_DEFAULT) / CONFIG.SPEED.SLIDER_DEFAULT;
        
        // Convert to logarithmic scale: 10^normalized gives us the multiplier
        const speedMultiplier = Math.pow(10, normalized);
        
        // Clamp to ensure we stay within bounds
        return Math.max(CONFIG.SPEED.MIN_SPEED, Math.min(CONFIG.SPEED.MAX_SPEED, speedMultiplier));
    }

    setupEventListeners() {
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        
        // Speed control with logarithmic conversion
        this.speedSlider.addEventListener('input', (e) => {
            const sliderValue = parseInt(e.target.value, 10);
            // Security: Validate input range
            if (!isNaN(sliderValue) && sliderValue >= CONFIG.SPEED.SLIDER_MIN && sliderValue <= CONFIG.SPEED.SLIDER_MAX) {
                // Convert slider value (0-100) to logarithmic speed (0.1x to 10x)
                // At 50, speed = 1x
                const speedMultiplier = this.sliderToSpeed(sliderValue);
                
                // Update interval: lower speed multiplier = longer interval (slower)
                this.updateInterval = CONFIG.SPEED.BASE_INTERVAL / speedMultiplier;
                
                // Update speed label with formatted value
                const speedLabel = document.getElementById(CONFIG.ELEMENTS.SPEED_LABEL);
                if (speedLabel) {
                    speedLabel.textContent = `${speedMultiplier.toFixed(1)}x`;
                }
            }
        });

        // Canvas interaction
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        
        // Mobile long press for speed control
        if (this.isMobile) {
            this.setupMobileControls();
        }

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === CONFIG.KEYS.SPACE) {
                e.preventDefault();
                this.togglePlayPause();
            }
        });
    }

    setupMobileControls() {
        // Long press on play/pause button to show speed control
        this.playPauseBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.longPressTimer = setTimeout(() => {
                this.isLongPress = true;
                this.speedControl.classList.add(CONFIG.CLASSES.VISIBLE);
            }, CONFIG.MOBILE.LONG_PRESS_DURATION);
        });

        this.playPauseBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            clearTimeout(this.longPressTimer);
            
            if (!this.isLongPress) {
                this.togglePlayPause();
            }
            this.isLongPress = false;
        });

        // Hide speed control when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!this.speedControl.contains(e.target) && e.target !== this.playPauseBtn) {
                this.speedControl.classList.remove(CONFIG.CLASSES.VISIBLE);
            }
        });
    }

    loadInitialPattern() {
        // Load a famous non-decaying pattern: Glider Gun (Gosper's)
        const gliderGun = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
            [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
            [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ];

        // Place the pattern in the center
        const startRow = Math.floor(this.rows / 2) - Math.floor(gliderGun.length / 2);
        const startCol = Math.floor(this.cols / 2) - Math.floor(gliderGun[0].length / 2);

        for (let i = 0; i < gliderGun.length; i++) {
            for (let j = 0; j < gliderGun[i].length; j++) {
                if (startRow + i >= 0 && startRow + i < this.rows &&
                    startCol + j >= 0 && startCol + j < this.cols) {
                    this.grid[startRow + i][startCol + j] = gliderGun[i][j] === 1;
                }
            }
        }

        // Add some random cells for variety
        this.addRandomCells(CONFIG.GAME.INITIAL_RANDOM_CELLS);
    }

    addRandomCells(count) {
        for (let i = 0; i < count; i++) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            this.grid[row][col] = Math.random() > CONFIG.RANDOM_CELL_THRESHOLD;
        }
    }

    handleCanvasClick(e) {
        if (this.isPlaying) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.grid[row][col] = !this.grid[row][col];
            this.needsRedraw = true;
        }
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        
        const icon = this.playPauseBtn.querySelector(CONFIG.ELEMENTS.BTN_ICON);
        if (icon) {
            icon.innerHTML = this.isPlaying ? CONFIG.ICONS.PAUSE : CONFIG.ICONS.PLAY;
        }
        
        this.canvas.classList.toggle(CONFIG.CLASSES.PAUSED, !this.isPlaying);
        this.canvas.classList.toggle(CONFIG.CLASSES.PLAYING, this.isPlaying);
        this.canvas.style.cursor = this.isPlaying ? CONFIG.CURSORS.DEFAULT : CONFIG.CURSORS.CROSSHAIR;
        
        const gameSection = this.canvas.parentElement;
        if (gameSection) {
            gameSection.classList.toggle('grid-clickable', !this.isPlaying);
        }
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.toggle('grid-clickable', !this.isPlaying);
        }
        
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.classList.toggle('grid-clickable', !this.isPlaying);
        }
        
        const contentContainer = document.querySelector('.content-container');
        if (contentContainer) {
            contentContainer.classList.toggle('grid-clickable', !this.isPlaying);
        }
        
        this.needsRedraw = true;
    }

    updateThemeColors() {
        const theme = document.documentElement.hasAttribute(CONFIG.ATTRIBUTES.THEME) ? 'light' : 'dark';
        this.currentTheme = theme;
        
        if (theme === 'light') {
            this.bgColor = CONFIG.THEME_COLORS.LIGHT.BACKGROUND;
            this.cellColor = CONFIG.THEME_COLORS.LIGHT.CELL;
        } else {
            this.bgColor = CONFIG.THEME_COLORS.DARK.BACKGROUND;
            this.cellColor = CONFIG.THEME_COLORS.DARK.CELL;
        }
    }

    updateGrid() {
        this.gridChanged = false;
        
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                // Inline neighbor counting for better performance
                let count = 0;
                
                // Unrolled loop for neighbor counting (faster than nested loops)
                const rowAbove = (i - 1 + this.rows) % this.rows;
                const rowBelow = (i + 1) % this.rows;
                const colLeft = (j - 1 + this.cols) % this.cols;
                const colRight = (j + 1) % this.cols;
                
                // Count neighbors using pre-calculated indices
                if (this.grid[rowAbove][colLeft]) count++;
                if (this.grid[rowAbove][j]) count++;
                if (this.grid[rowAbove][colRight]) count++;
                if (this.grid[i][colLeft]) count++;
                if (this.grid[i][colRight]) count++;
                if (this.grid[rowBelow][colLeft]) count++;
                if (this.grid[rowBelow][j]) count++;
                if (this.grid[rowBelow][colRight]) count++;
                
                const cell = this.grid[i][j];
                let newState;

                // Apply Conway's rules
                if (cell) {
                    // Live cell with 2 or 3 neighbors survives
                    newState = count === CONFIG.RULES.SURVIVAL_MIN || count === CONFIG.RULES.SURVIVAL_MAX;
                } else {
                    // Dead cell with exactly 3 neighbors becomes alive
                    newState = count === CONFIG.RULES.BIRTH_COUNT;
                }
                
                this.nextGrid[i][j] = newState;
                
                // Track if grid actually changed
                if (newState !== cell) {
                    this.gridChanged = true;
                }
            }
        }

        // Swap grids (much faster than copying)
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
        
        // Only request redraw if grid actually changed
        if (this.gridChanged) {
            this.needsRedraw = true;
        }
    }

    redraw() {
        // Only redraw if actually needed
        if (!this.needsRedraw) return;
        
        // Use cached theme colors instead of querying DOM
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw cells - batch drawing for better performance
        this.ctx.fillStyle = this.cellColor;
        
        // Use single beginPath/fill for minimal object creation
        this.ctx.beginPath();
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.grid[i][j]) {
                    this.ctx.rect(
                        j * this.cellSize + CONFIG.CANVAS.CELL_PADDING,
                        i * this.cellSize + CONFIG.CANVAS.CELL_PADDING,
                        this.cellSize - CONFIG.CANVAS.CELL_BORDER,
                        this.cellSize - CONFIG.CANVAS.CELL_BORDER
                    );
                }
            }
        }
        this.ctx.fill();
        
        this.needsRedraw = false;
    }

    gameLoop(currentTime = 0) {
        // Only update if playing and enough time has passed
        if (this.isPlaying && currentTime - this.lastUpdateTime >= this.updateInterval) {
            this.updateGrid();
            this.lastUpdateTime = currentTime;
        }
        
        // Only redraw if something actually changed
        if (this.needsRedraw) {
            this.redraw();
        }
        
        this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    destroy() {
        // Proper cleanup to prevent memory leaks
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        clearTimeout(this.longPressTimer);
        
        // Remove event listeners
        if (this.boundResizeCanvas) {
            window.removeEventListener('resize', this.boundResizeCanvas);
        }
        if (this.boundThemeChange) {
            document.removeEventListener('themeChanged', this.boundThemeChange);
        }
        
        // Clear grids
        this.grid = null;
        this.nextGrid = null;
    }
}

// Initialize Conway's Game of Life when DOM is loaded
let conwayGame = null;
document.addEventListener('DOMContentLoaded', () => {
    conwayGame = new ConwayGameOfLife();
    // Store globally for visibility change handler
    window.conwayGame = conwayGame;
});

// Handle page visibility changes to optimize performance
document.addEventListener('visibilitychange', () => {
    if (!window.conwayGame) return;
    
    if (document.hidden) {
        // Save playing state and pause when tab is not visible
        window.conwayGame.wasPlaying = window.conwayGame.isPlaying;
        if (window.conwayGame.isPlaying) {
            window.conwayGame.togglePlayPause();
        }
    } else {
        // Resume the game when tab becomes visible again
        if (window.conwayGame.wasPlaying && !window.conwayGame.isPlaying) {
            window.conwayGame.togglePlayPause();
        }
    }
});