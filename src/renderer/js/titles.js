// Grafik / alt yazı şablonları (vMix GT Title benzeri)
const TITLE_TEMPLATES = {
  altbant: { cat: 'Alt Bant', name: 'Alt Bant (klasik)', fields: ['line1', 'line2', 'items'], defaults: { line1: 'Samet Şahin', line2: 'Yapımcı • NOVA' } },
  modern: { cat: 'Alt Bant', name: 'Alt Bant (modern)', fields: ['line1', 'line2', 'items'], defaults: { line1: 'KONUK ADI', line2: 'Unvan / Açıklama' } },
  baslik: { cat: 'Yayın Ekranı', name: 'Tam Ekran Başlık', fields: ['line1', 'line2'], defaults: { line1: 'CANLI YAYIN', line2: 'Birazdan başlıyoruz' } },
  kayan: { cat: 'Haber', name: 'Kayan Yazı (Haber Bandı)', fields: ['label', 'line1', 'speed'], defaults: { label: 'SON DAKİKA', line1: 'NOVA Canlı ile yayındayız • Takip etmeyi unutmayın • @xsametsahinx', speed: 120 } },
  saat: { cat: 'Bilgi & Araç', name: 'Saat & Tarih', fields: [], defaults: {} },
  geri: { cat: 'Yayın Ekranı', name: 'Geri Sayım', fields: ['line1', 'minutes'], defaults: { line1: 'YAYIN BAŞLIYOR', minutes: 5 } },
  skor: { cat: 'Spor', name: 'Skor Tabelası', fields: ['teamA', 'scoreA', 'teamB', 'scoreB', 'label'], defaults: { teamA: 'TAKIM A', scoreA: 0, teamB: 'TAKIM B', scoreB: 0, label: '1. YARI' } },
  sosyal: { cat: 'Sosyal Medya', name: 'Sosyal Medya', fields: ['line1', 'line2'], defaults: { line1: '@xsametsahinx', line2: 'Instagram • TikTok • YouTube' } },
  sayac: { cat: 'Bilgi & Araç', name: 'Kronometre', fields: ['line1'], defaults: { line1: 'SÜRE' } }
};

const TitleRenderer = {
  font(size, weight = 700) { return `${weight} ${Math.round(size)}px "Segoe UI", "Inter", "Roboto", Arial, sans-serif`; },
  ease(t) { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); },

  // input.title: {template, accent, textColor, bg, ...alanlar}, tOn: yayına girdiğinden beri sn
  render(canvas, input, W, H, tOn) {
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const d = input.title, s = Math.min(W / 1920, H / 1080);
    const accent = d.accent || '#ff2d55', fg = d.textColor || '#ffffff', bg = d.bg || 'rgba(10,12,18,0.88)';
    const k = this.ease(tOn / 0.6);
    ctx.save();
    ctx.textBaseline = 'middle';
    switch (d.template) {
      case 'altbant': {
        const [l1, l2] = titleLines(d);
        const x = 110 * s, y = H - 300 * s;
        ctx.font = this.font(52 * s); const w1 = ctx.measureText(l1 || '').width;
        ctx.font = this.font(32 * s, 500); const w2 = ctx.measureText(l2 || '').width;
        const w = (Math.max(w1, w2) + 90 * s) * k;
        ctx.fillStyle = accent; ctx.fillRect(x, y, 14 * s, 140 * s);
        ctx.save(); ctx.beginPath(); ctx.rect(x + 14 * s, y, w, 140 * s); ctx.clip();
        ctx.fillStyle = bg; ctx.fillRect(x + 14 * s, y, w, 140 * s);
        ctx.fillStyle = fg; ctx.font = this.font(52 * s); ctx.fillText(l1 || '', x + 50 * s, y + 48 * s);
        ctx.globalAlpha = 0.85; ctx.font = this.font(32 * s, 500); ctx.fillText(l2 || '', x + 50 * s, y + 102 * s);
        ctx.restore();
        break;
      }
      case 'modern': {
        const [l1, l2] = titleLines(d);
        const x = 110 * s, y = H - 320 * s;
        ctx.font = this.font(56 * s, 800); const w1 = ctx.measureText(l1 || '').width + 70 * s;
        ctx.font = this.font(34 * s, 600); const w2 = ctx.measureText(l2 || '').width + 70 * s;
        const k2 = this.ease((tOn - 0.2) / 0.6);
        ctx.fillStyle = accent; this.rr(ctx, x - (1 - k) * w1, y, w1, 92 * s, 10 * s); ctx.globalAlpha = k; ctx.fill();
        ctx.fillStyle = fg; ctx.font = this.font(56 * s, 800); ctx.fillText(l1 || '', x + 35 * s - (1 - k) * w1, y + 48 * s);
        ctx.globalAlpha = k2; ctx.fillStyle = '#ffffff'; this.rr(ctx, x + 30 * s, y + 98 * s, w2, 64 * s, 8 * s); ctx.fill();
        ctx.fillStyle = '#111'; ctx.font = this.font(34 * s, 600); ctx.fillText(l2 || '', x + 65 * s, y + 131 * s);
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
      default: {
        const f = TITLE_EXTRA[d.template];
        if (f) f(ctx, { d, W, H, s, k, t: tOn, acc: accent, fg, bg, inp: input, R: this });
      }
    }
    ctx.restore();
  },
  rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, w), h, r); }
};

// =====================================================================
// v1.2 — Ek grafik şablonları
// =====================================================================
const TITLE_CATS = ['Alt Bant', 'Haber', 'Spor', 'Yayın Ekranı', 'Sosyal Medya', 'Bilgi & Araç'];

const FIELD_LABELS = {
  line1: 'Satır 1', line2: 'Satır 2', label: 'Etiket', speed: 'Kayma hızı', minutes: 'Dakika',
  teamA: 'Takım A', teamB: 'Takım B', scoreA: 'Skor A', scoreB: 'Skor B', colorA: 'Takım A rengi', colorB: 'Takım B rengi',
  period: 'Devre', startMin: 'Başlangıç dakikası', items: 'İsim listesi (her satır: Ad | Unvan)',
  name2: '2. kişi adı', title2: '2. kişi unvanı', city: 'Şehir', temp: 'Sıcaklık (°C)', cond: 'Hava durumu',
  author: 'Söyleyen', user: 'Kullanıcı adı', amount: 'Miktar', current: 'Mevcut', goal: 'Hedef',
  options: 'Seçenekler (her satır: Seçenek | Oy)', song: 'Şarkı', artist: 'Sanatçı',
  handles: 'Hesaplar (her satır: Platform | @kullanıcı)', lines: 'Altyazı satırları (her satır bir altyazı)', size: 'Yazı boyutu'
};
const FIELD_NUMBER = new Set(['speed', 'minutes', 'scoreA', 'scoreB', 'temp', 'current', 'goal', 'startMin', 'size']);
const FIELD_TEXTAREA = new Set(['items', 'options', 'handles', 'lines']);
const FIELD_COLOR = new Set(['colorA', 'colorB']);
const FIELD_SELECT = { cond: ['Güneşli', 'Parçalı Bulutlu', 'Bulutlu', 'Yağmurlu', 'Karlı', 'Fırtına'] };

Object.assign(TITLE_TEMPLATES, {
  cam: { cat: 'Alt Bant', name: 'Alt Bant (cam)', fields: ['line1', 'line2', 'items'], defaults: { line1: 'Konuk Adı', line2: 'Unvan • Kurum' } },
  neon: { cat: 'Alt Bant', name: 'Alt Bant (neon)', fields: ['line1', 'line2', 'items'], defaults: { line1: 'OYUNCU ADI', line2: 'PUBG • Mobile Legends' }, accent: '#00e5ff' },
  minimal: { cat: 'Alt Bant', name: 'Alt Bant (sade)', fields: ['line1', 'line2', 'items'], defaults: { line1: 'Konuşmacı', line2: 'Görevi / Açıklama' } },
  ikili: { cat: 'Alt Bant', name: 'Röportaj (2 kişi)', fields: ['line1', 'line2', 'name2', 'title2'], defaults: { line1: 'Samet Şahin', line2: 'Sunucu', name2: 'Konuk Adı', title2: 'Konuk' } },
  kose: { cat: 'Alt Bant', name: 'Konum Etiketi', fields: ['label', 'line1'], defaults: { label: 'CANLI', line1: 'MANİSA • Spil Dağı' } },
  haberalt: { cat: 'Haber', name: 'Haber Alt Bandı', fields: ['label', 'line1', 'line2', 'speed'], defaults: { label: 'GÜNDEM', line1: 'Başlık buraya yazılır', line2: 'Kayan haber metni • İkinci haber • Üçüncü haber', speed: 110 } },
  sondakika: { cat: 'Haber', name: 'Son Dakika', fields: ['label', 'line1'], defaults: { label: 'SON DAKİKA', line1: 'Önemli gelişme burada duyurulur' } },
  hava: { cat: 'Haber', name: 'Hava Durumu', fields: ['city', 'temp', 'cond'], defaults: { city: 'MANİSA', temp: 21, cond: 'Parçalı Bulutlu' } },
  alinti: { cat: 'Haber', name: 'Alıntı / Söz', fields: ['line1', 'author'], defaults: { line1: 'Hayal gücü bilgiden daha önemlidir.', author: 'Albert Einstein' } },
  futbol: { cat: 'Spor', name: 'Futbol Skorbord (saatli)', fields: ['teamA', 'scoreA', 'teamB', 'scoreB', 'colorA', 'colorB', 'period', 'startMin'], defaults: { teamA: 'MAN', scoreA: 1, teamB: 'İZM', scoreB: 0, colorA: '#e30a17', colorB: '#1e5bd8', period: '1. YARI', startMin: 0 } },
  macsonu: { cat: 'Spor', name: 'Maç Sonucu (tam ekran)', fields: ['label', 'teamA', 'scoreA', 'teamB', 'scoreB', 'colorA', 'colorB'], defaults: { label: 'MAÇ SONUCU', teamA: 'NOVA', scoreA: 3, teamB: 'RAKİP', scoreB: 1, colorA: '#ff2d4b', colorB: '#4c8dff' } },
  birazdan: { cat: 'Yayın Ekranı', name: 'Birazdan Başlıyoruz', fields: ['line1', 'line2', 'minutes'], defaults: { line1: 'BİRAZDAN BAŞLIYORUZ', line2: 'Yayın az sonra başlayacak', minutes: 5 } },
  ara: { cat: 'Yayın Ekranı', name: 'Kısa Ara (BRB)', fields: ['line1', 'line2'], defaults: { line1: 'KISA BİR ARA', line2: 'Birazdan döneceğiz' } },
  bitti: { cat: 'Yayın Ekranı', name: 'Yayın Sona Erdi', fields: ['line1', 'line2', 'handles'], defaults: { line1: 'İZLEDİĞİNİZ İÇİN TEŞEKKÜRLER', line2: 'Bir sonraki yayında görüşmek üzere', handles: 'YouTube | @xsametsahinx\nInstagram | @xsametsahinx\nTikTok | @xsametsahinx' } },
  abone: { cat: 'Sosyal Medya', name: 'Abone Ol Animasyonu', fields: ['line1', 'line2'], defaults: { line1: 'ABONE OL', line2: 'Bildirimleri açmayı unutma!' } },
  takip: { cat: 'Sosyal Medya', name: 'Sosyal Medya Döngüsü', fields: ['handles'], defaults: { handles: 'YouTube | @xsametsahinx\nInstagram | @xsametsahinx\nTikTok | @xsametsahinx\nX | @xsametsahinx' } },
  mesaj: { cat: 'Sosyal Medya', name: 'İzleyici Mesajı', fields: ['user', 'line1', 'label'], defaults: { user: 'izleyici_34', line1: 'Harika yayın, selamlar Manisa\'dan!', label: 'YouTube' } },
  bagis: { cat: 'Sosyal Medya', name: 'Destek / Bağış Uyarısı', fields: ['user', 'amount', 'line1'], defaults: { user: 'Ali K.', amount: '₺50', line1: 'Yayın süper, devam!' } },
  canli: { cat: 'Bilgi & Araç', name: 'CANLI Rozeti', fields: ['label', 'line1'], defaults: { label: 'CANLI', line1: 'NOVA TV' } },
  logo: { cat: 'Bilgi & Araç', name: 'Filigran (Kanal Adı)', fields: ['line1'], defaults: { line1: 'NOVA TV' } },
  calan: { cat: 'Bilgi & Araç', name: 'Şimdi Çalıyor', fields: ['song', 'artist'], defaults: { song: 'Şarkı Adı', artist: 'Samet Şahin' } },
  anket: { cat: 'Bilgi & Araç', name: 'Anket / Oylama', fields: ['line1', 'options'], defaults: { line1: 'Bir sonraki oyun hangisi olsun?', options: 'PUBG | 62\nMobile Legends | 38\nMinecraft | 25' } },
  ilerleme: { cat: 'Bilgi & Araç', name: 'Hedef Çubuğu', fields: ['line1', 'current', 'goal'], defaults: { line1: 'ABONE HEDEFİ', current: 750, goal: 1000 } },
  altyazi: { cat: 'Bilgi & Araç', name: 'Altyazı (satır / SRT)', fields: ['lines', 'size'], defaults: { lines: 'Hoş geldiniz, yayınımıza başlıyoruz.\nBugün sizlere yeni bir program tanıtacağız.\nSorularınızı yorumlara yazabilirsiniz.', size: 46 } }
});
// Önceki sürümlerden kalan şablonlara kategori
for (const t of Object.values(TITLE_TEMPLATES)) if (!t.cat) t.cat = 'Bilgi & Araç';

// --- Yardımcılar
function parseRows(str) { return String(str || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split('|').map(x => x.trim())); }
function titleLines(d) {
  const it = parseRows(d.items);
  if (it.length) { const r = it[((d.itemIdx || 0) % it.length + it.length) % it.length]; return [r[0] || '', r[1] || '']; }
  return [d.line1 || '', d.line2 || ''];
}
function titleItemCount(d) {
  if (d.template === 'altyazi') return d.srtCues?.length ? 0 : parseRows(d.lines).length;
  return parseRows(d.items).length;
}
function parseSRT(text) {
  const ts = (x) => { const m = /(\d+):(\d+):(\d+)[,.](\d+)/.exec(x); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000 : 0; };
  return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(b => {
    const ls = b.split('\n').filter(Boolean); const i = ls.findIndex(l => l.includes('-->'));
    if (i < 0) return null;
    const [a, z] = ls[i].split('-->');
    return { s: ts(a), e: ts(z), t: ls.slice(i + 1).join(' ').replace(/<[^>]+>/g, '') };
  }).filter(Boolean);
}
const TR = {
  wrap(c, text, maxW) {
    const out = []; let line = '';
    for (const w of String(text || '').split(/\s+/)) {
      const tryL = line ? line + ' ' + w : w;
      if (c.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL;
    }
    if (line) out.push(line); return out;
  },
  fitFont(c, R, text, maxW, size, weight) {
    let sz = size; c.font = R.font(sz, weight);
    while (sz > 10 && c.measureText(text).width > maxW) { sz *= 0.92; c.font = R.font(sz, weight); }
    return sz;
  },
  hashColor(str) { let h = 0; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${h % 360},70%,55%)`; },
  platform(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('you')) return { c: '#ff0000', l: '▶' };
    if (n.includes('insta')) return { c: 'grad', l: 'IG' };
    if (n.includes('tik')) return { c: '#010101', l: '♪', b: '#25f4ee' };
    if (n.includes('twitch')) return { c: '#9146ff', l: 'T' };
    if (n.includes('kick')) return { c: '#53fc18', l: 'K', fg: '#000' };
    if (n.includes('face')) return { c: '#1877f2', l: 'f' };
    if (n.includes('disc')) return { c: '#5865f2', l: 'D' };
    if (n === 'x' || n.includes('twitter')) return { c: '#000', l: '𝕏', b: '#444' };
    return { c: '#4c8dff', l: (name || '?')[0].toUpperCase() };
  },
  badge(c, x, y, r, name) {
    const p = TR.platform(name);
    if (p.c === 'grad') { const g = c.createLinearGradient(x - r, y + r, x + r, y - r); g.addColorStop(0, '#feda75'); g.addColorStop(0.5, '#d62976'); g.addColorStop(1, '#4f5bd5'); c.fillStyle = g; }
    else c.fillStyle = p.c;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    if (p.b) { c.strokeStyle = p.b; c.lineWidth = r * 0.12; c.stroke(); }
    c.fillStyle = p.fg || '#fff'; c.textAlign = 'center'; c.font = `900 ${Math.round(r * 0.95)}px "Segoe UI", Arial`; c.fillText(p.l, x, y + r * 0.04);
  },
  clock(sec) { sec = Math.max(0, Math.floor(sec)); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; },
  // tam ekran yayın ekranları için hareketli arka plan
  screenBg(c, o, hue2) {
    const { W, H, t, acc, s } = o;
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#070912'); g.addColorStop(1, hue2 || '#1a0d2e');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      const x = W * (0.5 + 0.42 * Math.sin(t * 0.25 + i * 1.7)), y = H * (0.5 + 0.4 * Math.cos(t * 0.21 + i * 2.3)), r = (220 + 90 * Math.sin(i)) * s;
      const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, i % 2 ? acc + '55' : 'rgba(123,60,255,0.33)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1;
    const step = 80 * s, off = (t * 20 * s) % step;
    c.beginPath();
    for (let x = -off; x < W; x += step) { c.moveTo(x, 0); c.lineTo(x, H); }
    for (let y = -off; y < H; y += step) { c.moveTo(0, y); c.lineTo(W, y); }
    c.stroke();
  }
};

const TITLE_EXTRA = {
  cam(c, o) {
    const { R, s, H, k, t, acc, fg } = o; const [a, b] = titleLines(o.d);
    const x = 110 * s, y = H - 310 * s, h = 150 * s;
    c.font = R.font(50 * s, 800); const wa = c.measureText(a).width; c.font = R.font(30 * s, 500); const wb = c.measureText(b).width;
    const w = (Math.max(wa, wb) + 110 * s) * k;
    c.globalAlpha = Math.min(1, k * 1.5);
    const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(255,255,255,0.26)'); g.addColorStop(1, 'rgba(255,255,255,0.08)');
    c.fillStyle = 'rgba(10,12,20,0.45)'; R.rr(c, x, y, w, h, 24 * s); c.fill();
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2 * s; c.stroke();
    c.save(); R.rr(c, x, y, w, h, 24 * s); c.clip();
    const p = (t % 5) / 1.3;
    if (p < 1) { const sx = x - 200 * s + p * (w + 400 * s); const sg = c.createLinearGradient(sx - 80 * s, 0, sx + 80 * s, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sg; c.fillRect(sx - 80 * s, y, 160 * s, h); }
    c.fillStyle = acc; c.beginPath(); c.arc(x + 40 * s, y + h / 2, 11 * s, 0, Math.PI * 2); c.fill();
    c.fillStyle = fg; c.font = R.font(50 * s, 800); c.fillText(a, x + 70 * s, y + 54 * s);
    c.globalAlpha *= 0.82; c.font = R.font(30 * s, 500); c.fillText(b, x + 70 * s, y + 106 * s);
    c.restore();
  },
  neon(c, o) {
    const { R, s, H, k, t, acc } = o; const [a, b] = titleLines(o.d);
    const x = 110 * s, y = H - 310 * s;
    const flick = t < 0.9 ? (Math.sin(t * 70) > -0.2 ? 1 : 0.25) : 0.92 + 0.08 * Math.sin(t * 9);
    c.globalAlpha = Math.min(1, k * 2) * flick;
    c.font = R.font(56 * s, 900); const wa = c.measureText(a).width; c.font = R.font(30 * s, 700); const wb = c.measureText(b).width;
    const w = Math.max(wa, wb) + 90 * s;
    c.fillStyle = 'rgba(4,6,14,0.75)'; R.rr(c, x, y, w, 160 * s, 18 * s); c.fill();
    c.shadowColor = acc; c.shadowBlur = 24 * s; c.strokeStyle = acc; c.lineWidth = 4 * s; c.stroke();
    c.fillStyle = '#fff'; c.font = R.font(56 * s, 900); c.fillText(a, x + 45 * s, y + 58 * s);
    c.fillStyle = acc; c.font = R.font(30 * s, 700); c.fillText(b, x + 45 * s, y + 116 * s);
  },
  minimal(c, o) {
    const { R, s, H, k, fg, acc } = o; const [a, b] = titleLines(o.d);
    const x = 120 * s, y = H - 270 * s;
    c.fillStyle = acc; c.fillRect(x, y, 5 * s, 120 * s * k);
    c.save(); c.beginPath(); c.rect(x + 5 * s, y - 10 * s, 1600 * s, 160 * s); c.clip();
    c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 10 * s;
    c.fillStyle = fg; c.font = R.font(50 * s, 700); c.fillText(a, x + 28 * s - (1 - k) * 600 * s, y + 38 * s);
    const k2 = R.ease((o.t - 0.15) / 0.6);
    c.globalAlpha = 0.88; c.font = R.font(30 * s, 400); c.fillText(b, x + 28 * s - (1 - k2) * 600 * s, y + 90 * s);
    c.restore();
  },
  ikili(c, o) {
    const { R, s, W, H, k, d, acc, fg, bg } = o;
    const box = (name, title, x, right) => {
      c.font = R.font(46 * s, 800); const w1 = c.measureText(name).width; c.font = R.font(28 * s, 500); const w2 = c.measureText(title).width;
      const w = (Math.max(w1, w2) + 80 * s) * k, h = 124 * s, y = H - 280 * s, bx = right ? x - w : x;
      c.fillStyle = bg; c.fillRect(bx, y, w, h);
      c.fillStyle = acc; c.fillRect(right ? x - 10 * s : x, y, 10 * s, h);
      c.save(); c.beginPath(); c.rect(bx, y, w, h); c.clip();
      c.textAlign = right ? 'right' : 'left'; const tx = right ? x - 40 * s : x + 40 * s;
      c.fillStyle = fg; c.font = R.font(46 * s, 800); c.fillText(name, tx, y + 44 * s);
      c.globalAlpha = 0.85; c.font = R.font(28 * s, 500); c.fillText(title, tx, y + 92 * s); c.restore();
    };
    box(d.line1 || '', d.line2 || '', 110 * s, false); box(d.name2 || '', d.title2 || '', W - 110 * s, true);
  },
  kose(c, o) {
    const { R, s, k, d, acc, fg, bg } = o; const x = 60 * s, y = 50 * s - (1 - k) * 140 * s, h = 64 * s;
    c.font = R.font(28 * s, 900); const lw = c.measureText(d.label || '').width + 44 * s;
    c.font = R.font(30 * s, 700); const tw = c.measureText(d.line1 || '').width + 100 * s;
    c.fillStyle = acc; c.fillRect(x, y, lw, h); c.fillStyle = bg; c.fillRect(x + lw, y, tw, h);
    c.fillStyle = '#fff'; c.font = R.font(28 * s, 900); c.fillText(d.label || '', x + 22 * s, y + h / 2);
    const px = x + lw + 38 * s, py = y + h / 2; // konum iğnesi
    c.fillStyle = acc; c.beginPath(); c.arc(px, py - 5 * s, 12 * s, Math.PI, 0); c.lineTo(px, py + 16 * s); c.closePath(); c.fill();
    c.fillStyle = bg; c.beginPath(); c.arc(px, py - 5 * s, 4.5 * s, 0, Math.PI * 2); c.fill();
    c.fillStyle = fg; c.font = R.font(30 * s, 700); c.fillText(d.line1 || '', px + 28 * s, py);
  },
  haberalt(c, o) {
    const { R, s, W, H, k, t, d, acc, bg } = o; const y0 = H - 250 * s;
    c.font = R.font(30 * s, 900); const lw = c.measureText(d.label || '').width + 60 * s;
    c.fillStyle = acc; c.fillRect(60 * s, y0, lw * k, 56 * s);
    c.fillStyle = '#fff'; c.save(); c.beginPath(); c.rect(60 * s, y0, lw * k, 56 * s); c.clip(); c.fillText(d.label || '', 90 * s, y0 + 29 * s); c.restore();
    const ww = (W - 120 * s) * R.ease((t - 0.1) / 0.6);
    c.fillStyle = '#ffffff'; c.fillRect(60 * s, y0 + 56 * s, ww, 104 * s);
    c.save(); c.beginPath(); c.rect(60 * s, y0 + 56 * s, ww, 104 * s); c.clip();
    c.fillStyle = '#10131d'; TR.fitFont(c, R, d.line1 || '', W - 200 * s, 52 * s, 800); c.fillText(d.line1 || '', 90 * s, y0 + 108 * s); c.restore();
    const y2 = y0 + 160 * s, k3 = R.ease((t - 0.3) / 0.6);
    c.globalAlpha = k3; c.fillStyle = bg; c.fillRect(60 * s, y2, W - 120 * s, 56 * s);
    const cw = 150 * s; c.font = R.font(28 * s, 600);
    const txt = (d.line2 || '') + '      ◆      '; const tw = c.measureText(txt).width || 1;
    c.save(); c.beginPath(); c.rect(60 * s + cw, y2, W - 120 * s - cw, 56 * s); c.clip(); c.fillStyle = '#fff';
    const off = (t * (Number(d.speed) || 110) * s) % tw;
    for (let x = 60 * s + cw - off; x < W; x += tw) c.fillText(txt, x + 20 * s, y2 + 29 * s);
    c.restore();
    c.fillStyle = acc; c.fillRect(60 * s, y2, cw, 56 * s);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = R.font(30 * s, 800);
    c.fillText(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), 60 * s + cw / 2, y2 + 29 * s);
  },
  sondakika(c, o) {
    const { R, s, W, H, k, t, d, acc } = o; const y = H - 330 * s, h = 170 * s;
    const flash = t < 3 && Math.floor(t * 4) % 2 === 1;
    c.fillStyle = flash ? '#8a0012' : acc; c.fillRect(0, y, W * k, h);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y + h - 10 * s, W * k, 10 * s);
    c.save(); c.beginPath(); c.rect(0, y, W * k, h); c.clip();
    c.font = R.font(56 * s, 900); const lw = c.measureText(d.label || '').width + 70 * s;
    c.fillStyle = '#fff'; c.fillRect(70 * s, y + 35 * s, lw, h - 70 * s);
    c.fillStyle = acc; c.fillText(d.label || '', 105 * s, y + h / 2 + 2 * s);
    c.fillStyle = '#fff'; TR.fitFont(c, R, d.line1 || '', W - lw - 220 * s, 54 * s, 800); c.fillText(d.line1 || '', 70 * s + lw + 45 * s, y + h / 2 + 2 * s);
    c.restore();
  },
  hava(c, o) {
    const { R, s, W, k, t, d, fg, bg, acc } = o; const w = 440 * s, h = 200 * s, x = W - w - 60 * s + (1 - k) * 520 * s, y = 60 * s;
    c.fillStyle = bg; R.rr(c, x, y, w, h, 20 * s); c.fill();
    const ix = x + 100 * s, iy = y + 100 * s, cond = d.cond || '';
    const cloud = (cx, cy, sc, col) => { c.fillStyle = col; c.beginPath(); c.arc(cx - 26 * sc, cy + 6 * sc, 24 * sc, 0, 7); c.arc(cx + 4 * sc, cy - 12 * sc, 32 * sc, 0, 7); c.arc(cx + 34 * sc, cy + 6 * sc, 24 * sc, 0, 7); c.rect(cx - 26 * sc, cy + 6 * sc, 60 * sc, 24 * sc); c.fill(); };
    if (/Güneş|Parçalı/.test(cond)) {
      const sx = /Parçalı/.test(cond) ? ix - 18 * s : ix, sy = /Parçalı/.test(cond) ? iy - 18 * s : iy;
      c.save(); c.translate(sx, sy); c.rotate(t * 0.6); c.strokeStyle = '#ffc531'; c.lineWidth = 6 * s; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(42 * s, 0); c.lineTo(56 * s, 0); c.stroke(); }
      c.restore(); c.fillStyle = '#ffc531'; c.beginPath(); c.arc(sx, sy, 32 * s, 0, 7); c.fill();
      if (/Parçalı/.test(cond)) cloud(ix + 12 * s, iy + 14 * s, s, '#e9eef7');
    } else {
      cloud(ix, iy - 8 * s, s * 1.1, /Fırtına/.test(cond) ? '#7d8597' : '#d5dbe6');
      if (/Yağmur|Fırtına/.test(cond)) { c.strokeStyle = '#4fb3ff'; c.lineWidth = 4 * s; for (let i = 0; i < 4; i++) { const yy = iy + 30 * s + ((t * 90 * s + i * 13 * s) % (34 * s)); c.beginPath(); c.moveTo(ix - 30 * s + i * 20 * s, yy); c.lineTo(ix - 36 * s + i * 20 * s, yy + 12 * s); c.stroke(); } }
      if (/Kar/.test(cond)) { c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(ix - 34 * s + i * 17 * s, iy + 32 * s + ((t * 30 * s + i * 11 * s) % (34 * s)), 4 * s, 0, 7); c.fill(); } }
      if (/Fırtına/.test(cond) && Math.floor(t * 2) % 3 === 0) { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(ix, iy + 20 * s); c.lineTo(ix - 12 * s, iy + 48 * s); c.lineTo(ix + 2 * s, iy + 48 * s); c.lineTo(ix - 8 * s, iy + 72 * s); c.lineTo(ix + 16 * s, iy + 40 * s); c.lineTo(ix + 2 * s, iy + 40 * s); c.closePath(); c.fill(); }
    }
    c.fillStyle = fg; c.font = R.font(86 * s, 900); c.fillText(`${d.temp ?? ''}°`, x + 200 * s, y + 84 * s);
    c.fillStyle = acc; c.font = R.font(28 * s, 800); c.fillText(d.city || '', x + 204 * s, y + 146 * s);
    c.fillStyle = fg; c.globalAlpha *= 0.75; c.font = R.font(24 * s, 500); c.fillText(cond, x + 204 * s, y + 178 * s);
  },
  alinti(c, o) {
    const { R, s, W, H, k, d, fg, acc, bg } = o; const w = 1320 * s;
    c.font = R.font(54 * s, 700); const lines = TR.wrap(c, d.line1 || '', w - 260 * s).slice(0, 4);
    const h = (lines.length * 70 + 170) * s, x = (W - w) / 2, y = (H - h) / 2;
    c.globalAlpha = k; c.save(); c.translate(W / 2, H / 2); c.scale(0.92 + 0.08 * k, 0.92 + 0.08 * k); c.translate(-W / 2, -H / 2);
    c.fillStyle = bg; R.rr(c, x, y, w, h, 28 * s); c.fill();
    c.fillStyle = acc; c.font = R.font(240 * s, 900); c.fillText('“', x + 50 * s, y + 110 * s);
    c.fillStyle = fg; c.font = R.font(54 * s, 700); lines.forEach((l, i) => c.fillText(l, x + 190 * s, y + 90 * s + i * 70 * s));
    c.fillStyle = acc; c.fillRect(x + 190 * s, y + h - 62 * s, 50 * s, 5 * s);
    c.fillStyle = fg; c.globalAlpha = k * 0.85; c.font = R.font(32 * s, 600); c.fillText(d.author || '', x + 260 * s, y + h - 58 * s);
    c.restore();
  },
  futbol(c, o) {
    const { R, s, k, d, inp, acc } = o;
    if (!inp._fbStart) inp._fbStart = performance.now();
    const sec = (Number(d.startMin) || 0) * 60 + (performance.now() - inp._fbStart) / 1000;
    const x = 60 * s, y = 50 * s - (1 - k) * 160 * s, h = 64 * s, tw = 150 * s, sw = 130 * s, cw = 140 * s;
    c.fillStyle = d.colorA || '#e30a17'; c.fillRect(x, y, 10 * s, h);
    c.fillStyle = '#0d111b'; c.fillRect(x + 10 * s, y, tw, h);
    c.fillStyle = '#fff'; c.fillRect(x + 10 * s + tw, y, sw, h);
    c.fillStyle = '#0d111b'; c.fillRect(x + 10 * s + tw + sw, y, tw, h);
    c.fillStyle = d.colorB || '#1e5bd8'; c.fillRect(x + 10 * s + tw * 2 + sw, y, 10 * s, h);
    c.fillStyle = acc; c.fillRect(x + 20 * s + tw * 2 + sw, y, cw, h);
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = R.font(32 * s, 800);
    c.fillText(d.teamA || '', x + 10 * s + tw / 2, y + h / 2); c.fillText(d.teamB || '', x + 10 * s + tw + sw + tw / 2, y + h / 2);
    c.fillStyle = '#0d111b'; c.font = R.font(40 * s, 900); c.fillText(`${d.scoreA ?? 0} - ${d.scoreB ?? 0}`, x + 10 * s + tw + sw / 2, y + h / 2 + 2 * s);
    c.fillStyle = '#fff'; c.font = R.font(32 * s, 800); c.fillText(TR.clock(sec), x + 20 * s + tw * 2 + sw + cw / 2, y + h / 2 + 1 * s);
    if (d.period) { c.font = R.font(20 * s, 800); const pw = c.measureText(d.period).width + 30 * s; c.fillStyle = 'rgba(255,255,255,0.92)'; c.fillRect(x + 10 * s + tw + sw / 2 - pw / 2, y + h, pw, 30 * s); c.fillStyle = '#0d111b'; c.fillText(d.period, x + 10 * s + tw + sw / 2, y + h + 16 * s); }
  },
  macsonu(c, o) {
    const { R, s, W, H, k, t, d, fg } = o;
    c.globalAlpha = k; c.fillStyle = 'rgba(5,7,14,0.88)'; c.fillRect(0, 0, W, H);
    c.textAlign = 'center';
    c.fillStyle = fg; c.font = R.font(48 * s, 800); c.fillText(d.label || '', W / 2, H / 2 - 260 * s);
    const team = (name, col, cx) => {
      const r = 120 * s * R.ease((t - 0.2) / 0.6);
      c.fillStyle = col; c.beginPath(); c.arc(cx, H / 2 - 20 * s, Math.max(0, r), 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = R.font(80 * s, 900); c.fillText((name || '?').slice(0, 2), cx, H / 2 - 16 * s);
      c.font = R.font(44 * s, 800); c.fillText(name || '', cx, H / 2 + 170 * s);
    };
    team(d.teamA, d.colorA || '#ff2d4b', W / 2 - 480 * s); team(d.teamB, d.colorB || '#4c8dff', W / 2 + 480 * s);
    const sc = R.ease((t - 0.5) / 0.5);
    c.save(); c.translate(W / 2, H / 2 - 20 * s); c.scale(0.6 + 0.4 * sc, 0.6 + 0.4 * sc);
    c.fillStyle = '#fff'; c.globalAlpha = k * sc; c.font = R.font(190 * s, 900); c.fillText(`${d.scoreA ?? 0} - ${d.scoreB ?? 0}`, 0, 0); c.restore();
  },
  birazdan(c, o) {
    const { R, s, W, H, k, t, d, fg, acc, inp } = o;
    c.globalAlpha = k; TR.screenBg(c, o);
    c.textAlign = 'center'; c.fillStyle = fg;
    TR.fitFont(c, R, d.line1 || '', W - 200 * s, 110 * s, 900); c.fillText(d.line1 || '', W / 2, H / 2 - 110 * s);
    c.globalAlpha = k * 0.85; c.font = R.font(40 * s, 500); c.fillText(d.line2 || '', W / 2, H / 2 - 20 * s);
    c.globalAlpha = k;
    const mins = Number(d.minutes) || 0;
    if (mins > 0) {
      if (!inp._cdStart || inp._cdMinutes !== d.minutes) { inp._cdStart = performance.now(); inp._cdMinutes = d.minutes; }
      const left = Math.max(0, mins * 60 - (performance.now() - inp._cdStart) / 1000);
      c.font = R.font(130 * s, 900); c.fillStyle = acc; c.fillText(TR.clock(left), W / 2, H / 2 + 140 * s);
    } else {
      for (let i = 0; i < 3; i++) { const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 4 - i * 0.7)); c.globalAlpha = k * a; c.fillStyle = acc; c.beginPath(); c.arc(W / 2 + (i - 1) * 50 * s, H / 2 + 110 * s, 13 * s, 0, 7); c.fill(); }
    }
  },
  ara(c, o) {
    const { R, s, W, H, k, t, d, fg, acc } = o;
    c.globalAlpha = k; TR.screenBg(c, o, '#0b1e3a');
    const cx = W / 2, cy = H / 2 - 150 * s;
    for (let i = 0; i < 3; i++) { const p = ((t * 0.6 + i / 3) % 1); c.strokeStyle = acc; c.globalAlpha = k * (1 - p); c.lineWidth = 6 * s; c.beginPath(); c.arc(cx, cy, (60 + p * 140) * s, 0, 7); c.stroke(); }
    c.globalAlpha = k; c.fillStyle = acc; c.beginPath(); c.arc(cx, cy, 60 * s, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.fillRect(cx - 22 * s, cy - 28 * s, 14 * s, 56 * s); c.fillRect(cx + 8 * s, cy - 28 * s, 14 * s, 56 * s);
    c.textAlign = 'center'; c.fillStyle = fg; TR.fitFont(c, R, d.line1 || '', W - 200 * s, 110 * s, 900); c.fillText(d.line1 || '', cx, H / 2 + 80 * s);
    c.globalAlpha = k * 0.85; c.font = R.font(40 * s, 500); c.fillText(d.line2 || '', cx, H / 2 + 170 * s);
    c.globalAlpha = k; for (let i = 0; i < 9; i++) { const bh = (16 + 40 * Math.abs(Math.sin(t * 3 + i * 0.9))) * s; c.fillStyle = acc; c.fillRect(cx - 120 * s + i * 28 * s, H / 2 + 290 * s - bh, 16 * s, bh); }
  },
  bitti(c, o) {
    const { R, s, W, H, k, t, d, fg } = o;
    c.globalAlpha = k; TR.screenBg(c, o, '#2a0b1d');
    c.textAlign = 'center'; c.fillStyle = fg; TR.fitFont(c, R, d.line1 || '', W - 200 * s, 92 * s, 900); c.fillText(d.line1 || '', W / 2, H / 2 - 200 * s);
    c.globalAlpha = k * 0.85; c.font = R.font(38 * s, 500); c.fillText(d.line2 || '', W / 2, H / 2 - 115 * s);
    const rows = parseRows(d.handles).slice(0, 5);
    rows.forEach((r, i) => {
      const q = R.ease((t - 0.4 - i * 0.15) / 0.5), y = H / 2 + (10 + i * 90) * s;
      c.globalAlpha = k * q; c.fillStyle = 'rgba(255,255,255,0.08)'; R.rr(c, W / 2 - 330 * s, y, 660 * s, 74 * s, 37 * s); c.fill();
      TR.badge(c, W / 2 - 293 * s, y + 37 * s, 26 * s, r[0]);
      c.textAlign = 'left'; c.fillStyle = fg; c.font = R.font(32 * s, 800); c.fillText(r[1] || '', W / 2 - 250 * s, y + 38 * s);
      c.textAlign = 'right'; c.globalAlpha = k * q * 0.7; c.font = R.font(24 * s, 600); c.fillText(r[0] || '', W / 2 + 300 * s, y + 38 * s); c.textAlign = 'center';
    });
  },
  abone(c, o) {
    const { R, s, W, H, t, d } = o; const p = t % 7;
    const pop = R.ease(p / 0.45), out = 1 - R.ease((p - 6.3) / 0.6);
    const subbed = p > 1.9, bx = W / 2 - 170 * s, by = H - 260 * s, bw = 340 * s, bh = 90 * s;
    c.globalAlpha = Math.min(pop, out);
    c.save(); c.translate(W / 2, by + bh / 2); const press = p > 1.8 && p < 2.0 ? 0.92 : 1; c.scale(pop * press, pop * press); c.translate(-W / 2, -(by + bh / 2));
    c.fillStyle = subbed ? '#3a3f4b' : '#ff0000'; R.rr(c, bx, by, bw, bh, 14 * s); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = R.font(38 * s, 900); c.fillText(subbed ? 'ABONE OLUNDU ✓' : (d.line1 || 'ABONE OL'), W / 2, by + bh / 2 + 2 * s);
    c.restore();
    if (p > 2.2) { // zil
      const bxx = bx + bw + 70 * s, byy = by + bh / 2, sh = Math.sin(p * 30) * Math.max(0, 1 - (p - 2.2) / 1.2) * 0.5, q = R.ease((p - 2.2) / 0.3);
      c.save(); c.translate(bxx, byy - 24 * s); c.rotate(sh); c.scale(q, q);
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-30 * s, 36 * s); c.quadraticCurveTo(-26 * s, -10 * s, 0, -12 * s); c.quadraticCurveTo(26 * s, -10 * s, 30 * s, 36 * s); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, 44 * s, 8 * s, 0, 7); c.fill(); c.restore();
    }
    if (p > 0.6 && p < 2.6) { // imleç
      const m = R.ease((p - 0.6) / 1.1), cx = W / 2 + 420 * s * (1 - m) + 40 * s, cy = by + bh / 2 + 160 * s * (1 - m) + 18 * s;
      c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3 * s;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + 46 * s); c.lineTo(cx + 12 * s, cy + 35 * s); c.lineTo(cx + 22 * s, cy + 56 * s); c.lineTo(cx + 30 * s, cy + 52 * s); c.lineTo(cx + 20 * s, cy + 32 * s); c.lineTo(cx + 36 * s, cy + 32 * s); c.closePath(); c.fill(); c.stroke();
    }
    if (p > 2.6) { c.globalAlpha = Math.min(out, R.ease((p - 2.6) / 0.5)); c.fillStyle = '#fff'; c.font = R.font(32 * s, 700); c.textAlign = 'center'; c.shadowColor = '#000'; c.shadowBlur = 10 * s; c.fillText(d.line2 || '', W / 2, by + bh + 50 * s); }
  },
  takip(c, o) {
    const { R, s, W, H, k, t, d, fg, bg } = o; const rows = parseRows(d.handles); if (!rows.length) return;
    const per = 3.2, i = Math.floor(t / per) % rows.length, lt = t % per, r = rows[i];
    const flip = Math.min(R.ease(lt / 0.35), 1 - R.ease((lt - per + 0.35) / 0.35));
    c.font = R.font(40 * s, 800); const w = Math.max(360 * s, c.measureText(r[1] || '').width + 170 * s), h = 110 * s, x = W - w - 70 * s, y = H - 200 * s;
    c.globalAlpha = k; c.fillStyle = bg; R.rr(c, x, y, w, h, 55 * s); c.fill();
    c.save(); c.translate(0, y + h / 2); c.scale(1, Math.max(0.01, flip)); c.translate(0, -(y + h / 2));
    TR.badge(c, x + 56 * s, y + h / 2, 36 * s, r[0]);
    c.textAlign = 'left'; c.fillStyle = fg; c.font = R.font(40 * s, 800); c.fillText(r[1] || '', x + 112 * s, y + 46 * s);
    c.globalAlpha = k * 0.7; c.font = R.font(24 * s, 600); c.fillText(r[0] || '', x + 114 * s, y + 82 * s);
    c.restore();
  },
  mesaj(c, o) {
    const { R, s, H, t, d, fg, bg, acc } = o;
    const k = (t => { t = Math.min(1, Math.max(0, t)); const c1 = 1.70158; return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); })(t / 0.55);
    const w = 720 * s; c.font = R.font(34 * s, 500); const lines = TR.wrap(c, d.line1 || '', w - 150 * s).slice(0, 3);
    const h = (90 + lines.length * 44) * s, x = 60 * s - (1 - k) * 800 * s, y = H / 2 - h / 2;
    c.globalAlpha = Math.min(1, Math.max(0, k)); c.fillStyle = bg; R.rr(c, x, y, w, h, 22 * s); c.fill();
    c.fillStyle = TR.hashColor(d.user); c.beginPath(); c.arc(x + 58 * s, y + 58 * s, 32 * s, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = R.font(32 * s, 900); c.fillText((d.user || '?')[0].toUpperCase(), x + 58 * s, y + 60 * s);
    c.textAlign = 'left'; c.fillStyle = acc; c.font = R.font(30 * s, 800); c.fillText(d.user || '', x + 110 * s, y + 46 * s);
    if (d.label) { const uw = c.measureText(d.user || '').width; c.fillStyle = 'rgba(255,255,255,0.45)'; c.font = R.font(22 * s, 600); c.fillText('• ' + d.label, x + 124 * s + uw, y + 47 * s); }
    c.fillStyle = fg; c.font = R.font(34 * s, 500); lines.forEach((l, i) => c.fillText(l, x + 110 * s, y + 92 * s + i * 44 * s));
  },
  bagis(c, o) {
    const { R, s, W, t, d, fg, acc, bg } = o; const p = t;
    const pop = (t => { t = Math.min(1, Math.max(0, t)); const c1 = 1.9; return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); })(p / 0.6);
    const cx = W / 2, cy = 260 * s;
    if (p < 3) for (let i = 0; i < 46; i++) { // konfeti
      const a = i * 2.39, sp = (280 + (i * 37) % 200) * s, tt = p * 1.0;
      const px = cx + Math.cos(a) * sp * tt, py = cy + Math.sin(a) * sp * tt + 260 * s * tt * tt;
      c.globalAlpha = Math.max(0, 1 - p / 3); c.fillStyle = ['#ff2d4b', '#ffd23f', '#19c37d', '#4c8dff', '#ff5ea8'][i % 5];
      c.save(); c.translate(px, py); c.rotate(a + p * 6); c.fillRect(-7 * s, -4 * s, 14 * s, 8 * s); c.restore();
    }
    c.globalAlpha = Math.min(1, Math.max(0, pop));
    c.save(); c.translate(cx, cy); c.scale(Math.max(0, pop), Math.max(0, pop));
    c.fillStyle = bg; R.rr(c, -460 * s, -110 * s, 920 * s, 260 * s, 30 * s); c.fill(); c.strokeStyle = acc; c.lineWidth = 4 * s; c.stroke();
    c.fillStyle = acc; c.beginPath(); // kalp
    c.moveTo(0, -40 * s); c.bezierCurveTo(-30 * s, -90 * s, -95 * s, -55 * s, 0, 10 * s); c.bezierCurveTo(95 * s, -55 * s, 30 * s, -90 * s, 0, -40 * s); c.fill();
    c.textAlign = 'center'; c.fillStyle = fg; c.font = R.font(46 * s, 900); c.fillText(`${d.user || ''} destek oldu!`, 0, 52 * s);
    c.fillStyle = '#ffd23f'; c.font = R.font(40 * s, 900); c.fillText(d.amount || '', 0, 100 * s);
    c.restore();
    if (d.line1) { c.globalAlpha = R.ease((p - 0.6) / 0.5); c.fillStyle = fg; c.textAlign = 'center'; c.font = R.font(32 * s, 500); c.shadowColor = '#000'; c.shadowBlur = 10 * s; c.fillText(`“${d.line1}”`, cx, cy + 205 * s); }
  },
  canli(c, o) {
    const { R, s, k, t, d, fg, bg, acc } = o; const x = 60 * s, y = 50 * s, h = 60 * s;
    c.globalAlpha = k; c.font = R.font(30 * s, 900); const lw = c.measureText(d.label || '').width + 86 * s;
    c.fillStyle = acc; R.rr(c, x, y, lw, h, 10 * s); c.fill();
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    c.fillStyle = `rgba(255,255,255,${0.25 * pulse})`; c.beginPath(); c.arc(x + 34 * s, y + h / 2, (12 + 8 * pulse) * s, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 34 * s, y + h / 2, 10 * s, 0, 7); c.fill();
    c.fillText(d.label || '', x + 58 * s, y + h / 2 + 1 * s);
    if (d.line1) { c.font = R.font(28 * s, 700); const tw = c.measureText(d.line1).width + 44 * s; c.fillStyle = bg; R.rr(c, x + lw + 10 * s, y, tw * k, h, 10 * s); c.fill(); c.fillStyle = fg; c.fillText(d.line1, x + lw + 32 * s, y + h / 2 + 1 * s); }
  },
  logo(c, o) {
    const { R, s, W, H, k, d, fg, acc } = o;
    c.globalAlpha = 0.62 * k; c.textAlign = 'right'; c.font = R.font(40 * s, 900);
    const w = c.measureText(d.line1 || '').width;
    c.fillStyle = acc; c.fillRect(W - 70 * s - w - 30 * s, H - 92 * s, 16 * s, 16 * s);
    c.fillStyle = fg; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8 * s; c.fillText(d.line1 || '', W - 70 * s, H - 84 * s);
  },
  calan(c, o) {
    const { R, s, H, k, t, d, fg, bg, acc } = o;
    c.font = R.font(36 * s, 800); const w1 = c.measureText(d.song || '').width; c.font = R.font(26 * s, 500); const w2 = c.measureText(d.artist || '').width;
    const w = Math.max(w1, w2, 200 * s) + 190 * s, h = 130 * s, x = 60 * s - (1 - k) * (w + 80 * s), y = H - 200 * s;
    c.fillStyle = bg; R.rr(c, x, y, w, h, 20 * s); c.fill();
    c.save(); c.translate(x + 66 * s, y + h / 2); c.rotate(t * 2.5); // plak
    c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, 44 * s, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 1.5 * s; for (const r of [20, 28, 36]) { c.beginPath(); c.arc(0, 0, r * s, 0, 7); c.stroke(); }
    c.fillStyle = acc; c.beginPath(); c.arc(0, 0, 13 * s, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(-2 * s, -30 * s, 4 * s, 10 * s); c.restore();
    c.fillStyle = acc; c.font = R.font(18 * s, 900); c.fillText('ŞİMDİ ÇALIYOR', x + 130 * s, y + 30 * s);
    for (let i = 0; i < 4; i++) { const bh = (6 + 12 * Math.abs(Math.sin(t * 6 + i))) * s; c.fillRect(x + 290 * s + i * 8 * s, y + 38 * s - bh, 5 * s, bh); }
    c.fillStyle = fg; c.font = R.font(36 * s, 800); c.fillText(d.song || '', x + 130 * s, y + 68 * s);
    c.globalAlpha *= 0.78; c.font = R.font(26 * s, 500); c.fillText(d.artist || '', x + 130 * s, y + 104 * s);
  },
  anket(c, o) {
    const { R, s, W, H, k, t, d, fg, bg, acc } = o; const rows = parseRows(d.options).slice(0, 5);
    const total = rows.reduce((a, r) => a + (Number(r[1]) || 0), 0) || 1;
    const w = 680 * s; c.font = R.font(38 * s, 800); const ql = TR.wrap(c, d.line1 || '', w - 80 * s).slice(0, 2);
    const h = (70 + ql.length * 48 + rows.length * 88 + 20) * s, x = W - w - 60 * s + (1 - k) * (w + 80 * s), y = (H - h) / 2;
    c.fillStyle = bg; R.rr(c, x, y, w, h, 24 * s); c.fill();
    c.fillStyle = acc; c.font = R.font(20 * s, 900); c.fillText('ANKET', x + 40 * s, y + 38 * s);
    c.fillStyle = fg; c.font = R.font(38 * s, 800); ql.forEach((l, i) => c.fillText(l, x + 40 * s, y + 84 * s + i * 48 * s));
    rows.forEach((r, i) => {
      const yy = y + (70 + ql.length * 48 + i * 88 + 30) * s, pct = (Number(r[1]) || 0) / total, g = R.ease((t - 0.3 - i * 0.12) / 0.8);
      c.fillStyle = 'rgba(255,255,255,0.08)'; R.rr(c, x + 40 * s, yy, w - 80 * s, 60 * s, 12 * s); c.fill();
      c.fillStyle = i === 0 ? acc : 'rgba(255,255,255,0.22)'; R.rr(c, x + 40 * s, yy, Math.max(24 * s, (w - 80 * s) * pct * g), 60 * s, 12 * s); c.fill();
      c.fillStyle = fg; c.font = R.font(28 * s, 700); c.textAlign = 'left'; c.fillText(r[0] || '', x + 62 * s, yy + 31 * s);
      c.textAlign = 'right'; c.font = R.font(28 * s, 900); c.fillText(`%${Math.round(pct * 100 * g)}`, x + w - 62 * s, yy + 31 * s); c.textAlign = 'left';
    });
  },
  ilerleme(c, o) {
    const { R, s, W, k, t, d, fg, bg, acc } = o; const cur = Number(d.current) || 0, goal = Math.max(1, Number(d.goal) || 1);
    const w = 900 * s, h = 120 * s, x = (W - w) / 2, y = 50 * s - (1 - k) * 200 * s, g = R.ease((t - 0.3) / 1.2), p = Math.min(1, cur / goal) * g;
    c.fillStyle = bg; R.rr(c, x, y, w, h, 22 * s); c.fill();
    c.fillStyle = fg; c.font = R.font(28 * s, 900); c.fillText(d.line1 || '', x + 36 * s, y + 38 * s);
    c.textAlign = 'right'; c.font = R.font(28 * s, 800); c.fillText(`${Math.round(cur * g).toLocaleString('tr-TR')} / ${goal.toLocaleString('tr-TR')}`, x + w - 36 * s, y + 38 * s); c.textAlign = 'left';
    c.fillStyle = 'rgba(255,255,255,0.1)'; R.rr(c, x + 36 * s, y + 66 * s, w - 72 * s, 30 * s, 15 * s); c.fill();
    const bw = Math.max(30 * s, (w - 72 * s) * p); const gg = c.createLinearGradient(x, 0, x + w, 0); gg.addColorStop(0, acc); gg.addColorStop(1, '#ffd23f');
    c.fillStyle = gg; R.rr(c, x + 36 * s, y + 66 * s, bw, 30 * s, 15 * s); c.fill();
    c.save(); R.rr(c, x + 36 * s, y + 66 * s, bw, 30 * s, 15 * s); c.clip(); const sx = x + 36 * s + ((t * 300 * s) % (bw + 200 * s)) - 100 * s;
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(sx, y + 66 * s); c.lineTo(sx + 40 * s, y + 66 * s); c.lineTo(sx + 10 * s, y + 96 * s); c.lineTo(sx - 30 * s, y + 96 * s); c.fill(); c.restore();
  },
  altyazi(c, o) {
    const { R, s, W, H, t, d, inp } = o;
    let text = '';
    if (d.srtCues && d.srtCues.length) { const cue = d.srtCues.find(q => t >= q.s && t <= q.e); text = cue ? cue.t : ''; }
    else { const rows = String(d.lines || '').split('\n').map(x => x.trim()).filter(Boolean); if (rows.length) text = rows[((d.itemIdx || 0) % rows.length + rows.length) % rows.length]; }
    if (text !== inp._subText) { inp._subText = text; inp._subT = t; }
    if (!text) return;
    const a = Math.min(1, (t - (inp._subT || 0)) / 0.2);
    const fs = (Number(d.size) || 46) * s; c.font = R.font(fs, 600);
    const lines = TR.wrap(c, text, W * 0.78).slice(0, 3), lh = fs * 1.32;
    c.textAlign = 'center'; c.globalAlpha = a;
    lines.forEach((l, i) => {
      const yy = H - 90 * s - (lines.length - 1 - i) * lh, tw = c.measureText(l).width + fs * 0.8;
      c.fillStyle = 'rgba(0,0,0,0.72)'; R.rr(c, W / 2 - tw / 2, yy - lh / 2, tw, lh, 8 * s); c.fill();
      c.fillStyle = d.textColor || '#fff'; c.fillText(l, W / 2, yy + 1 * s);
    });
  }
};
