'use strict';
const {test,expect,makeImmersion,tabTo,downloadJSON}=require('./fixtures');
const toggle=page=>page.locator('#save-tools-toggle');
const dialog=page=>page.locator('#save-tools');

test('partida F05A: diálogo cerrado por defecto, anclado y operable con teclado sin cambiar progreso',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  const before=await game.snapshot();
  await expect(dialog(page)).toBeHidden();
  await expect(toggle(page)).toHaveAccessibleName('Opciones de partida');
  await expect(toggle(page)).toHaveAttribute('aria-haspopup','dialog');
  await expect(toggle(page)).toHaveAttribute('aria-expanded','false');
  for(const id of ['save','export','import','reset','intro'])await expect(page.locator('#btn-'+id)).toBeHidden();
  await tabTo(page,toggle(page));await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toHaveAttribute('role','dialog');
  await expect(toggle(page)).toHaveAttribute('aria-expanded','true');
  await page.waitForTimeout(250); /* la captura documenta el popover en reposo */
  await page.screenshot({path:'test-results/save-tools-open-desktop.png'});
  /* El orden del DOM lleva del botón PARTIDA al diálogo y de vuelta. */
  await page.keyboard.press('Tab');await expect(page.locator('#save-tools-close')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#btn-save')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.locator('#save-tools-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(toggle(page)).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog(page)).toBeHidden();
  await expect(toggle(page)).toBeFocused();
  await page.keyboard.press('Enter');await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Space');await expect(dialog(page)).toBeHidden();
  await expect(toggle(page)).toHaveAttribute('aria-expanded','false');
  const after=await game.snapshot();
  expect(after.immersion).toEqual(before.immersion);expect(after.state.jobs).toEqual(before.state.jobs);
  expect(after.state.player).toEqual(before.state.player);
});

test('partida F05A: el ✕ y un clic fuera cierran; Escape vuelve al botón',async({page,game})=>{
  await game.setup({state:{offers:[]}});
  await game.openSaveTools();
  await expect(dialog(page)).toBeVisible();
  /* El ✕ cierra y devuelve el foco a PARTIDA. */
  await page.locator('#save-tools-close').click();
  await expect(dialog(page)).toBeHidden();await expect(toggle(page)).toBeFocused();
  /* Clic fuera: navega (acción propia) y además cierra el diálogo. */
  await game.openSaveTools();
  await page.locator('.navbtn[data-view="registro"]').click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('#panel-scroll h1')).toHaveText('REGISTRO');
  await game.openSaveTools();await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();await expect(toggle(page)).toBeFocused();
});

test('partida F05A: Ctrl+S, guardar/exportar/importar y RESET conservan sus flujos reales',async({page,game})=>{
  await game.setup({immersion:makeImmersion({loaded:true}),state:{offers:[]},player:{credits:1234}});
  const expected=await game.snapshot();
  await page.keyboard.press('Control+s');await game.expectMessage('partida guardada');
  expect((await game.snapshot()).saved._inImmersion).toEqual(expected.immersion);
  await expect(dialog(page)).toBeHidden();
  /* Cada opción cierra el diálogo al activarse, como un menú. */
  await game.openSaveTools();await page.locator('#btn-save').click();
  await expect(dialog(page)).toBeHidden();await game.expectMessage('guardada a mano');
  await game.openSaveTools();
  const download=page.waitForEvent('download');await page.locator('#btn-export').click();
  await expect(dialog(page)).toBeHidden();
  const exported=await downloadJSON(await download);expect(exported._inImmersion).toEqual(expected.immersion);
  await game.importFile(exported,'partida-f05a.json');await game.expectMessage('de vuelta en el grid');
  const imported=await game.snapshot();
  expect(imported.immersion).toEqual(expected.immersion);expect(imported.state.player).toEqual(expected.state.player);
  await game.openSaveTools();
  await page.locator('#btn-reset').click();await expect(dialog(page)).toBeHidden();
  await page.locator('#confirm-overlay [data-action="confirmNo"]').click();
  expect((await game.snapshot()).raw).toBe(imported.raw);
  await game.openSaveTools();
  await page.locator('#btn-reset').click();
  await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  expect((await game.snapshot()).immersion).toBeNull();expect((await game.snapshot()).state.player.credits).toBe(500);
  await expect(dialog(page)).toBeHidden();
  await game.reload();await expect(dialog(page)).toBeHidden();
});

test('partida F05A: combate congela el diálogo del fondo inerte y Ctrl+S sigue disponible',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});await game.openSaveTools();
  await game.startCombat();const before=await game.snapshot();let choosers=0;
  page.on('filechooser',()=>{choosers++;});
  for(const id of ['save-tools-toggle','btn-reset','btn-import']) {
    const box=await page.locator('#'+id).boundingBox();expect(box).not.toBeNull();
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    await expect(page.locator('#combat')).toBeVisible();await expect(page.locator('#confirm-overlay')).toBeHidden();
  }
  await expect(dialog(page)).toBeVisible();expect(choosers).toBe(0);
  await page.keyboard.press('Control+s');await game.expectMessage('partida guardada');
  expect((await game.snapshot()).state.player.credits).toBe(before.state.player.credits);
  expect((await game.snapshot()).saved._inImmersion).toEqual(before.immersion);
});

test.describe('partida F05A: táctil y texto ampliado',()=>{
  test.use({hasTouch:true});
  for(const viewport of [{width:1024,height:600},{width:320,height:800}]) {
    test(`${viewport.width}px: el lateral no desborda, el diálogo cabe y cierra solo`,async({page,game})=>{
      await page.setViewportSize(viewport);await game.setup({state:{offers:[]}});
      const fits=await page.locator('#sidebar').evaluate(el=>el.scrollHeight<=el.clientHeight+1);
      expect(fits).toBe(true);
      await page.addStyleTag({content:'#sidebar .navbtn{font-size:18px;}'});
      const state=await game.snapshot();
      await expect(dialog(page)).toBeHidden();
      /* El menú abierto ya no añade filas al lateral: su scroll no cambia. */
      const closedHeight=await page.locator('#sidebar').evaluate(el=>el.scrollHeight);
      await toggle(page).tap();await expect(dialog(page)).toBeVisible();
      expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight)).toBe(closedHeight);
      /* El diálogo cabe entero en el viewport, con etiquetas legibles. */
      const box=await dialog(page).boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
      await expect(page.locator('#btn-save .lbl')).toHaveText('GUARDAR');
      await page.waitForTimeout(250); /* la captura documenta el popover en reposo */
      await page.screenshot({path:`test-results/save-tools-open-${viewport.width}.png`});
      /* Activar una opción lo cierra automáticamente. */
      await page.locator('#btn-save').tap();
      await expect(dialog(page)).toBeHidden();
      await game.expectMessage('guardada a mano');
      await toggle(page).tap();await page.locator('#btn-reset').tap();
      await expect(dialog(page)).toBeHidden();
      await expect(page.locator('#confirm-overlay')).toBeVisible();
      await page.locator('#confirm-overlay [data-action="confirmNo"]').tap();
      expect((await game.snapshot()).state.player).toEqual(state.state.player);
      /* El ✕ y la segunda pulsación de PARTIDA también cierran. */
      await toggle(page).tap();await page.locator('#save-tools-close').tap();
      await expect(dialog(page)).toBeHidden();
      await toggle(page).tap();await expect(dialog(page)).toBeVisible();
      await toggle(page).tap();await expect(dialog(page)).toBeHidden();
      await toggle(page).tap();await expect(dialog(page)).toBeVisible();
      await page.locator('#topbar').tap({position:{x:2,y:2}});
      await expect(dialog(page)).toBeHidden();
      await page.screenshot({path:`test-results/save-tools-${viewport.width}.png`});
    });
  }
});
