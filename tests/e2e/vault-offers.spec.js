'use strict';
const {test,expect,makeImmersion,downloadJSON}=require('./fixtures');
const nav=(page,view)=>page.locator(`.navbtn[data-view="${view}"]`);
function offer(project='KURO',id='vault-kuro',contact='doctorSudario') {
  const corp=project==='MIRAJE'?'HELIOX':'KURO GATECH';
  return {id,title:'EL VAULT DE '+corp,desc:'Recupera el proyecto '+project+'.',type:'vault',n:1,
    contact,risk:'high',reward:100,xp:10,project,targetDepth:2};
}
function job(project='KURO',id='vault-kuro',extra={}) {
  return {...offer(project,id),done:false,failed:false,prog:{vaulted:false},...extra};
}
async function moveToVault(page,game) {
  const before=await game.snapshot(), index=before.immersion.grid.adj[before.immersion.current].indexOf('2_0');
  expect(index).toBeGreaterThanOrEqual(0);
  await page.locator(`#adjlist .adj-node[data-idx="${index}"]`).click();
  if ((await game.snapshot()).combat?.mode==='claves') {
    // Un rastreador aleatorio puede preceder al puzzle. Resolver sus fases reales.
    const phases=await page.locator('body').evaluate(()=>COM.phases);
    for(let phase=0;phase<phases;phase++) {
      const code=(await page.locator('#codeTarget').innerText()).replace(/\s/g,'');
      await page.keyboard.type(code);
    }
  }
  await expect(page.locator('#combat .vp-sequence')).toBeVisible();
}
async function solveVault(page) {
  const sequence=(await page.locator('#combat .vp-sequence').innerText()).trim().split(/\s+/);
  await page.clock.runFor(3000);
  for(const symbol of sequence) {
    const available=await page.locator('#vpOrder .vault-symbol:not(.picked)').evaluateAll(nodes=>
      nodes.map(n=>({index:n.getAttribute('data-idx'),symbol:n.textContent.trim()})));
    const match=available.find(n=>n.symbol===symbol); expect(match).toBeDefined();
    await page.locator(`#vpOrder .vault-symbol[data-idx="${match.index}"]`).click();
  }
  await expect(page.locator('#combat')).toBeHidden();
}

test('vault F02: resolver elimina ofertas inmediatamente, importar conserva cobro y refrescar no reoferta',async({page,game})=>{
  const inm=makeImmersion();
  Object.assign(inm.grid.nodes[2],{type:'vault',tier:3,tierName:'T3',proj:'KURO',name:'VAULT · KURO'});
  inm.current='1_0'; inm.moves=1; inm.maxDepthReached=1;
  await game.setup({player:{sigilo:20,_gridEventCooldown:10000},immersion:inm,
    state:{jobs:[job()],offers:[offer('KURO','duplicada','night0X'),offer('MIRAJE','otro')]}});
  await nav(page,'red').click(); await moveToVault(page,game); await solveVault(page);
  const recovered=await game.snapshot();
  expect(recovered.state.intel).toContain('exp_kuro');
  expect(recovered.state.jobs[0]).toMatchObject({done:false,prog:{vaulted:true}});
  expect(recovered.state.player.credits).toBe(500);
  expect(recovered.state.offers.map(o=>o.project)).toEqual(['MIRAJE']);
  await nav(page,'contactos').click();
  await expect(page.locator('.offer').filter({hasText:'proyecto KURO'})).toHaveCount(0);
  await nav(page,'red').click();
  const download=page.waitForEvent('download'); await page.locator('#btn-export').click();
  const exported=await downloadJSON(await download);
  exported.offers.push(offer('KURO','obsoleta'));
  // Evidencia legacy directa: snapshot consumido con progreso de contrato ausente.
  exported.jobs[0].prog.vaulted=false;
  await game.importFile(exported,'vault-legacy.json'); await game.expectMessage('de vuelta en el grid');
  const restored=await game.snapshot();
  expect(restored.immersion).toEqual(recovered.immersion);
  expect(restored.state.jobs[0]).toMatchObject({done:false,prog:{vaulted:true}});
  expect(restored.state.player).toEqual(recovered.state.player);
  expect(restored.state.offers.some(o=>o.project==='KURO')).toBe(false);
  await page.locator('[data-action="doSuperficie"]').click();
  await page.locator('[data-action="closeResume"]').click();
  expect((await game.snapshot()).state.player.credits).toBe(600);
  expect((await game.snapshot()).state.player.stats.jobsCompleted).toBe(1);
  await game.reload();
  await nav(page,'contactos').click();
  await page.locator('[data-action="refreshOffers"]').click();
  const after=await game.snapshot();
  expect(after.state.offers.some(o=>o.type==='vault'&&o.project==='KURO')).toBe(false);
  expect(after.state.player.credits).toBe(600);
  expect(after.state.player.stats.jobsCompleted).toBe(1);
});

test('vault F02: ocho recuperados dejan trabajos repetibles; RESET recupera catálogo nuevo',async({page,game})=>{
  const intel=['exp_kuro','exp_somnio','exp_miraje','exp_eko9','exp_carmin','exp_lapida','exp_halcon','exp_vesper'];
  await game.setup({player:{level:4,rep:{night0X:2}},state:{intel,offers:[offer()]}});
  await nav(page,'contactos').click();
  await expect(page.locator('#panel-scroll')).toContainText('Los ocho proyectos están recuperados');
  for(let i=0;i<3;i++) {
    await page.locator('[data-action="refreshOffers"]').click();
    const offers=(await game.snapshot()).state.offers;
    expect(offers).toHaveLength(8); expect(offers.filter(o=>o.type==='vault')).toHaveLength(0);
    for(const contact of ['mamaWire','doctorSudario','night0X','kairos']) expect(offers.filter(o=>o.contact===contact)).toHaveLength(2);
  }
  const available=(await game.snapshot()).state.offers.find(o=>o.type==='recoleta');
  await page.locator(`[data-action="acceptJob"][data-id="${available.id}"]`).click();
  await nav(page,'red').click(); await page.locator('[data-action="dipGrid"]').click();
  const generated=await game.snapshot();
  expect(generated.immersion.grid.nodes.filter(n=>n.type==='data').length).toBeGreaterThanOrEqual(available.n);
  expect(generated.immersion.grid.nodes.filter(n=>n.type==='vault')).toHaveLength(0);
  await page.locator('#btn-reset').click(); await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  const reset=await game.snapshot();
  expect(reset.state.intel).toHaveLength(0); expect(reset.state.jobs).toHaveLength(0);
  expect(reset.state.offers.some(o=>o.type==='vault')).toBe(true);
});

test('vault F02: importar duplicado legacy lo retira una vez sin calor ni otro pago',async({page,game})=>{
  await game.setup({state:{offers:[]}});
  const candidate=(await game.snapshot()).saved;
  candidate.player.heat=30; candidate.player.stats.maxHeat=30;
  candidate.player.credits=600; candidate.player.stats.jobsCompleted=1;
  candidate.jobs=[job('KURO','cobrado',{done:true,prog:{vaulted:true}}),job('KURO','duplicado',{prog:{vaulted:true}})];
  candidate.offers=[offer('KURO','obsoleta')];
  const expectedPlayer=JSON.parse(JSON.stringify(candidate.player)); expectedPlayer.stats.jobsFailed++;
  await game.importFile(candidate,'duplicado.json'); await game.expectMessage('de vuelta en la calle');
  const imported=await game.snapshot();
  expect(imported.state.player).toEqual(expectedPlayer);
  expect(imported.state.jobs[1]).toMatchObject({done:true,failed:true,_vaultRetired:true,prog:{vaulted:true}});
  expect(imported.state.offers).toHaveLength(0);
  await nav(page,'trabajos').click();
  await expect(page.locator('.job').filter({hasText:'retirado:'})).toContainText('RETIRADO');
  await expect(page.locator('.job').filter({hasText:'retirado:'})).toContainText('sin calor ni recompensa');
  await game.reload();
  const restored=await game.snapshot();
  expect(restored.state.player.credits).toBe(600); expect(restored.state.player.xp).toBe(expectedPlayer.xp);
  expect(restored.state.player.rep).toEqual(expectedPlayer.rep); expect(restored.state.player.stats.jobsFailed).toBe(1);
  expect(restored.state.log.filter(e=>e.text.startsWith('CONTRATO RECTIFICADO'))).toHaveLength(1);
});

test('vault F02: recuperación legítima sin snapshot conserva el cobro al siguiente DIP',async({page,game})=>{
  await game.setup({state:{jobs:[job('MIRAJE','pendiente',{prog:{vaulted:true}})],offers:[offer('MIRAJE','obsoleta')]}});
  await nav(page,'trabajos').click();
  await expect(page.locator('.job')).toContainText('proyecto recuperado');
  expect((await game.snapshot()).state.jobs[0].done).toBe(false);
  await nav(page,'red').click(); await page.locator('[data-action="dipGrid"]').click();
  const generated=await game.snapshot();
  expect(generated.state.jobs[0]).toMatchObject({done:false,prog:{vaulted:true}});
  expect(generated.immersion.grid.nodes.some(n=>n.type==='vault')).toBe(false);
  await page.locator('[data-action="doSuperficie"]').click(); await page.locator('[data-action="closeResume"]').click();
  const paid=await game.snapshot();
  expect(paid.state.player.credits).toBe(600); expect(paid.state.player.stats.jobsCompleted).toBe(1);
  expect(paid.state.jobs[0]).toMatchObject({done:true,failed:false});
});
