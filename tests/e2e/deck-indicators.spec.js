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
    await expect(page.locator('#heat-indicator .deck-mark')).toHaveText('‼');
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
