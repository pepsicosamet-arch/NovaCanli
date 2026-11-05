// Sanal stüdyo arka planları (hareketli). Sabit kısım bir kere önbelleğe çizilir,
// her karede sadece hareketli kısım çizilir.
const STUDIO_STYLES = {
  haber: { name: 'Haber Stüdyosu', accent: '#ff2d4b', label: 'NOVA HABER' },
  talk: { name: 'Talk Show', accent: '#ff9f43', label: 'NOVA SHOW' },
  neon: { name: 'Oyun / Neon', accent: '#ff2dd4', label: 'NOVA GAMING' },
  tekno: { name: 'Teknoloji', accent: '#00e5ff', label: 'NOVA TECH' },
  podcast: { name: 'Podcast Odası', accent: '#ff2d4b', label: 'ON AIR' },
  spor: { name: 'Spor / Stadyum', accent: '#19c37d', label: 'NOVA SPOR' },
  konser: { name: 'Konser Sahnesi', accent: '#7b3cff', label: 'NOVA MÜZİK' },
  dalga: { name: 'Modern Dalgalar', accent: '#4c8dff', label: '' },
  bokeh: { name: 'Işık Parçacıkları', accent: '#ffb020', label: '' },
  uzay: { name: 'Uzay', accent: '#7b8cff', label: '' },
  kurumsal: { name: 'Kurumsal', accent: '#1e5bd8', label: 'NOVA' }
};

const StudioRenderer = {
  font(size, w = 800) { return `${w} ${Math.round(size)}px "Segoe UI", Inter, Arial, sans-serif`; },
  rgba(hex, a) { const n = parseInt(String(hex).replace('#', ''), 16) || 0; return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; },

  render(canvas, inp, W, H, tSec) {
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const o = inp.studio, st = o.style in STUDIO_STYLES ? o.style : 'haber';
    const key = `${st}|${o.accent}|${o.label}|${W}x${H}`;
    if (!inp._stCache || inp._stKey !== key) {
      inp._stCache = inp._stCache || document.createElement('canvas');
      inp._stCache.width = W; inp._stCache.height = H; inp._stKey = key;
      const sc = inp._stCache.getContext('2d'); sc.clearRect(0, 0, W, H);
      this.S[st].bg?.call(this, sc, W, H, o, Math.min(W / 1920, H / 1080));
    }
    const c = canvas.getContext('2d');
    c.save();
    c.drawImage(inp._stCache, 0, 0);
    this.S[st].anim?.call(this, c, W, H, tSec * (o.speed ?? 1), o, Math.min(W / 1920, H / 1080));
    c.restore();
  },

  S: {
    haber: {
      bg(c, W, H, o, s) {
        const g = c.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.4, W * 0.75);
        g.addColorStop(0, '#173a7a'); g.addColorStop(0.55, '#0a1a3d'); g.addColorStop(1, '#040814');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        // video duvarı
        const panel = (x, y, w, h) => {
          const pg = c.createLinearGradient(x, y, x + w, y + h); pg.addColorStop(0, '#0f2a5c'); pg.addColorStop(1, '#09152e');
          c.fillStyle = pg; c.beginPath(); c.roundRect(x, y, w, h, 10 * s); c.fill();
          c.strokeStyle = 'rgba(120,170,255,0.35)'; c.lineWidth = 3 * s; c.stroke();
        };
        panel(W * 0.08, H * 0.1, W * 0.26, H * 0.4); panel(W * 0.37, H * 0.06, W * 0.26, H * 0.48); panel(W * 0.66, H * 0.1, W * 0.26, H * 0.4);
        // zemin yansıması
        c.fillStyle = '#050b1c'; c.fillRect(0, H * 0.62, W, H * 0.38);
        c.strokeStyle = 'rgba(90,140,255,0.15)'; c.lineWidth = 2 * s;
        for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(W / 2 + i * 40 * s, H * 0.62); c.lineTo(W / 2 + i * 220 * s, H); c.stroke(); }
        // masa
        const dy = H * 0.74;
        const dg = c.createLinearGradient(0, dy, 0, H); dg.addColorStop(0, '#1d2a4a'); dg.addColorStop(1, '#0b1226');
        c.fillStyle = dg; c.beginPath(); c.moveTo(W * 0.18, dy); c.quadraticCurveTo(W / 2, dy - 40 * s, W * 0.82, dy); c.lineTo(W * 0.88, H); c.lineTo(W * 0.12, H); c.closePath(); c.fill();
        c.fillStyle = o.accent; c.fillRect(W * 0.2, dy + 60 * s, W * 0.6, 8 * s);
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(W * 0.18, dy); c.quadraticCurveTo(W / 2, dy - 40 * s, W * 0.82, dy); c.lineTo(W * 0.82, dy + 6 * s); c.quadraticCurveTo(W / 2, dy - 34 * s, W * 0.18, dy + 6 * s); c.fill();
        if (o.label) { c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = this.font(58 * s, 900); c.fillText(o.label, W / 2, dy + 140 * s); }
      },
      anim(c, W, H, t, o, s) {
        // ortadaki ekranda dönen dünya
        const cx = W / 2, cy = H * 0.3, r = H * 0.17;
        c.strokeStyle = this.rgba(o.accent, 0.55); c.lineWidth = 2 * s;
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 6; i++) {
          const a = ((t * 0.4 + i / 6) % 1) * Math.PI;
          c.beginPath(); c.ellipse(cx, cy, Math.abs(Math.cos(a)) * r, r, 0, 0, Math.PI * 2); c.stroke();
        }
        for (let i = 1; i < 4; i++) { const yy = cy - r + (2 * r * i) / 4, ww = Math.sqrt(r * r - (yy - cy) ** 2); c.beginPath(); c.moveTo(cx - ww, yy); c.lineTo(cx + ww, yy); c.stroke(); }
        // yan ekranlarda veri çubukları
        for (const px of [W * 0.08, W * 0.66]) {
          for (let i = 0; i < 8; i++) {
            const bh = (0.3 + 0.6 * Math.abs(Math.sin(t * 0.8 + i * 0.7 + px))) * H * 0.22;
            c.fillStyle = i % 3 === 0 ? this.rgba(o.accent, 0.8) : 'rgba(110,160,255,0.55)';
            c.fillRect(px + W * 0.03 + i * W * 0.026, H * 0.44 - bh, W * 0.016, bh);
          }
        }
        // ışık süpürmesi
        const sx = ((t * 0.15) % 1.4 - 0.2) * W;
        const lg = c.createLinearGradient(sx - 200 * s, 0, sx + 200 * s, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(160,200,255,0.08)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = lg; c.fillRect(0, 0, W, H * 0.62);
      }
    },
    talk: {
      bg(c, W, H, o, s) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b1240'); g.addColorStop(0.6, '#5a2340'); g.addColorStop(1, '#1a0b18');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        for (let i = 0; i < 26; i++) { // ahşap çıtalar
          const x = i * W / 26; c.fillStyle = i % 2 ? 'rgba(255,190,120,0.05)' : 'rgba(0,0,0,0.12)'; c.fillRect(x, 0, W / 52, H * 0.66);
        }
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, H * 0.66, W, H);
        const fg = c.createRadialGradient(W / 2, H * 0.86, 10, W / 2, H * 0.86, W * 0.5);
        fg.addColorStop(0, this.rgba(o.accent, 0.35)); fg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = fg; c.beginPath(); c.ellipse(W / 2, H * 0.86, W * 0.46, H * 0.12, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = this.rgba(o.accent, 0.7); c.lineWidth = 4 * s; c.beginPath(); c.ellipse(W / 2, H * 0.86, W * 0.46, H * 0.12, 0, 0, Math.PI * 2); c.stroke();
        if (o.label) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = this.font(90 * s, 900); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillText(o.label, W / 2, H * 0.2); }
      },
      anim(c, W, H, t, o, s) {
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const bx = W * (0.15 + i * 0.233), ang = Math.sin(t * 0.5 + i * 1.3) * 0.35;
          c.save(); c.translate(bx, -20 * s); c.rotate(ang);
          const g = c.createLinearGradient(0, 0, 0, H * 0.95); g.addColorStop(0, 'rgba(255,230,190,0.32)'); g.addColorStop(1, 'rgba(255,230,190,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(-20 * s, 0); c.lineTo(20 * s, 0); c.lineTo(220 * s, H * 0.95); c.lineTo(-220 * s, H * 0.95); c.closePath(); c.fill();
          c.restore();
        }
        for (let i = 0; i < 18; i++) {
          const x = (W * ((i * 0.137 + t * 0.01 * (1 + i % 3)) % 1)), y = H * (0.1 + 0.5 * ((i * 0.311) % 1)) + Math.sin(t + i) * 20 * s, r = (20 + (i % 5) * 12) * s;
          const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, this.rgba(o.accent, 0.25)); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
        c.globalCompositeOperation = 'source-over';
      }
    },
    neon: {
      bg(c, W, H, o, s) {
        const g = c.createLinearGradient(0, 0, 0, H * 0.55); g.addColorStop(0, '#07021a'); g.addColorStop(1, '#3a0a4f');
        c.fillStyle = g; c.fillRect(0, 0, W, H * 0.55);
        let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
        c.fillStyle = '#fff'; for (let i = 0; i < 160; i++) { c.globalAlpha = 0.3 + rnd() * 0.6; c.fillRect(rnd() * W, rnd() * H * 0.5, 2 * s, 2 * s); }
        c.globalAlpha = 1;
        const cx = W / 2, cy = H * 0.4, R = H * 0.23;
        c.save(); c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
        const sg = c.createLinearGradient(0, cy - R, 0, cy + R); sg.addColorStop(0, '#ffe14d'); sg.addColorStop(1, o.accent);
        c.fillStyle = sg; c.fillRect(cx - R, cy - R, R * 2, R * 2);
        c.fillStyle = '#3a0a4f'; for (let i = 0; i < 7; i++) c.fillRect(cx - R, cy + R * 0.1 + i * R * 0.13, R * 2, (4 + i * 2) * s);
        c.restore();
        c.fillStyle = '#12051f'; c.beginPath(); c.moveTo(0, H * 0.55);
        for (let i = 0; i <= W; i += 20 * s) c.lineTo(i, H * 0.55 - Math.abs(Math.sin(i / s * 0.013) * 70 + Math.sin(i / s * 0.031) * 30) * s);
        c.lineTo(W, H * 0.55); c.fill();
        c.fillStyle = '#0a0214'; c.fillRect(0, H * 0.55, W, H * 0.45);
        if (o.label) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = this.font(70 * s, 900); c.shadowColor = o.accent; c.shadowBlur = 30 * s; c.fillStyle = '#fff'; c.fillText(o.label, W / 2, H * 0.12); c.shadowBlur = 0; }
      },
      anim(c, W, H, t, o, s) {
        const hz = H * 0.55; c.strokeStyle = o.accent; c.lineWidth = 2 * s;
        c.beginPath(); for (let i = -20; i <= 20; i++) { c.moveTo(W / 2 + i * 30 * s, hz); c.lineTo(W / 2 + i * 260 * s, H); } c.stroke();
        for (let k = 0; k < 14; k++) { const z = (k + (t * 1.4) % 1) / 14, y = hz + Math.pow(z, 2.2) * (H - hz); c.globalAlpha = Math.min(1, z * 3); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.globalAlpha = 1;
      }
    },
    tekno: {
      bg(c, W, H, o, s) {
        const g = c.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, W * 0.7); g.addColorStop(0, '#0c2238'); g.addColorStop(1, '#03070d');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        let r = 3; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
        c.strokeStyle = this.rgba(o.accent, 0.18); c.lineWidth = 2 * s;
        for (let i = 0; i < 40; i++) { // devre yolları
          let x = rnd() * W, y = rnd() * H; c.beginPath(); c.moveTo(x, y);
          for (let j = 0; j < 4; j++) { if (rnd() > 0.5) x += (rnd() - 0.5) * 300 * s; else y += (rnd() - 0.5) * 300 * s; c.lineTo(x, y); }
          c.stroke(); c.fillStyle = this.rgba(o.accent, 0.35); c.beginPath(); c.arc(x, y, 4 * s, 0, 7); c.fill();
        }
        if (o.label) { c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = this.font(44 * s, 900); c.fillStyle = this.rgba(o.accent, 0.8); c.fillText(o.label, 70 * s, 80 * s); }
      },
      anim(c, W, H, t, o, s) {
        const cx = W * 0.72, cy = H * 0.45;
        c.strokeStyle = this.rgba(o.accent, 0.5); c.lineWidth = 3 * s;
        for (let i = 0; i < 4; i++) {
          const r = (120 + i * 70) * s, a0 = t * (i % 2 ? -0.5 : 0.4) + i;
          c.beginPath(); c.arc(cx, cy, r, a0, a0 + Math.PI * (0.6 + i * 0.25)); c.stroke();
          c.beginPath(); c.arc(cx, cy, r, a0 + Math.PI, a0 + Math.PI * (1.3 + i * 0.1)); c.stroke();
        }
        c.fillStyle = this.rgba(o.accent, 0.9); c.beginPath(); c.arc(cx, cy, (30 + 8 * Math.sin(t * 3)) * s, 0, 7); c.fill();
        const step = 90 * s, off = (t * 40 * s) % step; c.strokeStyle = this.rgba(o.accent, 0.06); c.lineWidth = 1;
        c.beginPath(); for (let x = -off; x < W; x += step) { c.moveTo(x, 0); c.lineTo(x, H); } for (let y = -off; y < H; y += step) { c.moveTo(0, y); c.lineTo(W, y); } c.stroke();
        for (let i = 0; i < 12; i++) { const p = (t * 0.3 + i / 12) % 1; c.fillStyle = this.rgba(o.accent, 1 - p); c.fillRect(W * ((i * 0.083) % 1), H * p, 3 * s, 30 * s); }
      }
    },
    podcast: {
      bg(c, W, H, o, s) {
        c.fillStyle = '#16121a'; c.fillRect(0, 0, W, H);
        const sz = 90 * s; // akustik sünger paneller
        for (let y = 0; y < H * 0.7; y += sz) for (let x = 0; x < W; x += sz) {
          const g = c.createLinearGradient(x, y, x + sz, y + sz); g.addColorStop(0, '#2a2230'); g.addColorStop(1, '#140f18');
          c.fillStyle = g; c.beginPath(); c.roundRect(x + 4 * s, y + 4 * s, sz - 8 * s, sz - 8 * s, 10 * s); c.fill();
        }
        c.fillStyle = '#2a1c14'; c.fillRect(0, H * 0.7, W, H * 0.3);
        c.fillStyle = '#3a281c'; c.fillRect(0, H * 0.7, W, 14 * s);
        const lamp = c.createRadialGradient(W * 0.15, H * 0.55, 10, W * 0.15, H * 0.55, 500 * s); lamp.addColorStop(0, 'rgba(255,170,80,0.35)'); lamp.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = lamp; c.fillRect(0, 0, W, H);
      },
      anim(c, W, H, t, o, s) {
        if (!o.label) return;
        const fl = Math.sin(t * 23) > 0.96 ? 0.35 : 1;
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = this.font(110 * s, 900);
        c.lineWidth = 6 * s; c.strokeStyle = o.accent; c.shadowColor = o.accent; c.shadowBlur = 40 * s * fl; c.globalAlpha = fl;
        c.beginPath(); c.roundRect(W * 0.62 - 260 * s, H * 0.18 - 90 * s, 520 * s, 180 * s, 30 * s); c.stroke();
        c.fillStyle = '#fff'; c.fillText(o.label, W * 0.62, H * 0.18 + 4 * s);
        c.shadowBlur = 0; c.globalAlpha = 1;
      }
    },
    spor: {
      bg(c, W, H, o, s) {
        const g = c.createLinearGradient(0, 0, 0, H * 0.4); g.addColorStop(0, '#050a18'); g.addColorStop(1, '#142a4a');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        let r = 11; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
        c.fillStyle = '#0c1424'; c.beginPath(); c.moveTo(0, H * 0.25); c.quadraticCurveTo(W / 2, H * 0.12, W, H * 0.25); c.lineTo(W, H * 0.48); c.lineTo(0, H * 0.48); c.fill();
        for (let i = 0; i < 1400; i++) { const x = rnd() * W, y = H * (0.22 + rnd() * 0.25); c.fillStyle = `hsla(${rnd() * 360},50%,${40 + rnd() * 30}%,0.6)`; c.fillRect(x, y, 3 * s, 3 * s); }
        const py = H * 0.48;
        for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#1f7a3a' : '#238a42'; const y0 = py + (H - py) * Math.pow(i / 10, 1.6), y1 = py + (H - py) * Math.pow((i + 1) / 10, 1.6); c.fillRect(0, y0, W, y1 - y0); }
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 4 * s;
        c.beginPath(); c.moveTo(W * 0.1, H * 0.98); c.lineTo(W * 0.3, py + 10 * s); c.lineTo(W * 0.7, py + 10 * s); c.lineTo(W * 0.9, H * 0.98); c.stroke();
        c.beginPath(); c.ellipse(W / 2, H * 0.72, W * 0.12, H * 0.06, 0, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(W * 0.2, H * 0.72); c.lineTo(W * 0.8, H * 0.72); c.stroke();
        if (o.label) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = this.font(60 * s, 900); c.fillStyle = '#fff'; c.fillText(o.label, W / 2, H * 0.08); c.fillStyle = o.accent; c.fillRect(W / 2 - 100 * s, H * 0.08 + 42 * s, 200 * s, 6 * s); }
      },
      anim(c, W, H, t, o, s) {
        c.globalCompositeOperation = 'lighter';
        for (const fx of [0.08, 0.92]) {
          const x = W * fx, y = H * 0.06, a = 0.55 + 0.15 * Math.sin(t * 2 + fx * 9);
          const g = c.createRadialGradient(x, y, 0, x, y, 300 * s); g.addColorStop(0, `rgba(255,255,240,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.fillRect(x - 300 * s, y - 300 * s, 600 * s, 600 * s);
        }
        for (let i = 0; i < 14; i++) { // seyirci flaşları
          const ph = (t * 1.7 + i * 0.37) % 1; if (ph > 0.12) continue;
          const x = W * ((i * 0.618 + Math.floor(t * 1.7 + i * 0.37) * 0.13) % 1), y = H * (0.25 + ((i * 0.41) % 1) * 0.2);
          c.fillStyle = `rgba(255,255,255,${1 - ph / 0.12})`; c.beginPath(); c.arc(x, y, 5 * s, 0, 7); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      }
    },
    konser: {
      bg(c, W, H, o, s) {
        c.fillStyle = '#05030a'; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#2a2a33'; c.lineWidth = 10 * s; c.beginPath(); c.moveTo(0, H * 0.08); c.lineTo(W, H * 0.08); c.stroke(); // truss
        c.lineWidth = 3 * s; c.beginPath(); for (let x = 0; x < W; x += 40 * s) { c.moveTo(x, H * 0.06); c.lineTo(x + 20 * s, H * 0.1); c.lineTo(x + 40 * s, H * 0.06); } c.stroke();
        c.fillStyle = '#0d0a14'; c.fillRect(0, H * 0.78, W, H * 0.22);
        c.fillStyle = '#000'; c.beginPath(); for (let x = 0; x < W; x += 34 * s) { const hh = (40 + ((x * 7) % 50)) * s; c.ellipse(x, H, 26 * s, hh, 0, Math.PI, 0); } c.fill(); // kalabalık
        if (o.label) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = this.font(80 * s, 900); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillText(o.label, W / 2, H * 0.45); }
      },
      anim(c, W, H, t, o, s) {
        const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2)), 8);
        c.globalCompositeOperation = 'lighter';
        const cols = [o.accent, '#ff2d4b', '#00e5ff'];
        for (let j = 0; j < 3; j++) {
          const ox = W * (0.25 + j * 0.25), oy = H * 0.09;
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 2 + Math.sin(t * (0.7 + j * 0.2) + i * 0.5) * 0.9;
            c.strokeStyle = this.rgba(cols[j], 0.35 + 0.3 * beat); c.lineWidth = (2 + 3 * beat) * s;
            c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * H * 1.2, oy + Math.sin(a) * H * 1.2); c.stroke();
          }
          const g = c.createRadialGradient(ox, oy, 0, ox, oy, 80 * s); g.addColorStop(0, this.rgba(cols[j], 0.9)); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.fillRect(ox - 80 * s, oy - 80 * s, 160 * s, 160 * s);
        }
        c.fillStyle = this.rgba(o.accent, 0.12 * beat); c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'source-over';
      }
    },
    dalga: {
      bg(c, W, H, o) { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#060a1a'); g.addColorStop(1, '#141032'); c.fillStyle = g; c.fillRect(0, 0, W, H); },
      anim(c, W, H, t, o, s) {
        const cols = [o.accent, '#7b3cff', '#ff2d4b', '#00d4b4'];
        for (let i = 0; i < 4; i++) {
          const base = H * (0.5 + i * 0.1), amp = (60 + i * 18) * s, f = 0.0022 / s * (1 + i * 0.3);
          const g = c.createLinearGradient(0, base - amp, 0, H); g.addColorStop(0, this.rgba(cols[i], 0.55 - i * 0.08)); g.addColorStop(1, this.rgba(cols[i], 0));
          c.fillStyle = g; c.beginPath(); c.moveTo(0, H);
          for (let x = 0; x <= W; x += 12 * s) c.lineTo(x, base + Math.sin(x * f + t * (0.6 + i * 0.25) + i) * amp + Math.sin(x * f * 2.3 - t * 0.4) * amp * 0.3);
          c.lineTo(W, H); c.closePath(); c.fill();
        }
      }
    },
    bokeh: {
      bg(c, W, H) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120a06'); g.addColorStop(1, '#05060c'); c.fillStyle = g; c.fillRect(0, 0, W, H); },
      anim(c, W, H, t, o, s) {
        c.globalCompositeOperation = 'lighter';
        const cols = [o.accent, '#ff5ea8', '#ffd23f', '#4c8dff'];
        for (let i = 0; i < 38; i++) {
          const sp = 0.015 + (i % 7) * 0.004;
          const x = W * ((i * 0.6180339 + t * sp) % 1), y = H * ((i * 0.381966 + Math.sin(t * 0.2 + i) * 0.05 + 1) % 1), r = (30 + (i * 13) % 90) * s;
          const g = c.createRadialGradient(x, y, 0, x, y, r); const col = cols[i % 4];
          g.addColorStop(0, this.rgba(col, 0.28)); g.addColorStop(0.7, this.rgba(col, 0.12)); g.addColorStop(1, this.rgba(col, 0));
          c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
        c.globalCompositeOperation = 'source-over';
      }
    },
    uzay: {
      bg(c, W, H, o, s) {
        c.fillStyle = '#02030a'; c.fillRect(0, 0, W, H);
        for (const [x, y, r, col] of [[0.25, 0.35, 0.45, '#3a1f7a'], [0.75, 0.6, 0.4, '#0b3a6a'], [0.55, 0.25, 0.3, '#6a1f4a']]) {
          const g = c.createRadialGradient(W * x, H * y, 0, W * x, H * y, W * r); g.addColorStop(0, this.rgba(col, 0.55)); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.fillRect(0, 0, W, H);
        }
      },
      anim(c, W, H, t, o, s) {
        const cx = W / 2, cy = H / 2; c.fillStyle = '#fff';
        for (let i = 0; i < 260; i++) {
          const a = i * 2.39996, d0 = (i * 0.618034) % 1, z = (d0 + t * 0.08) % 1;
          const r = Math.pow(z, 2.2) * W * 0.75, sz = (0.5 + z * 3) * s;
          c.globalAlpha = Math.min(1, z * 2);
          c.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, sz, sz);
        }
        c.globalAlpha = 1;
      }
    },
    kurumsal: {
      bg(c, W, H, o, s) {
        const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f4f6fb'); g.addColorStop(1, '#dfe5f1');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.fillStyle = this.rgba(o.accent, 0.08); c.beginPath(); c.arc(W * 0.88, H * 0.1, H * 0.5, 0, 7); c.fill();
        c.fillStyle = this.rgba(o.accent, 0.12); c.beginPath(); c.moveTo(0, H); c.lineTo(W * 0.45, H); c.lineTo(0, H * 0.45); c.fill();
        if (o.label) { c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = this.font(46 * s, 900); c.fillStyle = o.accent; c.fillText(o.label, 70 * s, 80 * s); }
      },
      anim(c, W, H, t, o, s) {
        c.lineWidth = 3 * s;
        for (let i = 0; i < 9; i++) {
          const x = W * (0.1 + ((i * 0.37) % 0.85)), y = H * (0.15 + ((i * 0.53) % 0.75)) + Math.sin(t * 0.5 + i) * 25 * s, r = (20 + (i % 4) * 14) * s;
          c.strokeStyle = this.rgba(o.accent, 0.25); c.save(); c.translate(x, y); c.rotate(t * 0.2 * (i % 2 ? 1 : -1));
          c.beginPath(); if (i % 3 === 0) c.arc(0, 0, r, 0, 7); else if (i % 3 === 1) c.rect(-r, -r, r * 2, r * 2); else { c.moveTo(0, -r); c.lineTo(r, r); c.lineTo(-r, r); c.closePath(); }
          c.stroke(); c.restore();
        }
      }
    }
  }
};

// Çoklu görüntü (sahne) hazır yerleşimleri — yüzde cinsinden [x, y, w, h]
const SCENE_PRESETS = {
  pip_sag: { name: 'Resim içinde resim (sağ alt)', cells: [[0, 0, 100, 100], [66, 63, 30, 30]] },
  pip_sol: { name: 'Resim içinde resim (sol alt)', cells: [[0, 0, 100, 100], [4, 63, 30, 30]] },
  yanyana: { name: 'Yan yana (2)', cells: [[2, 25.5, 47, 47], [51, 25.5, 47, 47]] },
  izgara: { name: '2x2 ızgara (4)', cells: [[1, 1, 48.5, 48.5], [50.5, 1, 48.5, 48.5], [1, 50.5, 48.5, 48.5], [50.5, 50.5, 48.5, 48.5]] },
  bir_iki: { name: '1 büyük + 2 küçük', cells: [[2, 16, 64, 64], [68, 16, 30, 30], [68, 50, 30, 30]] },
  uclu: { name: 'Üçlü sıra', cells: [[1.5, 32, 31.5, 31.5], [34.25, 32, 31.5, 31.5], [67, 32, 31.5, 31.5]] },
  haber: { name: 'Haber (spiker + ekran)', cells: [[4, 10, 52, 52], [60, 14, 36, 36]] },
  roportaj: { name: 'Röportaj (2 kişi, stüdyo önünde)', cells: [[5, 18, 43, 43], [52, 18, 43, 43]] },
  oyun: { name: 'Oyun yayını (oyun + yüz kamerası)', cells: [[0, 0, 100, 100], [72, 4, 25, 25]] }
};
