'use strict';
const {test,expect,tabTo}=require('./fixtures');
const panel=page=>page.locator('#controls-overlay');
const pref=(page,key)=>panel(page).locator(`[data-pref="${key}"]`);
const slider=(page,key)=>page.locator('#control-'+key);
async function rangeValue(page,key,value){
  const el=slider(page,key);await tabTo(page,el);
  await page.keyboard.press('Home');
  const step=Number(await el.getAttribute('step')),min=Number(await el.getAttribute('min'));
  for(let i=min;i<value;i+=step)await page.keyboard.press('ArrowRight');
  await expect(el).toHaveValue(String(value));
}
async function settings(page){return page.evaluate(()=>JSON.parse(JSON.stringify({prefs:_deckPrefs,brillo:_brillo})));}

test('configuración desde intro: sliders nativos, mute antes de BIOS y foco restaurado',async({page,game})=>{
  const opener=page.locator('#intro [data-action="openControls"]');await opener.click();
  await expect(panel(page)).toBeVisible();await expect(page.locator('#intro')).toHaveJSProperty('inert',true);
  await expect(panel(page).locator('.control-close')).toBeFocused();
  await rangeValue(page,'fxVolume',35);await pref(page,'snd').click();
  await rangeValue(page,'brillo',120);
  expect((await game.snapshot()).state).toBeNull();
  expect((await panel(page).locator('.control-panel').boundingBox()).width).toBe(800);
  await panel(page).screenshot({path:'.cache/controls-desktop.png'});
  await page.keyboard.press('Escape');await expect(opener).toBeFocused();
  await game.boot();await expect(page.locator('#h-snd')).toHaveAttribute('aria-pressed','false');
  expect(await settings(page)).toMatchObject({prefs:{snd:false,fxVolume:35},brillo:1.2});
  await game.reload();expect(await settings(page)).toMatchObject({prefs:{snd:false,fxVolume:35},brillo:1.2});
});

test('iconos rápidos: teclado, sincronización con modal y volumen recordado tras mute',async({page,game})=>{
  await game.setup();await page.locator('#h-controls').click();await rangeValue(page,'musVolume',35);
  await pref(page,'mus').click();await expect(page.locator('#h-mus')).toHaveClass(/is-on/);
  await expect(page.locator('#h-mus svg')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await tabTo(page,page.locator('#h-mus'));await page.keyboard.press('Space');
  await expect(page.locator('#h-mus')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#h-mus')).not.toHaveClass(/is-on/);
  await page.keyboard.press('Enter');await expect(page.locator('#h-mus')).toHaveAttribute('aria-pressed','true');
  await page.locator('#h-controls').click();await expect(slider(page,'musVolume')).toHaveValue('35');
  await expect(pref(page,'mus')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#topbar [data-action="lumDown"]')).toHaveCount(0);
  await expect(page.locator('#topbar #h-brillo')).toHaveCount(0);
});

test('panel: Tab contenido, guardar disponible, atajos bloqueados y reloj sin pausa',async({page,game})=>{
  await game.setup({player:{heat:50}});const view=(await game.snapshot()).view;
  await page.locator('#h-controls').click();const first=panel(page).locator('.control-close');const last=panel(page).locator('footer [data-action="closeControls"]');
  await expect(first).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(last).toBeFocused();
  await page.keyboard.press('Tab');await expect(first).toBeFocused();
  for(const key of ['Control+k','Control+g','Control+3'])await page.keyboard.press(key);
  await expect(first).toBeFocused();expect((await game.snapshot()).view).toBe(view);expect((await game.snapshot()).immersion).toBeNull();
  const before=await game.snapshot();await page.clock.runFor(2000);const after=await game.snapshot();
  expect(after.state.clock).toBe((before.state.clock+2)%1440);expect(after.state.player.heat).toBeLessThan(before.state.player.heat);
  await page.keyboard.press('Control+s');expect((await game.snapshot()).saved.player.heat).toBe(after.state.player.heat);
  await page.keyboard.press('Escape');await expect(page.locator('#h-controls')).toBeFocused();
  await expect(page.locator('#os')).toHaveJSProperty('inert',false);
});

test('importar y RESET mantienen audio, volúmenes y display del dispositivo',async({page,game})=>{
  await game.setup({player:{credits:4321}});const incoming=(await game.snapshot()).saved;
  incoming.snd=true;incoming.amb=true;incoming.mus=true;
  await page.locator('#h-controls').click();await rangeValue(page,'musVolume',35);await rangeValue(page,'ambVolume',20);await rangeValue(page,'brillo',130);
  for(const key of ['crt','glow','animations'])await pref(page,key).click();
  const before=await settings(page);await page.keyboard.press('Escape');await game.importFile(incoming);
  expect(await settings(page)).toEqual(before);
  await game.openSaveTools();
  await page.locator('#btn-reset').click();await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  expect((await game.snapshot()).state.player.credits).toBe(500);expect(await settings(page)).toEqual(before);
  await game.reload();expect(await settings(page)).toEqual(before);
});

test('restablecer solo preferencias: confirmación anidada y foco de vuelta',async({page,game})=>{
  await game.setup({player:{credits:4321,level:4}});await page.locator('#h-controls').click();
  await rangeValue(page,'musVolume',35);await rangeValue(page,'brillo',70);await pref(page,'crt').click();
  const reset=panel(page).locator('[data-action="resetControls"]');await reset.click();
  await expect(panel(page)).toHaveJSProperty('inert',true);await expect(page.locator('#confirm-overlay [data-action="confirmYes"]')).toBeFocused();
  await page.keyboard.press('Escape');await expect(reset).toBeFocused();await expect(slider(page,'musVolume')).toHaveValue('35');
  await reset.click();await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  await expect(reset).toBeFocused();await expect(slider(page,'musVolume')).toHaveValue('100');await expect(slider(page,'brillo')).toHaveValue('100');
  await expect(pref(page,'crt')).toHaveAttribute('aria-pressed','true');
  expect((await game.snapshot()).state.player).toMatchObject({credits:4321,level:4});
});

test('movimiento reducido mantiene señales y escáner funcional, panel bloqueado en combate',async({page,game})=>{
  await game.setup();await page.locator('#h-controls').click();await pref(page,'reducedMotion').click();
  await expect(page.locator('html')).toHaveClass(/motion-off/);await pref(page,'glow').click();await pref(page,'crt').click();
  await expect(page.locator('body')).toHaveCSS('animation-name','none');
  expect(await page.evaluate(()=>getComputedStyle(document.body,'::before').display)).toBe('none');
  await page.keyboard.press('Escape');await page.locator('#h-snd').click();
  await expect(page.locator('#msg-text')).toHaveText('sonidos fx/ui activados.');
  await expect(page.locator('#msg-cursor')).toHaveCSS('animation-name','none');
  await game.startCombat({tier:3});await expect(page.locator('#os')).toHaveJSProperty('inert',true);
  await page.clock.runFor(1000);const first=await page.locator('#scanLine').evaluate(el=>Number.parseFloat(el.style.left));
  const time=await page.locator('#timerLbl').textContent();await page.clock.runFor(1000);
  const second=await page.locator('#scanLine').evaluate(el=>Number.parseFloat(el.style.left));expect(second).toBeGreaterThan(first);
  expect(await page.locator('#timerLbl').textContent()).not.toBe(time);
  await page.keyboard.press('Control+k');await expect(panel(page)).toBeHidden();
  expect(await page.evaluate(()=>combatActive)).toBe(true);
});

test('preferencia del sistema tiene prioridad y se aplica desde intro y BIOS',async({page,game})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#intro [data-action="openControls"]').click();
  await expect(page.locator('#controls-motion')).toContainText('sistema activo');
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  await page.keyboard.press('Escape');await page.locator('#intro-start').click();
  await expect(page.locator('#boot-body .line').first()).toBeVisible();
  await game.skipBoot();await expect(page.locator('html')).toHaveClass(/motion-off/);
});

test.describe('móvil con pantalla táctil',()=>{
  test.use({hasTouch:true});
  test('375 px: barra sin desbordar, modal desplazable y sliders táctiles',async({page,game})=>{
  await page.setViewportSize({width:375,height:667});await game.setup();await page.locator('#h-controls').tap();
  expect(await page.locator('#topbar').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  expect(await panel(page).locator('.control-panel').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.locator('#control-ambVolume').tap();await expect(slider(page,'ambVolume')).not.toHaveValue('100');
  await expect(pref(page,'amb')).toHaveAttribute('aria-pressed','false');
  await panel(page).locator('footer [data-action="closeControls"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'.cache/controls-mobile.png'});
  await panel(page).locator('footer [data-action="closeControls"]').tap();await expect(panel(page)).toBeHidden();
  await page.setViewportSize({width:320,height:480});await page.locator('#h-controls').tap();
  expect(await page.locator('#topbar').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  expect(await panel(page).locator('.control-panel').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await panel(page).locator('footer [data-action="closeControls"]').scrollIntoViewIfNeeded();
  await panel(page).locator('footer [data-action="closeControls"]').tap();await expect(panel(page)).toBeHidden();
  });
});

test('pantalla completa: icono sincronizado con el estado real del navegador',async({page,game})=>{
  await game.setup();test.skip(!await page.evaluate(()=>fsSupported()),'API no disponible en este navegador.');
  const button=page.locator('#h-fs');await expect(button).toHaveAttribute('aria-pressed','false');
  await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
  await button.click();await expect(button).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();
});
