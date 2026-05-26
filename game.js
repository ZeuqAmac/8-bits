(() => {
'use strict';

// ============================================================
// MOREZOMBI: LA CATEDRAL MALDITA
// Beat 'em up de scroll lateral estilo 8-bit (NES era)
// ============================================================

// ---------- Constantes ----------
const W = 512, H = 384;
const GROUND_Y = 320;
const WORLD_W = 1600;
const GRAVITY = 0.55;
const PX = 3;

// Plataformas a lo largo del mundo
const platforms = [
  { x: 180,  y: GROUND_Y - 70, w: 78 },
  { x: 360,  y: GROUND_Y - 110, w: 70 },
  { x: 540,  y: GROUND_Y - 75, w: 80 },
  { x: 820,  y: GROUND_Y - 95, w: 90 },
  { x: 1040, y: GROUND_Y - 70, w: 78 },
  { x: 1240, y: GROUND_Y - 110, w: 70 },
  { x: 1420, y: GROUND_Y - 75, w: 80 }
];

// Paleta NES-inspired
const C = {
  sky1: '#2a2848', sky2: '#7a5a7a', sky3: '#b89898',
  cloud: '#d8c8c8', cloudDark: '#9a8898',
  cathedralCream: '#f0d8a8', cathedralShade: '#c8a878',
  cathedralPink: '#d49090', cathedralPinkDark: '#a86060',
  cross: '#fff0a0', crossDark: '#c0a040',
  clockFace: '#f8f0d0', clockHand: '#202020',
  arch: '#3a2010', door: '#6a3818',
  palmTrunk: '#684020', palmTrunkLight: '#8a5828',
  palmGreen: '#208048', palmGreenLight: '#40b060',
  stone1: '#807068', stone2: '#605048', stoneEdge: '#403028',
  step: '#a89888', stepShade: '#807060',
  lamp: '#f8d040', lampPost: '#403028',
  // Hero - El Presidente
  heroMaskR: '#e02020', heroMaskRDark: '#902020',
  heroMaskY: '#f8d038', heroSkin: '#f8c898',
  heroShirt: '#2060c0', heroShirtDark: '#103880',
  heroPants: '#303040', heroBoots: '#181820',
  heroGlove: '#f0f0f0', heroGloveDark: '#a0a0a0',
  presidentHair: '#2a1a10', presidentHairLight: '#4a3020',
  presidentSuit: '#1a1a22', presidentSuitDark: '#0a0a12',
  presidentShirt: '#f0e8d8',
  sashGreen: '#108040', sashWhite: '#f8f8f0', sashRed: '#c01828',
  medalGold: '#f8d040',
  // Jefes finales
  bossHair: '#e8e8e8', bossHairShade: '#a8a8a8',
  bossSkin: '#e0b088', bossSkinDark: '#a07050',
  bossWomanHair: '#2a1810',
  guayabera: '#f0e8d0', guayaberaShade: '#c8b890',
  guayaPocket: '#d8c8a0',
  bossPants: '#909098', bossPantsDark: '#606068',
  bossJeans: '#5878a8',
  bossShoes: '#f0e8d0', bossShoesDark: '#a89878',
  glasses: '#101018',
  embRed: '#c01828', embYellow: '#f8c828', embGreen: '#208048', embBlue: '#2058a8',
  embPink: '#e87898',
  // Zombie - morezombi
  zSkin: '#a8b878', zSkinDark: '#688038',
  zEye: '#101010', zMouth: '#400000',
  zVest: '#c02020', zVestDark: '#801010',
  zShirt: '#e8e0c8', zShirtShade: '#a89880',
  zJeans: '#5878a8', zJeansDark: '#384878',
  zShoes: '#502810', zHair: '#2a1a1a',
  zCan: '#d8c020', zCanDark: '#988018',
  // Otros
  blood: '#c01818', bloodDark: '#700808',
  black: '#000', white: '#fff',
  hudR: '#e02020', hudG: '#40c040', hudY: '#f8d038'
};

// ---------- Canvas ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- Input ----------
const keys = {};
const onceKeys = {};
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) onceKeys[k] = true;
  keys[k] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  ensureAudio();
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});
function held(...ks) { return ks.some(x => keys[x.toLowerCase()]); }
function pressed(...ks) {
  for (const x of ks) {
    if (onceKeys[x.toLowerCase()]) { return true; }
  }
  return false;
}
function clearOnce() { for (const k in onceKeys) onceKeys[k] = false; }

// Touch controls (D-pad + A/B) - mapean al mismo sistema de teclas
function pressKey(k) {
  k = k.toLowerCase();
  if (!keys[k]) onceKeys[k] = true;
  keys[k] = true;
  ensureAudio();
}
function releaseKey(k) { keys[k.toLowerCase()] = false; }

document.querySelectorAll('.t-btn').forEach(btn => {
  const k = btn.dataset.key;
  const down = e => { e.preventDefault(); pressKey(k); };
  const up   = e => { e.preventDefault(); releaseKey(k); };
  btn.addEventListener('touchstart', down, { passive: false });
  btn.addEventListener('touchend', up,   { passive: false });
  btn.addEventListener('touchcancel', up, { passive: false });
  btn.addEventListener('mousedown', down);
  btn.addEventListener('mouseup', up);
  btn.addEventListener('mouseleave', up);
});

// ---------- Audio (Web Audio beeps tipo 8-bit) ----------
let actx = null;
function ensureAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  } else if (actx.state === 'suspended') {
    actx.resume();
  }
}
function tone(freq, dur, type = 'square', vol = 0.08, slideTo = null) {
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  jump: () => { tone(523, 0.08, 'square', 0.07); setTimeout(() => tone(784, 0.08, 'square', 0.06), 50); },
  punch: () => { tone(220, 0.04, 'square', 0.08); tone(150, 0.06, 'sawtooth', 0.04); },
  hit: () => { tone(440, 0.05, 'square', 0.1, 110); },
  hurt: () => { tone(200, 0.15, 'sawtooth', 0.1, 80); },
  zombieDie: () => {
    tone(330, 0.08, 'sawtooth', 0.09, 80);
    setTimeout(() => tone(150, 0.12, 'sawtooth', 0.07, 60), 80);
  },
  start: () => {
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.1, 'square', 0.08), i * 90));
  },
  wave: () => {
    [659, 784, 988].forEach((f, i) =>
      setTimeout(() => tone(f, 0.12, 'square', 0.07), i * 100));
  },
  gameOver: () => {
    [523, 440, 349, 262, 196].forEach((f, i) =>
      setTimeout(() => tone(f, 0.2, 'sawtooth', 0.09), i * 180));
  },
  win: () => {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => tone(f, 0.15, 'triangle', 0.09), i * 120));
  },
  throwShot: () => { tone(750, 0.08, 'square', 0.07, 1300); },
  bossShot:  () => { tone(380, 0.1, 'sawtooth', 0.08, 220); }
};

// ---------- Helpers de dibujo de pixel art ----------
function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
// dibuja un sprite definido como string multilínea
// chars: ' '=transparente, otros = índice en palette
function drawSprite(sprite, x, y, palette, scale = PX, flipX = false) {
  const rows = sprite.split('\n').filter(r => r.length > 0);
  const w = rows[0].length;
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === ' ' || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      const drawX = flipX ? x + (w - 1 - rx) * scale : x + rx * scale;
      px(drawX, y + ry * scale, scale, scale, color);
    }
  }
}

// ============================================================
// FONDO: Catedral, palmeras, plaza
// ============================================================

// Estrellas / nubes fijas para parallax lento
const stars = [];
for (let i = 0; i < 40; i++) {
  stars.push({ x: Math.random() * WORLD_W * 0.4, y: Math.random() * 100, r: Math.random() * 2 + 1 });
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, C.sky1);
  g.addColorStop(0.55, C.sky2);
  g.addColorStop(1, C.sky3);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND_Y);
}

function drawClouds(camX) {
  const offset = -camX * 0.15;
  // nubes grandes en bloque pixel
  const clouds = [
    { x: 30, y: 30, w: 90, h: 20 },
    { x: 200, y: 50, w: 70, h: 16 },
    { x: 350, y: 25, w: 100, h: 22 },
    { x: 520, y: 60, w: 80, h: 18 },
    { x: 700, y: 35, w: 90, h: 20 },
    { x: 880, y: 55, w: 70, h: 16 },
    { x: 1050, y: 30, w: 100, h: 22 },
    { x: 1250, y: 50, w: 80, h: 18 },
    { x: 1420, y: 28, w: 90, h: 20 }
  ];
  for (const c of clouds) {
    const cx = c.x + offset;
    if (cx + c.w < 0 || cx > W) continue;
    // sombra inferior
    px(cx, c.y + c.h - 6, c.w, 6, C.cloudDark);
    // cuerpo
    px(cx + 4, c.y, c.w - 8, c.h - 6, C.cloud);
    px(cx, c.y + 4, c.w, c.h - 10, C.cloud);
    px(cx + 8, c.y - 4, c.w - 16, 4, C.cloud);
  }
}

function drawDistantCity(camX) {
  const offset = -camX * 0.3;
  ctx.fillStyle = '#4a3858';
  for (let i = 0; i < 20; i++) {
    const bx = i * 90 + offset;
    if (bx + 80 < 0 || bx > W) continue;
    const bh = 30 + ((i * 37) % 40);
    ctx.fillRect(bx, GROUND_Y - bh, 70, bh);
    // ventanitas
    ctx.fillStyle = C.lamp;
    for (let wy = 4; wy < bh - 4; wy += 8) {
      for (let wx = 6; wx < 64; wx += 10) {
        if ((i * 7 + wy + wx) % 5 < 2) {
          ctx.fillRect(bx + wx, GROUND_Y - bh + wy, 3, 3);
        }
      }
    }
    ctx.fillStyle = '#4a3858';
  }
}

// Sprite de catedral (estilo pixel art)
// Dibujada con primitivas para tener detalles
function drawCathedral(camX) {
  const baseX = 600 - camX * 0.7; // posición en mundo, parallax medio
  const baseY = GROUND_Y;
  if (baseX > W || baseX + 280 < 0) return;

  // === Torres ===
  drawTower(baseX + 20, baseY - 230, true);
  drawTower(baseX + 200, baseY - 230, false);

  // === Cuerpo central ===
  const bx = baseX + 80, by = baseY - 170, bw = 120, bh = 170;
  // cuerpo crema
  px(bx, by, bw, bh, C.cathedralCream);
  // bordes rosados verticales
  px(bx - 4, by, 4, bh, C.cathedralPink);
  px(bx + bw, by, 4, bh, C.cathedralPink);
  // sombra base
  px(bx, by + bh - 8, bw, 8, C.cathedralShade);

  // Frontón triangular arriba
  for (let i = 0; i < 20; i++) {
    px(bx + 60 - i * 3, by - 30 + i, 6 + i * 6, 1, C.cathedralCream);
  }
  // Cruz central encima del frontón
  px(bx + 58, by - 50, 4, 16, C.cross);
  px(bx + 52, by - 42, 16, 4, C.cross);
  px(bx + 60, by - 50, 2, 16, C.crossDark);

  // Estatua en el nicho del frontón
  px(bx + 56, by - 22, 8, 16, C.cathedralPinkDark);
  px(bx + 58, by - 20, 4, 4, C.heroSkin); // cabecita
  px(bx + 56, by - 14, 8, 10, C.cathedralCream);

  // Reloj
  const cx = bx + 60, cy = by + 10;
  px(cx - 10, cy - 10, 20, 20, C.clockFace);
  px(cx - 12, cy - 10, 2, 20, C.cathedralPinkDark);
  px(cx + 10, cy - 10, 2, 20, C.cathedralPinkDark);
  px(cx - 10, cy - 12, 20, 2, C.cathedralPinkDark);
  px(cx - 10, cy + 10, 20, 2, C.cathedralPinkDark);
  // Marcas del reloj
  px(cx - 1, cy - 8, 2, 2, C.black);
  px(cx - 1, cy + 6, 2, 2, C.black);
  px(cx - 8, cy - 1, 2, 2, C.black);
  px(cx + 6, cy - 1, 2, 2, C.black);
  // Manecillas
  px(cx - 1, cy - 6, 2, 7, C.clockHand);
  px(cx, cy - 1, 6, 2, C.clockHand);

  // Arco de entrada
  const ax = bx + 48, ay = by + 90;
  px(ax, ay, 24, 40, C.arch);
  for (let i = 0; i < 8; i++) {
    px(ax + i, ay - i, 24 - i * 2, 1, C.arch);
  }
  // puerta
  px(ax + 4, ay + 10, 16, 30, C.door);
  px(ax + 11, ay + 10, 2, 30, C.arch);

  // Marco del arco
  px(ax - 3, ay - 8, 30, 3, C.cathedralPink);
  px(ax - 3, ay - 8, 3, 48, C.cathedralPink);
  px(ax + 24, ay - 8, 3, 48, C.cathedralPink);

  // Ventanas redondas (rosetón pequeño)
  drawOcculus(bx + 25, by + 50);
  drawOcculus(bx + 95, by + 50);
  drawOcculus(bx + 25, by + 90);
  drawOcculus(bx + 95, by + 90);

  // Detalle de nichos sobre la puerta (las dos figuritas)
  px(bx + 35, by + 70, 10, 16, C.cathedralPinkDark);
  px(bx + 37, by + 72, 6, 4, C.heroSkin);
  px(bx + 36, by + 78, 8, 8, C.cathedralCream);
  px(bx + 75, by + 70, 10, 16, C.cathedralPinkDark);
  px(bx + 77, by + 72, 6, 4, C.heroSkin);
  px(bx + 76, by + 78, 8, 8, C.cathedralCream);

  // Letrero arriba de la puerta
  px(bx + 30, by + 130, 60, 8, C.cathedralPinkDark);
  px(bx + 32, by + 132, 56, 4, C.cathedralCream);

  // Escalones
  for (let s = 0; s < 5; s++) {
    px(baseX - 20 + s * 4, baseY - 8 - s * 4, 320 - s * 8, 4, s % 2 ? C.step : C.stepShade);
  }
}

function drawTower(tx, ty, leftSide) {
  // tx,ty = top-left of tower base column
  const tw = 40, th = 200;
  // sombra
  px(tx + 4, ty + 4, tw, th, C.cathedralShade);
  // cuerpo
  px(tx, ty, tw, th, C.cathedralCream);
  // bordes rosados
  px(tx - 3, ty + 40, 3, th - 40, C.cathedralPink);
  px(tx + tw, ty + 40, 3, th - 40, C.cathedralPink);

  // ventana arqueada media (campanas)
  px(tx + 10, ty + 60, 20, 30, C.arch);
  for (let i = 0; i < 6; i++) px(tx + 10 + i, ty + 60 - i, 20 - i * 2, 1, C.arch);
  // campana
  px(tx + 16, ty + 70, 8, 10, C.crossDark);
  px(tx + 14, ty + 78, 12, 4, C.crossDark);

  // ventana de abajo (más pequeña)
  px(tx + 14, ty + 130, 12, 18, C.arch);
  for (let i = 0; i < 4; i++) px(tx + 14 + i, ty + 130 - i, 12 - i * 2, 1, C.arch);

  // Punto/cúpula
  px(tx - 4, ty - 10, tw + 8, 12, C.cathedralPink);
  // base octogonal
  px(tx, ty - 25, tw, 15, C.cathedralCream);
  px(tx + 4, ty - 30, tw - 8, 5, C.cathedralCream);
  // pináculo
  for (let i = 0; i < 18; i++) {
    px(tx + 20 - i / 2, ty - 30 - i, 1 + i, 1, C.cathedralPink);
  }
  // cruz
  px(tx + 18, ty - 64, 4, 14, C.cross);
  px(tx + 14, ty - 58, 12, 3, C.cross);

  // 4 columnitas decorativas sobre las campanas
  px(tx + 2, ty + 4, 3, 30, C.cathedralPink);
  px(tx + 12, ty + 4, 3, 30, C.cathedralPink);
  px(tx + 25, ty + 4, 3, 30, C.cathedralPink);
  px(tx + 35, ty + 4, 3, 30, C.cathedralPink);
}

function drawOcculus(x, y) {
  px(x - 4, y - 4, 8, 8, C.cathedralPinkDark);
  px(x - 3, y - 3, 6, 6, C.arch);
  px(x - 1, y - 1, 2, 2, C.cathedralPink);
}

function drawPalm(x, y, h) {
  // tronco
  for (let i = 0; i < h; i++) {
    const tx = x + Math.sin(i * 0.2) * 2;
    px(tx, y - i * 4, 8, 4, i % 2 ? C.palmTrunk : C.palmTrunkLight);
  }
  // hojas (palmas)
  const top = y - h * 4;
  const fronds = [
    [-20, -10, 25, 8], [10, -8, 25, 8],
    [-25, 0, 25, 6], [15, 2, 25, 6],
    [-15, -18, 22, 7], [5, -18, 22, 7],
    [-8, -25, 16, 10]
  ];
  for (const f of fronds) {
    for (let i = 0; i < 8; i++) {
      const fx = x + f[0] + (f[2] / 8) * i;
      const fy = top + f[1] + Math.sin(i * 0.5) * 3 + (i > 4 ? (i - 4) * 1.5 : 0);
      px(fx, fy, f[2] / 4, f[3] / 2, i % 2 ? C.palmGreen : C.palmGreenLight);
    }
  }
}

function drawPalms(camX) {
  // varias palmeras a lo largo del nivel
  const palms = [
    { x: 80, h: 22 }, { x: 180, h: 18 }, { x: 480, h: 24 },
    { x: 920, h: 20 }, { x: 1100, h: 23 }, { x: 1380, h: 21 },
    { x: 1500, h: 19 }
  ];
  const offset = -camX * 0.85;
  for (const p of palms) {
    const x = p.x + offset;
    if (x + 40 < 0 || x - 40 > W) continue;
    drawPalm(x, GROUND_Y, p.h);
  }
}

function drawLamp(x, y) {
  px(x, y - 50, 3, 50, C.lampPost);
  px(x - 5, y - 60, 13, 4, C.lampPost);
  px(x - 4, y - 56, 11, 6, C.lamp);
  px(x - 2, y - 58, 7, 2, C.white);
}

function drawPlaza(camX) {
  // Tierra/banqueta
  px(0, GROUND_Y, W, H - GROUND_Y, C.stone1);
  // Patrón de baldosas
  const tileW = 24, tileH = 12;
  const startX = -((camX * 1) | 0) % tileW;
  for (let y = GROUND_Y; y < H; y += tileH) {
    for (let x = startX; x < W; x += tileW) {
      const isAlt = ((((x - startX) / tileW) | 0) + (((y - GROUND_Y) / tileH) | 0)) % 2;
      px(x, y, tileW - 1, tileH - 1, isAlt ? C.stone1 : C.stone2);
      px(x, y, tileW - 1, 1, C.stoneEdge);
    }
  }
  // Banqueta superior
  px(0, GROUND_Y - 2, W, 2, C.stoneEdge);
  px(0, GROUND_Y, W, 1, C.step);

  // Lámparas a lo largo
  const lamps = [60, 220, 380, 540, 740, 900, 1080, 1280, 1460];
  for (const lx of lamps) {
    const x = lx - camX;
    if (x < -20 || x > W + 20) continue;
    drawLamp(x, GROUND_Y);
  }
}

// ============================================================
// SPRITES de personajes
// ============================================================

// Hero - El Presidente con banda tricolor
// 12 x 18 = 36 x 54 px (scale 3)
const heroSprites = {
  idle: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...BSSSSB...
..BGGSSBBB..
..BBGWWBBB..
..BBBWRRBB..
..BBBBBRBB..
..BBBBBBBB..
...BBBBBB...
...PPPPPP...
...PP..PP...
...PP..PP...
...EE..EE...`,
  walk1: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...BSSSSB...
..BGGSSBBB..
..BBGWWBBB..
..BBBWRRBB..
..BBBBBRBB..
..BBBBBBBB..
...BBBBBB...
...PPPPPP...
..PPPPPP....
..PP....P...
.EE.....EE..`,
  walk2: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...BSSSSB...
..BGGSSBBB..
..BBGWWBBB..
..BBBWRRBB..
..BBBBBRBB..
..BBBBBBBB..
...BBBBBB...
...PPPPPP...
....PPPPPP..
...P....PP..
..EE.....EE.`,
  jump: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
FF..SSSS..FF
.FBBSSSSBB..
...BGGSSBB..
...BBGWWBB..
...BBBWRRB..
...BBBBBRB..
...BBBBBBB..
...BBBBBB...
...BPPPPB...
...PP..PP...
...PP..PP...
..EE....EE..`,
  punch: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...BSSSSB.FF
..BGGSSBBBBF
..BBGWWBBB..
..BBBWRRBB..
..BBBBBRBB..
..BBBBBBBB..
...BBBBBB...
...PPPPPP...
...PP..PP...
...PP..PP...
...EE..EE...`,
  hurt: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FxFFxF...
...FxFFxF...
....FFFF....
.....SSSS...
....BSSSSB..
...BGGSSBB..
...BBGWWBB..
...BBBWRRB..
...BBBBBRB..
...BBBBBBB..
....BBBBBB..
....PPPPPP..
....PP..PP..
....PP..PP..
...EE..EE...`
};
const heroPal = {
  H: C.presidentHair, F: C.heroSkin, K: C.black,
  S: C.presidentShirt, B: C.presidentSuit,
  G: C.sashGreen, W: C.sashWhite, R: C.sashRed,
  P: C.presidentSuit, E: C.black,
  x: C.sashRed
};

// Morezombi
const zombieSprites = {
  walk1: `
....HHHH....
...HSSSSH...
...SSKSSK...
...SSSSSS...
...SSKKSS...
....SSSS....
.....CC.....
....CCCC....
...VWWWWV...
..VVWWWWVV..
..VVVVVVVV..
..VVVVVVVV..
...VWWWWV...
....SSSS....
....JJJJ....
...JJJJJJ...
...JJ..JJ...
...JJ..JJ...`,
  walk2: `
....HHHH....
...HSSSSH...
...SSKSSK...
...SSSSSS...
...SSKKSS...
....SSSS....
.....CC.....
....CCCC....
...VWWWWV...
..VVWWWWVV..
..VVVVVVVV..
..VVVVVVVV..
...VWWWWV...
....SSSS....
....JJJJ....
....JJJJ....
...JJ...J...
..JJ....JJ..`,
  attack: `
....HHHH....
...HSSSSH...
...SSKSSK...
...SSSSSS...
...SSKKSS...
....SSSS....
.....CC.....
....CCCC....
.SSVWWWWV...
SCSVVWWWWVV.
.S.VVVVVVVV.
...VVVVVVVV.
...VWWWWV...
....SSSS....
....JJJJ....
...JJJJJJ...
...JJ..JJ...
...JJ..JJ...`,
  hurt: `
....HHHH....
...HSSSSH....
...SSKSSK....
...SSSSSS....
...SSKKSS....
....SSSS.....
....CC.......
...CCCC......
..VWWWWV.....
.VVWWWWVV....
.VVVVVVVV....
.VVVVVVVV....
..VWWWWV.....
...SSSS......
...JJJJ......
..JJJJJJ.....
..JJ..JJ.....
..JJ..JJ.....`,
  die: `
............
............
............
....HHHH....
...HSSSSH...
...SSKSSK...
...SSSSSS...
....SSSS....
..VVVVVVVV..
.VVVVVVVVVV.
.VVVVVVVVVV.
.VWWWWWWWWV.
.VVVVVVVVVV.
.JJJJJJJJJJ.
.JJJJJJJJJJ.
............
............
............`
};
const zombiePal = {
  H: C.zHair, S: C.zSkin, K: C.zEye, C: C.zSkinDark,
  V: C.zVest, W: C.zShirt, J: C.zJeans
};

// ============================================================
// JEFES FINALES (3 enemigos finales con guayaberas)
// ============================================================

// JEFE 1: Canoso, guayabera blanca, pantalón gris
const boss1Sprites = {
  walk1: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...WWWWWW...
..WPPWWPPW..
..WPPWWPPW..
..WWWWWWWW..
..WWWWWWWW..
..WWWWWWWW..
...WWWWWW...
...GGGGGG...
...GG..GG...
...GG..GG...
...EE..EE...`,
  walk2: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...WWWWWW...
..WPPWWPPW..
..WPPWWPPW..
..WWWWWWWW..
..WWWWWWWW..
..WWWWWWWW..
...WWWWWW...
...GGGGGG...
..GGGGGG....
..GG....G...
.EE.....EE..`,
  attack: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...WWWWWW.FF
..WPPWWPWWFF
..WPPWWPPW..
..WWWWWWWW..
..WWWWWWWW..
..WWWWWWWW..
...WWWWWW...
...GGGGGG...
...GG..GG...
...GG..GG...
...EE..EE...`,
  hurt: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FxFFxF...
...FxFFxF...
....FFFF....
.....SSSS...
....WWWWWW..
...WPPWWPP..
...WPPWWPP..
...WWWWWWW..
...WWWWWWW..
...WWWWWWW..
....WWWWWW..
....GGGGGG..
....GG..GG..
....GG..GG..
...EE..EE...`,
  die: `
............
............
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
....FFFF....
..WWWWWWWW..
.WWPPWWPPWW.
.WWWWWWWWWW.
.WWWWWWWWWW.
.GGGGGGGGGG.
.GGGGGGGGGG.
............
............
............
............
............`
};
const boss1Pal = {
  H: C.bossHair, F: C.bossSkin, K: C.black, S: C.guayabera,
  W: C.guayabera, P: C.guayaPocket,
  G: C.bossPants, E: C.bossShoes, x: C.embRed
};

// JEFE 2: Canoso con lentes, guayabera con bordado rojo, jeans
const boss2Sprites = {
  walk1: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FLLLLLF..
...FKLLKLF..
....FFFF....
....SSSS....
...WWWWWW...
..WWRRRRWW..
..WWRWWRWW..
..WWRRRRWW..
..WWWRWWWW..
..WWWWWWWW..
...WWWWWW...
...JJJJJJ...
...JJ..JJ...
...JJ..JJ...
...EE..EE...`,
  walk2: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FLLLLLF..
...FKLLKLF..
....FFFF....
....SSSS....
...WWWWWW...
..WWRRRRWW..
..WWRWWRWW..
..WWRRRRWW..
..WWWRWWWW..
..WWWWWWWW..
...WWWWWW...
...JJJJJJ...
..JJJJJJ....
..JJ....J...
.EE.....EE..`,
  attack: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FLLLLLF..
...FKLLKLF..
....FFFF....
....SSSS....
...WWWWWW.FF
..WWRRRRWWFF
..WWRWWRWW..
..WWRRRRWW..
..WWWRWWWW..
..WWWWWWWW..
...WWWWWW...
...JJJJJJ...
...JJ..JJ...
...JJ..JJ...
...EE..EE...`,
  hurt: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FLLLLLF..
...FxLLxLF..
....FFFF....
.....SSSS...
....WWWWWW..
...WWRRRRW..
...WWRWWRW..
...WWRRRRW..
...WWWRWWW..
...WWWWWWW..
....WWWWWW..
....JJJJJJ..
....JJ..JJ..
....JJ..JJ..
...EE..EE...`,
  die: `
............
............
....HHHH....
...HHHHHH...
...HFFFFH...
...FLLLLLF..
....FFFF....
..WWWWWWWW..
.WWWRRRRWWW.
.WWWWWWWWWW.
.WWWWWWWWWW.
.JJJJJJJJJJ.
.JJJJJJJJJJ.
............
............
............
............
............`
};
const boss2Pal = {
  H: C.bossHair, F: C.bossSkin, K: C.black, S: C.guayabera,
  W: C.guayabera, R: C.embRed, L: C.glasses,
  J: C.bossJeans, E: C.bossShoes, x: C.embRed
};

// JEFE 3: Mujer pelo oscuro recogido, blusa con bordado de colores
const boss3Sprites = {
  walk1: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...WWWWWW...
..WWGYRBWW..
..WWBRYGWW..
..WWYBGRWW..
..WWRYBGWW..
..WWWWWWWW..
...WWWWWW...
...WWWWWW...
...WW..WW...
...WW..WW...
...EE..EE...`,
  walk2: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...WWWWWW...
..WWGYRBWW..
..WWBRYGWW..
..WWYBGRWW..
..WWRYBGWW..
..WWWWWWWW..
...WWWWWW...
...WWWWWW...
..WWWWWW....
..WW....W...
.EE.....EE..`,
  attack: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
...FKFFKF...
....FFFF....
....SSSS....
...WWWWWW.FF
..WWGYRBWWFF
..WWBRYGWW..
..WWYBGRWW..
..WWRYBGWW..
..WWWWWWWW..
...WWWWWW...
...WWWWWW...
...WW..WW...
...WW..WW...
...EE..EE...`,
  hurt: `
....HHHH....
...HHHHHH...
...HFFFFH...
...FxFFxF...
...FxFFxF...
....FFFF....
.....SSSS...
....WWWWWW..
...WWGYRBW..
...WWBRYGW..
...WWYBGRW..
...WWRYBGW..
...WWWWWWW..
....WWWWWW..
....WWWWWW..
....WW..WW..
....WW..WW..
...EE..EE...`,
  die: `
............
............
....HHHH....
...HHHHHH...
...HFFFFH...
...FKFFKF...
....FFFF....
..WWWWWWWW..
.WWGYRBYGWW.
.WWBRYGRBWW.
.WWWWWWWWWW.
.WWWWWWWWWW.
.WWWWWWWWWW.
............
............
............
............
............`
};
const boss3Pal = {
  H: C.bossWomanHair, F: C.bossSkin, K: C.black, S: C.guayabera,
  W: C.guayabera,
  G: C.embGreen, Y: C.embYellow, R: C.embRed, B: C.embBlue,
  E: C.bossShoes, x: C.embRed
};

const bossSprites = { boss1: boss1Sprites, boss2: boss2Sprites, boss3: boss3Sprites };
const bossPals = { boss1: boss1Pal, boss2: boss2Pal, boss3: boss3Pal };
const bossNames = { boss1: 'EL CABALLERO', boss2: 'EL SABIO', boss3: 'LA DAMA' };

// ============================================================
// ENTIDADES
// ============================================================

// Física vertical compartida: gravedad + suelo + plataformas (top-solid)
function applyVerticalPhysics(e) {
  const feetPrev = e.y + e.h;
  e.vy += GRAVITY;
  e.y += e.vy;
  const feetNow = e.y + e.h;
  e.onGround = false;

  if (feetNow >= GROUND_Y) {
    e.y = GROUND_Y - e.h;
    e.vy = 0;
    e.onGround = true;
    return;
  }
  // Plataformas: solo aterrizar cayendo desde arriba
  if (e.vy >= 0) {
    for (const pl of platforms) {
      const overlapX = e.x + e.w > pl.x + 2 && e.x < pl.x + pl.w - 2;
      if (!overlapX) continue;
      if (feetPrev <= pl.y + 2 && feetNow >= pl.y) {
        e.y = pl.y - e.h;
        e.vy = 0;
        e.onGround = true;
        return;
      }
    }
  }
}

function damageEnemy(e, dmg, knockback) {
  e.hp -= dmg;
  e.hurtTimer = 14;
  e.flash = 8;
  e.vx = knockback;
  spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.blood, 8);
  screenShake = 4;
  sfx.hit();
  if (e.hp <= 0) {
    e.dead = true;
    e.deathTimer = 40;
    player.score += (e.score || 100);
    const partColor = e.kind === 'zombie' ? C.zSkinDark : C.embRed;
    spawnParticle(e.x + e.w / 2, e.y + e.h / 2, partColor, 12);
    sfx.zombieDie();
  }
}

function damagePlayer(dmg, knockbackDir) {
  if (player.invuln > 0) return;
  player.hp -= dmg;
  player.hurtTimer = 20;
  player.invuln = 60;
  player.flash = 30;
  player.vx = knockbackDir * 5;
  player.vy = -3;
  player.onGround = false;
  screenShake = 8;
  sfx.hurt();
  spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.blood, 6);
  if (player.hp <= 0) {
    player.lives--;
    if (player.lives <= 0) {
      state = 'gameover';
      gameOverTimer = 0;
      sfx.gameOver();
    } else {
      player.hp = player.maxHp;
      player.invuln = 120;
    }
  }
}

function makePlayer() {
  return {
    x: 60, y: GROUND_Y - 54,
    vx: 0, vy: 0,
    w: 24, h: 54, // hitbox
    facing: 1,
    state: 'idle', // idle, walk, jump, punch, hurt
    animTimer: 0,
    animFrame: 0,
    punchTimer: 0,
    hurtTimer: 0,
    invuln: 0,
    onGround: true,
    hp: 5, maxHp: 5,
    lives: 3,
    score: 0,
    flash: 0,
    throwCooldown: 0
  };
}

function makeZombie(x) {
  return {
    x: x, y: GROUND_Y - 54,
    vx: 0, vy: 0,
    w: 24, h: 54,
    facing: -1,
    state: 'walk',
    animTimer: 0, animFrame: 0,
    attackTimer: 0,
    hurtTimer: 0,
    deathTimer: 0,
    hp: 2,
    maxHp: 2,
    speed: 0.5 + Math.random() * 0.4,
    flash: 0,
    dead: false,
    kind: 'zombie',
    score: 100,
    jumpCooldown: 120 + Math.random() * 180,
    onGround: true
  };
}

function makeBoss(x, kind) {
  return {
    x: x, y: GROUND_Y - 54,
    vx: 0, vy: 0,
    w: 24, h: 54,
    facing: -1,
    state: 'walk',
    animTimer: 0, animFrame: 0,
    attackTimer: 0,
    hurtTimer: 0,
    deathTimer: 0,
    hp: 6,
    maxHp: 6,
    speed: 0.55 + Math.random() * 0.3,
    flash: 0,
    dead: false,
    kind: kind,
    score: 500,
    throwCooldown: 90 + Math.random() * 90,
    jumpCooldown: 60 + Math.random() * 120,
    onGround: true
  };
}

function spawnParticle(x, y, color, count = 6, kind = 'blood') {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 1,
      life: 30 + Math.random() * 20,
      color, kind
    });
  }
}

// ============================================================
// ESTADO DE JUEGO
// ============================================================

let state = 'title';
let player = makePlayer();
let enemies = [];
let particles = [];
let camera = { x: 0 };
let wave = 1;
const maxWaves = 5;
let waveTimer = 0;
let waveBanner = 0;
let titleAnim = 0;
let gameOverTimer = 0;
let winTimer = 0;
let toSpawn = 0;
let spawnCooldown = 0;
let screenShake = 0;
let bossesToSpawn = [];
let projectiles = [];

function isBossWave(w) { return w === maxWaves; }

function startGame() {
  player = makePlayer();
  enemies = [];
  particles = [];
  projectiles = [];
  camera.x = 0;
  wave = 1;
  waveBanner = 120;
  setupWave(wave);
  state = 'playing';
  sfx.start();
}

function enemiesForWave(w) {
  return 2 + w;
}

function setupWave(w) {
  if (isBossWave(w)) {
    toSpawn = 0;
    bossesToSpawn = ['boss1', 'boss2', 'boss3'];
  } else {
    toSpawn = enemiesForWave(w);
    bossesToSpawn = [];
  }
  spawnCooldown = 60;
}

function nextWave() {
  wave++;
  if (wave > maxWaves) {
    state = 'win';
    winTimer = 0;
    sfx.win();
    return;
  }
  waveBanner = isBossWave(wave) ? 180 : 120;
  setupWave(wave);
  sfx.wave();
  // bonus hp pequeño
  player.hp = Math.min(player.maxHp, player.hp + 2);
}

// ============================================================
// LÓGICA
// ============================================================

function update() {
  if (state === 'title') {
    titleAnim++;
    if (pressed('enter', ' ', 'z', 'x')) {
      startGame();
    }
    clearOnce();
    return;
  }

  if (state === 'gameover') {
    gameOverTimer++;
    if (gameOverTimer > 60 && pressed('enter', ' ', 'z', 'x')) {
      state = 'title';
      titleAnim = 0;
    }
    clearOnce();
    return;
  }

  if (state === 'win') {
    winTimer++;
    if (winTimer > 120 && pressed('enter', ' ', 'z', 'x')) {
      state = 'title';
      titleAnim = 0;
    }
    clearOnce();
    return;
  }

  // ----- PLAYING -----
  if (waveBanner > 0) waveBanner--;

  updatePlayer();
  updateEnemies();
  updateProjectiles();
  updateParticles();
  updateCamera();
  updateSpawning();

  if (screenShake > 0) screenShake--;

  clearOnce();
}

function updatePlayer() {
  const p = player;
  if (p.invuln > 0) p.invuln--;
  if (p.flash > 0) p.flash--;
  if (p.hurtTimer > 0) p.hurtTimer--;

  // movimiento horizontal
  let moving = false;
  if (p.state !== 'hurt' && p.punchTimer === 0) {
    if (held('arrowleft', 'a')) {
      p.vx = -2.2;
      p.facing = -1;
      moving = true;
    } else if (held('arrowright', 'd')) {
      p.vx = 2.2;
      p.facing = 1;
      moving = true;
    } else {
      p.vx *= 0.6;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // saltar
    if (pressed('z', 'arrowup', 'w') && p.onGround) {
      p.vy = -10;
      p.onGround = false;
      sfx.jump();
    }
    // golpe melee
    if (pressed('x', ' ') && p.punchTimer === 0) {
      p.punchTimer = 18;
      sfx.punch();
      // hitbox de golpe
      const hx = p.x + (p.facing > 0 ? p.w : -20);
      const hy = p.y + 18;
      const hw = 24, hh = 24;
      for (const e of enemies) {
        if (e.dead) continue;
        if (e.x + e.w > hx && e.x < hx + hw &&
            e.y + e.h > hy && e.y < hy + hh) {
          damageEnemy(e, 1, p.facing * 3);
        }
      }
    }
    // ataque a distancia (Decreto presidencial)
    if (pressed('c') && p.throwCooldown <= 0) {
      p.throwCooldown = 24;
      p.punchTimer = 12;
      sfx.throwShot();
      projectiles.push({
        x: p.x + (p.facing > 0 ? p.w - 4 : -4),
        y: p.y + 22,
        vx: p.facing * 7, vy: 0,
        w: 12, h: 8,
        owner: 'player',
        kind: 'decree',
        life: 90
      });
    }
  } else {
    p.vx *= 0.6;
  }

  if (p.punchTimer > 0) p.punchTimer--;
  if (p.throwCooldown > 0) p.throwCooldown--;

  // física vertical con plataformas
  p.x += p.vx;
  applyVerticalPhysics(p);

  // límites
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > WORLD_W) p.x = WORLD_W - p.w;

  // estado para animación
  if (p.hurtTimer > 0) p.state = 'hurt';
  else if (p.punchTimer > 0) p.state = 'punch';
  else if (!p.onGround) p.state = 'jump';
  else if (moving) p.state = 'walk';
  else p.state = 'idle';

  p.animTimer++;
  if (p.animTimer > 10) {
    p.animTimer = 0;
    p.animFrame = (p.animFrame + 1) % 2;
  }
}

function updateEnemies() {
  for (const e of enemies) {
    if (e.flash > 0) e.flash--;
    if (e.dead) {
      e.deathTimer--;
      e.vy += GRAVITY * 0.5;
      e.y += e.vy;
      if (e.y + e.h > GROUND_Y) {
        e.y = GROUND_Y - e.h;
        e.vy = 0;
      }
      continue;
    }

    if (e.throwCooldown > 0) e.throwCooldown--;
    if (e.jumpCooldown > 0) e.jumpCooldown--;

    if (e.hurtTimer > 0) {
      e.hurtTimer--;
      e.x += e.vx;
      e.vx *= 0.8;
      applyVerticalPhysics(e);
      continue;
    }

    // IA: caminar hacia el jugador, atacar cerca o disparar lejos
    const dx = (player.x + player.w / 2) - (e.x + e.w / 2);
    const dy = (player.y + player.h / 2) - (e.y + e.h / 2);
    e.facing = dx > 0 ? 1 : -1;
    const adx = Math.abs(dx);
    const isBoss = e.kind !== 'zombie';

    if (e.attackTimer > 0) {
      e.attackTimer--;
      // golpear al final del ataque melee
      if (e.attackTimer === 8 && !e.isThrowing) {
        const hx = e.x + (e.facing > 0 ? e.w : -18);
        const hy = e.y + 20;
        const hw = 20, hh = 24;
        if (player.x + player.w > hx && player.x < hx + hw &&
            player.y + player.h > hy && player.y < hy + hh) {
          damagePlayer(1, e.facing);
        }
      }
      // soltar proyectil de jefe
      if (e.attackTimer === 14 && e.isThrowing) {
        projectiles.push({
          x: e.x + (e.facing > 0 ? e.w - 4 : -4),
          y: e.y + 20,
          vx: e.facing * 4.2, vy: 0,
          w: 12, h: 10,
          owner: 'boss',
          kind: 'book',
          life: 140
        });
        sfx.bossShot();
        e.isThrowing = false;
      }
    } else if (adx < 30 && Math.abs(dy) < 30) {
      // ataque melee
      e.attackTimer = 30;
      e.vx = 0;
    } else if (isBoss && e.throwCooldown <= 0 && adx > 90 && adx < 340 && Math.abs(dy) < 60) {
      // ataque a distancia (solo jefes)
      e.attackTimer = 30;
      e.isThrowing = true;
      e.vx = 0;
      e.throwCooldown = 110 + Math.random() * 70;
    } else {
      // caminar; saltar de vez en cuando para alcanzar plataformas
      e.vx = e.facing * e.speed;
      if (e.onGround && e.jumpCooldown <= 0 && dy < -20 && adx < 220) {
        e.vy = -9;
        e.jumpCooldown = 90 + Math.random() * 90;
      } else if (e.onGround && e.jumpCooldown <= 0 && Math.random() < 0.01) {
        e.vy = isBoss ? -8.5 : -7;
        e.jumpCooldown = 150 + Math.random() * 150;
      }
    }

    e.x += e.vx;
    applyVerticalPhysics(e);

    e.animTimer++;
    if (e.animTimer > 14) {
      e.animTimer = 0;
      e.animFrame = (e.animFrame + 1) % 2;
    }
  }
  // remover muertos
  enemies = enemies.filter(e => !(e.dead && e.deathTimer <= 0));

  // check fin de oleada
  if (toSpawn === 0 && bossesToSpawn.length === 0 && enemies.length === 0 && state === 'playing' && waveBanner === 0) {
    nextWave();
  }
}

function updateSpawning() {
  if (toSpawn > 0) {
    spawnCooldown--;
    if (spawnCooldown <= 0 && enemies.filter(e => !e.dead).length < 4) {
      // spawn desde un lado
      const fromLeft = Math.random() < 0.4;
      const sx = fromLeft
        ? Math.max(camera.x - 30, 0)
        : Math.min(camera.x + W + 30, WORLD_W - 30);
      enemies.push(makeZombie(sx));
      toSpawn--;
      spawnCooldown = 70 + Math.random() * 60;
    }
  }
  if (bossesToSpawn.length > 0 && waveBanner < 60) {
    spawnCooldown--;
    if (spawnCooldown <= 0) {
      const kind = bossesToSpawn.shift();
      const fromLeft = bossesToSpawn.length === 1;
      const sx = fromLeft
        ? Math.max(camera.x - 30, 10)
        : Math.min(camera.x + W + 30, WORLD_W - 30);
      enemies.push(makeBoss(sx, kind));
      spawnCooldown = 90;
    }
  }
}

function updateProjectiles() {
  for (const pr of projectiles) {
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;
    if (pr.owner === 'player') {
      for (const e of enemies) {
        if (e.dead) continue;
        if (pr.x + pr.w > e.x && pr.x < e.x + e.w &&
            pr.y + pr.h > e.y + 8 && pr.y < e.y + e.h - 4) {
          damageEnemy(e, 1, (pr.vx > 0 ? 1 : -1) * 2);
          pr.life = 0;
          break;
        }
      }
    } else if (pr.owner === 'boss') {
      const pl = player;
      if (pl.invuln === 0 &&
          pr.x + pr.w > pl.x && pr.x < pl.x + pl.w &&
          pr.y + pr.h > pl.y + 8 && pr.y < pl.y + pl.h - 4) {
        damagePlayer(1, pr.vx > 0 ? 1 : -1);
        pr.life = 0;
      }
    }
    // fuera de cámara
    const sx = pr.x - camera.x;
    if (sx < -30 || sx > W + 30) pr.life = 0;
  }
  projectiles = projectiles.filter(p => p.life > 0);
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}

function updateCamera() {
  // cámara sigue al jugador con margen
  const target = player.x - W / 2 + player.w / 2;
  camera.x += (target - camera.x) * 0.1;
  if (camera.x < 0) camera.x = 0;
  if (camera.x > WORLD_W - W) camera.x = WORLD_W - W;
}

// ============================================================
// RENDER
// ============================================================

function render() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake,
      (Math.random() - 0.5) * screenShake
    );
  }

  // Cámara fija sobre la catedral en el title
  const bgCam = (state === 'title') ? 400 : camera.x;
  drawSky();
  drawClouds(bgCam);
  drawDistantCity(bgCam);
  drawCathedral(bgCam);
  drawPalms(bgCam);
  drawPlaza(bgCam);
  if (state !== 'title') drawPlatforms(camera.x);

  // entidades solo en juego
  if (state !== 'title') {
    drawEntities();
    drawProjectiles();
    drawParticles();
  }

  ctx.restore();

  // HUD on top (no shake)
  drawHUD();

  if (state === 'title') drawTitle();
  else if (state === 'gameover') drawGameOver();
  else if (state === 'win') drawWin();
  else if (waveBanner > 0) drawWaveBanner();
}

function drawPlatforms(camX) {
  for (const p of platforms) {
    const x = p.x - camX;
    if (x + p.w < 0 || x > W) continue;
    // losa superior
    px(x, p.y, p.w, 4, C.cathedralCream);
    px(x, p.y + 4, p.w, 2, C.cathedralShade);
    px(x, p.y + 6, p.w, 1, C.cathedralPinkDark);
    // ménsulas/soportes
    px(x + 4,        p.y + 7, 3, 10, C.cathedralPinkDark);
    px(x + p.w - 7,  p.y + 7, 3, 10, C.cathedralPinkDark);
    // barandilla puntos
    for (let i = 6; i < p.w - 6; i += 8) {
      px(x + i, p.y - 4, 2, 4, C.cathedralPinkDark);
    }
  }
}

function drawProjectiles() {
  for (const pr of projectiles) {
    const sx = (pr.x - camera.x) | 0;
    const sy = pr.y | 0;
    if (pr.kind === 'decree') {
      // Decreto enrollado con banda tricolor
      px(sx, sy + 1, 12, 7, C.cathedralCream);
      px(sx, sy + 3, 12, 1, C.sashGreen);
      px(sx, sy + 4, 12, 1, C.sashWhite);
      px(sx, sy + 5, 12, 1, C.sashRed);
      px(sx, sy + 1, 12, 1, C.cathedralShade);
      px(sx, sy + 7, 12, 1, C.cathedralPinkDark);
      // estela
      const trail = pr.vx > 0 ? -6 : 14;
      px(sx + trail, sy + 3, 4, 1, C.cathedralCream);
      px(sx + trail, sy + 5, 4, 1, C.cathedralCream);
    } else if (pr.kind === 'book') {
      // Libro rojo con filo dorado
      px(sx, sy, 12, 10, C.embRed);
      px(sx, sy, 12, 2, C.medalGold);
      px(sx, sy + 8, 12, 2, C.medalGold);
      px(sx + 5, sy + 3, 2, 4, C.guayabera);
      const trail = pr.vx > 0 ? -5 : 13;
      px(sx + trail, sy + 4, 4, 1, C.embRed);
    }
  }
}

function drawEntities() {
  // Enemigos primero (atrás del jugador si están más alto)
  const all = [...enemies, player];
  all.sort((a, b) => a.y - b.y);
  for (const e of all) {
    if (e === player) drawPlayer(player);
    else drawZombie(e);
  }
}

function drawPlayer(p) {
  if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return;
  let spr = heroSprites.idle;
  if (p.state === 'hurt') spr = heroSprites.hurt;
  else if (p.state === 'punch') spr = heroSprites.punch;
  else if (p.state === 'jump') spr = heroSprites.jump;
  else if (p.state === 'walk') spr = (p.animFrame === 0) ? heroSprites.walk1 : heroSprites.walk2;
  const sx = p.x - camera.x;
  drawSprite(spr, sx, p.y, heroPal, PX, p.facing === -1);
}

function drawZombie(z) {
  const isBoss = z.kind !== 'zombie';
  const sprites = isBoss ? bossSprites[z.kind] : zombieSprites;
  const palette = isBoss ? bossPals[z.kind] : zombiePal;

  if (z.flash > 0 && z.flash % 2 === 0) {
    // flash blanco al recibir daño
    const pal = { ...palette };
    for (const k in pal) pal[k] = C.white;
    let spr = z.dead ? sprites.die : sprites.walk1;
    const sx = z.x - camera.x;
    drawSprite(spr, sx, z.y, pal, PX, z.facing === -1);
    return;
  }
  let spr;
  if (z.dead) spr = sprites.die;
  else if (z.hurtTimer > 0) spr = sprites.hurt;
  else if (z.attackTimer > 0 && z.attackTimer < 20) spr = sprites.attack;
  else spr = (z.animFrame === 0) ? sprites.walk1 : sprites.walk2;
  const sx = z.x - camera.x;
  drawSprite(spr, sx, z.y, palette, PX, z.facing === -1);

  if (!z.dead && z.kind === 'zombie' && z.attackTimer === 0) {
    // Latita de mezcal en mano (decoración del morezombi)
    const cx = sx + (z.facing > 0 ? 33 : -8);
    const cy = z.y + 33;
    px(cx, cy, 5, 8, C.zCan);
    px(cx, cy, 5, 2, C.zCanDark);
    px(cx + 1, cy + 3, 3, 1, C.white);
  }

  // Barra de vida sobre el jefe
  if (isBoss && !z.dead) {
    const bx = sx, by = z.y - 6;
    const bw = 36;
    px(bx, by, bw, 4, C.black);
    px(bx + 1, by + 1, bw - 2, 2, C.bloodDark);
    const fill = Math.max(0, ((bw - 2) * z.hp / z.maxHp) | 0);
    px(bx + 1, by + 1, fill, 2, C.hudG);
  }
}

function drawParticles() {
  for (const p of particles) {
    const sx = p.x - camera.x;
    const alpha = Math.min(1, p.life / 40);
    ctx.globalAlpha = alpha;
    px(sx | 0, p.y | 0, 3, 3, p.color);
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// HUD
// ============================================================

function drawHUD() {
  if (state === 'title') return;

  // panel superior
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle = C.hudR;
  ctx.fillRect(0, 35, W, 1);

  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';

  // Corazones (vida)
  ctx.fillStyle = C.white;
  ctx.fillText('VIDA', 8, 6);
  for (let i = 0; i < player.maxHp; i++) {
    drawHeart(48 + i * 14, 6, i < player.hp);
  }

  // Vidas
  ctx.fillStyle = C.white;
  ctx.fillText('VIDAS', 8, 20);
  for (let i = 0; i < player.lives; i++) {
    drawMiniHero(56 + i * 12, 20);
  }

  // Wave
  ctx.fillStyle = C.hudY;
  ctx.fillText('OLEADA ' + wave + '/' + maxWaves, 220, 6);

  // Score
  ctx.fillStyle = C.hudG;
  ctx.fillText('SCORE', 380, 6);
  ctx.fillStyle = C.white;
  ctx.fillText(String(player.score).padStart(6, '0'), 380, 20);
}

function drawHeart(x, y, full) {
  const col = full ? C.hudR : '#404040';
  px(x + 1, y, 3, 2, col);
  px(x + 6, y, 3, 2, col);
  px(x, y + 2, 10, 3, col);
  px(x + 1, y + 5, 8, 2, col);
  px(x + 3, y + 7, 4, 1, col);
  px(x + 4, y + 8, 2, 1, col);
}

function drawMiniHero(x, y) {
  // mini-sprite del Presidente
  px(x + 3, y, 4, 2, C.presidentHair);
  px(x + 2, y + 2, 6, 2, C.heroSkin);
  px(x + 3, y + 3, 1, 1, C.black);
  px(x + 6, y + 3, 1, 1, C.black);
  px(x + 3, y + 5, 4, 1, C.presidentShirt);
  px(x + 2, y + 6, 6, 3, C.presidentSuit);
  px(x + 3, y + 6, 1, 1, C.sashGreen);
  px(x + 4, y + 7, 1, 1, C.sashWhite);
  px(x + 5, y + 8, 1, 1, C.sashRed);
  px(x + 2, y + 9, 6, 3, C.presidentSuit);
}

// ============================================================
// PANTALLAS
// ============================================================

function drawTitle() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // Título grande
  ctx.font = '28px "Press Start 2P", monospace';
  ctx.fillStyle = C.heroMaskR;
  ctx.fillText('MOREZOMBI', W / 2 + 3, 80 + 3);
  ctx.fillStyle = C.hudY;
  ctx.fillText('MOREZOMBI', W / 2, 80);

  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = C.white;
  ctx.fillText('LA CATEDRAL MALDITA', W / 2, 120);

  // Presidente vs morezombi + jefes
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = C.hudG;
  ctx.fillText('EL PRESIDENTE', W / 2 - 120, 140);
  ctx.fillStyle = C.embRed;
  ctx.fillText('VS', W / 2 - 35, 140);
  ctx.fillText('JEFES DE MORENA', W / 2 + 70, 140);

  drawSprite(heroSprites.idle, W / 2 - 138, 150, heroPal, PX, false);
  drawSprite(zombieSprites.walk1, W / 2 - 95, 150, zombiePal, PX, false);
  drawSprite(boss1Sprites.walk1, W / 2 + 5, 150, boss1Pal, PX, true);
  drawSprite(boss2Sprites.walk1, W / 2 + 50, 150, boss2Pal, PX, true);
  drawSprite(boss3Sprites.walk1, W / 2 + 95, 150, boss3Pal, PX, true);

  // Press start (parpadeante)
  if (Math.floor(titleAnim / 30) % 2 === 0) {
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = C.hudG;
    ctx.fillText('PULSA ENTER PARA EMPEZAR', W / 2, 280);
  }

  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('FLECHAS:MOVER  Z:SALTAR  X:GOLPE  C:DECRETO', W / 2, 320);
  ctx.fillText('(C) 1993 MEXI-PIX', W / 2, 350);

  ctx.textAlign = 'left';
}

function drawWaveBanner() {
  const boss = isBossWave(wave);
  const total = boss ? 180 : 120;
  const a = waveBanner / total;
  ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`;
  ctx.fillRect(0, 140, W, 80);
  ctx.fillStyle = boss ? C.embRed : C.heroMaskR;
  ctx.fillRect(0, 140, W, 3);
  ctx.fillRect(0, 217, W, 3);

  ctx.textAlign = 'center';
  ctx.font = '18px "Press Start 2P", monospace';
  ctx.fillStyle = boss ? C.embRed : C.hudY;
  ctx.fillText(boss ? 'OLEADA FINAL' : 'OLEADA ' + wave, W / 2, 165);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = C.white;
  ctx.fillText(boss ? 'LLEGAN LOS JEFES DE MORENA' : 'LOS MOREZOMBIS ATACAN', W / 2, 195);
  ctx.textAlign = 'left';
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = C.heroMaskR;
  ctx.fillText('GAME OVER', W / 2, 140);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = C.white;
  ctx.fillText('EL PRESIDENTE HA CAIDO', W / 2, 180);
  ctx.fillText('LA CATEDRAL ESTA PERDIDA', W / 2, 205);
  ctx.fillStyle = C.hudG;
  ctx.fillText('SCORE FINAL: ' + String(player.score).padStart(6, '0'), W / 2, 240);
  if (gameOverTimer > 60 && Math.floor(gameOverTimer / 30) % 2 === 0) {
    ctx.fillStyle = C.hudY;
    ctx.fillText('PULSA ENTER PARA CONTINUAR', W / 2, 290);
  }
  ctx.textAlign = 'left';
}

function drawWin() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.fillStyle = C.hudY;
  ctx.fillText('VICTORIA!', W / 2, 90);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = C.white;
  ctx.fillText('EL PRESIDENTE SALVO LA CATEDRAL', W / 2, 130);
  ctx.fillText('MOREZOMBIS Y JEFES DE MORENA', W / 2, 155);
  ctx.fillText('FUERON DERROTADOS', W / 2, 175);
  ctx.fillStyle = C.hudG;
  ctx.fillText('SCORE FINAL: ' + String(player.score).padStart(6, '0'), W / 2, 215);
  drawSprite(heroSprites.idle, W / 2 - 18, 235, heroPal, PX, false);
  if (winTimer > 90 && Math.floor(winTimer / 30) % 2 === 0) {
    ctx.fillStyle = C.hudY;
    ctx.fillText('PULSA ENTER', W / 2, 310);
  }
  ctx.textAlign = 'left';
}

// ============================================================
// LOOP
// ============================================================

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();

})();
