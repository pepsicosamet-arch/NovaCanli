# NOVA Canlı

**vMix tarzı, ücretsiz canlı yayın ve prodüksiyon programı (Windows).**
Kamera, ekran, oyun, video ve grafikleri karıştır; YouTube, Twitch, Kick, Facebook ve TikTok'a aynı anda yayın yap.

Geliştirici: **Samet Şahin (@xsametsahinx)**

[![Windows Setup.exe](https://github.com/pepsicosamet-arch/NovaCanli/actions/workflows/build.yml/badge.svg)](https://github.com/pepsicosamet-arch/NovaCanli/actions/workflows/build.yml)

## 🎬 Tanıtım filmi

[![NOVA Canlı tanıtım](docs/onizleme.gif)](docs/NOVA-Canli-Tanitim.mp4)

▶ **[Tanıtım filmini izle (53 sn, 1080p)](docs/NOVA-Canli-Tanitim.mp4)**

![NOVA Canlı arayüzü](docs/ekran.jpg)

## ⬇️ İndir

**[Son sürümü indir → Releases](https://github.com/pepsicosamet-arch/NovaCanli/releases/latest)** — `NOVA-Canli-Setup-x.x.x.exe` dosyasını indirip kur. ffmpeg içinde gelir, ek bir şey kurman gerekmez.

## ✨ Özellikler

| Bölüm | Neler var |
|---|---|
| Kaynaklar | Kamera / yakalama kartı, ekran / pencere / oyun yakalama (+ sistem sesi), video ve **oynatma listesi**, resim/logo, renk & degrade arka plan, mikrofon, müzik dosyası, **anlık tekrar**. Sürükle-bırak ile ekleme. |
| Önizleme / Program | vMix tarzı iki monitör. KES, OTOMATİK, T-bar ile elle geçiş, 4 hızlı geçiş butonu, FTB (siyaha karart). |
| Geçişler | Fade, Siyaha, Beyaza, Silme, Kaydır, İt, Yakınlaş, Daire — süre ayarlı. |
| Overlay | 4 overlay kanalı (F1–F4): alt yazı, logo, resim içinde resim (PIP), yeşil perdeli kamera. |
| Grafikler | Alt bant (klasik/modern), tam ekran başlık, kayan haber bandı, saat-tarih, geri sayım, kronometre, skor tabelası, sosyal medya kutusu. Renkler düzenlenebilir, giriş animasyonlu. |
| Anlık tekrar | Program çıktısının son 15–60 saniyesi hafızada; `R` tuşu son anı yakalar ve 0.25x–1x yavaş çekimle yayına alır. |
| Görüntü | Konum/boyut, kırpma, sığdır/doldur/esnet, parlaklık-kontrast-doygunluk, opaklık, ayna, **yeşil perde (GPU chroma key)**. |
| Ses mikseri | Kanal başına fader, sustur, AFV (ses görüntüyü izlesin), kompresör, peak-hold VU metreler, master, kulaklıktan dinleme. |
| Yayın | RTMP/RTMPS: YouTube, Twitch, Kick, Facebook, Instagram, TikTok, özel sunucu. **Aynı anda çoklu platform.** |
| Kodlama | x264 (işlemci), NVIDIA NVENC, Intel QuickSync, AMD AMF; bit hızı/ön ayar seçimi. |
| Kayıt | MP4 veya MKV, hızlı (kopyala) ya da yeniden kodlama modu; yayınla aynı anda kayıt. |
| Diğer | 1080p / 720p / 1440p / dikey 9:16 (TikTok-Reels), 25/30/50/60 fps, harici çıkış penceresi (projeksiyon / 2. monitör), PNG fotoğraf, proje kaydet/aç (`.nova`). |

## ⌨️ Kısayollar

`Enter` Kes • `Boşluk` Otomatik geçiş • `1–9` Önizlemeye al • `Shift+1–9` Direkt programa • `Ctrl+1–9` Hızlı geçiş • `F1–F4` Overlay • `B` FTB • `R` Anlık tekrar • `Ctrl+R` Kayıt • `Ctrl+S` Kaydet • `Ctrl+O` Aç • `F12` Fotoğraf

## 🛠️ Kaynak koddan çalıştırma

1. [Node.js LTS](https://nodejs.org) kur.
2. **`1_KUR_VE_CALISTIR.bat`** → paketleri indirir ve programı açar.
3. **`2_SETUP_EXE_OLUSTUR.bat`** → `dist\NOVA-Canli-Setup-x.x.x.exe` oluşturur.

X

## Teknik yapı

- `src/main.js` — Electron ana süreç: pencere, ekran yakalama listesi, dosya diyalogları, `nova://` medya sunucusu (video sarma destekli), ffmpeg süreç yönetimi.
- `src/ffargs.js` — yayın/kayıt ffmpeg komutları (tek ve çoklu yayın, `tee`).
- `src/renderer/js/app.js` — mikser motoru: Worker zamanlayıcılı sabit fps kompozisyon, geçişler, overlay'ler, anlık tekrar, oynatma listesi, Web Audio ses mikseri, MediaRecorder → ffmpeg çıkışı, arayüz.
- `src/renderer/js/titles.js` — grafik şablonları. Yeni şablon için `TITLE_TEMPLATES` + `render()` içine bir `case` ekle.
- `src/renderer/js/chroma.js` — WebGL yeşil perde.

Akış: kaynaklar → canvas (program) → `captureStream` + Web Audio master → MediaRecorder (WebM parçaları) → ffmpeg → RTMP / MP4.

---
© Samet Şahin — Instagram, TikTok, YouTube, X: **@xsametsahinx**
