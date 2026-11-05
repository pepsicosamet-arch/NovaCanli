// ffmpeg argüman üreticileri (yayın + kayıt). Ayrı dosya: test edilebilsin diye.

const ENC_OPTS = {
  libx264: (preset) => ['-preset', preset || 'veryfast', '-tune', 'zerolatency', '-profile:v', 'high'],
  h264_nvenc: () => ['-preset', 'p4', '-tune', 'll', '-rc', 'cbr'],      // NVIDIA
  h264_qsv: () => ['-preset', 'veryfast'],                                // Intel
  h264_amf: () => ['-usage', 'lowlatency', '-rc', 'cbr']                  // AMD
};

function inputArgs() {
  return ['-hide_banner', '-loglevel', 'info', '-stats',
    '-fflags', '+genpts', '-thread_queue_size', '1024', '-i', 'pipe:0'];
}

function videoEncode(cfg, kbps, forStream) {
  const enc = ENC_OPTS[cfg.encoder] ? cfg.encoder : 'libx264';
  const fps = Number(cfg.fps) || 30;
  const a = ['-c:v', enc, ...ENC_OPTS[enc](cfg.preset),
    '-b:v', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`,
    '-r', String(fps), '-fps_mode', 'cfr', '-g', String(fps * 2), '-pix_fmt', 'yuv420p'];
  if (forStream && enc === 'libx264') a.push('-x264-params', 'nal-hrd=cbr');
  return a;
}

function audioEncode(cfg) {
  return ['-c:a', 'aac', '-b:a', `${Number(cfg.abitrate) || 160}k`, '-ar', '48000', '-ac', '2'];
}

function joinUrl(t) {
  const url = String(t.url || '').trim().replace(/\/+$/, '');
  const key = String(t.key || '').trim();
  if (!url) return null;
  if (!key) return url;
  return `${url}/${key}`;
}

// cfg: { targets:[{name,url,key,enabled}], encoder, preset, vbitrate, abitrate, fps }
function streamArgs(cfg) {
  const urls = (cfg.targets || []).filter(t => t.enabled !== false).map(joinUrl).filter(Boolean);
  if (!urls.length) return null;
  const a = [...inputArgs(), '-map', '0:v:0', '-map', '0:a:0?',
    ...videoEncode(cfg, Number(cfg.vbitrate) || 4500, true), ...audioEncode(cfg)];
  if (urls.length === 1) {
    a.push('-f', 'flv', urls[0]);
  } else {
    // Çoklu yayın: aynı kodlama birden fazla platforma (YouTube + Twitch + Kick ...)
    a.push('-flags', '+global_header', '-f', 'tee',
      urls.map(u => `[f=flv:onfail=ignore]${u.replace(/([|\[\]])/g, '\\$1')}`).join('|'));
  }
  return a;
}

// cfg: { mode:'copy'|'encode', inputCodec:'h264'|'vp8'|'vp9', format:'mp4'|'mkv', encoder, recbitrate, abitrate, fps }
function recordArgs(cfg, file) {
  const a = [...inputArgs(), '-map', '0:v:0', '-map', '0:a:0?'];
  const canCopy = cfg.mode === 'copy' && (cfg.inputCodec === 'h264' || cfg.format === 'mkv');
  if (canCopy) a.push('-c:v', 'copy');
  else a.push(...videoEncode(cfg, Number(cfg.recbitrate) || 12000, false));
  a.push(...audioEncode(cfg));
  if ((cfg.format || 'mp4') === 'mp4') a.push('-movflags', '+faststart');
  a.push('-y', file);
  return a;
}

module.exports = { streamArgs, recordArgs, joinUrl };
