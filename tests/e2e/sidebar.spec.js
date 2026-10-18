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
    const before=await game.snapshot();
    const appearance=()=>red.evaluate(element=>{
      const style=getComputedStyle(element);
      return {edge:style.getPropertyValue('--control-edge').trim(),color:style.color,background:style.backgroundImage};
    });
    const selected=await appearance();
    expect(selected.edge).toBe('#4dd8ff');
    await expect.poll(async()=>(await appearance()).color).toBe('rgb(77, 216, 255)');
    const selectedSettled=await appearance();
    expect(selectedSettled.background).toContain('0.14');
    await expect(red.locator('.immersion-mark')).toHaveCount(0);
    await page.screenshot({path:testInfo.outputPath(`red-seleccionada-${viewport.width}.png`)});
    await page.locator('#sidebar [data-view="tienda"]').click();
    await expect(red).not.toHaveClass(/\bactive\b/);
    await expect(red).toHaveAccessibleName('RED · inmersión activa');
    await expect(red.locator('.immersion-mark')).toHaveCount(0);
    await expect(red).toHaveCSS('box-shadow','none');
    const ongoing=await appearance();
    expect(ongoing.edge).toBe('rgba(77,216,255,.45)');
    await expect.poll(async()=>(await appearance()).color).toBe('rgba(77, 216, 255, 0.7)');
    const settled=await appearance();
    expect(settled.background).toContain('0.07');expect(settled.background).not.toBe(selectedSettled.background);
    await red.hover();
    await expect.poll(async()=>(await appearance()).edge).toBe('rgba(77,216,255,.65)');
    expect((await appearance()).background).toContain('0.1');
    await page.mouse.move(0,0);
    await expect.poll(appearance).toEqual(settled);
    await expect(page.locator('#sidebar .navbtn.active')).toHaveCount(1);
    await expect(page.locator('#sidebar [data-view="tienda"]')).toHaveClass(/\bactive\b/);
    expect((await game.snapshot()).immersion).toEqual(before.immersion);
    await red.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
    expect((await appearance()).edge).toBe('#4dd8ff');
    await page.locator('#sidebar [data-view="tienda"]').focus();
    expect(await red.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:testInfo.outputPath(`inmersion-lateral-${viewport.width}.png`)});
    await game.reload();await expect(red).toHaveClass(/has-immersion/);
    await expect.poll(appearance).toEqual(selectedSettled);
    await page.locator('#sidebar [data-view="tienda"]').click();
    await expect.poll(appearance).toEqual(settled);
    await red.click();
    await expect.poll(appearance).toEqual(selectedSettled);
    await openGridControls(page);
    await page.locator('[data-action="doSuperficie"]').click();
    await expect(red).not.toHaveClass(/has-immersion/);await expect(red).toHaveAccessibleName('RED');
    await expect(red.locator('.immersion-mark')).toHaveCount(0);
    await page.clock.runFor(500);
    await page.locator('#sidebar [data-view="tienda"]').click();
    const normal=await page.locator('#sidebar [data-view="trabajos"]').evaluate(element=>
      getComputedStyle(element).getPropertyValue('--control-edge').trim());
    expect((await appearance()).edge).toBe(normal);
    expect((await game.snapshot()).immersion).toBeNull();
  });
  test(`lateral: orden por uso, Tab y atajos conservados a ${viewport.width}px`,async({page,game},testInfo)=>{
    await page.setViewportSize(viewport);await game.setup({state:{offers:[]}});
    const order=['inicio','red','trabajos','contactos','mensajes','archivos','informes','tienda','estado','logros','ayuda'];
    const navigation=page.locator('#sidebar .navbtn[data-view]');
    expect(await navigation.evaluateAll(elements=>elements.map(element=>element.getAttribute('data-view')))).toEqual(order);
    await expect(page.locator('#sidebar [data-view="registro"]')).toHaveCount(0);
    const groups=page.locator('#sidebar .sidebar-group');
    await expect(groups).toHaveCount(4);
    const groupStyle=await groups.evaluateAll(elements=>elements.map(element=>{
      const style=getComputedStyle(element);
      return {background:style.backgroundColor,clip:style.clipPath,border:style.borderTopWidth,
        padding:style.paddingTop,buttons:Array.from(element.querySelectorAll('.navbtn')).length};
    }));
    expect(groupStyle.map(group=>group.buttons)).toEqual([2,5,3,2]);
    expect(groupStyle.map(group=>group.background)).toEqual(['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);
    const expectedPadding=viewport.width<=720?'2px':'4px';
    for(const group of groupStyle){
      expect(group.clip).toBe('none');expect(group.border).toBe('0px');expect(group.padding).toBe(expectedPadding);
    }
    const separation=await groups.evaluateAll(elements=>elements.map(group=>{
      const buttons=Array.from(group.querySelectorAll('.navbtn'));
      return buttons.length>1?buttons[1].getBoundingClientRect().top-buttons[0].getBoundingClientRect().bottom:null;
    }));
    const cross=await page.evaluate(()=>{
      const groups=Array.from(document.querySelectorAll('#sidebar .sidebar-group'));
      const last=groups[0].querySelector('.navbtn:last-child').getBoundingClientRect();
      const next=groups[1].querySelector('.navbtn').getBoundingClientRect();
      return next.top-last.bottom;
    });
    expect(cross).toBeGreaterThan(Math.max(...separation.filter(Boolean))+4);
    await expect(page.locator('#sidebar .sidebar-group--system')).toHaveCount(1);
    const idle=page.locator('#sidebar [data-view="trabajos"]');
    const idleBorder=await idle.evaluate(element=>getComputedStyle(element,'::before').backgroundColor);
    const idleAlpha=parseFloat(idleBorder.split(',')[3]);
    expect(idleAlpha).toBeGreaterThan(.15);expect(idleAlpha).toBeLessThan(.35);
    expect(await idle.evaluate(element=>getComputedStyle(element).getPropertyValue('--control-edge').trim())).toBe('rgba(44,122,92,.22)');
    await navigation.first().focus();
    for(const view of order){
      await expect(page.locator(`#sidebar [data-view="${view}"]`)).toBeFocused();
      await page.keyboard.press('Tab');
    }
    await expect(page.locator('#save-tools-toggle')).toBeFocused();
    await page.locator('#sidebar [data-view="archivos"]').click();
    await expect(page.locator('#panel-scroll h1')).toHaveText('ARCHIVOS');
    await expect(page.locator('#sidebar [data-view="archivos"]')).toHaveClass(/active/);
    const shortcuts=[
      ['inicio','#sidebar [data-view="inicio"]'],['red','#sidebar [data-view="red"]'],
      ['contactos','#sidebar [data-view="contactos"]'],['mensajes','#sidebar [data-view="mensajes"]'],
      ['trabajos','#sidebar [data-view="trabajos"]'],['tienda','#sidebar [data-view="tienda"]'],
      ['estado','#sidebar [data-view="estado"]'],['informes','#sidebar [data-view="informes"]'],
      ['registro','#save-tools-toggle']
    ];
    for(const [index,target] of shortcuts.entries()){
      const [view,selector]=target;
      await page.keyboard.press(`Control+${index+1}`);
      await expect(page.locator(selector)).toHaveClass(/active/);
      if(view==='registro')await expect(page.locator('#panel-scroll h1.title')).toHaveText('REGISTRO');
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
