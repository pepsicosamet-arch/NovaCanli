// NOVA Canlı — Kaynak Seç penceresi (vMix "Input Select" tarzı)
// Solda kaynak türleri, sağda seçilen türün ayarları, altta sıra numarası ve Tamam / İptal.
'use strict';

// ---- Basit çizgi simgeler (24x24, currentColor)
const IS_ICONS = {
  video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
  list: '<path d="M4 6h11M4 12h11M4 18h7"/><path d="M17 15l4 2.5-4 2.5z" fill="currentColor"/>',
  camera: '<rect x="3" y="7" width="13" height="11" rx="2"/><path d="M16 11l5-3v9l-5-3"/>',
  screen: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  url: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  replay: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
  stinger: '<path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="currentColor"/>',
  delay: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  photos: '<rect x="6" y="3" width="15" height="13" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2h12"/><path d="M21 13l-4-4-7 7"/>',
  color: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="7.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor"/><path d="M12 21a3 3 0 0 1 0-6h3"/>',
  audio: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  title: '<path d="M5 5h14M12 5v14M8 19h8"/>',
  studio: '<path d="M3 20h18M5 20l2-7h10l2 7M9 13V8h6v5"/><path d="M4 4l4 3M20 4l-4 3"/>',
  scene: '<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>',
  web: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="6" cy="6.5" r=".6" fill="currentColor"/><circle cx="8.5" cy="6.5" r=".6" fill="currentColor"/>',
  draw: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  vset: '<path d="M12 3l9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>'
};
const isIcon = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IS_ICONS[k] || ''}</svg>`;

const INPUT_TYPES = [
  { k: 'vset', name: '3D Haber Stüdyosu', desc: 'Gerçek zamanlı 3D sanal haber stüdyosu: ışıklı masa, LED video duvarı, yansımalı zemin, 7 kamera açısı ve yumuşak kamera hareketleri. Sunucuyu yeşil perdeyle masanın arkasına yerleştir.' },
  { k: 'video', name: 'Video', desc: 'Video dosyası: MP4, MOV, MKV, WebM, M4V. Birden fazla dosya ayrı kaynak olarak eklenir.' },
  { k: 'list', name: 'Liste', desc: 'Birden fazla video tek kaynakta art arda oynar (oynatma listesi).' },
  { k: 'camera', name: 'Kamera', desc: 'Web kamerası, yakalama kartı (HDMI/SDI), sanal kamera. Çözünürlük, kare hızı ve ses aygıtı seçilebilir.' },
  { k: 'screen', name: 'Ekran / Oyun Yakalama', desc: 'Bir ekranı, pencereyi ya da oyunu sistem sesiyle birlikte yakala.' },
  { k: 'url', name: 'Ağ Videosu (URL)', desc: 'İnternetteki bir MP4/WebM video adresini kaynak olarak oynat.' },
  { k: 'replay', name: 'Anlık Tekrar', desc: '8 kameraya kadar sürekli kayıt; önemli anı yakala, yavaş çekim ve Quad View ile tekrar göster.' },
  { k: 'stinger', name: 'Stinger', desc: 'Kesme noktasında ekranı kapatan animasyonlu geçiş. 8 yuvadan birine kaydedilir.' },
  { k: 'delay', name: 'Video Gecikmesi', desc: 'Bir kaynağı belirli süre geriden gösterir (ses/görüntü senkronu, yayın gecikmesi).' },
  { k: 'image', name: 'Resim', desc: 'PNG, JPG, GIF, WebP, SVG. Saydam PNG logolar için idealdir.' },
  { k: 'photos', name: 'Fotoğraflar', desc: 'Fotoğraf slayt gösterisi: süre, yumuşak geçiş, Ken Burns yakınlaşması.' },
  { k: 'color', name: 'Renk', desc: 'Düz renk ya da degrade arka plan.' },
  { k: 'audio', name: 'Ses Dosyası', desc: 'Müzik ya da efekt: MP3, WAV, OGG, M4A, FLAC.' },
  { k: 'mic', name: 'Ses Girişi', desc: 'Mikrofon, ses kartı girişi ya da mikser.' },
  { k: 'title', name: 'Grafik / Başlık', desc: '33 hazır animasyonlu grafik: alt bant, haber, spor, yayın ekranları, sosyal medya, altyazı.' },
  { k: 'studio', name: 'Sanal Stüdyo', desc: '11 hareketli stüdyo arka planı (haber, talk show, oyun, podcast…).' },
  { k: 'scene', name: 'Sahne / Çoklu Görüntü', desc: 'PIP, yan yana, 2x2, röportaj gibi hazır düzenlerle birden fazla kaynağı birleştir.' },
  { k: 'web', name: 'Web Tarayıcı', desc: 'Bir web sayfasını kaynak olarak göster: sohbet, bağış uyarıları (Streamlabs/StreamElements), skor sayfaları.' },
  { k: 'draw', name: 'Telestratör', desc: 'Canlı görüntünün üstüne kalem, ok ve daire ile çiz (maç analizi, eğitim).' }
];

// ---- Küçük form yardımcıları (grid2 içine satır ekler)
function formHelpers(g) {
  const row = (label, html) => { g.insertAdjacentHTML('beforeend', `<label>${label}</label><div class="row">${html}</div>`); return g.lastElementChild; };
  return {
    row,
    note: (html) => g.insertAdjacentHTML('beforeend', `<span></span><p class="note" style="margin:0">${html}</p>`),
    sel: (label, obj, key, opts, after) => {
      const r = row(label, `<select style="flex:1">${opts.map(([v, n]) => `<option value="${v}" ${String(obj[key]) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`);
      const s = r.querySelector('select'); s.onchange = () => { obj[key] = isNaN(+s.value) || s.value === '' ? s.value : +s.value; after?.(s.value); }; return s;
    },
    txt: (label, obj, key, type = 'text', after, ph = '') => {
      const r = row(label, `<input type="${type}" value="${esc(obj[key] ?? '')}" placeholder="${esc(ph)}" style="flex:1">`);
      const i = r.querySelector('input'); i.oninput = () => { obj[key] = type === 'number' ? +i.value : i.value; after?.(); }; return i;
    },
    chk: (label, obj, key, after) => {
      const r = row(label, `<input type="checkbox" ${obj[key] ? 'checked' : ''}>`);
      const c = r.querySelector('input'); c.onchange = () => { obj[key] = c.checked; after?.(); }; return c;
    },
    rng: (label, obj, key, min, max, step = 1, fmt = (v) => v) => {
      const r = row(label, `<input type="range" min="${min}" max="${max}" step="${step}" value="${obj[key]}"><output>${fmt(obj[key])}</output>`);
      const i = r.querySelector('input'), o = r.querySelector('output'); i.oninput = () => { obj[key] = +i.value; o.textContent = fmt(+i.value); }; return i;
    }
  };
}
const trOpts = () => Object.entries(TR_NAMES).map(([k, n]) => [k, n]);

// ---- Anlık tekrar ayarları (hem Kaynak Seç'te hem kaynak ayarlarında kullanılır)
function buildReplayConfig(g, rp, opts = {}) {
  const F = formHelpers(g);
  F.sel('Kayıt arabelleği', S.settings, 'replaySecs', [[15, '15 saniye'], [30, '30 saniye'], [60, '60 saniye'], [120, '120 saniye']]);
  F.sel('Kayıt kalitesi', S.settings, 'replayQuality', [['low', 'Düşük (640 / 480 px) — en az bellek'], ['med', 'Orta (960 / 640 px)'], ['high', 'Yüksek (1280 / 960 px)']], () => { replaySize(); toast('Tekrar kalitesi değişti, tampon sıfırlandı.'); });
  const mem = F.row('Bellek', `<div class="rp-mem"><b></b><span></span></div><button title="Tüm tekrar kayıtlarını ve olayları sil">Tümünü sil</button>`);
  let seen = false;
  const upd = () => {
    if (!mem.isConnected) { if (seen) clearInterval(tm); return; }
    seen = true;
    const mb = replayMemMB(), n = replayAngles().filter(a => a != null).length;
    const cap = Number(S.settings.replaySecs) || 30, est = cap * 30 * n * ({ low: 0.025, med: 0.045, high: 0.08 }[S.settings.replayQuality] || 0.045);
    const b = mem.querySelector('b'); b.textContent = `${mb.toFixed(0)} MB bellek kullanılıyor • ${n} açı kaydediliyor`;
    b.className = mb > 1500 ? 'bad' : 'ok';
    mem.querySelector('span').textContent = `Tahmini en çok: ≈ ${est.toFixed(0)} MB (${cap} sn × ${n} açı)`;
  };
  const tm = setInterval(upd, 1000); upd();
  mem.querySelector('button').onclick = () => { replayClear(); S.inputs.forEach(i => { if (i.rp) { i.rp.events = []; i.rp.ev = null; drawReplayIdle(i); } }); RP.evId = 0; upd(); toast('Tekrar kayıtları silindi.'); opts.onChange?.(); };
  // Kameralar 1–8 (iki sütun, görseldeki gibi)
  const srcOpts = [['', 'Yok'], ['pgm', 'Program çıkışı'], ...S.inputs.filter(i => hasVideo(i) && i.type !== 'replay').map(i => [String(i.id), `${i.n}. ${i.name}`])];
  const cams = F.row('Kameralar', `<div class="rp-cams">${rp.angles.map((a, k) => `<span class="rp-n">${k + 1}</span><select data-a="${k}" ${opts.isFirst === false ? 'disabled' : ''}>${srcOpts.map(([v, n]) => `<option value="${v}" ${String(a ?? '') === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`).join('')}</div>`);
  cams.onchange = (e) => { const a = +e.target.dataset.a, v = e.target.value; rp.angles[a] = v === '' ? null : v === 'pgm' ? 'pgm' : +v; upd(); };
  if (opts.isFirst === false) F.note('Kamera kaynakları ilk Anlık Tekrar kaynağından ayarlanır; bu kaynak aynı kayıtları kullanır.');
  F.chk('Ek kameraları 15 fps kaydet', S.settings, 'replayExtraHalf');
  F.sel('Olay uzunluğu', rp, 'secs', [5, 8, 10, 15, 20, 30].map(v => [v, `Son ${v} saniye`]));
  F.sel('Oynatma hızı', rp, 'speed', [0.25, 0.5, 0.75, 1].map(v => [v, `${v}x${v < 1 ? ' (yavaş çekim)' : ''}`]), () => opts.onChange?.());
  const tRow = (label, o) => { const r = F.row(label, `<select style="flex:1">${trOpts().map(([k, n]) => `<option value="${k}" ${o.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select><input type="number" min="0" max="5000" step="50" value="${o.ms}" style="width:90px"><span class="note" style="margin:0">ms</span>`);
    r.querySelector('select').onchange = e => o.type = e.target.value; r.querySelector('input').oninput = e => o.ms = +e.target.value; };
  tRow('Giriş geçişi', rp.inT); tRow('Çıkış geçişi', rp.outT);
  F.chk('Olay bitince canlıya dön (çıkış geçişiyle)', rp, 'autoReturn');
}

// ---- Web Tarayıcı ayarları
const WEB_SIZES = [['1920x1080', '1920×1080 (tam ekran)'], ['1280x720', '1280×720'], ['800x600', '800×600 (uyarı / bağış kutusu)'], ['500x1080', '500×1080 (sohbet şeridi)'], ['1080x1920', '1080×1920 (dikey)']];
function buildWebConfig(g, cfg) {
  const F = formHelpers(g);
  F.txt('Adres (URL)', cfg, 'url', 'url', null, 'https://…');
  const sz = { v: `${cfg.w}x${cfg.h}` };
  F.sel('Sayfa boyutu', sz, 'v', [...WEB_SIZES, ...(WEB_SIZES.some(([k]) => k === sz.v) ? [] : [[sz.v, sz.v]])], (v) => { const [w, h] = v.split('x').map(Number); cfg.w = w; cfg.h = h; });
  F.sel('Kare hızı', cfg, 'fps', [[60, '60'], [30, '30'], [15, '15 (az işlemci)']]);
  F.chk('Saydam arka plan', cfg, 'transparent');
  F.chk('Sayfanın sesini çal', cfg, 'audio');
  F.row('Özel CSS', `<textarea rows="3" style="flex:1;resize:vertical" placeholder="body { background: transparent; }">${esc(cfg.css || '')}</textarea>`).querySelector('textarea').oninput = (e) => cfg.css = e.target.value;
  F.note('Streamlabs / StreamElements uyarı ve sohbet widget adreslerini, skor sayfalarını, sosyal medya akışlarını doğrudan kullanabilirsin. Sayfanın sesi bilgisayar hoparlöründen çalar, mikser kanalına girmez.');
}

// ---- Video gecikmesi ayarları
function buildDelayConfig(g, d, selfId, after) {
  const F = formHelpers(g);
  const opts = [['', '— Kaynak seç —'], ...S.inputs.filter(i => hasVideo(i) && i.id !== selfId && i.type !== 'delay').map(i => [String(i.id), `${i.n}. ${i.name}`])];
  F.sel('Kaynak', d, 'src', opts, (v) => { d.src = v ? +v : null; after?.(); });
  F.rng('Gecikme', d, 'ms', 100, 10000, 100, v => `${(v / 1000).toFixed(1)} sn`);
  F.note('Görüntü hafızada tutulur; 10 saniyeye kadar gecikme verilebilir. Ses gecikmesi için ses kaynağını mikserde ayrıca ayarla.');
}

// ---- 3D Haber Stüdyosu ayarları (hem Kaynak Seç'te hem kaynak ayarlarında)
function buildVSetConfig(g, v, selfId, onName, onChange) {
  const F = formHelpers(g), VS = window.VSet;
  if (!VS) { F.note('3D motor yükleniyor, birkaç saniye sonra tekrar aç.'); return; }
  const srcs = (pred) => [['', 'Yok'], ...S.inputs.filter(i => i.id !== selfId && i.type !== 'vset' && hasVideo(i) && pred(i)).map(i => [String(i.id), `${i.n}. ${i.name}`])];
  let accIn, chIn;
  F.sel('Stüdyo', v, 'style', Object.entries(VS.STYLES).map(([k, s]) => [k, s.name]), () => {
    const st = VS.STYLES[v.style]; v.accent = st.accent; v.channel = st.channel; v.bloom = null;
    if (accIn) accIn.value = st.accent; if (chIn) chIn.value = st.channel; onName?.();
  });
  accIn = F.txt('Vurgu rengi', v, 'accent', 'color');
  chIn = F.txt('Kanal adı', v, 'channel', 'text', null, 'NOVA HABER');
  F.txt('Kayan yazı etiketi', v, 'tickerLabel', 'text', null, 'GÜNDEM');
  F.txt('Kayan yazı', v, 'ticker', 'text', null, 'Haber başlıkları…');
  const sh = F.row('Kamera açısı', `<div class="vs-shots">${Object.entries(VS.SHOTS).map(([k, s]) => `<button data-k="${k}" class="${v.shot === k ? 'on' : ''}">${esc(s.name)}</button>`).join('')}</div>`);
  sh.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; v.shot = b.dataset.k; sh.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onChange?.(); };
  F.sel('Kamera hareketi', v, 'moveMs', [[0, 'Kesme (anında)'], [800, 'Hızlı (0.8 sn)'], [1500, 'Normal (1.5 sn)'], [3000, 'Yavaş (3 sn)']]);
  F.chk('Hafif kamera salınımı (canlı his)', v, 'drift');
  F.sel('Sunucu (kamera)', v, 'talent', srcs(() => true), (x) => { v.talent = x ? +x : null; });
  F.note('Sunucuyu yeşil/mavi perde önünde çek ve o kameranın ayarlarından <b>Chroma Key</b>\'i aç; masanın arkasında görünür.');
  F.rng('Sunucu yatay', v, 'talentX', -1.5, 1.5, 0.02, x => x.toFixed(2));
  F.rng('Sunucu dikey', v, 'talentY', -0.6, 0.6, 0.01, x => x.toFixed(2));
  F.rng('Sunucu boyutu', v, 'talentScale', 0.6, 1.6, 0.01, x => Math.round(x * 100) + '%');
  F.sel('Video duvarı', v, 'wallMode', [['graphics', 'Stüdyo grafikleri (dünya, grafikler…)'], ['source', 'Bir kaynak göster (video, ekran, kamera)']]);
  F.sel('Duvar kaynağı', v, 'screen', srcs(() => true), (x) => { v.screen = x ? +x : null; if (x) v.wallMode = 'source'; });
  if (v.bloom == null) v.bloom = VS.STYLES[v.style].bloom;
  F.rng('Işık parlaması', v, 'bloom', 0, 1.5, 0.05, x => x.toFixed(2));
  F.rng('Pozlama', v, 'exposure', 0.5, 1.6, 0.02, x => x.toFixed(2));
  F.sel('Kalite', v, 'quality', [['high', 'Yüksek (güçlü ekran kartı)'], ['mid', 'Orta'], ['low', 'Düşük (dizüstü)']]);
}

// ---- Telestratör çizim tahtası (kaynak ayarlarında)
const DRAW_COLORS = ['#ffd23f', '#ff2d4b', '#19c37d', '#4c8dff', '#ffffff', '#000000'];
function buildDrawBoard(g, inp) {
  const D = inp.draw;
  g.style.gridTemplateColumns = '1fr';
  const wrap = document.createElement('div'); wrap.className = 'draw-wrap';
  wrap.innerHTML = `<div class="draw-tools">
      ${[['pen', '✎ Kalem'], ['arrow', '➜ Ok'], ['circle', '◯ Daire']].map(([k, n]) => `<button data-tool="${k}" class="${D.tool === k ? 'on' : ''}">${n}</button>`).join('')}
      <span class="sep"></span>${DRAW_COLORS.map(c => `<button class="sw ${D.color === c ? 'on' : ''}" data-c="${c}" style="--c:${c}"></button>`).join('')}
      <span class="sep"></span><input type="range" min="2" max="30" value="${D.size}" title="Kalınlık">
      <span class="sep"></span><button data-act="undo">↶ Geri al</button><button data-act="clear">Temizle</button>
      <select data-act="ov"><option value="">Overlay'de göster…</option>${[0, 1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}">Overlay ${n + 1}</option>`).join('')}</select>
    </div><canvas class="draw-board" width="960" height="540"></canvas>
    <p class="note">Program görüntüsünün üstüne çiz. Çizim anında yayına yansır (Telestratör bir overlay kanalında açıkken).</p>`;
  g.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), c = cv.getContext('2d');
  let seen = false;
  const loop = () => {
    if (!cv.isConnected) { if (!seen) requestAnimationFrame(loop); return; } // pencere henüz açılmadıysa bekle
    seen = true;
    c.fillStyle = '#000'; c.fillRect(0, 0, 960, 540); c.drawImage(prog, 0, 0, 960, 540);
    if (!S.overlays.some(o => o.on && o.inputId === inp.id)) drawStrokes(c, D.strokes, 960, 540); // yayında değilse çizimi tahtada göster
    requestAnimationFrame(loop);
  };
  loop();
  let cur = null;
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); cur = { tool: D.tool, c: D.color, w: D.size, pts: [pt(e)] }; D.strokes.push(cur); };
  cv.onpointermove = (e) => { if (!cur) return; const p = pt(e); if (cur.tool === 'pen') cur.pts.push(p); else cur.pts[1] = p; };
  cv.onpointerup = cv.onpointercancel = () => { if (cur && cur.pts.length < 2) cur.pts.push(cur.pts[0].map(v => v + 0.0005)); cur = null; };
  const tools = wrap.querySelector('.draw-tools');
  tools.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tool) { D.tool = b.dataset.tool; tools.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.dataset.c) { D.color = b.dataset.c; tools.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.dataset.act === 'undo') D.strokes.pop();
    if (b.dataset.act === 'clear') D.strokes.length = 0;
  };
  tools.querySelector('input[type=range]').oninput = (e) => D.size = +e.target.value;
  tools.querySelector('select').onchange = (e) => { if (e.target.value !== '') toggleOverlay(+e.target.value, inp.id); e.target.value = ''; };
}

// ---- Kaynak Seç penceresi
async function listDevices(kind) {
  let devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === kind);
  if (devs.length && !devs[0].label) {
    try { const s = await navigator.mediaDevices.getUserMedia(kind === 'videoinput' ? { video: true } : { audio: true }); s.getTracks().forEach(t => t.stop()); } catch { }
    devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === kind);
  }
  return devs.map((d, k) => ({ id: d.deviceId, label: d.label || `${kind === 'videoinput' ? 'Kamera' : 'Ses girişi'} ${k + 1}` }));
}

function fileListHTML(files) { return files.length ? files.map((f, i) => `<div class="is-file">${i + 1}. ${esc(f.name)}</div>`).join('') : '<p class="note" style="margin:0">Henüz dosya seçilmedi.</p>'; }

function openInputSelect(startType) {
  const st = { type: startType || S.settings.lastInputType || 'video', number: S.inputs.length + 1, cleanup: [] };
  const D = {}; // tür başına taslak ayarlar (türler arasında gezerken korunur)
  const body = document.createElement('div'); body.className = 'isel-wrap';
  body.innerHTML = `<div class="isel">
      <nav class="isel-nav">${INPUT_TYPES.map(t => `<button data-k="${t.k}">${isIcon(t.k)}<span>${t.name}</span></button>`).join('')}</nav>
      <section class="isel-main"><div class="isel-head"><h3></h3><p></p></div><div class="isel-body"></div></section>
    </div>
    <div class="isel-foot"><label>Numara</label><select class="num"></select><span class="isel-msg"></span><button class="cancel">İptal</button><button class="primary ok">Tamam</button></div>`;
  modal('Kaynak Seç', body);
  $('#modal').classList.add('wide');
  const nav = $('.isel-nav', body), main = $('.isel-body', body), msg = $('.isel-msg', body);
  const numSel = $('.num', body);
  numSel.innerHTML = Array.from({ length: S.inputs.length + 1 }, (_, i) => `<option value="${i + 1}" ${i === S.inputs.length ? 'selected' : ''}>${i + 1}${i === S.inputs.length ? ' (sona)' : ''}</option>`).join('');
  numSel.onchange = () => st.number = +numSel.value;
  const cleanup = () => { st.cleanup.forEach(f => { try { f(); } catch { } }); st.cleanup = []; };

  const show = async (k) => {
    cleanup(); st.type = k; msg.textContent = '';
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    const T = INPUT_TYPES.find(t => t.k === k);
    $('.isel-head h3', body).innerHTML = `${isIcon(k)} ${T.name}`; $('.isel-head p', body).textContent = T.desc;
    main.innerHTML = '<div class="grid2"></div>';
    const g = main.firstElementChild, d = D[k] = D[k] || {};
    await PAGES[k].render(g, d, st);
  };
  nav.onclick = (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.k); };
  $('.cancel', body).onclick = () => { cleanup(); closeModal(); };
  $('.ok', body).onclick = async () => {
    const page = PAGES[st.type], d = D[st.type];
    const okBtn = $('.ok', body); okBtn.disabled = true;
    S._insertAt = st.number - 1;
    try {
      const r = await page.ok(d, st);
      if (r === false) return;
      cleanup(); S.settings.lastInputType = st.type; closeModal();
      const made = Array.isArray(r) ? r : r && r.id ? [r] : [];
      if (made.length) { renderInputs(); toast(`${made.length > 1 ? made.length + ' kaynak' : '"' + made[0].name + '"'} eklendi (${made[0].n}. sıra).`); }
      const ov = d.overlay; if (made[0] && ov !== '' && ov != null) toggleOverlay(+ov, made[0].id);
      if (made[0] && d.editAfter) openInputSettings(made[0].id, d.editAfter);
    } catch (e) { msg.textContent = 'Eklenemedi: ' + (e.message || e.name); }
    finally { S._insertAt = null; if (okBtn.isConnected) okBtn.disabled = false; }
  };
  show(st.type);
}

const need = (cond, text) => { if (!cond) { $('.isel-msg').textContent = text; return false; } return true; };
const overlayRow = (F, d, def = '') => { if (d.overlay === undefined) d.overlay = def; F.sel('Ekleyince', d, 'overlay', [['', 'Sadece kaynak olarak ekle'], ...[0, 1, 2, 3, 4, 5, 6, 7].map(n => [n, `Overlay ${n + 1}'de hemen aç`])]); };

const PAGES = {
  video: {
    render(g, d) {
      const F = formHelpers(g);
      d.files = d.files || []; if (d.loop == null) { d.loop = true; d.autoPlay = true; }
      const r = F.row('Dosya(lar)', `<button class="primary">Gözat…</button><span class="note" style="margin:0">Birden fazla seçebilirsin</span>`);
      const list = document.createElement('div'); list.className = 'is-files'; g.append(document.createElement('span'), list);
      const draw = () => list.innerHTML = fileListHTML(d.files); draw();
      r.querySelector('button').onclick = async () => { d.files = await pickFiles('video'); draw(); };
      if (this.asList) d.asList = true; else F.chk('Hepsini tek kaynakta oynatma listesi yap', d, 'asList');
      F.chk('Döngü', d, 'loop'); F.chk('Yayına girince oynat', d, 'autoPlay');
    },
    ok(d) {
      if (!need(d.files?.length, 'Önce video dosyası seç.')) return false;
      const made = this.asList || d.asList ? [addVideo(d.files[0], d.files.slice(1))] : d.files.map(f => addVideo(f));
      made.forEach(i => { i.loop = d.loop; i.autoPlay = d.autoPlay; i.el.loop = d.loop && i.list.length === 1; });
      return made;
    }
  },
  camera: {
    async render(g, d, st) {
      const F = formHelpers(g);
      const [cams, mics] = await Promise.all([listDevices('videoinput'), listDevices('audioinput')]);
      if (!cams.length) { F.note('Kamera bulunamadı. Kameranın bağlı ve başka bir programda kullanılmıyor olduğundan emin ol.'); return; }
      Object.assign(d, { dev: d.dev ?? cams[0].id, res: d.res || '1920x1080', fps: d.fps || 30, aud: d.aud ?? '' }, {});
      F.sel('Aygıt', d, 'dev', cams.map(c => [c.id, c.label]), () => preview());
      F.sel('Çözünürlük', d, 'res', [['3840x2160', '3840×2160 (4K)'], ['1920x1080', '1920×1080 (1080p)'], ['1280x720', '1280×720 (720p)'], ['640x480', '640×480']], () => preview());
      F.sel('Kare hızı', d, 'fps', [[60, '60 fps'], [50, '50 fps'], [30, '30 fps'], [25, '25 fps']], () => preview());
      F.sel('Ses aygıtı', d, 'aud', [['', 'Yok (sadece görüntü)'], ...mics.map(m => [m.id, m.label])]);
      F.note('Yakalama kartının (HDMI) sesini almak için kartın ses girişini seç.');
      const pv = F.row('Önizleme', `<div class="is-preview"><video muted playsinline></video><span class="is-info"></span></div>`);
      const v = pv.querySelector('video'), info = pv.querySelector('.is-info');
      let stream = null; const stop = () => { stream?.getTracks().forEach(t => t.stop()); stream = null; };
      st.cleanup.push(stop);
      const preview = async () => {
        stop(); info.textContent = 'Açılıyor…';
        const [w, h] = d.res.split('x').map(Number);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: d.dev }, width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: d.fps } } });
          v.srcObject = stream; v.play().catch(() => { });
          const s = stream.getVideoTracks()[0].getSettings(); info.textContent = `${s.width}×${s.height} @ ${Math.round(s.frameRate || d.fps)} fps`;
        } catch (e) { info.textContent = 'Açılamadı: ' + (e.message || e.name); }
      };
      d._cams = cams; preview();
    },
    async ok(d, st) {
      if (!need(d.dev, 'Kamera bulunamadı.')) return false;
      st.cleanup.forEach(f => f()); st.cleanup = [];
      const [w, h] = d.res.split('x').map(Number);
      return addCamera(d.dev, d._cams.find(c => c.id === d.dev)?.label, { w, h, fps: d.fps, audioId: d.aud || null });
    }
  },
  screen: {
    async render(g, d) {
      const F = formHelpers(g); if (d.audio == null) d.audio = true;
      F.chk('Sistem sesini de al (oyun / müzik sesi)', d, 'audio');
      if (!NOVA) { F.note('Tamam’a basınca tarayıcı ekran seçme penceresini açar.'); return; }
      const r = F.row('Kaynak', `<button>Listeyi yenile</button>`);
      const grid = document.createElement('div'); grid.className = 'pick is-pick'; g.append(document.createElement('span'), grid);
      const load = async () => {
        const src = await NOVA.getSources();
        grid.innerHTML = src.map(s => `<button data-id="${esc(s.id)}" class="${d.id === s.id ? 'sel' : ''}"><img src="${s.thumb}"><span>${esc(s.name)}</span></button>`).join('');
        grid.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; d.id = b.dataset.id; d.name = b.querySelector('span').textContent; grid.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); };
        grid.ondblclick = () => $('.isel-foot .ok').click();
      };
      r.querySelector('button').onclick = load; load();
    },
    ok(d) {
      if (NOVA && !need(d.id, 'Bir ekran ya da pencere seç.')) return false;
      return addScreen(d.id || null, d.name || 'Ekran Paylaşımı', d.audio);
    }
  },
  url: {
    render(g, d) {
      const F = formHelpers(g); if (d.loop == null) d.loop = true;
      F.txt('Video adresi', d, 'url', 'url', null, 'https://…/video.mp4'); F.txt('İsim', d, 'name', 'text', null, 'Ağ Videosu'); F.chk('Döngü', d, 'loop');
      F.note('Doğrudan MP4 / WebM dosya adresleri çalışır. YouTube sayfası, HLS (.m3u8), RTMP ve SRT akışları bu kaynakla oynatılamaz; web sayfaları için Web Tarayıcı kaynağını kullan.');
    },
    ok(d) {
      if (!need(isNet(d.url), 'http:// veya https:// ile başlayan bir video adresi gir.')) return false;
      const inp = addVideo({ url: d.url.trim(), name: d.name || decodeURIComponent(d.url.split('/').pop().split('?')[0]) || 'Ağ Videosu' });
      inp.loop = d.loop; inp.el.loop = d.loop; return inp;
    }
  },
  replay: {
    render(g, d) {
      if (!d.rp) {
        const first = !S.inputs.some(i => i.type === 'replay');
        const cams = S.inputs.filter(i => i.type === 'camera' || i.type === 'screen').slice(0, 7).map(i => i.id);
        d.rp = { angles: first ? ['pgm', ...Array.from({ length: RP_N - 1 }, (_, k) => cams[k] ?? null)] : [...replayAngles()], secs: 8, speed: 0.5, inT: { type: 'fade', ms: 500 }, outT: { type: 'fade', ms: 500 }, autoReturn: true };
        d.first = first;
      }
      buildReplayConfig(g, d.rp, { isFirst: d.first });
    },
    ok(d) {
      const inp = addReplay();
      const { angles, ...rest } = d.rp; Object.assign(inp.rp, JSON.parse(JSON.stringify(rest)));
      if (d.first) inp.rp.angles = [...angles];
      return inp;
    }
  },
  stinger: {
    render(g, d) {
      const F = formHelpers(g);
      if (d.slot == null) { const free = S.settings.stingers.findIndex(x => !x); d.slot = free < 0 ? 0 : free; }
      const load = () => { const x = S.settings.stingers[d.slot]; Object.assign(d, x ? JSON.parse(JSON.stringify(x)) : { kind: 'builtin', style: 'serit', color: CAT_COLORS[d.slot % 8], dur: 1000, cut: 500 }); };
      if (!d.kind) load();
      F.sel('Yuva', d, 'slot', S.settings.stingers.map((x, n) => [n, `Stinger ${n + 1} — ${x ? stingerLabel(n) : 'boş'}`]), () => { load(); rerender(); });
      F.sel('Tür', d, 'kind', [['builtin', 'Hazır animasyon'], ['video', 'Video dosyası (saydam WebM önerilir)']], () => rerender());
      if (d.kind === 'builtin') {
        F.sel('Animasyon', d, 'style', Object.entries(STINGER_STYLES).map(([k, v]) => [k, v.name]));
        F.txt('Renk', d, 'color', 'color'); F.rng('Süre', d, 'dur', 300, 3000, 50, v => `${v} ms`);
      } else {
        const r = F.row('Video', `<button class="primary">Gözat…</button><span class="note" style="margin:0">${esc(d.name || 'seçilmedi')}</span>`);
        r.querySelector('button').onclick = async () => { const f = (await pickFiles('video'))[0]; if (f) { Object.assign(d, { path: f.path || null, url: f.url || null, name: f.name }); rerender(); } };
      }
      F.rng('Kesme noktası', d, 'cut', 0, Math.max(3000, d.dur || 0), 50, v => `${v} ms`);
      const pv = F.row('Önizleme', `<canvas class="is-stg" width="480" height="270"></canvas>`).querySelector('canvas');
      const c = pv.getContext('2d'), t0 = performance.now();
      const loop = () => {
        if (!pv.isConnected) return;
        const dur = d.kind === 'builtin' ? d.dur || 1000 : 1000, p = ((performance.now() - t0) % (dur + 600)) / dur;
        const cut = (d.cut ?? dur / 2) / dur;
        c.fillStyle = p < cut ? '#1b2a52' : '#3a0d2e'; c.fillRect(0, 0, 480, 270);
        c.fillStyle = '#fff'; c.font = '800 40px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p < cut ? 'A' : 'B', 240, 135);
        if (p <= 1 && d.kind === 'builtin') Stinger.draw(c, 480, 270, d.style, p, d.color, Math.min(0.95, Math.max(0.05, cut)));
        requestAnimationFrame(loop);
      };
      if (d.kind === 'builtin') loop(); else c.fillStyle = '#111', c.fillRect(0, 0, 480, 270);
      F.note('Stinger bir kaynak değil, geçiştir: paneldeki S1–S8 düğmeleri, Ctrl+F1–F8 ya da bir kaynağın GO düğmesiyle kullanılır.');
      function rerender() { g.innerHTML = ''; PAGES.stinger.render(g, d); }
    },
    ok(d) {
      if (d.kind === 'video' && !need(d.path || d.url, 'Stinger videosu seç.')) return false;
      S.settings.stingers[d.slot] = d.kind === 'builtin' ? { kind: 'builtin', style: d.style, color: d.color, dur: d.dur, cut: d.cut } : { kind: 'video', path: d.path, url: d.url, name: d.name, cut: d.cut };
      renderStingerBar(); saveSettings(); toast(`Stinger ${d.slot + 1} kaydedildi.`);
      return true;
    }
  },
  delay: {
    render(g, d) { if (d.ms == null) { d.ms = 2000; d.src = S.inputs.find(i => i.type === 'camera')?.id ?? null; } buildDelayConfig(g, d, null); },
    ok(d) { if (!need(d.src, 'Gecikmeli gösterilecek kaynağı seç.')) return false; return addDelay(d.src, d.ms); }
  },
  image: {
    render(g, d) {
      const F = formHelpers(g); d.files = d.files || []; d.fit = d.fit || 'contain';
      const r = F.row('Dosya(lar)', `<button class="primary">Gözat…</button>`); const list = document.createElement('div'); list.className = 'is-files'; g.append(document.createElement('span'), list);
      const draw = () => list.innerHTML = fileListHTML(d.files); draw();
      r.querySelector('button').onclick = async () => { d.files = await pickFiles('image'); draw(); };
      F.sel('Sığdırma', d, 'fit', [['contain', 'Sığdır'], ['cover', 'Doldur'], ['stretch', 'Esnet']]);
      overlayRow(F, d);
    },
    ok(d) { if (!need(d.files?.length, 'Önce resim seç.')) return false; return d.files.map(f => { const i = addImage(f); i.fit = d.fit; return i; }); }
  },
  photos: {
    render(g, d) {
      const F = formHelpers(g); d.files = d.files || []; Object.assign(d, { interval: d.interval ?? 5, fade: d.fade ?? 800, shuffle: !!d.shuffle, kenburns: d.kenburns ?? true });
      const r = F.row('Fotoğraflar', `<button class="primary">Gözat…</button>`); const list = document.createElement('div'); list.className = 'is-files'; g.append(document.createElement('span'), list);
      const draw = () => list.innerHTML = fileListHTML(d.files); draw();
      r.querySelector('button').onclick = async () => { d.files = d.files.concat(await pickFiles('image')); draw(); };
      F.rng('Süre', d, 'interval', 1, 60, 0.5, v => `${v} sn`); F.rng('Geçiş', d, 'fade', 0, 3000, 50, v => `${v} ms`);
      F.chk('Karışık sıra', d, 'shuffle'); F.chk('Yavaş yakınlaşma (Ken Burns)', d, 'kenburns');
    },
    ok(d) { if (!need(d.files?.length, 'Önce fotoğraf seç.')) return false; return addPhotos(d.files, { interval: d.interval, fade: d.fade, shuffle: d.shuffle, kenburns: d.kenburns }); }
  },
  color: {
    render(g, d) {
      const F = formHelpers(g); Object.assign(d, { c1: d.c1 || '#101a3a', c2: d.c2 || '#3a0d2e', grad: d.grad ?? true });
      const upd = () => pv.style.background = d.grad ? `linear-gradient(135deg, ${d.c1}, ${d.c2})` : d.c1;
      F.txt('Renk 1', d, 'c1', 'color', () => upd()); F.chk('Degrade', d, 'grad', () => upd()); F.txt('Renk 2', d, 'c2', 'color', () => upd());
      const pv = F.row('Önizleme', `<div class="is-color"></div>`).querySelector('div'); upd();
    },
    ok(d) { return addColor(d.c1, d.grad ? d.c2 : ''); }
  },
  audio: {
    render(g, d) {
      const F = formHelpers(g); d.files = d.files || []; if (d.loop == null) d.loop = false;
      const r = F.row('Dosya(lar)', `<button class="primary">Gözat…</button>`); const list = document.createElement('div'); list.className = 'is-files'; g.append(document.createElement('span'), list);
      const draw = () => list.innerHTML = fileListHTML(d.files); draw();
      r.querySelector('button').onclick = async () => { d.files = await pickFiles('audio'); draw(); };
      F.chk('Döngü', d, 'loop');
    },
    ok(d) { if (!need(d.files?.length, 'Önce ses dosyası seç.')) return false; return d.files.map(f => { const i = addAudioFile(f); i.loop = d.loop; i.media.loop = d.loop; return i; }); }
  },
  mic: {
    async render(g, d) {
      const F = formHelpers(g); const mics = await listDevices('audioinput');
      if (!mics.length) { F.note('Ses girişi bulunamadı.'); return; }
      Object.assign(d, { dev: d.dev ?? mics[0].id, ec: !!d.ec, ns: !!d.ns, agc: !!d.agc, comp: !!d.comp });
      F.sel('Aygıt', d, 'dev', mics.map(m => [m.id, m.label]));
      F.chk('Yankı engelleme', d, 'ec'); F.chk('Gürültü bastırma', d, 'ns'); F.chk('Otomatik ses seviyesi', d, 'agc'); F.chk('Kompresör (sesi dengele)', d, 'comp');
      F.note('Stüdyo mikrofonlarında bu seçenekleri kapalı bırakmak en temiz sesi verir; dizüstü mikrofonunda gürültü bastırma işe yarar.');
      d._mics = mics;
    },
    async ok(d) {
      if (!need(d.dev, 'Ses girişi bulunamadı.')) return false;
      const inp = await addMic(d.dev, d._mics.find(m => m.id === d.dev)?.label, { ec: d.ec, ns: d.ns, agc: d.agc });
      if (d.comp) { inp.audio.comp = true; applyComp(inp); } return inp;
    }
  },
  title: {
    render(g, d) {
      g.style.gridTemplateColumns = '1fr'; d.key = d.key || 'altbant'; if (d.editAfter == null) d.editAfter = 'title';
      const host = document.createElement('div'); g.appendChild(host);
      host.innerHTML = TITLE_CATS.map(cat => `<h3 class="cat-h">${cat}</h3><div class="pick is-pick">${Object.entries(TITLE_TEMPLATES).filter(([, t]) => t.cat === cat).map(([k, t]) => `<button data-k="${k}" class="${d.key === k ? 'sel' : ''}"><img data-k="${k}"><span>${esc(t.name)}</span></button>`).join('')}</div>`).join('');
      const c = document.createElement('canvas');
      host.querySelectorAll('img').forEach(img => {
        const k = img.dataset.k, t = TITLE_TEMPLATES[k];
        TitleRenderer.render(c, { title: Object.assign({ template: k, accent: t.accent || '#ff2d4b', textColor: '#fff', bg: 'rgba(10,12,18,0.88)' }, t.defaults) }, 480, 270, k === 'abone' ? 2.5 : k === 'bagis' ? 1.2 : 3);
        img.src = c.toDataURL(); img.style.background = 'linear-gradient(135deg,#2a3550,#101522)';
      });
      host.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; d.key = b.dataset.k; host.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); };
      host.ondblclick = () => $('.isel-foot .ok').click();
      const g2 = document.createElement('div'); g2.className = 'grid2'; g.appendChild(g2); const F = formHelpers(g2);
      overlayRow(F, d); F.sel('Sonra', d, 'editAfter', [['title', 'Metni düzenlemek için ayarları aç'], ['', 'Hiçbir şey yapma']]);
    },
    ok(d) { return addTitle(d.key); }
  },
  studio: {
    render(g, d) {
      g.style.gridTemplateColumns = '1fr'; d.key = d.key || 'haber';
      const grid = document.createElement('div'); grid.className = 'pick is-pick'; g.appendChild(grid);
      const c = document.createElement('canvas');
      grid.innerHTML = Object.entries(STUDIO_STYLES).map(([k, s]) => { StudioRenderer.render(c, { studio: { style: k, accent: s.accent, label: s.label, speed: 1 } }, 480, 270, 2.2); return `<button data-k="${k}" class="${d.key === k ? 'sel' : ''}"><img src="${c.toDataURL('image/jpeg', 0.85)}"><span>${esc(s.name)}</span></button>`; }).join('');
      grid.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; d.key = b.dataset.k; grid.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); };
      grid.ondblclick = () => $('.isel-foot .ok').click();
    },
    ok(d) { return addStudio(d.key); }
  },
  scene: {
    render(g, d) {
      g.style.gridTemplateColumns = '1fr'; d.key = d.key || 'pip_sag';
      const grid = document.createElement('div'); grid.className = 'pick is-pick'; g.appendChild(grid);
      const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d');
      grid.innerHTML = Object.entries(SCENE_PRESETS).map(([k, pr]) => {
        x.fillStyle = '#0b0d12'; x.fillRect(0, 0, 320, 180);
        pr.cells.forEach((q, i) => { x.fillStyle = ['#ff2d4b', '#4c8dff', '#19c37d', '#ffb020'][i % 4]; x.globalAlpha = i === 0 && q[2] > 99 ? 0.45 : 0.9; x.beginPath(); x.roundRect(q[0] * 3.2, q[1] * 1.8, q[2] * 3.2, q[3] * 1.8, 6); x.fill(); x.globalAlpha = 1; });
        return `<button data-k="${k}" class="${d.key === k ? 'sel' : ''}"><img src="${c.toDataURL()}"><span>${esc(pr.name)}</span></button>`;
      }).join('');
      grid.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; d.key = b.dataset.k; grid.querySelectorAll('button').forEach(y => y.classList.toggle('sel', y === b)); };
      grid.ondblclick = () => $('.isel-foot .ok').click();
      const g2 = document.createElement('div'); g2.className = 'grid2'; g.appendChild(g2);
      formHelpers(g2).note('Pencerelere otomatik olarak kamera, ekran ve videoların atanır; Tamam’dan sonra açılan ayarlardan değiştirebilirsin.');
      d.editAfter = 'sahne';
    },
    ok(d) { return addScene(d.key); }
  },
  web: {
    render(g, d) {
      if (!d.cfg) d.cfg = { url: 'https://', w: 1280, h: 720, fps: 30, css: '', audio: false, transparent: true };
      buildWebConfig(g, d.cfg); overlayRow(formHelpers(g), d);
      if (!NOVA?.webOpen) formHelpers(g).note('<b>Not:</b> Web Tarayıcı kaynağı masaüstü uygulamasında çalışır.');
    },
    ok(d) { if (!need(isNet(d.cfg.url) && d.cfg.url.length > 10, 'http:// veya https:// ile başlayan bir adres gir.')) return false; return addWeb({ ...d.cfg }); }
  },
  vset: {
    async render(g, d) {
      g.style.gridTemplateColumns = '1fr';
      if (!window.VSet) { formHelpers(g).note('3D motor yükleniyor…'); await new Promise(r => { const t = setInterval(() => { if (window.VSet) { clearInterval(t); r(); } }, 150); setTimeout(() => { clearInterval(t); r(); }, 8000); }); g.innerHTML = ''; }
      if (!window.VSet) { formHelpers(g).note('3D motor yüklenemedi (ekran kartı WebGL desteği gerekli).'); return; }
      d.key = d.key || 'merkez'; if (d.editAfter == null) d.editAfter = 'vset';
      const grid = document.createElement('div'); grid.className = 'pick is-pick'; g.appendChild(grid);
      grid.innerHTML = Object.entries(VSet.STYLES).map(([k, s]) => `<button data-k="${k}" class="${d.key === k ? 'sel' : ''}"><img alt=""><span>${esc(s.name)}</span></button>`).join('');
      grid.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; d.key = b.dataset.k; grid.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); };
      grid.ondblclick = () => $('.isel-foot .ok').click();
      const g2 = document.createElement('div'); g2.className = 'grid2'; g.appendChild(g2); const F = formHelpers(g2);
      d.talent = d.talent ?? (S.inputs.find(i => i.type === 'camera')?.id ?? '');
      F.sel('Sunucu (kamera)', d, 'talent', [['', 'Şimdilik yok'], ...S.inputs.filter(i => hasVideo(i) && i.type !== 'vset').map(i => [String(i.id), `${i.n}. ${i.name}`])]);
      overlayRow(F, d); F.sel('Sonra', d, 'editAfter', [['vset', 'Stüdyo ayarlarını aç'], ['', 'Hiçbir şey yapma']]);
      F.note('<span class="vs-prep">Önizlemeler hazırlanıyor… </span>Gerçek zamanlı 3D, ekran kartını kullanır. Sunucuyu yeşil perde önünde çekip kamerada Chroma Key açarsan masanın arkasında görünür.');
      for (const b of grid.querySelectorAll('button')) {
        if (!grid.isConnected) break;
        try { b.querySelector('img').src = await VSet.snapshot(b.dataset.k, 480, 270, 'genis'); } catch (e) { console.warn(e); }
        await new Promise(r => setTimeout(r, 30));
      }
      g2.querySelector('.vs-prep')?.remove();
    },
    ok(d) { return addVSet(d.key, { talent: d.talent === '' || d.talent == null ? null : +d.talent }); }
  },
  draw: {
    render(g, d) {
      const F = formHelpers(g); Object.assign(d, { color: d.color || '#ffd23f', size: d.size || 8 });
      F.txt('Kalem rengi', d, 'color', 'color'); F.rng('Kalınlık', d, 'size', 2, 30);
      overlayRow(F, d, 0); d.editAfter = 'cizim';
      F.note('Tamam’dan sonra çizim tahtası açılır: program görüntüsünün üstüne kalem, ok ve daire ile çizersin, çizim anında yayına yansır.');
    },
    ok(d) { return addDraw({ color: d.color, size: d.size }); }
  }
};
PAGES.list = { ...PAGES.video, asList: true, render(g, d) { return PAGES.video.render.call(this, g, d); }, ok(d) { return PAGES.video.ok.call(this, d); } };
