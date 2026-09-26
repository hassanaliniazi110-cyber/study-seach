const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const livesElement = document.getElementById("lives");
const messageElement = document.getElementById("message");
const difficultyElement = document.getElementById("difficulty");
const restartButton = document.getElementById("restart");

let width = 1000;
let height = 600;

let score = 0;
let level = 1;
let lives = 3;

let shooting = false;
let resultTimer = 0;

let goalkeeper = {
  x: 0,
  y: 0,
  targetX: 0,
  speed: 300,
  diving: false,
  diveX: 0
};

let ball = {
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
  progress: 0
};

function resize() {

  const rect = canvas.getBoundingClientRect();

  width = rect.width;
  height = rect.height;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  resetPositions();
}

window.addEventListener("resize", resize);


// -----------------------------
// FIELD
// -----------------------------

function drawField() {

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  // Grass

  ctx.fillStyle = "#16823c";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  // Grass stripes

  for (let i = 0; i < 10; i++) {

    ctx.fillStyle =
      i % 2 === 0
        ? "#16823c"
        : "#198a41";

    ctx.fillRect(
      0,
      i * height / 10,
      width,
      height / 10
    );
  }

  // Penalty area

  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;

  ctx.strokeRect(
    width * 0.12,
    height * 0.05,
    width * 0.76,
    height * 0.65
  );

  // Penalty spot

  ctx.beginPath();

  ctx.arc(
    width / 2,
    height * 0.70,
    5,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "white";
  ctx.fill();

  // Goal

  const goalX = width * 0.20;
  const goalY = height * 0.12;
  const goalWidth = width * 0.60;
  const goalHeight = height * 0.32;

  ctx.strokeStyle = "white";
  ctx.lineWidth = 8;

  ctx.strokeRect(
    goalX,
    goalY,
    goalWidth,
    goalHeight
  );

  // Goal net

  ctx.strokeStyle = "#ffffff55";
  ctx.lineWidth = 1;

  for (
    let x = goalX;
    x <= goalX + goalWidth;
    x += 25
  ) {

    ctx.beginPath();

    ctx.moveTo(x, goalY);
    ctx.lineTo(x, goalY + goalHeight);

    ctx.stroke();
  }

  for (
    let y = goalY;
    y <= goalY + goalHeight;
    y += 20
  ) {

    ctx.beginPath();

    ctx.moveTo(goalX, y);
    ctx.lineTo(goalX + goalWidth, y);

    ctx.stroke();
  }
}


// -----------------------------
// GOALKEEPER
// -----------------------------

function drawGoalkeeper() {

  ctx.save();

  ctx.translate(
    goalkeeper.x,
    goalkeeper.y
  );

  // Body

  ctx.fillStyle = "#ffd21c";

  ctx.fillRect(
    -24,
    -32,
    48,
    55
  );

  // Head

  ctx.beginPath();

  ctx.arc(
    0,
    -48,
    17,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#f1b58c";
  ctx.fill();

  // Arms

  ctx.strokeStyle = "#ffd21c";
  ctx.lineWidth = 13;

  ctx.beginPath();

  ctx.moveTo(-20, -20);
  ctx.lineTo(-40, 5);

  ctx.moveTo(20, -20);
  ctx.lineTo(40, 5);

  ctx.stroke();

  // Gloves

  ctx.fillStyle = "white";

  ctx.beginPath();
  ctx.arc(-40, 5, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(40, 5, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}


// -----------------------------
// BALL
// -----------------------------

function drawBall() {

  ctx.beginPath();

  ctx.arc(
    ball.x,
    ball.y,
    11,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "white";
  ctx.fill();

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Small black patch

  ctx.beginPath();

  ctx.arc(
    ball.x - 3,
    ball.y - 3,
    3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#222";
  ctx.fill();
}


// -----------------------------
// SHOOT
// -----------------------------

function shoot(zone) {

  if (shooting) {
    return;
  }

  shooting = true;

  messageElement.textContent = "SHOOT! ⚽";

  const goalLeft = width * 0.20;
  const goalRight = width * 0.80;
  const goalTop = height * 0.12;
  const goalBottom = height * 0.44;

  let targetX;

  if (zone === "left") {
    targetX =
      goalLeft +
      (goalRight - goalLeft) * 0.18;
  }

  if (zone === "center") {
    targetX =
      (goalLeft + goalRight) / 2;
  }

  if (zone === "right") {
    targetX =
      goalLeft +
      (goalRight - goalLeft) * 0.82;
  }

  const targetY =
    goalTop +
    (goalBottom - goalTop) *
    (0.20 + Math.random() * 0.55);

  ball.startX = width / 2;
  ball.startY = height * 0.70;

  ball.x = ball.startX;
  ball.y = ball.startY;

  ball.targetX = targetX;
  ball.targetY = targetY;

  ball.progress = 0;

  // Goalkeeper chooses where to dive

  const difficulty =
    difficultyElement.value;

  let reactionChance;

  if (difficulty === "easy") {
    reactionChance = 0.30;
  } else if (difficulty === "hard") {
    reactionChance = 0.75;
  } else {
    reactionChance = 0.52;
  }

  // Higher levels make the goalkeeper better

  reactionChance +=
    (level - 1) * 0.035;

  reactionChance =
    Math.min(
      reactionChance,
      0.90
    );

  if (Math.random() < reactionChance) {

    goalkeeper.targetX =
      targetX;

  } else {

    const choices = [
      goalLeft + 50,
      (goalLeft + goalRight) / 2,
      goalRight - 50
    ];

    goalkeeper.targetX =
      choices[
        Math.floor(
          Math.random() * choices.length
        )
      ];
  }
}


// -----------------------------
// RESULT
// -----------------------------

function goal() {

  score++;

  scoreElement.textContent = score;

  messageElement.textContent =
    "GOAL! 🔥⚽";

  resultTimer = 1;

  if (score % 3 === 0) {

    level++;

    levelElement.textContent =
      level;

    messageElement.textContent =
      "LEVEL UP! 🏆";
  }
}

function save() {

  lives--;

  livesElement.textContent =
    lives;

  messageElement.textContent =
    "SAVED! 🧤";

  resultTimer = 1;

  if (lives <= 0) {

    shooting = true;

    messageElement.textContent =
      `GAME OVER — ${score} GOALS`;

    setTimeout(() => {

      restartGame();

    }, 2000);
  }
}


// -----------------------------
// UPDATE
// -----------------------------

function update(dt) {

  // Animate goalkeeper

  if (goalkeeper.x < goalkeeper.targetX) {

    goalkeeper.x +=
      goalkeeper.speed * dt;

    if (
      goalkeeper.x >
      goalkeeper.targetX
    ) {

      goalkeeper.x =
        goalkeeper.targetX;
    }

  } else if (
    goalkeeper.x >
    goalkeeper.targetX
  ) {

    goalkeeper.x -=
      goalkeeper.speed * dt;

    if (
      goalkeeper.x <
      goalkeeper.targetX
    ) {

      goalkeeper.x =
        goalkeeper.targetX;
    }
  }

  if (shooting) {

    ball.progress +=
      dt * 1.8;

    const p =
      Math.min(
        ball.progress,
        1
      );

    // Ball flies toward goal

    ball.x =
      ball.startX +
      (ball.targetX - ball.startX) *
      p;

    ball.y =
      ball.startY +
      (ball.targetY - ball.startY) *
      p;

    // Ball gets smaller as it travels

    if (p >= 1) {

      shooting = false;

      const difference =
        Math.abs(
          goalkeeper.x -
          ball.targetX
        );

      const saveDistance =
        55 +
        (difficultyElement.value === "hard"
          ? 15
          : 0) +
        level * 2;

      if (
        difference <
        saveDistance
      ) {

        save();

      } else {

        goal();
      }

      setTimeout(() => {

        if (lives > 0) {

          resetPositions();

          messageElement.textContent =
            "TAP THE GOAL TO SHOOT!";
        }

      }, 1000);
    }
  }
}


// -----------------------------
// RESET POSITIONS
// -----------------------------

function resetPositions() {

  const goalLeft =
    width * 0.20;

  const goalRight =
    width * 0.80;

  goalkeeper.x =
    (goalLeft + goalRight) / 2;

  goalkeeper.y =
    height * 0.38;

  goalkeeper.targetX =
    goalkeeper.x;

  const difficulty =
    difficultyElement.value;

  if (difficulty === "easy") {

    goalkeeper.speed = 220;

  } else if (difficulty === "hard") {

    goalkeeper.speed = 420;

  } else {

    goalkeeper.speed = 320;
  }

  goalkeeper.speed +=
    level * 8;

  ball.x =
    width / 2;

  ball.y =
    height * 0.70;
}


// -----------------------------
// RESTART
// -----------------------------

function restartGame() {

  score = 0;
  level = 1;
  lives = 3;

  scoreElement.textContent = "0";
  levelElement.textContent = "1";
  livesElement.textContent = "3";

  shooting = false;

  messageElement.textContent =
    "TAP THE GOAL TO SHOOT!";

  resetPositions();
}

restartButton.addEventListener(
  "click",
  restartGame
);


// -----------------------------
// BUTTONS
// -----------------------------

document
  .querySelectorAll("#shootButtons button")
  .forEach(button => {

    button.addEventListener(
      "pointerdown",
      event => {

        event.preventDefault();

        shoot(
          button.dataset.zone
        );
      }
    );
  });


// -----------------------------
// CANVAS TAP
// -----------------------------

canvas.addEventListener(
  "pointerdown",
  event => {

    if (shooting) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const x =
      event.clientX -
      rect.left;

    const goalLeft =
      width * 0.20;

    const goalRight =
      width * 0.80;

    if (
      x <
      goalLeft +
      (goalRight - goalLeft) / 3
    ) {

      shoot("left");

    } else if (
      x <
      goalLeft +
      (goalRight - goalLeft) * 2 / 3
    ) {

      shoot("center");

    } else {

      shoot("right");
    }
  }
);


// -----------------------------
// GAME LOOP
// -----------------------------

let lastTime =
  performance.now();

function gameLoop(time) {

  const dt =
    Math.min(
      0.033,
      (time - lastTime) / 1000
    );

  lastTime = time;

  update(dt);

  drawField();
  drawGoalkeeper();
  drawBall();

  requestAnimationFrame(
    gameLoop
  );
}

resize();

requestAnimationFrame(
  gameLoop
);
