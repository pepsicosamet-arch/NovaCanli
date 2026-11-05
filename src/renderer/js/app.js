// NOVA Canlı - Mikser motoru ve arayüz
// Samet Şahin (@xsametsahinx)
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NOVA = window.nova || null; // masaüstü köprüsü (tarayıcıda null)

// ---------------------------------------------------------------- Ayarlar
const DEFAULTS = {
  width: 1920, height: 1080, fps: 30,
  encoder: 'libx264', preset: 'veryfast', vbitrate: 4500, abitrate: 160,
  recMode: 'copy', format: 'mp4', recbitrate: 12000, folder: '',
  transType: 'fade', transMs: 600, monitor: true, autoPause: true,
  replayOn: true, replaySecs: 30, autoUpdate: true,
  targets: [
    { name: 'YouTube', url: 'rtmp://a.rtmp.youtube.com/live2', key: '', enabled: true },
    { name: 'Twitch', url: 'rtmp://live.twitch.tv/app', key: '', enabled: false },
    { name: 'Kick', url: 'rtmps://fa723fc1b171.global-contribute.live-video.net/app', key: '', enabled: false }
  ],
  quick: [{ type: 'fade', ms: 500 }, { type: 'wipe', ms: 700 }, { type: 'slide', ms: 600 }, { type: 'zoom', ms: 600 }]
};
const PLATFORMS = {
  'YouTube': 'rtmp://a.rtmp.youtube.com/live2',
  'Twitch': 'rtmp://live.twitch.tv/app',
  'Kick': 'rtmps://fa723fc1b171.global-contribute.live-video.net/app',
  'Facebook': 'rtmps://live-api-s.facebook.com:443/rtmp',
  'Instagram': 'rtmps://edgetee-upload-ist1-1.xx.fbcdn.net:443/rtmp',
  'TikTok': 'rtmp://push.tiktokcdn.com/live',
  'Özel': ''
};
const TR_NAMES = { cut: 'Kes', fade: 'Geçiş', dip: 'Siyah', dipw: 'Beyaz', wipe: 'Silme', slide: 'Kaydır', push: 'İt', zoom: 'Yakınlaş', circle: 'Daire' };
const APP_VERSION = '1.2.0';
const GITHUB_URL = 'https://github.com/pepsicosamet-arch/NovaCanli';
const TYPE_NAMES = { studio: 'STÜDYO', scene: 'SAHNE', replay: 'TEKRAR', camera: 'KAMERA', screen: 'EKRAN', video: 'VİDEO', image: 'RESİM', color: 'RENK', title: 'GRAFİK', mic: 'MİKROFON', audio: 'SES' };

let S = {
  settings: structuredClone(DEFAULTS),
  inputs: [], nextId: 1,
  previewId: null, programId: null,
  overlays: [0, 1, 2, 3].map(() => ({ inputId: null, on: false, alpha: 0 })),
  trans: null, ftb: { on: false, alpha: 0 },
  projectFile: null
};

// ---------------------------------------------------------------- Tuvaller
let W = 1920, H = 1080;
const prog = document.createElement('canvas');           // PROGRAM (çıkış)
const pctx = prog.getContext('2d', { alpha: false });
const pvw = $('#pvw-canvas');                              // ÖNİZLEME (yarı çözünürlük)
const vctx = pvw.getContext('2d', { alpha: false });
const bufA = document.createElement('canvas'), bufB = document.createElement('canvas');
const actx = bufA.getContext('2d', { alpha: false }), bctx = bufB.getContext('2d', { alpha: false });
$('#pgm-screen').appendChild(prog);

function applyResolution() {
  W = Number(S.settings.width) || 1920; H = Number(S.settings.height) || 1080;
  prog.width = bufA.width = bufB.width = W; prog.height = bufA.height = bufB.height = H;
  pvw.width = Math.round(W / 2); pvw.height = Math.round(H / 2);
  replaySize(); RP.frames = [];
  S.inputs?.forEach(i => { if (i.type === 'replay') { i.el.width = W; i.el.height = H; drawReplayIdle(i); } });
  $('#st-res').textContent = `${H}p${S.settings.fps}`;
  startTicker();
}

// ---------------------------------------------------------------- Ses motoru
const AC = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000, latencyHint: 'interactive' });
const masterGain = AC.createGain();
const masterAnalyser = AC.createAnalyser(); masterAnalyser.fftSize = 1024;
const audioDest = AC.createMediaStreamDestination();
const monitorGain = AC.createGain();
masterGain.connect(masterAnalyser); masterAnalyser.connect(audioDest);
masterAnalyser.connect(monitorGain); monitorGain.connect(AC.destination);
// Sessiz de olsa her zaman bir ses izi olsun (ffmpeg için)
const silent = AC.createConstantSource(); silent.offset.value = 0; silent.connect(audioDest); silent.start();
const master = { vol: 1, muted: false };
const resumeAudio = () => { if (AC.state !== 'running') AC.resume(); };
document.addEventListener('pointerdown', resumeAudio);
document.addEventListener('keydown', resumeAudio);

function setupAudio(inp, node) {
  const comp = AC.createDynamicsCompressor();
  const gain = AC.createGain();
  const analyser = AC.createAnalyser(); analyser.fftSize = 1024;
  const afvGain = AC.createGain();
  node.connect(comp); comp.connect(gain); gain.connect(analyser); analyser.connect(afvGain); afvGain.connect(masterGain);
  inp.a = { node, comp, gain, analyser, afvGain, peak: 0, hold: 0 };
  applyComp(inp);
  updateAudioGains(inp, true);
}
function updateAudioGains(inp, instant) {
  if (!inp.a) return;
  const t = AC.currentTime;
  const v = inp.audio.muted ? 0 : inp.audio.vol * (inp.a.makeup || 1);
  const afv = inp.audio.afv ? (inp.onAir ? 1 : 0) : 1;
  inp.a.gain.gain.setTargetAtTime(v, t, instant ? 0.001 : 0.03);
  inp.a.afvGain.gain.setTargetAtTime(afv, t, instant ? 0.001 : 0.08);
}
// Kompresör: kapalıyken etkisiz (oran 1), açıkken konuşmayı dengeler
function applyComp(inp) {
  const c = inp.a?.comp; if (!c) return;
  const on = !!inp.audio.comp;
  c.threshold.value = on ? -24 : 0; c.ratio.value = on ? 4 : 1; c.knee.value = on ? 12 : 0;
  c.attack.value = 0.005; c.release.value = 0.2;
  inp.a.makeup = on ? 1.6 : 1;
  updateAudioGains(inp, true);
}
function updateMaster() {
  masterGain.gain.setTargetAtTime(master.muted ? 0 : master.vol, AC.currentTime, 0.03);
  monitorGain.gain.setTargetAtTime(S.settings.monitor ? 1 : 0, AC.currentTime, 0.03);
}

// ---------------------------------------------------------------- Kaynaklar
const mediaUrl = (p) => `nova://app/__media?p=${encodeURIComponent(p)}`;
const hasVideo = (i) => i.type !== 'mic' && i.type !== 'audio';
const hasAudio = (i) => !!i.a;
const byId = (id) => S.inputs.find(i => i.id === id);

function baseInput(type, name) {
  const inp = {
    id: S.nextId++, type, name,
    fit: 'contain', layout: { x: 0, y: 0, w: 100, h: 100 }, crop: { l: 0, t: 0, r: 0, b: 0 },
    fx: { brightness: 100, contrast: 100, saturation: 100, opacity: 100, mirror: false },
    chroma: { on: false, color: '#00ff00', similarity: 40, smoothness: 8, spill: 10 },
    audio: { vol: 1, muted: false, afv: type === 'video' || type === 'audio', comp: false },
    loop: true, autoPlay: true, src: {}, onAir: false, onAirSince: 0
  };
  return inp;
}

function registerInput(inp) {
  S.inputs.push(inp);
  renumber();
  if (S.previewId == null && hasVideo(inp)) S.previewId = inp.id;
  renderInputs(); renderMixer(); renderOverlays();
  return inp;
}
function renumber() { S.inputs.forEach((i, n) => i.n = n + 1); }

async function addCamera(deviceId, label) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
    audio: false
  });
  const inp = baseInput('camera', label || 'Kamera');
  inp.src = { deviceId, label };
  inp.stream = stream;
  inp.el = mkVideo(); inp.el.srcObject = stream; inp.el.muted = true; inp.el.play().catch(() => { });
  return registerInput(inp);
}

async function addScreen(sourceId, name, withAudio) {
  let stream;
  if (NOVA) {
    const v = { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId, maxWidth: 3840, maxHeight: 2160, maxFrameRate: 60 } };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: v, audio: withAudio ? { mandatory: { chromeMediaSource: 'desktop' } } : false });
    } catch (e) {
      if (!withAudio) throw e;
      stream = await navigator.mediaDevices.getUserMedia({ video: v, audio: false });
      toast('Sistem sesi alınamadı, sadece görüntü eklendi.', true);
    }
  } else {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: !!withAudio });
  }
  const inp = baseInput('screen', name || 'Ekran');
  inp.src = { sourceId, name, withAudio };
  inp.stream = stream;
  inp.el = mkVideo(); inp.el.srcObject = stream; inp.el.muted = true; inp.el.play().catch(() => { });
  if (stream.getAudioTracks().length) setupAudio(inp, AC.createMediaStreamSource(stream));
  stream.getVideoTracks()[0]?.addEventListener('ended', () => toast(`"${inp.name}" yakalaması sona erdi.`, true));
  return registerInput(inp);
}

function addVideo(file, more) { // file: {path} veya {url,name}; more: listeye eklenecek diğer dosyalar
  const inp = baseInput('video', file.name || baseName(file.path));
  inp.list = [file, ...(more || [])].map(f => ({ path: f.path || null, url: f.url || null, name: f.name || baseName(f.path) }));
  inp.idx = 0;
  inp.src = { path: file.path || null };
  const v = mkVideo(); v.preload = 'auto';
  v.addEventListener('error', () => { if (v.getAttribute('src')) toast(`Video açılamadı: ${inp.list[inp.idx]?.name} (MP4/H.264 önerilir)`, true); });
  v.addEventListener('ended', () => nextInList(inp, 1, true));
  inp.el = v;
  setupAudio(inp, AC.createMediaElementSource(v));
  loadListItem(inp, 0, false);
  return registerInput(inp);
}
function loadListItem(inp, i, play) {
  const it = inp.list[i]; if (!it) return;
  inp.idx = i;
  const v = inp.el;
  v.src = it.path ? mediaUrl(it.path) : it.url;
  v.loop = inp.loop && inp.list.length === 1;
  v.load();
  if (play) v.play().catch(() => { });
  const nm = $(`#inputs .inp[data-id="${inp.id}"] .nm`);
  if (nm) nm.textContent = cardName(inp);
}
function nextInList(inp, dir, auto) {
  if (!inp.list || !inp.list.length) return;
  let n = inp.idx + dir;
  if (n >= inp.list.length) { if (auto && !inp.loop) return; n = 0; }
  if (n < 0) n = inp.list.length - 1;
  loadListItem(inp, n, auto || !inp.el.paused);
}
function cardName(inp) { return inp.list && inp.list.length > 1 ? `${inp.name}  (${inp.idx + 1}/${inp.list.length})` : inp.name; }

function addImage(file) {
  const inp = baseInput('image', file.name || baseName(file.path));
  inp.src = { path: file.path || null };
  const img = new Image(); img.decoding = 'async';
  img.src = file.path ? mediaUrl(file.path) : file.url;
  inp.el = img;
  return registerInput(inp);
}

function addColor(color = '#101a3a', color2 = '') {
  const inp = baseInput('color', 'Renk');
  inp.src = { color, color2 };
  return registerInput(inp);
}

function addTitle(template = 'altbant', data) {
  const t = TITLE_TEMPLATES[template] || TITLE_TEMPLATES.altbant;
  const inp = baseInput('title', t.name);
  inp.title = Object.assign({ template, accent: t.accent || '#ff2d4b', textColor: '#ffffff', bg: 'rgba(10,12,18,0.88)', itemIdx: 0 }, t.defaults, data || {});
  inp.el = document.createElement('canvas');
  inp.fit = 'stretch';
  return registerInput(inp);
}

function addStudio(style = 'haber', data) {
  const st = STUDIO_STYLES[style] || STUDIO_STYLES.haber;
  const inp = baseInput('studio', st.name);
  inp.studio = Object.assign({ style, accent: st.accent, label: st.label, speed: 1 }, data || {});
  inp.el = document.createElement('canvas'); inp.el.width = W; inp.el.height = H;
  inp.fit = 'stretch';
  return registerInput(inp);
}

// Sahne: birden fazla kaynağı tek görüntüde birleştirir (PIP, yan yana, 2x2 ...)
function sceneCandidates(exceptId) {
  const pri = { camera: 0, screen: 1, video: 2, replay: 3, image: 4 };
  return S.inputs.filter(i => i.id !== exceptId && i.type in pri).sort((a, b) => pri[a.type] - pri[b.type]);
}
function applyScenePreset(inp, key) {
  const pr = SCENE_PRESETS[key] || SCENE_PRESETS.pip_sag;
  const old = inp.scene.layers, cand = sceneCandidates(inp.id);
  inp.scene.preset = key;
  inp.scene.layers = pr.cells.map((c, i) => ({ id: old[i]?.id ?? cand[i]?.id ?? null, x: c[0], y: c[1], w: c[2], h: c[3], fit: 'cover' }));
  if ((key === 'roportaj' || key === 'yanyana' || key === 'haber' || key === 'uclu' || key === 'bir_iki') && !inp.scene.bg) inp.scene.bg = S.inputs.find(i => i.type === 'studio')?.id ?? null;
}
function addScene(preset = 'pip_sag') {
  const inp = baseInput('scene', 'Sahne: ' + (SCENE_PRESETS[preset]?.name || ''));
  inp.scene = { preset, bg: null, layers: [], border: 4, borderColor: '#ffffff', radius: 16, shadow: true };
  inp.el = document.createElement('canvas'); inp.el.width = W; inp.el.height = H;
  inp.fit = 'stretch';
  applyScenePreset(inp, preset);
  if (preset.startsWith('pip') || preset === 'oyun') inp.scene.radius = 18;
  return registerInput(inp);
}
function renderScene(inp, t) {
  const c = inp.el; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const x = c.getContext('2d'), sc = inp.scene, k = W / 1920;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const bg = byId(sc.bg); if (bg && bg.type !== 'scene' && hasVideo(bg)) drawContent(x, bg, 1, 0, 0, W, H, t, 'cover');
  sc.layers.forEach((L, i) => {
    const sub = byId(L.id); if (!sub || sub.type === 'scene' || !hasVideo(sub)) return;
    const rx = L.x / 100 * W, ry = L.y / 100 * H, rw = L.w / 100 * W, rh = L.h / 100 * H, r = (sc.radius || 0) * k;
    x.save();
    if (sc.shadow && (i > 0 || L.w < 99)) { x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 34 * k; x.shadowOffsetY = 10 * k; x.fillStyle = '#000'; x.beginPath(); x.roundRect(rx, ry, rw, rh, r); x.fill(); x.shadowColor = 'transparent'; }
    x.beginPath(); x.roundRect(rx, ry, rw, rh, r); x.clip();
    x.fillStyle = '#000'; x.fillRect(rx, ry, rw, rh);
    drawContent(x, sub, 1, rx, ry, rw, rh, t, L.fit || 'cover');
    x.restore();
    if (sc.border > 0 && (i > 0 || L.w < 99)) { x.strokeStyle = sc.borderColor; x.lineWidth = sc.border * k; x.beginPath(); x.roundRect(rx, ry, rw, rh, r); x.stroke(); }
  });
}

async function addMic(deviceId, label) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false
  });
  const inp = baseInput('mic', label || 'Mikrofon');
  inp.src = { deviceId, label };
  inp.stream = stream;
  setupAudio(inp, AC.createMediaStreamSource(stream));
  return registerInput(inp);
}

function addAudioFile(file) {
  const inp = baseInput('audio', file.name || baseName(file.path));
  inp.src = { path: file.path || null };
  const a = new Audio(); a.loop = true; a.preload = 'auto';
  a.src = file.path ? mediaUrl(file.path) : file.url;
  inp.media = a;
  setupAudio(inp, AC.createMediaElementSource(a));
  return registerInput(inp);
}

// ---------------------------------------------------------------- Anlık tekrar (Instant Replay)
// Program çıktısı sürekli küçük JPEG kareler olarak hafızada tutulur (son N saniye).
const RP = { canvas: document.createElement('canvas'), frames: [], busy: 0 };
const rpctx = RP.canvas.getContext('2d', { alpha: false });
function replaySize() { RP.canvas.width = 960; RP.canvas.height = Math.round(960 * H / W); }
function replayCapture(t) {
  if (!S.settings.replayOn || RP.busy > 8) return;
  rpctx.drawImage(prog, 0, 0, RP.canvas.width, RP.canvas.height);
  RP.busy++;
  RP.canvas.toBlob(b => {
    RP.busy--; if (!b) return;
    RP.frames.push({ t, b });
    const lim = t - (Number(S.settings.replaySecs) || 30) * 1000;
    while (RP.frames.length && RP.frames[0].t < lim) RP.frames.shift();
  }, 'image/jpeg', 0.8);
}
function addReplay() {
  const inp = baseInput('replay', 'Anlık Tekrar');
  inp.el = document.createElement('canvas'); inp.el.width = W; inp.el.height = H;
  const c = inp.el.getContext('2d'); c.fillStyle = '#05070c'; c.fillRect(0, 0, W, H);
  inp.rp = { clip: [], time: 0, speed: 0.5, secs: 8, last: -1, loading: false };
  inp.fit = 'stretch';
  drawReplayIdle(inp);
  return registerInput(inp);
}
function drawReplayIdle(inp) {
  const c = inp.el.getContext('2d'), w = inp.el.width, h = inp.el.height;
  c.fillStyle = '#05070c'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#8a93a8'; c.font = `600 ${h / 22}px Segoe UI, Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('Tekrar yakalamak için ⏺ veya R tuşu', w / 2, h / 2);
}
function replayMark(inp) {
  if (!S.settings.replayOn) return toast('Anlık tekrar Ayarlar > Genel bölümünden kapalı.', true);
  const now = performance.now();
  inp.rp.clip = RP.frames.filter(f => f.t >= now - inp.rp.secs * 1000);
  inp.rp.time = 0; inp.rp.last = -1;
  if (!inp.rp.clip.length) { toast('Henüz kaydedilmiş görüntü yok.', true); return Promise.resolve(false); }
  toast(`Son ${inp.rp.secs} sn yakalandı (${inp.rp.speed}x hız).`);
  inp.rp.loading = true;
  return createImageBitmap(inp.rp.clip[0].b).then(bm => { drawReplayFrame(inp, bm); inp.rp.last = 0; inp.rp.loading = false; return true; })
    .catch(() => { inp.rp.loading = false; return true; });
}
function drawReplayFrame(inp, bm) {
  const c = inp.el.getContext('2d'), w = inp.el.width, h = inp.el.height, rp = inp.rp;
  c.drawImage(bm, 0, 0, w, h); bm.close();
  const s = h / 1080;
  c.fillStyle = '#ff2d4b'; c.beginPath(); c.roundRect(w - 330 * s, 50 * s, 270 * s, 70 * s, 10 * s); c.fill();
  c.fillStyle = '#fff'; c.font = `900 ${34 * s}px Segoe UI, Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`TEKRAR ${rp.speed < 1 ? '• ' + rp.speed + 'x' : ''}`, w - 195 * s, 86 * s);
}
function replayTick(dt) {
  for (const inp of S.inputs) {
    if (inp.type !== 'replay' || !inp.rp.clip.length) continue;
    const rp = inp.rp, t0 = rp.clip[0].t, len = rp.clip[rp.clip.length - 1].t - t0;
    rp.time += dt * rp.speed;
    if (rp.time > len + 400) rp.time = 0; // döngü
    let i = rp.last < 0 ? 0 : rp.last;
    if (rp.time < (rp.clip[i].t - t0)) i = 0;
    while (i + 1 < rp.clip.length && rp.clip[i + 1].t - t0 <= rp.time) i++;
    if (i === rp.last || rp.loading) continue;
    rp.loading = true; rp.last = i;
    createImageBitmap(rp.clip[i].b).then(bm => { rp.loading = false; drawReplayFrame(inp, bm); }).catch(() => { rp.loading = false; });
  }
}

function mkVideo() { const v = document.createElement('video'); v.playsInline = true; v.autoplay = false; return v; }
function baseName(p) { return String(p || 'dosya').split(/[\\/]/).pop().replace(/\.[^.]+$/, ''); }
function mediaEl(inp) { return inp.type === 'audio' ? inp.media : (inp.type === 'video' ? inp.el : null); }

function removeInput(id) {
  const inp = byId(id); if (!inp) return;
  inp.stream?.getTracks().forEach(t => t.stop());
  const m = mediaEl(inp); if (m) { m.pause(); m.removeAttribute('src'); m.load(); }
  try { inp.a?.afvGain.disconnect(); } catch { }
  S.inputs = S.inputs.filter(i => i !== inp);
  S.overlays.forEach(o => { if (o.inputId === id) { o.inputId = null; o.on = false; o.alpha = 0; } });
  if (S.previewId === id) S.previewId = null;
  if (S.programId === id) S.programId = null;
  if (S.trans && (S.trans.from === id || S.trans.to === id)) S.trans = null;
  renumber(); renderInputs(); renderMixer(); renderOverlays();
}

// ---------------------------------------------------------------- Çizim
const keyers = new Map();
function srcSize(inp) {
  const e = inp.el;
  if (!e) return [0, 0];
  if (e instanceof HTMLVideoElement) return e.videoWidth && e.readyState >= 1 ? [e.videoWidth, e.videoHeight] : [0, 0];
  if (e instanceof HTMLImageElement) return e.complete && e.naturalWidth ? [e.naturalWidth, e.naturalHeight] : [0, 0];
  return [e.width, e.height];
}

function drawInput(ctx, inp, alpha, cw, ch, tNow) {
  if (!inp || !hasVideo(inp) || alpha <= 0) return;
  const L = inp.layout;
  drawContent(ctx, inp, alpha, L.x / 100 * cw, L.y / 100 * ch, L.w / 100 * cw, L.h / 100 * ch, tNow, null);
}

// Bir kaynağın içeriğini verilen dikdörtgene çizer (sahnelerde de kullanılır)
function drawContent(ctx, inp, alpha, rx, ry, rw, rh, tNow, fitOverride) {
  const a = alpha * (inp.fx.opacity / 100);
  ctx.save();
  ctx.globalAlpha = a;
  if (inp.type === 'color') {
    if (inp.src.color2) {
      const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
      g.addColorStop(0, inp.src.color); g.addColorStop(1, inp.src.color2); ctx.fillStyle = g;
    } else ctx.fillStyle = inp.src.color;
    ctx.fillRect(rx, ry, rw, rh); ctx.restore(); return;
  }
  if (inp._rt !== tNow) { // aynı karede bir kez çiz
    if (inp.type === 'title') TitleRenderer.render(inp.el, inp, W, H, inp.onAir ? (tNow - inp.onAirSince) / 1000 : 30);
    else if (inp.type === 'studio') StudioRenderer.render(inp.el, inp, W, H, tNow / 1000);
    else if (inp.type === 'scene') renderScene(inp, tNow);
    inp._rt = tNow;
  }
  let [sw, sh] = srcSize(inp);
  if (!sw || !sh) { ctx.restore(); return; }
  let src = inp.el;
  if (inp.chroma.on) {
    let k = keyers.get(inp.id); if (!k) { k = new ChromaKeyer(); keyers.set(inp.id, k); }
    src = k.process(inp.el, sw, sh, inp.chroma);
  }
  const C = inp.crop;
  const sx = sw * C.l / 100, sy = sh * C.t / 100;
  const cw2 = Math.max(1, sw * (1 - (C.l + C.r) / 100)), ch2 = Math.max(1, sh * (1 - (C.t + C.b) / 100));
  let dx = rx, dy = ry, dw = rw, dh = rh, ssx = sx, ssy = sy, ssw = cw2, ssh = ch2;
  const fit = fitOverride || inp.fit;
  if (fit === 'contain') {
    const s = Math.min(rw / cw2, rh / ch2); dw = cw2 * s; dh = ch2 * s; dx = rx + (rw - dw) / 2; dy = ry + (rh - dh) / 2;
  } else if (fit === 'cover') {
    const s = Math.max(rw / cw2, rh / ch2); ssw = rw / s; ssh = rh / s; ssx = sx + (cw2 - ssw) / 2; ssy = sy + (ch2 - ssh) / 2;
  }
  const f = inp.fx;
  if (f.brightness !== 100 || f.contrast !== 100 || f.saturation !== 100) ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%)`;
  if (f.mirror) { ctx.translate(dx * 2 + dw, 0); ctx.scale(-1, 1); }
  try { ctx.drawImage(src, ssx, ssy, ssw, ssh, dx, dy, dw, dh); } catch { }
  ctx.restore();
}

function drawMain(ctx, id, cw, ch, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
  drawInput(ctx, byId(id), 1, cw, ch, t);
}

function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

function renderProgram(t) {
  const tr = S.trans;
  if (tr) {
    let p = tr.manual ? tr.p : Math.min(1, (t - tr.start) / tr.dur);
    const e = ease(p);
    drawMain(actx, tr.from, W, H, t); drawMain(bctx, tr.to, W, H, t);
    pctx.save();
    pctx.fillStyle = '#000'; pctx.fillRect(0, 0, W, H);
    switch (tr.type) {
      case 'fade': pctx.drawImage(bufA, 0, 0); pctx.globalAlpha = e; pctx.drawImage(bufB, 0, 0); break;
      case 'dip': case 'dipw':
        pctx.fillStyle = tr.type === 'dip' ? '#000' : '#fff'; pctx.fillRect(0, 0, W, H);
        if (p < 0.5) { pctx.globalAlpha = 1 - p * 2; pctx.drawImage(bufA, 0, 0); }
        else { pctx.globalAlpha = (p - 0.5) * 2; pctx.drawImage(bufB, 0, 0); }
        break;
      case 'wipe': {
        pctx.drawImage(bufA, 0, 0);
        const x = W * e; pctx.drawImage(bufB, 0, 0, x, H, 0, 0, x, H);
        pctx.fillStyle = '#fff'; pctx.globalAlpha = 0.85; pctx.fillRect(x - 3, 0, 6, H);
        break;
      }
      case 'slide': pctx.drawImage(bufA, 0, 0); pctx.drawImage(bufB, W * (1 - e), 0); break;
      case 'push': pctx.drawImage(bufA, -W * e, 0); pctx.drawImage(bufB, W * (1 - e), 0); break;
      case 'zoom': {
        pctx.drawImage(bufA, 0, 0);
        const s = 0.2 + 0.8 * e; pctx.globalAlpha = Math.min(1, e * 1.5);
        pctx.drawImage(bufB, W * (1 - s) / 2, H * (1 - s) / 2, W * s, H * s);
        break;
      }
      case 'circle': {
        pctx.drawImage(bufA, 0, 0);
        pctx.beginPath(); pctx.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e, 0, Math.PI * 2); pctx.clip();
        pctx.drawImage(bufB, 0, 0);
        break;
      }
      default: pctx.drawImage(bufB, 0, 0);
    }
    pctx.restore();
    if (!tr.manual && p >= 1) finishTransition();
  } else {
    drawMain(pctx, S.programId, W, H, t);
  }
  // Overlay kanalları (alt yazı, logo, PIP)
  const step = 1000 / S.settings.fps / 300;
  S.overlays.forEach(o => {
    o.alpha = o.on ? Math.min(1, o.alpha + step) : Math.max(0, o.alpha - step);
    if (o.inputId && o.alpha > 0) drawInput(pctx, byId(o.inputId), o.alpha, W, H, t);
  });
  // Siyaha kararma (FTB)
  const fs = 1000 / S.settings.fps / 500;
  S.ftb.alpha = S.ftb.on ? Math.min(1, S.ftb.alpha + fs) : Math.max(0, S.ftb.alpha - fs);
  if (S.ftb.alpha > 0) { pctx.globalAlpha = S.ftb.alpha; pctx.fillStyle = '#000'; pctx.fillRect(0, 0, W, H); pctx.globalAlpha = 1; }
}

let frame = 0, fpsCount = 0, fpsT = performance.now(), renderMs = 0, lastTick = performance.now();
let dropped = 0;
function tick(e) {
  // Bilgisayar yetişemezse geciken kareleri at: kuyruk birikmesin, arayüz donmasın
  if (e && typeof e.data === 'number' && Date.now() - e.data > 1000 / (Number(S.settings.fps) || 30)) { dropped++; return; }
  const t0 = performance.now();
  const dt = Math.min(200, t0 - lastTick); lastTick = t0;
  replayTick(dt);
  updateOnAir(t0);
  renderProgram(t0);
  replayCapture(t0);
  drawMain(vctx, S.previewId, pvw.width, pvw.height, t0);
  frame++; fpsCount++;
  if (frame % 3 === 0) drawThumbs(t0);
  if (frame % 2 === 0) drawMeters();
  if (frame % 10 === 0) updateVideoProgress();
  renderMs = renderMs * 0.9 + (performance.now() - t0) * 0.1;
  if (t0 - fpsT >= 1000) {
    $('#st-fps').textContent = `${Math.round(fpsCount * 1000 / (t0 - fpsT))} fps`;
    $('#st-render').textContent = `${renderMs.toFixed(1)} ms${dropped ? ` • ${dropped} atlandı` : ''}`; dropped = 0;
    fpsCount = 0; fpsT = t0;
  }
}

// Arka planda/küçültülmüşken de sabit hızda çizmek için Worker zamanlayıcı
let ticker = null;
function startTicker() {
  if (ticker) ticker.terminate();
  ticker = new Worker('js/ticker.js');
  ticker.onmessage = tick;
  ticker.postMessage(1000 / (Number(S.settings.fps) || 30));
}

// ---------------------------------------------------------------- Yayında mı?
function updateOnAir(t) {
  const live = new Set();
  if (S.programId) live.add(S.programId);
  if (S.trans) { live.add(S.trans.to); live.add(S.trans.from); }
  S.overlays.forEach(o => { if (o.on && o.inputId) live.add(o.inputId); });
  for (const id of [...live]) { const sc = byId(id)?.scene; if (sc) { if (sc.bg) live.add(sc.bg); sc.layers.forEach(l => l.id && live.add(l.id)); } }
  for (const inp of S.inputs) {
    const on = live.has(inp.id);
    if (on !== inp.onAir) {
      inp.onAir = on;
      if (on) { inp.onAirSince = t; if (inp.type === 'title' && inp.title.template === 'sayac') inp._swStart = null; }
      const m = mediaEl(inp);
      if (m && inp.autoPlay) {
        if (on) { if (m.ended) m.currentTime = 0; m.play().catch(() => { }); }
        else if (S.settings.autoPause) m.pause();
      }
      updateAudioGains(inp);
      markInputs();
    }
  }
  $('#onair').classList.toggle('on', !!(outState.stream || outState.record));
}

// ---------------------------------------------------------------- Geçişler
function cut() {
  if (S.trans) finishTransition();
  if (!S.previewId) return;
  [S.programId, S.previewId] = [S.previewId, S.programId];
  afterSwitch();
}
function transition(type, ms) {
  type = type || S.settings.transType; ms = Number(ms) || S.settings.transMs;
  if (S.trans) { finishTransition(); return; }
  if (!S.previewId) return;
  if (type === 'cut') return cut();
  S.trans = { from: S.programId, to: S.previewId, type, dur: ms, start: performance.now(), manual: false, p: 0 };
  $('#btn-auto').classList.add('on');
}
function finishTransition() {
  const tr = S.trans; if (!tr) return;
  S.trans = null;
  S.programId = tr.to; S.previewId = tr.from;
  $('#tbar').value = 0;
  $('#btn-auto').classList.remove('on');
  afterSwitch();
}
function afterSwitch() { markInputs(); updateMonitorNames(); }
function updateMonitorNames() {
  const p = byId(S.previewId), g = byId(S.programId);
  $('#pvw-name').textContent = p ? `${p.n}. ${p.name}` : '—';
  $('#pgm-name').textContent = g ? `${g.n}. ${g.name}` : '—';
}
function toPreview(id) { S.previewId = id; markInputs(); updateMonitorNames(); }
function quickCut(id) { S.previewId = id; cut(); }
function quickTrans(id, type, ms) { if (S.trans) finishTransition(); S.previewId = id; transition(type, ms); }

// T-bar (manuel geçiş)
const tbar = $('#tbar');
tbar.addEventListener('input', () => {
  const p = tbar.value / 1000;
  if (!S.trans) {
    if (!S.previewId || p === 0) return;
    S.trans = { from: S.programId, to: S.previewId, type: S.settings.transType, manual: true, p };
  }
  S.trans.manual = true; S.trans.p = p;
  if (p >= 1) finishTransition();
});
tbar.addEventListener('change', () => {
  if (S.trans && S.trans.manual && S.trans.p <= 0) { S.trans = null; }
});

function toggleOverlay(n, id) {
  const o = S.overlays[n];
  if (id != null && o.inputId !== id) { o.inputId = id; o.on = true; o.alpha = 0; }
  else if (o.inputId) o.on = !o.on;
  renderOverlays(); markInputs();
}

// ---------------------------------------------------------------- Kaynak kartları
const thumbCtx = new Map();
function renderInputs() {
  const box = $('#inputs'); box.innerHTML = '';
  thumbCtx.clear();
  for (const inp of S.inputs) {
    const el = document.createElement('div');
    el.className = 'inp'; el.dataset.id = inp.id;
    const isMedia = inp.type === 'video' || inp.type === 'audio';
    el.innerHTML = `
      <div class="th"><canvas width="256" height="144"></canvas><span class="num">${inp.n}</span><span class="tag">${TYPE_NAMES[inp.type]}</span>${isMedia ? '<i class="prog"></i>' : ''}</div>
      <div class="nm" title="${esc(inp.name)}">${esc(cardName(inp))}</div>
      <div class="bar">
        ${hasVideo(inp) ? `<button data-b="cut" title="Doğrudan programa kes">KES</button><button data-b="fade" title="Hızlı geçiş">GEÇ</button>` : ''}
        ${isMedia ? `<button data-b="play" title="Oynat / Duraklat">⏯</button><button data-b="restart" title="Başa sar">⏮</button>` : ''}
        ${inp.list && inp.list.length > 1 ? `<button data-b="next" title="Listede sonraki">⏭</button>` : ''}
        ${titleHasList(inp) ? `<button data-b="tprev" title="Önceki isim / satır">⏮</button><button data-b="tnext" title="Sonraki isim / satır (N)">⏭</button>` : ''}
        ${inp.type === 'replay' ? `<button data-b="mark" title="Son saniyeleri yakala (R)">⏺</button><button data-b="speed" title="Hız">${inp.rp.speed}x</button>` : ''}
        ${hasVideo(inp) ? [1, 2, 3, 4].map(k => `<button class="ov" data-b="ov${k - 1}" title="Overlay ${k}">${k}</button>`).join('') : ''}
        <button data-b="set" title="Ayarlar">⚙</button>
        <button class="x" data-b="del" title="Kaldır">✕</button>
      </div>`;
    box.appendChild(el);
    thumbCtx.set(inp.id, el.querySelector('canvas').getContext('2d'));
    el.querySelector('.th').addEventListener('click', () => hasVideo(inp) && toPreview(inp.id));
    el.querySelector('.th').addEventListener('dblclick', () => openInputSettings(inp.id));
    el.querySelector('.bar').addEventListener('click', (e) => {
      const b = e.target.closest('button')?.dataset.b; if (!b) return;
      const m = mediaEl(inp);
      if (b === 'cut') quickCut(inp.id);
      else if (b === 'fade') quickTrans(inp.id, 'fade', 500);
      else if (b === 'play' && m) m.paused ? m.play().catch(() => { }) : m.pause();
      else if (b === 'restart' && m) { m.currentTime = 0; }
      else if (b === 'next') nextInList(inp, 1, false);
      else if (b === 'tnext') titleNext(inp, 1);
      else if (b === 'tprev') titleNext(inp, -1);
      else if (b === 'mark') replayMark(inp);
      else if (b === 'speed') { const sp = [0.25, 0.5, 0.75, 1]; inp.rp.speed = sp[(sp.indexOf(inp.rp.speed) + 1) % sp.length]; e.target.textContent = inp.rp.speed + 'x'; }
      else if (b.startsWith('ov')) toggleOverlay(+b[2], inp.id);
      else if (b === 'set') openInputSettings(inp.id);
      else if (b === 'del') confirmBox(`"${inp.name}" kaldırılsın mı?`, () => removeInput(inp.id));
    });
  }
  markInputs(); updateMonitorNames();
}
function markInputs() {
  $$('#inputs .inp').forEach(el => {
    const id = +el.dataset.id;
    const live = S.programId === id || (S.trans && S.trans.to === id);
    el.classList.toggle('pgm', !!live);
    el.classList.toggle('pvw', !live && S.previewId === id);
    $$('.ov', el).forEach((b, k) => b.classList.toggle('on', S.overlays[k].inputId === id && S.overlays[k].on));
  });
  renderOverlays();
}
const HEAVY = new Set(['title', 'studio', 'scene']);
let thumbTick = 0;
function drawThumbs(t) {
  thumbTick++;
  for (const inp of S.inputs) {
    const c = thumbCtx.get(inp.id); if (!c) continue;
    // Yayında olmayan grafik/stüdyo/sahne küçük resimleri saniyede ~1 kez yenilenir (performans)
    if (HEAVY.has(inp.type) && !inp.onAir && inp.id !== S.previewId && inp._thumbOk && (thumbTick + inp.id) % 10 !== 0) continue;
    inp._thumbOk = true;
    c.clearRect(0, 0, 256, 144);
    if (hasVideo(inp)) {
      drawInput(c, inp, 1, 256, 144, t);
    } else {
      c.fillStyle = '#0d1018'; c.fillRect(0, 0, 256, 144);
      c.fillStyle = '#4c8dff'; c.font = '700 44px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(inp.type === 'mic' ? '🎙' : '♪', 128, 64);
      const lvl = inp.a ? Math.min(1, inp.a.peak) : 0;
      c.fillStyle = '#19c37d'; c.fillRect(30, 118, 196 * lvl, 8);
    }
  }
}
function replayFirst() { return S.inputs.find(i => i.type === 'replay') || addReplay(); }
function replayHotkey() {
  const inp = replayFirst();
  replayMark(inp).then(ok => { if (ok) quickTrans(inp.id, 'fade', 400); });
}
function titleHasList(inp) { const f = inp.type === 'title' && TITLE_TEMPLATES[inp.title.template]?.fields; return !!f && (f.includes('items') || f.includes('lines')); }
function titleNext(inp, dir) {
  const n = titleItemCount(inp.title);
  if (!n) { toast(inp.title.srtCues?.length ? 'SRT altyazı zamanlamayla otomatik ilerler.' : 'Önce Ayarlar > Metin bölümünden isim listesi / satırları gir.', true); return; }
  inp.title.itemIdx = (((inp.title.itemIdx || 0) + dir) % n + n) % n;
  if (inp.onAir && inp.title.template !== 'altyazi') inp.onAirSince = performance.now(); // giriş animasyonunu tekrar oynat
  const [a] = inp.title.template === 'altyazi' ? [''] : titleLines(inp.title);
  toast(`${inp.name}: ${inp.title.itemIdx + 1}/${n}${a ? ' • ' + a : ''}`);
}
function updateVideoProgress() {
  for (const inp of S.inputs) {
    const m = mediaEl(inp); if (!m || !m.duration) continue;
    const bar = $(`#inputs .inp[data-id="${inp.id}"] .prog`);
    if (bar) bar.style.width = `${(m.currentTime / m.duration) * 100}%`;
  }
}

function renderOverlays() {
  const row = $('#ovl-row');
  if (!row.children.length) {
    row.innerHTML = [0, 1, 2, 3].map(k => `<button class="ovl-btn" data-o="${k}" title="F${k + 1}">${k + 1}<small></small></button>`).join('');
    row.addEventListener('click', e => { const b = e.target.closest('button'); if (b) toggleOverlay(+b.dataset.o); });
  }
  $$('.ovl-btn', row).forEach((b, k) => {
    const o = S.overlays[k]; const inp = byId(o.inputId);
    b.classList.toggle('on', !!(o.on && inp));
    b.querySelector('small').textContent = inp ? inp.name : 'boş';
  });
}

function renderQuick() {
  const q = $('#quick');
  q.innerHTML = S.settings.quick.map((x, k) => `<button data-q="${k}">${TR_NAMES[x.type]} ${x.ms}ms</button>`).join('');
}
$('#quick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const x = S.settings.quick[+b.dataset.q]; transition(x.type, x.ms); });

// ---------------------------------------------------------------- Ses mikseri
function renderMixer() {
  const box = $('#mixer'); box.innerHTML = '';
  box.appendChild(mkStrip('MASTER', master, null));
  S.inputs.filter(hasAudio).forEach(inp => box.appendChild(mkStrip(`${inp.n}. ${inp.name}`, inp.audio, inp)));
}
function mkStrip(label, st, inp) {
  const el = document.createElement('div');
  el.className = 'strip' + (inp ? '' : ' master');
  el.innerHTML = `<div class="lbl" title="${esc(label)}">${esc(label)}</div>
    <div class="fx"><div class="meter"><i></i><b></b></div><input class="fader" type="range" min="0" max="150" value="${Math.round(st.vol * 100)}"><div class="meter"><i></i><b></b></div></div>
    <div class="db">${volDb(st.vol)}</div>
    <div class="btns"><button class="m ${st.muted ? 'on' : ''}" title="Sustur">M</button>${inp ? `<button class="a ${st.afv ? 'on' : ''}" title="Ses görüntüyü izlesin (sadece yayındayken duyulur)">A</button>` : ''}</div>`;
  const fader = el.querySelector('.fader'), db = el.querySelector('.db');
  fader.addEventListener('input', () => { st.vol = fader.value / 100; db.textContent = volDb(st.vol); inp ? updateAudioGains(inp) : updateMaster(); });
  fader.addEventListener('dblclick', () => { fader.value = 100; fader.dispatchEvent(new Event('input')); });
  el.querySelector('.m').addEventListener('click', e => { st.muted = !st.muted; e.target.classList.toggle('on', st.muted); inp ? updateAudioGains(inp) : updateMaster(); });
  el.querySelector('.a')?.addEventListener('click', e => { st.afv = !st.afv; e.target.classList.toggle('on', st.afv); updateAudioGains(inp); });
  el._meters = $$('.meter', el);
  el._an = inp ? inp.a.analyser : masterAnalyser;
  el._inp = inp;
  return el;
}
function volDb(v) { return v <= 0.001 ? '-∞ dB' : `${(20 * Math.log10(v)).toFixed(1)} dB`; }
const tdBuf = new Float32Array(1024);
function drawMeters() {
  $$('#mixer .strip').forEach(el => {
    el._an.getFloatTimeDomainData(tdBuf);
    let peak = 0; for (let i = 0; i < tdBuf.length; i++) { const v = Math.abs(tdBuf[i]); if (v > peak) peak = v; }
    const db = peak > 0 ? 20 * Math.log10(peak) : -100;
    const h = Math.max(0, Math.min(1, (db + 60) / 60));
    const st = el._inp ? el._inp.a : (master._m ||= { peak: 0, hold: 0 });
    st.peak = Math.max(h, (st.peak || 0) * 0.92);
    st.hold = Math.max(st.peak, (st.hold || 0) - 0.006);
    const px = el._meters[0].clientHeight;
    el._meters.forEach(m => { const i = m.firstElementChild; i.style.height = `${st.peak * 100}%`; i.style.setProperty('--h', px + 'px'); m.lastElementChild.style.bottom = `${st.hold * 100}%`; });
  });
}

// ---------------------------------------------------------------- Çıkışlar (Kayıt / Yayın)
const outState = { stream: null, record: null };
function pickMime() {
  const list = ['video/webm;codecs=h264,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function outputStream() {
  const v = prog.captureStream(Number(S.settings.fps) || 30).getVideoTracks();
  return new MediaStream([...v, ...audioDest.stream.getAudioTracks()]);
}

async function startOutput(kind) {
  resumeAudio();
  const st = S.settings;
  const mime = pickMime();
  const codec = /h264/.test(mime) ? 'h264' : /vp9/.test(mime) ? 'vp9' : 'vp8';
  const interKbps = kind === 'record' ? Math.max(st.recbitrate, 6000) : Math.max(st.vbitrate * 2, 8000);
  const ms = outputStream();
  const rec = new MediaRecorder(ms, { mimeType: mime, videoBitsPerSecond: interKbps * 1000, audioBitsPerSecond: 256000 });
  const o = { rec, ms, start: Date.now(), chunks: [], queue: Promise.resolve(), stats: null, file: null };

  if (NOVA) {
    let folder = st.folder; if (!folder) folder = st.folder = await NOVA.defaultFolder();
    const cfg = kind === 'stream'
      ? { targets: st.targets, encoder: st.encoder, preset: st.preset, vbitrate: st.vbitrate, abitrate: st.abitrate, fps: st.fps }
      : { mode: st.recMode, inputCodec: codec, format: st.format, encoder: st.encoder, preset: st.preset, recbitrate: st.recbitrate, abitrate: st.abitrate, fps: st.fps, folder };
    const r = await NOVA.outputStart(kind, cfg);
    if (!r.ok) { ms.getVideoTracks().forEach(t => t.stop()); toast(r.error, true); return; }
    o.file = r.file;
    rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      o.queue = o.queue.then(() => e.data.arrayBuffer()).then(buf => NOVA.outputChunk(kind, buf));
    };
    rec.onstop = () => { o.queue.then(() => NOVA.outputStop(kind)); };
  } else {
    if (kind === 'stream') { ms.getVideoTracks().forEach(t => t.stop()); toast('Canlı yayın (RTMP) sadece masaüstü uygulamasında çalışır.', true); return; }
    rec.ondataavailable = (e) => e.data.size && o.chunks.push(e.data);
    rec.onstop = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(o.chunks, { type: 'video/webm' }));
      a.download = `NOVA_Kayit_${Date.now()}.webm`; a.click();
    };
  }
  rec.start(200);
  outState[kind] = o;
  setOutUI();
  toast(kind === 'stream' ? 'Yayın başlatılıyor…' : 'Kayıt başladı.');
}

function stopOutput(kind) {
  const o = outState[kind]; if (!o) return;
  try { o.rec.stop(); } catch { }
  o.ms.getVideoTracks().forEach(t => t.stop());
  outState[kind] = null;
  setOutUI();
  if (kind === 'record' && o.file) toast('Kayıt kaydediliyor: ' + o.file);
}

if (NOVA) {
  NOVA.onOutputStats((kind, s) => {
    const o = outState[kind]; if (o) o.stats = s;
    const el = kind === 'stream' ? $('#sb-stream') : $('#sb-rec');
    el.classList.remove('err');
    el.textContent = `${kind === 'stream' ? 'Yayın' : 'Kayıt'}: ${s.bitrate} • ${s.fps} fps • hız ${s.speed}`;
    if (kind === 'stream') $('#btn-live').classList.remove('wait');
  });
  NOVA.onOutputEnded((kind, info) => {
    const el = kind === 'stream' ? $('#sb-stream') : $('#sb-rec');
    if (outState[kind]) { // beklenmedik bitiş
      const o = outState[kind]; try { o.rec.stop(); } catch { } o.ms.getVideoTracks().forEach(t => t.stop()); outState[kind] = null; setOutUI();
    }
    if (info.error) {
      el.textContent = `${kind === 'stream' ? 'Yayın' : 'Kayıt'} hatası: ${info.error.split('\n').pop()}`; el.classList.add('err');
      toast(`${kind === 'stream' ? 'Yayın' : 'Kayıt'} durdu: ${info.error.split('\n').pop()}`, true);
    } else {
      el.textContent = kind === 'record' && info.file ? `Kayıt kaydedildi: ${info.file}` : 'Yayın bitti.';
    }
  });
}

function setOutUI() {
  $('#btn-rec').classList.toggle('on', !!outState.record);
  $('#btn-live').classList.toggle('on', !!outState.stream);
  $('#btn-live').classList.toggle('wait', !!outState.stream && !outState.stream.stats);
  if (!outState.record) $('#rec-time').textContent = '';
  if (!outState.stream) $('#live-time').textContent = '';
}
setInterval(() => {
  const f = (o) => { const s = Math.floor((Date.now() - o.start) / 1000); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  if (outState.record) $('#rec-time').textContent = f(outState.record);
  if (outState.stream) $('#live-time').textContent = f(outState.stream);
  $('#st-clock').textContent = new Date().toLocaleTimeString('tr-TR');
}, 500);

function toggleStream() {
  if (outState.stream) return confirmBox('Canlı yayın durdurulsun mu?', () => stopOutput('stream'));
  const t = S.settings.targets.filter(x => x.enabled && x.url && x.key);
  if (NOVA && !t.length) { toast('Önce Ayarlar > Yayın bölümünden platform ve yayın anahtarı gir.', true); return openSettings('stream'); }
  startOutput('stream');
}
function toggleRecord() { outState.record ? stopOutput('record') : startOutput('record'); }

async function snapshot() {
  const url = prog.toDataURL('image/png');
  if (NOVA) {
    const dir = S.settings.folder || (S.settings.folder = await NOVA.defaultFolder());
    const f = await NOVA.saveSnapshot(dir, url); toast('Fotoğraf kaydedildi: ' + f);
  } else { const a = document.createElement('a'); a.href = url; a.download = `NOVA_Foto_${Date.now()}.png`; a.click(); }
}

let extWin = null;
function openExternal() {
  if (extWin && !extWin.closed) { extWin.focus(); return; }
  extWin = window.open('', 'nova-output');
  if (!extWin) return toast('Çıkış penceresi açılamadı.', true);
  const d = extWin.document;
  d.title = 'NOVA Canlı - Çıkış';
  d.body.style.cssText = 'margin:0;background:#000;overflow:hidden;cursor:none';
  const v = d.createElement('video');
  v.style.cssText = 'width:100vw;height:100vh;object-fit:contain;display:block';
  v.muted = true; v.autoplay = true;
  v.srcObject = new MediaStream(prog.captureStream(Number(S.settings.fps) || 30).getVideoTracks());
  d.body.appendChild(v); v.play().catch(() => { });
  v.addEventListener('dblclick', () => d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen());
  toast('Çıkış penceresi açıldı. Tam ekran için çift tıkla; 2. monitöre sürükle.');
}

// ---------------------------------------------------------------- Modal yardımcıları
function modal(title, body, foot) {
  const m = $('#modal');
  m.innerHTML = `<div class="m-head">${esc(title)}<button data-close>✕</button></div><div class="m-body"></div>${foot ? '<div class="m-foot"></div>' : ''}`;
  const b = $('.m-body', m); typeof body === 'string' ? b.innerHTML = body : b.appendChild(body);
  if (foot) foot.forEach(([label, fn, primary]) => {
    const btn = document.createElement('button'); btn.textContent = label; if (primary) btn.className = 'primary';
    btn.onclick = () => { if (fn() !== false) closeModal(); }; $('.m-foot', m).appendChild(btn);
  });
  $('[data-close]', m).onclick = closeModal;
  $('#modal-bg').classList.add('open');
  return b;
}
function closeModal() { $('#modal-bg').classList.remove('open'); $('#modal').innerHTML = ''; }
$('#modal-bg').addEventListener('mousedown', e => { if (e.target.id === 'modal-bg') closeModal(); });
function confirmBox(msg, ok) { modal('Onay', `<p>${esc(msg)}</p>`, [['Vazgeç', () => { }], ['Evet', ok, true]]); }
let toastT;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toastT); toastT = setTimeout(() => t.className = 'toast', err ? 5000 : 2800);
  $('#sb-msg').textContent = msg;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------------------------------------------------------------- Kaynak ekleme menüsü
$('#btn-add').addEventListener('click', e => { e.stopPropagation(); $('#add-menu').classList.toggle('open'); });
document.addEventListener('click', () => $('#add-menu').classList.remove('open'));
$('#add-menu').addEventListener('click', e => { const t = e.target.closest('button')?.dataset.add; if (t) addFlow(t); });

async function pickFiles(kind) {
  if (NOVA) return (await NOVA.openFiles(kind)).map(p => ({ path: p, name: baseName(p) }));
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.multiple = true;
    i.accept = { video: 'video/*', image: 'image/*', audio: 'audio/*', project: '.nova', srt: '.srt,.vtt,.txt' }[kind];
    i.onchange = () => res([...i.files].map(f => ({ url: URL.createObjectURL(f), name: f.name.replace(/\.[^.]+$/, ''), file: f })));
    i.click();
  });
}

async function addFlow(type) {
  try {
    if (type === 'video') { const f = await pickFiles('video'); if (f.length) addVideo(f[0], f.slice(1)); }
    else if (type === 'image') (await pickFiles('image')).forEach(addImage);
    else if (type === 'audio') (await pickFiles('audio')).forEach(addAudioFile);
    else if (type === 'color') { const i = addColor(); openInputSettings(i.id); }
    else if (type === 'replay') { const i = addReplay(); openInputSettings(i.id, 'tekrar'); }
    else if (type === 'studio') pickStudio();
    else if (type === 'scene') pickScene();
    else if (type === 'title') pickTitle();
    else if (type === 'camera' || type === 'mic') pickDevice(type);
    else if (type === 'screen') pickScreen();
  } catch (e) { toast('Eklenemedi: ' + (e.message || e.name), true); }
}

async function pickDevice(type) {
  const kind = type === 'camera' ? 'videoinput' : 'audioinput';
  let devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === kind);
  if (devs.length && !devs[0].label) { // isim için bir kez izin iste
    try { const s = await navigator.mediaDevices.getUserMedia(type === 'camera' ? { video: true } : { audio: true }); s.getTracks().forEach(t => t.stop()); } catch { }
    devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === kind);
  }
  if (!devs.length) return toast(type === 'camera' ? 'Kamera bulunamadı.' : 'Mikrofon bulunamadı.', true);
  const body = document.createElement('div'); body.className = 'pick';
  devs.forEach((d, k) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${type === 'camera' ? '📷' : '🎙'} ${esc(d.label || `Cihaz ${k + 1}`)}</span>`;
    b.onclick = async () => {
      closeModal();
      try { type === 'camera' ? await addCamera(d.deviceId, d.label || `Kamera ${k + 1}`) : await addMic(d.deviceId, d.label || `Mikrofon ${k + 1}`); }
      catch (e) { toast('Cihaz açılamadı: ' + (e.message || e.name), true); }
    };
    body.appendChild(b);
  });
  modal(type === 'camera' ? 'Kamera / Yakalama Kartı Seç' : 'Ses Girişi Seç', body);
}

async function pickScreen() {
  if (!NOVA) return addScreen(null, 'Ekran Paylaşımı', true);
  const sources = await NOVA.getSources();
  const wrap = document.createElement('div');
  wrap.innerHTML = `<label class="tog" style="margin:0 0 12px"><input type="checkbox" id="sc-audio"> Sistem sesini de al (oyun/müzik sesi)</label>`;
  const grid = document.createElement('div'); grid.className = 'pick'; wrap.appendChild(grid);
  sources.forEach(s => {
    const b = document.createElement('button');
    b.innerHTML = `<img src="${s.thumb}"><span>${esc(s.name)}</span>`;
    b.onclick = async () => {
      const au = $('#sc-audio').checked; closeModal();
      try { await addScreen(s.id, s.name, au); } catch (e) { toast('Yakalanamadı: ' + (e.message || e.name), true); }
    };
    grid.appendChild(b);
  });
  modal('Ekran veya Pencere Seç', wrap);
}

function pickTitle() {
  const wrap = document.createElement('div');
  TITLE_CATS.forEach(cat => {
  wrap.insertAdjacentHTML('beforeend', `<h3 class="cat-h">${cat}</h3>`);
  const grid = document.createElement('div'); grid.className = 'pick'; wrap.appendChild(grid);
  Object.entries(TITLE_TEMPLATES).filter(([, t]) => t.cat === cat).forEach(([key, t]) => {
    const b = document.createElement('button');
    const c = document.createElement('canvas');
    const fake = { title: Object.assign({ template: key, accent: t.accent || '#ff2d4b', textColor: '#fff', bg: 'rgba(10,12,18,0.88)' }, t.defaults) };
    TitleRenderer.render(c, fake, 640, 360, key === 'abone' ? 2.5 : key === 'bagis' ? 1.2 : 3);
    const img = document.createElement('img'); img.src = c.toDataURL();
    img.style.background = 'linear-gradient(135deg,#2a3550,#101522)';
    b.appendChild(img); b.insertAdjacentHTML('beforeend', `<span>${esc(t.name)}</span>`);
    b.onclick = () => { closeModal(); const i = addTitle(key); openInputSettings(i.id, 'title'); };
    grid.appendChild(b);
  });
  });
  modal(`Grafik Şablonu Seç (${Object.keys(TITLE_TEMPLATES).length} şablon)`, wrap);
}

function pickStudio() {
  const grid = document.createElement('div'); grid.className = 'pick';
  Object.entries(STUDIO_STYLES).forEach(([key, st]) => {
    const b = document.createElement('button'), c = document.createElement('canvas');
    const fake = { studio: { style: key, accent: st.accent, label: st.label, speed: 1 } };
    StudioRenderer.render(c, fake, 640, 360, 2.2);
    const img = document.createElement('img'); img.src = c.toDataURL('image/jpeg', 0.85);
    b.appendChild(img); b.insertAdjacentHTML('beforeend', `<span>${esc(st.name)}</span>`);
    b.onclick = () => { closeModal(); const i = addStudio(key); openInputSettings(i.id, 'studio'); };
    grid.appendChild(b);
  });
  modal('Sanal Stüdyo Seç', grid);
}

function pickScene() {
  const grid = document.createElement('div'); grid.className = 'pick';
  Object.entries(SCENE_PRESETS).forEach(([key, pr]) => {
    const b = document.createElement('button'), c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const x = c.getContext('2d'); x.fillStyle = key === 'roportaj' || key === 'haber' ? '#1b2a52' : '#0b0d12'; x.fillRect(0, 0, 320, 180);
    pr.cells.forEach((q, i) => { x.fillStyle = ['#ff2d4b', '#4c8dff', '#19c37d', '#ffb020'][i % 4]; x.globalAlpha = i === 0 && q[2] > 99 ? 0.45 : 0.9; x.beginPath(); x.roundRect(q[0] * 3.2, q[1] * 1.8, q[2] * 3.2, q[3] * 1.8, 6); x.fill(); x.globalAlpha = 1; x.fillStyle = '#fff'; x.font = '700 20px Segoe UI, Arial'; x.fillText(String(i + 1), q[0] * 3.2 + 8, q[1] * 1.8 + 24); });
    const img = document.createElement('img'); img.src = c.toDataURL();
    b.appendChild(img); b.insertAdjacentHTML('beforeend', `<span>${esc(pr.name)}</span>`);
    b.onclick = () => { closeModal(); const i = addScene(key); openInputSettings(i.id, 'sahne'); };
    grid.appendChild(b);
  });
  modal('Sahne / Çoklu Görüntü Düzeni', grid);
}

// ---------------------------------------------------------------- Kaynak ayarları
function openInputSettings(id, tab) {
  const inp = byId(id); if (!inp) return;
  const tabs = [['genel', 'Genel']];
  if (inp.type === 'title') tabs.push(['title', 'Metin & Stil']);
  if (inp.type === 'video') tabs.push(['liste', 'Oynatma Listesi']);
  if (inp.type === 'replay') tabs.push(['tekrar', 'Tekrar']);
  if (inp.type === 'studio') tabs.push(['studio', 'Stüdyo']);
  if (inp.type === 'scene') tabs.push(['sahne', 'Sahne Düzeni']);
  if (hasVideo(inp)) tabs.push(['konum', 'Konum / Kırp'], ['renk', 'Renk']);
  if (['camera', 'video', 'screen', 'image'].includes(inp.type)) tabs.push(['chroma', 'Yeşil Perde']);
  let cur = tab || 'genel';
  const body = document.createElement('div');
  const draw = () => {
    body.innerHTML = `<div class="tabs">${tabs.map(([k, n]) => `<button data-t="${k}" class="${k === cur ? 'on' : ''}">${n}</button>`).join('')}</div><div class="grid2"></div>`;
    $$('.tabs button', body).forEach(b => b.onclick = () => { cur = b.dataset.t; draw(); });
    const g = $('.grid2', body);
    const row = (label, html) => g.insertAdjacentHTML('beforeend', `<label>${label}</label><div class="row">${html}</div>`);
    const rng = (label, obj, key, min, max, step = 1) => {
      row(label, `<input type="range" min="${min}" max="${max}" step="${step}" value="${obj[key]}"><output>${obj[key]}</output>`);
      const r = g.lastElementChild.querySelector('input'), o = g.lastElementChild.querySelector('output');
      r.oninput = () => { obj[key] = +r.value; o.textContent = r.value; };
      r.ondblclick = () => { const d = { brightness: 100, contrast: 100, saturation: 100, opacity: 100 }[key]; if (d != null) { r.value = d; r.oninput(); } };
    };
    const txt = (label, obj, key, type = 'text', after) => {
      row(label, `<input type="${type}" value="${esc(obj[key])}" style="flex:1">`);
      const i = g.lastElementChild.querySelector('input');
      i.oninput = () => { obj[key] = type === 'number' ? +i.value : i.value; after?.(); };
    };
    const sel = (label, obj, key, opts, after) => {
      row(label, `<select style="flex:1">${opts.map(([v, n]) => `<option value="${v}" ${obj[key] == v ? 'selected' : ''}>${n}</option>`).join('')}</select>`);
      const s = g.lastElementChild.querySelector('select'); s.onchange = () => { obj[key] = s.value; after?.(); };
    };
    const chk = (label, obj, key, after) => {
      row(label, `<input type="checkbox" ${obj[key] ? 'checked' : ''}>`);
      const c = g.lastElementChild.querySelector('input'); c.onchange = () => { obj[key] = c.checked; after?.(); };
    };
    if (cur === 'genel') {
      txt('İsim', inp, 'name', 'text', () => { $(`#inputs .inp[data-id="${inp.id}"] .nm`).textContent = inp.name; updateMonitorNames(); });
      if (hasVideo(inp) && inp.type !== 'color') sel('Sığdırma', inp, 'fit', [['contain', 'Sığdır (siyah bant)'], ['cover', 'Doldur (kırp)'], ['stretch', 'Esnet']]);
      if (inp.type === 'color') {
        txt('Renk 1', inp.src, 'color', 'color'); txt('Renk 2 (degrade)', inp.src, 'color2', 'color');
        row('', `<button>Degradeyi kaldır</button>`); g.lastElementChild.querySelector('button').onclick = () => { inp.src.color2 = ''; };
      }
      const m = mediaEl(inp);
      if (m) {
        chk(inp.list ? 'Döngü (liste bitince başa dön)' : 'Döngü (tekrar)', inp, 'loop', () => m.loop = inp.loop && (!inp.list || inp.list.length === 1));
        chk('Yayına girince oynat', inp, 'autoPlay');
        row('Hız', `<select style="flex:1">${[0.5, 0.75, 1, 1.25, 1.5, 2].map(v => `<option ${m.playbackRate === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`);
        g.lastElementChild.querySelector('select').onchange = (e) => m.playbackRate = +e.target.value;
      }
      if (hasAudio(inp)) {
        chk('Ses görüntüyü izlesin (AFV)', inp.audio, 'afv', () => { updateAudioGains(inp); renderMixer(); });
        chk('Kompresör (sesi dengele)', inp.audio, 'comp', () => applyComp(inp));
      }
    } else if (cur === 'title') {
      const t = inp.title;
      row('Şablon', `<select style="flex:1">${TITLE_CATS.map(cat => `<optgroup label="${cat}">${Object.entries(TITLE_TEMPLATES).filter(([, v]) => v.cat === cat).map(([k, v]) => `<option value="${k}" ${t.template === k ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</optgroup>`).join('')}</select>`);
      g.lastElementChild.querySelector('select').onchange = (e) => {
        t.template = e.target.value; const T = TITLE_TEMPLATES[t.template];
        Object.entries(T.defaults).forEach(([k, v]) => { if (t[k] == null || t[k] === '') t[k] = v; });
        if (T.accent) t.accent = T.accent;
        inp.name = T.name; renderInputs(); draw();
      };
      (TITLE_TEMPLATES[t.template].fields || []).forEach(f => {
        const label = FIELD_LABELS[f] || f;
        if (f === 'scoreA' || f === 'scoreB') {
          row(label, `<button>−</button><input type="number" value="${t[f]}" style="width:70px"><button>+</button>`);
          const [mn, i, pl] = g.lastElementChild.children;
          i.oninput = () => t[f] = +i.value;
          mn.onclick = () => { t[f] = Math.max(0, (+t[f] || 0) - 1); i.value = t[f]; };
          pl.onclick = () => { t[f] = (+t[f] || 0) + 1; i.value = t[f]; };
        } else if (FIELD_TEXTAREA.has(f)) {
          row(label, `<textarea rows="4" style="flex:1;resize:vertical">${esc(t[f] || '')}</textarea>`);
          const ta = g.lastElementChild.querySelector('textarea'); ta.oninput = () => { t[f] = ta.value; };
        } else if (FIELD_SELECT[f]) {
          sel(label, t, f, FIELD_SELECT[f].map(v => [v, v]));
        } else if (FIELD_COLOR.has(f)) {
          txt(label, t, f, 'color');
        } else txt(label, t, f, FIELD_NUMBER.has(f) ? 'number' : 'text', () => { if (f === 'minutes') inp._cdStart = null; });
      });
      if (titleHasList(inp) && t.template !== 'altyazi') {
        row('Listede', `<button>⏮ Önceki</button><span style="flex:1;text-align:center" class="li-pos"></span><button>Sonraki ⏭</button>`);
        const [pv, pos, nx] = g.lastElementChild.children;
        const upd = () => { const n = titleItemCount(t); pos.textContent = n ? `${(t.itemIdx || 0) % n + 1} / ${n} • ${titleLines(t)[0]}` : 'Liste boş — tek isim kullanılır'; };
        pv.onclick = () => { titleNext(inp, -1); upd(); }; nx.onclick = () => { titleNext(inp, 1); upd(); }; upd();
      }
      if (t.template === 'altyazi') {
        row('SRT dosyası', `<button>SRT / VTT yükle</button><button>Kaldır</button><span style="flex:1" class="note"></span>`);
        const [ld, rm, info] = g.lastElementChild.children;
        const upd = () => info.textContent = t.srtCues?.length ? `${t.srtCues.length} altyazı yüklü • yayına girdiği andan itibaren zamanlı oynar` : 'Yok — satırlar ⏭ ile elle ilerletilir (N tuşu)';
        ld.onclick = async () => {
          const f = (await pickFiles('srt'))[0]; if (!f) return;
          const txt2 = NOVA && f.path ? await NOVA.readFile(f.path) : await f.file.text();
          t.srtCues = parseSRT(txt2); t.srtName = f.name; upd();
          toast(t.srtCues.length ? `${t.srtCues.length} altyazı yüklendi.` : 'SRT okunamadı.', !t.srtCues.length);
        };
        rm.onclick = () => { t.srtCues = null; upd(); }; upd();
        row('', `<button>⏮ Önceki satır</button><button>Sonraki satır ⏭</button><button>Zamanı baştan başlat</button>`);
        const [p1, n1, rs] = g.lastElementChild.children;
        p1.onclick = () => titleNext(inp, -1); n1.onclick = () => titleNext(inp, 1); rs.onclick = () => { inp.onAirSince = performance.now(); };
      }
      if (t.template === 'geri' || t.template === 'birazdan') { row('', '<button>Sayacı yeniden başlat</button>'); g.lastElementChild.querySelector('button').onclick = () => inp._cdStart = null; }
      if (t.template === 'sayac') { row('', '<button>Sıfırla</button>'); g.lastElementChild.querySelector('button').onclick = () => inp._swStart = performance.now(); }
      if (t.template === 'futbol') { row('Maç saati', '<button>Sıfırla (başlangıç dakikasından)</button>'); g.lastElementChild.querySelector('button').onclick = () => inp._fbStart = null; }
      txt('Vurgu rengi', t, 'accent', 'color');
      txt('Yazı rengi', t, 'textColor', 'color');
      row('Kutu rengi', `<input type="color" value="${toHex(t.bg)}"><input type="range" min="0" max="100" value="${alphaOf(t.bg)}" title="Saydamlık">`);
      const [bc, ba] = g.lastElementChild.children;
      const upd = () => { const [r, gg, b] = hexToRgb(bc.value); t.bg = `rgba(${r},${gg},${b},${ba.value / 100})`; };
      bc.oninput = upd; ba.oninput = upd;
    } else if (cur === 'studio') {
      const st = inp.studio;
      sel('Stüdyo', st, 'style', Object.entries(STUDIO_STYLES).map(([k, v]) => [k, v.name]), () => { const d = STUDIO_STYLES[st.style]; st.accent = d.accent; st.label = d.label; inp.name = d.name; renderInputs(); draw(); });
      txt('Vurgu rengi', st, 'accent', 'color');
      txt('Yazı (masa / tabela)', st, 'label', 'text');
      rng('Hareket hızı', st, 'speed', 0, 3, 0.1);
      g.insertAdjacentHTML('beforeend', `<span></span><p class="note">Stüdyoyu arka plan olarak programa al, yeşil perdeli kamerayı Overlay'de aç ya da bir Sahne'nin arka planı yap.</p>`);
    } else if (cur === 'sahne') {
      const sc = inp.scene;
      const opts = [['', '— Yok —'], ...S.inputs.filter(i => i.id !== inp.id && i.type !== 'scene' && hasVideo(i)).map(i => [i.id, `${i.n}. ${i.name}`])];
      sel('Hazır düzen', sc, 'preset', Object.entries(SCENE_PRESETS).map(([k, v]) => [k, v.name]), () => { applyScenePreset(inp, sc.preset); inp.name = 'Sahne: ' + SCENE_PRESETS[sc.preset].name; renderInputs(); draw(); });
      row('Arka plan', `<select style="flex:1">${opts.map(([v, n]) => `<option value="${v}" ${String(sc.bg ?? '') === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`);
      g.lastElementChild.querySelector('select').onchange = e => sc.bg = e.target.value ? +e.target.value : null;
      sc.layers.forEach((L, k) => {
        row(`Pencere ${k + 1}`, `<select style="flex:1">${opts.map(([v, n]) => `<option value="${v}" ${String(L.id ?? '') === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
          <select title="Sığdırma"><option value="cover" ${L.fit === 'cover' ? 'selected' : ''}>Doldur</option><option value="contain" ${L.fit === 'contain' ? 'selected' : ''}>Sığdır</option></select>
          ${['x', 'y', 'w', 'h'].map(q => `<input type="number" step="0.5" value="${L[q]}" title="${{ x: 'X %', y: 'Y %', w: 'Genişlik %', h: 'Yükseklik %' }[q]}" style="width:62px">`).join('')}`);
        const [src, fit, ...nums] = g.lastElementChild.children;
        src.onchange = () => L.id = src.value ? +src.value : null; fit.onchange = () => L.fit = fit.value;
        nums.forEach((n, j) => n.oninput = () => L[['x', 'y', 'w', 'h'][j]] = +n.value);
      });
      row('', `<button>+ Pencere ekle</button><button>Son pencereyi sil</button>`);
      const [ad, dl] = g.lastElementChild.children;
      ad.onclick = () => { if (sc.layers.length < 6) { sc.layers.push({ id: null, x: 35, y: 35, w: 30, h: 30, fit: 'cover' }); draw(); } };
      dl.onclick = () => { if (sc.layers.length > 1) { sc.layers.pop(); draw(); } };
      rng('Çerçeve kalınlığı', sc, 'border', 0, 20); txt('Çerçeve rengi', sc, 'borderColor', 'color');
      rng('Köşe yuvarlaklığı', sc, 'radius', 0, 80); chk('Gölge', sc, 'shadow');
      g.insertAdjacentHTML('beforeend', `<span></span><p class="note">Pencerelere kamera, ekran, video, resim veya stüdyo seçebilirsin. Sahneyi programa aldığında içindeki videolar oynar, sesleri (AFV) açılır.</p>`);
    } else if (cur === 'liste') {
      g.style.gridTemplateColumns = '1fr';
      const ul = document.createElement('div'); ul.style.cssText = 'display:flex;flex-direction:column;gap:6px';
      inp.list.forEach((it, k) => {
        const r = document.createElement('div'); r.className = 'row';
        r.innerHTML = `<span style="flex:1;${k === inp.idx ? 'color:#19c37d;font-weight:700' : ''}">${k + 1}. ${esc(it.name)}${k === inp.idx ? '  ▶' : ''}</span>
          <button data-l="play">Oynat</button><button data-l="up">▲</button><button data-l="down">▼</button><button data-l="del">✕</button>`;
        r.onclick = (e) => {
          const a = e.target.dataset.l; if (!a) return;
          if (a === 'play') loadListItem(inp, k, true);
          else if (a === 'up' && k > 0) { [inp.list[k - 1], inp.list[k]] = [inp.list[k], inp.list[k - 1]]; if (inp.idx === k) inp.idx--; else if (inp.idx === k - 1) inp.idx++; }
          else if (a === 'down' && k < inp.list.length - 1) { [inp.list[k + 1], inp.list[k]] = [inp.list[k], inp.list[k + 1]]; if (inp.idx === k) inp.idx++; else if (inp.idx === k + 1) inp.idx--; }
          else if (a === 'del' && inp.list.length > 1) { inp.list.splice(k, 1); if (k === inp.idx) loadListItem(inp, Math.min(k, inp.list.length - 1), !inp.el.paused); else if (k < inp.idx) inp.idx--; }
          renderInputs(); draw();
        };
        ul.appendChild(r);
      });
      g.appendChild(ul);
      g.insertAdjacentHTML('beforeend', `<div class="row"><button class="primary">+ Video Ekle</button></div><p class="note">Bir video bitince sıradaki otomatik oynar. "Döngü" açıksa liste bitince başa döner.</p>`);
      $('button.primary', g).onclick = async () => { const f = await pickFiles('video'); f.forEach(x => inp.list.push({ path: x.path || null, url: x.url || null, name: x.name })); renderInputs(); draw(); };
    } else if (cur === 'tekrar') {
      row('Yakalanacak süre', `<select style="flex:1">${[5, 8, 10, 15, 20, 30].map(v => `<option ${inp.rp.secs === v ? 'selected' : ''} value="${v}">Son ${v} saniye</option>`).join('')}</select>`);
      g.lastElementChild.querySelector('select').onchange = e => inp.rp.secs = +e.target.value;
      row('Oynatma hızı', `<select style="flex:1">${[0.25, 0.5, 0.75, 1].map(v => `<option ${inp.rp.speed === v ? 'selected' : ''} value="${v}">${v}x${v < 1 ? ' (yavaş çekim)' : ''}</option>`).join('')}</select>`);
      g.lastElementChild.querySelector('select').onchange = e => { inp.rp.speed = +e.target.value; renderInputs(); };
      row('', '<button class="primary">⏺ Şimdi yakala</button>'); g.lastElementChild.querySelector('button').onclick = () => replayMark(inp);
      g.insertAdjacentHTML('beforeend', `<span></span><p class="note">Program çıktısı sürekli hafızada tutulur. R tuşu: son anları yakalar ve tekrarı yayına alır. Gol, kill, önemli an için idealdir.</p>`);
    } else if (cur === 'konum') {
      row('Hazır konumlar', ['Tam', 'Sol Üst', 'Sağ Üst', 'Sol Alt', 'Sağ Alt', 'Sol Yarı', 'Sağ Yarı'].map(n => `<button>${n}</button>`).join(''));
      const P = { 'Tam': [0, 0, 100, 100], 'Sol Üst': [3, 4, 30, 30], 'Sağ Üst': [67, 4, 30, 30], 'Sol Alt': [3, 66, 30, 30], 'Sağ Alt': [67, 66, 30, 30], 'Sol Yarı': [0, 0, 50, 100], 'Sağ Yarı': [50, 0, 50, 100] };
      $$('button', g.lastElementChild).forEach(b => b.onclick = () => { const [x, y, w, h] = P[b.textContent]; Object.assign(inp.layout, { x, y, w, h }); draw(); });
      rng('X (%)', inp.layout, 'x', -50, 150, 0.5); rng('Y (%)', inp.layout, 'y', -50, 150, 0.5);
      rng('Genişlik (%)', inp.layout, 'w', 1, 200, 0.5); rng('Yükseklik (%)', inp.layout, 'h', 1, 200, 0.5);
      rng('Kırp Sol (%)', inp.crop, 'l', 0, 90); rng('Kırp Sağ (%)', inp.crop, 'r', 0, 90);
      rng('Kırp Üst (%)', inp.crop, 't', 0, 90); rng('Kırp Alt (%)', inp.crop, 'b', 0, 90);
      g.insertAdjacentHTML('beforeend', `<span></span><p class="note">İpucu: Kamerayı "Sağ Alt"a koyup Overlay olarak açarsan resim içinde resim (PIP) olur.</p>`);
    } else if (cur === 'renk') {
      rng('Parlaklık', inp.fx, 'brightness', 0, 200); rng('Kontrast', inp.fx, 'contrast', 0, 200);
      rng('Doygunluk', inp.fx, 'saturation', 0, 200); rng('Opaklık', inp.fx, 'opacity', 0, 100);
      chk('Ayna (yatay çevir)', inp.fx, 'mirror');
    } else if (cur === 'chroma') {
      chk('Yeşil perde açık', inp.chroma, 'on');
      txt('Anahtar renk', inp.chroma, 'color', 'color');
      row('Hazır', `<button>Yeşil</button><button>Mavi</button>`);
      const [gr, bl] = g.lastElementChild.children; gr.onclick = () => { inp.chroma.color = '#00ff00'; draw(); }; bl.onclick = () => { inp.chroma.color = '#0047ff'; draw(); };
      rng('Benzerlik', inp.chroma, 'similarity', 0, 100); rng('Yumuşaklık', inp.chroma, 'smoothness', 0, 100); rng('Renk taşması', inp.chroma, 'spill', 0, 100);
      g.insertAdjacentHTML('beforeend', `<span></span><p class="note">Arka plan için önce bir resim/video kaynağını programa al, yeşil perdeli kamerayı Overlay 1'de aç.</p>`);
    }
  };
  draw();
  modal(`${inp.n}. ${inp.name} — Ayarlar`, body, [['Kapat', () => { }, true]]);
}
function toHex(c) { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : (c || '#000000'); }
function alphaOf(c) { const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(c || ''); return m ? Math.round(+m[1] * 100) : 100; }

// ---------------------------------------------------------------- Genel ayarlar
function openSettings(tab = 'stream') {
  const st = S.settings; let cur = tab;
  const busy = () => !!(outState.stream || outState.record);
  const body = document.createElement('div');
  const draw = () => {
    body.innerHTML = `<div class="tabs">${[['stream', 'Yayın'], ['enc', 'Kodlama'], ['rec', 'Kayıt'], ['gen', 'Genel']].map(([k, n]) => `<button data-t="${k}" class="${k === cur ? 'on' : ''}">${n}</button>`).join('')}</div><div id="sp"></div>`;
    $$('.tabs button', body).forEach(b => b.onclick = () => { cur = b.dataset.t; draw(); });
    const sp = $('#sp', body);
    if (cur === 'stream') {
      sp.innerHTML = `<div class="targets"></div><div style="margin-top:10px;display:flex;gap:8px"><button id="t-add">+ Platform Ekle</button></div>
        <p class="note">Birden fazla platformu işaretlersen aynı anda hepsine yayın yapılır (çoklu yayın). Yayın anahtarını platformun canlı yayın panelinden kopyala. Anahtar sadece bu bilgisayarda saklanır.</p>`;
      const tl = $('.targets', sp);
      st.targets.forEach((t, k) => {
        const r = document.createElement('div'); r.className = 'target';
        r.innerHTML = `<input type="checkbox" ${t.enabled ? 'checked' : ''} title="Aktif">
          <select>${Object.keys(PLATFORMS).map(p => `<option ${p === t.name ? 'selected' : ''}>${p}</option>`).join('')}</select>
          <input placeholder="Sunucu (rtmp://...)" value="${esc(t.url)}">
          <input type="password" placeholder="Yayın anahtarı" value="${esc(t.key)}">
          <button title="Sil">✕</button>`;
        const [en, pl, url, key, del] = r.children;
        en.onchange = () => t.enabled = en.checked;
        pl.onchange = () => { t.name = pl.value; if (PLATFORMS[t.name]) { t.url = PLATFORMS[t.name]; url.value = t.url; } };
        url.oninput = () => t.url = url.value.trim();
        key.oninput = () => t.key = key.value.trim();
        key.onfocus = () => key.type = 'text'; key.onblur = () => key.type = 'password';
        del.onclick = () => { st.targets.splice(k, 1); draw(); };
        tl.appendChild(r);
      });
      $('#t-add', sp).onclick = () => { st.targets.push({ name: 'Özel', url: '', key: '', enabled: true }); draw(); };
    } else if (cur === 'enc') {
      sp.innerHTML = `<div class="grid2">
        <label>Kodlayıcı</label><select id="e-enc">
          <option value="libx264">x264 (İşlemci - her yerde çalışır)</option>
          <option value="h264_nvenc">NVIDIA NVENC (Ekran kartı)</option>
          <option value="h264_qsv">Intel QuickSync</option>
          <option value="h264_amf">AMD AMF</option></select>
        <label>x264 ön ayar</label><select id="e-pre">${['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'].map(p => `<option>${p}</option>`).join('')}</select>
        <label>Video bit hızı (kbps)</label><input id="e-vb" type="number" min="500" max="50000" step="250">
        <label>Ses bit hızı (kbps)</label><select id="e-ab">${[96, 128, 160, 192, 256, 320].map(p => `<option>${p}</option>`).join('')}</select>
      </div><p class="note">Öneri: 1080p30 için 4500–6000 kbps, 720p30 için 2500–4000 kbps. Ekran kartın varsa NVENC/QSV/AMF işlemciyi rahatlatır (oyun yayınında önerilir).</p>`;
      bind('#e-enc', 'encoder'); bind('#e-pre', 'preset'); bind('#e-vb', 'vbitrate', true); bind('#e-ab', 'abitrate', true);
    } else if (cur === 'rec') {
      sp.innerHTML = `<div class="grid2">
        <label>Kayıt klasörü</label><div class="row"><input id="r-dir" style="flex:1" readonly placeholder="Videolar\\NOVA Canli"><button id="r-pick">Seç</button><button id="r-open">Aç</button></div>
        <label>Biçim</label><select id="r-fmt"><option value="mp4">MP4</option><option value="mkv">MKV (elektrik kesilse bile bozulmaz)</option></select>
        <label>Kayıt modu</label><select id="r-mode"><option value="copy">Hızlı (yeniden kodlamadan)</option><option value="encode">Yeniden kodla (kodlayıcı ayarıyla)</option></select>
        <label>Kayıt kalitesi (kbps)</label><input id="r-vb" type="number" min="2000" max="80000" step="1000">
      </div>`;
      $('#r-dir', sp).value = st.folder || '';
      $('#r-pick', sp).onclick = async () => { if (!NOVA) return; const d = await NOVA.chooseFolder(); if (d) { st.folder = d; $('#r-dir', sp).value = d; } };
      $('#r-open', sp).onclick = async () => { if (!NOVA) return; NOVA.openFolder(st.folder || await NOVA.defaultFolder()); };
      bind('#r-fmt', 'format'); bind('#r-mode', 'recMode'); bind('#r-vb', 'recbitrate', true);
    } else if (cur === 'gen') {
      sp.innerHTML = `<div class="grid2">
        <label>Çözünürlük</label><select id="g-res"><option value="1920x1080">1920×1080 (1080p)</option><option value="1280x720">1280×720 (720p)</option><option value="2560x1440">2560×1440 (1440p)</option><option value="1080x1920">1080×1920 (Dikey - TikTok/Reels)</option><option value="720x1280">720×1280 (Dikey 720p)</option></select>
        <label>Kare hızı</label><select id="g-fps"><option>25</option><option>30</option><option>50</option><option>60</option></select>
        <label>Varsayılan geçiş</label><select id="g-tt">${Object.entries(TR_NAMES).filter(([k]) => k !== 'cut').map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
        <label>Yayından çıkınca videoyu duraklat</label><input id="g-ap" type="checkbox">
        <label>Güncellemeleri otomatik al</label><div class="row"><input id="g-au" type="checkbox"><span class="note" style="margin:0">Yeni sürüm arka planda iner, program kapanınca kurulur</span></div>
        <label>Anlık tekrar arabelleği</label><div class="row"><input id="g-rp" type="checkbox"><select id="g-rps"><option value="15">15 sn</option><option value="30">30 sn</option><option value="60">60 sn</option></select></div>
        <label>Hızlı geçiş butonları</label><div id="g-q" style="display:grid;grid-template-columns:1fr 80px;gap:6px"></div>
      </div>${busy() ? '<p class="note">Yayın/kayıt sürerken çözünürlük ve kare hızı değiştirilemez.</p>' : ''}`;
      const res = $('#g-res', sp); res.value = `${st.width}x${st.height}`; res.disabled = busy();
      res.onchange = () => { const [w, h] = res.value.split('x').map(Number); st.width = w; st.height = h; applyResolution(); };
      const fps = $('#g-fps', sp); fps.value = st.fps; fps.disabled = busy();
      fps.onchange = () => { st.fps = +fps.value; applyResolution(); };
      bind('#g-tt', 'transType', false, () => $('#tr-type').value = st.transType);
      const ap = $('#g-ap', sp); ap.checked = st.autoPause; ap.onchange = () => st.autoPause = ap.checked;
      const au = $('#g-au', sp); au.checked = st.autoUpdate !== false; au.onchange = () => { st.autoUpdate = au.checked; if (au.checked) checkUpdates(false); };
      const rp = $('#g-rp', sp); rp.checked = st.replayOn; rp.onchange = () => { st.replayOn = rp.checked; if (!rp.checked) RP.frames = []; };
      bind('#g-rps', 'replaySecs', true);
      const q = $('#g-q', sp);
      st.quick.forEach(x => {
        const s = document.createElement('select'); s.innerHTML = Object.entries(TR_NAMES).map(([k, n]) => `<option value="${k}" ${k === x.type ? 'selected' : ''}>${n}</option>`).join('');
        const n = document.createElement('input'); n.type = 'number'; n.value = x.ms; n.step = 100; n.min = 100;
        s.onchange = () => { x.type = s.value; renderQuick(); }; n.oninput = () => { x.ms = +n.value; renderQuick(); };
        q.append(s, n);
      });
    }
    function bind(sel, key, num, after) {
      const e = $(sel, sp); e.value = st[key];
      e.onchange = e.oninput = () => { st[key] = num ? Number(e.value) : e.value; after?.(); };
    }
  };
  draw();
  modal('Ayarlar', body, [['Kaydet ve Kapat', () => { saveSettings(); }, true]]);
}

async function saveSettings() {
  if (NOVA) await NOVA.saveSettings(S.settings);
  else try { localStorage.setItem('nova-canli-ayar', JSON.stringify(S.settings)); } catch { }
}
async function loadSettings() {
  let s = null;
  if (NOVA) s = await NOVA.loadSettings();
  else try { s = JSON.parse(localStorage.getItem('nova-canli-ayar')); } catch { }
  if (s) S.settings = Object.assign(structuredClone(DEFAULTS), s);
}

// ---------------------------------------------------------------- Proje kaydet / aç
function serialize() {
  return JSON.stringify({
    app: 'NOVA Canlı', version: 1,
    inputs: S.inputs.map(i => ({
      type: i.type, name: i.name, src: i.src, fit: i.fit, layout: i.layout, crop: i.crop, fx: i.fx, chroma: i.chroma,
      audio: { vol: i.audio.vol, muted: i.audio.muted, afv: i.audio.afv, comp: i.audio.comp }, loop: i.loop, autoPlay: i.autoPlay, title: i.title,
      list: i.list?.filter(x => x.path).map(x => ({ path: x.path, name: x.name })), rp: i.rp ? { speed: i.rp.speed, secs: i.rp.secs } : undefined,
      studio: i.studio,
      scene: i.scene ? { ...i.scene, bg: S.inputs.findIndex(x => x.id === i.scene.bg), layers: i.scene.layers.map(l => ({ ...l, id: S.inputs.findIndex(x => x.id === l.id) })) } : undefined
    })),
    previewIndex: S.inputs.findIndex(i => i.id === S.previewId),
    programIndex: S.inputs.findIndex(i => i.id === S.programId),
    overlays: S.overlays.map(o => S.inputs.findIndex(i => i.id === o.inputId)),
    master: { vol: master.vol, muted: master.muted }
  }, null, 2);
}
async function saveProject(asNew) {
  if (!NOVA) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([serialize()])); a.download = 'yayin.nova'; a.click(); return; }
  const f = await NOVA.saveProject(serialize(), asNew ? null : S.projectFile);
  if (f) { S.projectFile = f; toast('Proje kaydedildi: ' + f); }
}
function clearAll() { [...S.inputs].forEach(i => removeInput(i.id)); S.projectFile = null; S.ftb.on = false; }
async function openProject() {
  const files = await pickFiles('project'); if (!files.length) return;
  const json = NOVA ? await NOVA.readFile(files[0].path) : await files[0].file.text();
  let p; try { p = JSON.parse(json); } catch { return toast('Proje dosyası okunamadı.', true); }
  clearAll();
  S.projectFile = files[0].path || null;
  const made = [];
  for (const d of p.inputs || []) {
    let inp = null;
    try {
      if (d.type === 'camera') inp = await addCamera(d.src.deviceId, d.src.label);
      else if (d.type === 'mic') inp = await addMic(d.src.deviceId, d.src.label);
      else if (d.type === 'screen') inp = await addScreen(d.src.sourceId, d.src.name, d.src.withAudio);
      else if (d.type === 'video' && d.list?.length) inp = addVideo(d.list[0], d.list.slice(1));
      else if (d.type === 'video' && d.src.path) inp = addVideo({ path: d.src.path });
      else if (d.type === 'replay') { inp = addReplay(); Object.assign(inp.rp, d.rp || {}); }
      else if (d.type === 'image' && d.src.path) inp = addImage({ path: d.src.path });
      else if (d.type === 'audio' && d.src.path) inp = addAudioFile({ path: d.src.path });
      else if (d.type === 'color') inp = addColor(d.src.color, d.src.color2);
      else if (d.type === 'title') inp = addTitle(d.title.template, d.title);
      else if (d.type === 'studio') inp = addStudio(d.studio?.style, d.studio);
      else if (d.type === 'scene') { inp = addScene(d.scene?.preset); inp._sceneData = d.scene; }
    } catch (e) { toast(`"${d.name}" yüklenemedi: ${e.message || e.name}`, true); }
    if (inp) {
      Object.assign(inp, { name: d.name, fit: d.fit, layout: d.layout, crop: d.crop, fx: d.fx, chroma: d.chroma, loop: d.loop, autoPlay: d.autoPlay });
      Object.assign(inp.audio, d.audio); if (inp.a) applyComp(inp); updateAudioGains(inp, true);
      const m = mediaEl(inp); if (m) m.loop = inp.loop && (!inp.list || inp.list.length === 1);
    }
    made.push(inp);
  }
  made.forEach(inp => { // sahne referanslarını yeni kimliklere çevir
    if (!inp?._sceneData) return; const d = inp._sceneData; delete inp._sceneData;
    Object.assign(inp.scene, d, { bg: made[d.bg]?.id ?? null, layers: d.layers.map(l => ({ ...l, id: made[l.id]?.id ?? null })) });
  });
  S.previewId = made[p.previewIndex]?.id ?? S.previewId;
  S.programId = made[p.programIndex]?.id ?? null;
  (p.overlays || []).forEach((k, n) => { S.overlays[n].inputId = made[k]?.id ?? null; S.overlays[n].on = false; });
  if (p.master) { Object.assign(master, p.master); updateMaster(); }
  renderInputs(); renderMixer(); renderOverlays();
  toast('Proje açıldı.');
}

// ---------------------------------------------------------------- Sürükle bırak
let dropHint = null;
window.addEventListener('dragover', e => { e.preventDefault(); if (!dropHint) { dropHint = document.createElement('div'); dropHint.className = 'drop-hint'; dropHint.textContent = 'Kaynak olarak eklemek için bırak'; document.body.appendChild(dropHint); } });
window.addEventListener('dragleave', e => { if (e.relatedTarget == null && dropHint) { dropHint.remove(); dropHint = null; } });
window.addEventListener('drop', e => {
  e.preventDefault(); dropHint?.remove(); dropHint = null;
  for (const f of e.dataTransfer.files) {
    const path = NOVA ? NOVA.pathForFile(f) : null;
    const obj = path ? { path, name: baseName(path) } : { url: URL.createObjectURL(f), name: f.name.replace(/\.[^.]+$/, '') };
    if (f.type.startsWith('video/') || /\.(mp4|mov|mkv|webm|m4v)$/i.test(f.name)) addVideo(obj);
    else if (f.type.startsWith('image/')) addImage(obj);
    else if (f.type.startsWith('audio/')) addAudioFile(obj);
  }
});

// ---------------------------------------------------------------- Butonlar ve kısayollar
const ACTIONS = {
  cut, auto: () => transition(), ftb: () => { S.ftb.on = !S.ftb.on; $('#btn-ftb').classList.toggle('on', S.ftb.on); },
  record: toggleRecord, stream: toggleStream, snapshot, external: openExternal,
  settings: () => openSettings('stream'), save: () => saveProject(false), open: openProject,
  new: () => confirmBox('Tüm kaynaklar kaldırılıp yeni proje başlatılsın mı?', clearAll),
  about: async () => {
    const ver = NOVA?.appVersion ? await NOVA.appVersion() : APP_VERSION;
    const b = modal('Hakkında', `<div style="text-align:center;padding:10px 0 4px">
      <img src="img/icon.png" width="84" height="84" style="border-radius:18px"><h2 style="margin:10px 0 2px">NOVA Canlı</h2>
      <div style="color:var(--dim)">Sürüm ${esc(ver)}</div>
      <p>vMix tarzı ücretsiz canlı yayın ve prodüksiyon programı.</p>
      <p><b>Geliştirici:</b> Samet Şahin — @xsametsahinx</p>
      <p><a href="#" id="gh-link" style="color:var(--accent)">${GITHUB_URL.replace('https://', '')}</a></p>
      <div style="display:flex;gap:8px;justify-content:center;align-items:center;margin-top:12px">
        <button id="upd-check" class="primary">Güncellemeleri denetle</button><button id="upd-install" style="display:none">Yeniden başlat ve güncelle</button></div>
      <p class="note" id="upd-msg">${esc(updText())}</p></div>`);
    $('#gh-link', b).onclick = (e) => { e.preventDefault(); NOVA?.openUrl ? NOVA.openUrl(GITHUB_URL) : window.open(GITHUB_URL); };
    $('#upd-check', b).onclick = () => checkUpdates(true);
    $('#upd-install', b).onclick = () => installUpdate();
    refreshUpdUI();
  },
  update: () => UPD.st === 'ready' ? installUpdate() : ACTIONS.about(),
  help: () => modal('Klavye Kısayolları', `<table class="keys">
    <tr><td><kbd>Enter</kbd></td><td>KES (önizlemeyi programa al)</td></tr>
    <tr><td><kbd>Boşluk</kbd></td><td>Otomatik geçiş</td></tr>
    <tr><td><kbd>1</kbd> … <kbd>9</kbd></td><td>Kaynağı önizlemeye al</td></tr>
    <tr><td><kbd>Shift</kbd> + <kbd>1</kbd> … <kbd>9</kbd></td><td>Kaynağı doğrudan programa kes</td></tr>
    <tr><td><kbd>Ctrl</kbd> + <kbd>1</kbd> … <kbd>9</kbd></td><td>Kaynağa hızlı geçiş</td></tr>
    <tr><td><kbd>F1</kbd> … <kbd>F4</kbd></td><td>Overlay 1–4 aç/kapa</td></tr>
    <tr><td><kbd>B</kbd></td><td>Siyaha karart (FTB)</td></tr>
    <tr><td><kbd>R</kbd></td><td>Anlık tekrar: son anları yakala ve yayına al</td></tr>
    <tr><td><kbd>N</kbd> / <kbd>Shift</kbd>+<kbd>N</kbd></td><td>Yayındaki alt bantta sonraki / önceki isim, altyazıda sonraki satır</td></tr>
    <tr><td><kbd>Ctrl</kbd> + <kbd>R</kbd></td><td>Kayıt başlat/durdur</td></tr>
    <tr><td><kbd>Ctrl</kbd> + <kbd>S</kbd></td><td>Projeyi kaydet</td></tr>
    <tr><td><kbd>Ctrl</kbd> + <kbd>O</kbd></td><td>Proje aç</td></tr>
    <tr><td><kbd>F12</kbd></td><td>Fotoğraf (PNG)</td></tr></table>`)
};
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) ACTIONS[b.dataset.act]?.(); });

$('#tr-type').addEventListener('change', e => { S.settings.transType = e.target.value; });
$('#tr-dur').addEventListener('input', e => { S.settings.transMs = +e.target.value || 600; });
$('#monitor-tog').addEventListener('change', e => { S.settings.monitor = e.target.checked; updateMaster(); });

document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select') || $('#modal-bg').classList.contains('open')) { if (e.key === 'Escape') closeModal(); return; }
  const k = e.key;
  if (k === 'Enter') { e.preventDefault(); cut(); }
  else if (k === ' ') { e.preventDefault(); transition(); }
  else if (/^F[1-4]$/.test(k)) { e.preventDefault(); toggleOverlay(+k[1] - 1); }
  else if (k === 'F12') { e.preventDefault(); snapshot(); }
  else if (k.toLowerCase() === 'b' && !e.ctrlKey) ACTIONS.ftb();
  else if (k.toLowerCase() === 'r' && !e.ctrlKey) replayHotkey();
  else if (k.toLowerCase() === 'n' && !e.ctrlKey) { const on = S.inputs.filter(i => i.onAir && titleHasList(i) && titleItemCount(i.title)); on.forEach(i => titleNext(i, e.shiftKey ? -1 : 1)); if (!on.length) toast('Yayında isim listeli grafik yok.', true); }
  else if (e.ctrlKey && k.toLowerCase() === 's') { e.preventDefault(); saveProject(e.shiftKey); }
  else if (e.ctrlKey && k.toLowerCase() === 'o') { e.preventDefault(); openProject(); }
  else if (e.ctrlKey && k.toLowerCase() === 'r') { e.preventDefault(); toggleRecord(); }
  else {
    const m = /^(Digit|Numpad)([1-9])$/.exec(e.code);
    if (m) {
      const inp = S.inputs[+m[2] - 1]; // kart numarası
      if (!inp || !hasVideo(inp)) return;
      if (e.shiftKey) quickCut(inp.id); else if (e.ctrlKey) { e.preventDefault(); quickTrans(inp.id); } else toPreview(inp.id);
    }
  }
});

// ---------------------------------------------------------------- Otomatik güncelleme
const UPD = { st: 'idle', d: {} };
function updText() {
  const d = UPD.d;
  return {
    idle: 'Güncellemeler GitHub üzerinden otomatik denetlenir.', checking: 'Güncellemeler denetleniyor…',
    none: `En güncel sürümü kullanıyorsun (v${d.version || APP_VERSION}).`, available: `Yeni sürüm bulundu: v${d.version}. İndiriliyor…`,
    progress: `Güncelleme indiriliyor… %${d.percent || 0}`, ready: `v${d.version} hazır. Yeniden başlatınca kurulur (ya da program kapanınca otomatik).`,
    error: `Güncelleme denetlenemedi: ${d.message || ''}`, off: d.reason || 'Güncelleme kullanılamıyor.'
  }[UPD.st] || '';
}
function refreshUpdUI() {
  const btn = $('#btn-upd');
  const show = ['available', 'progress', 'ready'].includes(UPD.st);
  btn.hidden = !show;
  btn.classList.toggle('ready', UPD.st === 'ready');
  btn.querySelector('span').textContent = UPD.st === 'ready' ? `GÜNCELLE v${UPD.d.version}` : UPD.st === 'progress' ? `İNDİRİLİYOR %${UPD.d.percent || 0}` : 'GÜNCELLEME';
  const m = $('#upd-msg'); if (m) m.textContent = updText();
  const ib = $('#upd-install'); if (ib) ib.style.display = UPD.st === 'ready' ? '' : 'none';
}
async function checkUpdates(manual) {
  if (!NOVA?.updateCheck) { if (manual) { UPD.st = 'off'; UPD.d = { reason: 'Güncelleme sadece kurulu masaüstü sürümünde çalışır.' }; refreshUpdUI(); } return; }
  const r = await NOVA.updateCheck();
  if (!r.ok && manual) { UPD.st = 'off'; UPD.d = { reason: r.reason }; refreshUpdUI(); }
}
async function installUpdate() {
  if (outState.stream || outState.record) return toast('Yayın / kayıt sürerken güncellenemez. Bitince tekrar dene ya da programı kapatınca otomatik kurulur.', true);
  saveSettings();
  const ok = await NOVA?.updateInstall?.();
  if (!ok) toast('Güncelleme henüz hazır değil.', true);
}
if (NOVA?.onUpdateStatus) NOVA.onUpdateStatus((st, d) => {
  const prev = UPD.st; UPD.st = st; UPD.d = d || {};
  if (st === 'available' && prev !== 'available') toast(`Yeni sürüm v${d.version} bulundu, arka planda indiriliyor…`);
  if (st === 'ready') toast(`NOVA Canlı v${d.version} indirildi. Üstteki "GÜNCELLE" düğmesiyle kur ya da program kapanınca otomatik kurulsun.`);
  refreshUpdUI();
});

// ---------------------------------------------------------------- Başlat
(async function init() {
  await loadSettings();
  $('#tr-type').value = S.settings.transType;
  $('#tr-dur').value = S.settings.transMs;
  $('#monitor-tog').checked = S.settings.monitor;
  applyResolution(); updateMaster(); renderQuick(); renderOverlays(); renderMixer(); renderInputs();
  // Başlangıç sahnesi: arka plan + logo yazısı
  const bg = addColor('#0b1230', '#3a0d2e'); bg.name = 'Arka Plan';
  const t = addTitle('baslik', { line1: 'NOVA CANLI', line2: 'Yayına hazır' });
  S.programId = bg.id; S.previewId = t.id;
  renderInputs();
  $('.credit').textContent = `NOVA Canlı v${APP_VERSION} • Samet Şahin (@xsametsahinx)`;
  if (S.settings.autoUpdate !== false) { setTimeout(() => checkUpdates(false), 6000); setInterval(() => { if (S.settings.autoUpdate !== false && UPD.st !== 'ready') checkUpdates(false); }, 3 * 3600 * 1000); }
  toast('NOVA Canlı hazır. "+ Kaynak Ekle" ile başla.');
  window.__nova = { addStudio, addScene, applyScenePreset, titleNext, pickTitle, pickStudio, pickScene, openInputSettings, addReplay, replayMark, replayHotkey, RP, S, cut, transition, toggleOverlay, startOutput, stopOutput, addTitle, addColor, addVideo, addImage, outState, prog }; // test erişimi
})();
