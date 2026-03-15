// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 20;
const HOLD_BLOCK_SIZE = 20;

// Colors for tetrominos
const COLORS = {
    I: '#00d4ff',
    O: '#ffeb3b',
    T: '#9c27b0',
    S: '#4caf50',
    Z: '#f44336',
    J: '#2196f3',
    L: '#ff9800'
};

// Tetromino shapes
const SHAPES = {
    I: [
        [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
        [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
        [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
        [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
    ],
    O: [
        [[1,1], [1,1]],
        [[1,1], [1,1]],
        [[1,1], [1,1]],
        [[1,1], [1,1]]
    ],
    T: [
        [[0,1,0], [1,1,1], [0,0,0]],
        [[0,1,0], [0,1,1], [0,1,0]],
        [[0,0,0], [1,1,1], [0,1,0]],
        [[0,1,0], [1,1,0], [0,1,0]]
    ],
    S: [
        [[0,1,1], [1,1,0], [0,0,0]],
        [[0,1,0], [0,1,1], [0,0,1]],
        [[0,0,0], [0,1,1], [1,1,0]],
        [[1,0,0], [1,1,0], [0,1,0]]
    ],
    Z: [
        [[1,1,0], [0,1,1], [0,0,0]],
        [[0,0,1], [0,1,1], [0,1,0]],
        [[0,0,0], [1,1,0], [0,1,1]],
        [[0,1,0], [1,1,0], [1,0,0]]
    ],
    J: [
        [[1,0,0], [1,1,1], [0,0,0]],
        [[0,1,1], [0,1,0], [0,1,0]],
        [[0,0,0], [1,1,1], [0,0,1]],
        [[0,1,0], [0,1,0], [1,1,0]]
    ],
    L: [
        [[0,0,1], [1,1,1], [0,0,0]],
        [[0,1,0], [0,1,0], [0,1,1]],
        [[0,0,0], [1,1,1], [1,0,0]],
        [[1,1,0], [0,1,0], [0,1,0]]
    ]
};

// Game state
let board = [];
let currentPiece = null;
let nextPieces = [];
let holdPiece = null;
let canHold = true;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let dropInterval = 1000;
let lastDropTime = 0;

// Initialize board
function initBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board.push(new Array(COLS).fill(null));
    }
}

// Get random tetromino
function getRandomPiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        type: type,
        rotation: 0,
        x: Math.floor((COLS - SHAPES[type][0][0].length) / 2),
        y: 0
    };
}

// Fill next pieces queue
function fillNextPieces() {
    while (nextPieces.length < 3) {
        nextPieces.push(getRandomPiece());
    }
}

// Get current shape matrix
function getShape(piece) {
    return SHAPES[piece.type][piece.rotation];
}

// Check collision
function checkCollision(piece, offsetX = 0, offsetY = 0, rotation = piece.rotation) {
    const shape = SHAPES[piece.type][rotation];
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = piece.x + col + offsetX;
                const newY = piece.y + row + offsetY;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Lock piece to board
function lockPiece() {
    const shape = getShape(currentPiece);
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const boardY = currentPiece.y + row;
                const boardX = currentPiece.x + col;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.type;
                }
            }
        }
    }

    // Check for completed lines
    clearLines();

    // Spawn new piece
    spawnPiece();
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== null)) {
            board.splice(row, 1);
            board.unshift(new Array(COLS).fill(null));
            linesCleared++;
            row++; // Check same row again
        }
    }

    if (linesCleared > 0) {
        // Update score
        const lineScores = [0, 100, 300, 500, 800];
        score += lineScores[linesCleared] * level;
        lines += linesCleared;

        // Update level
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);

        updateDisplay();
    }
}

// Spawn new piece
function spawnPiece() {
    currentPiece = nextPieces.shift();
    fillNextPieces();
    canHold = true;

    // Check game over
    if (checkCollision(currentPiece)) {
        endGame();
    }

    drawNext();
}

// Hold piece
function hold() {
    if (!canHold) return;

    canHold = false;

    if (holdPiece === null) {
        holdPiece = {
            type: currentPiece.type,
            rotation: 0,
            x: 0,
            y: 0
        };
        spawnPiece();
    } else {
        const temp = holdPiece;
        holdPiece = {
            type: currentPiece.type,
            rotation: 0,
            x: 0,
            y: 0
        };
        currentPiece = {
            type: temp.type,
            rotation: 0,
            x: Math.floor((COLS - SHAPES[temp.type][0][0].length) / 2),
            y: 0
        };
    }

    drawHold();
}

// Move piece
function movePiece(dx, dy) {
    if (!checkCollision(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// Rotate piece
function rotatePiece() {
    const newRotation = (currentPiece.rotation + 1) % 4;

    // Try normal rotation
    if (!checkCollision(currentPiece, 0, 0, newRotation)) {
        currentPiece.rotation = newRotation;
        return;
    }

    // Wall kick - try moving left/right
    const kicks = [-1, 1, -2, 2];
    for (let kick of kicks) {
        if (!checkCollision(currentPiece, kick, 0, newRotation)) {
            currentPiece.x += kick;
            currentPiece.rotation = newRotation;
            return;
        }
    }
}

// Hard drop
function hardDrop() {
    while (movePiece(0, 1)) {
        score += 2;
    }
    lockPiece();
}

// Soft drop
function softDrop() {
    if (movePiece(0, 1)) {
        score += 1;
        updateDisplay();
    }
}

// Get ghost piece Y position
function getGhostY() {
    let ghostY = currentPiece.y;
    while (!checkCollision(currentPiece, 0, ghostY - currentPiece.y + 1)) {
        ghostY++;
    }
    return ghostY;
}

// Draw functions
function drawBlock(ctx, x, y, color, size, ghost = false) {
    if (ghost) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
    } else {
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
    }

    ctx.fillRect(x * size, y * size, size - 1, size - 1);
    ctx.strokeRect(x * size + 1, y * size + 1, size - 3, size - 3);

    if (!ghost) {
        // Add shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x * size + 2, y * size + 2, size - 6, 4);
    }
}

function drawBoard() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // Draw locked pieces
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(ctx, col, row, COLORS[board[row][col]], BLOCK_SIZE);
            }
        }
    }
}

function drawPiece() {
    if (!currentPiece) return;

    const shape = getShape(currentPiece);
    const color = COLORS[currentPiece.type];

    // Draw ghost piece
    const ghostY = getGhostY();
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                drawBlock(ctx, currentPiece.x + col, ghostY + row, color, BLOCK_SIZE, true);
            }
        }
    }

    // Draw current piece
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                drawBlock(ctx, currentPiece.x + col, currentPiece.y + row, color, BLOCK_SIZE);
            }
        }
    }
}

function drawNext() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    let yOffset = 10;
    for (let i = 0; i < nextPieces.length; i++) {
        const piece = nextPieces[i];
        const shape = SHAPES[piece.type][0];
        const color = COLORS[piece.type];

        const offsetX = (nextCanvas.width - shape[0].length * NEXT_BLOCK_SIZE) / 2;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    nextCtx.fillStyle = color;
                    nextCtx.fillRect(
                        offsetX + col * NEXT_BLOCK_SIZE,
                        yOffset + row * NEXT_BLOCK_SIZE,
                        NEXT_BLOCK_SIZE - 2,
                        NEXT_BLOCK_SIZE - 2
                    );
                }
            }
        }
        yOffset += 80;
    }
}

function drawHold() {
    holdCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (!holdPiece) return;

    const shape = SHAPES[holdPiece.type][0];
    const color = canHold ? COLORS[holdPiece.type] : 'rgba(128, 128, 128, 0.5)';

    const offsetX = (holdCanvas.width - shape[0].length * HOLD_BLOCK_SIZE) / 2;
    const offsetY = (holdCanvas.height - shape.length * HOLD_BLOCK_SIZE) / 2;

    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                holdCtx.fillStyle = color;
                holdCtx.fillRect(
                    offsetX + col * HOLD_BLOCK_SIZE,
                    offsetY + row * HOLD_BLOCK_SIZE,
                    HOLD_BLOCK_SIZE - 2,
                    HOLD_BLOCK_SIZE - 2
                );
            }
        }
    }
}

function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

function endGame() {
    gameOver = true;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

function resetGame() {
    initBoard();
    nextPieces = [];
    holdPiece = null;
    canHold = true;
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    dropInterval = 1000;
    lastDropTime = 0;

    fillNextPieces();
    spawnPiece();
    updateDisplay();
    drawHold();

    document.getElementById('gameOver').classList.add('hidden');
}

// Game loop
function gameLoop(timestamp) {
    if (!gameOver && !paused) {
        if (timestamp - lastDropTime > dropInterval) {
            if (!movePiece(0, 1)) {
                lockPiece();
            }
            lastDropTime = timestamp;
        }

        drawBoard();
        drawPiece();
    }

    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (gameOver) return;

    switch (e.code) {
        case 'ArrowLeft':
            if (!paused) movePiece(-1, 0);
            break;
        case 'ArrowRight':
            if (!paused) movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (!paused) softDrop();
            break;
        case 'ArrowUp':
            if (!paused) rotatePiece();
            break;
        case 'Space':
            if (!paused) hardDrop();
            break;
        case 'KeyC':
            if (!paused) hold();
            break;
        case 'KeyP':
            paused = !paused;
            break;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.getElementById('restartBtn').addEventListener('click', resetGame);

// Start game
resetGame();
requestAnimationFrame(gameLoop);
