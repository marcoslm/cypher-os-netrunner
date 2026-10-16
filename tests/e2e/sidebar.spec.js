'use strict';
const {test,expect,makeImmersion,openGridControls}=require('./fixtures');
const button=page=>page.locator('#h-sidebar');
const sidebar=page=>page.locator('#sidebar');
const key='cypher_os_layout_v1';
const preference=page=>page.locator('body').evaluate((element,storageKey)=>JSON.parse(localStorage.getItem(storageKey)),key);

for(const viewport of [{width:320,height:600},{width:1280,height:900}]){
  test(`lateral: inmersion activa visible desde otra seccion a ${viewport.width}px`,async({page,game},testInfo)=>{
    await page.setViewportSize(viewport);await game.setup({immersion:makeImmersion(),state:{offers:[]}});
    const red=page.locator('#sidebar [data-view="red"]');
    await expect(red).toHaveClass(/has-immersion/);
    await page.locator('#sidebar [data-view="tienda"]').click();
    await expect(red).not.toHaveClass(/\bactive\b/);
    await expect(red).toHaveAccessibleName('RED · inmersión activa');
    await expect(red.locator('.immersion-mark')).toBeVisible();
    expect(await red.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:testInfo.outputPath(`inmersion-lateral-${viewport.width}.png`)});
    await game.reload();await expect(red).toHaveClass(/has-immersion/);
    await red.click();await openGridControls(page);
    await page.locator('[data-action="doSuperficie"]').click();
    await expect(red).not.toHaveClass(/has-immersion/);await expect(red).toHaveAccessibleName('RED');
    await expect(red.locator('.immersion-mark')).toBeHidden();
    expect((await game.snapshot()).immersion).toBeNull();
  });
  test(`lateral: orden por uso, Tab y atajos conservados a ${viewport.width}px`,async({page,game},testInfo)=>{
    await page.setViewportSize(viewport);await game.setup({state:{offers:[]}});
    const order=['inicio','red','trabajos','contactos','mensajes','archivos','informes','tienda','estado','logros','registro','ayuda'];
    const navigation=page.locator('#sidebar .navbtn[data-view]');
    expect(await navigation.evaluateAll(elements=>elements.map(element=>element.getAttribute('data-view')))).toEqual(order);
    await navigation.first().focus();
    for(const view of order){
      await expect(page.locator(`#sidebar [data-view="${view}"]`)).toBeFocused();
      await page.keyboard.press('Tab');
    }
    await expect(page.locator('#save-tools-toggle')).toBeFocused();
    await page.locator('#sidebar [data-view="archivos"]').click();
    await expect(page.locator('#panel-scroll h1')).toHaveText('ARCHIVOS');
    await expect(page.locator('#sidebar [data-view="archivos"]')).toHaveClass(/active/);
    const shortcuts=['inicio','red','contactos','mensajes','trabajos','tienda','estado','informes','registro'];
    for(const [index,view] of shortcuts.entries()){
      await page.keyboard.press(`Control+${index+1}`);
      await expect(page.locator(`#sidebar [data-view="${view}"]`)).toHaveClass(/active/);
    }
    await page.locator('#sidebar [data-view="archivos"]').click();
    await navigation.first().focus();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    expect(await sidebar(page).evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:testInfo.outputPath(`sidebar-order-${viewport.width}.png`)});
  });
}

test('lateral F05B: botón y teclado recuperan espacio sin cambiar canvas, red o progreso',async({page,game})=>{
  await page.setViewportSize({width:768,height:1024});
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  const before=await game.snapshot(),canvas=await page.locator('#gridcanvas').elementHandle();
  const width=(await page.locator('#gridcanvas').boundingBox()).width;
  await expect(button(page)).toHaveAttribute('aria-expanded','true');await button(page).click();
  await expect(sidebar(page)).toBeHidden();await expect(button(page)).toHaveAccessibleName('Mostrar menú lateral');
  await expect.poll(async()=>(await page.locator('#gridcanvas').boundingBox()).width).toBeGreaterThan(width);
  expect((await game.snapshot()).immersion).toEqual(before.immersion);
  expect((await game.snapshot()).state.player).toEqual(before.state.player);
  expect(await canvas.evaluate(el=>el===document.getElementById('gridcanvas'))).toBe(true);
  await expect(button(page)).toBeFocused();await page.keyboard.press('Enter');await expect(sidebar(page)).toBeVisible();
  await page.keyboard.press('Space');await expect(sidebar(page)).toBeHidden();
  await page.keyboard.press('Control+s');expect((await game.snapshot()).saved._inImmersion).toEqual(before.immersion);
  await page.screenshot({path:'test-results/sidebar-tablet-hidden.png'});
});

test('lateral F05B: recarga conserva elección e importar/RESET/NUEVO REGISTRO no aplican flags del archivo',async({page,game})=>{
  await game.setup({state:{offers:[]}});await button(page).click();await game.reload();
  await expect(sidebar(page)).toBeHidden();expect(await preference(page)).toEqual({sidebarCollapsed:true});
  // El usuario vuelve a mostrar el menú para elegir IMPORTAR: esa es su nueva elección local.
  await game.openSaveTools();const incoming=(await game.snapshot()).saved;
  incoming.sidebarCollapsed=true;incoming.layout={sidebarCollapsed:true};
  await game.importFile(incoming,'layout-ajeno.json');await expect(sidebar(page)).toBeVisible();
  expect(await preference(page)).toEqual({sidebarCollapsed:false});
  await game.openSaveTools();await page.locator('#btn-reset').click();await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  await expect(sidebar(page)).toBeVisible();expect(await preference(page)).toEqual({sidebarCollapsed:false});
  await game.skipBoot();
  await button(page).click();await game.fatal();
  await page.locator('#flatline [data-action="newRecord"]').click();
  await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  await expect(sidebar(page)).toBeHidden();expect(await preference(page)).toEqual({sidebarCollapsed:true});
});

test('lateral F05B: restablecer audio/brillo/efectos no cambia layout',async({page,game})=>{
  await game.setup();await button(page).click();await page.locator('#h-controls').click();
  await page.locator('[data-action="toggleDeckPref"][data-pref="crt"]').click();
  await page.locator('[data-action="resetControls"]').click();
  await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  await page.locator('#controls-overlay .control-close').click();
  await expect(sidebar(page)).toBeHidden();expect(await preference(page)).toEqual({sidebarCollapsed:true});
});

test('lateral F05B: combate y confirmación bloquean el botón del fondo',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});await game.startCombat();
  const box=await button(page).boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await expect(sidebar(page)).toBeVisible();await expect(button(page)).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Control+s');await game.expectMessage('partida guardada');
  await game.setup({state:{offers:[]}});await game.openSaveTools();await page.locator('#btn-reset').click();
  const modalBox=await button(page).boundingBox();await page.mouse.click(modalBox.x+modalBox.width/2,modalBox.y+modalBox.height/2);
  // El clic alcanza el fondo de la confirmación y la cancela, no el botón oculto.
  await expect(sidebar(page)).toBeVisible();await expect(button(page)).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  await game.openSaveTools();
  await page.locator('#btn-reset').click();await page.locator('#confirm-overlay [data-action="confirmNo"]').click();
});

test.describe('lateral F05B: táctil estrecho',()=>{
  test.use({hasTouch:true});
  for(const viewport of [{width:375,height:700},{width:320,height:480}]) {
    test(`${viewport.width}px: controles siempre dentro de barra, tap y menú recuperable`,async({page,game})=>{
      await page.setViewportSize(viewport);await game.setup({state:{offers:[]}});
      expect(await page.locator('#topbar').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
      for(const id of ['h-sidebar','h-snd','h-amb','h-mus','h-fs','h-controls']) {
        const r=await page.locator('#'+id).boundingBox();
        expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(viewport.width);
        expect(r.y+r.height).toBeLessThanOrEqual(viewport.height);
      }
      await button(page).tap();await expect(sidebar(page)).toBeHidden();
      await button(page).tap();await expect(sidebar(page)).toBeVisible();
      await page.locator('.navbtn[data-view="contactos"]').tap();
      await expect(page.locator('#panel-scroll h1')).toHaveText('CONTACTOS');
      await button(page).tap();await page.screenshot({path:`test-results/sidebar-mobile-${viewport.width}.png`});
    });
  }
});
