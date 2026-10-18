'use strict';
const { test, expect, makeImmersion, solveCodeCombat, downloadJSON, openGridControls } = require('./fixtures');
const nav = (page, view) => page.locator(`.navbtn[data-view="${view}"]`);
function trackedImmersion() {
  const inm=makeImmersion();
  return {...inm,visited:[inm.grid.entry],visitsPartial:false,
    enemyCounts:{ice:0,daemons:0,trackers:0,nucleo:0},enemyCountsPartial:false,
    exploredNotified:false,exhaustedNotified:false};
}
function job(type, n, progress=0) {
  const field={recoleta:'gathered',carrera:'deepGathered',rompehielas:'iceT2'}[type];
  return {id:type,title:type,desc:type,type,n,contact:'doctorSudario',reward:100,xp:10,risk:'med',done:false,failed:false,prog:{[field]:progress}};
}
async function move(page, game, id) {
  await openGridControls(page);
  const inm=(await game.snapshot()).immersion;
  const index=inm.grid.adj[inm.current].indexOf(id);
  expect(index).toBeGreaterThanOrEqual(0);
  await page.locator(`#adjlist .adj-node[data-idx="${index}"]`).click();
  if(await page.locator('#combat-enter').isVisible()) await page.locator('#combat-enter').click();
  if(await page.locator('#codeInput').isVisible() || await page.locator('#traceReply').isVisible() || await page.locator('#routeBoard').isVisible()) await solveCodeCombat(page);
}
async function solveVault(page) {
  const symbols=(await page.locator('.vp-sequence').innerText()).trim().split(/\s+/);
  await page.clock.runFor(3000);
  for(const symbol of symbols){
    const index=await page.locator('#vpOrder .vault-symbol:not(.picked)').evaluateAll((elements, symbol)=>
      elements.find(el=>el.textContent.trim()===symbol)?.getAttribute('data-idx'),symbol);
    expect(index).toBeDefined();
    await page.locator(`#vpOrder .vault-symbol[data-idx="${index}"]`).click();
  }
  await expect(page.locator('#combat')).toBeHidden();
}
test('VESPER recuperado: expediente inmediato, sin cinco daemons, conserva exportación/importación y recarga', async ({page,game}) => {
  const inm=trackedImmersion();
  Object.assign(inm.grid.nodes[2],{type:'vault',tier:3,tierName:'T3',name:'VAULT VESPER',proj:'VESPER'});
  inm.current='1_0';inm.visited.push('1_0');inm.grid.nodes[1].done=inm.grid.nodes[1]._done=true;
  inm.data=[{value:77}];inm.dataUsed=1;
  await game.setup({immersion:inm,player:{sigilo:20,_gridEventCooldown:10000},state:{offers:[]}});
  await move(page,game,'2_0');
  await expect(page.locator('.vp-sequence')).toBeVisible();
  expect((await game.snapshot()).state.intel).not.toContain('exp_vesper');
  await solveVault(page);
  // El expediente es un informe nuevo: se anuncia con el cartel discreto.
  await expect(page.locator('#banner')).toHaveClass(/banner-informe/);
  await expect(page.locator('#banner-title')).toHaveText('3 INFORMES ARCHIVADOS');
  await expect(page.locator('#banner-sub')).toHaveText('revisa INFORMES');
  await page.screenshot({path:'test-results/informe-vault.png'});
  const won=await game.snapshot();
  expect(won.state.intel).toContain('exp_vesper');
  expect(won.state.intel).not.toContain('vesper');
  expect(won.saved.intel).toContain('exp_vesper');
  await nav(page,'informes').click();
  const dossier=page.locator('.intel').filter({hasText:'EXPEDIENTE RECUPERADO // CONTINUIDAD'});
  await expect(dossier).toContainText('FIRMA CENSURADA');
  await expect(dossier).toContainText('MALLA y ESTRATO');
  await game.openSaveTools();
  const promise=page.waitForEvent('download');await page.locator('#btn-export').click();
  const exported=await downloadJSON(await promise);
  await game.reload();expect((await game.snapshot()).state.intel).toContain('exp_vesper');
  await game.importFile(exported,'vesper.json');
  expect((await game.snapshot()).immersion).toEqual(won.immersion);
  await nav(page,'informes').click();
  await expect(page.locator('.intel').filter({hasText:'EXPEDIENTE RECUPERADO // CONTINUIDAD'})).toHaveCount(1);
});
test('emboscada encadenada en ruta al vault resuelve el combate y abre el puzzle', async ({page,game}) => {
  const inm=trackedImmersion();
  Object.assign(inm.grid.nodes[2],{type:'vault',tier:3,tierName:'T3',name:'VAULT VESPER',proj:'VESPER'});
  inm.current='1_0';inm.visited.push('1_0');inm.grid.nodes[1].done=inm.grid.nodes[1]._done=true;
  await game.setup({immersion:inm,player:{sigilo:20,_gridEventCooldown:10000},state:{offers:[]}});
  // Arrange: sin eventos por cooldown y emboscada garantizada por RNG; el flujo
  // combate→resolución→efecto del nodo es real y no sustituye handlers del juego.
  await page.evaluate(()=>{Math.random=()=>0;});
  await move(page,game,'2_0');
  await expect(page.locator('.vp-sequence')).toBeVisible();
  await solveVault(page);
  expect((await game.snapshot()).state.intel).toContain('exp_vesper');
});
test('legacy en la calle: importar y cargar recuperan VESPER desde el contrato sin repetir pago ni XP', async ({page,game}) => {
  await game.setup({state:{offers:[]},player:{credits:4321}});
  const incoming=(await game.snapshot()).saved;
  incoming.intel=[]; incoming._inImmersion=null;
  incoming.jobs=[{id:'vault-legacy',title:'EL VAULT DE ESTRATO',desc:'Recupera VESPER.',type:'vault',
    project:'VESPER',targetDepth:4,n:1,contact:'doctorSudario',reward:500,xp:30,risk:'high',
    done:true,failed:false,prog:{vaulted:true}}];
  incoming.player.stats.jobsCompleted=1;
  const assertRecovered=async()=>{
    const recovered=await game.snapshot();
    expect(recovered.immersion).toBeNull();
    expect(recovered.state.intel.filter(id=>id==='exp_vesper')).toHaveLength(1);
    expect(recovered.saved.intel).toContain('exp_vesper');
    expect(recovered.state.player).toMatchObject({credits:incoming.player.credits,xp:incoming.player.xp,
      level:incoming.player.level,skillPoints:incoming.player.skillPoints,rep:incoming.player.rep,
      stats:{jobsCompleted:1,credits:incoming.player.stats.credits}});
    expect(recovered.state.jobs).toEqual(incoming.jobs);
    await nav(page,'informes').click();
    await expect(page.locator('.intel').filter({hasText:'EXPEDIENTE RECUPERADO // CONTINUIDAD'})).toHaveCount(1);
  };
  await game.importFile(incoming,'vesper-antiguo.json');
  await assertRecovered();
  // Arrange the original legacy storage directly, without running its migration in the fixture.
  await page.evaluate(legacy=>localStorage.setItem('cypher_os_save_story_v1',JSON.stringify(legacy)),incoming);
  await game.reload();
  await assertRecovered();
  const migrated=(await game.snapshot()).saved;
  await game.importFile(migrated,'vesper-migrado.json');
  await assertRecovered();
  expect((await game.snapshot()).state.log.filter(e=>e.text.startsWith('INTEL ▸ EXPEDIENTE RECUPERADO // CONTINUIDAD'))).toHaveLength(1);
});
test('INFORMES avisa de lo archivado: punto, marca NUEVO y cartel discreto', async ({page,game}) => {
  // Logros ya concedidos: con una sola acción real, el único cartel posible es el de INFORMES.
  const achievements=await page.evaluate(()=>ACHIEVEMENTS.map(a=>a.id));
  await game.setup({state:{achievements}});
  const dot=page.locator('#notif-informes');
  const banner=page.locator('#banner');
  await expect(dot).not.toHaveClass(/show/);
  await nav(page,'contactos').click();
  await page.locator('[data-action="acceptJob"]').first().click();
  // El informe de LOS FIXERS se archiva: cartel verde discreto, no la tarjeta de logro.
  await expect(banner).toHaveClass(/banner-informe/);
  await expect(page.locator('#banner-icon')).toHaveText('▤');
  await expect(page.locator('#banner-title')).toHaveText('LOS FIXERS');
  await expect(page.locator('#banner-sub')).toHaveText('revisa INFORMES');
  await expect(dot).toHaveClass(/show/);
  await page.screenshot({path:'test-results/informe-aviso.png'});
  await page.clock.runFor(4000);
  await expect(banner).not.toHaveClass(/show/);
  await expect(banner).toHaveCSS('opacity','0');
  await nav(page,'informes').click();
  const nueva=page.locator('.intel').filter({hasText:'LOS FIXERS'});
  await expect(nueva).toContainText('NUEVO');
  await expect(nueva).toHaveClass(/intel-nueva/);
  // Chromium cuantiza el alfa del color; comprobar la señal, no su redondeo textual.
  const colores=await nueva.evaluate(el=>{
    return {fondo:getComputedStyle(el,'::after').backgroundColor,borde:getComputedStyle(el,'::before').backgroundColor};
  });
  expect(colores.fondo).toMatch(/^rgba\(77, 255, 166, /);
  expect(parseFloat(colores.fondo.split(',')[3])).toBeCloseTo(0.045,2);
  expect(colores.borde).toMatch(/^rgba\(77, 255, 166, /);
  expect(parseFloat(colores.borde.split(',')[3])).toBeCloseTo(0.55,2);
  await expect(page.locator('#panel-scroll .sub')).toContainText('1 nuevo');
  await page.screenshot({path:'test-results/informe-nuevo.png'});
  await expect(dot).not.toHaveClass(/show/);
  // La marca es de la visita: al volver al índice ya no repite lo leído.
  await nav(page,'inicio').click();
  await nav(page,'informes').click();
  await expect(page.locator('.intel .tag.nuevo')).toHaveCount(0);
  await expect(page.locator('#panel-scroll .sub')).toContainText('1/43 desbloqueado');
  await game.reload();
  await expect(dot).not.toHaveClass(/show/);
  await nav(page,'informes').click();
  await expect(page.locator('.intel .tag.nuevo')).toHaveCount(0);
});
test('HUD: visitas, ICE, tres contratos y avisos persistentes de exploración y agotamiento', async ({page,game}) => {
  const inm=trackedImmersion();
  Object.assign(inm.grid.nodes[2],{type:'ice',tier:2,tierName:'T2',name:'ICE DE PRUEBA'});
  Object.assign(inm.grid.nodes[4],{type:'data',data:88,name:'DATOS PROFUNDOS'});
  await game.setup({immersion:inm,player:{heat:50,sigilo:20,_gridEventCooldown:10000},
    state:{offers:[],jobs:[job('recoleta',1),job('carrera',1),job('rompehielas',1)]}});
  await expect(page.locator('#grid-stats')).toContainText('EXPLORADOS 1/5');
  await expect(page.locator('#grid-job-items .grid-job')).toHaveCount(3);
  const canvas=await page.locator('#gridcanvas').elementHandle();
  const neighbor=await page.locator('#adjlist .adj-node').first().elementHandle();
  await page.clock.runFor(1000);
  expect(await neighbor.evaluate(el=>el.isConnected)).toBe(true);
  for(const id of ['1_0','2_0','3_0','4_0']) await move(page,game,id);
  await expect(page.locator('#grid-stats')).toContainText('EXPLORADOS 5/5');
  await expect(page.locator('#grid-stats')).toContainText('DAEMONS 0');
  await expect(page.locator('#grid-status')).toContainText('GRID AGOTADO');
  const carrera=page.locator('.grid-job').filter({hasText:'carrera'});
  await expect(carrera).toContainText('baja el calor para cobrar');
  await expect(page.locator('#grid-jobs-summary')).toContainText('2/3');
  expect(await canvas.evaluate(el=>el===document.getElementById('gridcanvas'))).toBe(true);
  const after=await game.snapshot();
  expect(after.immersion.enemyCounts.ice).toBeGreaterThanOrEqual(1);
  expect(after.immersion.exploredNotified).toBe(true);
  expect(after.immersion.exhaustedNotified).toBe(true);
  expect(after.state.log.filter(e=>e.text.startsWith('GRID EXPLORADO'))).toHaveLength(1);
  expect(after.state.log.filter(e=>e.text.startsWith('GRID AGOTADO'))).toHaveLength(1);
  // Arrange the threshold; the actual existing clock must refresh the HUD, not a handler call.
  await page.evaluate(()=>{S.player.heat=45.01;});
  await page.clock.runFor(1000);
  await expect(carrera).toContainText('objetivo alcanzado');
  await expect(page.locator('#grid-jobs-summary')).toContainText('3/3');
  await game.openSaveTools();
  await page.locator('#btn-save').click();
  await game.reload();
  expect((await game.snapshot()).immersion.visited).toEqual(after.immersion.visited);
  expect((await game.snapshot()).state.log.filter(e=>e.text.startsWith('GRID AGOTADO'))).toHaveLength(1);
  await openGridControls(page);await page.locator('[data-action="doSuperficie"]').click();
  await expect(page.locator('#overlay')).toContainText('Trabajos completados');
  expect((await game.snapshot()).state.jobs.every(j=>j.done&&!j.failed)).toBe(true);
});
test('GRID explorado con RAM llena no se anuncia como agotado; legacy muestra datos parciales', async ({page,game}) => {
  const inm=makeImmersion();
  inm.current='4_0';inm.maxDepthReached=4;inm.visited=inm.grid.nodes.map(n=>n.id);inm.visitsPartial=false;
  inm.dataUsed=6;inm.data=Array.from({length:6},()=>({value:10}));
  await game.setup({immersion:inm,player:{sigilo:20,_gridEventCooldown:10000},state:{offers:[]}});
  await expect(page.locator('#grid-status')).toContainText('GRID EXPLORADO');
  await expect(page.locator('#grid-status')).toContainText('1 objetivos fijos pendientes');
  expect((await game.snapshot()).immersion.exhaustedNotified).toBe(false);
  await expect(page.locator('#grid-stats')).toContainText('(parcial)');
  await move(page,game,'3_0');await move(page,game,'2_0');await move(page,game,'1_0');
  await expect(page.locator('#grid-status')).not.toContainText('GRID AGOTADO');
  expect((await game.snapshot()).immersion.grid.nodes[1].done).toBe(false);
});
for(const viewport of [{width:768,height:1024},{width:1024,height:600}]) {
  test(`tablet ${viewport.width}x${viewport.height}: HUD plegable y memoria sin caja redundante`, async ({page,game}) => {
    await page.setViewportSize(viewport);
    await game.setup({immersion:trackedImmersion(),state:{offers:[],jobs:[job('recoleta',1),job('carrera',1),job('rompehielas',1)]}});
    await openGridControls(page);
    await expect(page.locator('#grid-jobs')).toHaveAttribute('open','');
    await page.locator('#grid-jobs-summary').click();
    await expect(page.locator('#grid-jobs')).not.toHaveAttribute('open','');
    await page.locator('#grid-jobs-summary').click();
    await expect(page.locator('#grid-jobs')).toHaveAttribute('open','');
    await expect(page.locator('#grid-job-items')).toBeVisible();
    const surface=await page.locator('[data-action="doSuperficie"]').boundingBox();
    expect(surface.x).toBeGreaterThanOrEqual(0);expect(surface.y).toBeGreaterThanOrEqual(0);
    expect(surface.x+surface.width).toBeLessThanOrEqual(viewport.width);
    expect(surface.y+surface.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({path:`test-results/grid-hud-${viewport.width}.png`});
    await game.startCombat({type:'daemon',tier:3});
    const sequence=(await page.locator('#memSeq').innerText()).replace(/\s/g,'');
    await expect(page.locator('#memZone')).toBeVisible();
    await page.clock.runFor(4100);
    await expect(page.locator('#memZone')).toBeHidden();
    await expect(page.locator('#memInput')).toBeFocused();
    await expect(page.locator('#memInputHint')).toContainText(`${sequence.length} caracteres`);
    for(const id of ['memInput','timerBar','escapeBtn']) {
      const box=await page.locator('#'+id).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({path:`test-results/grid-memory-${viewport.width}.png`});
    await page.keyboard.press('Enter');
    await expect(page.locator('#memZone')).toBeVisible();
    await expect(page.locator('#memInput')).toBeHidden();
  });
}
