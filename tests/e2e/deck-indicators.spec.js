'use strict';
const {test,expect,makeImmersion}=require('./fixtures');
for(const width of [320,375,720,1024,1280]) {
  test(`deck: CPU/calor/RAM visibles y señales estables a ${width}px`,async({page,game})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width,height:800});
    await game.setup({immersion:makeImmersion(),player:{cpu:80,maxCpu:200,heat:40},state:{offers:[]}});
    const ids=['cpu-indicator','heat-indicator','ram-indicator'];
    for(const id of ids) await expect(page.locator('#'+id)).toBeVisible();
    await expect(page.locator('#cpu-indicator')).toHaveAttribute('data-state','warning');
    const before=await page.locator('#topbar').boundingBox();
    // Estado de riesgo preparado; el refresco usa el flujo normal existente.
    await page.evaluate(()=>{S.player.cpu=40;S.player.heat=80;inImmersion.dataUsed=ramCap();updateTopbar();});
    await expect(page.locator('#cpu-indicator')).toHaveAttribute('data-state','critical');
    await expect(page.locator('#heat-indicator')).toHaveAttribute('data-state','critical');
    await expect(page.getByRole('group',{name:'CPU 40 de 200 · integridad crítica',exact:true})).toBeVisible();
    await expect(page.locator('#cpu-indicator .deck-mark')).toHaveText('‼');
    await expect(page.locator('#heat-indicator .deck-mark')).toHaveCount(0);
    await expect(page.locator('#heat-indicator')).toHaveText('CALOR 80');
    const heatStyle=await page.locator('#heat-indicator').evaluate(el=>{
      const s=getComputedStyle(el);return {border:s.borderTopColor,background:s.backgroundColor,box:s.boxShadow,glow:s.textShadow,animation:s.animationName};
    });
    expect(heatStyle.border).toBe('rgba(0, 0, 0, 0)');expect(heatStyle.background).toBe('rgba(0, 0, 0, 0)');
    expect(heatStyle.box).toBe('none');expect(heatStyle.glow).not.toBe('none');expect(heatStyle.animation).toBe('none');
    await expect(page.locator('#ram-indicator')).toHaveAttribute('data-state','full');
    await expect(page.locator('#ram-indicator .deck-mark')).toHaveText('LLENA');
    const after=await page.locator('#topbar').boundingBox();
    expect(after.height).toBeCloseTo(before.height,2);
    const layout=await page.evaluate(()=>({
      width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      chips:['cpu-indicator','heat-indicator','ram-indicator'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,right:r.right};})
    }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.width);
    for(const chip of layout.chips){expect(chip.x).toBeGreaterThanOrEqual(0);expect(chip.right).toBeLessThanOrEqual(width);}
    await page.screenshot({path:`test-results/deck-indicators-${width}.png`});
  });
}

test('calor: glow rojo pulsante, sin caja ni símbolos, respeta preferencias visuales',async({page,game})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await game.setup({player:{heat:85},state:{offers:[]}});
  const heat=page.locator('#heat-indicator');
  await expect(heat).toHaveCSS('animation-name','heatGlowPulse');
  await expect(heat).toHaveCSS('box-shadow','none');
  await expect(heat.locator('.deck-mark')).toHaveCount(0);
  const phases=await heat.evaluate(el=>{
    const a=el.getAnimations()[0];a.pause();a.currentTime=0;
    const low=getComputedStyle(el).textShadow;a.currentTime=800;
    const high=getComputedStyle(el).textShadow;a.play();return {low,high};
  });
  expect(phases.low).not.toBe(phases.high);
  await page.locator('#h-controls').click();
  const pref=key=>page.locator('#controls-overlay [data-pref="'+key+'"]');
  await pref('animations').click();await expect(heat).toHaveCSS('animation-name','none');
  expect(await heat.evaluate(el=>getComputedStyle(el).textShadow)).not.toBe('none');
  await pref('animations').click();await expect(heat).toHaveCSS('animation-name','heatGlowPulse');
  await pref('glow').click();await expect(heat).toHaveCSS('text-shadow','none');await expect(heat).toHaveCSS('animation-name','none');
  await pref('glow').click();await expect(heat).toHaveCSS('animation-name','heatGlowPulse');
  await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(heat).toHaveCSS('animation-name','none');
  expect(await heat.evaluate(el=>getComputedStyle(el).textShadow)).not.toBe('none');
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(heat).toHaveCSS('animation-name','heatGlowPulse');
  await page.evaluate(()=>{S.player.heat=40;updateTopbar();});
  await expect(heat).toHaveAttribute('data-state','warning');await expect(heat).toHaveCSS('animation-name','none');
  await page.screenshot({path:'test-results/heat-glow-warning.png'});
});
