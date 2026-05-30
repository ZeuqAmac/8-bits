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

// ---------- Niveles (campaña tipo plataformero) ----------
// Cada nivel define segmentos de suelo (todo lo demás es hueco/pit),
// plataformas saltables, enemigos pre-colocados, posición de la meta,
// y opcionalmente una pelea de jefes al final del nivel.
const HORDE_ARENA = {
  name: 'HORDA', width: 1600,
  ground: [[0, 1600]],
  platforms: [
    { x: 180,  y: GROUND_Y - 70, w: 78 },
    { x: 360,  y: GROUND_Y - 110, w: 70 },
    { x: 540,  y: GROUND_Y - 75, w: 80 },
    { x: 820,  y: GROUND_Y - 95, w: 90 },
    { x: 1040, y: GROUND_Y - 70, w: 78 },
    { x: 1240, y: GROUND_Y - 110, w: 70 },
    { x: 1420, y: GROUND_Y - 75, w: 80 }
  ],
  enemies: [], bosses: null, goal: null
};

const levels = [
  {
    name: 'EL ZOCALO',
    width: 1700,
    ground: [[0, 1700]],
    platforms: [
      { x: 260, y: GROUND_Y - 70, w: 78 },
      { x: 480, y: GROUND_Y - 100, w: 70 },
      { x: 740, y: GROUND_Y - 70, w: 80 },
      { x: 1020, y: GROUND_Y - 95, w: 80 },
      { x: 1320, y: GROUND_Y - 75, w: 80 }
    ],
    enemies: [
      { type: 'zombie', x: 360 },
      { type: 'zombie', x: 720 },
      { type: 'zombie', x: 1120 },
      { type: 'zombie', x: 1480 }
    ],
    goal: 1640
  },
  {
    name: 'EL JARDIN',
    width: 1900,
    ground: [
      [0, 460],
      [620, 360],
      [1080, 820]
    ],
    platforms: [
      { x: 230, y: GROUND_Y - 70, w: 70 },
      { x: 470, y: GROUND_Y - 80, w: 80 },
      { x: 720, y: GROUND_Y - 85, w: 80 },
      { x: 980, y: GROUND_Y - 80, w: 80 },
      { x: 1300, y: GROUND_Y - 85, w: 70 },
      { x: 1560, y: GROUND_Y - 70, w: 80 }
    ],
    enemies: [
      { type: 'zombie', x: 380 },
      { type: 'zombie', x: 800 },
      { type: 'zombie', x: 1250 },
      { type: 'zombie', x: 1500 },
      { type: 'zombie', x: 1750 }
    ],
    goal: 1840
  },
  {
    name: 'EL ATRIO',
    width: 2100,
    ground: [
      [0, 340],
      [470, 240],
      [780, 200],
      [1070, 290],
      [1440, 660]
    ],
    platforms: [
      { x: 190, y: GROUND_Y - 70, w: 70 },
      { x: 370, y: GROUND_Y - 95, w: 70 },
      { x: 590, y: GROUND_Y - 90, w: 70 },
      { x: 820, y: GROUND_Y - 95, w: 70 },
      { x: 1050, y: GROUND_Y - 85, w: 70 },
      { x: 1310, y: GROUND_Y - 85, w: 70 },
      { x: 1560, y: GROUND_Y - 75, w: 80 },
      { x: 1820, y: GROUND_Y - 90, w: 80 }
    ],
    enemies: [
      { type: 'zombie', x: 200 },
      { type: 'zombie', x: 540 },
      { type: 'zombie', x: 870 },
      { type: 'zombie', x: 1180 },
      { type: 'zombie', x: 1550 },
      { type: 'zombie', x: 1900 }
    ],
    goal: 2040
  },
  {
    name: 'LA CATEDRAL',
    width: 1400,
    ground: [[0, 1400]],
    platforms: [
      { x: 200, y: GROUND_Y - 80, w: 80 },
      { x: 470, y: GROUND_Y - 95, w: 80 },
      { x: 770, y: GROUND_Y - 80, w: 80 },
      { x: 1050, y: GROUND_Y - 95, w: 80 }
    ],
    enemies: [],
    bosses: ['boss1', 'boss2', 'boss3'],
    goal: null
  }
];

// Nivel activo (se asigna en startGame)
let currentLevel = HORDE_ARENA;
let levelIdx = 0;
let goalReached = false;
let levelIntroTimer = 0;

// Detecta si una posición (centerX) cae sobre suelo sólido
function isOnSolidGround(centerX) {
  for (const [gx, gw] of currentLevel.ground) {
    if (centerX >= gx && centerX <= gx + gw) return true;
  }
  return false;
}

// Compatibilidad: drawPlatforms y la física usan esto en lugar del const viejo
function levelPlatforms() { return currentLevel.platforms; }

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

// Activar UI tactil solo en dispositivos con touch real
const isTouch = (navigator.maxTouchPoints > 0)
  || window.matchMedia('(hover: none) and (pointer: coarse)').matches;
document.body.classList.toggle('is-touch', isTouch);

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

// ============================================================
// GAMEPAD API - soporta GameSir X2, Xbox, PS y otros estándar
// Mapeo:  D-pad/stick -> flechas  |  A -> saltar (Z)
//         B -> golpe (X)          |  X/Y -> decreto (C)
//         Start -> enter
// ============================================================
const padState = {};
let padConnected = false;
let padNotifyTimer = 0;
let padName = '';
function padPress(key, isDown) {
  if (isDown && !padState[key]) pressKey(key);
  else if (!isDown && padState[key]) releaseKey(key);
  padState[key] = !!isDown;
}
window.addEventListener('gamepadconnected', (e) => {
  padConnected = true;
  padName = (e.gamepad.id || 'GAMEPAD').toUpperCase().slice(0, 24);
  padNotifyTimer = 180;
  ensureAudio();
});
window.addEventListener('gamepaddisconnected', () => {
  padConnected = false;
  for (const k in padState) padPress(k, false);
});

function pollGamepad() {
  if (!navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  let pad = null;
  for (const p of pads) { if (p && p.connected) { pad = p; break; } }
  if (!pad) return;
  const ax = pad.axes[0] || 0;
  const ay = pad.axes[1] || 0;
  const left  = ax < -0.35 || (pad.buttons[14] && pad.buttons[14].pressed);
  const right = ax >  0.35 || (pad.buttons[15] && pad.buttons[15].pressed);
  const up    = ay < -0.35 || (pad.buttons[12] && pad.buttons[12].pressed);
  const down  = ay >  0.35 || (pad.buttons[13] && pad.buttons[13].pressed);
  const a = !!(pad.buttons[0] && pad.buttons[0].pressed);
  const b = !!(pad.buttons[1] && pad.buttons[1].pressed);
  const x = !!(pad.buttons[2] && pad.buttons[2].pressed);
  const y = !!(pad.buttons[3] && pad.buttons[3].pressed);
  const start = !!(pad.buttons[9] && pad.buttons[9].pressed);
  const select = !!(pad.buttons[8] && pad.buttons[8].pressed);

  padPress('arrowleft',  !!left);
  padPress('arrowright', !!right);
  padPress('arrowup',    !!up);
  padPress('arrowdown',  !!down);
  padPress('z', a || up);         // A o D-pad arriba = saltar
  padPress('x', b);                // B = golpe
  padPress('c', x || y);          // X o Y = decreto
  padPress('enter', start || select);
}

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

// ============================================================
// MUSICA chiptune de fondo (épica/aventura)
// Loop de 16 compases con melodía + bajo, programada por adelantado
// ============================================================
const NOTE = {
  REST: 0,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  A2: 110.00, B2: 123.47, E2:  82.41, F2:  87.31, G2:  98.00, C6: 1046.50
};
const TEMPO_BPM = 138;
const EIGHTH = 60 / TEMPO_BPM / 2;
// Melodía (Am - F - C - G ... pegajoso, estilo aventura)
const MELODY = [
  'A4','C5','E5','A5', 'G5','E5','A4','C5',
  'F4','A4','C5','F5', 'E5','C5','A4','F4',
  'C4','E4','G4','C5', 'B4','G4','C5','E5',
  'G3','B3','D4','G4', 'F4','D4','G4','B4',
  'A4','C5','E5','A5', 'G5','E5','D5','C5',
  'F4','A4','C5','F5', 'E5','C5','B4','A4',
  'C4','E4','G4','C5', 'D5','E5','D5','C5',
  'B4','G4','E4','G4', 'A4','REST','A4','REST'
];
const BASS = [
  'A2','REST','A2','E3', 'A2','REST','A2','E3',
  'F2','REST','F2','C3', 'F2','REST','F2','C3',
  'C3','REST','C3','G3', 'C3','REST','C3','G3',
  'G2','REST','G2','D3', 'G2','REST','G2','D3',
  'A2','REST','A2','E3', 'A2','REST','A2','E3',
  'F2','REST','F2','C3', 'F2','REST','F2','C3',
  'C3','REST','C3','G3', 'C3','REST','E3','G3',
  'E2','REST','E2','B2', 'A2','REST','A2','REST'
];
let musicGain = null;
let musicNextTime = 0;
let musicLoopHandle = null;
let musicEnabled = true;
let musicStartIdx = 0;

function musicNote(freq, when, dur, type, vol) {
  if (!actx || !freq) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.005);
  g.gain.setValueAtTime(vol * 0.9, when + dur - 0.04);
  g.gain.linearRampToValueAtTime(0, when + dur);
  o.connect(g); g.connect(musicGain);
  o.start(when);
  o.stop(when + dur);
}

function scheduleMusic() {
  if (!actx || !musicEnabled) return;
  const lookahead = 0.15;
  while (musicNextTime < actx.currentTime + lookahead) {
    const i = musicStartIdx % MELODY.length;
    const mel = NOTE[MELODY[i]];
    const bas = NOTE[BASS[i]];
    musicNote(mel, musicNextTime, EIGHTH * 0.9, 'square',   0.04);
    musicNote(bas, musicNextTime, EIGHTH * 0.95, 'triangle', 0.06);
    musicStartIdx++;
    musicNextTime += EIGHTH;
  }
}

function startMusic() {
  if (!musicEnabled) return;
  ensureAudio();
  if (!actx) return;
  if (musicLoopHandle) return;
  if (!musicGain) {
    musicGain = actx.createGain();
    musicGain.gain.value = 0.55;
    musicGain.connect(actx.destination);
  }
  musicStartIdx = 0;
  musicNextTime = actx.currentTime + 0.1;
  musicLoopHandle = setInterval(scheduleMusic, 60);
}

function stopMusic() {
  if (musicLoopHandle) { clearInterval(musicLoopHandle); musicLoopHandle = null; }
  if (musicGain) {
    try {
      musicGain.gain.cancelScheduledValues(actx.currentTime);
      musicGain.gain.setValueAtTime(musicGain.gain.value, actx.currentTime);
      musicGain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.1);
      setTimeout(() => {
        if (musicGain) { try { musicGain.disconnect(); } catch (e) {} musicGain = null; }
      }, 200);
    } catch (e) { musicGain = null; }
  }
}
function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled && state === 'playing') startMusic();
  else stopMusic();
}

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
  // Fondo del abismo (donde no hay suelo)
  px(0, GROUND_Y, W, H - GROUND_Y, '#08060e');

  // Dibuja cada segmento de suelo del nivel actual
  const tileW = 24, tileH = 12;
  for (const [gx, gw] of currentLevel.ground) {
    const sx = gx - camX;
    if (sx + gw < 0 || sx > W) continue;
    const drawX = Math.max(0, sx);
    const drawW = Math.min(W, sx + gw) - drawX;
    // Banqueta de fondo
    px(drawX, GROUND_Y, drawW, H - GROUND_Y, C.stone1);
    // Baldosas
    const startTile = Math.floor((drawX + camX - gx) / tileW) * tileW + gx - camX;
    for (let y = GROUND_Y; y < H; y += tileH) {
      for (let x = startTile; x < drawX + drawW; x += tileW) {
        if (x + tileW < drawX) continue;
        const tx = Math.max(drawX, x);
        const tw = Math.min(drawX + drawW, x + tileW - 1) - tx;
        if (tw <= 0) continue;
        const isAlt = ((((x + camX - gx) / tileW) | 0) + (((y - GROUND_Y) / tileH) | 0)) % 2;
        px(tx, y, tw, tileH - 1, isAlt ? C.stone1 : C.stone2);
        if (x >= drawX) px(x, y, tileW - 1, 1, C.stoneEdge);
      }
    }
    // Banqueta superior y bordes del segmento (precipicio)
    px(drawX, GROUND_Y - 2, drawW, 2, C.stoneEdge);
    px(drawX, GROUND_Y, drawW, 1, C.step);
    // Borde lateral del precipicio
    if (sx >= 0 && sx < W) px(sx, GROUND_Y, 2, 8, C.stoneEdge);
    const rightEdge = sx + gw - 2;
    if (rightEdge >= 0 && rightEdge < W) px(rightEdge, GROUND_Y, 2, 8, C.stoneEdge);
  }

  // Lámparas a lo largo del nivel (sólo sobre suelo sólido)
  const lamps = [60, 220, 380, 540, 740, 900, 1080, 1280, 1460, 1680, 1860, 2040];
  for (const lx of lamps) {
    if (lx > currentLevel.width - 20) continue;
    if (!isOnSolidGround(lx)) continue;
    const x = lx - camX;
    if (x < -20 || x > W + 20) continue;
    drawLamp(x, GROUND_Y);
  }
}

// Bandera mexicana al final del nivel (meta)
function drawGoal(camX) {
  if (mode !== 'campaign' || !currentLevel.goal) return;
  const gx = currentLevel.goal - camX;
  if (gx < -20 || gx > W + 20) return;
  const gy = GROUND_Y;
  // mástil
  px(gx, gy - 80, 3, 80, '#a8a8a8');
  // bandera tricolor ondeando
  const wave = Math.sin((titleAnim || 0) * 0.2 + gx * 0.05) * 1.5;
  px(gx + 3, gy - 78 + wave, 12, 8, C.sashGreen);
  px(gx + 15, gy - 78 + wave, 12, 8, C.sashWhite);
  px(gx + 27, gy - 78 + wave, 12, 8, C.sashRed);
  // águila en blanco
  px(gx + 19, gy - 76 + wave, 4, 4, C.embRed);
  // base
  px(gx - 3, gy - 4, 9, 4, '#404048');
  // estrella "META" parpadeante
  if ((titleAnim | 0) % 30 < 15) {
    ctx.fillStyle = C.hudY;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('META', gx + 18, gy - 90);
    ctx.textAlign = 'left';
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

// Física vertical compartida: gravedad + segmentos de suelo + plataformas
// Soporte de huecos: si el entity está fuera de un segmento de suelo, sigue cayendo.
function applyVerticalPhysics(e) {
  const feetPrev = e.y + e.h;
  e.vy += GRAVITY;
  e.y += e.vy;
  const feetNow = e.y + e.h;
  e.onGround = false;

  // Plataformas (cualquier nivel): siempre intentar aterrizar desde arriba
  if (e.vy >= 0) {
    for (const pl of levelPlatforms()) {
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

  // Suelo del nivel: sólo si los pies están sobre un segmento sólido
  if (feetNow >= GROUND_Y) {
    const centerX = e.x + e.w / 2;
    if (isOnSolidGround(centerX)) {
      e.y = GROUND_Y - e.h;
      e.vy = 0;
      e.onGround = true;
      return;
    }
    // Cayendo al hueco — sigue cayendo, el código de update lo maneja
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
      saveBests();
      stopMusic();
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
    throwCooldown: 0,
    lastSafeX: 60,
    lastSafeY: GROUND_Y - 54
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
let mode = 'campaign'; // 'campaign' | 'horde'
let menuIndex = 0;
const modeKeys = ['campaign', 'horde'];
const modeLabels = ['CAMPANA', 'HORDA'];
const modeDescs = ['5 OLEADAS + JEFES', 'INFINITA - SOBREVIVE'];

let highScore = 0;
let hordeBestWave = 0;
try {
  highScore = parseInt(localStorage.getItem('morezombi_high') || '0') || 0;
  hordeBestWave = parseInt(localStorage.getItem('morezombi_horde') || '0') || 0;
} catch (e) {}

function saveBests() {
  try {
    if (player.score > highScore) {
      highScore = player.score;
      localStorage.setItem('morezombi_high', String(highScore));
    }
    if (mode === 'horde' && wave > hordeBestWave) {
      hordeBestWave = wave;
      localStorage.setItem('morezombi_horde', String(hordeBestWave));
    }
  } catch (e) {}
}

function isBossWave(w) {
  // Solo aplica a horda (campaña usa niveles)
  return w > 0 && w % 5 === 0;
}

function startGame(selectedMode) {
  mode = selectedMode || 'campaign';
  player = makePlayer();
  enemies = [];
  particles = [];
  projectiles = [];
  camera.x = 0;
  wave = 1;
  goalReached = false;
  levelIntroTimer = 0;
  if (mode === 'campaign') {
    levelIdx = 0;
    loadLevel(levelIdx);
  } else {
    currentLevel = HORDE_ARENA;
    waveBanner = 120;
    setupWave(wave);
  }
  state = 'playing';
  sfx.start();
  startMusic();
}

function loadLevel(idx) {
  currentLevel = levels[idx];
  goalReached = false;
  levelIntroTimer = 0;
  waveBanner = 150; // banner del nivel
  enemies = [];
  projectiles = [];
  particles = [];
  // Reset jugador al inicio del nivel
  player.x = 60;
  player.y = GROUND_Y - player.h;
  player.vx = 0; player.vy = 0;
  player.lastSafeX = 60;
  player.lastSafeY = GROUND_Y - player.h;
  player.hp = Math.min(player.maxHp, player.hp + 2);
  camera.x = 0;
  toSpawn = 0;
  spawnCooldown = 60;
  // Spawn enemigos pre-colocados
  for (const e of currentLevel.enemies || []) {
    if (e.type === 'zombie') enemies.push(makeZombie(e.x));
  }
  // Jefes del nivel (si los hay)
  bossesToSpawn = (currentLevel.bosses || []).slice();
}

function enemiesForWave(w) {
  if (mode === 'horde') return Math.min(3 + w + Math.floor(w / 2), 14);
  return 2 + w;
}

function setupWave(w) {
  // Sólo se usa en horda
  if (isBossWave(w)) {
    const bossOrder = ['boss1', 'boss2', 'boss3'];
    const idx = Math.floor(w / 5 - 1) % 3;
    bossesToSpawn = [bossOrder[(idx + 3) % 3]];
    toSpawn = Math.min(3 + Math.floor(w / 4), 6);
  } else {
    toSpawn = enemiesForWave(w);
    bossesToSpawn = [];
  }
  spawnCooldown = 60;
}

function nextWave() {
  wave++;
  waveBanner = isBossWave(wave) ? 180 : 120;
  setupWave(wave);
  sfx.wave();
  player.hp = Math.min(player.maxHp, player.hp + 2);
}

function nextLevel() {
  levelIdx++;
  if (levelIdx >= levels.length) {
    state = 'win';
    winTimer = 0;
    saveBests();
    stopMusic();
    sfx.win();
    return;
  }
  loadLevel(levelIdx);
  sfx.wave();
}

// ============================================================
// LÓGICA
// ============================================================

function update() {
  if (state === 'title') {
    titleAnim++;
    if (pressed('arrowleft', 'a')) menuIndex = (menuIndex + modeKeys.length - 1) % modeKeys.length;
    if (pressed('arrowright', 'd')) menuIndex = (menuIndex + 1) % modeKeys.length;
    if (pressed('arrowup', 'arrowdown', 'w', 's')) menuIndex = (menuIndex + 1) % modeKeys.length;
    if (pressed('enter', ' ', 'z', 'x', 'c')) {
      startGame(modeKeys[menuIndex]);
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

  // Si llegamos a la meta, esperamos un momento y avanzamos al siguiente nivel
  if (mode === 'campaign' && goalReached) {
    levelIntroTimer--;
    if (levelIntroTimer <= 0) {
      nextLevel();
      clearOnce();
      return;
    }
  }

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
      p.vx = -2.6;
      p.facing = -1;
      moving = true;
    } else if (held('arrowright', 'd')) {
      p.vx = 2.6;
      p.facing = 1;
      moving = true;
    } else {
      p.vx *= 0.6;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // saltar
    if (pressed('z', 'arrowup', 'w') && p.onGround) {
      p.vy = -12;
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

  // física vertical (incluye huecos)
  p.x += p.vx;
  applyVerticalPhysics(p);

  // límites del nivel actual
  const lvlW = currentLevel.width;
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > lvlW) p.x = lvlW - p.w;

  // Posición segura: recordar el último sitio firme en suelo o plataforma
  if (p.onGround) {
    p.lastSafeX = p.x;
    p.lastSafeY = p.y;
  }
  // Caída al hueco: respawn con -1 hp
  if (p.y > H + 40) {
    p.hp = Math.max(0, p.hp - 1);
    sfx.hurt();
    if (p.hp <= 0) {
      p.lives--;
      if (p.lives <= 0) {
        state = 'gameover';
        gameOverTimer = 0;
        saveBests();
        stopMusic();
        sfx.gameOver();
        return;
      }
      p.hp = p.maxHp;
    }
    p.x = p.lastSafeX || 60;
    p.y = (p.lastSafeY || GROUND_Y - p.h) - 40;
    p.vx = 0; p.vy = 0;
    p.invuln = 90;
    p.flash = 30;
  }

  // Meta del nivel (solo en campaña)
  if (mode === 'campaign' && currentLevel.goal && !goalReached
      && p.x + p.w / 2 >= currentLevel.goal) {
    goalReached = true;
    levelIntroTimer = 90;
    p.score += 500;
    sfx.wave();
  }

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

  // Fin de oleada/nivel
  if (state !== 'playing') return;
  if (mode === 'horde') {
    if (toSpawn === 0 && bossesToSpawn.length === 0 && enemies.length === 0 && waveBanner === 0) {
      nextWave();
    }
  } else {
    // Campaña: si es el nivel de jefes y todos vencidos -> victoria
    if (currentLevel.bosses && bossesToSpawn.length === 0
        && enemies.length === 0 && waveBanner === 0 && !goalReached) {
      state = 'win';
      winTimer = 0;
      saveBests();
      stopMusic();
      sfx.win();
    }
  }
}

function updateSpawning() {
  const lvlW = currentLevel.width;
  if (toSpawn > 0) {
    spawnCooldown--;
    if (spawnCooldown <= 0 && enemies.filter(e => !e.dead).length < 4) {
      // spawn desde un lado (sólo horda)
      const fromLeft = Math.random() < 0.4;
      const sx = fromLeft
        ? Math.max(camera.x - 30, 0)
        : Math.min(camera.x + W + 30, lvlW - 30);
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
        : Math.min(camera.x + W + 30, lvlW - 30);
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
  const lvlW = currentLevel.width;
  const target = player.x - W / 2 + player.w / 2;
  camera.x += (target - camera.x) * 0.1;
  if (camera.x < 0) camera.x = 0;
  const maxCam = Math.max(0, lvlW - W);
  if (camera.x > maxCam) camera.x = maxCam;
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
  if (state !== 'title') {
    drawPlatforms(camera.x);
    drawGoal(camera.x);
  }

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
  else if (mode === 'campaign' && goalReached) drawGoalBanner();
  else if (waveBanner > 0) drawWaveBanner();
}

function drawPlatforms(camX) {
  for (const p of levelPlatforms()) {
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

  // Indicador de progreso
  ctx.fillStyle = C.hudY;
  if (mode === 'campaign') {
    ctx.fillText('NIVEL ' + (levelIdx + 1) + '/' + levels.length, 200, 6);
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(currentLevel.name, 200, 22);
    ctx.font = '10px "Press Start 2P", monospace';
  } else {
    ctx.fillText('OLEADA ' + wave, 220, 6);
  }

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
  ctx.fillStyle = 'rgba(10, 5, 20, 0.7)';
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

  // Heroes (izq) vs morezombi + jefes (der)
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = C.hudG;
  ctx.fillText('EL PRESIDENTE', W / 2 - 130, 140);
  ctx.fillStyle = C.embRed;
  ctx.fillText('VS', W / 2 - 15, 140);
  ctx.fillText('MOREZOMBIS + MORENA', W / 2 + 95, 140);

  // Izquierda: solo el presidente, mirando a los enemigos
  drawSprite(heroSprites.idle, W / 2 - 140, 150, heroPal, PX, false);

  // Derecha: morezombi junto a los 3 jefes, todos mirando al presidente
  drawSprite(zombieSprites.walk1, W / 2 + 18, 150, zombiePal, PX, true);
  drawSprite(boss1Sprites.walk1, W / 2 + 55, 150, boss1Pal, PX, true);
  drawSprite(boss2Sprites.walk1, W / 2 + 95, 150, boss2Pal, PX, true);
  drawSprite(boss3Sprites.walk1, W / 2 + 135, 150, boss3Pal, PX, true);

  // === Menu de modo ===
  ctx.font = '11px "Press Start 2P", monospace';
  for (let i = 0; i < modeKeys.length; i++) {
    const cx = W / 2 + (i === 0 ? -82 : 82);
    const cy = 248;
    const sel = (i === menuIndex);
    // fondo opaco para que se lea sobre la catedral
    ctx.fillStyle = sel ? 'rgba(60, 40, 15, 0.92)' : 'rgba(20, 10, 35, 0.85)';
    ctx.fillRect(cx - 70, cy - 14, 140, 36);
    ctx.strokeStyle = sel ? C.hudY : '#3a2a55';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 70, cy - 14, 140, 36);
    ctx.fillStyle = sel ? C.hudY : '#7a6a8a';
    ctx.fillText(modeLabels[i], cx, cy);
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = sel ? C.white : '#5a4a6a';
    ctx.fillText(modeDescs[i], cx, cy + 14);
    ctx.font = '11px "Press Start 2P", monospace';
  }

  // High score
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillStyle = C.hudG;
  ctx.fillText('BEST ' + String(highScore).padStart(6, '0') + '   HORDA MAX OLEADA ' + hordeBestWave,
               W / 2, 295);

  // Hint parpadeante
  if (Math.floor(titleAnim / 30) % 2 === 0) {
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = C.hudY;
    ctx.fillText('< - >  ELIGE MODO     ENTER / A  EMPEZAR', W / 2, 320);
  }

  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('Z SALTAR  X GOLPE  C DECRETO   -   GAMEPAD OK', W / 2, 342);
  ctx.fillText('1993 MEXI-PIX', W / 2, 354);

  ctx.textAlign = 'left';
}

function drawWaveBanner() {
  // Banner contextual: campaña usa NIVEL N, horda usa OLEADA N
  let total, title, sub, accentColor;
  if (mode === 'campaign') {
    total = 150;
    const isBossLvl = !!currentLevel.bosses;
    title = isBossLvl ? 'NIVEL FINAL' : 'NIVEL ' + (levelIdx + 1);
    sub = currentLevel.name + (isBossLvl ? ' - LOS JEFES TE ESPERAN' : '');
    accentColor = isBossLvl ? C.embRed : C.hudY;
  } else {
    const boss = isBossWave(wave);
    total = boss ? 180 : 120;
    title = 'OLEADA ' + wave;
    sub = boss ? 'LLEGAN LOS JEFES DE MORENA' : 'LOS MOREZOMBIS ATACAN';
    accentColor = boss ? C.embRed : C.hudY;
  }
  const a = waveBanner / total;
  ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`;
  ctx.fillRect(0, 140, W, 80);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 140, W, 3);
  ctx.fillRect(0, 217, W, 3);

  ctx.textAlign = 'center';
  ctx.font = '18px "Press Start 2P", monospace';
  ctx.fillStyle = accentColor;
  ctx.fillText(title, W / 2, 165);
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillStyle = C.white;
  ctx.fillText(sub, W / 2, 195);
  ctx.textAlign = 'left';
}

function drawGoalBanner() {
  ctx.fillStyle = 'rgba(10, 40, 10, 0.55)';
  ctx.fillRect(0, 150, W, 70);
  ctx.fillStyle = C.hudG;
  ctx.fillRect(0, 150, W, 3);
  ctx.fillRect(0, 217, W, 3);
  ctx.textAlign = 'center';
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.fillStyle = C.hudY;
  ctx.fillText('META!', W / 2, 175);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = C.white;
  ctx.fillText('+500 PTS  -  AVANZANDO...', W / 2, 200);
  ctx.textAlign = 'left';
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = C.heroMaskR;
  ctx.fillText(mode === 'horde' ? 'HORDA FIN' : 'GAME OVER', W / 2, 130);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = C.white;
  if (mode === 'horde') {
    ctx.fillText('EL PRESIDENTE SUCUMBIO', W / 2, 170);
    ctx.fillStyle = C.hudY;
    ctx.fillText('SOBREVIVISTE HASTA OLEADA ' + wave, W / 2, 200);
  } else {
    ctx.fillText('EL PRESIDENTE HA CAIDO', W / 2, 170);
    ctx.fillText('LA CATEDRAL ESTA PERDIDA', W / 2, 195);
  }
  ctx.fillStyle = C.hudG;
  ctx.fillText('SCORE: ' + String(player.score).padStart(6, '0'), W / 2, 230);
  ctx.fillStyle = (player.score >= highScore) ? C.hudY : '#aaa';
  ctx.fillText('BEST:  ' + String(highScore).padStart(6, '0'), W / 2, 250);
  if (gameOverTimer > 60 && Math.floor(gameOverTimer / 30) % 2 === 0) {
    ctx.fillStyle = C.hudY;
    ctx.fillText('PULSA ENTER PARA CONTINUAR', W / 2, 295);
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
  pollGamepad();
  update();
  render();
  if (padNotifyTimer > 0) {
    padNotifyTimer--;
    drawPadNotice();
  }
  requestAnimationFrame(loop);
}

function drawPadNotice() {
  ctx.save();
  const a = Math.min(1, padNotifyTimer / 60);
  ctx.fillStyle = `rgba(20, 40, 20, ${0.85 * a})`;
  ctx.fillRect(W / 2 - 120, 40, 240, 28);
  ctx.strokeStyle = `rgba(108, 240, 140, ${a})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 120, 40, 240, 28);
  ctx.fillStyle = `rgba(108, 240, 140, ${a})`;
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAMEPAD LISTO', W / 2, 56);
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.8})`;
  ctx.fillText(padName, W / 2, 64);
  ctx.textAlign = 'left';
  ctx.restore();
}

loop();

})();
