const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

const homeScoreEl = document.getElementById("homeScore");
const awayScoreEl = document.getElementById("awayScore");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");
const difficultyEl = document.getElementById("difficulty");

let W = 1000;
let H = 600;

let playing = true;
let matchTime = 90;
let homeScore = 0;
let awayScore = 0;

let lastTime = performance.now();
let goalPause = 0;
let flash = 0;

const keys = {};

const joystickState = {
  x: 0,
  y: 0,
  active: false
};

const player = {
  x: 220,
  y: 300,
  r: 17,
  speed: 240,
  vx: 0,
  vy: 0,
  angle: 0,
  hasBall: true,
  sprint: false
};

const ball = {
  x: 245,
  y: 300,
  r: 8,
  vx: 0,
  vy: 0,
  owner: "player"
};

const goalkeeper = {
  x: 850,
  y: 300,
  r: 20,
  vx: 0,
  vy: 0
};

const defenders = [
  {
    x: 650,
    y: 190,
    r: 17,
    vx: 0,
    vy: 0
  },
  {
    x: 690,
    y: 410,
    r: 17,
    vx: 0,
    vy: 0
  },
  {
    x: 770,
    y: 300,
    r: 17,
    vx: 0,
    vy: 0
  }
];

function resize() {

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const rect = canvas.getBoundingClientRect();

  W = rect.width;
  H = rect.height;

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);

resize();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x, y) {

  const length = Math.hypot(x, y);

  if (length === 0) {
    return {
      x: 0,
      y: 0
    };
  }

  return {
    x: x / length,
    y: y / length
  };
}

function getField() {

  const margin = Math.min(W, H) * 0.055;

  const x = margin;
  const y = margin * 0.65;

  const width = W - margin * 2;
  const height = H - margin * 1.1;

  return {
    x,
    y,
    width,
    height
  };
}

function drawField() {

  const field = getField();

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#08752f";
  ctx.fillRect(
    field.x,
    field.y,
    field.width,
    field.height
  );

  const stripeWidth = field.width / 10;

  for (let i = 0; i < 10; i++) {

    ctx.fillStyle =
      i % 2 === 0
        ? "#08752f"
        : "#087d33";

    ctx.fillRect(
      field.x + i * stripeWidth,
      field.y,
      stripeWidth,
      field.height
    );
  }

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;

  ctx.strokeRect(
    field.x,
    field.y,
    field.width,
    field.height
  );

  // Halfway line

  ctx.beginPath();

  ctx.moveTo(
    field.x + field.width / 2,
    field.y
  );

  ctx.lineTo(
    field.x + field.width / 2,
    field.y + field.height
  );

  ctx.stroke();

  // Center circle

  ctx.beginPath();

  ctx.arc(
    field.x + field.width / 2,
    field.y + field.height / 2,
    Math.min(field.width, field.height) * 0.13,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  // Center spot

  ctx.beginPath();

  ctx.arc(
    field.x + field.width / 2,
    field.y + field.height / 2,
    4,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#fff";
  ctx.fill();

  // Penalty boxes

  const boxWidth = field.width * 0.16;
  const boxHeight = field.height * 0.42;

  ctx.strokeRect(
    field.x,
    field.y + field.height / 2 - boxHeight / 2,
    boxWidth,
    boxHeight
  );

  ctx.strokeRect(
    field.x + field.width - boxWidth,
    field.y + field.height / 2 - boxHeight / 2,
    boxWidth,
    boxHeight
  );

  // Goal boxes

  const smallWidth = boxWidth * 0.42;

  ctx.strokeRect(
    field.x,
    field.y + field.height / 2 - boxHeight * 0.62,
    smallWidth,
    boxHeight * 1.24
  );

  ctx.strokeRect(
    field.x + field.width - smallWidth,
    field.y + field.height / 2 - boxHeight * 0.62,
    smallWidth,
    boxHeight * 1.24
  );

  // Goals

  ctx.fillStyle = "#ffffff";

  ctx.fillRect(
    field.x - 12,
    field.y + field.height / 2 - 40,
    12,
    80
  );

  ctx.fillRect(
    field.x + field.width,
    field.y + field.height / 2 - 40,
    12,
    80
  );
}

function drawCircle(object, fill, outline = "#fff") {

  ctx.beginPath();

  ctx.arc(
    object.x,
    object.y,
    object.r,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = fill;
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBall() {

  drawCircle(ball, "#ffffff", "#222");

  ctx.beginPath();

  ctx.arc(
    ball.x - 2,
    ball.y - 2,
    2,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#222";
  ctx.fill();
}

function drawPlayers() {

  const allPlayers = [
    ...defenders,
    goalkeeper,
    player
  ];

  // Shadows

  allPlayers.forEach(object => {

    ctx.beginPath();

    ctx.ellipse(
      object.x,
      object.y + object.r * 0.75,
      object.r * 1.15,
      object.r * 0.38,
      0,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#0005";
    ctx.fill();
  });

  // Defenders

  defenders.forEach(defender => {
    drawCircle(defender, "#e43d3d");
  });

  // Goalkeeper

  drawCircle(
    goalkeeper,
    "#ffd23f"
  );

  // Player

  drawCircle(
    player,
    "#2c8cff"
  );

  // Player direction

  ctx.beginPath();

  ctx.moveTo(
    player.x,
    player.y
  );

  ctx.lineTo(
    player.x + Math.cos(player.angle) * 28,
    player.y + Math.sin(player.angle) * 28
  );

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function draw() {

  drawField();
  drawPlayers();
  drawBall();

  if (flash > 0) {

    ctx.fillStyle =
      `rgba(255,255,255,${flash * 0.4})`;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }
}

function getInput() {

  let x = 0;
  let y = 0;

  if (keys.ArrowLeft || keys.a) {
    x -= 1;
  }

  if (keys.ArrowRight || keys.d) {
    x += 1;
  }

  if (keys.ArrowUp || keys.w) {
    y -= 1;
  }

  if (keys.ArrowDown || keys.s) {
    y += 1;
  }

  x += joystickState.x;
  y += joystickState.y;

  if (x === 0 && y === 0) {
    return {
      x: 0,
      y: 0
    };
  }

  return normalize(x, y);
}

function shoot() {

  if (!playing || goalPause > 0) {
    return;
  }

  if (!player.hasBall) {
    return;
  }

  player.hasBall = false;
  ball.owner = null;

  const targetX = W - 30;

  const targetY =
    H / 2 +
    (Math.random() - 0.5) * 100;

  const direction = normalize(
    targetX - ball.x,
    targetY - ball.y
  );

  ball.vx = direction.x * 680;
  ball.vy = direction.y * 680;
}

function pass() {

  if (!playing || !player.hasBall) {
    return;
  }

  player.hasBall = false;
  ball.owner = null;

  const direction = {
    x: Math.cos(player.angle),
    y: Math.sin(player.angle)
  };

  ball.x =
    player.x +
    direction.x * 28;

  ball.y =
    player.y +
    direction.y * 28;

  ball.vx = direction.x * 400;
  ball.vy = direction.y * 400;
}

function resetPositions() {

  player.x = W * 0.22;
  player.y = H / 2;
  player.angle = 0;
  player.hasBall = true;

  ball.x = player.x + 25;
  ball.y = player.y;

  ball.vx = 0;
  ball.vy = 0;

  ball.owner = "player";

  defenders[0].x = W * 0.62;
  defenders[0].y = H * 0.32;

  defenders[1].x = W * 0.67;
  defenders[1].y = H * 0.68;

  defenders[2].x = W * 0.76;
  defenders[2].y = H / 2;

  goalkeeper.x = W * 0.87;
  goalkeeper.y = H / 2;
}

function showGoal(text) {

  messageEl.textContent = text;
  messageEl.style.opacity = "1";

  goalPause = 1.5;
  flash = 1;

  setTimeout(() => {

    messageEl.style.opacity = "0";

    resetPositions();

  }, 900);
}

function scoreGoal(playerScored) {

  if (playerScored) {
    homeScore++;
    showGoal("GOAL! ⚽");
  } else {
    awayScore++;
    showGoal("AI SCORES!");
  }

  homeScoreEl.textContent = homeScore;
  awayScoreEl.textContent = awayScore;
}

function updateBall(dt, field) {

  if (player.hasBall) {

    ball.x =
      player.x +
      Math.cos(player.angle) * 25;

    ball.y =
      player.y +
      Math.sin(player.angle) * 25;

    return;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  ball.vx *= Math.pow(0.035, dt);
  ball.vy *= Math.pow(0.035, dt);

  const goalTop =
    H / 2 - 65;

  const goalBottom =
    H / 2 + 65;

  // Right side: player's goal

  if (ball.x > field.x + field.width) {

    if (
      ball.y > goalTop &&
      ball.y < goalBottom
    ) {

      scoreGoal(true);
      return true;

    } else {

      ball.x =
        field.x + field.width;

      ball.vx *= -0.5;
    }
  }

  // Left side: AI goal

  if (ball.x < field.x) {

    if (
      ball.y > goalTop &&
      ball.y < goalBottom
    ) {

      scoreGoal(false);
      return true;

    } else {

      ball.x = field.x;
      ball.vx *= -0.5;
    }
  }

  if (ball.y < field.y) {

    ball.y = field.y;
    ball.vy *= -0.6;
  }

  if (
    ball.y >
    field.y + field.height
  ) {

    ball.y =
      field.y + field.height;

    ball.vy *= -0.6;
  }

  // Player collects ball

  if (
    distance(player, ball) < 32 &&
    Math.hypot(ball.vx, ball.vy) < 180
  ) {

    player.hasBall = true;
    ball.owner = "player";
  }

  return false;
}

function updateDefenders(dt, field) {

  const difficulty =
    difficultyEl.value;

  let aiSpeed;

  if (difficulty === "easy") {
    aiSpeed = 105;
  } else if (difficulty === "hard") {
    aiSpeed = 190;
  } else {
    aiSpeed = 145;
  }

  defenders.forEach((defender, index) => {

    let target;

    if (index === 2) {
      target = ball;
    } else {
      target = player;
    }

    const direction =
      normalize(
        target.x - defender.x,
        target.y - defender.y
      );

    defender.vx =
      direction.x * aiSpeed;

    defender.vy =
      direction.y * aiSpeed;

    defender.x +=
      defender.vx * dt;

    defender.y +=
      defender.vy * dt;

    defender.x =
      clamp(
        defender.x,
        field.x + 18,
        field.x + field.width - 18
      );

    defender.y =
      clamp(
        defender.y,
        field.y + 18,
        field.y + field.height - 18
      );

    // Defender steals the ball

    if (
      distance(defender, player) <
        defender.r + player.r + 3 &&
      player.hasBall
    ) {

      player.hasBall = false;
      ball.owner = null;

      ball.x = player.x;
      ball.y = player.y;

      // Kick toward player's goal

      const kickDirection =
        normalize(
          field.x - ball.x,
          H / 2 - ball.y
        );

      ball.vx =
        kickDirection.x * 300;

      ball.vy =
        kickDirection.y * 300;
    }
  });
}

function updateGoalkeeper(dt, field) {

  const difficulty =
    difficultyEl.value;

  let speed;

  if (difficulty === "easy") {
    speed = 125;
  } else if (difficulty === "hard") {
    speed = 220;
  } else {
    speed = 165;
  }

  const direction =
    normalize(
      ball.x - goalkeeper.x,
      ball.y - goalkeeper.y
    );

  goalkeeper.y +=
    direction.y * speed * dt;

  goalkeeper.y =
    clamp(
      goalkeeper.y,
      H / 2 - 95,
      H / 2 + 95
    );

  goalkeeper.x =
    field.x +
    field.width -
    45;

  // Save

  if (
    distance(goalkeeper, ball) <
      goalkeeper.r + ball.r + 7 &&
    !player.hasBall
  ) {

    ball.vx =
      -Math.abs(ball.vx) * 0.8 -
      150;

    ball.vy =
      (ball.y - goalkeeper.y) * 4;
  }
}

function update(dt) {

  if (!playing) {
    return;
  }

  if (goalPause > 0) {
    goalPause -= dt;
    return;
  }

  matchTime -= dt;

  if (matchTime <= 0) {

    matchTime = 0;
    playing = false;

    messageEl.textContent =
      `FULL TIME — ${homeScore} : ${awayScore}`;

    messageEl.style.opacity = "1";
  }

  const minutes =
    Math.floor(matchTime / 60);

  const seconds =
    Math.floor(matchTime % 60);

  timerEl.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const field = getField();

  const input = getInput();

  const sprinting =
    keys.Shift || player.sprint;

  const speed =
    player.speed *
    (sprinting ? 1.45 : 1);

  player.vx =
    input.x * speed;

  player.vy =
    input.y * speed;

  player.x +=
    player.vx * dt;

  player.y +=
    player.vy * dt;

  if (input.x !== 0 || input.y !== 0) {

    player.angle =
      Math.atan2(
        input.y,
        input.x
      );
  }

  player.x =
    clamp(
      player.x,
      field.x + 18,
      field.x + field.width - 18
    );

  player.y =
    clamp(
      player.y,
      field.y + 18,
      field.y + field.height - 18
    );

  if (updateBall(dt, field)) {
    return;
  }

  updateDefenders(dt, field);
  updateGoalkeeper(dt, field);

  flash =
    Math.max(
      0,
      flash - dt * 2.5
    );
}

function gameLoop(now) {

  const dt =
    Math.min(
      0.033,
      (now - lastTime) / 1000
    );

  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);


// =========================
// KEYBOARD CONTROLS
// =========================

window.addEventListener(
  "keydown",
  event => {

    keys[event.key] = true;

    if (event.code === "Space") {

      event.preventDefault();

      shoot();
    }

    if (
      event.key.toLowerCase() === "e"
    ) {

      pass();
    }
  }
);

window.addEventListener(
  "keyup",
  event => {

    keys[event.key] = false;
  }
);


// =========================
// BUTTON CONTROLS
// =========================

document
  .getElementById("shootBtn")
  .addEventListener(
    "pointerdown",
    event => {

      event.preventDefault();

      shoot();
    }
  );

document
  .getElementById("passBtn")
  .addEventListener(
    "pointerdown",
    event => {

      event.preventDefault();

      pass();
    }
  );

const sprintButton =
  document.getElementById("sprintBtn");

sprintButton.addEventListener(
  "pointerdown",
  event => {

    event.preventDefault();

    player.sprint = true;
  }
);

[
  "pointerup",
  "pointercancel",
  "pointerleave"
].forEach(eventName => {

  sprintButton.addEventListener(
    eventName,
    () => {

      player.sprint = false;
    }
  );
});


// =========================
// PAUSE
// =========================

document
  .getElementById("pauseBtn")
  .addEventListener(
    "click",
    () => {

      playing = !playing;

      document.getElementById(
        "pauseBtn"
      ).textContent =
        playing
          ? "Pause"
          : "Resume";
    }
  );


// =========================
// RESTART
// =========================

document
  .getElementById("restartBtn")
  .addEventListener(
    "click",
    () => {

      homeScore = 0;
      awayScore = 0;

      matchTime = 90;

      homeScoreEl.textContent = "0";
      awayScoreEl.textContent = "0";

      timerEl.textContent = "01:30";

      messageEl.style.opacity = "0";

      playing = true;

      document.getElementById(
        "pauseBtn"
      ).textContent = "Pause";

      resetPositions();
    }
  );


// =========================
// IPAD JOYSTICK
// =========================

const joystick =
  document.getElementById("joystick");

const stick =
  document.getElementById("stick");

function updateJoystick(event) {

  const rect =
    joystick.getBoundingClientRect();

  let x =
    event.clientX -
    (rect.left + rect.width / 2);

  let y =
    event.clientY -
    (rect.top + rect.height / 2);

  const distanceFromCenter =
    Math.hypot(x, y);

  const maximum =
    Math.min(
      40,
      distanceFromCenter
    );

  if (distanceFromCenter > 0) {

    const direction =
      normalize(x, y);

    joystickState.x =
      direction.x *
      (maximum / 40);

    joystickState.y =
      direction.y *
      (maximum / 40);

  } else {

    joystickState.x = 0;
    joystickState.y = 0;
  }

  stick.style.transform =
    `translate(${joystickState.x * 40}px, ${joystickState.y * 40}px)`;
}

joystick.addEventListener(
  "pointerdown",
  event => {

    joystickState.active = true;

    joystick.setPointerCapture(
      event.pointerId
    );

    updateJoystick(event);
  }
);

joystick.addEventListener(
  "pointermove",
  event => {

    if (joystickState.active) {
      updateJoystick(event);
    }
  }
);

function releaseJoystick() {

  joystickState.active = false;

  joystickState.x = 0;
  joystickState.y = 0;

  stick.style.transform =
    "translate(0, 0)";
}

joystick.addEventListener(
  "pointerup",
  releaseJoystick
);

joystick.addEventListener(
  "pointercancel",
  releaseJoystick
);

joystick.addEventListener(
  "pointerleave",
  () => {

    if (joystickState.active) {
      releaseJoystick();
    }
  }
);


// Start game

resetPositions();
