"""Bir HTML sahnesini kare kare (window.render(t)) çizip tek bir MP4'e kodlar.
Kullanım: python3 frames.py URL SÜRE ÇIKIŞ.mp4 [GENİŞLİK YÜKSEKLİK] [canvas]
'canvas' verilirse sadece #c tuvali alınır (daha hızlı), yoksa sayfa ekran görüntüsü."""
import asyncio, sys, subprocess, base64, os
from playwright.async_api import async_playwright

url, dur, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
w = int(sys.argv[4]) if len(sys.argv) > 4 else 1920
h = int(sys.argv[5]) if len(sys.argv) > 5 else 1080
canvas_only = len(sys.argv) > 6 and sys.argv[6] == 'canvas'
FPS = 30

async def main():
    tmp = out[:-4] + '.part.mp4'
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
                           '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), tmp],
                          stdin=subprocess.PIPE)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        page = await b.new_page(viewport={'width': w, 'height': h})
        await page.goto(url); await page.wait_for_timeout(400)
        await page.evaluate('document.fonts.ready')
        n = int(round(dur * FPS))
        for i in range(n):
            t = i / FPS
            if canvas_only:
                d = await page.evaluate(f"(render({t}), document.getElementById('c').toDataURL('image/jpeg', 0.92))")
                ff.stdin.write(base64.b64decode(d.split(',')[1]))
            else:
                await page.evaluate(f"render({t})")
                ff.stdin.write(await page.screenshot(type='jpeg', quality=92))
        await b.close()
    ff.stdin.close()
    if ff.wait() == 0: os.replace(tmp, out); print('ok', out)
    else: print('HATA', out); sys.exit(1)

asyncio.run(main())
