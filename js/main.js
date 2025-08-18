// main.js completo con cooldown pistola, firestaff dinamico, ESCAPE, e fuoco esplosivo

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Load images
const ring = new Image(); ring.src = "./assets/img/Ring.png";
const player1Img = new Image(); player1Img.src = "./assets/img/Player1.png";
const player2Img = new Image(); player2Img.src = "./assets/img/Player2.png";
const knifeImg = new Image(); knifeImg.src = "./assets/img/Knife.png";
const pistolImg = new Image(); pistolImg.src = "./assets/img/Pistol.png";
const firestaffImg = new Image(); firestaffImg.src = "./assets/img/Firestaff.png";
const fireballImg = new Image(); fireballImg.src = "./assets/img/Fireball.png";
const firestaffCDImg = new Image(); firestaffCDImg.src = "./assets/img/Firestaff_CD.png";
const p1Heart = new Image(); p1Heart.src = "./assets/img/P1 Health.png";
const p2Heart = new Image(); p2Heart.src = "./assets/img/P2 Health.png";

const BOUNDING_BOX = { x: 200, y: 200, width: 800, height: 500 };
const PLAYER_SIZE = 50;
const SPEED = 5;

const bullets = [];
const fireballs = [];
let frameCount = 0;

function createPlayer(x, y, weapon) {
  return {
    x,
    y,
    up: false, down: false, left: false, right: false,
    health: 100,
    lives: 3,
    attacking: false,
    attackTimer: 0,
    knifeAngle: 0,
    weapon,
    lastFireTime: 0
  };
}

const player1 = createPlayer(BOUNDING_BOX.x + 50, BOUNDING_BOX.y + 50, localStorage.getItem("player1Weapon") || "knife");
const player2 = createPlayer(BOUNDING_BOX.x + BOUNDING_BOX.width - 50 - PLAYER_SIZE, BOUNDING_BOX.y + BOUNDING_BOX.height - 50 - PLAYER_SIZE, localStorage.getItem("player2Weapon") || "knife");

let message = "";
let messageTimer = 0;
let gameOver = false;

function shootBullet(shooter) {
  const owner = shooter === player1 ? "p1" : "p2";
  const recentBullet = bullets.find(b => b.owner === owner && frameCount - (b.createdAt || 0) < 30);
  if (recentBullet) return;

  let dx = shooter.right - shooter.left;
  let dy = shooter.down - shooter.up;
  if (dx === 0 && dy === 0) dy = -1;

  const speed = 7;
  bullets.push({
    x: shooter.x + PLAYER_SIZE / 2,
    y: shooter.y + PLAYER_SIZE / 2,
    dx: dx * speed,
    dy: dy * speed,
    owner,
    createdAt: frameCount
  });
}

function shootFireball(shooter) {
  const owner = shooter === player1 ? "p1" : "p2";
  const existing = fireballs.find(fb => fb.owner === owner && !fb.exploding);

  if (existing) {
    existing.exploding = true;
    existing.explosionTimer = 60;
    existing.hasDamaged = false;
    return;
  }

  const now = performance.now();
  if (now - shooter.lastFireTime < 2000) return;
  shooter.lastFireTime = now;

  let dx = shooter.right - shooter.left;
  let dy = shooter.down - shooter.up;
  if (dx === 0 && dy === 0) dy = -1;
  const angle = Math.atan2(dy, dx);

  fireballs.push({
    x: shooter.x + PLAYER_SIZE / 2,
    y: shooter.y + PLAYER_SIZE / 2,
    dx: Math.cos(angle) * 6,
    dy: Math.sin(angle) * 6,
    traveled: 0,
    owner,
    angle: 0,
    exploding: false,
    explosionTimer: 60,
    hasDamaged: false
  });
}

function update() {
  if (gameOver) return;

  const players = [player1, player2];
  for (const p of players) {
    if (p.up && p.y > BOUNDING_BOX.y) p.y -= SPEED;
    if (p.down && p.y + PLAYER_SIZE < BOUNDING_BOX.y + BOUNDING_BOX.height) p.y += SPEED;
    if (p.left && p.x > BOUNDING_BOX.x) p.x -= SPEED;
    if (p.right && p.x + PLAYER_SIZE < BOUNDING_BOX.x + BOUNDING_BOX.width) p.x += SPEED;

    if (p.attacking) {
      p.attackTimer--;
      p.knifeAngle += 0.5;
      if (p.attackTimer <= 0) {
        p.attacking = false;
        p.knifeAngle = 0;
      }
    }
  }

  for (let fb of fireballs) {
    if (!fb.exploding) {
      fb.x += fb.dx;
      fb.y += fb.dy;
      fb.traveled += Math.sqrt(fb.dx ** 2 + fb.dy ** 2);
      fb.angle = Math.sin(fb.traveled / 10) * 0.5;
      const hitBoundingBox =
        fb.x < BOUNDING_BOX.x ||
        fb.x > BOUNDING_BOX.x + BOUNDING_BOX.width ||
        fb.y < BOUNDING_BOX.y ||
        fb.y > BOUNDING_BOX.y + BOUNDING_BOX.height;
      if (fb.traveled >= 350 || hitBoundingBox) {
        fb.exploding = true;
        fb.angle = 0;
        fb.explosionTimer = 60;
      }
    } else {
      fb.explosionTimer--;
      if (!fb.hasDamaged && fb.explosionTimer <= 58) {
        const target = fb.owner === "p1" ? player2 : player1;
        const dx = fb.x - (target.x + PLAYER_SIZE / 2);
        const dy = fb.y - (target.y + PLAYER_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 75) {
          target.health = Math.max(0, target.health - 25);
          fb.hasDamaged = true;
        }
      }
    }
  }

  for (let i = fireballs.length - 1; i >= 0; i--) {
    if (fireballs[i].exploding && fireballs[i].explosionTimer <= 0) fireballs.splice(i, 1);
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx;
    b.y += b.dy;
    if (b.x < BOUNDING_BOX.x || b.x > BOUNDING_BOX.x + BOUNDING_BOX.width || b.y < BOUNDING_BOX.y || b.y > BOUNDING_BOX.y + BOUNDING_BOX.height) {
      bullets.splice(i, 1);
      continue;
    }
    const target = b.owner === "p1" ? player2 : player1;
    if (b.x > target.x && b.x < target.x + PLAYER_SIZE && b.y > target.y && b.y < target.y + PLAYER_SIZE) {
      target.health = Math.max(0, target.health - 15);
      bullets.splice(i, 1);
    }
  }

  // Gestione vite
  if (player1.health <= 0 && player1.lives > 0) {
    player1.lives--; player1.health = 100; player2.health = 100;
    player1.x = BOUNDING_BOX.x + 50; player1.y = BOUNDING_BOX.y + 50;
    message = "Player 1 has been slain"; messageTimer = 120;
  }
  if (player2.health <= 0 && player2.lives > 0) {
    player2.lives--; player2.health = 100; player1.health = 100;
    player2.x = BOUNDING_BOX.x + BOUNDING_BOX.width - 50 - PLAYER_SIZE;
    player2.y = BOUNDING_BOX.y + BOUNDING_BOX.height - 50 - PLAYER_SIZE;
    message = "Player 2 has been slain"; messageTimer = 120;
  }
  if (player1.lives === 0 || player2.lives === 0) {
    gameOver = true;
    message = player1.lives === 0 ? "Player 2 wins!" : "Player 1 wins!";
  }
}

function drawKnife(player) {
  const cx = player.x + PLAYER_SIZE / 2;
  const cy = player.y + PLAYER_SIZE / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(player.knifeAngle);
  ctx.scale(1, 0.6); ctx.drawImage(knifeImg, 5, -20, 40, 40);
  ctx.restore();
}

function drawWeapon(player) {
  if (player.weapon === "knife") drawKnife(player);
  else if (player.weapon === "pistol") ctx.drawImage(pistolImg, player.x + 25, player.y + 25, 40, 25);
  else if (player.weapon === "firestaff") {
    const now = performance.now();
    const fireImg = (now - player.lastFireTime < 2000) ? firestaffCDImg : firestaffImg;
    ctx.drawImage(fireImg, player.x + 20, player.y - 20, 35, 70);
  }
}

function draw() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(ring, 0, 0, canvas.width, canvas.height);

  ctx.drawImage(player1Img, player1.x, player1.y, PLAYER_SIZE, PLAYER_SIZE);
  ctx.drawImage(player2Img, player2.x, player2.y, PLAYER_SIZE, PLAYER_SIZE);

  drawWeapon(player1);
  drawWeapon(player2);

  for (const b of bullets) {
    ctx.fillStyle = "black";
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
  }

  for (const fb of fireballs) {
    ctx.save(); ctx.translate(fb.x, fb.y);
    if (!fb.exploding) {
      ctx.rotate(fb.angle);
      ctx.drawImage(fireballImg, -15, -30, 30, 30);
    } else {
      const progress = 1 - fb.explosionTimer / 60;
      const scale = 1 + 2 * progress;
      ctx.scale(scale, scale);
      ctx.drawImage(fireballImg, -15, -30, 30, 30);
    }
    ctx.restore();
  }

  ctx.strokeStyle = "black";
  ctx.strokeRect(200, 730, 300, 20);
  ctx.fillStyle = "#007BFF";
  ctx.fillRect(200, 730, 300 * player1.health / 100, 20);

  ctx.strokeRect(700, 730, 300, 20);
  ctx.fillStyle = "#FF3B30";
  ctx.fillRect(700, 730, 300 * player2.health / 100, 20);

  ctx.fillStyle = "#000";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${player1.health}%`, 200 + 150, 760);
  ctx.fillText(`${player2.health}%`, 700 + 150, 760);

  const p1Positions = [518, 544, 570];
  for (let i = 0; i < player1.lives; i++) ctx.drawImage(p1Heart, p1Positions[i], 730, 20, 20);
  const p2Positions = [665, 640, 615];
  for (let i = 0; i < player2.lives; i++) ctx.drawImage(p2Heart, p2Positions[i], 730, 20, 20);

  if (messageTimer > 0 || gameOver) {
    ctx.fillStyle = "black";
    ctx.font = "40px serif";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    if (!gameOver) messageTimer--;
  }
  if (gameOver) {
    ctx.font = "24px monospace";
    ctx.fillText("Press SPACEBAR to duel again", canvas.width / 2, canvas.height / 2 + 40);
  }
  ctx.fillStyle = "#000";
  ctx.font = "20px monospace";
  ctx.textAlign = "left";
  ctx.fillText("ESCAPE, little chicken!", 20, 30);
}

function gameLoop() {
  frameCount++;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  if (key === "escape") window.location.href = "index.html?mode=selection";
  if (gameOver && key === " ") window.location.href = "index.html?mode=selection";
  switch (key) {
    case "w": player1.up = true; break;
    case "s": player1.down = true; break;
    case "a": player1.left = true; break;
    case "d": player1.right = true; break;
    case "arrowup": player2.up = true; break;
    case "arrowdown": player2.down = true; break;
    case "arrowleft": player2.left = true; break;
    case "arrowright": player2.right = true; break;
    case "f":
      if (player1.weapon === "knife") performAttack(player1, player2);
      else if (player1.weapon === "pistol") shootBullet(player1);
      else if (player1.weapon === "firestaff") shootFireball(player1);
      break;
    case "l":
      if (player2.weapon === "knife") performAttack(player2, player1);
      else if (player2.weapon === "pistol") shootBullet(player2);
      else if (player2.weapon === "firestaff") shootFireball(player2);
      break;
  }
});

window.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();
  switch (key) {
    case "w": player1.up = false; break;
    case "s": player1.down = false; break;
    case "a": player1.left = false; break;
    case "d": player1.right = false; break;
    case "arrowup": player2.up = false; break;
    case "arrowdown": player2.down = false; break;
    case "arrowleft": player2.left = false; break;
    case "arrowright": player2.right = false; break;
  }
});

let loaded = 0;
function tryStartGame() {
  loaded++;
  if (loaded === 10) gameLoop();
}

[ring, player1Img, player2Img, knifeImg, pistolImg, firestaffImg, firestaffCDImg, fireballImg, p1Heart, p2Heart].forEach(img => img.onload = tryStartGame);

function performAttack(player, target) {
  const dx = player.x - target.x;
  const dy = player.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 50) target.health = Math.max(0, target.health - 10);
  player.attacking = true;
  player.attackTimer = 30;
}