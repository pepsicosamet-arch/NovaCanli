// Hazır stinger geçiş animasyonları. Her biri kesme noktasında (varsayılan %50) ekranı tamamen kapatır;
// program o anda önizlemedeki kaynağa geçer.
const STINGER_LOGO = new Image(); STINGER_LOGO.src = 'img/icon.png';

const STINGER_STYLES = {
  serit: { name: 'Çapraz Şerit' },
  logo: { name: 'Logo Patlaması' },
  perde: { name: 'Perde (dikey çubuklar)' },
  murekkep: { name: 'Mürekkep Damlası' },
  kare: { name: 'Kare Mozaik' },
  isik: { name: 'Işık Patlaması' },
  kaydir: { name: 'Hızlı Kaydırma' }
};

const Stinger = {
  clamp(v) { return Math.min(1, Math.max(0, v)); },
  io(t) { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  shade(hex, f) { const n = parseInt(String(hex).replace('#', ''), 16) || 0; const ch = (x) => Math.round(Math.min(255, Math.max(0, x * f))); return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`; },

  // p: 0..1 ilerleme, cut: kesme noktası (0..1)
  draw(c, W, H, style, p, color, cut = 0.5) {
    // p'yi kesme noktası 0.5'e gelecek şekilde yeniden ölçekle
    const q = p < cut ? (p / cut) * 0.5 : 0.5 + ((p - cut) / (1 - cut)) * 0.5;
    c.save();
    (this.S[style] || this.S.serit).call(this, c, W, H, q, color || '#ff2d4b');
    c.restore();
  },

  S: {
    serit(c, W, H, p, col) {
      // ana şerit tam p=0.5'te ekranın ortasında (ekranı kapatır), ince şeritler önden gider
      const bands = [{ d: 0, w: 1.55, f: col }, { d: 0.05, w: 0.16, f: '#ffffff' }, { d: 0.085, w: 0.08, f: this.shade(col, 0.55) }];
      bands.forEach(b => {
        const t = this.io(this.clamp(p + b.d));
        const Wb = W * b.w, cx = -Wb + (W + 2 * Wb) * t;
        c.save(); c.translate(cx, H / 2); c.rotate(-0.32); c.fillStyle = b.f; c.fillRect(-Wb / 2, -H * 1.6, Wb, H * 3.2); c.restore();
      });
    },
    logo(c, W, H, p, col) {
      const R = Math.hypot(W, H) * 0.58;
      const r = p < 0.5 ? R * this.io(this.clamp(p / 0.45)) : R * (1 - this.io(this.clamp((p - 0.55) / 0.45)));
      c.fillStyle = this.shade(col, 0.6); c.beginPath(); c.arc(W / 2, H / 2, Math.max(0, r * 1.06), 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(W / 2, H / 2, Math.max(0, r), 0, Math.PI * 2); c.fill();
      const k = Math.sin(this.clamp((p - 0.2) / 0.6) * Math.PI);
      if (k > 0 && STINGER_LOGO.complete && STINGER_LOGO.naturalWidth) {
        const s = H * 0.36 * k; c.save(); c.translate(W / 2, H / 2); c.rotate((1 - k) * (p < 0.5 ? -0.6 : 0.6));
        c.globalAlpha = k; c.drawImage(STINGER_LOGO, -s / 2, -s / 2, s, s); c.restore();
      }
    },
    perde(c, W, H, p, col) {
      const N = 10, bw = W / N;
      for (let i = 0; i < N; i++) {
        c.fillStyle = i % 2 ? col : this.shade(col, 0.75);
        if (p <= 0.5) { const q = this.io(this.clamp((p - i * 0.02) / (0.5 - (N - 1) * 0.02))); c.fillRect(i * bw - 1, 0, bw + 2, H * q); }
        else { const q = this.io(this.clamp((p - 0.5 - i * 0.02) / (0.5 - (N - 1) * 0.02))); c.fillRect(i * bw - 1, H * q, bw + 2, H); }
      }
    },
    murekkep(c, W, H, p, col) {
      const pts = [[0.2, 0.3], [0.8, 0.25], [0.5, 0.6], [0.15, 0.85], [0.85, 0.8], [0.5, 0.1]];
      const R = Math.hypot(W, H);
      c.globalAlpha = p <= 0.5 ? 1 : 1 - this.io((p - 0.5) / 0.5);
      pts.forEach(([x, y], i) => {
        const r = R * 0.7 * this.io(this.clamp((Math.min(p, 0.5) - i * 0.03) / (0.5 - 5 * 0.03)));
        c.fillStyle = i % 2 ? col : this.shade(col, 0.7); c.beginPath(); c.arc(W * x, H * y, r, 0, Math.PI * 2); c.fill();
      });
      c.fillStyle = col; c.fillRect(0, 0, W, H * (p >= 0.49 && p <= 0.51 ? 1 : 0));
    },
    kare(c, W, H, p, col) {
      const cols = 10, rows = Math.ceil(cols * H / W), tw = W / cols, th = H / rows, maxd = cols + rows;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const d = (x + y) / maxd * 0.18;
        const s = p <= 0.5 ? this.io(this.clamp((p - d) / (0.5 - 0.18))) : 1 - this.io(this.clamp((p - 0.5 - d) / (0.5 - 0.18)));
        if (s <= 0) continue;
        c.fillStyle = (x + y) % 2 ? col : this.shade(col, 0.7);
        c.fillRect(x * tw + tw / 2 * (1 - s) - 0.5, y * th + th / 2 * (1 - s) - 0.5, tw * s + 1, th * s + 1);
      }
    },
    isik(c, W, H, p, col) {
      const a = 1 - Math.abs(p - 0.5) * 2;
      const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      g.addColorStop(0, col); g.addColorStop(0.35 * (0.3 + a), col); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalAlpha = this.clamp(a * 1.6);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (p > 0.47 && p < 0.53) { c.globalAlpha = 1; c.fillStyle = col; c.fillRect(0, 0, W, H); }
      c.globalAlpha = this.clamp(a * 1.4); c.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) { const y = H * (0.2 + i * 0.12), len = W * a * (0.6 + 0.4 * Math.sin(i * 2)); c.fillRect(W / 2 - len / 2, y, len, 3); }
    },
    kaydir(c, W, H, p, col) {
      // 1.4W genişliğinde panel, p=0.5'te ekranın ortasında (tam kapatır)
      const t = this.io(p), cx = -W * 0.8 + t * W * 2.6, x = cx - W * 0.7;
      c.fillStyle = this.shade(col, 0.6); c.fillRect(x - W * 0.2, 0, W * 0.25, H);
      c.fillStyle = col; c.fillRect(x, 0, W * 1.4, H);
      c.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 5; i++) c.fillRect(x + W * 1.4 + i * 40, H * (0.1 + i * 0.18), 120 + i * 30, 6);
    }
  }
};
