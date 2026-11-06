(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const leftScoreEl = document.getElementById('left-score');
  const rightScoreEl = document.getElementById('right-score');
  const rallyCountEl = document.getElementById('rally-count');
  const bonusProgressEl = document.getElementById('bonus-progress');
  const statusText = document.getElementById('status-text');
  const statusLight = document.getElementById('status-light');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMessage = document.getElementById('overlay-message');
  const overlayButton = document.getElementById('overlay-button');
  const startButton = document.getElementById('start-button');

  const W = canvas.width;
  const H = canvas.height;
  const PADDLE_W = 12;
  const PADDLE_H = 92;
  const BALL_R = 8;
  const WIN_SCORE = 11;
  const BONUS_HITS = 10;
  const keys = new Set();

  let leftScore = 0;
  let rightScore = 0;
  let rallyHits = 0;
  let running = false;
  let matchOver = false;
  let pointTimer = null;
  let lastTime = 0;
  let leftY = (H - PADDLE_H) / 2;
  let rightY = (H - PADDLE_H) / 2;
  let ball = { x: W / 2, y: H / 2, vx: 5.2, vy: 2.2 };
  let serveToward = 1;

  function updateScoreboard() {
    leftScoreEl.textContent = String(leftScore);
    rightScoreEl.textContent = String(rightScore);
    rallyCountEl.textContent = String(rallyHits);
    bonusProgressEl.style.width = `${Math.min(rallyHits / BONUS_HITS, 1) * 100}%`;
  }

  function setStatus(text, isLive = false) {
    statusText.textContent = text;
    statusLight.classList.toggle('live', isLive);
  }

  function resetBall(direction = serveToward) {
    ball = {
      x: W / 2,
      y: H / 2,
      vx: 5.2 * direction,
      vy: (Math.random() * 3.2) - 1.6
    };
  }

  function showOverlay(title, message, buttonText = 'Start rally') {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlayButton.textContent = buttonText;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function startMatch() {
    if (matchOver) {
      leftScore = 0;
      rightScore = 0;
      rallyHits = 0;
      matchOver = false;
      leftY = rightY = (H - PADDLE_H) / 2;
      serveToward = Math.random() < 0.5 ? -1 : 1;
      updateScoreboard();
    }
    if (running) return;
    if (pointTimer) {
      clearTimeout(pointTimer);
      pointTimer = null;
    }
    rallyHits = 0;
    updateScoreboard();
    resetBall();
    running = true;
    setStatus('IN PLAY', true);
    hideOverlay();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function finishMatch(winner) {
    running = false;
    matchOver = true;
    setStatus('MATCH OVER');
    showOverlay(`${winner} wins!`, `Final score: ${leftScore} – ${rightScore}. Ready for a rematch?`, 'Play again');
  }

  function awardPoint(scoringSide) {
    if (!running) return;
    running = false;
    const points = rallyHits >= BONUS_HITS ? 2 : 1;
    if (scoringSide === 'left') leftScore += points;
    else rightScore += points;
    serveToward = scoringSide === 'left' ? 1 : -1;
    updateScoreboard();

    const winner = leftScore >= WIN_SCORE && leftScore - rightScore >= 2
      ? 'Player 1'
      : rightScore >= WIN_SCORE && rightScore - leftScore >= 2
        ? 'Player 2'
        : null;

    if (winner) {
      finishMatch(winner);
      return;
    }

    setStatus(points === 2 ? 'BONUS POINT' : 'POINT');
    const scorer = scoringSide === 'left' ? 'Player 1' : 'Player 2';
    const awardedMessage = points === 2 ? `${scorer} scores 2 — long rally bonus!` : `${scorer} scores a point.`;
    showOverlay(points === 2 ? 'Bonus point!' : 'Point!', `${awardedMessage} Next serve is coming up.`, 'Continue');
    rallyHits = 0;
    updateScoreboard();
    pointTimer = setTimeout(() => {
      pointTimer = null;
      startMatch();
    }, 1400);
  }

  function movePaddles(dt) {
    const speed = 440 * dt;
    if (keys.has('w')) leftY -= speed;
    if (keys.has('s')) leftY += speed;
    if (keys.has('arrowup')) rightY -= speed;
    if (keys.has('arrowdown')) rightY += speed;
    leftY = Math.max(12, Math.min(H - PADDLE_H - 12, leftY));
    rightY = Math.max(12, Math.min(H - PADDLE_H - 12, rightY));
  }

  function hitPaddle(paddleY, direction) {
    const relativeHit = (ball.y - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2);
    const angle = relativeHit * (Math.PI / 3);
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.045, 10.5);
    ball.vx = Math.cos(angle) * speed * direction;
    ball.vy = Math.sin(angle) * speed;
    rallyHits += 1;
    updateScoreboard();
  }

  function update(dt) {
    movePaddles(dt);
    ball.x += ball.vx * 60 * dt;
    ball.y += ball.vy * 60 * dt;

    if (ball.y - BALL_R <= 0) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + BALL_R >= H) {
      ball.y = H - BALL_R;
      ball.vy = -Math.abs(ball.vy);
    }

    const leftX = 34;
    const rightX = W - 34 - PADDLE_W;
    if (ball.vx < 0 && ball.x - BALL_R <= leftX + PADDLE_W && ball.x > leftX && ball.y + BALL_R >= leftY && ball.y - BALL_R <= leftY + PADDLE_H) {
      ball.x = leftX + PADDLE_W + BALL_R;
      hitPaddle(leftY, 1);
    } else if (ball.vx > 0 && ball.x + BALL_R >= rightX && ball.x < rightX + PADDLE_W && ball.y + BALL_R >= rightY && ball.y - BALL_R <= rightY + PADDLE_H) {
      ball.x = rightX - BALL_R;
      hitPaddle(rightY, -1);
    }

    if (ball.x + BALL_R < 0) awardPoint('right');
    else if (ball.x - BALL_R > W) awardPoint('left');
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c111b';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#222c3b';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    const leftX = 34;
    const rightX = W - 34 - PADDLE_W;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#66e4dc88';
    ctx.fillStyle = '#66e4dc';
    roundedRect(leftX, leftY, PADDLE_W, PADDLE_H, 6);
    ctx.shadowColor = '#ff8a7888';
    ctx.fillStyle = '#ff8a78';
    roundedRect(rightX, rightY, PADDLE_W, PADDLE_H, 6);

    ctx.shadowBlur = 18;
    ctx.shadowColor = '#f2f5fa88';
    ctx.fillStyle = '#f2f5fa';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;
    update(dt);
    draw();
    if (running) requestAnimationFrame(loop);
  }

  function frame() {
    draw();
    requestAnimationFrame(frame);
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', ' '].includes(key)) event.preventDefault();
    keys.add(key);
    if ((key === ' ' || key === 'enter') && !running && !matchOver) startMatch();
    if ((key === ' ' || key === 'enter') && matchOver) startMatch();
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => keys.clear());
  startButton.addEventListener('click', startMatch);
  overlayButton.addEventListener('click', startMatch);

  updateScoreboard();
  setStatus('READY');
  draw();
  requestAnimationFrame(frame);
})();
