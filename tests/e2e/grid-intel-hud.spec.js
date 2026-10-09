'use strict';
const { test, expect, makeImmersion, solveCodeCombat, downloadJSON } = require('./fixtures');
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
  const inm=(await game.snapshot()).immersion;
  const index=inm.grid.adj[inm.current].indexOf(id);
  expect(index).toBeGreaterThanOrEqual(0);
  await page.locator(`#adjlist .adj-node[data-idx="${index}"]`).click();
  if(await page.locator('#codeInput').isVisible()) await solveCodeCombat(page);
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
  const won=await game.snapshot();
  expect(won.state.intel).toContain('exp_vesper');
  expect(won.state.intel).not.toContain('vesper');
  expect(won.saved.intel).toContain('exp_vesper');
  await nav(page,'informes').click();
  const dossier=page.locator('.intel').filter({hasText:'EXPEDIENTE RECUPERADO // VESPER'});
  await expect(dossier).toContainText('FIRMA CENSURADA');
  await expect(dossier).toContainText('KURO GATECH y MONOLITH');
  const promise=page.waitForEvent('download');await page.locator('#btn-export').click();
  const exported=await downloadJSON(await promise);
  await game.reload();expect((await game.snapshot()).state.intel).toContain('exp_vesper');
  await game.importFile(exported,'vesper.json');
  expect((await game.snapshot()).immersion).toEqual(won.immersion);
  await nav(page,'informes').click();
  await expect(page.locator('.intel').filter({hasText:'EXPEDIENTE RECUPERADO // VESPER'})).toHaveCount(1);
});
test('legacy en la calle: importar y cargar recuperan VESPER desde el contrato sin repetir pago ni XP', async ({page,game}) => {
  await game.setup({state:{offers:[]},player:{credits:4321}});
  const incoming=(await game.snapshot()).saved;
  incoming.intel=[]; incoming._inImmersion=null;
  incoming.jobs=[{id:'vault-legacy',title:'EL VAULT DE MONOLITH',desc:'Recupera VESPER.',type:'vault',
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
    await expect(page.locator('.intel').filter({hasText:'EXPEDIENTE RECUPERADO // VESPER'})).toHaveCount(1);
  };
  await game.importFile(incoming,'vesper-antiguo.json');
  await assertRecovered();
  // Arrange the original legacy storage directly, without running its migration in the fixture.
  await page.evaluate(legacy=>localStorage.setItem('cypher_os_save_v9',JSON.stringify(legacy)),incoming);
  await game.reload();
  await assertRecovered();
  const migrated=(await game.snapshot()).saved;
  await game.importFile(migrated,'vesper-migrado.json');
  await assertRecovered();
  expect((await game.snapshot()).state.log.filter(e=>e.text.startsWith('INTEL ▸ EXPEDIENTE RECUPERADO // VESPER'))).toHaveLength(1);
});
test('HUD: visitas, ICE, tres contratos y avisos persistentes de exploración y agotamiento', async ({page,game}) => {
  const inm=trackedImmersion();
  Object.assign(inm.grid.nodes[2],{type:'ice',tier:2,tierName:'T2',name:'ICE DE PRUEBA'});
  Object.assign(inm.grid.nodes[4],{type:'data',data:88,name:'DATOS PROFUNDOS'});
  await game.setup({immersion:inm,player:{heat:50,sigilo:20,_gridEventCooldown:10000},
    state:{offers:[],jobs:[job('recoleta',1),job('carrera',1),job('rompehielas',1)]}});
  await expect(page.locator('#gridhud')).toContainText('EXPLORADOS 1/5');
  await expect(page.locator('#grid-job-items .grid-job')).toHaveCount(3);
  const canvas=await page.locator('#gridcanvas').elementHandle();
  const neighbor=await page.locator('#adjlist .adj-node').first().elementHandle();
  await page.clock.runFor(1000);
  expect(await neighbor.evaluate(el=>el.isConnected)).toBe(true);
  for(const id of ['1_0','2_0','3_0','4_0']) await move(page,game,id);
  await expect(page.locator('#gridhud')).toContainText('EXPLORADOS 5/5');
  await expect(page.locator('#gridhud')).toContainText('DAEMONS 0');
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
  await page.locator('#btn-save').click();
  await game.reload();
  expect((await game.snapshot()).immersion.visited).toEqual(after.immersion.visited);
  expect((await game.snapshot()).state.log.filter(e=>e.text.startsWith('GRID AGOTADO'))).toHaveLength(1);
  await page.locator('[data-action="doSuperficie"]').click();
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
  await expect(page.locator('#gridhud')).toContainText('(parcial)');
  await move(page,game,'3_0');await move(page,game,'2_0');await move(page,game,'1_0');
  await expect(page.locator('#grid-status')).not.toContainText('GRID AGOTADO');
  expect((await game.snapshot()).immersion.grid.nodes[1].done).toBe(false);
});
for(const viewport of [{width:768,height:1024},{width:1024,height:600}]) {
  test(`tablet ${viewport.width}x${viewport.height}: HUD plegable y memoria sin caja redundante`, async ({page,game}) => {
    await page.setViewportSize(viewport);
    await game.setup({immersion:trackedImmersion(),state:{offers:[],jobs:[job('recoleta',1),job('carrera',1),job('rompehielas',1)]}});
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
