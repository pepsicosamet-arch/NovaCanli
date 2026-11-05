"""Reklam filmi için özgün elektronik müzik (120 BPM, Am-F-C-G)."""
import numpy as np, sys, wave

SR = 48000
DUR = float(sys.argv[1]); OUT = sys.argv[2]
DROP, OUTRO = 5.0, DUR - 4.0
N = int(SR * DUR)
mix = np.zeros((N, 2))
drums = np.zeros((N, 2))
rng = np.random.default_rng(7)
BEAT = 0.5

def add(sig, t0, gain=1.0, pan=0.0, bus=None):
    bus = mix if bus is None else bus
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[:N - i].copy()
    f = min(len(sig), int(0.012 * SR))  # tıkırtı olmasın: kısa çıkış
    if f > 1: sig[-f:] *= np.linspace(1, 0, f)
    l, r = gain * (1 - max(0, pan)), gain * (1 + min(0, pan))
    bus[i:i + len(sig), 0] += sig * l
    bus[i:i + len(sig), 1] += sig * r

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def note(m): return 440 * 2 ** ((m - 69) / 12)

def saw(f, n, det=0.0):
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k in range(1, 14):
        if f * k > SR / 2.2: break
        s += np.sin(2 * np.pi * f * (1 + det) * k * t) / k
    return s * 0.6

def lowpass(x, a):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y

def lp_fast(x, a):  # vektörel tek kutuplu filtre (lfilter yok, blok ile)
    from numpy.lib.stride_tricks import sliding_window_view
    k = int(1 / a)
    k = max(1, k)
    return np.convolve(x, np.ones(k) / k, mode='same')

# Akorlar (her biri 1 ölçü = 2 sn)
CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
ROOT = [45, 41, 36, 43]

# Sidechain eğrisi (her vuruşta ses kısılır)
t = np.arange(N) / SR
side = np.ones(N)
beat_on = (t >= DROP) & (t < OUTRO)
ph = (t % BEAT) / BEAT
side[beat_on] = 0.35 + 0.65 * np.minimum(1, ph[beat_on] / 0.45)

# Pad
bar = 2.0
for b in range(int(np.ceil(DUR / bar))):
    t0 = b * bar
    n = int(bar * SR * 1.1)
    s = sum(saw(note(m), n, d) for m in CH[b % 4] for d in (-0.004, 0.004))
    s = lp_fast(s, 0.06) * env(n, 0.25, 6.0)
    fo = int(0.35 * SR); s[-fo:] *= np.linspace(1, 0, fo) ** 2
    add(s * 0.09, t0, pan=0.0)

# Kick, clap, hat, bas, arp
kick_n = int(0.4 * SR); kt = np.arange(kick_n) / SR
freq = 45 + 90 * np.exp(-kt * 30)
kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-kt * 9)
kick += 0.3 * rng.standard_normal(kick_n) * np.exp(-kt * 300)
clap_n = int(0.25 * SR)
clap = np.diff(rng.standard_normal(clap_n + 1)) * np.exp(-np.arange(clap_n) / SR * 22)
hat_n = int(0.05 * SR)
hat = np.diff(np.diff(rng.standard_normal(hat_n + 2))) * np.exp(-np.arange(hat_n) / SR * 90)

b = 0
tt = DROP
while tt < OUTRO - 1e-6:
    k = int(round((tt - DROP) / BEAT))
    add(kick, tt, 0.95, bus=drums)
    if k % 2 == 1: add(clap, tt, 0.22, pan=0.05, bus=drums)
    add(hat, tt + BEAT / 2, 0.10, pan=0.3, bus=drums)
    if tt > 15: add(hat, tt + BEAT / 4, 0.05, pan=-0.3, bus=drums); add(hat, tt + 3 * BEAT / 4, 0.05, pan=-0.3, bus=drums)
    # bas: 8'lik notalar
    ci = int(tt // bar) % 4
    for h in (0, BEAT / 2):
        n = int(BEAT / 2 * SR)
        s = lp_fast(saw(note(ROOT[ci]), n), 0.12) * env(n, 0.005, 0.18)
        add(s * 0.33, tt + h)
    # arp (15 sn sonrası)
    if 15 <= tt < OUTRO - 2:
        for q in range(4):
            m = CH[ci][(k * 4 + q) % 3] + 12 + (12 if q == 3 else 0)
            n = int(0.2 * SR); at = np.arange(n) / SR
            s = (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * note(m) * at)) * np.exp(-at * 14)
            add(s * 0.075, tt + q * BEAT / 4, pan=0.35 if q % 2 else -0.35)
    tt += BEAT

mix *= side[:, None]  # sidechain: kick vurunca diğer sesler kısılır

# Riser (intro sonu) ve darbe
rs = int(1.6 * SR); rt = np.arange(rs) / SR
riser = rng.standard_normal(rs) * (rt / rt[-1]) ** 2
riser = riser - lp_fast(riser, 1 / (60 - 55 * rt / rt[-1]).clip(4).mean())
add(riser * 0.18, DROP - 1.6)
imp_n = int(2.5 * SR); it = np.arange(imp_n) / SR
impact = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-it * 6)) / SR) * np.exp(-it * 2.2) * 0.8
crash = rng.standard_normal(imp_n) * np.exp(-it * 2.5)
crash = crash - lp_fast(crash, 0.25)
for at in (DROP,):
    add(impact, at, 0.7, bus=drums); add(crash * 0.12, at, bus=drums)
# sahne geçiş vurguları (hafif)
for at in [9, 15, 22.5, 28.5, 32.5, 38.5, 42.5, 47.5]:
    if at < OUTRO: add(crash[: int(0.8 * SR)] * 0.05, at)
# final akor
fn = int(4.0 * SR)
final = sum(saw(note(m), fn, d) for m in [57, 60, 64, 69] for d in (-0.003, 0.003))
add(lp_fast(final, 0.05) * env(fn, 0.02, 2.5) * 0.12, OUTRO)
add(impact[: int(2 * SR)] * 0.5, OUTRO)

mix += drums
# son: yumuşak kapanış, limiter
fade = np.ones(N); fl = int(1.5 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mix *= fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) / 0.89
pcm = (mix * 32767).astype('<i2')
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', OUT)
