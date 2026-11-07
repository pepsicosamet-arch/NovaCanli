// NOVA Canlı - Ana süreç (Electron)
// Samet Şahin (@xsametsahinx)
const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, shell, screen, session, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

// Otomatik güncelleme (GitHub Releases). Paket yoksa veya geliştirme modundaysa sessizce devre dışı.
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { autoUpdater = null; }
let updateReady = false;

// Uygulama ve medya dosyaları aynı kökenden (nova://app) sunulur; böylece
// videolar tuvale çizilip yayına/kayda temiz şekilde aktarılabilir.
protocol.registerSchemesAsPrivileged([{
  scheme: 'nova',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
}]);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.ogv': 'video/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.aac': 'audio/aac', '.flac': 'audio/flac', '.json': 'application/json', '.woff2': 'font/woff2'
};

function serveFile(file, req) {
  if (!fs.existsSync(file)) return new Response('Bulunamadı', { status: 404 });
  const size = fs.statSync(file).size;
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.get('range');
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (m) {
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : size - 1;
    if (!m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
      status: 206,
      headers: { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` }
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)), {
    status: 200, headers: { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': String(size) }
  });
}

function registerProtocol() {
  const root = path.join(__dirname, 'renderer');
  protocol.handle('nova', (req) => {
    const u = new URL(req.url);
    if (u.pathname === '/__media') return serveFile(u.searchParams.get('p'), req);
    if (u.pathname === '/__url') { // ağ videosu: aynı kökenden sun ki yayın/kayıt tuvali kirlenmesin
      const target = u.searchParams.get('u') || '';
      if (!/^https?:\/\//i.test(target)) return new Response('Yasak', { status: 403 });
      const headers = {}; const range = req.headers.get('range'); if (range) headers.Range = range;
      return net.fetch(target, { headers }).catch(err => new Response(String(err.message || err), { status: 502 }));
    }
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root)) return new Response('Yasak', { status: 403 });
    return serveFile(file, req);
  });
}
const { spawn } = require('child_process');
const ffArgs = require('./ffargs');

let win = null;
const outputs = {}; // { stream: {proc,...}, record: {proc,...} }

function ffmpegPath() {
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  if (app.isPackaged) {
    const p = path.join(process.resourcesPath, 'ffmpeg', exe);
    if (fs.existsSync(p)) return p;
  }
  try {
    const p = require('ffmpeg-static');
    if (p && fs.existsSync(p)) return p.replace('app.asar', 'app.asar.unpacked');
  } catch (e) { /* yok */ }
  return 'ffmpeg'; // PATH'teki ffmpeg
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 960, minWidth: 1200, minHeight: 720,
    backgroundColor: '#0d0f14',
    title: 'NOVA Canlı',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // arka planda da 30/60 fps çizsin
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
  win.loadURL('nova://app/index.html');

  // Harici çıkış penceresi (projeksiyon / ikinci monitör)
  win.webContents.setWindowOpenHandler(({ frameName }) => {
    if (frameName === 'nova-output') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 960, height: 540, backgroundColor: '#000', autoHideMenuBar: true,
          title: 'NOVA Canlı - Çıkış'
        }
      };
    }
    return { action: 'deny' };
  });

  win.on('closed', () => { for (const w of webSources.values()) if (!w.isDestroyed()) w.destroy(); webSources.clear(); win = null; });
  win.on('close', (e) => {
    if (outputs.stream || outputs.record) {
      const r = dialog.showMessageBoxSync(win, {
        type: 'warning', buttons: ['Kapat', 'Vazgeç'], defaultId: 1,
        message: 'Yayın veya kayıt devam ediyor. Yine de kapatılsın mı?'
      });
      if (r === 1) { e.preventDefault(); return; }
    }
    Object.keys(outputs).forEach(stopOutput);
  });
}

app.commandLine.appendSwitch('enable-features', 'PlatformHEVCEncoderSupport');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

app.whenReady().then(() => {
  // Kamera/mikrofon/ekran izinlerini otomatik ver
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(true));
  session.defaultSession.setPermissionCheckHandler(() => true);
  registerProtocol();
  createWindow();
});
app.on('window-all-closed', () => app.quit());

// ---------- Ekran / pencere kaynakları ----------
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 }, fetchWindowIcons: false
  });
  return sources.map(s => ({ id: s.id, name: s.name, thumb: s.thumbnail.toDataURL() }));
});

ipcMain.handle('get-displays', () => screen.getAllDisplays().map(d => ({ id: d.id, bounds: d.bounds, label: d.label })));

// ---------- Dosya diyalogları ----------
ipcMain.handle('open-files', async (e, kind) => {
  const filters = {
    video: [{ name: 'Video', extensions: ['mp4', 'webm', 'mov', 'mkv', 'm4v', 'ogv'] }],
    image: [{ name: 'Resim', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
    audio: [{ name: 'Ses', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }],
    srt: [{ name: 'Altyazı', extensions: ['srt', 'vtt', 'txt'] }],
    project: [{ name: 'NOVA Canlı Projesi', extensions: ['nova'] }]
  }[kind] || [];
  const r = await dialog.showOpenDialog(win, { properties: kind === 'project' ? ['openFile'] : ['openFile', 'multiSelections'], filters });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle('choose-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('save-project', async (e, json, current) => {
  let file = current;
  if (!file) {
    const r = await dialog.showSaveDialog(win, { defaultPath: 'yayin.nova', filters: [{ name: 'NOVA Canlı Projesi', extensions: ['nova'] }] });
    if (r.canceled) return null;
    file = r.filePath;
  }
  fs.writeFileSync(file, json, 'utf8');
  return file;
});

ipcMain.handle('read-file', (e, file) => fs.readFileSync(file, 'utf8'));
ipcMain.handle('default-folder', () => {
  const dir = path.join(app.getPath('videos'), 'NOVA Canli');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
});
ipcMain.handle('open-folder', (e, dir) => shell.openPath(dir));
ipcMain.handle('open-url', (e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

ipcMain.handle('save-buffer', (e, dir, name, buf) => {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, path.basename(String(name)).replace(/[<>:"/\\|?*]+/g, '_'));
  fs.writeFileSync(file, Buffer.from(buf));
  return file;
});

// ---------- Web Tarayıcı kaynakları (görünmez, ekran dışı çizim) ----------
const webSources = new Map();
function sendWeb(...a) { if (win && !win.isDestroyed()) win.webContents.send(...a); }
ipcMain.handle('web-open', (e, id, cfg) => {
  if (!/^https?:\/\//i.test(String(cfg.url || ''))) { sendWeb('web-event', id, 'fail', 'Adres http:// veya https:// ile başlamalı'); return false; }
  const w = new BrowserWindow({
    show: false, frame: false, width: Math.round(cfg.w || 1280), height: Math.round(cfg.h || 720),
    transparent: !!cfg.transparent, backgroundColor: cfg.transparent ? '#00000000' : '#ffffff',
    webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, partition: 'persist:nova-web' }
  });
  const wc = w.webContents;
  wc.setFrameRate(Math.max(1, Math.min(60, Number(cfg.fps) || 30)));
  wc.setAudioMuted(!cfg.audio);
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('paint', (ev, dirty, image) => { const sz = image.getSize(); sendWeb('web-frame', id, sz.width, sz.height, image.toBitmap()); });
  wc.on('did-fail-load', (ev, code, desc, url, isMain) => { if (isMain && code !== -3) sendWeb('web-event', id, 'fail', desc); });
  wc.on('page-title-updated', (ev, title) => sendWeb('web-event', id, 'title', title));
  wc.on('did-finish-load', () => {
    if (cfg.transparent) wc.insertCSS('html, body { background-color: rgba(0,0,0,0) !important; margin: 0; overflow: hidden; }').catch(() => { });
    if (cfg.css) wc.insertCSS(String(cfg.css)).catch(() => { });
  });
  w.loadURL(cfg.url).catch(() => { });
  webSources.set(id, w);
  return true;
});
ipcMain.handle('web-close', (e, id) => { const w = webSources.get(id); webSources.delete(id); if (w && !w.isDestroyed()) w.destroy(); return true; });
ipcMain.handle('web-reload', (e, id) => { const w = webSources.get(id); if (w && !w.isDestroyed()) w.webContents.reloadIgnoringCache(); return true; });

// ---------- Güncelleme ----------
let updaterWired = false;
function wireUpdater() {
  if (updaterWired || !autoUpdater) return;
  updaterWired = true;
  const send = (st, d) => { if (win && !win.isDestroyed()) win.webContents.send('update-status', st, d || {}); };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => send('checking'));
  autoUpdater.on('update-available', (i) => send('available', { version: i.version }));
  autoUpdater.on('update-not-available', () => send('none', { version: app.getVersion() }));
  autoUpdater.on('download-progress', (p) => send('progress', { percent: Math.round(p.percent || 0), speed: p.bytesPerSecond }));
  autoUpdater.on('update-downloaded', (i) => { updateReady = true; send('ready', { version: i.version }); });
  autoUpdater.on('error', (err) => send('error', { message: String((err && err.message) || err).split('\n')[0] }));
}
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('update-check', async () => {
  if (!autoUpdater) return { ok: false, reason: 'Güncelleyici bu kurulumda yok.' };
  if (!app.isPackaged) return { ok: false, reason: 'Geliştirme modunda güncelleme denetlenmez.' };
  wireUpdater();
  try { await autoUpdater.checkForUpdates(); return { ok: true }; } catch (e) { return { ok: false, reason: String(e.message || e).split('\n')[0] }; }
});
ipcMain.handle('update-install', () => {
  if (!updateReady) return false;
  if (outputs.stream || outputs.record) return false; // yayın/kayıt sırasında kapatma
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return true;
});

ipcMain.handle('save-snapshot', async (e, dir, dataUrl) => {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `NOVA_Foto_${stamp()}.png`);
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return file;
});

ipcMain.handle('settings-load', () => {
  try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return null; }
});
ipcMain.handle('settings-save', (e, obj) => { fs.writeFileSync(settingsFile(), JSON.stringify(obj, null, 2)); return true; });
function settingsFile() { return path.join(app.getPath('userData'), 'ayarlar.json'); }

// ---------- Çıkışlar (yayın + kayıt) ----------
// Arayüz program görüntüsünü WebM parçaları halinde gönderir, ffmpeg bunları
// RTMP'ye (yayın) veya MP4/MKV dosyasına (kayıt) çevirir.
ipcMain.handle('output-start', (e, kind, cfg) => {
  if (outputs[kind]) return { ok: false, error: 'Zaten çalışıyor' };
  let args, file = null;
  if (kind === 'stream') {
    args = ffArgs.streamArgs(cfg);
    if (!args) return { ok: false, error: 'Aktif yayın hedefi yok (URL ve anahtar girin).' };
  } else {
    fs.mkdirSync(cfg.folder, { recursive: true });
    file = path.join(cfg.folder, `NOVA_Kayit_${stamp()}.${cfg.format || 'mp4'}`);
    args = ffArgs.recordArgs(cfg, file);
  }
  const bin = ffmpegPath();
  let proc;
  try {
    proc = spawn(bin, args, { windowsHide: true });
  } catch (err) {
    return { ok: false, error: 'ffmpeg başlatılamadı: ' + err.message };
  }
  const out = { proc, file, log: '', started: Date.now() };
  outputs[kind] = out;
  proc.stdin.on('error', () => {});
  proc.stderr.on('data', (d) => {
    const s = d.toString();
    out.log = (out.log + s).slice(-6000);
    const m = /fps=\s*([\d.]+).*?bitrate=\s*([\d.]+\s*\w+\/s|N\/A).*?speed=\s*([\d.]+x|N\/A)/s.exec(s);
    if (m && win) win.webContents.send('output-stats', kind, { fps: m[1], bitrate: m[2], speed: m[3] });
  });
  proc.on('error', (err) => {
    if (win) win.webContents.send('output-ended', kind, { code: -1, error: 'ffmpeg bulunamadı veya çalışmadı: ' + err.message });
    delete outputs[kind];
  });
  proc.on('close', (code) => {
    if (outputs[kind] !== out) return;
    delete outputs[kind];
    const tail = out.log.split(/\r?\n/).filter(Boolean).slice(-4).join('\n');
    if (win) win.webContents.send('output-ended', kind, { code, file, error: code ? tail : null });
  });
  return { ok: true, file };
});

ipcMain.on('output-chunk', (e, kind, buf) => {
  const o = outputs[kind];
  if (o && o.proc.stdin.writable) o.proc.stdin.write(Buffer.from(buf));
});

ipcMain.handle('output-stop', (e, kind) => { stopOutput(kind); return true; });

function stopOutput(kind) {
  const o = outputs[kind];
  if (!o) return;
  try { o.proc.stdin.end(); } catch { }
  // ffmpeg dosyayı düzgün kapatsın; takılırsa öldür
  setTimeout(() => { try { if (!o.proc.killed && o.proc.exitCode === null) o.proc.kill('SIGKILL'); } catch { } }, 8000);
}

function stamp() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}
