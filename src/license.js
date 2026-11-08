// NOVA Canlı - Lisans doğrulama (ana süreç)
// Lisans anahtarları Ed25519 ile imzalanır. Uygulamada yalnızca AÇIK anahtar bulunur;
// anahtar üretmek için gereken gizli anahtar sadece "NOVA Lisans Üretici" aracındadır.
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PUBLIC_KEY_B64 = 'LrxhKCmkq5keF/4DlK8vQICESnw5LTGxUE1wjy73SPA=';
const TRIAL_DAYS = 7;
const DAY = 86400000;

const pubKey = crypto.createPublicKey({
  key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(PUBLIC_KEY_B64, 'base64')]),
  format: 'der', type: 'spki'
});

const b64u = {
  enc: (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
};

// Bilgisayara özgü kod: işlemci, bilgisayar adı, ağ kartı (fiziksel) adresleri ve kullanıcı.
function machineId() {
  const macs = Object.values(os.networkInterfaces()).flat()
    .filter(n => n && !n.internal && n.mac && n.mac !== '00:00:00:00:00:00')
    .map(n => n.mac.toLowerCase()).filter((v, i, a) => a.indexOf(v) === i).sort().slice(0, 3);
  const raw = [os.hostname(), os.platform(), os.arch(), os.cpus()[0]?.model || '', (() => { try { return os.userInfo().username; } catch { return ''; } })(), ...macs].join('|');
  const h = crypto.createHash('sha256').update('nova-canli:' + raw).digest();
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < 16; i++) s += A[h[i] % 32];
  return s.match(/.{4}/g).join('-');
}

// Anahtar biçimi: NV1.<yük (base64url JSON)>.<imza (base64url)>
function parseKey(key) {
  const k = String(key || '').replace(/\s+/g, '');
  const m = /^NV1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(k);
  if (!m) return { ok: false, error: 'Anahtar biçimi hatalı. "NV1." ile başlayan anahtarın tamamını yapıştırın.' };
  let ok = false;
  try { ok = crypto.verify(null, Buffer.from(m[1]), pubKey, b64u.dec(m[2])); } catch { ok = false; }
  if (!ok) return { ok: false, error: 'Anahtar geçersiz (imza doğrulanamadı).' };
  let p; try { p = JSON.parse(b64u.dec(m[1]).toString('utf8')); } catch { return { ok: false, error: 'Anahtar okunamadı.' }; }
  return { ok: true, key: k, p };
}

function check(key, now = Date.now()) {
  const r = parseKey(key); if (!r.ok) return r;
  const p = r.p;
  if (p.m && p.m !== '*' && p.m !== machineId()) return { ok: false, error: `Bu anahtar başka bir bilgisayar için üretilmiş (${p.m}).` };
  if (p.x && now > Date.parse(p.x + 'T23:59:59')) return { ok: false, expired: true, p, error: `Lisans süresi ${p.x} tarihinde doldu.` };
  return { ok: true, p, key: r.key };
}

// ---- Durum dosyaları (deneme başlangıcı iki ayrı yerde tutulur)
let store = null;
function files(app) {
  return [path.join(app.getPath('userData'), 'lisans.json'), path.join(app.getPath('appData'), '.nvc-sys.dat')];
}
function load(app) {
  if (store) return store;
  const [f1, f2] = files(app);
  let a = {}, b = {};
  try { a = JSON.parse(fs.readFileSync(f1, 'utf8')); } catch { }
  try { b = JSON.parse(Buffer.from(fs.readFileSync(f2, 'utf8'), 'base64').toString('utf8')); } catch { }
  const starts = [a.trialStart, b.t].filter(Number.isFinite);
  store = {
    key: a.key || b.k || null,
    trialStart: starts.length ? Math.min(...starts) : Date.now(),
    lastSeen: Math.max(a.lastSeen || 0, b.s || 0)
  };
  save(app);
  return store;
}
function save(app) {
  const [f1, f2] = files(app);
  try { fs.mkdirSync(path.dirname(f1), { recursive: true }); fs.writeFileSync(f1, JSON.stringify({ key: store.key, trialStart: store.trialStart, lastSeen: store.lastSeen }, null, 2)); } catch { }
  try { fs.writeFileSync(f2, Buffer.from(JSON.stringify({ k: store.key, t: store.trialStart, s: store.lastSeen })).toString('base64')); } catch { }
}

function status(app) {
  const s = load(app), now = Date.now();
  const clockBack = s.lastSeen && now < s.lastSeen - DAY; // saat geri alınmış
  if (!clockBack && now > s.lastSeen) { s.lastSeen = now; save(app); }
  const base = { machine: machineId(), trialDays: TRIAL_DAYS };
  if (s.key) {
    const c = check(s.key, clockBack ? s.lastSeen : now);
    if (c.ok) return { ...base, state: 'licensed', name: c.p.n || '', email: c.p.e || '', plan: c.p.p || 'pro', expires: c.p.x || null, id: c.p.id || '', bound: c.p.m && c.p.m !== '*' };
    if (c.expired) return { ...base, state: 'expired', name: c.p.n || '', expires: c.p.x, error: c.error };
  }
  const used = Math.max(0, (clockBack ? s.lastSeen : now) - s.trialStart);
  const left = Math.ceil((TRIAL_DAYS * DAY - used) / DAY);
  if (clockBack) return { ...base, state: 'trial-over', daysLeft: 0, error: 'Bilgisayar saati geri alınmış görünüyor. Saati düzeltin veya lisans girin.' };
  return left > 0 ? { ...base, state: 'trial', daysLeft: left } : { ...base, state: 'trial-over', daysLeft: 0 };
}

function activate(app, key) {
  const c = check(key);
  if (!c.ok) return { ok: false, error: c.error };
  load(app); store.key = c.key; save(app);
  return { ok: true, status: status(app) };
}
function remove(app) { load(app); store.key = null; save(app); return status(app); }
// Yayın / kayıt izni: lisanslı ya da deneme süresi içinde
function canOutput(app) { const s = status(app); return s.state === 'licensed' || s.state === 'trial'; }

module.exports = { status, activate, remove, canOutput, machineId, parseKey, check };
