const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const overlayMessageEl = document.getElementById('overlayMessage');

const state = {
  running: false,
  gameOver: false,
  score: 0,
  lives: 3,
  level: 1,
  paddle: {
    width: 140,
    height: 14,
    x: canvas.width / 2 - 70,
    y: canvas.height - 30,
    speed: 9,
    dx: 0,
  },
  ball: {
    x: canvas.width / 2,
    y: canvas.height - 50,
    radius: 9,
    speed: 5,
    dx: 4,
    dy: -4,
    trail: [],
  },
  bricks: [],
};

const palette = ['#37d0ff', '#9d7dff', '#ff7de9', '#ff9d57', '#8dff7a'];

function createBricks(level) {
  const rows = Math.min(4 + level, 8);
  const cols = 11;
  const padding = 10;
  const topOffset = 70;
  const sideOffset = 18;
  const brickWidth = (canvas.width - sideOffset * 2 - padding * (cols - 1)) / cols;
  const brickHeight = 24;

  const bricks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const hp = row < 2 + Math.floor(level / 2) ? 2 : 1;
      bricks.push({
        x: sideOffset + col * (brickWidth + padding),
        y: topOffset + row * (brickHeight + padding),
        width: brickWidth,
        height: brickHeight,
        hp,
        color: palette[(row + col) % palette.length],
      });
    }
  }
  state.bricks = bricks;
}

function resetBallAndPaddle() {
  state.paddle.x = canvas.width / 2 - state.paddle.width / 2;
  state.ball.x = state.paddle.x + state.paddle.width / 2;
  state.ball.y = state.paddle.y - 12;
  state.ball.dx = (Math.random() > 0.5 ? 1 : -1) * (3.5 + state.level * 0.35);
  state.ball.dy = -Math.abs(3.8 + state.level * 0.35);
  state.ball.trail = [];
}

function showMessage(message) {
  overlayMessageEl.textContent = message;
  overlayMessageEl.classList.remove('hidden');
}

function hideMessage() {
  overlayMessageEl.classList.add('hidden');
}

function startGame() {
  if (state.running) {
    return;
  }

  if (state.gameOver) {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.gameOver = false;
    state.ball.speed = 5;
    createBricks(state.level);
  }

  state.running = true;
  hideMessage();
}

function updateHUD() {
  scoreEl.textContent = String(state.score);
  livesEl.textContent = String(state.lives);
  levelEl.textContent = String(state.level);
}

function movePaddle() {
  state.paddle.x += state.paddle.dx;
  if (state.paddle.x < 0) state.paddle.x = 0;
  if (state.paddle.x + state.paddle.width > canvas.width) {
    state.paddle.x = canvas.width - state.paddle.width;
  }
}

function moveBall() {
  state.ball.x += state.ball.dx;
  state.ball.y += state.ball.dy;

  state.ball.trail.unshift({ x: state.ball.x, y: state.ball.y });
  if (state.ball.trail.length > 7) {
    state.ball.trail.pop();
  }

  if (state.ball.x - state.ball.radius <= 0 || state.ball.x + state.ball.radius >= canvas.width) {
    state.ball.dx *= -1;
  }

  if (state.ball.y - state.ball.radius <= 0) {
    state.ball.dy *= -1;
  }

  if (state.ball.y + state.ball.radius >= canvas.height) {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.running = false;
      state.gameOver = true;
      showMessage('Поражение! Нажми пробел для новой игры');
    }
    resetBallAndPaddle();
  }
}

function paddleCollision() {
  const { paddle, ball } = state;
  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.dy > 0
  ) {
    const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const bounceAngle = hitPos * (Math.PI / 3);
    const speed = Math.hypot(ball.dx, ball.dy);
    ball.dx = speed * Math.sin(bounceAngle);
    ball.dy = -Math.abs(speed * Math.cos(bounceAngle));
    ball.y = paddle.y - ball.radius - 1;
  }
}

function brickCollision() {
  for (let i = state.bricks.length - 1; i >= 0; i -= 1) {
    const brick = state.bricks[i];
    if (
      state.ball.x + state.ball.radius > brick.x &&
      state.ball.x - state.ball.radius < brick.x + brick.width &&
      state.ball.y + state.ball.radius > brick.y &&
      state.ball.y - state.ball.radius < brick.y + brick.height
    ) {
      const overlapLeft = state.ball.x + state.ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (state.ball.x - state.ball.radius);
      const overlapTop = state.ball.y + state.ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (state.ball.y - state.ball.radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        state.ball.dx *= -1;
      } else {
        state.ball.dy *= -1;
      }

      brick.hp -= 1;
      if (brick.hp <= 0) {
        state.bricks.splice(i, 1);
        state.score += 10;
      } else {
        state.score += 5;
      }
      return;
    }
  }
}

function nextLevelCheck() {
  if (state.bricks.length === 0) {
    state.level += 1;
    state.ball.speed += 0.5;
    createBricks(state.level);
    resetBallAndPaddle();
    state.running = false;
    showMessage(`Уровень ${state.level}. Нажми пробел`);
  }
}

function drawBackgroundGrid() {
  ctx.save();
  ctx.strokeStyle = '#ffffff10';
  ctx.lineWidth = 1;
  for (let y = 40; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  for (let x = 40; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBricks() {
  for (const brick of state.bricks) {
    ctx.fillStyle = brick.color;
    ctx.globalAlpha = brick.hp === 2 ? 0.85 : 1;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#ffffff66';
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
  }
}

function drawPaddle() {
  const { paddle } = state;
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  gradient.addColorStop(0, '#d6e8ff');
  gradient.addColorStop(1, '#7da8ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
  for (let i = state.ball.trail.length - 1; i >= 0; i -= 1) {
    const p = state.ball.trail[i];
    const ratio = (i + 1) / state.ball.trail.length;
    ctx.beginPath();
    ctx.arc(p.x, p.y, state.ball.radius * ratio * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.06 + ratio * 0.12})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#9ad8ff';
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundGrid();
  drawBricks();
  drawPaddle();
  drawBall();
}

function update() {
  if (state.running) {
    movePaddle();
    moveBall();
    paddleCollision();
    brickCollision();
    nextLevelCheck();
    updateHUD();
  }
  draw();
  requestAnimationFrame(update);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
    state.paddle.dx = -state.paddle.speed;
  }
  if (event.code === 'ArrowRight' || event.code === 'KeyD') {
    state.paddle.dx = state.paddle.speed;
  }
  if (event.code === 'Space') {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (
    event.code === 'ArrowLeft' ||
    event.code === 'KeyA' ||
    event.code === 'ArrowRight' ||
    event.code === 'KeyD'
  ) {
    state.paddle.dx = 0;
  }
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  state.paddle.x = mouseX - state.paddle.width / 2;
  if (state.paddle.x < 0) state.paddle.x = 0;
  if (state.paddle.x + state.paddle.width > canvas.width) {
    state.paddle.x = canvas.width - state.paddle.width;
  }

  if (!state.running && !state.gameOver) {
    state.ball.x = state.paddle.x + state.paddle.width / 2;
    state.ball.y = state.paddle.y - 12;
  }
});

createBricks(state.level);
resetBallAndPaddle();
updateHUD();
update();
