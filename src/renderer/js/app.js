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
  recBus: 'M', monBus: 'M', streamBus: 'M', replayExtraHalf: true, replayQuality: 'med',
  stingers: [
    { kind: 'builtin', style: 'serit', color: '#ff2d4b', dur: 1000, cut: 500 },
    { kind: 'builtin', style: 'logo', color: '#7b3cff', dur: 1200, cut: 600 },
    { kind: 'builtin', style: 'perde', color: '#4c8dff', dur: 1000, cut: 500 },
    { kind: 'builtin', style: 'murekkep', color: '#19c37d', dur: 1100, cut: 550 },
    { kind: 'builtin', style: 'kare', color: '#ffb020', dur: 1000, cut: 500 },
    { kind: 'builtin', style: 'isik', color: '#ffffff', dur: 800, cut: 400 },
    { kind: 'builtin', style: 'kaydir', color: '#ff5ea8', dur: 700, cut: 350 },
    null
  ],
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
const TR_NAMES = { cut: 'Kes', fade: 'Geçiş', alphafade: 'AlfaGeçiş', dip: 'Siyah', dipw: 'Beyaz', wipe: 'Silme', slide: 'Kaydır', push: 'İt', zoom: 'Yakınlaş', circle: 'Daire' };
const APP_VERSION = '1.4.0';
const GITHUB_URL = 'https://github.com/pepsicosamet-arch/NovaCanli';
const TYPE_NAMES = { web: 'WEB', delay: 'GECİKME', draw: 'ÇİZİM', photos: 'FOTO', studio: 'STÜDYO', scene: 'SAHNE', replay: 'TEKRAR', camera: 'KAMERA', screen: 'EKRAN', video: 'VİDEO', image: 'RESİM', color: 'RENK', title: 'GRAFİK', mic: 'MİKROFON', audio: 'SES' };

let S = {
  settings: structuredClone(DEFAULTS),
  inputs: [], nextId: 1,
  previewId: null, programId: null,
  overlays: [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ inputId: null, on: false, alpha: 0 })),
  filter: { q: '', cat: null },
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
  replaySize();
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
monitorGain.connect(AC.destination);
// Sessiz de olsa her zaman bir ses izi olsun (ffmpeg için)
const silent = AC.createConstantSource(); silent.offset.value = 0; silent.connect(audioDest); silent.start();
const master = { vol: 1, muted: false };
// Ses bus'ları (vMix tarzı): her kanal Master / A / B'ye ayrı ayrı yönlendirilebilir
const BUS = {};
for (const k of ['A', 'B']) {
  const gain = AC.createGain(), an = AC.createAnalyser(); an.fftSize = 1024;
  const dest = AC.createMediaStreamDestination();
  gain.connect(an); an.connect(dest); silent.connect(dest);
  BUS[k] = { gain, an, dest, vol: 1, muted: false };
}
const monSel = { M: AC.createGain(), A: AC.createGain(), B: AC.createGain() };
masterAnalyser.connect(monSel.M); BUS.A.an.connect(monSel.A); BUS.B.an.connect(monSel.B);
Object.values(monSel).forEach(g => g.connect(monitorGain));
function busDest(k) { return k === 'A' || k === 'B' ? BUS[k].dest : audioDest; }
const resumeAudio = () => { if (AC.state !== 'running') AC.resume(); };
document.addEventListener('pointerdown', resumeAudio);
document.addEventListener('keydown', resumeAudio);

function setupAudio(inp, node) {
  const comp = AC.createDynamicsCompressor();
  const gain = AC.createGain();
  const analyser = AC.createAnalyser(); analyser.fftSize = 1024;
  const afvGain = AC.createGain();
  const route = { M: AC.createGain(), A: AC.createGain(), B: AC.createGain() };
  node.connect(comp); comp.connect(gain); gain.connect(analyser); analyser.connect(afvGain);
  afvGain.connect(route.M); route.M.connect(masterGain);
  afvGain.connect(route.A); route.A.connect(BUS.A.gain);
  afvGain.connect(route.B); route.B.connect(BUS.B.gain);
  if (!inp.audio.bus) inp.audio.bus = { M: true, A: false, B: false };
  inp.a = { node, comp, gain, analyser, afvGain, route, peak: 0, hold: 0 };
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
  const b = inp.audio.bus || { M: true };
  for (const k of ['M', 'A', 'B']) inp.a.route[k].gain.setTargetAtTime(b[k] ? 1 : 0, t, 0.02);
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
  for (const k of ['A', 'B']) BUS[k].gain.gain.setTargetAtTime(BUS[k].muted ? 0 : BUS[k].vol, AC.currentTime, 0.03);
  const mb = S.settings.monBus || 'M';
  for (const k of ['M', 'A', 'B']) monSel[k].gain.setTargetAtTime(mb === k ? 1 : 0, AC.currentTime, 0.02);
  monitorGain.gain.setTargetAtTime(S.settings.monitor ? 1 : 0, AC.currentTime, 0.03);
}

// ---------------------------------------------------------------- Kaynaklar
const mediaUrl = (p) => `nova://app/__media?p=${encodeURIComponent(p)}`;
const netUrl = (u) => NOVA ? `nova://app/__url?u=${encodeURIComponent(u)}` : u;
const isNet = (u) => /^https?:\/\//i.test(String(u || ''));
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
  if (Number.isInteger(S._insertAt) && S._insertAt >= 0 && S._insertAt < S.inputs.length) S.inputs.splice(S._insertAt++, 0, inp);
  else S.inputs.push(inp);
  renumber();
  if (S.previewId == null && hasVideo(inp)) S.previewId = inp.id;
  renderInputs(); renderMixer(); renderOverlays();
  return inp;
}
function renumber() { S.inputs.forEach((i, n) => i.n = n + 1); }

async function addCamera(deviceId, label, opts) {
  const o = Object.assign({ w: 1920, h: 1080, fps: 60, audioId: null }, opts || {});
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: o.w }, height: { ideal: o.h }, frameRate: { ideal: o.fps } },
    audio: o.audioId ? { deviceId: { exact: o.audioId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : false
  });
  const inp = baseInput('camera', label || 'Kamera');
  inp.src = { deviceId, label, opts: o };
  if (stream.getAudioTracks().length) { inp.audio.afv = true; setupAudio(inp, AC.createMediaStreamSource(new MediaStream(stream.getAudioTracks()))); }
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
  v.addEventListener('ended', () => { if (inp.idx >= inp.list.length - 1 && !inp.loop) fireTriggers(inp, 'onEnd'); nextInList(inp, 1, true); });
  inp.el = v;
  setupAudio(inp, AC.createMediaElementSource(v));
  loadListItem(inp, 0, false);
  return registerInput(inp);
}
function loadListItem(inp, i, play) {
  const it = inp.list[i]; if (!it) return;
  inp.idx = i;
  const v = inp.el;
  if (!NOVA && isNet(it.url)) v.crossOrigin = 'anonymous';
  v.src = it.path ? mediaUrl(it.path) : isNet(it.url) ? netUrl(it.url) : it.url;
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
function cardName(inp) {
  if (inp.type === 'photos') return `${inp.name}  (${inp.photos.list.length ? inp.photos.idx + 1 : 0}/${inp.photos.list.length})`;
  return inp.list && inp.list.length > 1 ? `${inp.name}  (${inp.idx + 1}/${inp.list.length})` : inp.name;
}

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

// ---- Fotoğraf slayt gösterisi (vMix Photos)
function addPhotos(files, opts) {
  const inp = baseInput('photos', 'Slayt Gösterisi');
  inp.photos = Object.assign({ list: files.map(f => ({ path: f.path || null, url: f.url || null, name: f.name || baseName(f.path) })), idx: 0, interval: 5, fade: 800, shuffle: false, fit: 'cover', kenburns: true }, opts || {});
  inp.loop = true; inp.fit = 'stretch';
  inp.el = document.createElement('canvas'); inp.el.width = W; inp.el.height = H;
  inp._ph = { imgs: new Map(), prev: null, since: performance.now() };
  return registerInput(inp);
}
function photoImg(inp, i) {
  const it = inp.photos.list[i]; if (!it) return null;
  const key = it.path || it.url; let m = inp._ph.imgs.get(key);
  if (!m) {
    m = new Image(); m.decoding = 'async'; m.src = it.path ? mediaUrl(it.path) : it.url; inp._ph.imgs.set(key, m);
    if (inp._ph.imgs.size > 8) inp._ph.imgs.delete(inp._ph.imgs.keys().next().value); // bellek: son 8 fotoğraf
  }
  return m;
}
function photosNext(inp, dir, auto) {
  const P = inp.photos, n = P.list.length; if (!n) return;
  let i;
  if (P.shuffle && n > 1 && dir > 0) { do i = Math.floor(Math.random() * n); while (i === P.idx); }
  else i = P.idx + dir;
  if (i >= n) { if (auto && !inp.loop) { fireTriggers(inp, 'onEnd'); return; } i = 0; }
  if (i < 0) i = n - 1;
  inp._ph.prev = P.idx; P.idx = i; inp._ph.since = performance.now();
  photoImg(inp, (i + 1) % n); // sıradakini önceden yükle
  const nm = $(`#inputs .inp[data-id="${inp.id}"] .nm`); if (nm) nm.textContent = cardName(inp);
}
function renderPhotos(inp, t) {
  const c = inp.el; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const x = c.getContext('2d'), P = inp.photos, ph = inp._ph, n = P.list.length;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  if (!n) { x.fillStyle = '#8a93a8'; x.font = `600 ${H / 22}px Segoe UI, Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Ayarlardan fotoğraf ekle', W / 2, H / 2); return; }
  if (P.idx >= n) P.idx = 0;
  if (inp.onAir && n > 1 && t - ph.since > P.interval * 1000) photosNext(inp, 1, true);
  const k = Math.min(1, (t - ph.since) / Math.max(1, P.fade));
  const draw = (img, a, since) => {
    if (!img || !img.complete || !img.naturalWidth) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let s = P.fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
    if (P.kenburns) s *= 1 + 0.07 * Math.min(1, (t - since) / ((P.interval * 1000 + P.fade) || 1));
    x.globalAlpha = a; x.drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s); x.globalAlpha = 1;
  };
  if (ph.prev != null && k < 1) draw(photoImg(inp, ph.prev), 1, ph.since - P.interval * 1000);
  draw(photoImg(inp, P.idx), ph.prev != null ? k : 1, ph.since);
}

// ---- Tetikleyiciler (vMix Triggers): bir olay olunca otomatik eylem
const TRIG_EVENTS = { onIn: 'Yayına girince', onOut: 'Yayından çıkınca', onEnd: 'Video / liste / slayt bitince', cdEnd: 'Geri sayım bitince', cdLeft: 'Geri sayımda … sn kala' };
const TRIG_ACTIONS = {
  cut: 'Kaynağa kes', fade: 'Kaynağa geçiş (Fade)', auto: 'Kaynağa varsayılan geçiş', stinger: 'Stinger ile kaynağa geç',
  ovOn: 'Overlay aç', ovOff: 'Overlay kapat', ovToggle: 'Overlay aç/kapa',
  play: 'Oynat', pause: 'Duraklat', restart: 'Başa sar', next: 'Listede sonraki',
  recStart: 'Kaydı başlat', recStop: 'Kaydı durdur', streamStart: 'Yayını başlat', streamStop: 'Yayını durdur',
  ftbOn: 'Siyaha karart', ftbOff: 'Karartmayı kaldır', replay: 'Anlık tekrar yakala'
};
function trigEventsFor(inp) {
  const e = ['onIn', 'onOut'];
  if (inp.type === 'video' || inp.type === 'audio' || inp.type === 'photos') e.push('onEnd');
  if (inp.type === 'title' && ['geri', 'birazdan'].includes(inp.title.template)) e.push('cdEnd', 'cdLeft');
  return e;
}
function fireTriggers(inp, ev) {
  (inp.triggers || []).filter(t => t.ev === ev).forEach(t => setTimeout(() => runTrigger(inp, t), 0));
}
function runTrigger(inp, tr) {
  const id = tr.target ?? inp.id, tgt = byId(id), n = Number(tr.n) || 0, m = tgt && mediaEl(tgt);
  if (!tgt && !['recStart', 'recStop', 'streamStart', 'streamStop', 'ftbOn', 'ftbOff', 'replay'].includes(tr.act)) return;
  switch (tr.act) {
    case 'cut': quickCut(id); break;
    case 'fade': quickTrans(id, 'fade', 600); break;
    case 'auto': quickTrans(id); break;
    case 'stinger': stingerTo(n, id); break;
    case 'ovOn': { const o = S.overlays[n]; o.inputId = id; o.on = true; renderOverlays(); markInputs(); break; }
    case 'ovOff': { const o = S.overlays[n]; if (!tr.target || o.inputId === id) o.on = false; renderOverlays(); markInputs(); break; }
    case 'ovToggle': toggleOverlay(n, id); break;
    case 'play': m?.play().catch(() => { }); break;
    case 'pause': m?.pause(); break;
    case 'restart': if (m) m.currentTime = 0; if (tgt.type === 'photos') { tgt.photos.idx = 0; tgt._ph.since = performance.now(); } break;
    case 'next': if (tgt.type === 'video') nextInList(tgt, 1, false); else if (tgt.type === 'photos') photosNext(tgt, 1); else if (tgt.type === 'title') titleNext(tgt, 1); break;
    case 'recStart': if (!outState.record) startOutput('record'); break;
    case 'recStop': stopOutput('record'); break;
    case 'streamStart': if (!outState.stream) toggleStream(); break;
    case 'streamStop': stopOutput('stream'); break;
    case 'ftbOn': S.ftb.on = true; $('#btn-ftb').classList.add('on'); break;
    case 'ftbOff': S.ftb.on = false; $('#btn-ftb').classList.remove('on'); break;
    case 'replay': replayHotkey(); break;
  }
  toast(`Tetikleyici: ${inp.name} → ${TRIG_ACTIONS[tr.act]}${tgt && tgt !== inp ? ' (' + tgt.name + ')' : ''}`);
}
function checkCountdowns() {
  for (const inp of S.inputs) {
    if (inp.type !== 'title' || !inp.triggers?.length || !inp._cdStart) continue;
    const d = inp.title; if (!['geri', 'birazdan'].includes(d.template) || !(Number(d.minutes) > 0)) continue;
    if (inp._cdKey !== inp._cdStart) { inp._cdKey = inp._cdStart; inp._cdFired = new Set(); }
    const left = Number(d.minutes) * 60 - (performance.now() - inp._cdStart) / 1000;
    inp.triggers.forEach((tr, k) => {
      if (inp._cdFired.has(k)) return;
      if ((tr.ev === 'cdEnd' && left <= 0) || (tr.ev === 'cdLeft' && left <= (Number(tr.secs) || 0) && left > -2)) { inp._cdFired.add(k); runTrigger(inp, tr); }
    });
  }
}

// ---- Web Tarayıcı kaynağı (OBS "browser source" gibi): masaüstünde görünmez bir tarayıcı sayfayı çizer
let webSeq = 0;
function addWeb(cfg) {
  const inp = baseInput('web', 'Web Tarayıcı');
  inp.web = Object.assign({ url: 'https://example.com', w: 1280, h: 720, fps: 30, css: '', audio: false, transparent: true }, cfg || {});
  try { inp.name = new URL(inp.web.url).hostname.replace(/^www\./, '') || inp.name; } catch { }
  inp.el = document.createElement('canvas'); inp.el.width = inp.web.w; inp.el.height = inp.web.h;
  inp._webId = 'w' + (++webSeq) + '_' + Date.now();
  inp.fit = 'contain';
  webDrawInfo(inp, NOVA?.webOpen ? 'Sayfa yükleniyor…' : 'Web Tarayıcı kaynağı masaüstü uygulamasında çalışır');
  NOVA?.webOpen?.(inp._webId, inp.web);
  return registerInput(inp);
}
function webDrawInfo(inp, msg) {
  const c = inp.el.getContext('2d'), w = inp.el.width, h = inp.el.height;
  c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(10,12,18,0.6)'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#c3c9dc'; c.font = `600 ${h / 22}px Segoe UI, Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(msg, w / 2, h / 2 - h / 30); c.fillStyle = '#8a93a8'; c.font = `500 ${h / 34}px Segoe UI, Arial`; c.fillText(inp.web.url, w / 2, h / 2 + h / 22);
}
function webApply(inp) { // ayar değişince sayfayı yeniden aç
  inp.el.width = inp.web.w; inp.el.height = inp.web.h;
  NOVA?.webClose?.(inp._webId); inp._webId = 'w' + (++webSeq) + '_' + Date.now();
  webDrawInfo(inp, 'Sayfa yükleniyor…'); NOVA?.webOpen?.(inp._webId, inp.web);
}
if (NOVA?.onWebFrame) NOVA.onWebFrame((id, w, h, buf) => { const inp = S.inputs.find(i => i._webId === id); if (inp) inp._webPending = { w, h, buf }; });
if (NOVA?.onWebEvent) NOVA.onWebEvent((id, ev, info) => {
  const inp = S.inputs.find(i => i._webId === id); if (!inp) return;
  if (ev === 'fail') { webDrawInfo(inp, 'Sayfa açılamadı: ' + (info || '')); toast(`${inp.name}: sayfa açılamadı (${info || 'hata'})`, true); }
  if (ev === 'title' && info && inp.name === 'Web Tarayıcı') { inp.name = String(info).slice(0, 40); renderInputs(); }
});
function renderWeb(inp) {
  const f = inp._webPending; if (!f) return; inp._webPending = null;
  const c = inp.el; if (c.width !== f.w || c.height !== f.h) { c.width = f.w; c.height = f.h; }
  const u8 = f.buf.byteOffset % 4 ? f.buf.slice() : f.buf;
  const src = new Uint32Array(u8.buffer, u8.byteOffset, f.w * f.h);
  const img = new ImageData(f.w, f.h), dst = new Uint32Array(img.data.buffer);
  for (let i = 0; i < src.length; i++) { const v = src[i]; dst[i] = (v & 0xff00ff00) | ((v & 0xff) << 16) | ((v >> 16) & 0xff); } // BGRA → RGBA
  c.getContext('2d').putImageData(img, 0, 0);
}

// ---- Video gecikmesi (Video Delay): bir kaynağı N ms geriden gösterir (ses/görüntü senkronu, sansür payı)
function addDelay(srcId, ms = 2000) {
  const inp = baseInput('delay', 'Video Gecikmesi');
  inp.delay = { src: srcId ?? null, ms };
  inp.el = document.createElement('canvas'); inp.el.width = W; inp.el.height = H;
  inp._dl = { cv: document.createElement('canvas'), frames: [], busy: 0, bm: null, shown: -1, loading: false };
  inp.fit = 'stretch';
  const s = byId(srcId); if (s) inp.name = `${s.name} (+${(ms / 1000).toFixed(1)} sn)`;
  return registerInput(inp);
}
function delayCapture(t) {
  for (const inp of S.inputs) {
    if (inp.type !== 'delay') continue;
    const D = inp._dl, src = byId(inp.delay.src);
    if (!src || !hasVideo(src) || src.type === 'delay' || D.busy > 6) continue;
    const w = 960, h = Math.round(960 * H / W); if (D.cv.width !== w || D.cv.height !== h) { D.cv.width = w; D.cv.height = h; }
    const c = D.cv.getContext('2d', { alpha: false }); c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    drawContent(c, src, 1, 0, 0, w, h, t, null);
    D.busy++;
    D.cv.toBlob(b => { D.busy--; if (!b) return; D.frames.push({ t, b }); const lim = t - inp.delay.ms - 1500; while (D.frames.length > 2 && D.frames[0].t < lim) D.frames.shift(); }, 'image/jpeg', 0.82);
  }
}
function renderDelay(inp, t) {
  const D = inp._dl, target = t - inp.delay.ms;
  let i = -1; for (let k = D.frames.length - 1; k >= 0; k--) if (D.frames[k].t <= target) { i = k; break; }
  const c = inp.el; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  if (i < 0) { if (D.shown < 0) { const x = c.getContext('2d'); x.fillStyle = '#05070c'; x.fillRect(0, 0, W, H); x.fillStyle = '#8a93a8'; x.font = `600 ${H / 24}px Segoe UI, Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(byId(inp.delay.src) ? 'Gecikme tamponu doluyor…' : 'Ayarlardan kaynak seç', W / 2, H / 2); } return; }
  const f = D.frames[i]; if (f.t === D.shown || D.loading) return;
  D.loading = true;
  createImageBitmap(f.b).then(bm => { D.loading = false; D.shown = f.t; c.getContext('2d').drawImage(bm, 0, 0, W, H); bm.close(); }).catch(() => { D.loading = false; });
}

// ---- Telestratör: canlı görüntünün üstüne çizim (ok, daire, kalem) — overlay olarak kullanılır
function addDraw(cfg) {
  const inp = baseInput('draw', 'Telestratör');
  inp.draw = Object.assign({ strokes: [], color: '#ffd23f', size: 8, tool: 'pen' }, cfg || {});
  inp.el = document.createElement('canvas'); inp.el.width = W; inp.el.height = H;
  inp.fit = 'stretch';
  return registerInput(inp);
}
function drawStrokes(c, strokes, w, h) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const st of strokes) {
    const P = st.pts; if (!P.length) continue;
    c.strokeStyle = st.c; c.fillStyle = st.c; c.lineWidth = st.w * w / 1920;
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 6 * w / 1920;
    if (st.tool === 'circle' && P.length > 1) {
      const [a, b] = [P[0], P[P.length - 1]];
      c.beginPath(); c.ellipse((a[0] + b[0]) / 2 * w, (a[1] + b[1]) / 2 * h, Math.abs(b[0] - a[0]) / 2 * w, Math.abs(b[1] - a[1]) / 2 * h, 0, 0, Math.PI * 2); c.stroke();
    } else if (st.tool === 'arrow' && P.length > 1) {
      const [a, b] = [P[0], P[P.length - 1]], ax = a[0] * w, ay = a[1] * h, bx = b[0] * w, by = b[1] * h, ang = Math.atan2(by - ay, bx - ax), hl = st.w * w / 1920 * 4;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - hl * Math.cos(ang - 0.45), by - hl * Math.sin(ang - 0.45)); c.lineTo(bx - hl * Math.cos(ang + 0.45), by - hl * Math.sin(ang + 0.45)); c.closePath(); c.fill();
    } else {
      c.beginPath(); c.moveTo(P[0][0] * w, P[0][1] * h); for (const p of P) c.lineTo(p[0] * w, p[1] * h); c.stroke();
    }
  }
  c.shadowBlur = 0;
}
function renderDraw(inp) {
  const c = inp.el; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const x = c.getContext('2d'); x.clearRect(0, 0, W, H); drawStrokes(x, inp.draw.strokes, W, H);
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
  const pri = { camera: 0, screen: 1, video: 2, replay: 3, image: 4, photos: 5 };
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

async function addMic(deviceId, label, opts) {
  const o = Object.assign({ ec: false, ns: false, agc: false }, opts || {});
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: o.ec, noiseSuppression: o.ns, autoGainControl: o.agc }, video: false
  });
  const inp = baseInput('mic', label || 'Mikrofon');
  inp.src = { deviceId, label, opts: o };
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
  a.addEventListener('ended', () => fireTriggers(inp, 'onEnd'));
  setupAudio(inp, AC.createMediaElementSource(a));
  return registerInput(inp);
}

// ---------------------------------------------------------------- Anlık tekrar (Instant Replay) — çok açılı
// 4 açıya kadar (Program + kameralar) sürekli küçük JPEG kareler olarak hafızada tutulur (son N saniye).
// Her yakalama bir "olay" olur: etiketlenir, aranır, tek açıdan ya da Quad View (4'lü) oynatılır.
const RP_N = 8;
const RP = { bufs: Array.from({ length: RP_N }, () => ({ cv: document.createElement('canvas'), frames: [], busy: 0, src: undefined, bytes: 0 })), evId: 0 };
const RP_Q = { low: [640, 480], med: [960, 640], high: [1280, 960] }; // [1. açı, diğer açılar] genişlik
function replaySize() { const q = RP_Q[S.settings.replayQuality] || RP_Q.med; RP.bufs.forEach((B, a) => { const w = a === 0 ? q[0] : q[1]; B.cv.width = w; B.cv.height = Math.round(w * H / W); B.frames = []; B.bytes = 0; }); }
function replayMemMB() { let b = 0; RP.bufs.forEach(B => b += B.bytes); const seen = new Set(); S.inputs.forEach(i => i.rp?.events.forEach(ev => ev.clips.forEach(c => c.forEach(f => { if (!seen.has(f.b)) { seen.add(f.b); b += f.b.size; } })))); return b / 1048576; }
function replayClear() { RP.bufs.forEach(B => { B.frames = []; B.bytes = 0; }); }
function replayAngles() { const r = S.inputs.find(i => i.type === 'replay'); return r ? r.rp.angles : ['pgm', null, null, null, null, null, null, null]; }
function replayAngleName(src) { return src === 'pgm' ? 'Program' : src == null ? null : (byId(src)?.name || null); }
function replayCapture(t) {
  if (!S.settings.replayOn) return;
  const angles = replayAngles(), lim = t - (Number(S.settings.replaySecs) || 30) * 1000;
  RP.bufs.forEach((B, a) => {
    const src = angles[a] ?? null;
    if (src !== B.src) { B.src = src; B.frames = []; }
    if (src == null) return;
    if (a > 0 && S.settings.replayExtraHalf && frame % 2) return; // ek açılar 15 fps: daha az işlemci
    if (B.busy > 6) return;
    const c = B.cv.getContext('2d', { alpha: false }), w = B.cv.width, h = B.cv.height;
    if (src === 'pgm') c.drawImage(prog, 0, 0, w, h);
    else { const inp = byId(src); if (!inp || !hasVideo(inp)) return; c.fillStyle = '#000'; c.fillRect(0, 0, w, h); drawContent(c, inp, 1, 0, 0, w, h, t, null); }
    B.busy++;
    B.cv.toBlob(b => { B.busy--; if (!b) return; B.frames.push({ t, b }); B.bytes += b.size; while (B.frames.length && B.frames[0].t < lim) B.bytes -= B.frames.shift().b.size; }, 'image/jpeg', 0.8);
  });
}
function addReplay() {
  const inp = baseInput('replay', 'Anlık Tekrar');
  inp.el = document.createElement('canvas'); inp.el.width = W; inp.el.height = H;
  const first = !S.inputs.some(i => i.type === 'replay');
  const cams = S.inputs.filter(i => i.type === 'camera' || i.type === 'screen').slice(0, 7).map(i => i.id);
  const N8 = () => Array(RP_N).fill(null);
  inp.rp = { events: [], ev: null, angle: 0, quad: false, group: 0, speed: 0.5, secs: 8, time: 0, last: N8().map(() => -1), loading: N8().map(() => 0), bm: N8(),
    inT: { type: 'fade', ms: 500 }, outT: { type: 'fade', ms: 500 }, autoReturn: false, returnTo: null,
    angles: first ? ['pgm', ...Array.from({ length: RP_N - 1 }, (_, k) => cams[k] ?? null)] : ['pgm', ...Array(RP_N - 1).fill(null)] };
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
  if (!S.settings.replayOn) { toast('Anlık tekrar Ayarlar > Genel bölümünden kapalı.', true); return Promise.resolve(false); }
  const from = performance.now() - inp.rp.secs * 1000;
  const clips = RP.bufs.map(B => B.frames.filter(f => f.t >= from));
  if (!clips.some(c => c.length)) { toast('Henüz kaydedilmiş görüntü yok.', true); return Promise.resolve(false); }
  let t0 = Infinity, t1 = 0; clips.forEach(c => { if (c.length) { t0 = Math.min(t0, c[0].t); t1 = Math.max(t1, c[c.length - 1].t); } });
  const ev = { id: ++RP.evId, name: `Olay ${RP.evId}`, clock: new Date().toLocaleTimeString('tr-TR'), tags: [], clips, t0, len: t1 - t0,
    names: replayAngles().map(replayAngleName) };
  inp.rp.events.unshift(ev); if (inp.rp.events.length > 40) inp.rp.events.pop();
  toast(`${ev.name} yakalandı: son ${inp.rp.secs} sn, ${clips.filter(c => c.length).length} açı (${inp.rp.speed}x).`);
  return replayPlay(inp, ev);
}
function replayQuadSet(rp) { const g = rp.group ? 4 : 0; return [g, g + 1, g + 2, g + 3]; }
function replayPlay(inp, ev) {
  const rp = inp.rp; rp.ev = ev; rp.time = 0; rp.last = Array(RP_N).fill(-1); rp.loading = Array(RP_N).fill(0); rp._returned = false;
  rp.bm.forEach(b => b?.close?.()); rp.bm = Array(RP_N).fill(null);
  if (!ev.clips[rp.angle]?.length) rp.angle = Math.max(0, ev.clips.findIndex(c => c.length));
  const need = rp.quad ? replayQuadSet(rp) : [rp.angle];
  return Promise.all(need.filter(a => ev.clips[a]?.length).map(a => createImageBitmap(ev.clips[a][0].b).then(bm => { rp.bm[a] = bm; rp.last[a] = 0; }).catch(() => { })))
    .then(() => { replayRender(inp); return true; });
}
function replaySetAngle(inp, a) { const rp = inp.rp; rp.angle = a; rp.quad = false; rp.last = Array(RP_N).fill(-1); if (rp.ev && !rp.ev.clips[a]?.length) toast(`Bu olayda ${a + 1}. açı kaydı yok.`, true); renderInputs(); }
function replayToggleQuad(inp, group) {
  const rp = inp.rp;
  if (group != null) { rp.group = group; rp.quad = true; } else rp.quad = !rp.quad;
  rp.last = Array(RP_N).fill(-1);
  toast(`Tekrar: ${rp.quad ? `Quad View (açı ${rp.group ? '5–8' : '1–4'})` : `${rp.angle + 1}. açı`}`); renderInputs();
}
function replayRender(inp) {
  const c = inp.el.getContext('2d'), w = inp.el.width, h = inp.el.height, rp = inp.rp, s = h / 1080, ev = rp.ev;
  c.fillStyle = '#05070c'; c.fillRect(0, 0, w, h);
  c.textBaseline = 'middle';
  if (rp.quad) {
    replayQuadSet(rp).forEach((a, q) => {
      const x = (q % 2) * w / 2, y = (q >> 1) * h / 2;
      if (rp.bm[a]) c.drawImage(rp.bm[a], x, y, w / 2, h / 2);
      else { c.fillStyle = '#5d667c'; c.textAlign = 'center'; c.font = `600 ${30 * s}px Segoe UI, Arial`; c.fillText('Açı kaydı yok', x + w / 4, y + h / 4); }
      const lb = `${a + 1}  ${ev?.names[a] || '—'}`; c.font = `800 ${26 * s}px Segoe UI, Arial`; const lw = c.measureText(lb).width + 30 * s;
      c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(x + 16 * s, y + h / 2 - 60 * s, lw, 44 * s);
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(lb, x + 31 * s, y + h / 2 - 38 * s);
    });
    c.fillStyle = '#000'; c.fillRect(w / 2 - 2 * s, 0, 4 * s, h); c.fillRect(0, h / 2 - 2 * s, w, 4 * s);
  } else if (rp.bm[rp.angle]) c.drawImage(rp.bm[rp.angle], 0, 0, w, h);
  c.fillStyle = '#ff2d4b'; c.beginPath(); c.roundRect(w - 330 * s, 50 * s, 270 * s, 70 * s, 10 * s); c.fill();
  c.fillStyle = '#fff'; c.font = `900 ${34 * s}px Segoe UI, Arial`; c.textAlign = 'center';
  c.fillText(`TEKRAR ${rp.speed < 1 ? '• ' + rp.speed + 'x' : ''}`, w - 195 * s, 86 * s);
  if (ev && ev.tags.length && !rp.quad) {
    const tg = ev.tags.join(' • '); c.font = `700 ${26 * s}px Segoe UI, Arial`; const tw = c.measureText(tg).width + 40 * s;
    c.fillStyle = 'rgba(0,0,0,0.65)'; c.beginPath(); c.roundRect(w - 60 * s - tw, 130 * s, tw, 48 * s, 8 * s); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText(tg, w - 80 * s, 155 * s);
  }
}
function replayTick(dt) {
  for (const inp of S.inputs) {
    if (inp.type !== 'replay' || !inp.rp.ev) continue;
    const rp = inp.rp, ev = rp.ev;
    rp.time += dt * rp.speed;
    if (rp.time > ev.len + 400) {
      rp.time = 0;
      // Çıkış geçişi: olay bir kez bitince canlı yayına geri dön
      if (rp.autoReturn && !rp._returned && S.programId === inp.id && byId(rp.returnTo)) { rp._returned = true; quickTrans(rp.returnTo, rp.outT.type, rp.outT.ms); }
    }
    for (const a of rp.quad ? replayQuadSet(rp) : [rp.angle]) {
      const clip = ev.clips[a]; if (!clip?.length || rp.loading[a]) continue;
      let i = rp.last[a] < 0 ? 0 : rp.last[a];
      if (clip[i].t - ev.t0 > rp.time) i = 0;
      while (i + 1 < clip.length && clip[i + 1].t - ev.t0 <= rp.time) i++;
      if (i === rp.last[a]) continue;
      rp.loading[a] = 1; rp.last[a] = i;
      createImageBitmap(clip[i].b).then(bm => { rp.loading[a] = 0; rp.bm[a]?.close?.(); rp.bm[a] = bm; replayRender(inp); }).catch(() => { rp.loading[a] = 0; });
    }
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
  if (inp.type === 'web') NOVA?.webClose?.(inp._webId);
  if (inp.type === 'delay') inp._dl.frames = [];
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
    else if (inp.type === 'photos') renderPhotos(inp, tNow);
    else if (inp.type === 'web') renderWeb(inp);
    else if (inp.type === 'delay') renderDelay(inp, tNow);
    else if (inp.type === 'draw') renderDraw(inp);
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
      case 'alphafade': // çıkan kaynak saydamlaşırken gelen belirir (saydam/alfa içerikte daha temiz)
        pctx.globalAlpha = 1 - e; pctx.drawImage(bufA, 0, 0); pctx.globalAlpha = e; pctx.drawImage(bufB, 0, 0); break;
      case 'stinger': {
        if (tr.v && tr.v.readyState >= 2 && !tr.manual) { const pv = tr.v.ended ? 1 : tr.v.currentTime * 1000 / tr.dur; if (pv > p - 0.3) p = Math.min(1, pv); }
        pctx.drawImage(p * tr.dur < tr.cutAt ? bufA : bufB, 0, 0);
        if (tr.v) { if (tr.v.readyState >= 2) pctx.drawImage(tr.v, 0, 0, W, H); }
        else Stinger.draw(pctx, W, H, tr.st.style, p, tr.st.color, tr.cutAt / tr.dur);
        break;
      }
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
  delayCapture(t0);
  drawMain(vctx, S.previewId, pvw.width, pvw.height, t0);
  frame++; fpsCount++;
  if (frame % 3 === 0) drawThumbs(t0);
  if (frame % 2 === 0) drawMeters();
  if (frame % 10 === 0) { updateVideoProgress(); checkCountdowns(); }
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
      if (on) { inp.onAirSince = t; if (inp.type === 'title' && inp.title.template === 'sayac') inp._swStart = null; if (inp.type === 'photos') { inp._ph.since = t; inp._ph.prev = null; } }
      if (inp.triggers?.length) fireTriggers(inp, on ? 'onIn' : 'onOut');
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
  if (tr.v) { try { tr.v.pause(); } catch { } }
  $$('#stingers button').forEach(b => b.classList.remove('on'));
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
// ---- Stinger geçişleri (8 yuva)
const stingerVids = [];
function stingerVideo(n) {
  const st = S.settings.stingers[n]; if (!st || st.kind !== 'video' || !(st.path || st.url)) return null;
  const src = st.path ? mediaUrl(st.path) : st.url;
  let v = stingerVids[n];
  if (!v || v._src !== src) { v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true; v.src = src; v._src = src; v.load(); stingerVids[n] = v; }
  return v;
}
function stingerLabel(n) { const st = S.settings.stingers[n]; if (!st) return 'boş'; return st.kind === 'video' ? (st.name || 'Video') : (STINGER_STYLES[st.style]?.name || st.style); }
function stingerTo(n, id) {
  const st = S.settings.stingers[n];
  if (!st) { toast(`Stinger ${n + 1} boş. Sağ tıkla veya Ayarlar > Stinger'dan ayarla.`, true); return; }
  if (S.trans) finishTransition();
  if (id != null) S.previewId = id;
  if (!S.previewId) return;
  let dur = Number(st.dur) || 1000, cutAt = st.cut != null ? Number(st.cut) : dur / 2, v = null;
  if (st.kind === 'video') {
    v = stingerVideo(n);
    if (!v || v.error) { toast(`Stinger ${n + 1} videosu açılamadı.`, true); return; }
    if (v.duration) dur = v.duration * 1000;
    v.currentTime = 0; v.play().catch(() => { });
  }
  cutAt = Math.min(Math.max(0, cutAt), dur);
  S.trans = { from: S.programId, to: S.previewId, type: 'stinger', st, v, dur, cutAt, start: performance.now(), manual: false, p: 0 };
  $('#btn-auto').classList.add('on');
  $(`#stingers button[data-s="${n}"]`)?.classList.add('on');
}
function renderStingerBar() {
  const box = $('#stingers');
  box.innerHTML = S.settings.stingers.map((st, n) => `<button data-s="${n}" class="${st ? '' : 'empty'}" title="Stinger ${n + 1}: ${esc(stingerLabel(n))} (Ctrl+F${n + 1}) • Sağ tık: ayarla">S${n + 1}</button>`).join('');
}
$('#stingers').addEventListener('click', e => { const b = e.target.closest('button'); if (b) stingerTo(+b.dataset.s); });
$('#stingers').addEventListener('contextmenu', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); openSettings('stinger'); } });

// ---- GO düğmesi (vMix 29): her kaynakta ayarlanabilir hızlı eylem
const GO_OPTS = () => [['quick', 'Hızlı geçiş (Geçiş 500 ms)'], ['cut', 'Kes'], ['auto', 'Otomatik (varsayılan geçiş)'],
  ...Object.entries(TR_NAMES).filter(([k]) => k !== 'cut').map(([k, n]) => [k, `${n} geçişi`]),
  ...S.settings.stingers.map((st, n) => [`st${n}`, `Stinger ${n + 1} (${stingerLabel(n)})`])];
function goLabel(inp) { const g = inp.go || 'quick'; return (GO_OPTS().find(([k]) => k === g) || [0, 'Hızlı geçiş'])[1]; }
function goAction(inp) {
  const g = inp.go || 'quick';
  if (g === 'quick') quickTrans(inp.id, 'fade', 500);
  else if (g === 'cut') quickCut(inp.id);
  else if (g === 'auto') quickTrans(inp.id);
  else if (g.startsWith('st')) stingerTo(+g.slice(2), inp.id);
  else quickTrans(inp.id, g);
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
    if (inp.color) el.style.setProperty('--cat', inp.color);
    el.classList.toggle('has-cat', !!inp.color);
    el.innerHTML = `
      <div class="th"><canvas width="256" height="144"></canvas><span class="num">${inp.n}</span><span class="tag">${TYPE_NAMES[inp.type]}</span>
        <button class="cls" data-b="del" title="Kaynağı kapat">✕</button>
        ${isMedia || inp.type === 'photos' ? `<button class="lp ${inp.loop ? 'on' : ''}" data-b="loop" title="Döngü aç/kapa">⟲</button>` : ''}
        ${isMedia ? '<i class="prog"></i>' : ''}</div>
      <div class="nm" title="${esc(inp.name)}">${esc(cardName(inp))}</div>
      <div class="bar">
        ${hasVideo(inp) ? `<button data-b="go" class="go" title="GO: ${esc(goLabel(inp))} (Ayarlar > Genel'den değiştir)">GO</button><button data-b="cut" title="Doğrudan programa kes">KES</button>` : ''}
        ${isMedia ? `<button data-b="play" title="Oynat / Duraklat">⏯</button><button data-b="restart" title="Başa sar">⏮</button>` : ''}
        ${inp.list && inp.list.length > 1 ? `<button data-b="next" title="Listede sonraki">⏭</button>` : ''}
        ${inp.type === 'photos' ? `<button data-b="pprev" title="Önceki fotoğraf">⏮</button><button data-b="pnext" title="Sonraki fotoğraf">⏭</button>` : ''}
        ${inp.type === 'web' ? `<button data-b="wreload" title="Sayfayı yenile">⟳</button>` : ''}
        ${inp.type === 'draw' ? `<button data-b="dboard" title="Çizim tahtası">✎</button><button data-b="dclear" title="Çizimi temizle">🧹</button>` : ''}
        ${inp.triggers?.length ? `<button data-b="trg" class="trg" title="${inp.triggers.length} tetikleyici">⚡</button>` : ''}
        ${titleHasList(inp) ? `<button data-b="tprev" title="Önceki isim / satır">⏮</button><button data-b="tnext" title="Sonraki isim / satır (N)">⏭</button>` : ''}
        ${inp.type === 'replay' ? `<button data-b="mark" title="Son saniyeleri yakala (R)">⏺</button><button data-b="speed" title="Hız">${inp.rp.speed}x</button><button data-b="quad" class="${inp.rp.quad ? 'on' : ''}" title="Quad View: 4 açı birden (Q)">▦</button><button data-b="angle" title="Gösterilen açı (Alt+1…4)">A${inp.rp.angle + 1}</button>` : ''}
        <button data-b="set" title="Ayarlar">⚙</button>
      </div>
      ${hasVideo(inp) ? `<div class="ovs">${[1, 2, 3, 4, 5, 6, 7, 8].map(k => `<button class="ov" data-b="ov${k - 1}" title="Overlay ${k}">${k}</button>`).join('')}</div>` : ''}`;
    box.appendChild(el);
    thumbCtx.set(inp.id, el.querySelector('canvas').getContext('2d'));
    el.querySelector('.th').addEventListener('click', (e) => { if (!e.target.closest('.cls, .lp') && hasVideo(inp)) toPreview(inp.id); });
    el.querySelector('.th').addEventListener('dblclick', () => openInputSettings(inp.id));
    el.addEventListener('click', (e) => {
      if (!e.target.closest('.bar, .ovs, .cls, .lp')) return;
      const b = e.target.closest('button')?.dataset.b; if (!b) return;
      const m = mediaEl(inp);
      if (b === 'cut') quickCut(inp.id);
      else if (b === 'go') goAction(inp);
      else if (b === 'loop') { inp.loop = !inp.loop; const mm = mediaEl(inp); if (mm) mm.loop = inp.loop && (!inp.list || inp.list.length === 1); e.target.classList.toggle('on', inp.loop); toast(`${inp.name}: döngü ${inp.loop ? 'açık' : 'kapalı'}`); }
      else if (b === 'play' && m) m.paused ? m.play().catch(() => { }) : m.pause();
      else if (b === 'restart' && m) { m.currentTime = 0; }
      else if (b === 'next') nextInList(inp, 1, false);
      else if (b === 'pnext') photosNext(inp, 1);
      else if (b === 'wreload') NOVA?.webReload ? NOVA.webReload(inp._webId) : toast('Web kaynağı masaüstü uygulamasında çalışır.', true);
      else if (b === 'dboard') openInputSettings(inp.id, 'cizim');
      else if (b === 'dclear') { inp.draw.strokes.length = 0; toast('Çizim temizlendi.'); }
      else if (b === 'pprev') photosNext(inp, -1);
      else if (b === 'trg') openInputSettings(inp.id, 'trig');
      else if (b === 'tnext') titleNext(inp, 1);
      else if (b === 'tprev') titleNext(inp, -1);
      else if (b === 'mark') replayMark(inp);
      else if (b === 'speed') { const sp = [0.25, 0.5, 0.75, 1]; inp.rp.speed = sp[(sp.indexOf(inp.rp.speed) + 1) % sp.length]; e.target.textContent = inp.rp.speed + 'x'; if (inp.rp.ev) replayRender(inp); }
      else if (b === 'quad') replayToggleQuad(inp);
      else if (b === 'angle') { const n = inp.rp.angles.length; let a = inp.rp.angle; for (let k = 0; k < n; k++) { a = (a + 1) % n; if (inp.rp.angles[a] != null || inp.rp.ev?.clips[a]?.length) break; } replaySetAngle(inp, a); }
      else if (b.startsWith('ov')) toggleOverlay(+b[2], inp.id);
      else if (b === 'set') openInputSettings(inp.id);
      else if (b === 'del') { if (inp.onAir) confirmBox(`"${inp.name}" şu an yayında. Yine de kapatılsın mı?`, () => removeInput(inp.id)); else removeInput(inp.id); }
    });
  }
  applyFilter(); markInputs(); updateMonitorNames();
}
// Kaynak arama + renk kategorisi filtresi
const CAT_COLORS = ['#ff2d4b', '#ff9f43', '#ffd23f', '#19c37d', '#00d4b4', '#4c8dff', '#7b3cff', '#ff5ea8'];
function applyFilter() {
  const q = S.filter.q.trim().toLocaleLowerCase('tr');
  $$('#inputs .inp').forEach(el => {
    const inp = byId(+el.dataset.id); if (!inp) return;
    const okQ = !q || inp.name.toLocaleLowerCase('tr').includes(q) || (TYPE_NAMES[inp.type] || '').toLocaleLowerCase('tr').includes(q) || String(inp.n) === q;
    const okC = !S.filter.cat || inp.color === S.filter.cat;
    el.hidden = !(okQ && okC);
  });
}
function renderCatFilter() {
  const box = $('#cat-filter');
  box.innerHTML = `<button data-c="" class="${S.filter.cat ? '' : 'on'}" title="Tümü">Tümü</button>` + CAT_COLORS.map(c => `<button data-c="${c}" class="sw ${S.filter.cat === c ? 'on' : ''}" style="--c:${c}" title="Bu renkteki kaynaklar"></button>`).join('');
}
$('#cat-filter').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.filter.cat = b.dataset.c || null; renderCatFilter(); applyFilter(); });
$('#inp-search').addEventListener('input', e => { S.filter.q = e.target.value; applyFilter(); });
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
const HEAVY = new Set(['title', 'studio', 'scene', 'photos', 'draw']);
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
function replayGoLive(inp) { // tekrarı giriş geçişiyle yayına al
  if (S.programId !== inp.id) inp.rp.returnTo = S.programId;
  quickTrans(inp.id, inp.rp.inT.type, inp.rp.inT.ms);
}
function replayHotkey() {
  const inp = replayFirst();
  replayMark(inp).then(ok => { if (ok) replayGoLive(inp); });
}
// Olayı video dosyası olarak dışa aktar (WebM, gerçek hızda)
async function replayExport(inp, ev, angle) {
  const clip = ev.clips[angle]; if (!clip?.length) return toast('Bu açıda kayıt yok.', true);
  toast(`${ev.name} dışa aktarılıyor (${(ev.len / 1000).toFixed(1)} sn)…`);
  const bm0 = await createImageBitmap(clip[0].b);
  const cv = document.createElement('canvas'); cv.width = bm0.width; cv.height = bm0.height; const c = cv.getContext('2d'); c.drawImage(bm0, 0, 0); bm0.close();
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8e6 }); const parts = [];
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  const done = new Promise(r => rec.onstop = r); rec.start(250);
  const t0 = clip[0].t, start = performance.now();
  for (let i = 0; i < clip.length; i++) {
    const wait = (clip[i].t - t0) - (performance.now() - start); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const bm = await createImageBitmap(clip[i].b); c.drawImage(bm, 0, 0, cv.width, cv.height); bm.close();
  }
  await new Promise(r => setTimeout(r, 200)); rec.stop(); await done;
  const blob = new Blob(parts, { type: 'video/webm' }), name = `NOVA_Tekrar_${ev.name.replace(/[^\wçğıöşüÇĞİÖŞÜ-]+/g, '_')}_aci${angle + 1}.webm`;
  if (NOVA?.saveBuffer) { const dir = S.settings.folder || (S.settings.folder = await NOVA.defaultFolder()); const f = await NOVA.saveBuffer(dir, name, await blob.arrayBuffer()); toast('Tekrar kaydedildi: ' + f); }
  else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
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
    row.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7].map(k => `<button class="ovl-btn" data-o="${k}" title="Overlay ${k + 1} (F${k + 1})">${k + 1}<small></small></button>`).join('');
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
  box.appendChild(mkStrip('MASTER', master, null, masterAnalyser));
  box.appendChild(mkStrip('BUS A', BUS.A, null, BUS.A.an, 'bus'));
  box.appendChild(mkStrip('BUS B', BUS.B, null, BUS.B.an, 'bus'));
  S.inputs.filter(hasAudio).forEach(inp => box.appendChild(mkStrip(`${inp.n}. ${inp.name}`, inp.audio, inp)));
}
function mkStrip(label, st, inp, an, kind) {
  const el = document.createElement('div');
  el.className = 'strip' + (inp ? '' : ' master') + (kind === 'bus' ? ' bus' : '');
  el.innerHTML = `<div class="lbl" title="${esc(label)}">${esc(label)}</div>
    <div class="fx"><div class="meter"><i></i><b></b></div><input class="fader" type="range" min="0" max="150" value="${Math.round(st.vol * 100)}"><div class="meter"><i></i><b></b></div></div>
    <div class="db">${volDb(st.vol)}</div>
    <div class="btns"><button class="m ${st.muted ? 'on' : ''}" title="Sustur">🔇</button>${inp ? `<button class="a ${st.afv ? 'on' : ''}" title="AFV: ses görüntüyü izlesin (sadece yayındayken duyulur)">AFV</button>` : ''}</div>
    ${inp ? `<div class="btns route">${['M', 'A', 'B'].map(k => `<button data-r="${k}" class="${st.bus?.[k] ? 'on' : ''}" title="${k === 'M' ? 'Master' : 'Bus ' + k}'a gönder">${k}</button>`).join('')}</div>` : ''}`;
  const fader = el.querySelector('.fader'), db = el.querySelector('.db');
  fader.addEventListener('input', () => { st.vol = fader.value / 100; db.textContent = volDb(st.vol); inp ? updateAudioGains(inp) : updateMaster(); });
  fader.addEventListener('dblclick', () => { fader.value = 100; fader.dispatchEvent(new Event('input')); });
  el.querySelector('.m').addEventListener('click', e => { st.muted = !st.muted; e.target.classList.toggle('on', st.muted); inp ? updateAudioGains(inp) : updateMaster(); });
  el.querySelector('.a')?.addEventListener('click', e => { st.afv = !st.afv; e.target.classList.toggle('on', st.afv); updateAudioGains(inp); });
  el.querySelector('.route')?.addEventListener('click', e => { const k = e.target.dataset.r; if (!k) return; st.bus[k] = !st.bus[k]; e.target.classList.toggle('on', st.bus[k]); updateAudioGains(inp); });
  el._meters = $$('.meter', el);
  el._an = inp ? inp.a.analyser : an;
  el._inp = inp; el._pk = { peak: 0, hold: 0 };
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
    const st = el._inp ? el._inp.a : el._pk;
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
function outputStream(kind) {
  const v = prog.captureStream(Number(S.settings.fps) || 30).getVideoTracks();
  const bus = kind === 'record' ? S.settings.recBus : kind === 'stream' ? S.settings.streamBus : 'M';
  return new MediaStream([...v, ...busDest(bus).stream.getAudioTracks()]);
}

async function startOutput(kind) {
  resumeAudio();
  const st = S.settings;
  const mime = pickMime();
  const codec = /h264/.test(mime) ? 'h264' : /vp9/.test(mime) ? 'vp9' : 'vp8';
  const interKbps = kind === 'record' ? Math.max(st.recbitrate, 6000) : Math.max(st.vbitrate * 2, 8000);
  const ms = outputStream(kind);
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
function closeModal() { $('#modal-bg').classList.remove('open'); $('#modal').innerHTML = ''; $('#modal').className = 'modal'; }
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
$('#btn-add').addEventListener('click', () => openInputSelect());

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
    else if (type === 'photos') { const f = await pickFiles('image'); const i = addPhotos(f); openInputSettings(i.id, 'foto'); }
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
  if (inp.type === 'photos') tabs.push(['foto', 'Fotoğraflar']);
  if (inp.type === 'web') tabs.push(['web', 'Web Sayfası']);
  if (inp.type === 'delay') tabs.push(['gecikme', 'Gecikme']);
  if (inp.type === 'draw') tabs.push(['cizim', 'Çizim Tahtası']);
  if (hasVideo(inp)) tabs.push(['konum', 'Konum / Kırp'], ['renk', 'Renk']);
  if (['camera', 'video', 'screen', 'image'].includes(inp.type)) tabs.push(['chroma', 'Yeşil Perde']);
  tabs.push(['trig', `Tetikleyiciler${inp.triggers?.length ? ' (' + inp.triggers.length + ')' : ''}`]);
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
      if (hasVideo(inp)) sel('GO düğmesi', inp, 'go', GO_OPTS(), () => renderInputs());
      if (!inp.go) inp.go = 'quick';
      row('Renk kategorisi', `<div class="swatches"><button class="none ${inp.color ? '' : 'on'}" data-c="">—</button>${CAT_COLORS.map(c => `<button data-c="${c}" class="${inp.color === c ? 'on' : ''}" style="--c:${c}"></button>`).join('')}</div>`);
      g.lastElementChild.querySelector('.swatches').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; inp.color = b.dataset.c || null; renderInputs(); draw(); };
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
    } else if (cur === 'web') {
      const cfg = { ...inp.web };
      buildWebConfig(g, cfg);
      row('', `<button class="primary">Uygula ve yeniden yükle</button><button>Sadece yenile</button>`);
      const [ap, rl] = g.lastElementChild.children;
      ap.onclick = () => { inp.web = cfg; try { inp.name = new URL(cfg.url).hostname.replace(/^www\./, ''); } catch { } webApply(inp); renderInputs(); toast('Web sayfası yeniden açılıyor…'); };
      rl.onclick = () => NOVA?.webReload?.(inp._webId);
    } else if (cur === 'gecikme') {
      buildDelayConfig(g, inp.delay, inp.id, () => { inp._dl.frames = []; inp._dl.shown = -1; const s = byId(inp.delay.src); if (s) { inp.name = `${s.name} (+${(inp.delay.ms / 1000).toFixed(1)} sn)`; renderInputs(); } });
    } else if (cur === 'cizim') {
      buildDrawBoard(g, inp);
    } else if (cur === 'foto') {
      const P = inp.photos;
      rng('Süre (sn)', P, 'interval', 1, 60, 0.5); rng('Geçiş (ms)', P, 'fade', 0, 3000, 50);
      sel('Sığdırma', P, 'fit', [['cover', 'Doldur'], ['contain', 'Sığdır']]);
      chk('Karışık sıra', P, 'shuffle'); chk('Yavaş yakınlaşma (Ken Burns)', P, 'kenburns'); chk('Döngü', inp, 'loop', () => renderInputs());
      row('', `<button class="primary">+ Fotoğraf Ekle</button><input type="search" class="ph-q" placeholder="Dosya adı ara…" style="flex:1" value="${esc(inp._lq || '')}">`);
      const [addB, qB] = g.lastElementChild.children;
      addB.onclick = async () => { const f = await pickFiles('image'); f.forEach(x => P.list.push({ path: x.path || null, url: x.url || null, name: x.name })); renderInputs(); draw(); };
      const ul = document.createElement('div'); ul.className = 'ph-list'; g.append(document.createElement('span'), ul);
      const drawL = () => {
        const q = (inp._lq || '').toLocaleLowerCase('tr');
        ul.innerHTML = P.list.map((it, k) => ({ it, k })).filter(({ it }) => !q || it.name.toLocaleLowerCase('tr').includes(q)).map(({ it, k }) => `<div class="row" data-k="${k}">
          <span style="flex:1;${k === P.idx ? 'color:#19c37d;font-weight:700' : ''}">${k + 1}. ${esc(it.name)}</span><button data-l="show">Göster</button><button data-l="up">▲</button><button data-l="down">▼</button><button data-l="del">✕</button></div>`).join('') || '<p class="note">Fotoğraf yok.</p>';
      };
      qB.oninput = () => { inp._lq = qB.value; drawL(); };
      ul.onclick = (e) => { const r = e.target.closest('[data-k]'), a = e.target.dataset.l; if (!r || !a) return; const k = +r.dataset.k, L = P.list;
        if (a === 'show') { inp._ph.prev = P.idx; P.idx = k; inp._ph.since = performance.now(); }
        if (a === 'up' && k > 0) [L[k - 1], L[k]] = [L[k], L[k - 1]];
        if (a === 'down' && k < L.length - 1) [L[k + 1], L[k]] = [L[k], L[k + 1]];
        if (a === 'del') { L.splice(k, 1); if (P.idx >= L.length) P.idx = 0; inp._ph.prev = null; }
        renderInputs(); drawL(); };
      drawL();
    } else if (cur === 'trig') {
      g.style.gridTemplateColumns = '1fr';
      inp.triggers = inp.triggers || [];
      const evs = trigEventsFor(inp);
      const tgtOpts = [['', 'Bu kaynak'], ...S.inputs.filter(i => i.id !== inp.id).map(i => [String(i.id), `${i.n}. ${i.name}`])];
      const needsTgt = (a) => !['recStart', 'recStop', 'streamStart', 'streamStop', 'ftbOn', 'ftbOff', 'replay'].includes(a);
      const wrap = document.createElement('div'); wrap.className = 'trg-list'; g.appendChild(wrap);
      inp.triggers.forEach((tr, k) => {
        const r = document.createElement('div'); r.className = 'trg-row';
        r.innerHTML = `<select class="ev">${evs.map(e => `<option value="${e}" ${tr.ev === e ? 'selected' : ''}>${TRIG_EVENTS[e]}</option>`).join('')}</select>
          ${tr.ev === 'cdLeft' ? `<input class="secs" type="number" min="0" step="1" value="${tr.secs ?? 10}" style="width:64px" title="Kalan saniye">` : ''}
          <span>→</span>
          <select class="act">${Object.entries(TRIG_ACTIONS).map(([a, nm]) => `<option value="${a}" ${tr.act === a ? 'selected' : ''}>${nm}</option>`).join('')}</select>
          ${needsTgt(tr.act) ? `<select class="tgt">${tgtOpts.map(([v, nm]) => `<option value="${v}" ${String(tr.target ?? '') === v ? 'selected' : ''}>${esc(nm)}</option>`).join('')}</select>` : ''}
          ${/^ov/.test(tr.act) || tr.act === 'stinger' ? `<select class="n">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<option value="${i}" ${(+tr.n || 0) === i ? 'selected' : ''}>${tr.act === 'stinger' ? 'Stinger' : 'Overlay'} ${i + 1}</option>`).join('')}</select>` : ''}
          <button class="del" title="Sil">✕</button>`;
        r.onchange = (e) => {
          const c = e.target.classList;
          if (c.contains('ev')) tr.ev = e.target.value; if (c.contains('secs')) tr.secs = +e.target.value;
          if (c.contains('act')) tr.act = e.target.value; if (c.contains('tgt')) tr.target = e.target.value ? +e.target.value : null;
          if (c.contains('n')) tr.n = +e.target.value;
          if (c.contains('ev') || c.contains('act')) draw();
        };
        r.querySelector('.del').onclick = () => { inp.triggers.splice(k, 1); renderInputs(); draw(); };
        wrap.appendChild(r);
      });
      g.insertAdjacentHTML('beforeend', `<div class="row"><button class="primary">+ Tetikleyici ekle</button></div>
        <p class="note">Örnekler: geri sayım bitince yayını başlat ve kameraya stinger ile geç • video bitince stüdyoya geçiş yap • kamera yayına girince alt bandı (Overlay 1) aç, çıkınca kapat.${evs.includes('cdEnd') ? '' : ' Geri sayım olayları "Geri Sayım" ve "Birazdan Başlıyoruz" grafiklerinde görünür.'}</p>`);
      $('button.primary', g).onclick = () => { inp.triggers.push({ ev: evs[0], act: 'ovOn', target: null, n: 0, secs: 10 }); renderInputs(); draw(); };
    } else if (cur === 'liste') {
      g.style.gridTemplateColumns = '1fr';
      g.insertAdjacentHTML('beforeend', `<div class="row"><input type="search" class="ls-q" placeholder="Listede ara…" style="flex:1" value="${esc(inp._lq || '')}"></div>`);
      g.lastElementChild.querySelector('input').oninput = (e) => { inp._lq = e.target.value; draw(); setTimeout(() => { const i = $('.ls-q', body); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); };
      const ul = document.createElement('div'); ul.style.cssText = 'display:flex;flex-direction:column;gap:6px';
      const lq = (inp._lq || '').toLocaleLowerCase('tr');
      inp.list.forEach((it, k) => {
        if (lq && !it.name.toLocaleLowerCase('tr').includes(lq)) return;
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
      const rp = inp.rp;
      const isFirst = S.inputs.find(i => i.type === 'replay') === inp;
      buildReplayConfig(g, rp, { isFirst, onChange: () => renderInputs() });
      row('Görünüm', `<button class="${rp.quad ? '' : 'primary'}">Tek açı</button><select>${rp.angles.map((_, a) => `<option value="${a}" ${rp.angle === a ? 'selected' : ''}>Açı ${a + 1}</option>`).join('')}</select><button class="${rp.quad && !rp.group ? 'primary' : ''}">▦ Quad 1–4</button><button class="${rp.quad && rp.group ? 'primary' : ''}">▦ Quad 5–8</button>`);
      const [b1, asel, b2, b3] = g.lastElementChild.children;
      b1.onclick = () => { rp.quad = false; rp.last = Array(RP_N).fill(-1); renderInputs(); draw(); }; asel.onchange = () => { replaySetAngle(inp, +asel.value); draw(); };
      b2.onclick = () => { replayToggleQuad(inp, 0); draw(); }; b3.onclick = () => { replayToggleQuad(inp, 1); draw(); };
      row('', '<button class="primary">⏺ Şimdi yakala (R)</button>'); g.lastElementChild.querySelector('button').onclick = () => replayMark(inp).then(() => draw());
      // Olay listesi + arama + çoklu etiket
      g.insertAdjacentHTML('beforeend', `<label>Olaylar (${rp.events.length})</label><div class="row"><input type="search" class="ev-q" placeholder="Olay / etiket ara…" style="flex:1" value="${esc(inp._evq || '')}"></div>`);
      const qi = g.lastElementChild.querySelector('.ev-q');
      const list = document.createElement('div'); list.className = 'ev-list'; g.append(document.createElement('span'), list);
      const drawList = () => {
        const q = (inp._evq || '').toLocaleLowerCase('tr');
        const evs = rp.events.filter(ev => !q || ev.name.toLocaleLowerCase('tr').includes(q) || ev.tags.some(t => t.toLocaleLowerCase('tr').includes(q)));
        list.innerHTML = evs.length ? evs.map(ev => `<div class="ev ${rp.ev === ev ? 'on' : ''}" data-e="${ev.id}">
            <button data-a="play" title="Oynat">▶</button>
            <input class="nm2" value="${esc(ev.name)}" title="Olay adı">
            <span class="note" style="margin:0">${ev.clock} • ${(ev.len / 1000).toFixed(1)} sn • ${ev.clips.filter(c => c.length).length} açı</span>
            <input class="tg" value="${esc(ev.tags.join(', '))}" placeholder="etiketler: gol, ofsayt…" title="Birden fazla etiket: virgülle ayır">
            <button data-a="exp" title="Gösterilen açıyı video olarak dışa aktar">⤓</button><button data-a="del" title="Sil">✕</button></div>`).join('') : `<p class="note">${rp.events.length ? 'Aramayla eşleşen olay yok.' : 'Henüz olay yok. R tuşu ya da ⏺ ile yakala.'}</p>`;
      };
      qi.oninput = () => { inp._evq = qi.value; drawList(); };
      list.onclick = (e) => { const r = e.target.closest('[data-e]'); if (!r) return; const ev = rp.events.find(x => x.id === +r.dataset.e); const a = e.target.dataset.a;
        if (a === 'play') { replayPlay(inp, ev); replayGoLive(inp); drawList(); }
        if (a === 'exp') replayExport(inp, ev, rp.angle);
        if (a === 'del') { rp.events = rp.events.filter(x => x !== ev); if (rp.ev === ev) { rp.ev = null; drawReplayIdle(inp); } drawList(); } };
      list.oninput = (e) => { const r = e.target.closest('[data-e]'); if (!r) return; const ev = rp.events.find(x => x.id === +r.dataset.e);
        if (e.target.classList.contains('nm2')) ev.name = e.target.value;
        if (e.target.classList.contains('tg')) { ev.tags = e.target.value.split(',').map(x => x.trim()).filter(Boolean); if (rp.ev === ev) replayRender(inp); } };
      drawList();
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
    body.innerHTML = `<div class="tabs">${[['stream', 'Yayın'], ['enc', 'Kodlama'], ['rec', 'Kayıt'], ['stinger', 'Stinger'], ['ses', 'Ses / Bus'], ['gen', 'Genel']].map(([k, n]) => `<button data-t="${k}" class="${k === cur ? 'on' : ''}">${n}</button>`).join('')}</div><div id="sp"></div>`;
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
    } else if (cur === 'stinger') {
      sp.innerHTML = `<div class="grid2" id="stg"></div><p class="note">Stinger: kesme noktasında ekranı kapatan animasyonlu geçiş. Hazır animasyonlardan birini seç ya da kendi videonu yükle (saydam arka plan için WebM/VP9 alfa önerilir). Kısayol: Ctrl+F1…F8, panelde S1–S8.</p>`;
      const g = $('#stg', sp);
      st.stingers.forEach((x, n) => {
        const kind = x ? x.kind : 'none';
        g.insertAdjacentHTML('beforeend', `<label>Stinger ${n + 1}</label><div class="row" data-n="${n}">
          <select class="k"><option value="none" ${kind === 'none' ? 'selected' : ''}>Boş</option><option value="builtin" ${kind === 'builtin' ? 'selected' : ''}>Hazır animasyon</option><option value="video" ${kind === 'video' ? 'selected' : ''}>Video dosyası</option></select>
          ${kind === 'builtin' ? `<select class="sty">${Object.entries(STINGER_STYLES).map(([k, v]) => `<option value="${k}" ${x.style === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select><input class="col" type="color" value="${x.color || '#ff2d4b'}">
            <input class="dur" type="number" min="200" max="5000" step="50" value="${x.dur}" title="Süre (ms)" style="width:80px"><span class="note" style="margin:0">ms</span>` : ''}
          ${kind === 'video' ? `<button class="pick">Video seç</button><span class="note" style="margin:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name || 'seçilmedi')}</span>` : ''}
          ${kind !== 'none' ? `<span class="note" style="margin:0">Kesme</span><input class="cut" type="number" min="0" max="5000" step="50" value="${x.cut ?? 500}" title="Kesme noktası (ms)" style="width:80px"><button class="try" title="Şimdi önizlemeye geç">▶</button>` : ''}
        </div>`);
      });
      g.onchange = g.oninput = (e) => {
        const r = e.target.closest('[data-n]'); if (!r) return; const n = +r.dataset.n; let x = st.stingers[n];
        if (e.target.classList.contains('k') && e.type === 'change') {
          const k = e.target.value;
          st.stingers[n] = k === 'none' ? null : k === 'builtin' ? { kind: 'builtin', style: 'serit', color: CAT_COLORS[n % 8], dur: 1000, cut: 500 } : { kind: 'video', path: null, name: '', cut: 500 };
          renderStingerBar(); draw(); return;
        }
        if (!x) return;
        if (e.target.classList.contains('sty')) x.style = e.target.value;
        if (e.target.classList.contains('col')) x.color = e.target.value;
        if (e.target.classList.contains('dur')) { x.dur = +e.target.value; }
        if (e.target.classList.contains('cut')) x.cut = +e.target.value;
        renderStingerBar();
      };
      g.onclick = async (e) => {
        const r = e.target.closest('[data-n]'); if (!r) return; const n = +r.dataset.n, x = st.stingers[n];
        if (e.target.classList.contains('try')) { closeModal(); stingerTo(n); }
        if (e.target.classList.contains('pick')) {
          const f = (await pickFiles('video'))[0]; if (!f) return;
          Object.assign(x, { path: f.path || null, url: f.url || null, name: f.name });
          const v = stingerVideo(n); v.onloadedmetadata = () => { if (x.cut == null || x.cut === 500) x.cut = Math.round(v.duration * 500); draw(); };
          renderStingerBar(); draw();
        }
      };
    } else if (cur === 'ses') {
      sp.innerHTML = `<div class="grid2">
        <label>Yayın sesi</label><select id="a-str"><option value="M">Master</option><option value="A">Bus A</option><option value="B">Bus B</option></select>
        <label>Kayıt sesi</label><select id="a-rec"><option value="M">Master</option><option value="A">Bus A</option><option value="B">Bus B</option></select>
        <label>Kulaklık (izleme)</label><select id="a-mon"><option value="M">Master</option><option value="A">Bus A</option><option value="B">Bus B</option></select>
      </div><p class="note">Her ses kanalını mikserdeki <b>M / A / B</b> düğmeleriyle Master'a, Bus A'ya veya Bus B'ye yönlendirebilirsin. Örnek: kaydı yorum sesi olmadan almak için mikrofonu sadece Master'a, oyun sesini hem Master hem Bus A'ya ver ve Kayıt sesini Bus A seç. Değişiklik bir sonraki yayın/kayıt başlangıcında geçerli olur.</p>`;
      bind('#a-str', 'streamBus'); bind('#a-rec', 'recBus'); bind('#a-mon', 'monBus', false, updateMaster);
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
      const rp = $('#g-rp', sp); rp.checked = st.replayOn; rp.onchange = () => { st.replayOn = rp.checked; if (!rp.checked) replayClear(); };
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
      audio: { vol: i.audio.vol, muted: i.audio.muted, afv: i.audio.afv, comp: i.audio.comp, bus: i.audio.bus }, loop: i.loop, autoPlay: i.autoPlay, title: i.title,
      list: i.list?.filter(x => x.path || isNet(x.url)).map(x => ({ path: x.path, url: x.path ? undefined : x.url, name: x.name })), rp: i.rp ? { speed: i.rp.speed, secs: i.rp.secs, quad: i.rp.quad, group: i.rp.group, angle: i.rp.angle, inT: i.rp.inT, outT: i.rp.outT, autoReturn: i.rp.autoReturn, angles: i.rp.angles.map(a => a === 'pgm' || a == null ? a : S.inputs.findIndex(x => x.id === a)) } : undefined,
      studio: i.studio, go: i.go, color: i.color, web: i.web, draw: i.draw,
      delay: i.delay ? { ms: i.delay.ms, src: S.inputs.findIndex(x => x.id === i.delay.src) } : undefined,
      photos: i.photos ? { ...i.photos, list: i.photos.list.filter(x => x.path) } : undefined,
      triggers: i.triggers?.map(t => ({ ...t, target: t.target == null ? null : S.inputs.findIndex(x => x.id === t.target) })),
      scene: i.scene ? { ...i.scene, bg: S.inputs.findIndex(x => x.id === i.scene.bg), layers: i.scene.layers.map(l => ({ ...l, id: S.inputs.findIndex(x => x.id === l.id) })) } : undefined
    })),
    previewIndex: S.inputs.findIndex(i => i.id === S.previewId),
    programIndex: S.inputs.findIndex(i => i.id === S.programId),
    overlays: S.overlays.map(o => S.inputs.findIndex(i => i.id === o.inputId)),
    master: { vol: master.vol, muted: master.muted },
    buses: { A: { vol: BUS.A.vol, muted: BUS.A.muted }, B: { vol: BUS.B.vol, muted: BUS.B.muted } }
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
      if (d.type === 'camera') inp = await addCamera(d.src.deviceId, d.src.label, d.src.opts);
      else if (d.type === 'mic') inp = await addMic(d.src.deviceId, d.src.label, d.src.opts);
      else if (d.type === 'screen') inp = await addScreen(d.src.sourceId, d.src.name, d.src.withAudio);
      else if (d.type === 'video' && d.list?.length) inp = addVideo(d.list[0], d.list.slice(1));
      else if (d.type === 'video' && d.src.path) inp = addVideo({ path: d.src.path });
      else if (d.type === 'web') inp = addWeb(d.web);
      else if (d.type === 'delay') { inp = addDelay(null, d.delay?.ms); inp._delaySrc = d.delay?.src; }
      else if (d.type === 'draw') inp = addDraw(d.draw);
      else if (d.type === 'replay') { inp = addReplay(); const { angles, ...rest } = d.rp || {}; Object.assign(inp.rp, rest); inp._rpAngles = angles; }
      else if (d.type === 'image' && d.src.path) inp = addImage({ path: d.src.path });
      else if (d.type === 'audio' && d.src.path) inp = addAudioFile({ path: d.src.path });
      else if (d.type === 'color') inp = addColor(d.src.color, d.src.color2);
      else if (d.type === 'title') inp = addTitle(d.title.template, d.title);
      else if (d.type === 'studio') inp = addStudio(d.studio?.style, d.studio);
      else if (d.type === 'photos') { const { list, ...o } = d.photos || {}; inp = addPhotos(list || [], o); }
      else if (d.type === 'scene') { inp = addScene(d.scene?.preset); inp._sceneData = d.scene; }
    } catch (e) { toast(`"${d.name}" yüklenemedi: ${e.message || e.name}`, true); }
    if (inp) {
      Object.assign(inp, { name: d.name, fit: d.fit, layout: d.layout, crop: d.crop, fx: d.fx, chroma: d.chroma, loop: d.loop, autoPlay: d.autoPlay, go: d.go || 'quick', color: d.color || null });
      if (d.triggers) inp._trg = d.triggers;
      Object.assign(inp.audio, d.audio); if (inp.a) applyComp(inp); updateAudioGains(inp, true);
      const m = mediaEl(inp); if (m) m.loop = inp.loop && (!inp.list || inp.list.length === 1);
    }
    made.push(inp);
  }
  made.forEach(inp => { if (inp && inp._delaySrc != null) { inp.delay.src = made[inp._delaySrc]?.id ?? null; delete inp._delaySrc; } });
  made.forEach(inp => { if (inp?._trg) { inp.triggers = inp._trg.map(t => ({ ...t, target: t.target == null || t.target < 0 ? null : made[t.target]?.id ?? null })); delete inp._trg; } });
  made.forEach(inp => { if (inp?._rpAngles) { while (inp._rpAngles.length < RP_N) inp._rpAngles.push(null); inp.rp.angles = inp._rpAngles.map(a => a === 'pgm' || a == null ? a ?? null : made[a]?.id ?? null); delete inp._rpAngles; } });
  made.forEach(inp => { // sahne referanslarını yeni kimliklere çevir
    if (!inp?._sceneData) return; const d = inp._sceneData; delete inp._sceneData;
    Object.assign(inp.scene, d, { bg: made[d.bg]?.id ?? null, layers: d.layers.map(l => ({ ...l, id: made[l.id]?.id ?? null })) });
  });
  S.previewId = made[p.previewIndex]?.id ?? S.previewId;
  S.programId = made[p.programIndex]?.id ?? null;
  (p.overlays || []).forEach((k, n) => { S.overlays[n].inputId = made[k]?.id ?? null; S.overlays[n].on = false; });
  if (p.master) Object.assign(master, p.master);
  if (p.buses) for (const k of ['A', 'B']) if (p.buses[k]) Object.assign(BUS[k], p.buses[k]);
  updateMaster();
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
    <tr><td><kbd>F1</kbd> … <kbd>F8</kbd></td><td>Overlay 1–8 aç/kapa</td></tr>
    <tr><td><kbd>Ctrl</kbd> + <kbd>F1</kbd> … <kbd>F8</kbd></td><td>Stinger 1–8 ile önizlemeye geç</td></tr>
    <tr><td><kbd>B</kbd></td><td>Siyaha karart (FTB)</td></tr>
    <tr><td><kbd>R</kbd></td><td>Anlık tekrar: son anları yakala (yeni olay) ve yayına al</td></tr>
    <tr><td><kbd>Q</kbd> / <kbd>Shift</kbd>+<kbd>Q</kbd></td><td>Tekrarda Quad View aç/kapa / açı grubu 1–4 ↔ 5–8</td></tr>
    <tr><td><kbd>Alt</kbd>+<kbd>1</kbd>…<kbd>8</kbd></td><td>Tekrarda gösterilen açı</td></tr>
    <tr><td><kbd>N</kbd> / <kbd>Shift</kbd>+<kbd>N</kbd></td><td>Yayındaki alt bantta sonraki / önceki isim, altyazıda sonraki satır</td></tr>
    <tr><td><kbd>Ctrl</kbd> + <kbd>R</kbd></td><td>Kayıt başlat/durdur</td></tr>
    <tr><td><kbd>Ctrl</kbd> + <kbd>I</kbd></td><td>Kaynak ekle (Kaynak Seç penceresi)</td></tr>
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
  else if (/^F[1-8]$/.test(k)) { e.preventDefault(); if (e.ctrlKey) stingerTo(+k[1] - 1); else toggleOverlay(+k[1] - 1); }
  else if (k === 'F12') { e.preventDefault(); snapshot(); }
  else if (k.toLowerCase() === 'b' && !e.ctrlKey) ACTIONS.ftb();
  else if (k.toLowerCase() === 'r' && !e.ctrlKey) replayHotkey();
  else if (k.toLowerCase() === 'q' && !e.ctrlKey) { const r = S.inputs.find(i => i.type === 'replay'); if (r) e.shiftKey ? replayToggleQuad(r, r.rp.group ? 0 : 1) : replayToggleQuad(r); }
  else if (e.altKey && /^Digit[1-8]$/.test(e.code)) { e.preventDefault(); const r = S.inputs.find(i => i.type === 'replay'); if (r) replaySetAngle(r, +e.code.slice(-1) - 1); }
  else if (k.toLowerCase() === 'n' && !e.ctrlKey) { const on = S.inputs.filter(i => i.onAir && titleHasList(i) && titleItemCount(i.title)); on.forEach(i => titleNext(i, e.shiftKey ? -1 : 1)); if (!on.length) toast('Yayında isim listeli grafik yok.', true); }
  else if (e.ctrlKey && k.toLowerCase() === 's') { e.preventDefault(); saveProject(e.shiftKey); }
  else if (e.ctrlKey && k.toLowerCase() === 'o') { e.preventDefault(); openProject(); }
  else if (e.ctrlKey && k.toLowerCase() === 'i') { e.preventDefault(); openInputSelect(); }
  else if (e.ctrlKey && k.toLowerCase() === 'r') { e.preventDefault(); toggleRecord(); }
  else {
    const m = /^(Digit|Numpad)([1-9])$/.exec(e.code);
    if (m && !e.altKey) {
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
  applyResolution(); updateMaster(); renderQuick(); renderOverlays(); renderStingerBar(); renderCatFilter(); renderMixer(); renderInputs();
  // Başlangıç sahnesi: arka plan + logo yazısı
  const bg = addColor('#0b1230', '#3a0d2e'); bg.name = 'Arka Plan';
  const t = addTitle('baslik', { line1: 'NOVA CANLI', line2: 'Yayına hazır' });
  S.programId = bg.id; S.previewId = t.id;
  renderInputs();
  $('.credit').textContent = `NOVA Canlı v${APP_VERSION} • Samet Şahin (@xsametsahinx)`;
  if (S.settings.autoUpdate !== false) { setTimeout(() => checkUpdates(false), 6000); setInterval(() => { if (S.settings.autoUpdate !== false && UPD.st !== 'ready') checkUpdates(false); }, 3 * 3600 * 1000); }
  toast('NOVA Canlı hazır. "+ Kaynak Ekle" ile başla.');
  window.__nova = { addWeb, addDelay, addDraw, replayExport, replayGoLive, openInputSelect: (...a) => openInputSelect(...a), addPhotos, stingerTo, runTrigger, fireTriggers, replayToggleQuad, replaySetAngle, replayPlay, goAction, BUS, addStudio, addScene, applyScenePreset, titleNext, pickTitle, pickStudio, pickScene, openInputSettings, addReplay, replayMark, replayHotkey, RP, S, cut, transition, toggleOverlay, startOutput, stopOutput, addTitle, addColor, addVideo, addImage, outState, prog }; // test erişimi
})();
