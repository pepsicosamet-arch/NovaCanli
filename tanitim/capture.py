"""NOVA Canlı reklam filmi için gerçek uygulama görüntüleri çeker.
- Arayüz ekran görüntüleri (1920x1080)
- Uygulamanın kendi kaydıyla program çıktısı (1080p webm)
"""
import asyncio, sys, json
from playwright.async_api import async_playwright

OUT = sys.argv[1]
MEDIA = '/home/claude/media'

async def pick(page, sel_add, files):
    async with page.expect_file_chooser() as fc:
        await page.click('#btn-add'); await page.click(f'[data-add={sel_add}]')
    await (await fc.value).set_files(files)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=[
            '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
            '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding'])
        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080}, permissions=['camera', 'microphone'], accept_downloads=True)
        page = await ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append(f'PAGEERROR: {e}'))
        await page.goto('http://localhost:8765/index.html')
        await page.wait_for_timeout(800)
        await page.mouse.click(5, 1070)  # ses bağlamını başlat

        # Kaynaklar: oynatma listesi (2 video), oyun videosu, kamera, mikrofon
        await pick(page, 'video', [f'{MEDIA}/klip_manzara.mp4', f'{MEDIA}/klip1_renkler.mp4'])
        await pick(page, 'video', [f'{MEDIA}/klip_oyun.mp4'])
        await page.click('#btn-add'); await page.click('[data-add=camera]')
        await page.wait_for_selector('.pick button'); await page.click('.pick button')
        await page.wait_for_timeout(500)
        await page.click('#btn-add'); await page.click('[data-add=mic]')
        await page.wait_for_selector('.pick button'); await page.click('.pick button')
        await page.wait_for_timeout(400)
        await page.evaluate("""(()=>{
          const N = __nova, I = () => N.S.inputs;
          const ren = (i, n) => { i.name = n; };
          ren(I()[2], 'Drone Çekimi'); ren(I()[3], 'Oyun Görüntüsü'); ren(I()[4], 'Kamera 1'); ren(I()[5], 'Mikrofon');
          ren(N.addTitle('altbant', {line1:'Samet Şahin', line2:'@xsametsahinx • NOVA Canlı'}), 'Alt Bant');
          ren(N.addTitle('kayan', {label:'CANLI', line1:'NOVA Canlı ile profesyonel yayın • Ücretsiz • YouTube, Twitch, Kick ve daha fazlası • @xsametsahinx'}), 'Kayan Yazı');
          ren(N.addTitle('skor', {teamA:'NOVA', scoreA:3, teamB:'RAKİP', scoreB:1, label:'3. TUR'}), 'Skor');
          ren(N.addTitle('saat'), 'Saat');
          ren(N.addTitle('sosyal', {line1:'@xsametsahinx', line2:'Instagram • TikTok • YouTube'}), 'Sosyal Medya');
          N.addReplay();
          // isim değişikliklerini kartlara yansıt
          document.querySelectorAll('#inputs .inp').forEach(el => { const i = N.S.inputs.find(x => x.id == el.dataset.id); el.querySelector('.nm').textContent = i.list && i.list.length>1 ? `${i.name}  (${i.idx+1}/${i.list.length})` : i.name; });
          window.__ids = Object.fromEntries(N.S.inputs.map(i => [i.name, i.id]));
        })()""")
        ids = await page.evaluate('window.__ids')
        print(json.dumps(ids, ensure_ascii=False))
        await page.wait_for_timeout(1500)

        ev = page.evaluate
        def J(x): return json.dumps(x, ensure_ascii=False)
        # --- Program kaydı başlasın
        async with page.expect_download(timeout=120000) as dl:
            await page.click('#btn-rec')
            # 0s: arka plan + tam ekran başlık overlay
            await ev(f"__nova.toggleOverlay(0, {ids['Tam Ekran Başlık']})")
            await page.wait_for_timeout(3000)
            # 3s: başlık kapanır, daire geçiş -> fraktal
            await ev("__nova.toggleOverlay(0)")
            await ev(f"(()=>{{__nova.S.previewId={ids['Drone Çekimi']}; __nova.transition('circle',1200)}})()")
            await page.wait_for_timeout(2500)
            await page.screenshot(path=f'{OUT}/ui_a.jpg', quality=92, type='jpeg')
            # 6s: alt bant
            await ev(f"__nova.toggleOverlay(1, {ids['Alt Bant']})")
            await page.wait_for_timeout(3000)
            # 9s: silme geçiş -> oyun, alt bant kapalı, kayan yazı + skor + saat
            await ev("__nova.toggleOverlay(1)")
            await ev(f"(()=>{{__nova.S.previewId={ids['Oyun Görüntüsü']}; __nova.transition('wipe',1000)}})()")
            await page.wait_for_timeout(900)
            await ev(f"__nova.toggleOverlay(2, {ids['Kayan Yazı']})")
            await ev(f"__nova.toggleOverlay(3, {ids['Skor']})")
            await page.wait_for_timeout(1800)
            await page.screenshot(path=f'{OUT}/ui_b.jpg', quality=92, type='jpeg')
            await page.wait_for_timeout(1300)
            # 13s: yakınlaş geçiş -> kamera, saat
            await ev("__nova.toggleOverlay(3)")
            await ev(f"(()=>{{__nova.S.previewId={ids['Drone Çekimi']}; __nova.transition('zoom',900)}})()")
            await page.wait_for_timeout(1000)
            await ev(f"__nova.toggleOverlay(3, {ids['Saat']})")
            await page.wait_for_timeout(2000)
            # 16s: push -> fraktal
            await ev(f"(()=>{{__nova.S.previewId={ids['Oyun Görüntüsü']}; __nova.transition('push',900)}})()")
            await page.wait_for_timeout(2500)
            # 18.5s: anlık tekrar (R) -> yavaş çekim
            await ev("__nova.toggleOverlay(2); __nova.toggleOverlay(3)")
            await page.keyboard.press('r')
            await page.wait_for_timeout(4500)
            await page.screenshot(path=f'{OUT}/ui_c.jpg', quality=92, type='jpeg')
            # 23s: fade -> renk klibi + sosyal
            await ev(f"(()=>{{const i=__nova.S.inputs.find(x=>x.id=={ids['Drone Çekimi']}); __nova.S.previewId=i.id; __nova.transition('dip',1000)}})()")
            await page.wait_for_timeout(1000)
            await ev(f"__nova.toggleOverlay(0, {ids['Sosyal Medya']})")
            await page.wait_for_timeout(3000)
            await page.click('#btn-rec')
        d = await dl.value
        await d.save_as(f'{OUT}/program.webm')

        # --- Arayüz görüntüleri
        await ev(f"__nova.toggleOverlay(1, {ids['Alt Bant']})")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f'{OUT}/ui_main.jpg', quality=92, type='jpeg')
        await page.click('[data-act=settings]'); await page.wait_for_timeout(300)
        await page.screenshot(path=f'{OUT}/ui_settings.jpg', quality=92, type='jpeg')
        await page.click('.tabs button >> nth=1'); await page.wait_for_timeout(200)
        await page.screenshot(path=f'{OUT}/ui_enc.jpg', quality=92, type='jpeg')
        await page.click('.m-foot button')
        await page.click('#btn-add'); await page.click('[data-add=title]')
        await page.wait_for_selector('.pick button'); await page.wait_for_timeout(300)
        await page.screenshot(path=f'{OUT}/ui_templates.jpg', quality=92, type='jpeg')
        await page.click('[data-close]')
        await page.dblclick(f'.inp[data-id="{ids["Drone Çekimi"]}"] .th'); await page.wait_for_timeout(200)
        await page.click('.tabs button >> text=Oynatma Listesi'); await page.wait_for_timeout(200)
        await page.screenshot(path=f'{OUT}/ui_playlist.jpg', quality=92, type='jpeg')
        await page.click('.m-foot button')
        rid = await ev("__nova.S.inputs.find(i=>i.type==='replay').id")
        await page.dblclick(f'.inp[data-id="{rid}"] .th'); await page.wait_for_timeout(200)
        await page.click('.tabs button >> text=Tekrar'); await page.wait_for_timeout(200)
        await page.screenshot(path=f'{OUT}/ui_replay.jpg', quality=92, type='jpeg')
        await page.click('.m-foot button')
        await page.click('[data-act=about]'); await page.wait_for_timeout(300)
        await page.screenshot(path=f'{OUT}/ui_about.jpg', quality=92, type='jpeg')
        print('stats', await ev("[document.querySelector('#st-fps').textContent, document.querySelector('#st-render').textContent, __nova.RP.frames.length]"))
        print('\n'.join(errs[:20]))
        await b.close()

asyncio.run(main())
