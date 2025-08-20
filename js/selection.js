const canvas = document.getElementById("gameCanvas");

let firebaseScores = [];

function fetchTopScores() {
  const db = window.firebase.database();
  db.ref("challengerScores")
    .orderByChild("score")
    .limitToLast(3)
    .once("value", snapshot => {
      const data = [];
      snapshot.forEach(child => {
        data.unshift(child.val()); // unshift per ottenere ordine decrescente
      });
      firebaseScores = data;
    });
}

fetchTopScores(); // carica all'avvio

const ctx = canvas.getContext("2d");

// Load images
const player1Img = new Image(); player1Img.src = "/assets/img/player1.png";
const player2Img = new Image(); player2Img.src = "/assets/img/player2.png";
const challengerImg = new Image();
challengerImg.src = "/assets/img/player_challengers.png";
const mapThumbs = [
  new Image(),
  new Image(),
  new Image() // desert
];
mapThumbs[0].src = "/assets/img/arena.png";
mapThumbs[1].src = "/assets/img/volcano.png";
mapThumbs[2].src = "/assets/img/desert.png";
const weaponIcons = [
  new Image(),
  new Image(),
  new Image(),
  new Image(), // aggiunta
  new Image(), // Bow
  new Image() // Bolt
];
weaponIcons[0].src = "/assets/img/knife.png";      // Knife
weaponIcons[1].src = "/assets/img/pistol.png";     // Pistol
weaponIcons[2].src = "/assets/img/firestaff.png";  // Firestaff
weaponIcons[3].src = "/assets/img/flailshield.png"; // Flail and Shield
weaponIcons[4].src = "/assets/img/bow_hold.png"; // Bow
weaponIcons[5].src = "/assets/img/bolt.png"; // Bolt
// Weapon names
const weaponChoices = ["knife", "pistol", "firestaff", "flailshield", "bow", "bolt"];

let p1WeaponIndex = 0;
let p2WeaponIndex = 0;
let mapIndex = 0;
const mapChoices = ["Arena", "Volcano", "Desert"]; // display names only

function drawArrow(x, y, direction) {
  ctx.fillStyle = "black";
  ctx.beginPath();
  if (direction === "left") {
    ctx.moveTo(x + 15, y);
    ctx.lineTo(x, y + 15);
    ctx.lineTo(x + 15, y + 30);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + 15, y + 15);
    ctx.lineTo(x, y + 30);
  }
  ctx.closePath();
  ctx.fill();
}

function draw() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const p1X = 300, p2X = 900;
  const playerY = 520;

  // Players (scaled 0.8 on Y)
  ctx.save();
  ctx.translate(p1X, playerY);
  ctx.scale(1, 0.8);
  ctx.drawImage(player1Img, -90, -125, 180, 250);
  ctx.restore();

  const currentMode = localStorage.getItem("gameMode") || "2P";

  ctx.save();
  ctx.translate(p2X, playerY);
  ctx.scale(1, 0.8);
  if (currentMode === "Challengers") {
    ctx.scale(1.5, 1.5);
    ctx.drawImage(challengerImg, -80, -130, 160, 220); // Adjusted size for 1.5 scale
  } else {
    ctx.drawImage(player2Img, -90, -125, 180, 250);
  }
  ctx.restore();

  // Arrows
  drawArrow(p1X - 60, 275, "left");
  drawArrow(p1X + 45, 275, "right");

  if (currentMode !== "Challengers") {
    drawArrow(p2X - 60, 275, "left");
    drawArrow(p2X + 45, 275, "right");
  }

  // Weapon icons with firestaff/flailshield rotated 90 degrees
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? p1X : p2X;
    const index = i === 0 ? p1WeaponIndex : p2WeaponIndex;

    if (i === 1 && currentMode === "Challengers") {
      continue;
    }

    const img = weaponIcons[index];

    if (weaponChoices[index] === "firestaff" || weaponChoices[index] === "flailshield") {
      ctx.save();
      ctx.translate(x, 275); // center point of rotation
      ctx.rotate(Math.PI / 2); // 90 degrees
      ctx.drawImage(img, 0, -30, 30, 60);
      ctx.restore();
    } else {
      ctx.drawImage(img, x - 30, 275, 64, 30);
    }
  }

  // Weapon names
  ctx.fillStyle = "#000";
  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  ctx.fillText(weaponChoices[p1WeaponIndex].toUpperCase(), p1X, 250);

  if (currentMode !== "Challengers") {
    ctx.fillText(weaponChoices[p2WeaponIndex].toUpperCase(), p2X, 250);
  }

  // Instruction text
  ctx.fillStyle = "#000";
  ctx.font = "32px serif";
  ctx.textAlign = "center";
  ctx.fillText("Make your choice!", 600, 700);

  // Map Selection (centered)
  const mapX = canvas.width / 2;
  if (currentMode !== "Challengers") {
    ctx.fillStyle = "#000";
    ctx.font = "16px monospace";
    ctx.fillText(mapChoices[mapIndex], mapX, 330);
    ctx.drawImage(mapThumbs[mapIndex], mapX - 83, 345, 166, 94);
  }

  // G to Cycle maps
  if (currentMode !== "Challengers") {
    ctx.fillStyle = "#000";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Press G to Cycle", canvas.width - 600, 300);
  }

  // GO TO BATTLE (in alto a destra)
  ctx.fillStyle = "#000";
  ctx.font = "20px monospace";
  ctx.textAlign = "right";
  ctx.fillText("GO TO BATTLE!", canvas.width - 20, 30);

  // Modalità di gioco (1P o 2P)
  let modeLabel = "Mode: " + currentMode;
  ctx.fillStyle = "#000";
  ctx.font = "20px monospace";
  ctx.textAlign = "left";
  ctx.fillText(modeLabel, 30, 50);
  ctx.fillText("Press M to toggle 1P / 2P / Challengers", 30, 80);

  // Display top 3 Challengers with weapon icon
  if (currentMode === "Challengers") {
    ctx.font = "16px monospace";
    ctx.fillStyle = "#000";
    ctx.fillText("Top 3 Challengers:", 30, 110);
    firebaseScores.forEach((entry, i) => {
      ctx.fillText(`${i + 1}. ${entry.name} - ${entry.score}`, 30, 130 + i * 50);
      const weaponIndex = weaponChoices.indexOf(entry.weapon);
      if (weaponIndex !== -1) {
        ctx.drawImage(weaponIcons[weaponIndex], 220, 112 + i * 50, 32, 32);
      }
    });
  }
}

function update() {
  // Nessuna logica temporale
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function endSelection() {
  localStorage.setItem("player1Weapon", weaponChoices[p1WeaponIndex]);
  localStorage.setItem("player2Weapon", weaponChoices[p2WeaponIndex]);
  const mapFiles = ["arena", "volcano", "desert"]; // internal filenames
  localStorage.setItem("mapChoice", mapFiles[mapIndex]);
  window.location.href = "index.html?mode=main";
}

window.addEventListener("keydown", e => {
  switch (e.key) {
    case "a":
      p1WeaponIndex = (p1WeaponIndex - 1 + weaponChoices.length) % weaponChoices.length;
      break;
    case "d":
      p1WeaponIndex = (p1WeaponIndex + 1) % weaponChoices.length;
      break;
    case "ArrowLeft":
      p2WeaponIndex = (p2WeaponIndex - 1 + weaponChoices.length) % weaponChoices.length;
      break;
    case "ArrowRight":
      p2WeaponIndex = (p2WeaponIndex + 1) % weaponChoices.length;
      break;
    case "m":
      const current = localStorage.getItem("gameMode") || "2P";
      const modes = ["2P", "1P", "Challengers"];
      const nextIndex = (modes.indexOf(current) + 1) % modes.length;
      localStorage.setItem("gameMode", modes[nextIndex]);
      break;
    case "g":
      mapIndex = (mapIndex - 1 + mapChoices.length) % mapChoices.length;
      break;
    case "h":
      mapIndex = (mapIndex + 1) % mapChoices.length;
      break;
    case " ":
      endSelection(); // SPACEBAR = GO TO BATTLE
      break;
  }
});

// Wait for assets
let loaded = 0;
function tryStart() {
  loaded++;
  if (loaded === 12) gameLoop(); // 6 icons + 2 player images + 3 map thumbs + challenger image
}

player1Img.onload = tryStart;
player2Img.onload = tryStart;
challengerImg.onload = tryStart;
weaponIcons.forEach(icon => icon.onload = tryStart);
mapThumbs.forEach(img => img.onload = tryStart);
