'use strict';
const {test,expect,makeImmersion,tabTo,downloadJSON}=require('./fixtures');
const summary=page=>page.locator('#save-tools-toggle');

test('partida F05A: bloque cerrado por defecto y despliegue nativo por teclado sin cambiar progreso',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  const before=await game.snapshot();
  await expect(page.locator('#save-tools')).not.toHaveAttribute('open','');
  await expect(summary(page)).toHaveAccessibleName('Opciones de partida');
  for(const id of ['save','export','import','reset'])await expect(page.locator('#btn-'+id)).toBeHidden();
  await tabTo(page,summary(page));await page.keyboard.press('Enter');
  await expect(page.locator('#save-tools')).toHaveAttribute('open','');
  await page.keyboard.press('Tab');await expect(page.locator('#btn-save')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(summary(page)).toBeFocused();
  await page.keyboard.press('Space');await expect(page.locator('#btn-save')).toBeHidden();
  const after=await game.snapshot();
  expect(after.immersion).toEqual(before.immersion);expect(after.state.jobs).toEqual(before.state.jobs);
  expect(after.state.player).toEqual(before.state.player);
});

test('partida F05A: Ctrl+S plegado, guardar/exportar/importar y RESET conservan sus flujos reales',async({page,game})=>{
  await game.setup({immersion:makeImmersion({loaded:true}),state:{offers:[]},player:{credits:1234}});
  const expected=await game.snapshot();
  await page.keyboard.press('Control+s');await game.expectMessage('partida guardada');
  expect((await game.snapshot()).saved._inImmersion).toEqual(expected.immersion);
  await expect(page.locator('#save-tools')).not.toHaveAttribute('open','');
  await game.openSaveTools();await page.locator('#btn-save').click();await game.expectMessage('guardada a mano');
  const download=page.waitForEvent('download');await page.locator('#btn-export').click();
  const exported=await downloadJSON(await download);expect(exported._inImmersion).toEqual(expected.immersion);
  await game.importFile(exported,'partida-f05a.json');await game.expectMessage('de vuelta en el grid');
  const imported=await game.snapshot();
  expect(imported.immersion).toEqual(expected.immersion);expect(imported.state.player).toEqual(expected.state.player);
  await page.locator('#btn-reset').click();await page.locator('#confirm-overlay [data-action="confirmNo"]').click();
  expect((await game.snapshot()).raw).toBe(imported.raw);
  await page.locator('#btn-reset').click();await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  expect((await game.snapshot()).immersion).toBeNull();expect((await game.snapshot()).state.player.credits).toBe(500);
  await game.reload();await expect(page.locator('#save-tools')).not.toHaveAttribute('open','');
});

test('partida F05A: combate mantiene el bloque abierto del fondo inerte y Ctrl+S disponible',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});await game.openSaveTools();
  await game.startCombat();const before=await game.snapshot();let choosers=0;
  page.on('filechooser',()=>{choosers++;});
  for(const id of ['save-tools-toggle','btn-reset','btn-import']) {
    const box=await page.locator('#'+id).boundingBox();expect(box).not.toBeNull();
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    await expect(page.locator('#combat')).toBeVisible();await expect(page.locator('#confirm-overlay')).toBeHidden();
  }
  await expect(page.locator('#save-tools')).toHaveAttribute('open','');expect(choosers).toBe(0);
  await page.keyboard.press('Control+s');await game.expectMessage('partida guardada');
  expect((await game.snapshot()).state.player.credits).toBe(before.state.player.credits);
  expect((await game.snapshot()).saved._inImmersion).toEqual(before.immersion);
});

test.describe('partida F05A: táctil y texto ampliado',()=>{
  test.use({hasTouch:true});
  for(const viewport of [{width:1024,height:600},{width:320,height:800}]) {
    test(`${viewport.width}px: bloque separado, tap y confirmación accesible`,async({page,game})=>{
      await page.setViewportSize(viewport);await game.setup({state:{offers:[]}});
      const fits=await page.locator('#sidebar').evaluate(el=>el.scrollHeight<=el.clientHeight+1);
      expect(fits).toBe(true);
      await page.addStyleTag({content:'#sidebar .navbtn{font-size:18px;}'});
      const state=await game.snapshot();
      await expect(page.locator('#btn-reset')).toBeHidden();
      // Con texto grande puede ser necesario scroll, pero no solapamiento.
      const closedHeight=await page.locator('#sidebar').evaluate(el=>el.scrollHeight);
      const navigation=await page.locator('.navbtn[data-view="ayuda"]').boundingBox(),toggle=await summary(page).boundingBox();
      expect(toggle.y).toBeGreaterThanOrEqual(navigation.y+navigation.height);
      await summary(page).tap();await expect(page.locator('#btn-save')).toBeVisible();
      expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight)).toBeGreaterThanOrEqual(closedHeight);
      await page.locator('#btn-save').tap();await game.expectMessage('guardada a mano');
      await page.locator('#btn-reset').tap();await expect(page.locator('#confirm-overlay')).toBeVisible();
      await page.locator('#confirm-overlay [data-action="confirmNo"]').tap();
      expect((await game.snapshot()).state.player).toEqual(state.state.player);
      await summary(page).tap();await expect(page.locator('#btn-reset')).toBeHidden();
      await page.screenshot({path:`test-results/save-tools-${viewport.width}.png`});
    });
  }
});
