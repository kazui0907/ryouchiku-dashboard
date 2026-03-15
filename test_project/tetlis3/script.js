// ゲーム設定
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#000000',  // 0: 空
    '#00f0f0',  // 1: I - シアン
    '#f0f000',  // 2: O - 黄色
    '#a000f0',  // 3: T - 紫
    '#00f000',  // 4: S - 緑
    '#f00000',  // 5: Z - 赤
    '#0000f0',  // 6: J - 青
    '#f0a000'   // 7: L - オレンジ
];

// テトロミノの形状定義
const TETROMINOS = {
    'I': [[1,1,1,1]],
    'O': [[2,2], [2,2]],
    'T': [[0,3,0], [3,3,3]],
    'S': [[0,4,4], [4,4,0]],
    'Z': [[5,5,0], [0,5,5]],
    'J': [[6,0,0], [6,6,6]],
    'L': [[0,0,7], [7,7,7]]
};

const TETROMINO_KEYS = Object.keys(TETROMINOS);

// ゲーム状態
let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let gamePaused = false;
let dropInterval = 1000;
let lastDropTime = 0;
let animationId = null;

// DOM要素
let scoreElement, levelElement, linesElement, finalScoreElement;
let startBtn, restartBtn, gameOverDiv;

// 初期化
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas.getContext('2d');

    scoreElement = document.getElementById('score');
    levelElement = document.getElementById('level');
    linesElement = document.getElementById('lines');
    finalScoreElement = document.getElementById('finalScore');
    startBtn = document.getElementById('startBtn');
    restartBtn = document.getElementById('restartBtn');
    gameOverDiv = document.getElementById('gameOver');

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    document.addEventListener('keydown', handleKeyPress);

    initBoard();
    drawBoard();
}

// ボードの初期化
function initBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// ゲーム開始
function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    gameRunning = true;
    gamePaused = false;
    gameOverDiv.classList.add('hidden');
    updateScore();

    nextPiece = createPiece();
    spawnPiece();
    lastDropTime = Date.now();
    gameLoop();
}

// ゲーム再開
function restartGame() {
    startGame();
}

// 新しいピースを生成
function createPiece() {
    const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
    const shape = TETROMINOS[key].map(row => [...row]);
    return {
        shape: shape,
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0
    };
}

// ピースを出現させる
function spawnPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();

    if (checkCollision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
        gameOver();
    }
}

// ゲームループ
function gameLoop(timestamp = 0) {
    if (!gameRunning) return;

    if (!gamePaused) {
        const currentTime = Date.now();
        if (currentTime - lastDropTime > dropInterval) {
            moveDown();
            lastDropTime = currentTime;
        }

        drawBoard();
        drawPiece();
    }

    animationId = requestAnimationFrame(gameLoop);
}

// ボードを描画
function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }
}

// ブロックを描画
function drawBlock(x, y, colorIndex) {
    ctx.fillStyle = COLORS[colorIndex];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#222';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// 現在のピースを描画
function drawPiece() {
    if (!currentPiece) return;

    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.shape[y][x]);
            }
        }
    }
}

// 次のピースを描画
function drawNextPiece() {
    nextCtx.fillStyle = '#fff';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * 20) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * 20) / 2;

    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x]) {
                nextCtx.fillStyle = COLORS[nextPiece.shape[y][x]];
                nextCtx.fillRect(offsetX + x * 20, offsetY + y * 20, 20, 20);
                nextCtx.strokeStyle = '#222';
                nextCtx.strokeRect(offsetX + x * 20, offsetY + y * 20, 20, 20);
            }
        }
    }
}

// 衝突判定
function checkCollision(newX, newY, shape) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardX = newX + x;
                const boardY = newY + y;

                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return true;
                }

                if (boardY >= 0 && board[boardY][boardX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// ピースを固定
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                if (boardY >= 0) {
                    board[boardY][currentPiece.x + x] = currentPiece.shape[y][x];
                }
            }
        }
    }

    clearLines();
    spawnPiece();
}

// ラインをクリア
function clearLines() {
    let linesCleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;
        score += [0, 100, 300, 500, 800][linesCleared] * level;

        // レベルアップ
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }

        updateScore();
    }
}

// スコア更新
function updateScore() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// 移動処理
function moveLeft() {
    if (!currentPiece || gamePaused) return;
    if (!checkCollision(currentPiece.x - 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x--;
    }
}

function moveRight() {
    if (!currentPiece || gamePaused) return;
    if (!checkCollision(currentPiece.x + 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x++;
    }
}

function moveDown() {
    if (!currentPiece || gamePaused) return;
    if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
        currentPiece.y++;
        score += 1;
        updateScore();
    } else {
        lockPiece();
    }
}

function hardDrop() {
    if (!currentPiece || gamePaused) return;
    while (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
        currentPiece.y++;
        score += 2;
    }
    updateScore();
    lockPiece();
}

// 回転
function rotate() {
    if (!currentPiece || gamePaused) return;

    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );

    if (!checkCollision(currentPiece.x, currentPiece.y, rotated)) {
        currentPiece.shape = rotated;
    } else {
        // 壁蹴り
        for (let offset of [1, -1, 2, -2]) {
            if (!checkCollision(currentPiece.x + offset, currentPiece.y, rotated)) {
                currentPiece.x += offset;
                currentPiece.shape = rotated;
                break;
            }
        }
    }
}

// キー入力処理
function handleKeyPress(e) {
    if (!gameRunning) return;

    switch(e.key) {
        case 'ArrowLeft':
            moveLeft();
            break;
        case 'ArrowRight':
            moveRight();
            break;
        case 'ArrowDown':
            moveDown();
            lastDropTime = Date.now();
            break;
        case 'ArrowUp':
            rotate();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
}

// 一時停止
function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    startBtn.textContent = gamePaused ? '再開' : '一時停止';
}

// ゲームオーバー
function gameOver() {
    gameRunning = false;
    gamePaused = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    finalScoreElement.textContent = score;
    gameOverDiv.classList.remove('hidden');
    startBtn.textContent = 'スタート';
}

// ページ読み込み時に初期化
window.addEventListener('load', init);
