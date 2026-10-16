'use strict';

const { test, expect, GAME_URL, makeImmersion, jsonFile, tabTo, solveCodeCombat, solveScanner, downloadJSON } = require('./fixtures');

const nav = (page, view) => page.locator(`.navbtn[data-view="${view}"]`);
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const clone = value => JSON.parse(JSON.stringify(value));
async function invoiceMove(page, id) {
  const index = await page.evaluate(id => currentNeighbors().findIndex(node => node.id === id), id);
  expect(index).toBeGreaterThanOrEqual(0);
  await page.locator('#adjlist .adj-node').nth(index).click();
}
async function storyRoute(page, target) {
  for (let step = 0; step < 30; step++) {
    const next = await page.evaluate(target => {
      const current = inImmersion.current;
      if (current === target) return null;
      const paths = [[current]], seen = new Set([current]);
      for (const route of paths) for (const neighbor of inImmersion.grid.adj[route.at(-1)]) {
        if (seen.has(neighbor)) continue;
        const path = [...route, neighbor];
        if (neighbor === target) return path[1];
        seen.add(neighbor); paths.push(path);
      }
      throw new Error('No route to ' + target);
    }, target);
    if (!next) return;
    await page.evaluate(() => { window.__storyRng = Math.random; Math.random = () => 0.99; });
    try { await invoiceMove(page, next); }
    finally { await page.evaluate(() => { Math.random = window.__storyRng; delete window.__storyRng; }); }
    if (await page.locator('#combat').isVisible()) {
      await page.locator('#combat-enter').click();
      if (await page.locator('#scanZone').isVisible()) await solveScanner(page);
      else await solveCodeCombat(page);
    }
  }
  throw new Error('Story route exhausted bounded steps');
}

function vaultOffer(id, project, corp) {
  return {
    id, contact: 'doctorSudario', title: `EL VAULT DE ${corp}`,
    desc: `Llega a la capa 2 y recupera el proyecto ${project}.`,
    type: 'vault', n: 1, reward: 500, xp: 30, risk: 'high',
    project, targetDepth: 2, why: ''
  };
}

async function setupF5(page, game, completed = 4) {
  const narrative = await page.evaluate(completed => {
    const state = newNarrativeState();
    Object.assign(state, { entry:'active', aliasAcquired:true, recoveryStage:'complete_known', keys:['k_casos'] });
    for (const id of ['l_estancia','l_revision','l_contacto','l_indice','l_casos']) state.files[id]='readable';
    for (const chapter of STORY_CHAPTERS.slice(0,completed)) {
      state.chapters[chapter.id]='resolved'; state.awarded.push(chapter.id);
      for (const id of chapter.files) state.files[id]='readable';
    }
    if(completed>=5)state.readConversations.push('m_nara_presentacion');
    if(completed>=6)state.files.l_testimonio='readable';
    state.chapters[STORY_CHAPTERS[completed].id]='offered';
    return state;
  }, completed);
  await game.setup({ state:{narrative} });
}

test('intro: COMENZAR abre el relato y la recuperacion activa la sesion', async ({ page, game }) => {
  expect(page.url()).toBe(GAME_URL);
  await expect(page).toHaveTitle(/CYPHER:\/\/OS.*v9\.2\.7/);
  await page.locator('#intro .intro-tag').click();
  await expect(page.locator('#intro')).toBeVisible();
  await expect(page.locator('#boot')).toBeHidden();
  expect((await game.snapshot()).state).toBeNull();
  await expect(page.locator('#panel-scroll')).toBeEmpty();

  await page.locator('#intro-start').click();
  await expect(page.locator('#story-entry')).toBeVisible();
  await game.skipBoot({ skip: 'keyboard' });
  await expect(nav(page, 'archivos')).toHaveClass(/active/);
  await expect(page.locator('#h-cpu')).toHaveText('100/100');
  await expect(page.locator('#h-cc')).toHaveText('500');
  await expect(page.locator('#os')).toHaveJSProperty('inert',false);
});

test('F3: factura completa, paquete persistente y verificacion unica sin lectura obligatoria', async ({ page, game }) => {
  await game.boot();
  await nav(page, 'trabajos').click();
  await expect(action(page, 'acceptInvoice')).toBeVisible();
  expect((await game.snapshot()).state.narrative.readFiles).toEqual([]);
  await nav(page, 'contactos').click();
  await expect(action(page, 'acceptJob')).toHaveCount(0);
  await nav(page, 'trabajos').click();
  await action(page, 'acceptInvoice').click();
  await expect(page.locator('#conversation-heading')).toBeFocused();
  await expect(page.locator('#panel-scroll')).toContainText('No uses las credenciales de Tomás');
  expect((await game.snapshot()).state.narrative.aliasAcquired).toBe(true);
  await game.reload();
  await expect(action(page, 'acceptInvoice')).toHaveCount(0);
  await action(page, 'dipGrid').click();
  await expect(page.locator('#grid-job-items')).toContainText('Servicio de facturación');
  await invoiceMove(page, '1_0');
  await expect(page.locator('#combat')).toContainText('acceso de huésped');
  await page.locator('#combat-enter').click();
  await solveCodeCombat(page);
  await invoiceMove(page, '1_1');
  const transit = await game.snapshot();
  expect(transit.immersion.narrativePayload).toMatchObject({ chapter: 'c01', files: ['r_factura'] });
  expect(transit.immersion.dataUsed).toBe(1);
  expect(transit.immersion.data).toEqual([]);
  expect(transit.state.narrative.files.r_factura).toBe('unknown');
  await page.keyboard.press('Control+s');
  await game.reload();
  expect((await game.snapshot()).immersion).toEqual(transit.immersion);
  await action(page, 'doSuperficie').click();
  expect((await game.snapshot()).immersion).not.toBeNull();
  await invoiceMove(page, '1_0');
  await invoiceMove(page, '0_0');
  await action(page, 'doSuperficie').click();
  await action(page, 'closeResume').click();
  expect((await game.snapshot()).state.narrative.chapters.c01).toBe('returned');
  expect((await game.snapshot()).state.player.credits).toBe(500);
  await game.reload();
  await action(page, 'deliverInvoice').click();
  await expect(page.locator('#conversation-heading')).toBeFocused();
  await expect(page.locator('#panel-scroll')).toContainText('corte queda suspendido');
  await action(page, 'closeStoryConversation').click();
  await expect(page.locator('#panel-scroll')).toContainText('SIN CONFIRMAR');
  const resolved = await game.snapshot();
  expect(resolved.state.player.credits).toBe(640);
  expect(resolved.state.player.xp).toBe(76);
  expect(resolved.state.player.stats.data).toBe(0);
  expect(resolved.state.narrative.chapters).toMatchObject({ c01: 'resolved', c02: 'offered' });
  await expect(action(page, 'deliverInvoice')).toHaveCount(0);
  await nav(page, 'archivos').click();
  await page.locator('[data-action="archiveTab"][data-tab="recovered"]').click();
  await page.locator('[data-action="openArchive"][data-id="r_factura"]').click();
  await expect(page.locator('.archive-text')).toContainText('23:11');
  await expect(page.locator('.archive-text')).toContainText('23:13');
  await expect(page.locator('.archive-meta')).toContainText('hora de sesión');
  await nav(page, 'contactos').click();
  await expect(action(page, 'acceptJob').first()).toBeVisible();
  await page.locator('[data-action="workSection"][data-tab="story"]').click();
  await page.locator('[data-action="openStoryConversation"][data-id="m_celia_alias"]').click();
  expect((await game.snapshot()).state.player.credits).toBe(640);
});

test('F3: retirada y muerte no pierden el encargo ni fabrican la prueba', async ({ page, game }) => {
  await game.boot(); await nav(page, 'trabajos').click();
  await action(page, 'acceptInvoice').click(); await action(page, 'closeStoryConversation').click(); await action(page, 'dipGrid').click();
  await action(page, 'doSuperficie').click(); await action(page, 'closeResume').click();
  expect((await game.snapshot()).state.narrative.chapters.c01).toBe('accepted');
  await nav(page, 'trabajos').click(); await action(page, 'dipGrid').click();
  await invoiceMove(page, '1_0');
  await page.locator('#combat-enter').click(); await solveCodeCombat(page);
  await invoiceMove(page, '1_1');
  await game.fatal();
  await page.locator('#flatline [data-action="reconnect"]').click();
  const retry = await game.snapshot();
  expect(retry.state.narrative.chapters.c01).toBe('accepted');
  expect(retry.state.narrative.files.r_factura).toBe('unknown');
  expect(retry.state.player.credits).toBe(500);
  await nav(page, 'trabajos').click(); await action(page, 'dipGrid').click();
  expect((await game.snapshot()).immersion.grid.nodes.find(node => node.storyChapter === 'c01').done).toBe(false);
});

for (const width of [320, 768]) {
  test(`F3: factura legible y operable a ${width} px`, async ({ page, game }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 1024 });
    await game.boot(); await nav(page, 'trabajos').click();
    const fits = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      expect(await page.locator('#panel-scroll').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    };
    await fits(); await page.screenshot({ path: testInfo.outputPath(`invoice-offer-${width}.png`) });
    await action(page, 'acceptInvoice').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#conversation-heading')).toBeFocused();
    await fits(); await page.screenshot({ path: testInfo.outputPath(`invoice-channel-${width}.png`) });
    await action(page, 'closeStoryConversation').click(); await action(page, 'dipGrid').click();
    await invoiceMove(page, '1_0');
    const card = await page.locator('.encounter-card').boundingBox();
    expect(card.x).toBeGreaterThanOrEqual(0); expect(card.x + card.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: testInfo.outputPath(`invoice-defense-${width}.png`) });
    await page.locator('#combat-enter').click(); await solveCodeCombat(page);
    await invoiceMove(page, '1_1'); await invoiceMove(page, '1_0'); await invoiceMove(page, '0_0');
    await action(page, 'doSuperficie').click(); await action(page, 'closeResume').click();
    await action(page, 'deliverInvoice').click();
    await fits(); await page.screenshot({ path: testInfo.outputPath(`invoice-delivery-${width}.png`) });
    await action(page, 'closeStoryConversation').click();
    await expect(page.locator('#panel-scroll')).toContainText('EL ARCHIVO DE TOMAS');
  });
}

for (const width of [320, 1280]) {
  test(`F4: indice, permiso y contraste de tres casos a ${width} px`, async ({ page, game }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: width === 320 ? 800 : 900 });
    await game.setup();
    const scoped = (name, id) => page.locator(`[data-action="${name}"][data-id="${id}"]`);
    await nav(page,'trabajos').click();
    for (const id of ['c02','c03','c04']) {
      await scoped('consultStoryCase',id).click();
      await expect(page.locator('#case-heading')).toBeFocused();
      if (id === 'c03') {
        const rebuilt = await game.snapshot();
        expect(rebuilt.state.narrative.files).toMatchObject({ l_indice:'readable', l_casos:'sealed' });
        expect(rebuilt.state.narrative.keys).toEqual([]);
        expect(rebuilt.state.narrative.readConversations).not.toContain('m_ines_clave');
        await expect(scoped('acceptStoryCase',id)).toHaveCount(0);
        await scoped('openStoryConversation','m_ines_clave').click();
        await expect(page.locator('#conversation-heading')).toBeFocused();
        await action(page,'receiveStoryKey').click();
        expect((await game.snapshot()).state.narrative.files.l_casos).toBe('sealed');
        await game.reload();
        await scoped('consultStoryCase',id).click();
        await action(page,'applyStoryKey').click();
        expect((await game.snapshot()).state.narrative.files.l_casos).toBe('readable');
      }
      await scoped('acceptStoryCase',id).click();
      await page.evaluate(() => { window.__storyRng = Math.random; Math.random = () => 0.99; });
      try { await action(page,'dipGrid').click(); }
      finally { await page.evaluate(() => { Math.random = window.__storyRng; delete window.__storyRng; }); }
      await expect(page.locator('#grid-job-items')).toContainText(id === 'c02'?'Respaldo de mantenimiento':id === 'c03'?'Servicio de cobertura':'Controlador local de 2091');
      await storyRoute(page,id+'_guard');
      await expect(page.locator('#combat')).toBeHidden();
      await page.screenshot({ path:testInfo.outputPath(`${id}-grid-${width}.png`) });
      await storyRoute(page,id+'_proof');
      const transit = await game.snapshot();
      expect(transit.immersion.narrativePayload.chapter).toBe(id);
      expect(transit.state.narrative.chapters[id]).toBe('accepted');
      await page.keyboard.press('Control+s');
      await game.importFile(jsonFile((await game.snapshot()).saved));
      expect((await game.snapshot()).immersion).toEqual(transit.immersion);
      await game.reload();
      expect((await game.snapshot()).immersion).toEqual(transit.immersion);
      await storyRoute(page,transit.immersion.grid.entry);
      await action(page,'doSuperficie').click(); await action(page,'closeResume').click();
      const returned = await game.snapshot();
      expect(returned.state.narrative.chapters[id]).toBe('returned');
      await scoped('deliverStoryCase',id).click();
      expect((await game.snapshot()).state.player.credits).toBe(returned.state.player.credits+({c02:180,c03:260,c04:320})[id]);
      await expect(page.locator('#conversation-heading')).toBeFocused();
      expect(await page.locator('#panel-scroll').evaluate(element => element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path:testInfo.outputPath(`${id}-reaction-${width}.png`) });
      await action(page,'closeStoryConversation').click();
      await expect(page.locator('#panel-scroll')).toContainText('HECHO');
      await expect(scoped('deliverStoryCase',id)).toHaveCount(0);
    }
    expect((await game.snapshot()).state.narrative.chapters.c05).toBe('offered');
    await expect(scoped('acceptStoryCase','c05')).toHaveCount(0);
    expect((await game.snapshot()).state.narrative.readConversations).not.toContain('m_nara_presentacion');
    await scoped('consultStoryCase','c05').click();
    await expect(page.locator('#panel-scroll')).toContainText('identidad pendiente');
    await nav(page,'archivos').click();
    await page.locator('[data-action="archiveTab"][data-tab="recovered"]').click();
    await scoped('openArchive','r_parpadeo').click();
    await expect(page.locator('.archive-text')).toContainText('+11 s');
    await expect(page.locator('.archive-text')).toContainText('CC-17');
    await page.screenshot({ path:testInfo.outputPath(`parpadeo-${width}.png`) });
  });
}

test('F4: tres contratos, paquete separado y reconexion reintentable', async ({ page, game }) => {
  const offers = [['recoleta',3],['carrera',1],['rompehielas',2]].map(([type,n]) => ({
    id:'f4_'+type,contact:'mamaWire',title:type,desc:'Objetivo de prueba '+type,type,n,reward:90,xp:10,risk:'low',why:''
  }));
  await game.setup({ state:{offers} });
  await nav(page,'contactos').click();
  for (const offer of offers) await page.locator(`[data-action="acceptJob"][data-id="${offer.id}"]`).click();
  await nav(page,'trabajos').click();
  await page.locator('[data-action="consultStoryCase"][data-id="c02"]').click();
  await page.locator('[data-action="acceptStoryCase"][data-id="c02"]').click();
  await page.evaluate(() => { window.__storyRng=Math.random; Math.random=()=>0.99; });
  try { await action(page,'dipGrid').click(); }
  finally { await page.evaluate(() => { Math.random=window.__storyRng; delete window.__storyRng; }); }
  expect((await game.snapshot()).immersion.depth).toBe(4);
  await expect(page.locator('#grid-job-items')).toContainText('EL ARCHIVO DE TOMAS');
  for (const offer of offers) await expect(page.locator('#grid-job-items')).toContainText(offer.title);
  await storyRoute(page,'c02_guard');
  const before = await game.snapshot();
  await storyRoute(page,'c02_proof');
  const proof = await game.snapshot();
  expect(proof.immersion.dataUsed).toBe(before.immersion.dataUsed+1);
  expect(proof.immersion.data).toEqual(before.immersion.data);
  expect(proof.state.player.stats.data).toBe(before.state.player.stats.data);
  expect(proof.state.jobs.map(job=>job.prog)).toEqual(before.state.jobs.map(job=>job.prog));
  await game.fatal(); await page.locator('#flatline [data-action="reconnect"]').click();
  const retry = await game.snapshot();
  expect(retry.immersion).toBeNull();
  expect(retry.state.narrative.chapters.c02).toBe('accepted');
  expect(retry.state.narrative.files.r_indice).toBe('unknown');
  expect(retry.state.narrative.files.l_revision).toBe('readable');
  await nav(page,'trabajos').click(); await action(page,'dipGrid').click();
  expect((await game.snapshot()).immersion.grid.nodes.find(node=>node.storyChapter==='c02').done).toBe(false);
});

for (const width of [320,1280]) {
  test(`F5: firmas, identidad y salida de Tomas a ${width} px`, async ({ page, game }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize({width,height:width===320?800:900});
    await setupF5(page,game);
    const scoped=(name,id)=>page.locator(`[data-action="${name}"][data-id="${id}"]`);
    const fits=async()=>{
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
      expect(await page.locator('#panel-scroll').evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    };
    await nav(page,'trabajos').click();
    for (const id of ['c05','c06']) {
      expect((await game.snapshot()).state.narrative.readConversations).not.toContain(id==='c05'?'m_nara_presentacion':'m_nara_custodia');
      await scoped('consultStoryCase',id).click();
      await expect(page.locator('#case-heading')).toBeFocused();
      await fits(); await page.screenshot({path:testInfo.outputPath(`${id}-offer-${width}.png`)});
      await scoped('acceptStoryCase',id).click();
      await page.evaluate(()=>{window.__storyRng=Math.random;Math.random=()=>0.99;});
      try { await action(page,'dipGrid').click(); }
      finally { await page.evaluate(()=>{Math.random=window.__storyRng;delete window.__storyRng;}); }
      expect((await game.snapshot()).immersion.depth).toBe(id==='c05'?3:4);
      await storyRoute(page,id+'_guard');
      await expect(page.locator('#combat')).toBeHidden();
      await page.screenshot({path:testInfo.outputPath(`${id}-grid-${width}.png`)});
      await storyRoute(page,id+'_proof');
      const transit=await game.snapshot(),files=id==='c05'?['r_permisos','r_actualizacion']:['r_custodia'];
      expect(transit.immersion.narrativePayload).toMatchObject({chapter:id,files});
      expect(transit.immersion.dataUsed).toBe(transit.immersion.data.length+1);
      for(const file of files) expect(transit.state.narrative.files[file]).toBe('unknown');
      await page.keyboard.press('Control+s');
      await game.importFile(jsonFile((await game.snapshot()).saved)); await game.reload();
      expect((await game.snapshot()).immersion).toEqual(transit.immersion);
      await storyRoute(page,transit.immersion.grid.entry);
      await action(page,'doSuperficie').click(); await action(page,'closeResume').click();
      const returned=await game.snapshot();
      expect(returned.state.narrative.chapters[id]).toBe('returned');
      for(const file of files) expect(returned.state.narrative.files[file]).toBe('readable');
      await nav(page,'archivos').click();
      await page.locator('[data-action="archiveTab"][data-tab="recovered"]').click();
      for(const file of files){
        await scoped('openArchive',file).click();
        await expect(page.locator('#archive-heading')).toBeFocused();
        await expect(page.locator('.archive-text')).toContainText(file==='r_permisos'?'Damián Orce':file==='r_actualizacion'?'segunda autorización':'18:17');
        await fits(); await page.screenshot({path:testInfo.outputPath(`${file}-${width}.png`)});
        await action(page,'closeArchive').click();
      }
      await nav(page,'trabajos').click();
      if(id==='c06'){
        expect(returned.state.narrative.files.l_testimonio).toBe('unknown');
        await expect(scoped('deliverStoryCase',id)).toHaveCount(0);
        await action(page,'confirmStoryCustody').focus(); await page.keyboard.press('Enter');
        await expect(page.locator('#conversation-heading')).toBeFocused();
        await expect(page.locator('#panel-scroll')).toContainText('revisión para salir todavía está pendiente');
        const confirmed=await game.snapshot();
        expect(confirmed.state.player.credits).toBe(returned.state.player.credits);
        expect(confirmed.state.narrative.files.l_testimonio).toBe('readable');
        expect(confirmed.state.narrative.chapters.c06).toBe('returned');
        expect(confirmed.state.narrative.readConversations).not.toContain('m_ines_salida');
        await fits(); await page.screenshot({path:testInfo.outputPath(`identity-${width}.png`)});
        await game.importFile(jsonFile(confirmed.saved)); await game.reload();
        expect((await game.snapshot()).state.narrative).toEqual(confirmed.state.narrative);
        await expect(action(page,'confirmStoryCustody')).toHaveCount(0);
      }
      await scoped('deliverStoryCase',id).click();
      expect((await game.snapshot()).state.player.credits).toBe(returned.state.player.credits+(id==='c05'?400:500));
      await expect(page.locator('#conversation-heading')).toBeFocused();
      await expect(page.locator('#panel-scroll')).toContainText(id==='c05'?'no la voy a dar':'salida está ejecutada');
      await fits(); await page.screenshot({path:testInfo.outputPath(`${id}-reaction-${width}.png`)});
      await action(page,'closeStoryConversation').click();
      await expect(scoped('deliverStoryCase',id)).toHaveCount(0);
    }
    const finished=await game.snapshot();
    expect(finished.state.narrative.chapters.c07).toBe('offered');
    expect(finished.state.narrative.readConversations).not.toContain('m_berto_acogida');
    await expect(scoped('acceptStoryCase','c07')).toHaveCount(0);
    await expect(scoped('consultStoryCase','c07')).toBeVisible();
    await scoped('openStoryConversation','m_berto_acogida').click();
    await expect(page.locator('#panel-scroll')).toContainText('Ya está aquí');
    await fits(); await page.screenshot({path:testInfo.outputPath(`welcome-${width}.png`)});
    await game.reload(); await nav(page,'contactos').click();
    await page.locator('[data-action="workSection"][data-tab="story"]').click();
    await scoped('openStoryConversation','m_ines_salida').click();
    expect((await game.snapshot()).state.player.credits).toBe(finished.state.player.credits);
    await nav(page,'archivos').click();
    await page.locator('[data-action="archiveTab"][data-tab="recovered"]').click();
    await scoped('openArchive','l_testimonio').click();
    await expect(page.locator('.archive-meta')).toContainText('Correspondencia actual');
    await expect(page.locator('.archive-text')).toContainText('detalle no publicado');
  });
}

for(const width of [320,1280]){
  test(`F6: continuidad, revocacion y cierre reanudable a ${width} px`,async({page,game},testInfo)=>{
    test.setTimeout(120000);await page.setViewportSize({width,height:width===320?800:900});await setupF5(page,game,6);
    const scoped=(name,id)=>page.locator(`[data-action="${name}"][data-id="${id}"]`);
    const fits=async()=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);expect(await page.locator('#panel-scroll').evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);};
    await nav(page,'trabajos').click();
    for(const id of ['c07','c08']){
      await scoped('consultStoryCase',id).click();await scoped('acceptStoryCase',id).click();
      await page.evaluate(()=>{window.__storyRng=Math.random;Math.random=()=>0.99;});
      try{await action(page,'dipGrid').click();}finally{await page.evaluate(()=>{Math.random=window.__storyRng;delete window.__storyRng;});}
      const entered=await game.snapshot(),proof=entered.immersion.grid.nodes.find(node=>node.storyChapter===id);
      expect(entered.immersion.depth).toBe(id==='c07'?4:5);
      if(id==='c08')expect(entered.immersion.grid.nodes.filter(node=>node.boss)).toHaveLength(1);
      await storyRoute(page,proof.storyDefense);
      const victory=await game.snapshot();
      expect(victory.state.player.credits).toBe(entered.state.player.credits);
      expect(victory.state.history.finalDone).toBe(false);
      expect(victory.state.narrative.files[proof.storyChapter==='c07'?'r_continuidad':'r_revocacion']).toBe('unknown');
      await page.screenshot({path:testInfo.outputPath(`${id}-grid-${width}.png`)});
      await storyRoute(page,proof.id);await page.keyboard.press('Control+s');
      const transit=await game.snapshot();await game.importFile(jsonFile(transit.saved));await game.reload();
      expect((await game.snapshot()).immersion).toEqual(transit.immersion);
      await storyRoute(page,transit.immersion.grid.entry);await action(page,'doSuperficie').click();await action(page,'closeResume').click();
      const returned=await game.snapshot();expect(returned.state.history.finalDone).toBe(false);
      await scoped('deliverStoryCase',id).click();
      expect((await game.snapshot()).state.player.credits).toBe(returned.state.player.credits+(id==='c07'?750:5000));
      await expect(page.locator('#conversation-heading')).toBeFocused();await fits();
      await page.screenshot({path:testInfo.outputPath(`${id}-delivery-${width}.png`)});
      if(id==='c07')await action(page,'closeStoryConversation').click();
    }
    const paid=await game.snapshot();expect(paid.state.history.finalDone).toBe(true);
    await expect(page.locator('#panel-scroll')).toContainText('Te lo regalo');
    await expect(page.locator('#panel-scroll')).toContainText('el deck es tuyo');
    expect(paid.state.narrative.readConversations).toContain('m_berto_final');
    for(const id of ['m_ines_final','m_nara_final','m_copia_final'])expect(paid.state.narrative.readConversations).not.toContain(id);
    await action(page,'goStoryProofs').click();await expect(scoped('openArchive','r_copia_final')).toHaveCount(0);
    await game.reload();await nav(page,'trabajos').click();
    for(const id of ['m_ines_final','m_nara_final','m_copia_final']){
      await scoped('openStoryConversation',id).click();await expect(page.locator('#conversation-heading')).toBeFocused();
      await fits();await page.screenshot({path:testInfo.outputPath(`${id}-${width}.png`)});
      const saved=await game.snapshot();expect(saved.state.player.credits).toBe(paid.state.player.credits);
      await game.importFile(jsonFile(saved.saved));await game.reload();await nav(page,'trabajos').click();
    }
    await expect(page.locator('#panel-scroll')).toContainText('Investigación concluida');
    await action(page,'goStoryProofs').click();await scoped('openArchive','r_copia_final').click();
    await expect(page.locator('.archive-text')).toContainText('no por qué decidió preservarla');
    await nav(page,'inicio').click();await action(page,'startEndless').click();
    const endless=await game.snapshot();expect(endless.immersion.grid.nodes.some(node=>node.boss||node.storyChapter)).toBe(false);
    expect(endless.state.narrative.awarded).toHaveLength(8);expect(endless.state.player.credits).toBe(paid.state.player.credits);
  });
}

test('F6: campana completa desde nueva partida sin contratos ni compras obligatorios',async({page,game})=>{
  test.setTimeout(240000);await game.boot();const scoped=(name,id)=>page.locator(`[data-action="${name}"][data-id="${id}"]`);
  await nav(page,'trabajos').click();
  for(const id of ['c01','c02','c03','c04','c05','c06','c07','c08']){
    if(id==='c01'){await action(page,'acceptInvoice').click();await action(page,'closeStoryConversation').click();}
    else{
      await scoped('consultStoryCase',id).click();
      if(id==='c03'){await scoped('openStoryConversation','m_ines_clave').click();await action(page,'receiveStoryKey').click();await action(page,'applyStoryKey').click();}
      await scoped('acceptStoryCase',id).click();
    }
    await page.evaluate(()=>{window.__storyRng=Math.random;Math.random=()=>0.99;});
    try{await action(page,'dipGrid').click();}finally{await page.evaluate(()=>{Math.random=window.__storyRng;delete window.__storyRng;});}
    const entered=await game.snapshot(),proof=entered.immersion.grid.nodes.find(node=>node.storyChapter===id);
    await storyRoute(page,proof.storyDefense);await storyRoute(page,proof.id);await storyRoute(page,entered.immersion.grid.entry);
    await action(page,'doSuperficie').click();await action(page,'closeResume').click();
    if(id==='c06'){await action(page,'confirmStoryCustody').click();await action(page,'closeStoryConversation').click();}
    if(id==='c01')await action(page,'deliverInvoice').click();else await scoped('deliverStoryCase',id).click();
    if(id!=='c08')await action(page,'closeStoryConversation').click();
  }
  const closed=await game.snapshot();expect(closed.state.narrative.awarded).toEqual(['c01','c02','c03','c04','c05','c06','c07','c08']);
  expect(closed.state.jobs).toEqual([]);expect(closed.state.player.stats.totalCreditsSpent).toBe(0);
  expect(closed.state.history.finalDone).toBe(true);expect(closed.state.player.cpu).toBeGreaterThan(0);
});

for(const width of [320,1280]){
  test(`investigacion y contratos separados con contactos extensos a ${width} px`,async({page,game},testInfo)=>{
    await page.setViewportSize({width,height:width===320?800:900});await setupF5(page,game,7);
    const section=tab=>page.locator(`[data-action="workSection"][data-tab="${tab}"]`);
    const fits=async()=>{
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
      expect(await page.locator('#panel-scroll').evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    };
    await nav(page,'trabajos').click();
    await expect(page.locator('[data-action="consultStoryCase"][data-id="c08"]')).toBeVisible();
    await section('contracts').click();await expect(section('contracts')).toBeFocused();
    await expect(action(page,'consultStoryCase')).toHaveCount(0);
    await nav(page,'contactos').click();
    await expect(action(page,'acceptJob').first()).toBeVisible();
    const before=(await game.snapshot()).state.narrative;
    await section('story').click();await expect(section('story')).toBeFocused();
    await expect(action(page,'acceptJob')).toHaveCount(0);
    expect(await action(page,'openStoryConversation').count()).toBeGreaterThan(15);
    await action(page,'openStoryConversation').last().scrollIntoViewIfNeeded();
    const sticky=await section('contracts').boundingBox(),panel=await page.locator('#panel-scroll').boundingBox();
    expect(sticky.y).toBeGreaterThanOrEqual(panel.y);expect(sticky.y+sticky.height).toBeLessThan(panel.y+panel.height);
    await fits();await page.screenshot({path:testInfo.outputPath(`personal-sticky-${width}.png`)});
    await section('contracts').click();await expect(section('contracts')).toBeFocused();
    await expect(action(page,'openStoryConversation')).toHaveCount(0);
    await expect(action(page,'acceptJob').first()).toBeVisible();
    expect((await game.snapshot()).state.narrative).toEqual(before);
    await fits();await page.screenshot({path:testInfo.outputPath(`offers-${width}.png`)});
    await section('story').click();
    await page.locator('[data-action="openStoryConversation"][data-id="m_celia_alias"]').click();
    await expect(page.locator('#conversation-heading')).toBeFocused();
    await expect(section('story')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#panel-scroll')).toContainText('No uses las credenciales de Tomás');
    await expect(action(page,'acceptJob')).toHaveCount(0);
    await fits();
  });
}

test('smoke: todos los paneles, terminal y compras con autosave', async ({ page, game }) => {
  await game.boot({ skip: 'click' });
  const panels = [
    ['contactos', 'CONTACTOS'], ['mensajes', 'MENSAJES'], ['trabajos', 'TRABAJOS'],
    ['tienda', 'MERCADO NEGRO'], ['estado', 'ESTADO'], ['informes', 'INFORMES'],
    ['registro', 'REGISTRO'], ['logros', 'LOGROS'], ['ayuda', 'AYUDA']
  ];
  for (const [view, title] of panels) {
    await nav(page, view).click();
    await expect(nav(page, view)).toHaveClass(/active/);
    await expect(page.locator('#panel-scroll h1.title')).toHaveText(title);
  }
  await nav(page, 'red').click();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  await expect(action(page, 'dipGrid')).toBeVisible();
  await nav(page, 'inicio').click();
  await expect(page.locator('#panel-scroll .logo')).toContainText('CYPHER');

  await nav(page, 'tienda').click();
  await page.locator('[data-action="buyItem"][data-id="ram"]').click();
  await expect(page.locator('#h-cc')).toHaveText('280');
  await expect(page.locator('#h-ram')).toHaveText('0/10');
  await page.locator('[data-action="buyItem"][data-id="breaker"]').click();
  await expect(page.locator('#h-cc')).toHaveText('20');
  await expect(page.locator('[data-action="buyItem"][data-id="ram"]')).toBeDisabled();
  const saved = (await game.snapshot()).saved;
  expect(saved.player).toMatchObject({ credits: 20, ramUp: 1, breakerUp: 1 });
  expect(saved.player.stats.totalCreditsSpent).toBe(480);
  await game.command('estado');
  await expect(page.locator('#panel-scroll h1.title')).toHaveText('ESTADO');
  await expect(page.locator('#panel-scroll')).toContainText('0/10');
  await game.command('ayuda');
  await expect(page.locator('#panel-scroll h1.title')).toHaveText('AYUDA');
});

test('HARDCORE: foco e inert, Tab, Ctrl+K/S, recarga y NUEVO REGISTRO cancelar/confirmar', async ({ page, game }) => {
  await game.setup({
    state: { difficulty: 'hardcore', best: { level: 8, credits: 8000, finalDone: true } },
    player: { level: 4, xp: 27, credits: 1234, stats: { ice: 7 } }
  });
  await game.fatal();
  const record = page.locator('#flatline [data-action="newRecord"]');
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(page.locator('#os')).toHaveAttribute('inert', '');
  await expect(page.locator('#flatline [data-action="reconnect"]')).toHaveCount(0);
  await expect(record).toBeFocused();
  for (const key of ['Tab', 'Shift+Tab', 'Control+k', 'Control+g']) {
    await page.keyboard.press(key);
    await expect(record).toBeFocused();
  }
  await page.keyboard.press('Control+s');
  await game.expectMessage('partida guardada');
  expect((await game.snapshot()).saved.player.cpu).toBe(0);

  // Selecting NORMAL on the real intro must not resurrect a dead HARDCORE save.
  await game.reload({ difficulty: 'normal' });
  await expect(page.locator('#flatline')).toContainText('MODO HARDCORE');
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(record).toBeFocused();
  expect((await game.snapshot()).state).toMatchObject({ difficulty: 'hardcore', player: { cpu: 0 } });
  expect((await game.snapshot()).immersion).toBeNull();

  await record.click();
  const yes = page.locator('#confirm-overlay [data-action="confirmYes"]');
  const no = page.locator('#confirm-overlay [data-action="confirmNo"]');
  await expect(yes).toBeFocused();
  await expect(page.locator('#flatline')).toHaveJSProperty('inert', true);
  await page.keyboard.press('Shift+Tab');
  await expect(no).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(yes).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(yes).toBeFocused();
  await page.keyboard.press('Control+s');
  expect((await game.snapshot()).saved.player.cpu).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  await expect(record).toBeFocused();
  await record.click();
  await no.click();
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  await expect(page.locator('#flatline')).toBeVisible();
  expect((await game.snapshot()).state.player.credits).toBe(1234);

  await record.click();
  await expect(yes).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  await expect(page.locator('#flatline')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(page.locator('#story-entry')).toBeVisible();
  expect((await game.snapshot()).saved.narrative.entry).toBe('prologue');
  await game.skipBoot();
  await expect(page.locator('#h-cpu')).toHaveText('100/100');
  const fresh = (await game.snapshot()).saved;
  expect(fresh.player).toMatchObject({ credits: 500, level: 1, xp: 0, skillPoints: 0, stats: { ice: 0, immerse: 0, jobsFailed: 0 } });
  expect(fresh.jobs).toEqual([]);
  expect(fresh.intel).toEqual([]);
  expect(fresh.achievements).toEqual([]);
  expect(fresh.best).toMatchObject({ level: 8, credits: 8000, finalDone: true });
  await page.keyboard.press('Control+k');
  await expect(page.locator('#cmd')).toBeFocused();
});

test('NORMAL: RECONEXIÓN conserva el estado actual tras recarga y pierde la inmersión', async ({ page, game }) => {
  await game.setup({
    player: { cpu: 88, heat: 80, credits: 1234, level: 3, xp: 11, stats: { jobsFailed: 2 } },
    state: { jobs: [{ id: 'checkpoint-job', title: 'RECOLECTA EN EL GRID', desc: 'Recoge dos datos.', type: 'recoleta', contact: 'mamaWire', n: 2, risk: 'low', reward: 100, xp: 12, done: false, failed: false, prog: { gathered: 1 } }] },
    immersion: makeImmersion({ loaded: true })
  });
  await page.keyboard.press('Control+s');
  const checkpoint = (await game.snapshot()).saved;
  await game.fatal({ credits: 9876, xp: 99 });
  expect((await game.snapshot()).saved._reconnectCheckpoint.player.credits).toBe(9876);
  await game.reload();
  const reconnect = page.locator('#flatline [data-action="reconnect"]');
  const record = page.locator('#flatline [data-action="newRecord"]');
  await expect(reconnect).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(record).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(reconnect).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#flatline')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  await expect(page.locator('#h-cpu')).toHaveText('50/100');
  await expect(page.locator('#h-ram')).toHaveText('0/6');
  await expect(nav(page, 'inicio')).toHaveClass(/active/);
  const result = await game.snapshot();
  expect(result.state.player).toMatchObject({ credits: 9876, xp: 99, level: 3, heat: Math.round(checkpoint.player.heat * 0.4), stats: { jobsFailed: 3 } });
  expect(result.state.jobs[0]).toMatchObject({ done: true, failed: true });
  expect(result.immersion).toBeNull();
  expect(result.saved._inImmersion).toBeNull();
  expect(result.saved._reconnectCheckpoint).toBeUndefined();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#cmd')).toBeFocused();
});

test('combate: foco de claves, Enter daña, código real normalizado y Escape durante revelación', async ({ page, game }) => {
  await game.setup({ immersion: makeImmersion() });
  await game.startCombat();
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#escapeBtn')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#combatLog')).toContainText('fallo');
  expect((await game.snapshot()).state.player.cpu).toBe(94);
  await solveCodeCombat(page);
  await expect(page.locator('#combat')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  expect((await game.snapshot()).saved.player.stats.ice).toBe(1);

  await game.startCombat({ type: 'daemon', tier: 3 });
  await expect(page.locator('#memPhase')).toHaveText('MEMORIZA LA SECUENCIA');
  await expect(page.locator('#memInput')).toBeHidden();
  await expect(page.locator('#escapeBtn')).toBeFocused();
  const before = await game.snapshot();
  await page.keyboard.press('Escape');
  const after = await game.snapshot();
  // Escape is probabilistic. Both legitimate outcomes must show exactly one attempt.
  if (after.combatActive) {
    await expect(page.locator('#combatLog')).toContainText('huida fallida');
    expect(after.state.player.cpu).toBe(before.state.player.cpu - 14);
    expect(after.state.player.stats.totalDamageReceived).toBe(before.state.player.stats.totalDamageReceived + 14);
    expect(after.combat.memPhase).toBe('reveal');
    expect(after.combat.memSequence).toBe(before.combat.memSequence);
  } else {
    await expect(page.locator('#combat')).toBeHidden();
    await expect(page.locator('#os')).toHaveJSProperty('inert', false);
    expect(after.state.player.cpu).toBe(before.state.player.cpu);
    expect(after.state.player.heat).toBe(before.state.player.heat + 5);
    expect(after.combat).toBeNull();
  }
});

test('combate: RESET/IMPORTAR del fondo no reciben input; guardia y FileReader rechazan sustitución', async ({ page, game }) => {
  await game.setup({ player: { credits: 2000 }, immersion: makeImmersion() });
  await game.openSaveTools();
  await game.startCombat();
  let chooserCount = 0;
  page.on('filechooser', () => { chooserCount++; });
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(page.locator('#codeInput')).toBeFocused();
  for (const selector of ['#btn-reset', '#btn-import']) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    // Real pointer input at the covered location, not force:true or dispatchEvent.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('#confirm-overlay')).toBeHidden();
    await expect(page.locator('#combat')).toBeVisible();
  }
  expect(chooserCount).toBe(0);
  await expect(page.locator('#cmd')).not.toBeFocused();
  await page.locator('#codeInput').click();
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#escapeBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#escapeBtn')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#escapeBtn')).toBeFocused();

  await test.step('assert separado de la guardia pública, no sustituto del input DOM', async () => {
    const guard = await page.locator('#combat').evaluate(() => {
      const previousState = S;
      const previousBattle = COM;
      const accepted = importGameState(nuevoEstado());
      return { accepted, sameState: S === previousState, sameBattle: COM === previousBattle, living: livingInteraction() };
    });
    expect(guard).toEqual({ accepted: false, sameState: true, sameBattle: true, living: false });
  });
  await page.keyboard.press('Control+s');
  await game.expectMessage('partida guardada');
  const before = await game.snapshot();
  const incoming = clone(before.saved);
  incoming.player.credits = 9000;
  // The inaccessible picker is not presented as usable: this probes the real async
  // file-input/FileReader completion path, as if a pending selection finished now.
  await page.locator('#import-file').setInputFiles(jsonFile(incoming, 'durante-combate.json'));
  await game.expectMessage('termina el combate');
  await expect(page.locator('#combat')).toBeVisible();
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  const after = await game.snapshot();
  expect(after.raw).toBe(before.raw);
  expect(after.state.player.credits).toBe(2000);
  expect(after.combat).toEqual(before.combat);
});

test('árbol: Tab y Enter desbloquean, guardan y Escape cierra sin focus() artificial', async ({ page, game }) => {
  await game.setup({ player: { skillPoints: 1 } });
  await nav(page, 'estado').click();
  await action(page, 'openSkillTree').click();
  const skill = page.locator('#skilltree-overlay .skill-node[data-branch="0"][data-skill="0"]');
  await expect(skill).toHaveAttribute('role', 'button');
  await expect(skill).toHaveAttribute('aria-disabled', 'false');
  await tabTo(page, skill);
  await expect(skill).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(skill).toHaveClass(/unlocked/);
  await expect(skill).toHaveAttribute('aria-disabled', 'true');
  await expect(skill).toContainText('DESBLOQUEADO');
  const saved = (await game.snapshot()).saved;
  expect(saved.player).toMatchObject({ skillPoints: 0, breakerUp: 1, _unlockedSkills: ['rompe1'] });
  await page.keyboard.press('Escape');
  await expect(page.locator('#skilltree-overlay')).toBeHidden();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#cmd')).toBeFocused();
});

test('inmersión: recoger con input, GUARDAR/exportar, recargar y vender datos una vez', async ({ page, game }) => {
  // A real saved cooldown suppresses unrelated grid events; no random function is replaced.
  await game.setup({ player: { _gridEventCooldown: 3 }, immersion: makeImmersion() });
  await page.locator('#adjlist .adj-node[data-idx="0"]').click();
  // A legitimate random ambush remains possible: resolve it through actual code input.
  if ((await game.snapshot()).combatActive) await solveCodeCombat(page);
  await expect(page.locator('#h-ram')).toHaveText('1/6');
  await expect(page.locator('#grid-current')).toContainText('NODO DE DATOS');
  await game.openSaveTools();
  await page.locator('#btn-save').click();
  await game.expectMessage('guardada a mano');
  const saved = (await game.snapshot()).saved;
  expect(saved._inImmersion).toMatchObject({ current: '1_0', dataUsed: 1, data: [{ value: 77 }] });
  await game.openSaveTools();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('cypher_os_save.json');
  const exported = await downloadJSON(download);
  expect(exported._inImmersion).toEqual(saved._inImmersion);

  await game.reload();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  await expect(page.locator('#h-ram')).toHaveText('1/6');
  expect((await game.snapshot()).immersion).toEqual(exported._inImmersion);
  await action(page, 'doSuperficie').click();
  await expect(page.locator('#overlay')).toContainText('RESUMEN DE LA INMERSIÓN');
  await expect(page.locator('.resume-row').filter({ hasText: 'Datos recogidos' }).locator('.rv')).toHaveText('1');
  await expect(page.locator('.resume-row').filter({ hasText: 'Créditos ganados' }).locator('.rv')).toHaveText('₡77');
  await expect(page.locator('#h-cc')).toHaveText('577');
  const surface = (await game.snapshot()).saved;
  expect(surface._inImmersion).toBeNull();
  expect(surface.player.stats).toMatchObject({ data: 1, credits: 77, immerse: 1 });
  await action(page, 'closeResume').click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.keyboard.press('Control+s');
  expect((await game.snapshot()).saved.player.credits).toBe(577);
});

test('importación: picker real rechaza JSON/tipos dañados y recupera un grid válido sin herencia local', async ({ page, game }) => {
  await game.setup({ player: { credits: 1234 }, state: { best: { level: 9, finalDone: true } } });
  await page.keyboard.press('Control+s');
  const before = await game.snapshot();
  const badSkills = clone(before.saved);
  badSkills.player._unlockedSkills = [42];
  const invalid = [
    ['malformado.json', '{"player":', 'error al leer archivo'],
    ['player-invalido.json', '{"player":1}', 'archivo inválido'],
    ['skills-invalidas.json', badSkills, 'archivo inválido']
  ];
  for (const [name, value, message] of invalid) {
    await page.keyboard.press('Control+s');
    await game.expectMessage('partida guardada');
    await game.importFile(value, name);
    await game.expectMessage(message);
    const after = await game.snapshot();
    expect(after.raw).toBe(before.raw);
    expect(after.state.player.credits).toBe(1234);
    await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  }
  const incoming = clone(before.saved);
  incoming.player.credits = 8765;
  incoming.player.cpu = 73;
  incoming.player.level = 2;
  incoming.player.stats.data = 1;
  incoming.player._unlockedSkills = [];
  incoming.best = { level: 2 };
  incoming._inImmersion = makeImmersion({ loaded: true });
  await game.importFile(incoming, 'grid-valido.json');
  await game.expectMessage('de vuelta en el grid');
  await expect(page.locator('#gridcanvas')).toBeVisible();
  await expect(page.locator('#h-cpu')).toHaveText('73/100');
  await expect(page.locator('#h-cc')).toHaveText('8765');
  await expect(page.locator('#h-ram')).toHaveText('1/6');
  const imported = await game.snapshot();
  expect(imported.view).toBe('red');
  // This fixture predates tracking: migrate only demonstrated visits, never regenerate its grid.
  const restored = { ...incoming._inImmersion, visited: ['0_0', '1_0'], visitsPartial: true,
    enemyCounts: { ice: 0, daemons: 0, trackers: 0, nucleo: 0 }, enemyCountsPartial: true,
    exploredNotified: false, exhaustedNotified: false };
  expect(imported.immersion).toEqual(restored);
  expect(imported.saved._inImmersion).toEqual(restored);
  expect(imported.saved.best).toEqual({ level: 2 });
  expect(imported.saved.player._unlockedSkills).toEqual([]);
});

test('vault: solo se acepta en la calle, uno activo y un objetivo en el siguiente grid', async ({ page, game }) => {
  const first = vaultOffer('vault-kuro', 'KURO', 'MALLA');
  const second = vaultOffer('vault-lapida', 'LÁPIDA', 'ESTRATO');
  await game.setup({ state: { offers: [first, second] }, immersion: makeImmersion() });
  await nav(page, 'contactos').click();
  const kuro = page.locator('#offers-doctorSudario .offer').filter({ hasText: first.title });
  await expect(kuro).toContainText('ACEPTAR EN LA CALLE');
  await expect(kuro.locator('[data-action="acceptJob"]')).toHaveCount(0);
  expect((await game.snapshot()).state.jobs).toEqual([]);
  await nav(page, 'red').click();
  await action(page, 'doSuperficie').click();
  await action(page, 'closeResume').click();
  await nav(page, 'contactos').click();
  await page.locator('[data-action="acceptJob"][data-id="vault-kuro"]').click();
  expect((await game.snapshot()).saved.jobs).toHaveLength(1);
  await page.locator('[data-action="acceptJob"][data-id="vault-lapida"]').click();
  await game.expectMessage('UN contrato de vault');
  expect((await game.snapshot()).state.jobs).toHaveLength(1);
  await nav(page, 'inicio').click();
  await action(page, 'dipGrid').click();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  const vaults = (await game.snapshot()).immersion.grid.nodes.filter(node => node.type === 'vault');
  expect(vaults).toHaveLength(1);
  expect(vaults[0]).toMatchObject({ proj: 'KURO', layer: 2 });
});

test('Núcleo: c08 conecta desde la calle y conserva un único jefe tras recarga', async ({ page, game }) => {
  await game.setup({ player: { level: 5, rep: { night0X: 3 } }, state: { history: { finalUnlocked: true } }, immersion: makeImmersion() });
  const oldGrid = (await game.snapshot()).immersion;
  expect(oldGrid.depth).toBe(4);
  expect(oldGrid.grid.nodes.some(node => node.boss)).toBe(false);
  await nav(page, 'inicio').click();
  await expect(action(page, 'acceptNucleo')).toHaveCount(0);
  await game.command('nucleo');
  expect((await game.snapshot()).saved.nextDepth).toBeNull();
  expect((await game.snapshot()).immersion.grid).toEqual(oldGrid.grid);
  await nav(page, 'red').click();
  await action(page, 'doSuperficie').click();
  await action(page, 'closeResume').click();
  await expect(action(page, 'acceptNucleo')).toBeVisible();
  await action(page, 'acceptNucleo').click();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  const connected = await game.snapshot();
  expect(connected.immersion.depth).toBe(5);
  expect(connected.saved._inImmersion).toEqual(connected.immersion);
  expect(connected.saved.nextDepth).toBeNull();
  await game.reload();
  expect((await game.snapshot()).immersion).toEqual(connected.immersion);
  await game.command('nucleo');
  expect((await game.snapshot()).immersion.grid).toEqual(connected.immersion.grid);
  await nav(page, 'red').click();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  const next = await game.snapshot();
  expect(next.immersion.depth).toBe(5);
  expect(next.immersion.grid.maxDepth).toBe(5);
  expect(next.saved.nextDepth).toBeNull();
  const bosses = next.immersion.grid.nodes.filter(node => node.boss);
  expect(bosses).toHaveLength(1);
  expect(bosses[0]).toMatchObject({ type: 'nucleo', layer: 5, tier: 4 });
  const reachable = new Set([next.immersion.grid.entry]);
  const queue = [...reachable];
  while (queue.length) {
    for (const neighbor of next.immersion.grid.adj[queue.shift()] || []) {
      if (!reachable.has(neighbor)) { reachable.add(neighbor); queue.push(neighbor); }
    }
  }
  expect(reachable.has(bosses[0].id)).toBe(true);
});

test.describe('navegación táctil responsive', () => {
  test.use({ viewport: { width: 720, height: 900 }, hasTouch: true });

  test('720 y 375 px: menú colapsado, navegación y confirmación con tap', async ({ page, game }) => {
    await game.setup({}, { touch: true, skip: 'click' });
    for (const width of [720, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(nav(page, 'contactos').locator('.lbl')).toHaveCSS('display', 'none');
      for (const [view, title] of [['contactos', 'CONTACTOS'], ['tienda', 'MERCADO NEGRO'], ['estado', 'ESTADO']]) {
        await nav(page, view).tap();
        await expect(nav(page, view)).toHaveClass(/active/);
        await expect(page.locator('#panel-scroll h1.title')).toHaveText(title);
        const box = await nav(page, view).boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
    await game.openSaveTools({touch:true});
    await page.locator('#btn-reset').tap();
    await expect(page.locator('#confirm-overlay')).toBeVisible();
    await page.locator('#confirm-overlay [data-action="confirmNo"]').tap();
    await expect(page.locator('#confirm-overlay')).toBeHidden();
    await expect(page.locator('#os')).toHaveJSProperty('inert', false);
    expect((await game.snapshot()).state.player.cpu).toBe(100);
  });
});
