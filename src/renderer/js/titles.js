// Grafik / alt yazı şablonları (vMix GT Title benzeri)
const TITLE_TEMPLATES = {
  altbant: { name: 'Alt Bant (klasik)', fields: ['line1', 'line2'], defaults: { line1: 'Samet Şahin', line2: 'Yapımcı • NOVA' } },
  modern: { name: 'Alt Bant (modern)', fields: ['line1', 'line2'], defaults: { line1: 'KONUK ADI', line2: 'Unvan / Açıklama' } },
  baslik: { name: 'Tam Ekran Başlık', fields: ['line1', 'line2'], defaults: { line1: 'CANLI YAYIN', line2: 'Birazdan başlıyoruz' } },
  kayan: { name: 'Kayan Yazı (Haber Bandı)', fields: ['label', 'line1', 'speed'], defaults: { label: 'SON DAKİKA', line1: 'NOVA Canlı ile yayındayız • Takip etmeyi unutmayın • @xsametsahinx', speed: 120 } },
  saat: { name: 'Saat & Tarih', fields: [], defaults: {} },
  geri: { name: 'Geri Sayım', fields: ['line1', 'minutes'], defaults: { line1: 'YAYIN BAŞLIYOR', minutes: 5 } },
  skor: { name: 'Skor Tabelası', fields: ['teamA', 'scoreA', 'teamB', 'scoreB', 'label'], defaults: { teamA: 'TAKIM A', scoreA: 0, teamB: 'TAKIM B', scoreB: 0, label: '1. YARI' } },
  sosyal: { name: 'Sosyal Medya', fields: ['line1', 'line2'], defaults: { line1: '@xsametsahinx', line2: 'Instagram • TikTok • YouTube' } },
  sayac: { name: 'Kronometre', fields: ['line1'], defaults: { line1: 'SÜRE' } }
};

const TitleRenderer = {
  font(size, weight = 700) { return `${weight} ${Math.round(size)}px "Segoe UI", "Inter", "Roboto", Arial, sans-serif`; },
  ease(t) { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); },

  // input.title: {template, accent, textColor, bg, ...alanlar}, tOn: yayına girdiğinden beri sn
  render(canvas, input, W, H, tOn) {
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const d = input.title, s = H / 1080;
    const accent = d.accent || '#ff2d55', fg = d.textColor || '#ffffff', bg = d.bg || 'rgba(10,12,18,0.88)';
    const k = this.ease(tOn / 0.6);
    ctx.save();
    ctx.textBaseline = 'middle';
    switch (d.template) {
      case 'altbant': {
        const x = 110 * s, y = H - 300 * s;
        ctx.font = this.font(52 * s); const w1 = ctx.measureText(d.line1 || '').width;
        ctx.font = this.font(32 * s, 500); const w2 = ctx.measureText(d.line2 || '').width;
        const w = (Math.max(w1, w2) + 90 * s) * k;
        ctx.fillStyle = accent; ctx.fillRect(x, y, 14 * s, 140 * s);
        ctx.save(); ctx.beginPath(); ctx.rect(x + 14 * s, y, w, 140 * s); ctx.clip();
        ctx.fillStyle = bg; ctx.fillRect(x + 14 * s, y, w, 140 * s);
        ctx.fillStyle = fg; ctx.font = this.font(52 * s); ctx.fillText(d.line1 || '', x + 50 * s, y + 48 * s);
        ctx.globalAlpha = 0.85; ctx.font = this.font(32 * s, 500); ctx.fillText(d.line2 || '', x + 50 * s, y + 102 * s);
        ctx.restore();
        break;
      }
      case 'modern': {
        const x = 110 * s, y = H - 320 * s;
        ctx.font = this.font(56 * s, 800); const w1 = ctx.measureText(d.line1 || '').width + 70 * s;
        ctx.font = this.font(34 * s, 600); const w2 = ctx.measureText(d.line2 || '').width + 70 * s;
        const k2 = this.ease((tOn - 0.2) / 0.6);
        ctx.fillStyle = accent; this.rr(ctx, x - (1 - k) * w1, y, w1, 92 * s, 10 * s); ctx.globalAlpha = k; ctx.fill();
        ctx.fillStyle = fg; ctx.font = this.font(56 * s, 800); ctx.fillText(d.line1 || '', x + 35 * s - (1 - k) * w1, y + 48 * s);
        ctx.globalAlpha = k2; ctx.fillStyle = '#ffffff'; this.rr(ctx, x + 30 * s, y + 98 * s, w2, 64 * s, 8 * s); ctx.fill();
        ctx.fillStyle = '#111'; ctx.font = this.font(34 * s, 600); ctx.fillText(d.line2 || '', x + 65 * s, y + 131 * s);
        break;
      }
      case 'baslik': {
        ctx.globalAlpha = k;
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.fillStyle = fg;
        ctx.font = this.font(130 * s, 900); ctx.fillText(d.line1 || '', W / 2, H / 2 - 40 * s + (1 - k) * 40 * s);
        ctx.fillStyle = accent; ctx.fillRect(W / 2 - 120 * s * k, H / 2 + 40 * s, 240 * s * k, 8 * s);
        ctx.fillStyle = fg; ctx.globalAlpha = k * 0.9; ctx.font = this.font(46 * s, 500); ctx.fillText(d.line2 || '', W / 2, H / 2 + 110 * s);
        break;
      }
      case 'kayan': {
        const h = 86 * s, y = H - h - 40 * s;
        ctx.globalAlpha = k;
        ctx.fillStyle = bg; ctx.fillRect(0, y, W, h);
        ctx.font = this.font(40 * s, 600); ctx.fillStyle = fg;
        const txt = (d.line1 || '') + '     •     ';
        const tw = ctx.measureText(txt).width || 1;
        const off = (tOn * (Number(d.speed) || 120) * s) % tw;
        ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, h); ctx.clip();
        for (let x = W - off - tw * Math.ceil(W / tw + 1); x < W + tw; x += tw) if (x > -tw) ctx.fillText(txt, x, y + h / 2);
        ctx.restore();
        ctx.font = this.font(40 * s, 900); const lw = ctx.measureText(d.label || '').width + 70 * s;
        ctx.fillStyle = accent; ctx.fillRect(0, y, lw, h);
        ctx.fillStyle = '#fff'; ctx.fillText(d.label || '', 35 * s, y + h / 2);
        break;
      }
      case 'saat': {
        const now = new Date();
        const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const date = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
        const w = 330 * s, x = W - w - 60 * s, y = 50 * s;
        ctx.globalAlpha = k; ctx.fillStyle = bg; this.rr(ctx, x, y, w, 120 * s, 12 * s); ctx.fill();
        ctx.fillStyle = accent; ctx.fillRect(x, y + 20 * s, 6 * s, 80 * s);
        ctx.textAlign = 'center'; ctx.fillStyle = fg;
        ctx.font = this.font(54 * s, 800); ctx.fillText(time, x + w / 2, y + 48 * s);
        ctx.globalAlpha = k * 0.8; ctx.font = this.font(24 * s, 500); ctx.fillText(date, x + w / 2, y + 95 * s);
        break;
      }
      case 'geri': {
        if (!input._cdStart || input._cdMinutes !== d.minutes) { input._cdStart = performance.now(); input._cdMinutes = d.minutes; }
        const left = Math.max(0, (Number(d.minutes) || 0) * 60 - (performance.now() - input._cdStart) / 1000);
        const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(Math.floor(left % 60)).padStart(2, '0');
        ctx.globalAlpha = k; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = accent; ctx.font = this.font(54 * s, 800); ctx.fillText(d.line1 || '', W / 2, H / 2 - 140 * s);
        ctx.fillStyle = fg; ctx.font = this.font(240 * s, 900); ctx.fillText(`${mm}:${ss}`, W / 2, H / 2 + 30 * s);
        break;
      }
      case 'sayac': {
        if (!input._swStart) input._swStart = performance.now();
        const el = (performance.now() - input._swStart) / 1000;
        const hh = Math.floor(el / 3600), mm = String(Math.floor(el / 60) % 60).padStart(2, '0'), ss = String(Math.floor(el % 60)).padStart(2, '0');
        const w = 300 * s, x = 60 * s, y = 50 * s;
        ctx.globalAlpha = k; ctx.fillStyle = bg; this.rr(ctx, x, y, w, 110 * s, 12 * s); ctx.fill();
        ctx.fillStyle = accent; ctx.font = this.font(24 * s, 800); ctx.fillText(d.line1 || '', x + 26 * s, y + 30 * s);
        ctx.fillStyle = fg; ctx.font = this.font(52 * s, 800); ctx.fillText(`${hh ? hh + ':' : ''}${mm}:${ss}`, x + 26 * s, y + 74 * s);
        break;
      }
      case 'skor': {
        const x = 60 * s, y = 50 * s, h = 70 * s;
        ctx.font = this.font(34 * s, 800);
        const tA = d.teamA || '', tB = d.teamB || '';
        const wa = Math.max(160 * s, ctx.measureText(tA).width + 50 * s), wb = Math.max(160 * s, ctx.measureText(tB).width + 50 * s);
        const ws = 150 * s, total = wa + ws + wb;
        ctx.globalAlpha = k;
        ctx.fillStyle = bg; this.rr(ctx, x, y, total, h, 10 * s); ctx.fill();
        ctx.fillStyle = accent; ctx.fillRect(x + wa, y, ws, h);
        ctx.textAlign = 'center'; ctx.fillStyle = fg;
        ctx.fillText(tA, x + wa / 2, y + h / 2); ctx.fillText(tB, x + wa + ws + wb / 2, y + h / 2);
        ctx.fillStyle = '#fff'; ctx.font = this.font(40 * s, 900); ctx.fillText(`${d.scoreA ?? 0} - ${d.scoreB ?? 0}`, x + wa + ws / 2, y + h / 2 + 2 * s);
        if (d.label) {
          ctx.font = this.font(22 * s, 700); const lw = ctx.measureText(d.label).width + 40 * s;
          ctx.fillStyle = 'rgba(255,255,255,0.92)'; this.rr(ctx, x + total / 2 - lw / 2, y + h + 6 * s, lw, 36 * s, 6 * s); ctx.fill();
          ctx.fillStyle = '#111'; ctx.fillText(d.label, x + total / 2, y + h + 25 * s);
        }
        break;
      }
      case 'sosyal': {
        ctx.font = this.font(44 * s, 800); const w1 = ctx.measureText(d.line1 || '').width;
        ctx.font = this.font(26 * s, 500); const w2 = ctx.measureText(d.line2 || '').width;
        const w = Math.max(w1, w2) + 150 * s, x = W - w - 70 * s, y = H - 200 * s;
        ctx.globalAlpha = k;
        ctx.fillStyle = bg; this.rr(ctx, x + (1 - k) * 80 * s, y, w, 120 * s, 60 * s); ctx.fill();
        const g = ctx.createLinearGradient(x, y, x + 90 * s, y + 90 * s); g.addColorStop(0, accent); g.addColorStop(1, '#ffb800');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 60 * s + (1 - k) * 80 * s, y + 60 * s, 42 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = this.font(44 * s, 900); ctx.fillText('@', x + 60 * s + (1 - k) * 80 * s, y + 58 * s);
        ctx.textAlign = 'left'; ctx.fillStyle = fg;
        ctx.font = this.font(44 * s, 800); ctx.fillText(d.line1 || '', x + 120 * s + (1 - k) * 80 * s, y + 46 * s);
        ctx.globalAlpha = k * 0.8; ctx.font = this.font(26 * s, 500); ctx.fillText(d.line2 || '', x + 120 * s + (1 - k) * 80 * s, y + 86 * s);
        break;
      }
    }
    ctx.restore();
  },
  rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, w), h, r); }
};
