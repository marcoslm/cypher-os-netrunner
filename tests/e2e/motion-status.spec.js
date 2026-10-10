'use strict';
const {test,expect}=require('./fixtures');
const state=page=>page.locator('#controls-motion-state');
const pref=(page,key)=>page.locator(`#controls-overlay [data-pref="${key}"]`);
const close=page=>page.locator('#controls-overlay .control-close').click();

test('movimiento F06: sistema reducido explica OFF local y mantiene avisos/transiciones estáticos',async({page,game})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await game.setup({state:{offers:[]}});
  await page.locator('#h-controls').click();
  await expect(pref(page,'animations')).toHaveAttribute('aria-pressed','true');
  await expect(pref(page,'reducedMotion')).toHaveAttribute('aria-pressed','false');
  await expect(state(page)).toHaveText('AVISOS Y TRANSICIONES: OFF · SISTEMA/NAVEGADOR');
  await expect(page.locator('#controls-motion')).toContainText('OFF local no anula');
  for(let i=0;i<2;i++) {
    await pref(page,'reducedMotion').click();
    await expect(state(page)).toContainText('OFF · SISTEMA/NAVEGADOR');
  }
  await page.screenshot({path:'test-results/motion-status-system.png'});
  await close(page);await page.locator('#h-snd').click();
  await expect(page.locator('#msg-text')).toHaveText('sonidos fx/ui activados.');
  expect(await page.locator('body').evaluate(()=>_msgTypeTimer)).toBeNull();
  await page.locator('.navbtn[data-view="contactos"]').click();
  expect(await page.locator('#panel-scroll').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('movimiento F06: distingue ajuste local, decoraciones OFF y escritura activa real',async({page,game})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await game.setup({state:{offers:[]}});
  await page.locator('#h-controls').click();await expect(state(page)).toContainText('ON · AJUSTES ACTIVOS');
  await pref(page,'reducedMotion').click();await expect(state(page)).toContainText('OFF · AJUSTE LOCAL');
  await pref(page,'reducedMotion').click();await pref(page,'animations').click();
  await expect(state(page)).toContainText('OFF · ANIMACIONES DESACTIVADAS');
  await close(page);await page.locator('#h-snd').click();await expect(page.locator('#msg-text')).toHaveText('sonidos fx/ui activados.');
  await page.locator('#h-controls').click();await pref(page,'animations').click();
  await expect(state(page)).toContainText('ON · AJUSTES ACTIVOS');await close(page);
  await page.locator('#h-snd').click();await expect(page.locator('#msg-text')).toBeEmpty();
  await page.clock.runFor(45);await expect(page.locator('#msg-text')).toHaveText('s');
  await page.clock.runFor(6000);await expect(page.locator('#msg-text')).toHaveText('sonidos fx/ui desactivados.');
});

test('movimiento F06: media cambia explicación sin reanunciar cada tick ni modificar progreso',async({page,game})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await game.setup({state:{offers:[]}});
  const before=await game.snapshot();await page.locator('#h-controls').click();
  await expect(state(page)).toContainText('OFF · SISTEMA/NAVEGADOR');
  // Instrumentación de observación: no reemplaza handlers ni timers del juego.
  await page.locator('body').evaluate(()=>{
    window.__motionUpdates=0;
    window.__motionObserver=new MutationObserver(records=>{window.__motionUpdates+=records.length;});
    window.__motionObserver.observe(document.getElementById('controls-motion-state'),{childList:true,subtree:true,characterData:true});
  });
  await page.clock.runFor(2000);
  expect(await page.locator('body').evaluate(()=>window.__motionUpdates)).toBe(0);
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(state(page)).toContainText('ON · AJUSTES ACTIVOS');
  const after=await game.snapshot();
  expect(after.state.player.credits).toBe(before.state.player.credits);expect(after.state.player.xp).toBe(before.state.player.xp);
  expect(after.state.jobs).toEqual(before.state.jobs);expect(after.immersion).toEqual(before.immersion);
  await page.locator('body').evaluate(()=>window.__motionObserver.disconnect());
});
