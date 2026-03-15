// ゲーム設定
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// キャンバス設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// ゲーム状態
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameInterval = null;
let isGameOver = false;
let isPaused = false;

// 木材風カラーパレット
const WOOD_COLORS = {
    I: { main: '#CD853F', light: '#DEB887', dark: '#8B4513', grain: '#A0522D' },
    O: { main: '#D2691E', light: '#F4A460', dark: '#8B4513', grain: '#CD853F' },
    T: { main: '#A0522D', light: '#CD853F', dark: '#654321', grain: '#8B4513' },
    S: { main: '#BC8F8F', light: '#D2B48C', dark: '#8B7355', grain: '#A0826D' },
    Z: { main: '#B8860B', light: '#DAA520', dark: '#8B6914', grain: '#CD9B1D' },
    J: { main: '#6B4423', light: '#8B5A2B', dark: '#3E2723', grain: '#5D4037' },
    L: { main: '#C4A67C', light: '#DEB887', dark: '#8B7355', grain: '#A0826D' }
};

// テトリミノの形状
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

const SHAPE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// ボードの初期化
function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = null;
        }
    }
}

// ピースクラス
class Piece {
    constructor(type) {
        this.type = type;
        this.shape = SHAPES[type].map(row => [...row]);
        this.color = WOOD_COLORS[type];
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    rotate() {
        const newShape = [];
        const rows = this.shape.length;
        const cols = this.shape[0].length;

        for (let c = 0; c < cols; c++) {
            newShape[c] = [];
            for (let r = rows - 1; r >= 0; r--) {
                newShape[c][rows - 1 - r] = this.shape[r][c];
            }
        }

        return newShape;
    }
}

// ランダムなピースを生成
function randomPiece() {
    const type = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
    return new Piece(type);
}

// 木目模様を描画
function drawWoodBlock(context, x, y, size, color) {
    const padding = 1;
    const innerX = x + padding;
    const innerY = y + padding;
    const innerSize = size - padding * 2;

    // ベース色
    const gradient = context.createLinearGradient(innerX, innerY, innerX + innerSize, innerY + innerSize);
    gradient.addColorStop(0, color.light);
    gradient.addColorStop(0.3, color.main);
    gradient.addColorStop(0.7, color.main);
    gradient.addColorStop(1, color.dark);

    context.fillStyle = gradient;
    context.fillRect(innerX, innerY, innerSize, innerSize);

    // 木目パターン
    context.strokeStyle = color.grain;
    context.lineWidth = 0.5;
    context.globalAlpha = 0.3;

    for (let i = 0; i < 3; i++) {
        const offset = (innerSize / 4) * (i + 1);
        context.beginPath();
        context.moveTo(innerX, innerY + offset);
        context.bezierCurveTo(
            innerX + innerSize * 0.3, innerY + offset - 3,
            innerX + innerSize * 0.7, innerY + offset + 3,
            innerX + innerSize, innerY + offset
        );
        context.stroke();
    }

    context.globalAlpha = 1;

    // ハイライト（上と左）
    context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(innerX, innerY + innerSize);
    context.lineTo(innerX, innerY);
    context.lineTo(innerX + innerSize, innerY);
    context.stroke();

    // シャドウ（下と右）
    context.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    context.beginPath();
    context.moveTo(innerX + innerSize, innerY);
    context.lineTo(innerX + innerSize, innerY + innerSize);
    context.lineTo(innerX, innerY + innerSize);
    context.stroke();

    // 枠線
    context.strokeStyle = color.dark;
    context.lineWidth = 1;
    context.strokeRect(innerX, innerY, innerSize, innerSize);
}

// ボードを描画
function drawBoard() {
    // 背景
    ctx.fillStyle = '#1A0F0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.2)';
    ctx.lineWidth = 0.5;

    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(canvas.width, r * BLOCK_SIZE);
        ctx.stroke();
    }

    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }

    // 固定されたブロック
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawWoodBlock(ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, board[r][c]);
            }
        }
    }
}

// 現在のピースを描画
function drawPiece() {
    if (!currentPiece) return;

    // ゴーストピース（落下予測位置）
    let ghostY = currentPiece.y;
    while (isValidMove(currentPiece.shape, currentPiece.x, ghostY + 1)) {
        ghostY++;
    }

    ctx.globalAlpha = 0.3;
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                drawWoodBlock(
                    ctx,
                    (currentPiece.x + c) * BLOCK_SIZE,
                    (ghostY + r) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    currentPiece.color
                );
            }
        }
    }
    ctx.globalAlpha = 1;

    // 実際のピース
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                drawWoodBlock(
                    ctx,
                    (currentPiece.x + c) * BLOCK_SIZE,
                    (currentPiece.y + r) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    currentPiece.color
                );
            }
        }
    }
}

// 次のピースを描画
function drawNextPiece() {
    nextCtx.fillStyle = '#1A0F0A';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * BLOCK_SIZE) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * BLOCK_SIZE) / 2;

    for (let r = 0; r < nextPiece.shape.length; r++) {
        for (let c = 0; c < nextPiece.shape[r].length; c++) {
            if (nextPiece.shape[r][c]) {
                drawWoodBlock(
                    nextCtx,
                    offsetX + c * BLOCK_SIZE,
                    offsetY + r * BLOCK_SIZE,
                    BLOCK_SIZE,
                    nextPiece.color
                );
            }
        }
    }
}

// 移動が有効かチェック
function isValidMove(shape, newX, newY) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const x = newX + c;
                const y = newY + r;

                if (x < 0 || x >= COLS || y >= ROWS) {
                    return false;
                }

                if (y >= 0 && board[y][x]) {
                    return false;
                }
            }
        }
    }
    return true;
}

// ピースを固定
function lockPiece() {
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                const y = currentPiece.y + r;
                const x = currentPiece.x + c;

                if (y < 0) {
                    gameOver();
                    return;
                }

                board[y][x] = currentPiece.color;
            }
        }
    }

    clearLines();
    spawnPiece();
}

// ライン消去
function clearLines() {
    let linesCleared = 0;

    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== null)) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(null));
            linesCleared++;
            r++;
        }
    }

    if (linesCleared > 0) {
        // スコア計算
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        lines += linesCleared;

        // レベルアップ
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            updateSpeed();
        }

        updateUI();
    }
}

// 新しいピースを生成
function spawnPiece() {
    currentPiece = nextPiece || randomPiece();
    nextPiece = randomPiece();
    drawNextPiece();

    if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y)) {
        gameOver();
    }
}

// ゲームオーバー
function gameOver() {
    isGameOver = true;
    clearInterval(gameInterval);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('startBtn').textContent = '再プレイ';
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// 落下速度更新
function updateSpeed() {
    clearInterval(gameInterval);
    const speed = Math.max(100, 1000 - (level - 1) * 100);
    gameInterval = setInterval(gameLoop, speed);
}

// ゲームループ
function gameLoop() {
    if (isPaused || isGameOver) return;

    if (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    } else {
        lockPiece();
    }

    draw();
}

// 描画
function draw() {
    drawBoard();
    drawPiece();
}

// 移動
function moveLeft() {
    if (isValidMove(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) {
        currentPiece.x--;
        draw();
    }
}

function moveRight() {
    if (isValidMove(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) {
        currentPiece.x++;
        draw();
    }
}

function moveDown() {
    if (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        draw();
    }
}

function hardDrop() {
    while (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 2;
    }
    lockPiece();
    updateUI();
    draw();
}

function rotatePiece() {
    const rotated = currentPiece.rotate();

    // 壁キック
    const kicks = [0, 1, -1, 2, -2];
    for (const kick of kicks) {
        if (isValidMove(rotated, currentPiece.x + kick, currentPiece.y)) {
            currentPiece.shape = rotated;
            currentPiece.x += kick;
            draw();
            return;
        }
    }
}

function togglePause() {
    if (isGameOver) return;

    isPaused = !isPaused;
    document.getElementById('pauseOverlay').classList.toggle('hidden', !isPaused);
}

// キー入力
document.addEventListener('keydown', (e) => {
    if (isGameOver || !currentPiece) return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!isPaused) moveLeft();
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!isPaused) moveRight();
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!isPaused) moveDown();
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (!isPaused) rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            if (!isPaused) hardDrop();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
});

// ゲーム開始
function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    isGameOver = false;
    isPaused = false;

    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');

    updateUI();
    spawnPiece();
    draw();
    updateSpeed();
}

// 開始ボタン
document.getElementById('startBtn').addEventListener('click', startGame);

// 初期描画
drawBoard();
drawNextPiece();
