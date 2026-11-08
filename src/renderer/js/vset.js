// NOVA Canlı — 3D Sanal Haber Stüdyosu (Three.js, gerçek zamanlı)
// Yansımalı zemin, kavisli LED video duvarı, sunucu masası, LED kolonlar, tavan ışıkları, şehir manzarası,
// ışıma (bloom) ve sinematik renk tonu. Yeşil perde önündeki sunucu masanın arkasına yerleştirilir.
import * as THREE from '../vendor/three/build/three.module.min.js';
import { EffectComposer } from '../vendor/three/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/jsm/postprocessing/OutputPass.js';
import { Reflector } from '../vendor/three/jsm/objects/Reflector.js';
import { RoomEnvironment } from '../vendor/three/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from '../vendor/three/jsm/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

// ---- Stiller
const STYLES = {
  merkez: { name: 'Haber Merkezi', accent: '#1e90ff', wall: 'globe', floor: '#0b1020', walls: '#0d1424', desk: '#eef2f8', deskBody: '#141a28', sky: 'night', exposure: 1.0, bloom: 0.7, channel: 'NOVA HABER' },
  gece: { name: 'Gece Haberleri', accent: '#ff2d4b', wall: 'globe', floor: '#09090d', walls: '#121016', desk: '#101014', deskBody: '#0b0b0f', sky: 'night', exposure: 0.95, bloom: 0.85, channel: 'NOVA GECE' },
  sabah: { name: 'Sabah Kuşağı', accent: '#ff9f43', wall: 'morning', floor: '#cfc8bd', walls: '#e9e4dc', desk: '#ffffff', deskBody: '#b88a5a', sky: 'day', exposure: 1.15, bloom: 0.25, channel: 'GÜNAYDIN NOVA' },
  ekonomi: { name: 'Ekonomi / Borsa', accent: '#19c37d', wall: 'charts', floor: '#0a120f', walls: '#0d1714', desk: '#e8f0ec', deskBody: '#10201a', sky: 'night', exposure: 1.0, bloom: 0.65, channel: 'NOVA EKONOMİ' },
  spor: { name: 'Spor Masası', accent: '#ffd23f', wall: 'sport', floor: '#0d0f12', walls: '#14161b', desk: '#15171c', deskBody: '#0d0e11', sky: 'stadium', exposure: 1.0, bloom: 0.75, channel: 'NOVA SPOR' },
  ozel: { name: 'Özel Yayın / Seçim', accent: '#7b3cff', wall: 'globe', floor: '#0c0a14', walls: '#13101e', desk: '#f2f0f8', deskBody: '#17122a', sky: 'night', exposure: 1.0, bloom: 0.8, channel: 'NOVA ÖZEL' }
};

// ---- Kamera açıları: [konum], [bakış], fov
const SHOTS = {
  genis: { name: 'Geniş', pos: [0, 2.25, 8.2], look: [0, 1.75, -3], fov: 44 },
  orta: { name: 'Orta', pos: [0, 1.72, 4.4], look: [0, 1.5, -1.9], fov: 34 },
  yakin: { name: 'Yakın (sunucu)', pos: [0, 1.62, 2.6], look: [0, 1.52, -1.9], fov: 27 },
  sol: { name: 'Sol açı', pos: [-5.2, 2.1, 4.2], look: [0.4, 1.45, -2.2], fov: 36 },
  sag: { name: 'Sağ açı', pos: [5.2, 2.1, 4.2], look: [-0.4, 1.45, -2.2], fov: 36 },
  vinc: { name: 'Vinç (yukarıdan)', pos: [0, 4.6, 7.4], look: [0, 1.2, -2.5], fov: 46 },
  ekran: { name: 'Video duvarı', pos: [2.2, 2.3, 1.2], look: [-0.6, 2.5, -6.8], fov: 40 }
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const col = (h) => new THREE.Color(h);
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeatX !== 1 || repeatY !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); }
  return t;
}
const FONT = (s, w = 800) => `${w} ${s}px "Segoe UI", Inter, Arial, sans-serif`;

// ---- Doku üreticileri
function floorTexture(style) {
  const c = canvas(1024, 1024), x = c.getContext('2d');
  x.fillStyle = style.floor; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; x.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2); }
  x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 256, 0); x.lineTo(i * 256, 1024); x.stroke(); x.beginPath(); x.moveTo(0, i * 256); x.lineTo(1024, i * 256); x.stroke(); }
  return ctex(c, 10, 8);
}
function skyTexture(kind, accent) {
  const c = canvas(2048, 768), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 768);
  if (kind === 'day') { g.addColorStop(0, '#5aa7e8'); g.addColorStop(0.7, '#cfe6f7'); g.addColorStop(1, '#eef4f8'); }
  else if (kind === 'stadium') { g.addColorStop(0, '#05070d'); g.addColorStop(1, '#1b2a40'); }
  else { g.addColorStop(0, '#02040b'); g.addColorStop(0.55, '#0b1630'); g.addColorStop(1, '#25304d'); }
  x.fillStyle = g; x.fillRect(0, 0, 2048, 768);
  if (kind === 'stadium') {
    x.fillStyle = '#0c1220'; x.beginPath(); x.moveTo(0, 380); x.quadraticCurveTo(1024, 220, 2048, 380); x.lineTo(2048, 768); x.lineTo(0, 768); x.fill();
    for (let i = 0; i < 2600; i++) { x.fillStyle = `hsla(${Math.random() * 360},60%,${45 + Math.random() * 30}%,0.7)`; x.fillRect(Math.random() * 2048, 330 + Math.random() * 260, 3, 3); }
    x.fillStyle = '#1d6b34'; x.fillRect(0, 600, 2048, 168);
    for (const fx of [180, 1868]) { const rg = x.createRadialGradient(fx, 120, 0, fx, 120, 260); rg.addColorStop(0, 'rgba(255,255,240,0.95)'); rg.addColorStop(1, 'rgba(255,255,240,0)'); x.fillStyle = rg; x.fillRect(fx - 260, 0, 520, 400); }
    return ctex(c);
  }
  let r = 11; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let layer = 0; layer < 3; layer++) {
    let bx = 0;
    while (bx < 2048) {
      const w = 40 + rnd() * 110, h = (layer === 0 ? 120 : layer === 1 ? 220 : 330) * (0.5 + rnd());
      const shade = kind === 'day' ? [150 - layer * 30, 165 - layer * 30, 185 - layer * 30] : [18 + layer * 6, 24 + layer * 8, 40 + layer * 10];
      x.fillStyle = `rgb(${shade.join(',')})`; x.fillRect(bx, 768 - h, w, h);
      if (kind !== 'day') for (let wy = 768 - h + 10; wy < 760; wy += 14) for (let wx = bx + 6; wx < bx + w - 6; wx += 10) if (rnd() < 0.16) { x.fillStyle = rnd() < 0.08 ? accent : `rgba(255,${190 + rnd() * 50 | 0},${120 + rnd() * 70 | 0},${0.18 + rnd() * 0.35})`; x.fillRect(wx, wy, 4, 6); }
      else for (let wy = 768 - h + 10; wy < 760; wy += 16) for (let wx = bx + 6; wx < bx + w - 6; wx += 12) { if (rnd() < 0.6) { x.fillStyle = 'rgba(220,235,250,0.22)'; x.fillRect(wx, wy, 7, 9); } }
      bx += w + 4 + rnd() * 20;
    }
  }
  return ctex(c);
}
function panelTexture(style) {
  const c = canvas(512, 512), x = c.getContext('2d');
  x.fillStyle = style.walls; x.fillRect(0, 0, 512, 512);
  const light = style.sky === 'day';
  for (let i = 0; i < 8; i++) { x.fillStyle = light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.025)'; x.fillRect(i * 64, 0, 2, 512); }
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${light ? '0,0,0' : '255,255,255'},${Math.random() * 0.03})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  return ctex(c, 4, 1);
}
function deskFrontTexture(style, channel) {
  const c = canvas(2048, 256), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#05070d'); g.addColorStop(1, '#0d1220');
  x.fillStyle = g; x.fillRect(0, 0, 2048, 256);
  x.fillStyle = style.accent; x.fillRect(0, 200, 2048, 10);
  x.shadowColor = style.accent; x.shadowBlur = 30; x.fillStyle = '#ffffff'; x.font = FONT(110, 900); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(channel, 1024, 108); x.shadowBlur = 0;
  x.fillStyle = style.accent; x.fillRect(1024 - x.measureText(channel).width / 2 - 70, 70, 26, 76);
  return ctex(c);
}

// ---- LED duvar içeriği (her karede çizilir)
function drawWall(W, x, st, o, t, srcCanvas) {
  const w = 2560, h = 720, A = st.accent;
  const bg = x.createLinearGradient(0, 0, w, h);
  if (st.wall === 'morning') { bg.addColorStop(0, '#ffb36b'); bg.addColorStop(0.5, '#ff7f50'); bg.addColorStop(1, '#ffcf8a'); }
  else { bg.addColorStop(0, '#040a1c'); bg.addColorStop(0.5, st.wall === 'charts' ? '#062018' : st.wall === 'sport' ? '#1a1404' : '#071a3a'); bg.addColorStop(1, '#03060f'); }
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  // hareketli ışık süpürmesi
  const sx = ((t * 0.08) % 1.4 - 0.2) * w, lg = x.createLinearGradient(sx - 300, 0, sx + 300, 0);
  lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.10)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = lg; x.fillRect(0, 0, w, h);
  if (st.wall === 'globe' || st.wall === 'morning') { // noktalı dönen dünya
    const cx = w * 0.5, cy = h * 0.46, R = h * 0.36;
    x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 7); x.clip();
    const glow = x.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R); glow.addColorStop(0, st.wall === 'morning' ? 'rgba(255,255,255,0.35)' : 'rgba(80,140,255,0.35)'); glow.addColorStop(1, 'rgba(0,0,0,0.1)');
    x.fillStyle = glow; x.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (let la = -80; la <= 80; la += 5) for (let lo = 0; lo < 360; lo += 5) {
      const lon = (lo + t * 8) * Math.PI / 180, lat = la * Math.PI / 180, z = Math.cos(lat) * Math.cos(lon); if (z < 0) continue;
      const land = Math.sin(lo * 0.09 + la * 0.05) + Math.sin(lo * 0.031 - la * 0.08) * 0.8 + Math.cos(la * 0.07 + lo * 0.02) > 0.55;
      if (!land) continue;
      x.fillStyle = st.wall === 'morning' ? `rgba(255,255,255,${0.35 + z * 0.6})` : `rgba(${A === '#ff2d4b' ? '255,90,110' : '120,190,255'},${0.3 + z * 0.7})`;
      x.fillRect(cx + Math.cos(lat) * Math.sin(lon) * R - 2.5, cy - Math.sin(lat) * R - 2.5, 5, 5);
    }
    x.restore(); x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
    for (let i = 0; i < 3; i++) { x.strokeStyle = `rgba(255,255,255,${0.12 - i * 0.03})`; x.beginPath(); x.ellipse(cx, cy, R * (1.25 + i * 0.22), R * (0.35 + i * 0.07), -0.2, 0, 7); x.stroke(); }
  } else if (st.wall === 'charts') {
    for (let k = 0; k < 3; k++) {
      const px = 380 + k * 640, pw = 560, ph = 300, py = 150;
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px, py, pw, ph);
      x.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(px, py + i * ph / 5); x.lineTo(px + pw, py + i * ph / 5); x.stroke(); }
      x.strokeStyle = k === 1 ? '#ff4d5e' : A; x.lineWidth = 6; x.beginPath();
      for (let i = 0; i <= 60; i++) { const v = Math.sin(i * 0.25 + k * 2 + t * 0.6) * 0.3 + Math.sin(i * 0.07 + k) * 0.4 + (k === 1 ? -i / 120 : i / 120); x.lineTo(px + i * pw / 60, py + ph * (0.55 - v * 0.4)); }
      x.stroke(); x.lineWidth = 1;
      x.fillStyle = '#fff'; x.font = FONT(34, 800); x.textAlign = 'left'; x.fillText(['BIST 100', 'DOLAR/TL', 'ALTIN'][k], px + 20, py + 46);
      x.fillStyle = k === 1 ? '#ff4d5e' : A; x.font = FONT(30, 800); x.fillText(k === 1 ? '▼ %0,42' : '▲ %1,' + (17 + k * 9), px + pw - 190, py + 46);
    }
  } else if (st.wall === 'sport') {
    x.save(); x.translate(w / 2, h * 0.47); x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 4;
    x.strokeRect(-560, -230, 1120, 460); x.beginPath(); x.moveTo(0, -230); x.lineTo(0, 230); x.stroke(); x.beginPath(); x.arc(0, 0, 80, 0, 7); x.stroke();
    x.strokeRect(-560, -110, 120, 220); x.strokeRect(440, -110, 120, 220);
    for (let i = 0; i < 6; i++) { const a = t * 0.7 + i; x.fillStyle = i % 2 ? A : '#ffffff'; x.beginPath(); x.arc(Math.sin(a) * 420, Math.cos(a * 1.3) * 160, 14, 0, 7); x.fill(); }
    x.restore();
  }
  // kaynak (video) paneli
  if (o.wallMode === 'source' && srcCanvas) {
    const pw = 1280, ph = 720 * (1280 / 1280) * 0.5625 * 1.0, px = (w - pw) / 2, py = 40;
    x.fillStyle = '#000'; x.fillRect(px - 8, py - 8, pw + 16, ph + 16);
    x.drawImage(srcCanvas, px, py, pw, ph);
    x.strokeStyle = A; x.lineWidth = 8; x.strokeRect(px - 8, py - 8, pw + 16, ph + 16); x.lineWidth = 1;
  }
  // logo, saat, CANLI, kayan yazı
  const light = st.wall === 'morning';
  x.textBaseline = 'middle';
  const M = 330; x.fillStyle = A; x.fillRect(M, 58, 14, 64); x.fillStyle = light ? '#3a1d05' : '#fff'; x.font = FONT(52, 900); x.textAlign = 'left'; x.fillText(o.channel || st.channel, M + 30, 92);
  const now = new Date(); x.textAlign = 'right'; x.font = FONT(56, 800); x.fillText(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), w - M, 92);
  const blink = Math.floor(t * 1.5) % 2 === 0;
  x.fillStyle = '#e8112d'; x.beginPath(); x.roundRect(w - M - 380, 60, 170, 64, 10); x.fill(); x.fillStyle = '#fff'; x.font = FONT(36, 900); x.textAlign = 'center';
  x.fillText((blink ? '● ' : '   ') + 'CANLI', w - M - 295, 93);
  x.fillStyle = light ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.55)'; x.fillRect(0, h - 96, w, 96);
  x.fillStyle = A; x.fillRect(M - 30, h - 96, 300, 96); x.fillStyle = '#fff'; x.font = FONT(38, 900); x.fillText(o.tickerLabel || 'GÜNDEM', M + 120, h - 47);
  x.save(); x.beginPath(); x.rect(M + 270, h - 96, w - 2 * M - 240, 96); x.clip();
  const txt = (o.ticker || 'NOVA Canlı ile profesyonel haber yayını') + '     ◆     '; x.font = FONT(40, 600); x.textAlign = 'left'; x.fillStyle = light ? '#1a1206' : '#fff';
  const tw = x.measureText(txt).width || 1, off = (t * 140) % tw; for (let px = M + 290 - off; px < w; px += tw) x.fillText(txt, px, h - 47);
  x.restore();
}

// ---- Sahne kurulumu
function build(inp, W, H) {
  const o = inp.vset, st = STYLES[o.style] || STYLES.merkez;
  const accent = col(o.accent || st.accent);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = st.exposure;
  const scene = new THREE.Scene(); scene.background = col(st.sky === 'day' ? '#c9d6e3' : '#020308');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = st.sky === 'day' ? 0.55 : 0.28;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
  const disposables = [];
  const add = (m) => { scene.add(m); return m; };
  const std = (p) => { const m = new THREE.MeshStandardMaterial(p); disposables.push(m); return m; };
  const glow = (c, i = 1) => { const m = new THREE.MeshBasicMaterial({ color: col(c).multiplyScalar(i), toneMapped: false }); disposables.push(m); return m; };

  // Zemin: gerçek ayna + üstünde yarı saydam parlak kaplama (bulanık yansıma hissi)
  const mirror = new Reflector(new THREE.PlaneGeometry(40, 30), { clipBias: 0.003, textureWidth: Math.round(W * 0.5), textureHeight: Math.round(H * 0.5), color: st.sky === 'day' ? 0x8a8a8a : 0x5c5c5c });
  mirror.rotation.x = -Math.PI / 2; add(mirror);
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 30), std({ map: floorTexture(st), roughness: 0.35, metalness: 0.1, transparent: true, opacity: st.sky === 'day' ? 0.86 : 0.78 })));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.003;
  // zemindeki vurgu halkası
  const ring = add(new THREE.Mesh(new THREE.RingGeometry(3.3, 3.36, 128, 1, Math.PI * 1.15, Math.PI * 0.7), glow(st.accent, 1.6)));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.006, -3.2);
  const ring2 = add(new THREE.Mesh(new THREE.RingGeometry(4.6, 4.63, 128, 1, Math.PI * 1.2, Math.PI * 0.6), glow('#ffffff', 0.6)));
  ring2.rotation.x = -Math.PI / 2; ring2.position.set(0, 0.006, -3.2);

  // Arka duvarlar (paneller) + LED çizgiler
  const wallMat = std({ map: panelTexture(st), roughness: 0.7, metalness: 0.15 });
  const back = add(new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 8, 96, 1, true, Math.PI - 1.1, 2.2), wallMat));
  back.material.side = THREE.BackSide; back.position.set(0, 4, 4);
  for (const y of [0.35, 6.2]) {
    const l = add(new THREE.Mesh(new THREE.CylinderGeometry(12.9, 12.9, 0.05, 96, 1, true, Math.PI - 1.08, 2.16), glow(st.accent, 1.4)));
    l.material.side = THREE.BackSide; l.position.set(0, y, 4);
  }
  // Şehir manzaralı camlar (yanlarda)
  const sky = skyTexture(st.sky, st.accent);
  for (const s of [-1, 1]) {
    const win = add(new THREE.Mesh(new THREE.PlaneGeometry(7.5, 4.2), new THREE.MeshBasicMaterial({ map: sky, toneMapped: true })));
    win.position.set(s * 9.2, 2.6, -2.6); win.rotation.y = -s * 0.95;
    const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(7.5, 4.2), std({ color: 0x88aacc, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.18 })));
    glass.position.copy(win.position).add(new THREE.Vector3(-s * 0.06, 0, 0.04)); glass.rotation.y = win.rotation.y;
    for (let k = 0; k <= 4; k++) { // pencere kayıtları
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.3, 0.06), std({ color: 0x1a1d24, roughness: 0.4, metalness: 0.8 })));
      const off = -3.75 + k * 1.875; m.position.set(win.position.x + Math.cos(win.rotation.y) * off * (s < 0 ? 1 : 1), 2.6, win.position.z - Math.sin(win.rotation.y) * off); m.rotation.y = win.rotation.y;
    }
  }

  // Kavisli LED video duvarı
  const wallCv = canvas(2560, 720), wallX = wallCv.getContext('2d'), wallTex = ctex(wallCv);
  wallTex.wrapS = THREE.RepeatWrapping; wallTex.repeat.x = -1; wallTex.offset.x = 1; // iç yüzeyde ayna görüntüyü düzelt
  const WR = 9, WL = 1.35, WH = 3.4;
  const led = add(new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, WH, 128, 1, true, Math.PI - WL / 2, WL), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false, side: THREE.BackSide, color: new THREE.Color(1.05, 1.05, 1.05) })));
  led.position.set(0, 2.85, 2.6);
  for (const y of [2.85 - WH / 2 - 0.06, 2.85 + WH / 2 + 0.06]) { // çerçeve
    const fr = add(new THREE.Mesh(new THREE.CylinderGeometry(WR - 0.02, WR - 0.02, 0.12, 128, 1, true, Math.PI - WL / 2 - 0.01, WL + 0.02), std({ color: 0x15181f, roughness: 0.3, metalness: 0.9, side: THREE.BackSide })));
    fr.position.set(0, y, 2.6);
  }
  // Yan dikey ekranlar
  const sideCv = canvas(512, 1024), sideX = sideCv.getContext('2d'), sideTex = ctex(sideCv);
  for (const s of [-1, 1]) {
    const p = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.0), new THREE.MeshBasicMaterial({ map: sideTex, toneMapped: false })));
    p.position.set(s * 7.3, 2.5, -2.9); p.rotation.y = -s * 0.8;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(1.62, 3.12, 0.08), std({ color: 0x111318, roughness: 0.3, metalness: 0.9 })));
    f.position.copy(p.position).add(new THREE.Vector3(s * 0.03, 0, -0.05)); f.rotation.y = p.rotation.y;
  }

  // LED şeritli kolonlar
  for (const [xx, zz] of [[-5.9, -4.3], [5.9, -4.3], [-8.4, -0.2], [8.4, -0.2]]) {
    const c = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 6.4, 0.42), std({ color: st.sky === 'day' ? 0xf4f1ec : 0x161a22, roughness: 0.25, metalness: 0.6 })));
    c.position.set(xx, 3.2, zz);
    const strip = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 6.2, 0.44), glow(st.accent, 2.0))); strip.position.set(xx, 3.2, zz);
  }

  // Tavan: ışık armatürleri (görünen parlak paneller) + yumuşak alan ışıkları
  for (let i = -3; i <= 3; i++) for (const zz of [-2.5, 0.5, 3.5]) {
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.32), glow('#fff6e6', 1.25))); f.position.set(i * 1.6, 6.3, zz);
  }
  const truss = add(new THREE.Mesh(new THREE.BoxGeometry(12, 0.18, 0.18), std({ color: 0x2a2e36, metalness: 0.9, roughness: 0.35 }))); truss.position.set(0, 6.45, 0.5);
  scene.add(new THREE.HemisphereLight(st.sky === 'day' ? 0xffffff : 0x8fa8d8, st.sky === 'day' ? 0xb8a890 : 0x0a0a12, st.sky === 'day' ? 0.9 : 0.35));
  for (const [xx, zz, i] of [[-2.5, 1.5, 9], [2.5, 1.5, 9], [0, -1.5, 6]]) {
    const ra = new THREE.RectAreaLight(0xfff3e0, i * (st.sky === 'day' ? 1.2 : 1), 2.4, 1.2); ra.position.set(xx, 5.8, zz); ra.lookAt(0, 1.2, -2); scene.add(ra);
  }
  const key = new THREE.SpotLight(0xfff4ea, 38, 18, 0.45, 0.7, 1.6); key.position.set(0, 5.5, 4.5); key.target.position.set(0, 1, -2); scene.add(key, key.target);
  const rim = new THREE.SpotLight(accent, 40, 16, 0.6, 0.8, 1.5); rim.position.set(0, 5.2, -6); rim.target.position.set(0, 1, -1.5); scene.add(rim, rim.target);
  const fill = new THREE.PointLight(accent, 3, 8, 2); fill.position.set(0, 2.2, -5.2); scene.add(fill);

  // Sunucu masası (kavisli), parlak üst tabla, logolu ön panel, alt ışık
  const DC = new THREE.Vector3(0, 0, -3.3), RO = 2.45, RI = 1.55, DA = 0.78;
  const shp = new THREE.Shape(); shp.absarc(0, 0, RO, -DA, DA, false); shp.absarc(0, 0, RI, DA, -DA, true); shp.closePath();
  const body = add(new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.98, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 64 }), std({ color: col(st.deskBody), roughness: 0.35, metalness: 0.5 })));
  body.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); body.position.copy(DC); // yay kameraya doğru
  const topShp = new THREE.Shape(); topShp.absarc(0, 0, RO + 0.12, -DA - 0.05, DA + 0.05, false); topShp.absarc(0, 0, RI - 0.08, DA + 0.05, -DA - 0.05, true); topShp.closePath();
  const topM = new THREE.MeshPhysicalMaterial({ color: col(st.desk).multiplyScalar(st.sky === 'day' ? 0.92 : 0.8), roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 }); disposables.push(topM);
  const top = add(new THREE.Mesh(new THREE.ExtrudeGeometry(topShp, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 64 }), topM));
  top.rotation.copy(body.rotation); top.position.set(DC.x, 0.98, DC.z);
  const frontTex = deskFrontTexture(st, o.channel || st.channel);
  const front = add(new THREE.Mesh(new THREE.CylinderGeometry(RO + 0.035, RO + 0.035, 0.46, 96, 1, true, -DA * 0.9, DA * 1.8), new THREE.MeshBasicMaterial({ map: frontTex, toneMapped: false })));
  front.position.set(DC.x, 0.58, DC.z);
  const under = add(new THREE.Mesh(new THREE.CylinderGeometry(RO - 0.05, RO - 0.05, 0.035, 96, 1, true, -DA, DA * 2), glow(st.accent, 2.2)));
  under.position.set(DC.x, 0.05, DC.z);
  const topEdge = add(new THREE.Mesh(new THREE.CylinderGeometry(RO + 0.125, RO + 0.125, 0.02, 96, 1, true, -DA - 0.05, (DA + 0.05) * 2), glow(st.accent, 1.2)));
  topEdge.position.set(DC.x, 0.995, DC.z);
  // masadaki monitör (arkası) ve dizüstü
  for (const s of [-1, 1]) {
    const mon = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.27, 0.025), std({ color: 0x0c0d10, roughness: 0.3, metalness: 0.7 })));
    mon.position.set(s * 1.2, 1.17, DC.z + RO - 0.95); mon.rotation.set(-0.15, s * 0.35, 0);
    const stand = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), std({ color: 0x777b85, metalness: 1, roughness: 0.3 })));
    stand.position.set(mon.position.x, 1.07, mon.position.z - 0.02);
  }
  // masanın altındaki temas gölgesi
  const sh = canvas(256, 256), sx2 = sh.getContext('2d'), rg = sx2.createRadialGradient(128, 128, 10, 128, 128, 128); rg.addColorStop(0, 'rgba(0,0,0,0.75)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); sx2.fillStyle = rg; sx2.fillRect(0, 0, 256, 256);
  const shadow = add(new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: ctex(sh), transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.008, DC.z + 2.0);

  // Sunucu (yeşil perdeden ayıklanmış görüntü) — masanın arkasında dikey düzlem
  const talCv = canvas(1280, 720), talX = talCv.getContext('2d'), talTex = ctex(talCv);
  const talent = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5625), new THREE.MeshBasicMaterial({ map: talTex, transparent: true, toneMapped: false, depthWrite: true, alphaTest: 0.02 })));
  talent.visible = false;

  // Son işlem: ışıma + sinematik ton
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), o.bloom ?? st.bloom, 0.45, 0.82); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return { renderer, scene, camera, composer, bloom, wallX, wallTex, sideX, sideTex, talX, talTex, talent, frontTex, styleKey: `${o.style}|${o.accent}|${o.channel}`, W: 0, H: 0, cam: null, disposables, pmrem, mirror, DC, RO };
}

function drawSide(x, st, t) {
  x.fillStyle = '#050810'; x.fillRect(0, 0, 512, 1024);
  x.fillStyle = st.accent; x.fillRect(0, 0, 512, 12); x.fillRect(0, 1012, 512, 12);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#fff'; x.font = FONT(64, 900); x.fillText('CANLI', 256, 110);
  x.fillStyle = st.accent; x.font = FONT(30, 700); x.fillText(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }), 256, 170);
  for (let i = 0; i < 9; i++) { const bh = 80 + 260 * Math.abs(Math.sin(t * 0.7 + i * 0.8)); x.fillStyle = i % 3 ? 'rgba(120,170,255,0.6)' : st.accent; x.fillRect(48 + i * 48, 900 - bh, 30, bh); }
}

// ---- Kamera hareketi
function setShot(V, o, instant) {
  const s = SHOTS[o.shot] || SHOTS.genis, now = performance.now();
  const from = V.cam ? { pos: V.cam.pos.clone(), look: V.cam.look.clone(), fov: V.cam.fov } : null;
  V.cam = { pos: new THREE.Vector3(...s.pos), look: new THREE.Vector3(...s.look), fov: s.fov };
  V.move = !instant && from ? { from, t0: now, ms: Math.max(1, o.moveMs ?? 1500) } : null;
  V.shotKey = o.shot;
}

function render(inp, W, H, tSec, getSrc) {
  const o = inp.vset, st = { ...(STYLES[o.style] || STYLES.merkez) }; st.accent = o.accent || st.accent;
  let V = inp._v3;
  const key = `${o.style}|${o.accent}|${o.channel}`;
  if (V && V.styleKey !== key) { dispose(inp); V = null; }
  if (!V) { V = inp._v3 = build(inp, W, H); inp.el = V.renderer.domElement; setShot(V, o, true); }
  const sc = o.quality === 'low' ? 0.6 : o.quality === 'mid' ? 0.8 : 1;
  const rw = Math.round(W * sc), rh = Math.round(H * sc);
  if (V.W !== rw || V.H !== rh) { V.renderer.setSize(rw, rh, false); V.composer.setSize(rw, rh); V.camera.aspect = W / H; V.camera.updateProjectionMatrix(); V.W = rw; V.H = rh; }
  if (V.shotKey !== o.shot) setShot(V, o, false);
  V.bloom.strength = o.bloom ?? st.bloom;
  V.renderer.toneMappingExposure = (STYLES[o.style] || STYLES.merkez).exposure * (o.exposure ?? 1);

  // kamera konumu (geçiş + hafif hareket)
  let pos = V.cam.pos.clone(), look = V.cam.look.clone(), fov = V.cam.fov;
  if (V.move) {
    const k = ease(Math.min(1, (performance.now() - V.move.t0) / V.move.ms));
    pos = V.move.from.pos.clone().lerp(V.cam.pos, k); look = V.move.from.look.clone().lerp(V.cam.look, k); fov = V.move.from.fov + (V.cam.fov - V.move.from.fov) * k;
    if (k >= 1) V.move = null;
  }
  if (o.drift) { pos.x += Math.sin(tSec * 0.17) * 0.25; pos.y += Math.sin(tSec * 0.23) * 0.05; look.x += Math.sin(tSec * 0.17) * 0.08; }
  V.camera.position.copy(pos); V.camera.lookAt(look); if (V.camera.fov !== fov) { V.camera.fov = fov; V.camera.updateProjectionMatrix(); }

  // LED duvar + yan ekranlar
  const wallSrc = o.wallMode === 'source' && o.screen != null ? getSrc('screen', o.screen, 1280, 720) : null;
  drawWall(W, V.wallX, st, o, tSec, wallSrc); V.wallTex.needsUpdate = true;
  if (Math.floor(tSec * 10) !== V._sideT) { V._sideT = Math.floor(tSec * 10); drawSide(V.sideX, st, tSec); V.sideTex.needsUpdate = true; }

  // sunucu
  const tal = o.talent != null ? getSrc('talent', o.talent, 1280, 720) : null;
  V.talent.visible = !!tal;
  if (tal) {
    V.talX.clearRect(0, 0, 1280, 720); V.talX.drawImage(tal, 0, 0, 1280, 720); V.talTex.needsUpdate = true;
    // Varsayılan: kamera sunucuyu belden yukarı çekiyor (kadraj ≈ 1,85 m genişlik); alt kenar masanın arkasında kalır
    const s = 1.85 * (o.talentScale ?? 1);
    V.talent.scale.set(s, s, 1);
    V.talent.position.set(V.DC.x + (o.talentX ?? 0), 0.84 + s * 0.5625 * 0.5 + (o.talentY ?? 0), V.DC.z + 1.12);
    V.talent.lookAt(V.camera.position.x * 0.35, V.talent.position.y, V.camera.position.z); // kameraya hafifçe dön (kart etkisi azalsın)
  }
  V.composer.render();
  return V.renderer.domElement;
}

function dispose(inp) {
  const V = inp._v3; if (!V) return;
  try {
    V.scene.traverse(m => { m.geometry?.dispose?.(); const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; ms.forEach(x => { x.map?.dispose?.(); x.dispose?.(); }); });
    V.mirror.getRenderTarget?.().dispose?.(); V.composer.dispose?.(); V.pmrem.dispose(); V.renderer.dispose(); V.renderer.forceContextLoss?.();
  } catch { }
  inp._v3 = null;
}

// Önizleme resmi (Kaynak Seç penceresi için)
async function snapshot(style, w = 480, h = 270, shot = 'genis') {
  const fake = { vset: { style, shot, channel: STYLES[style].channel, accent: STYLES[style].accent, quality: 'high', drift: false } };
  render(fake, w, h, 3, () => null);
  const url = fake._v3.renderer.domElement.toDataURL('image/jpeg', 0.85);
  dispose(fake); return url;
}

window.VSet = { STYLES, SHOTS, render, dispose, snapshot, ready: true };
window.dispatchEvent(new Event('vset-ready'));
