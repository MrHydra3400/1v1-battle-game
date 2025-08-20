// Firebase initialization for leaderboard (requires <script> block in HTML)
// See index.html for the <script type="module"> that sets up window.firebase

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// Map selection and image loading (refactored)
const mapChoice = localStorage.getItem("mapChoice") || "arena";
let mapImage = new Image();
mapImage.src = `/assets/img/${mapChoice}.png`;

let collisionMapImage = new Image();
collisionMapImage.src = `/assets/img/${mapChoice}_collision.png`;
let collisionCanvas = document.createElement("canvas");
let collisionCtx = collisionCanvas.getContext("2d");
collisionMapImage.onload = () => {
  collisionCanvas.width = collisionMapImage.width;
  collisionCanvas.height = collisionMapImage.height;
  collisionCtx.drawImage(collisionMapImage, 0, 0);
};

// Lava collision map support for volcano and other custom maps (updated block)
let lavaCanvas, lavaCtx, lavaReady = false;
if (["volcano"].includes(mapChoice)) {
    lavaCanvas = document.createElement('canvas');
    lavaCtx = lavaCanvas.getContext('2d');
    const volcanoCollisionImg = new Image();
    volcanoCollisionImg.crossOrigin = "anonymous";
    volcanoCollisionImg.src = "/assets/img/volcano_collision.png";
    console.log("Loading collision map from:", volcanoCollisionImg.src);

    volcanoCollisionImg.onload = () => {
        lavaCanvas.width = volcanoCollisionImg.width;
        lavaCanvas.height = volcanoCollisionImg.height;
        lavaCtx.drawImage(volcanoCollisionImg, 0, 0);
        lavaReady = true;
        console.log("Volcano collision map loaded and ready");
        console.log("Collision image actual dimensions:", volcanoCollisionImg.width, volcanoCollisionImg.height);
    };
}

function isLava(x, y, width = 50, height = 50) {
  if (!lavaReady || !lavaCanvas || !lavaCtx) return false;

  const step = 5;

  // Scaling factors between game canvas and lava collision canvas
  const scaleX = lavaCanvas.width / canvas.width;
  const scaleY = lavaCanvas.height / canvas.height;

  const footHeight = 15;
  for (let dx = 0; dx < width; dx += step) {
    for (let dy = height - footHeight; dy < height; dy += step) {
      const px = Math.floor((x + dx) * scaleX);
      const py = Math.floor((y + dy) * scaleY);
      if (px < 0 || py < 0 || px >= lavaCanvas.width || py >= lavaCanvas.height) continue;

      const pixel = lavaCtx.getImageData(px, py, 1, 1).data;
      const alpha = pixel[3];
      if (alpha > 0) return true;
    }
  }
  return false;
}

function isCollidingWithMap(x, y) {
  if (!collisionCtx) return false;
  const pixel = collisionCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return pixel[3] > 0; // collisione se il pixel non è trasparente
}

// Start game when map image loads
// Prevent multiple gameLoop() calls by using a flag
let gameStarted = false;
function startGame() {
  if (!gameStarted) {
    gameStarted = true;
    requestAnimationFrame(gameLoop);
  }
}
mapImage.onload = () => {
  startGame();
};

const player1Img = new Image(); player1Img.src = "/assets/img/player1.png";
const player2Img = new Image();
const gameMode = localStorage.getItem("gameMode");
player2Img.src = gameMode === "Challengers" ? "/assets/img/player_challengers.png" : "/assets/img/player2.png";
const knifeImg = new Image(); knifeImg.src = "/assets/img/knife.png";
const pistolImg = new Image(); pistolImg.src = "/assets/img/pistol.png";
const firestaffImg = new Image(); firestaffImg.src = "/assets/img/firestaff.png";
const firestaffCDImg = new Image(); firestaffCDImg.src = "/assets/img/firestaff_cd.png";
const flailShieldImg = new Image(); flailShieldImg.src = "/assets/img/flailshield.png";
const fireballImg = new Image(); fireballImg.src = "/assets/img/fireball.png";
const bowImg = new Image(); bowImg.src = "/assets/img/bow.png";
const bowHoldImg = new Image(); bowHoldImg.src = "/assets/img/bow_hold.png";
const arrowImg = new Image(); arrowImg.src = "/assets/img/arrow.png";
const p1Heart = new Image(); p1Heart.src = "/assets/img/p1 health.png";
const p2Heart = new Image(); p2Heart.src = "/assets/img/p2 health.png";
const flailImg = new Image(); flailImg.src = "/assets/img/flail.png";
const shieldImg = new Image(); shieldImg.src = "/assets/img/shield.png";
const boltImg = new Image(); boltImg.src = "/assets/img/bolt.png";

// BONUS SYSTEM
const bonusTypes = ["SPEED", "RAGE", "SHIELD"];
const bonusImgs = {
  SPEED: (() => { const img = new Image(); img.src = "/assets/img/bonus_speed.png"; return img; })(),
  RAGE: (() => { const img = new Image(); img.src = "/assets/img/bonus_rage.png"; return img; })(),
  SHIELD: (() => { const img = new Image(); img.src = "/assets/img/bonus_shield.png"; return img; })()
};
let activeBonus = null;
let bonusTimer = 0;
let bonusCooldown = 0;

const BOUNDING_BOX = { x: 200, y: 200, width: 800, height: 500 };
const PLAYER_SIZE = 50;
const SPEED = 5;

const bullets = [];
const arrows = [];

function updateArrows() {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.x += a.dx;
    a.y += a.dy;
    const outOfBounds = a.x < BOUNDING_BOX.x || a.x > BOUNDING_BOX.x + BOUNDING_BOX.width || a.y < BOUNDING_BOX.y || a.y > BOUNDING_BOX.y + BOUNDING_BOX.height;
    if (outOfBounds) {
      arrows.splice(i, 1);
      continue;
    }

    const target = a.owner === "p1" ? player2 : player1;
    const hitbox = a.power === 30 ? 30 : 10;

    if (a.x > target.x - hitbox && a.x < target.x + PLAYER_SIZE + hitbox &&
        a.y > target.y - hitbox && a.y < target.y + PLAYER_SIZE + hitbox) {
      let damage = a.power;
      if (target.bonus === "SHIELD") damage *= 0.5;
      const shooter = a.owner === "p1" ? player1 : player2;
      if (shooter.bonus === "RAGE") damage *= 1.5;

      // Apply poison if charging arrow hits
      if (a.power === 30) {
        target.poisonTimer = 240; // 4 seconds at 60 FPS
      }

      target.health = Math.max(0, target.health - damage);
      arrows.splice(i, 1);
    }
  }
}
let fireballs = [];
let bolts = [];
let boltAmmo = {
  p1: { count: 2, lastRegen: performance.now() },
  p2: { count: 2, lastRegen: performance.now() }
};
let frameCount = 0;

function createPlayer(x, y, weapon) {
  return {
    x,
    y,
    up: false, down: false, left: false, right: false,
    health: 200,
    lives: 3,
    attacking: false,
    attackTimer: 0,
    knifeAngle: 0,
    weapon,
    lastFireTime: 0,
    aiCooldown: 0,
    stuckFrames: 0,
    isCharging: false,
    chargeStart: 0,
    fullycharged: false,
    prevX: x,
    prevY: y,
    moveTracker: { x: 0, y: 0 },
    moveDirection: { x: 0, y: 0 },
    bonus: null,
    bonusTimer: 0,
    moveDebuff: 1,
    poisonTimer: 0, // Poison duration in frames (4 seconds = 240 frames at 60 FPS)
    poisonDamage: 5, // Danno per tick di veleno
    burnTimer: 0, // Timer for burn effect (6 seconds = 360 frames at 60 FPS)
    burnDamage: 2.5 // Danno per tick di fiamma
  };
}

const weaponTypes = {
  knife: "melee",
  pistol: "ranged",
  firestaff: "ranged",
  flailshield: "melee",
  bow: "ranged",
  bolt: "ranged"
};
function shootBolt(shooter) {
  const owner = shooter === player1 ? "p1" : "p2";
  const ammo = boltAmmo[owner];
  if (ammo.count <= 0) return;

  let dx = 0, dy = 0;
  if (shooter.up) dy -= 1;
  if (shooter.down) dy += 1;
  if (shooter.left) dx -= 1;
  if (shooter.right) dx += 1;
  if (dx === 0 && dy === 0) dy = -1;

  const angle = Math.atan2(dy, dx);
  bolts.push({
    x: shooter.x + PLAYER_SIZE / 2,
    y: shooter.y + PLAYER_SIZE / 2,
    dx: Math.cos(angle) * 12,
    dy: Math.sin(angle) * 12,
    owner,
    bounces: 0
  });

  ammo.count--;
}

const selectedMode = (localStorage.getItem("gameMode") || "").toLowerCase();
let p1Lives = 3;
if (selectedMode === "challengers") {
  p1Lives = 5;
}
// Track kills for Challengers mode leaderboard
let challengerKillCount = 0;
const player1 = createPlayer(BOUNDING_BOX.x + 50, BOUNDING_BOX.y + 50, localStorage.getItem("player1Weapon") || "knife");
const player2 = createPlayer(
  BOUNDING_BOX.x + BOUNDING_BOX.width - 50 - PLAYER_SIZE,
  BOUNDING_BOX.y + BOUNDING_BOX.height - 50 - PLAYER_SIZE,
  localStorage.getItem("player2Weapon") || "knife"
);

// Score for Player 1 in challengers mode
let player1Score = 0;
const isSinglePlayer = localStorage.getItem("gameMode") === "1P" || selectedMode === "challengers";
const difficulty = localStorage.getItem("difficulty") || "easy";

// Ensure Player 2 starts with 500 HP in challengers mode
if (selectedMode === "challengers") {
  // Randomize map and weapon at start
  const newMap = getRandomMap();
  reloadMapAssets(newMap);
  player2.weapon = getRandomWeapon();
  player2.health = 500;
}

let message = "";
let messageTimer = 0;
let gameOver = false;

function shootBullet(shooter) {
  const owner = shooter === player1 ? "p1" : "p2";
  const dx = shooter.right - shooter.left;
  const dy = shooter.down - shooter.up;
  const angle = Math.atan2(dy, dx || -1); // default up if no direction

  bullets.push({
    x: shooter.x + PLAYER_SIZE / 2,
    y: shooter.y + PLAYER_SIZE / 2,
    dx: Math.cos(angle) * 7,
    dy: Math.sin(angle) * 7,
    owner
  });
}

function shootFireball(shooter) {
  const owner = shooter === player1 ? "p1" : "p2";
  const existing = fireballs.find(f => f.owner === owner && !f.exploding);
  if (existing) {
    existing.exploding = true;
    existing.explosionTimer = 60;
    existing.hasDamaged = false;
    return;
  }

  const now = performance.now();
  if (now - shooter.lastFireTime < 2000) return;
  shooter.lastFireTime = now;

  let dx = 0, dy = 0;
  if (shooter.up) dy -= 1;
  if (shooter.down) dy += 1;
  if (shooter.left) dx -= 1;
  if (shooter.right) dx += 1;
  if (dx === 0 && dy === 0) dy = -1; // default up
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

function performAttack(player, target) {
  const dx = player.x - target.x;
  const dy = player.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  let damage = (player.weapon === "flailshield") ? 15 : 10;
  if (player.bonus === "RAGE") damage *= 1.5;
  if (target.bonus === "SHIELD") damage *= 0.5;
  if (target.weapon === "flailshield" && !target.attacking) damage *= 0.8;
  if (distance < 50) target.health = Math.max(0, target.health - damage);
  player.attacking = true;
  player.attackTimer = 30;
}

function updateAI() {
  if (!isSinglePlayer || gameOver) return;

  // --- IA cerca bonus attivo ---
  if (activeBonus) {
    const dx = activeBonus.x - player2.x;
    const dy = activeBonus.y - player2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!player2.bonus && dist > 10 && Math.random() < 0.7) {
      player2.left = dx < -5;
      player2.right = dx > 5;
      player2.up = dy < -5;
      player2.down = dy > 5;
      return;
    }
  }

  const dx = player1.x - player2.x;
  const dy = player1.y - player2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const attackChance = difficulty === "easy" ? 0.3 : difficulty === "medium" ? 0.5 : 0.6;

  if (player2.aiCooldown > 0) {
    player2.aiCooldown--;

    if (player2.prevX === player2.x && player2.prevY === player2.y) {
      player2.stuckFrames = (player2.stuckFrames || 0) + 1;
    } else {
      player2.stuckFrames = 0;
    }
    player2.prevX = player2.x;
    player2.prevY = player2.y;

    if (player2.stuckFrames > 60) {
      const randomWander = () => {
        const rand = () => Math.random() < 0.5;
        player2.left = rand();
        player2.right = rand();
        player2.up = rand();
        player2.down = rand();
      };
      randomWander();
      return;
    }

    return;
  }

  player2.aiCooldown = difficulty === "easy" ? 20 : difficulty === "medium" ? 10 : 6;

  // Reset input
  player2.up = player2.down = player2.left = player2.right = false;

  const weapon = player2.weapon;
  const p1Weapon = player1.weapon;

  // Nuovo: funzione di movimento AI che evita la lava (solo su volcano)
  const approach = (dx, dy) => {
    // Se la collisione lava è pronta, tentiamo di aggirare la lava
    if (lavaReady) {
      // Calcolo posizione target
      const targetX = player2.x + (dx > 0 ? SPEED : dx < 0 ? -SPEED : 0);
      const targetY = player2.y + (dy > 0 ? SPEED : dy < 0 ? -SPEED : 0);
      let speed = SPEED;
      let directions = [
        { dx: speed, dy: 0 },
        { dx: -speed, dy: 0 },
        { dx: 0, dy: speed },
        { dx: 0, dy: -speed }
      ];
      // Ordina le direzioni in base alla distanza dall'obiettivo
      directions.sort((a, b) => {
        let distA = Math.hypot((player2.x + a.dx) - (player2.x + dx), (player2.y + a.dy) - (player2.y + dy));
        let distB = Math.hypot((player2.x + b.dx) - (player2.x + dx), (player2.y + b.dy) - (player2.y + dy));
        return distA - distB;
      });
      // Trova la prima direzione valida che non collide
      let found = false;
      for (let dir of directions) {
        let nextX = player2.x + dir.dx;
        let nextY = player2.y + dir.dy;
        if (!isLava(nextX, nextY + 15)) {
          // Imposta le direzioni
          player2.left = dir.dx < 0;
          player2.right = dir.dx > 0;
          player2.up = dir.dy < 0;
          player2.down = dir.dy > 0;
          found = true;
          break;
        }
      }
      if (!found) {
        player2.left = player2.right = player2.up = player2.down = false;
      }
      return;
    }
    // Default: movimento diretto
    player2.left = dx < 0;
    player2.right = dx > 0;
    player2.up = dy < 0;
    player2.down = dy > 0;
  };

  const avoid = (dx, dy) => {
    player2.left = dx > 0;
    player2.right = dx < 0;
    player2.up = dy > 0;
    player2.down = dy < 0;
  };

  const randomWander = () => {
    const rand = () => Math.random() < 0.5;
    player2.left = rand();
    player2.right = rand();
    player2.up = rand();
    player2.down = rand();
  };

  // COMPORTAMENTO INTELLIGENTE BASATO SU ARMA
  if (weaponTypes[weapon] === "melee") {
    if (distance > 50) {
      // Avvicinamento con un po' di ritardo e casualità
      if (Math.random() < 0.8) approach(dx, dy);
      else randomWander();
    } else {
      // Attacco o fuga breve
      if (Math.random() < 0.7) performAttack(player2, player1); // Aumentata la frequenza di attacco
      else if (Math.random() < 0.6) avoid(dx, dy); // Leggermente meno fuga
    }
  } else if (weaponTypes[weapon] === "ranged") {
    // Pistol o Firestaff (LOGICA AGGIORNATA)
    const dangerZone = 100;
    const idealRangeMin = 120;
    const idealRangeMax = 200;

    const angleToP1 = Math.atan2(dy, dx);
    const stepX = Math.cos(angleToP1);
    const stepY = Math.sin(angleToP1);

    // Fase di mira
    if (distance > 60 && distance < 300 && Math.random() < 0.3) {
      player2.left = stepX < -0.3;
      player2.right = stepX > 0.3;
      player2.up = stepY < -0.3;
      player2.down = stepY > 0.3;
    } else if (distance < dangerZone) {
      avoid(dx, dy); // Troppo vicino, scappa
    } else if (distance >= idealRangeMin && distance <= idealRangeMax) {
      // Movimento laterale più naturale
      const sideStep = Math.random() < 0.5 ? 1 : -1;
      const moveAngle = angleToP1 + sideStep * Math.PI / 2;
      const lateralX = Math.cos(moveAngle);
      const lateralY = Math.sin(moveAngle);

      player2.left = lateralX < -0.3;
      player2.right = lateralX > 0.3;
      player2.up = lateralY < -0.3;
      player2.down = lateralY > 0.3;
    } else if (distance > idealRangeMax) {
      // Avvicinati ma in modo impreciso
      if (Math.random() < 0.6) approach(dx, dy);
      else randomWander();
    }

    if (weapon === "pistol" && Math.random() < attackChance) shootBullet(player2);
    if (weapon === "firestaff" && Math.random() < attackChance) shootFireball(player2);

    // --- AGGIUNTA SUPPORTO BOW E BOLT ---
    if (weapon === "bow") {
      if (!player2.isCharging && Math.random() < attackChance) {
        player2.isCharging = true;
        player2.chargeStart = performance.now();
      }
    }

    if (weapon === "bolt") {
      if (boltAmmo["p2"].count > 0 && Math.random() < attackChance) {
        shootBolt(player2);
      }
    }
    // --- FINE AGGIUNTA SUPPORTO BOW E BOLT ---
  }

  // Gestione rilascio arco
  if (weapon === "bow" && player2.isCharging) {
    const duration = performance.now() - player2.chargeStart;
    if (duration > 1500) {
      const dx = player2.right - player2.left;
      const dy = player2.down - player2.up;
      const angle = Math.atan2(dy, dx || -1);
      arrows.push({
        x: player2.x + PLAYER_SIZE / 2,
        y: player2.y + PLAYER_SIZE / 2,
        dx: Math.cos(angle) * 9,
        dy: Math.sin(angle) * 9,
        owner: "p2",
        power: 30,
        angle
      });
      player2.isCharging = false;
    }
  }

  const dxDir = (player2.right ? 1 : 0) - (player2.left ? 1 : 0);
  const dyDir = (player2.down ? 1 : 0) - (player2.up ? 1 : 0);

  if (dxDir !== player2.moveDirection.x || dyDir !== player2.moveDirection.y) {
    player2.moveTracker.x = 0;
    player2.moveTracker.y = 0;
    player2.moveDirection.x = dxDir;
    player2.moveDirection.y = dyDir;
  }

  player2.moveTracker.x += dxDir * SPEED;
  player2.moveTracker.y += dyDir * SPEED;

  const movedDistance = Math.sqrt(player2.moveTracker.x ** 2 + player2.moveTracker.y ** 2);
  if (movedDistance > 200) {
    const rand = () => Math.random() < 0.7;
    player2.left = rand();
    player2.right = rand();
    player2.up = rand();
    player2.down = rand();
    player2.moveTracker.x = 0;
    player2.moveTracker.y = 0;
  }
}

function update() {
  if (gameOver) return;

  // Handle poison and burn damage
  [player1, player2].forEach(p => {
    if (p.poisonTimer > 0) {
      if (frameCount % 60 === 0) { // Apply poison damage every second
        p.health = Math.max(0, p.health - p.poisonDamage);
      }
      p.poisonTimer--;
    }

    if (p.burnTimer > 0) {
      if (frameCount % 30 === 0) { // Apply burn damage every 30 frames
        p.health = Math.max(0, p.health - p.burnDamage);
      }
      p.burnTimer--;
    }
  });

  // BONUS: spawn bonus if none active and cooldown elapsed
  if (!activeBonus && bonusCooldown <= 0) {
    const type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    let x, y;
    do {
      x = BOUNDING_BOX.x + Math.random() * BOUNDING_BOX.width;
      y = BOUNDING_BOX.y + Math.random() * BOUNDING_BOX.height;
    } while (isCollidingWithMap(x, y));
    activeBonus = {
      type,
      x,
      y,
      img: bonusImgs[type]
    };
    bonusTimer = 480; // 8 secondi a 60fps
    bonusCooldown = 900; // 15 secondi a 60fps
  } else {
    if (bonusCooldown > 0) bonusCooldown--;
    if (bonusTimer > 0) bonusTimer--;
    if (bonusTimer <= 0) activeBonus = null;
  }

  // Gestione raccolta bonus
  if (activeBonus) {
    // Debug: set a flag if bonus gets picked up
    let bonusPickedUp = false;
    for (const p of [player1, player2]) {
      const overlapX = p.x < activeBonus.x + 30 && p.x + PLAYER_SIZE > activeBonus.x;
      const overlapY = p.y < activeBonus.y + 30 && p.y + PLAYER_SIZE > activeBonus.y;
      if (overlapX && overlapY && !p.bonus) {
        p.bonus = activeBonus.type;
        p.bonusTimer = 480;
        activeBonus = null;
        bonusPickedUp = true;
        break;
      }
    }
    // if (bonusPickedUp) console.log("Bonus picked up!");
  }

  // Decadimento bonus
  [player1, player2].forEach(p => {
    if (p.bonus) {
      p.bonusTimer--;
      if (p.bonusTimer <= 0) p.bonus = null;
    }
  });

  // Movimento "morbido" per player1 e player2 (scivolamento sui bordi)
  for (const p of [player1, player2]) {
    const currentSpeed = (p.bonus === "SPEED" ? SPEED * 1.3 : SPEED) * p.moveDebuff;
    // Calcola il nuovo potenziale x e y in base agli input
    const nextX = p.x + (p.right ? currentSpeed : 0) - (p.left ? currentSpeed : 0);
    const nextY = p.y + (p.down ? currentSpeed : 0) - (p.up ? currentSpeed : 0);
    // Limita ai bordi della bounding box
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const clampedNextX = clamp(nextX, BOUNDING_BOX.x, BOUNDING_BOX.x + BOUNDING_BOX.width - PLAYER_SIZE);
    const clampedNextY = clamp(nextY, BOUNDING_BOX.y, BOUNDING_BOX.y + BOUNDING_BOX.height - PLAYER_SIZE);
    // Punto di controllo collisione (piede del personaggio)
    const checkX = clampedNextX + PLAYER_SIZE / 2;
    const checkY = clampedNextY + PLAYER_SIZE - 10;
    // Funzione collisione
    const collides = (x, y) => isCollidingWithMap(x, y);
    if (!collides(checkX, checkY)) {
      p.x = clampedNextX;
      p.y = clampedNextY;
    } else {
      // Prova a muovere solo X
      const checkOnlyX = (p.x !== clampedNextX);
      const checkOnlyY = (p.y !== clampedNextY);
      if (checkOnlyX && !collides(clampedNextX + PLAYER_SIZE / 2, p.y + PLAYER_SIZE - 10)) {
        p.x = clampedNextX;
      } else if (checkOnlyY && !collides(p.x + PLAYER_SIZE / 2, clampedNextY + PLAYER_SIZE - 10)) {
        p.y = clampedNextY;
      }
      // Altrimenti resta fermo
    }
    if (p.attacking) {
      p.attackTimer--;
      p.knifeAngle += 0.5;
      if (p.attackTimer <= 0) {
        p.attacking = false;
        p.knifeAngle = 0;
      }
    }
  }

  updateAI();
  updateArrows();

  const now = performance.now();
  ["p1", "p2"].forEach(p => {
    const ammo = boltAmmo[p];
    if (now - ammo.lastRegen >= 4000) {
      ammo.count = 2;
      ammo.lastRegen = now;
    }
  });
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.x += b.dx;
    b.y += b.dy;

    // Bolt collision with map (desert): rimbalzo/expire
    if (mapChoice === "desert" && isCollidingWithMap(b.x, b.y)) {
      if (!b.hasBounced) b.hasBounced = 0;
      if (b.hasBounced < 2) {
        b.dx *= -1;
        b.dy *= -1;
        b.hasBounced++;
      } else {
        b.expired = true;
      }
    }

    if (b.x <= BOUNDING_BOX.x || b.x >= BOUNDING_BOX.x + BOUNDING_BOX.width) {
      b.dx *= -1; b.bounces++;
    }
    if (b.y <= BOUNDING_BOX.y || b.y >= BOUNDING_BOX.y + BOUNDING_BOX.height) {
      b.dy *= -1; b.bounces++;
    }

    const target = b.owner === "p1" ? player2 : player1;
    if (b.x > target.x && b.x < target.x + PLAYER_SIZE &&
        b.y > target.y && b.y < target.y + PLAYER_SIZE) {
      let damage = 20;
      if (target.bonus === "SHIELD") damage *= 0.5;
      const shooter = b.owner === "p1" ? player1 : player2;
      if (shooter.bonus === "RAGE") damage *= 1.5;
      target.health = Math.max(0, target.health - damage);
      // Apply moveDebuff to target
      target.moveDebuff = 0.65;
      setTimeout(() => { target.moveDebuff = 1; }, 2000);
      bolts.splice(i, 1);
      continue;
    }

    if (b.bounces > 2 || b.expired) {
      bolts.splice(i, 1);
    }
  }

  for (let fb of fireballs) {
    if (!fb.exploding) {
      // Movimento della Fireball
      fb.x += fb.dx;
      fb.y += fb.dy;
      fb.traveled += Math.sqrt(fb.dx ** 2 + fb.dy ** 2);
      fb.angle = Math.sin(fb.traveled / 10) * 0.5;

      // Controllo collisione diretta con il target
      const target = fb.owner === "p1" ? player2 : player1;
      const dx = fb.x - (target.x + PLAYER_SIZE / 2);
      const dy = fb.y - (target.y + PLAYER_SIZE / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 30) { // Collisione diretta
        target.burnTimer = 360; // Applica il Burn Effect per 6 secondi
        // La Fireball NON esplode e NON infligge danni diretti
      }

      // Controllo collisione con i bordi o mappa
      const hitBounds = fb.x < BOUNDING_BOX.x || fb.x > BOUNDING_BOX.x + BOUNDING_BOX.width || fb.y < BOUNDING_BOX.y || fb.y > BOUNDING_BOX.y + BOUNDING_BOX.height;
      if (mapChoice === "desert" && isCollidingWithMap(fb.x, fb.y)) {
        fb.exploding = true;
        fb.explosionTimer = 60;
        fb.hasDamaged = false;
      }
      if (fb.traveled >= 350 || hitBounds) {
        fb.exploding = true;
        fb.angle = 0;
        fb.explosionTimer = 60;
      }
    } else {
      // Gestione esplosione della Fireball
      fb.explosionTimer--;
      if (!fb.hasDamaged && fb.explosionTimer <= 58) {
        const target = fb.owner === "p1" ? player2 : player1;
        const dx = fb.x - (target.x + PLAYER_SIZE / 2);
        const dy = fb.y - (target.y + PLAYER_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 75) { // Area di impatto dell'esplosione
          let damage = 25; // Danno dell'esplosione
          if (target.bonus === "SHIELD") damage *= 0.5;
          const shooter = fb.owner === "p1" ? player1 : player2;
          if (shooter.bonus === "RAGE") damage *= 1.5;

          target.health = Math.max(0, target.health - damage);
          target.burnTimer = 360; // Applica il Burn Effect per 6 secondi
          fb.hasDamaged = true;
        }
      }
    }
  }

  fireballs = fireballs.filter(fb => !(fb.exploding && fb.explosionTimer <= 0));

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx; b.y += b.dy;
    const outOfBounds = b.x < BOUNDING_BOX.x || b.x > BOUNDING_BOX.x + BOUNDING_BOX.width || b.y < BOUNDING_BOX.y || b.y > BOUNDING_BOX.y + BOUNDING_BOX.height;
    if (outOfBounds) { bullets.splice(i, 1); continue; }
    const target = b.owner === "p1" ? player2 : player1;
    if (b.x > target.x && b.x < target.x + PLAYER_SIZE && b.y > target.y && b.y < target.y + PLAYER_SIZE) {
      let damage = 15;
      if (target.bonus === "SHIELD") damage *= 0.5;
      const shooter = b.owner === "p1" ? player1 : player2;
      if (shooter.bonus === "RAGE") damage *= 1.5;
      target.health = Math.max(0, target.health - damage);
      bullets.splice(i, 1);
    }
  }

  if (player1.health <= 0 && player1.lives > 0) {
    if (selectedMode === "challengers") {
      if (player1.health <= 0 && p1Lives > 0) {
        p1Lives--;
        // Reset health, position, buffs, and show message
        player1.health = 200;
        player1.x = BOUNDING_BOX.x + 50;
        player1.y = BOUNDING_BOX.y + 50;
        player1.bonus = null;
        player1.bonusTimer = 0;
        player1.poisonTimer = 0; // Reset Poison
        player1.burnTimer = 0;   // Reset Burn
        player1.moveDebuff = 1; // Reset move debuff
        player2.bonus = null;
        player2.bonusTimer = 0;
        player2.poisonTimer = 0; // Reset Poison
        player2.burnTimer = 0;   // Reset Burn
        player2.moveDebuff = 1; // Reset move debuff
        activeBonus = null;
        bonusTimer = 0;
        bonusCooldown = 600;
        message = "Player 1 has been slain";
        messageTimer = 120;
      }
      // Only end game after reset, when p1Lives is now 0
      if (p1Lives === 0 && !gameOver) {
        gameOver = true;
        message = "GAME OVER";
        setTimeout(() => {
          ctx.fillStyle = 'black';
          ctx.font = '48px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
          ctx.font = '24px monospace';
          ctx.fillText(`Your Score: ${player1Score}`, canvas.width / 2, canvas.height / 2 + 30);
        }, 100);
      }
    } else {
      player1.lives--;
      player1.health = 200;
      player2.health = 200;
      player1.x = BOUNDING_BOX.x + 50;
      player1.y = BOUNDING_BOX.y + 50;
      player1.poisonTimer = 0; // Reset Poison
      player1.burnTimer = 0;   // Reset Burn
      player1.moveDebuff = 1; // Reset move debuff
      message = "Player 1 has been slain";
      messageTimer = 120;
      player1.bonus = null;
      player1.bonusTimer = 0;
      player2.bonus = null;
      player2.bonusTimer = 0;
      player2.poisonTimer = 0; // Reset Poison
      player2.burnTimer = 0;   // Reset Burn
      player2.moveDebuff = 1; // Reset move debuff
      activeBonus = null;
      bonusTimer = 0;
      bonusCooldown = 600;
    }
  }
  if (player2.health <= 0) {
    if (selectedMode === "challengers") {
      // Infinite respawn for player 2
      // Randomize map and weapon
      const newMap = getRandomMap();
      reloadMapAssets(newMap);
      player2.weapon = getRandomWeapon();

      player2.health = 500;
      player1.health = 200;
      player2.x = BOUNDING_BOX.x + BOUNDING_BOX.width - 50 - PLAYER_SIZE;
      player2.y = BOUNDING_BOX.y + BOUNDING_BOX.height - 50 - PLAYER_SIZE;
      message = "Player 2 has been slain"; messageTimer = 120;
      player1Score++;
      challengerKillCount++; // Track for leaderboard
      player1.bonus = null;
      player1.bonusTimer = 0;
      player2.poisonTimer = 0; // Reset Poison
      player2.burnTimer = 0;   // Reset Burn
      player2.moveDebuff = 1; // Reset move debuff
      player2.bonus = null;
      player2.bonusTimer = 0;
      player1.poisonTimer = 0; // Reset Poison
      player1.burnTimer = 0;   // Reset Burn
      player1.moveDebuff = 1; // Reset move debuff
      activeBonus = null;
      bonusTimer = 0;
      bonusCooldown = 600;
      // --- REMOVED: No speedup or timing change based on kills in challengers mode ---
      // (If any logic here previously increased game speed or decreased delay, it is now removed.)
    } else if (player2.lives > 0) {
      player2.lives--;
      player2.health = 200;
      player1.health = 200;
      player2.x = BOUNDING_BOX.x + BOUNDING_BOX.width - 50 - PLAYER_SIZE;
      player2.y = BOUNDING_BOX.y + BOUNDING_BOX.height - 50 - PLAYER_SIZE;
      message = "Player 2 has been slain"; messageTimer = 120;
      player1.poisonTimer = 0; // Reset Poison
      player1.burnTimer = 0;   // Reset Burn
      player1.moveDebuff = 1; // Reset move debuff
      player1.bonus = null;
      player1.bonusTimer = 0;
      player2.poisonTimer = 0; // Reset Poison
      player2.burnTimer = 0;   // Reset Burn
      player2.moveDebuff = 1; // Reset move debuff
      player2.bonus = null;
      player2.bonusTimer = 0;
      activeBonus = null;
      bonusTimer = 0;
      bonusCooldown = 600;
    }
  }
  // Move this block AFTER the above so the reset happens first:
  if ((selectedMode === "challengers" ? p1Lives === 0 : player1.lives === 0) ||
    (selectedMode !== "challengers" && player2.lives === 0)) {
    if (selectedMode === "challengers" && p1Lives === 0) {
      gameOver = true;
      message = "GAME OVER";
      setTimeout(() => {
        ctx.fillStyle = 'black';
        ctx.font = '48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '24px monospace';
        ctx.fillText(`Your Score: ${player1Score}`, canvas.width / 2, canvas.height / 2 + 30);
      }, 100);
      // --- Challengers leaderboard logic with Firebase ---
      if (selectedMode === "challengers") {
        const playerName = prompt("Inserisci il tuo nome per la classifica:");
        const playerWeapon = localStorage.getItem("player1Weapon") || "unknown";

        if (playerName) {
          const entry = {
            name: playerName,
            score: player1Score,
            weapon: playerWeapon,
            timestamp: Date.now()
          };
          const { database, ref, push } = window.firebase;
          push(ref(database, "scores"), entry);
        }
      }
      // --- End leaderboard logic ---
    } else {
      gameOver = true;
      message = (player1.lives === 0 ? "Player 2 wins!" : "Player 1 wins!");
    }
  }
}

// CONTINUA con draw(), gameLoop, eventi keydown/keyup, immagini preload...  
// Dimmi se vuoi anche **quella parte finale** e te la mando subito qui.

// Example UI update for hiding player 1 hearts in the DOM (if used elsewhere):
// To remove hearts from right to left, use:
// for (let i = 0; i < lostLives; i++) {
//   hearts[hearts.length - 1 - i].style.display = "none";
// }

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
  } else if (player.weapon === "flailshield") {
    ctx.drawImage(shieldImg, player.x + 5, player.y + 5, 40, 40);
    if (player.attacking) {
      const offset = 20 * Math.sin((30 - player.attackTimer) / 30 * Math.PI); // avanti e indietro
      ctx.drawImage(flailImg, player.x + 15 + offset, player.y + 10, 40, 40);
    } else {
      ctx.drawImage(flailImg, player.x + 15, player.y + 10, 40, 40);
    }
  } else if (player.weapon === "bow") {
    if (player.isCharging && player.chargeStart > 0) {
        const chargingDuration = performance.now() - player.chargeStart;
        if (chargingDuration >= 1500) {
            ctx.drawImage(bowHoldImg, player.x + 20, player.y - 20, 35, 70);
        } else {
            ctx.drawImage(bowImg, player.x + 20, player.y - 20, 35, 70);
        }
    } else {
        ctx.drawImage(bowImg, player.x + 20, player.y - 20, 35, 70);
    }
  }
  else if (player.weapon === "bolt") {
    const ammo = boltAmmo[player === player1 ? "p1" : "p2"].count;
    if (ammo >= 1) ctx.drawImage(boltImg, player.x - 10, player.y + 15, 30, 30);
    if (ammo === 2) ctx.drawImage(boltImg, player.x + 30, player.y + 15, 30, 30);
  }
}

function draw() {
  // Draw background map
  ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

  // Show points at top-center in challengers mode
  if (selectedMode === "challengers" && !gameOver) {
    ctx.font = "32px monospace";
    ctx.fillStyle = "#b11919ff";
    ctx.textAlign = "center";
    ctx.fillText(`${player1Score}`, canvas.width / 2, 50);
  }

  // Draw active bonus on the ring
  if (activeBonus) {
    ctx.save();
    ctx.translate(activeBonus.x, activeBonus.y);
    ctx.scale(0.7, 0.7);
    ctx.drawImage(activeBonus.img, -15, -15, 30, 30);
    ctx.restore();
  }

  // Draw players with debuff glow if affected
  const drawPlayerWithDebuff = (player, img) => {
    if (player.burnTimer > 0) {
      ctx.save();
      ctx.shadowColor = "red"; // Red glow for burn
      ctx.shadowBlur = 20;
      ctx.drawImage(img, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
      ctx.restore();
    } else if (player.poisonTimer > 0) {
      ctx.save();
      ctx.shadowColor = "green"; // Green glow for poison
      ctx.shadowBlur = 20;
      ctx.drawImage(img, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
      ctx.restore();
    } else if (player.moveDebuff < 1) {
      ctx.save();
      ctx.shadowColor = "yellow";
      ctx.shadowBlur = 20;
      ctx.drawImage(img, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
      ctx.restore();
    } else {
      ctx.drawImage(img, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    }
  };

  drawPlayerWithDebuff(player1, player1Img);
  drawPlayerWithDebuff(player2, player2Img);

  // Draw bonus overlay on players
  const drawBonusOverlay = (player) => {
    if (!player.bonus) return;
    const img = bonusImgs[player.bonus];

    if (player.bonus === "SHIELD") {
      const shieldOffsetY = 5;
      ctx.drawImage(img, player.x - 1, player.y - shieldOffsetY, PLAYER_SIZE, PLAYER_SIZE);
    } else if (player.bonus === "SPEED") {
      const scale = 1;
      const offsetX = (PLAYER_SIZE * (1 - scale)) / 2;
      const offsetY = - 0;
      ctx.drawImage(img, player.x + offsetX, player.y - offsetY, PLAYER_SIZE * scale, PLAYER_SIZE * scale);
    } else if (player.bonus === "RAGE") {
      const scale = 1.2;
      const offsetX = (PLAYER_SIZE * (1 - scale)) / 2;
      const offsetY = 10;
      ctx.drawImage(img, player.x + offsetX, player.y - offsetY, PLAYER_SIZE * scale, PLAYER_SIZE * scale);
    }
  };
  drawBonusOverlay(player1);
  drawBonusOverlay(player2);

  drawWeapon(player1);
  drawWeapon(player2);

  for (const b of bolts) {
    ctx.drawImage(boltImg, b.x - 10, b.y - 10, 20, 20);
  }
  for (const b of bullets) {
    ctx.fillStyle = "black";
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
  }

  for (const a of arrows) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);
    const scale = a.power === 30 ? 2 : 1;
    ctx.drawImage(arrowImg, -10 * scale, -5 * scale, 20 * scale, 10 * scale);
    ctx.restore();
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
  // In challengers mode, if Player 1's health is 0 (after P2 is slain), draw the bar at 0
  let p1HealthBar = player1.health;
  if (selectedMode === "challengers" && player1.health <= 0 && message === "Player 2 has been slain") {
    p1HealthBar = 0;
  }
  ctx.fillRect(200, 730, 300 * p1HealthBar / 200, 20);

  ctx.strokeRect(700, 730, 300, 20);
  ctx.fillStyle = "#FF3B30";
  const p2HealthBarMax = selectedMode === "challengers" ? 500 : 200;
  ctx.fillRect(700, 730, 300 * player2.health / p2HealthBarMax, 20);

  ctx.fillStyle = "#000";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  // Show 0% for Player 1 health if it was just reset (challengers mode)
  let p1HealthText = player1.health;
  if (selectedMode === "challengers" && player1.health <= 0 && message === "Player 2 has been slain") {
    p1HealthText = 0;
  }
  ctx.fillText(`${p1HealthText}`, 200 + 150, 745);
  ctx.fillText(`${player2.health}`, 700 + 150, 745);

  // Draw player 1 hearts (normal or challengers mode)
  if (selectedMode === "challengers") {
    // Draw a heart for each remaining p1Lives, from right to left
    for (let i = 0; i < p1Lives; i++) {
      // Draw from right to left, starting at 510 + (5-1-i)*30
      ctx.drawImage(p1Heart, 510 + (5 - 1 - i) * 30, 730, 22, 22);
    }
  } else {
    // Remove hearts from right to left: draw only the rightmost 'player1.lives' hearts
    const p1Positions = [518, 544, 570];
    for (let i = 0; i < player1.lives; i++) {
      ctx.drawImage(p1Heart, p1Positions[p1Positions.length - 1 - i], 730, 20, 20);
    }
  }
  // Only draw player 2 hearts if not in "challengers" mode
  if (selectedMode !== "challengers") {
    const p2Positions = [665, 640, 615];
    for (let i = 0; i < player2.lives; i++) ctx.drawImage(p2Heart, p2Positions[i], 730, 20, 20);
  }

  if (messageTimer > 0 || gameOver) {
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    if (gameOver && selectedMode === "challengers") {
      ctx.font = "48px monospace";
      ctx.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = "32px monospace";
      ctx.fillText(`Points: ${player1Score}`, canvas.width / 2, canvas.height / 2);
      ctx.font = "24px monospace";
      ctx.fillText("Press SPACEBAR to duel again", canvas.width / 2, canvas.height / 2 + 40);
    } else {
      ctx.font = "40px serif";
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);
      if (gameOver) {
        ctx.font = "24px monospace";
        ctx.fillText("Press SPACEBAR to duel again", canvas.width / 2, canvas.height / 2 + 40);
      }
    }
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
  updateAI();
  draw();
  // Only call requestAnimationFrame here, never elsewhere.
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
      else if (player1.weapon === "flailshield") performAttack(player1, player2);
      else if (player1.weapon === "bow") {
        if (!player1.isCharging) {
            player1.isCharging = true;
            player1.chargeStart = performance.now();
        }
      }
      else if (player1.weapon === "bolt") shootBolt(player1);
      break;
    case "l":
      if (player2.weapon === "knife") performAttack(player2, player1);
      else if (player2.weapon === "pistol") shootBullet(player2);
      else if (player2.weapon === "firestaff") shootFireball(player2);
      else if (player2.weapon === "flailshield") performAttack(player2, player1);
      else if (player2.weapon === "bow") {
        if (!player2.isCharging) {
            player2.isCharging = true;
            player2.chargeStart = performance.now();
        }
      }
      else if (player2.weapon === "bolt") shootBolt(player2);
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

  if (player1.weapon === "bow" && player1.isCharging && e.key.toLowerCase() === "f") {
    const duration = performance.now() - player1.chargeStart;
    const dx = player1.right - player1.left;
    const dy = player1.down - player1.up;
    const angle = Math.atan2(dy, dx || -1);
    if (duration >= 1500) {
      arrows.push({
        x: player1.x + PLAYER_SIZE / 2,
        y: player1.y + PLAYER_SIZE / 2,
        dx: Math.cos(angle) * 9,
        dy: Math.sin(angle) * 9,
        owner: "p1",
        power: 30,
        angle
      });
    } else {
      [15, 30, 45].forEach(deg => {
        const offsetAngle = angle + deg * Math.PI / 180;
        arrows.push({
          x: player1.x + PLAYER_SIZE / 2,
          y: player1.y + PLAYER_SIZE / 2,
          dx: Math.cos(offsetAngle) * 7,
          dy: Math.sin(offsetAngle) * 7,
          owner: "p1",
          power: 5,
          angle: offsetAngle
        });
      });
    }
    player1.isCharging = false;
  }

  if (player2.weapon === "bow" && player2.isCharging && e.key.toLowerCase() === "l") {
    const duration = performance.now() - player2.chargeStart;
    const dx = player2.right - player2.left;
    const dy = player2.down - player2.up;
    const angle = Math.atan2(dy, dx || -1);
    if (duration >= 1500) {
      arrows.push({
        x: player2.x + PLAYER_SIZE / 2,
        y: player2.y + PLAYER_SIZE / 2,
        dx: Math.cos(angle) * 9,
        dy: Math.sin(angle) * 9,
        owner: "p2",
        power: 30,
        angle
      });
    } else {
      [15, 30, 45].forEach(deg => {
        const offsetAngle = angle + deg * Math.PI / 180;
        arrows.push({
          x: player2.x + PLAYER_SIZE / 2,
          y: player2.y + PLAYER_SIZE / 2,
          dx: Math.cos(offsetAngle) * 7,
          dy: Math.sin(offsetAngle) * 7,
          owner: "p2",
          power: 5,
          angle: offsetAngle
        });
      });
    }
    player2.isCharging = false;
  }
});

function getRandomMap() {
  const maps = ["arena", "desert", "volcano"];
  return maps[Math.floor(Math.random() * maps.length)];
}

function getRandomWeapon() {
  const weapons = Object.keys(weaponTypes);
  return weapons[Math.floor(Math.random() * weapons.length)];
}

function reloadMapAssets(mapChoice) {
  mapImage.src = `/assets/img/${mapChoice}.png`;
  collisionMapImage.src = `/assets/img/${mapChoice}_collision.png`;
  // Lava collision support
  if (["volcano", "custom1", "custom2"].includes(mapChoice)) {
    const volcanoCollisionImg = new Image();
    volcanoCollisionImg.crossOrigin = "anonymous";
    volcanoCollisionImg.src = `/assets/img/${mapChoice}_collision.png`;
    volcanoCollisionImg.onload = () => {
      lavaCanvas.width = volcanoCollisionImg.width;
      lavaCanvas.height = volcanoCollisionImg.height;
      lavaCtx.drawImage(volcanoCollisionImg, 0, 0);
      lavaReady = true;
    };
  } else {
    lavaReady = false;
  }
}