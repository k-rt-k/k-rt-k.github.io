/**
 * Conway's Game of Life Implementation
 * High-performance client-side simulation with interactive features
 */

class ConwayGameOfLife {
    constructor() {
        this.canvas = document.getElementById('conway-canvas');
        // Use willReadFrequently hint for better performance with getImageData
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false,  // No transparency needed, saves memory
            desynchronized: true  // Reduces latency
        });
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedControl = document.getElementById('speed-control');
        
        // Game state
        this.isPlaying = true;
        this.cellSize = 8;
        this.grid = null;
        this.nextGrid = null;
        this.rows = 0;
        this.cols = 0;
        
        // Performance optimizations
        this.animationId = null;
        this.lastUpdateTime = 0;
        this.updateInterval = 200; // milliseconds
        this.needsRedraw = true; // Track if redraw is needed
        this.gridChanged = false; // Track if grid actually changed
        
        // Cache theme colors to avoid DOM lookups every frame
        this.currentTheme = 'dark';
        this.bgColor = '#0a0a0a';
        this.cellColor = '#ffffff';
        
        // Mobile support
        this.isMobile = window.innerWidth <= 768;
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
        this.updateThemeColors(); // Initialize theme colors
        this.gameLoop();
        
        // Theme change listener with bound function for cleanup
        this.boundThemeChange = () => {
            this.updateThemeColors();
            this.needsRedraw = true;
        };
        document.addEventListener('themeChanged', this.boundThemeChange);
    }

    setupCanvas() {
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
                    this.canvas.width = window.innerWidth * 1.5;
                    this.canvas.height = window.innerHeight * 1.5;
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
            }, 150); // Debounce by 150ms
        };

        window.addEventListener('resize', this.boundResizeCanvas);
        this.boundResizeCanvas();
    }

    initializeGrid() {
        // More efficient grid initialization using typed arrays for better performance
        // Use regular arrays for simplicity but avoid map/fill combo
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

    setupEventListeners() {
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        
        // Speed control with input validation
        this.speedSlider.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value, 10);
            // Security: Validate input range
            if (!isNaN(speed) && speed >= 1 && speed <= 10) {
                this.updateInterval = 500 - (speed - 1) * 45; // 500ms to 95ms
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
            if (e.code === 'Space') {
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
                this.speedControl.classList.add('visible');
            }, 500);
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
                this.speedControl.classList.remove('visible');
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
        this.addRandomCells(50);
    }

    addRandomCells(count) {
        for (let i = 0; i < count; i++) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            this.grid[row][col] = Math.random() > 0.7;
        }
    }

    handleCanvasClick(e) {
        if (this.isPlaying) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        // Security: Validate coordinates are within bounds
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.grid[row][col] = !this.grid[row][col];
            this.needsRedraw = true;
        }
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        
        // Update button icon
        const icon = this.playPauseBtn.querySelector('.btn-icon');
        if (icon) {
            icon.textContent = this.isPlaying ? '⏸️' : '▶️';
        }
        
        // Update canvas class for styling
        this.canvas.classList.toggle('paused', !this.isPlaying);
        this.canvas.classList.toggle('playing', this.isPlaying);
        
        // Update cursor style
        this.canvas.style.cursor = this.isPlaying ? 'default' : 'crosshair';
        
        this.needsRedraw = true;
    }

    updateThemeColors() {
        // Cache theme colors to avoid repeated DOM queries
        const theme = document.documentElement.hasAttribute('data-theme') ? 'light' : 'dark';
        this.currentTheme = theme;
        
        if (theme === 'light') {
            this.bgColor = '#ffffff';
            this.cellColor = '#212529';
        } else {
            this.bgColor = '#0a0a0a';
            this.cellColor = '#ffffff';
        }
    }

    updateGrid() {
        // Conway's Game of Life rules with optimized neighbor counting
        // Pre-calculate neighbor counts to avoid redundant calculations
        this.gridChanged = false; // Track if any cell changed
        
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
                    newState = count === 2 || count === 3;
                } else {
                    // Dead cell with exactly 3 neighbors becomes alive
                    newState = count === 3;
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
                        j * this.cellSize + 1,
                        i * this.cellSize + 1,
                        this.cellSize - 2,
                        this.cellSize - 2
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