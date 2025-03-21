let handPose;
let video;
let hands = [];
let images = [];

let gameObjects = [];
let catcher;
let score = 0;
let level = 1;
let timer = 60;
let gameActive = false;
let gameOver = false;
let timerInterval;
let objectTypes = [
  { name: "gentle", points: -10, speed: 2.0, size: 40, image: images[0] },
  { name: "karmine", points: 20, speed: 2.5, size: 50, image: images[1] },
  { name: "karmine", points: 15, speed: 2.5, size: 45, image: images[2] },
  { name: "vita", points: -30, speed: 1.0, size: 45, image: images[3] },
];

let handX = 0;
let handY = 0;
let isFist = false;
let isGrabbing = false;

function preload() {
  handPose = ml5.handPose();
  images[0] = loadImage("images/maillot_gentle.png", (img) =>
    img.resize(50, 50)
  );
  images[1] = loadImage("images/kc.png", (img) => img.resize(50, 50));
  images[2] = loadImage("images/kc_2.png", (img) => img.resize(50, 50));
  images[3] = loadImage("images/vita.png", (img) => img.resize(50, 50));
}

function setup() {
  let canvas = createCanvas(800, 484);
  canvas.parent("canvas-container");

  objectTypes[0].image = images[0];
  objectTypes[1].image = images[1];
  objectTypes[2].image = images[2];
  objectTypes[3].image = images[3];

  video = createCapture({
    video: {
      width: { ideal: 800 },
      height: { ideal: 484 },
    },
  });
  video.size(800, 484);
  video.hide();
  video.position(0, 0);

  handPose.detectStart(video, gotHands);
  createInitialObjects();
  document.getElementById("status").innerText =
    "Modèle HandPose chargé - Montrez votre main pour jouer";

  startGame();

  document
    .getElementById("restart-button")
    .addEventListener("click", function () {
      restartGame();
    });
}

function draw() {
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  fill(0, 0, 0, 100);
  rect(0, 0, width, height);

  drawAllObjects();

  if (hands.length > 0) {
    updateHandGestures(hands[0]);
    drawHandLandmarks();
  }

  if (gameOver) {
    displayGameOverScreen();
  }
}

function gotHands(results) {
  hands = results;

  if (hands.length > 0 && !gameActive && !gameOver) {
    gameActive = true;
    startTimer();
    document.getElementById("status").innerText =
      "Jeu en cours - Attrapez les objets !";
  }
}

function updateHandGestures(hand) {
  const keypoints = hand.keypoints;
  const palmBase = keypoints[0];

  handX = width - palmBase.x;
  handY = palmBase.y;

  const indexTip = keypoints[8];
  const palmCenter = keypoints[0];

  const indexToPalmDist = dist(
    indexTip.x,
    indexTip.y,
    palmCenter.x,
    palmCenter.y
  );

  const indexKnuckle = keypoints[5];
  const knuckleToPalmDist = dist(
    indexKnuckle.x,
    indexKnuckle.y,
    palmCenter.x,
    palmCenter.y
  );

  isFist = indexToPalmDist < knuckleToPalmDist * 1.5;

  if (isFist) {
    isGrabbing = true;
    checkForCapture();
  } else {
    isGrabbing = false;
  }
}

function drawHandLandmarks() {
  if (hands.length > 0) {
    const hand = hands[0];

    if (isFist) {
      fill(255, 0, 0, 180);
      noStroke();
      circle(handX, handY, 60);
    } else {
      fill(0, 255, 0, 180);
      noStroke();
      circle(handX, handY, 50);
    }
  }
}

function createInitialObjects() {
  gameObjects = [];

  const numObjects = 3 + level;

  for (let i = 0; i < numObjects; i++) {
    createRandomObject();
  }
}

function createRandomObject() {
  const gentleObjects = objectTypes.filter((type) => type.name === "gentle");
  const otherObjects = objectTypes.filter((type) => type.name == "karmine");
  const vitaObjects = objectTypes.filter((type) => type.name === "vita");

  let listObjects = [];
  otherObjects.forEach((type) => {
    for (let i = 0; i < 4; i++) {
      listObjects.push(type);
    }
  });
  gentleObjects.forEach((type) => {
    listObjects.push(type);
  });
    vitaObjects.forEach((type) => {
    listObjects.push(type);
  });

  const type = listObjects[Math.floor(random(listObjects.length))];
  const adjustedSpeed = type.speed * (1 + (level - 1) * 0.2);

  const newObject = {
    x: random(width - 50) + 25,
    y: random(height - 50) + 25,
    type: type,
    size: type.size,
    points: type.points,
    speedX: random(-1, 1) * adjustedSpeed,
    speedY: random(-1, 1) * adjustedSpeed,
    rotation: 0,
    rotationSpeed: random(-0.05, 0.05),
    image: type.image,
  };

  gameObjects.push(newObject);
}

function drawAllObjects() {
  if (gameActive && !gameOver) {
    for (let i = gameObjects.length - 1; i >= 0; i--) {
      const obj = gameObjects[i];

      obj.x += obj.speedX;
      obj.y += obj.speedY;

      obj.rotation += obj.rotationSpeed;

      if (obj.x < obj.size / 2 || obj.x > width - obj.size / 2) {
        obj.speedX *= -1;
      }
      if (obj.y < obj.size / 2 || obj.y > height - obj.size / 2) {
        obj.speedY *= -1;
      }

      push();
      translate(obj.x, obj.y);
      rotate(obj.rotation);

      noStroke();

      const scalefactor = 0.5;
      image(obj.image, 0, 0, obj.size * scalefactor, obj.size * scalefactor);

      pop();
    }
  }
}

function checkForCapture() {
  for (let i = gameObjects.length - 1; i >= 0; i--) {
    const obj = gameObjects[i];
    const distance = dist(handX, handY, obj.x, obj.y);

    if (distance < obj.size * 1.5 && isGrabbing) {
      let pointsEarned = obj.points;
      let captureMessage = "";

      if (obj.type.name === "gentle") {
        score -= Math.abs(obj.type.points);
        captureMessage =
          "Maillot de la LUXUEUSE attrapé ! " + obj.points + " points perdus";
      } else if (obj.type.name === "vita") {
        score -= Math.abs(obj.type.points);
        captureMessage =
          "Maillot de la TRES NULLE PITALITY attrapé ! " + obj.points + " points perdus";
      }
      else {
        score += obj.type.points;
        captureMessage =
          "Maillot de la PRESTIGIEUSE attrapé ! +" + obj.points + " points";
      }

      updateScore();

      displayCaptureEffect(obj.x, obj.y, pointsEarned);

      gameObjects.splice(i, 1);
      createRandomObject();

      document.getElementById("status").innerText = captureMessage;
      setTimeout(() => {
        document.getElementById("status").innerText =
          "Jeu en cours - Attrapez les maillots !";
      }, 1000);
    }
  }
}

function displayCaptureEffect(x, y, points) {
  fill(255, 255, 255, 180);
  noStroke();
  circle(x, y, 80);

  fill(0, 255, 0);
  textSize(24);
  textAlign(CENTER, CENTER);
  text("+" + points, x, y);
}

function startTimer() {
  timerInterval = setInterval(function () {
    timer--;
    updateTimer();

    if (timer <= 0) {
      endGame();
    }
  }, 1000);
}

function updateTimer() {
  document.getElementById("timer-value").innerText = timer;
}

function updateScore() {
  document.getElementById("score-value").innerText = score;

  if (score >= level * 100) {
    levelUp();
  }
}

function levelUp() {
  level++;
  document.getElementById("level").querySelector(".info-value").innerText =
    level;

  timer += 5;
  updateTimer();

  createRandomObject();

  document.getElementById("status").innerText =
    "Niveau " + level + " ! +5 secondes";
  setTimeout(function () {
    document.getElementById("status").innerText =
      "Jeu en cours - Attrappez les maillots de KC!";
  }, 2000);
}

function startGame() {
  score = 0;
  level = 1;
  timer = 30;
  gameActive = false;
  gameOver = false;

  updateScore();
  updateTimer();

  document.getElementById("restart-button").style.display = "none";
}

function endGame() {
  clearInterval(timerInterval);
  gameActive = false;
  gameOver = true;

  document.getElementById("status").innerText =
    "Jeu terminé ! Score final: " + score;

  document.getElementById("restart-button").style.display = "block";
}

function restartGame() {
  startGame();
  createInitialObjects();

  document.getElementById("status").innerText =
    "Montrez votre main pour jouer à nouveau";
}

function displayGameOverScreen() {
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);

  fill(255);
  textSize(40);
  textAlign(CENTER, CENTER);
  text("Temps écoulé !", width / 2, height / 2 - 60);

  textSize(32);
  text("Score final: " + score, width / 2, height / 2);
  text("Niveau atteint: " + level, width / 2, height / 2 + 50);

  textSize(20);
  text("Cliquez sur Rejouer pour recommencer", width / 2, height / 2 + 100);
}
