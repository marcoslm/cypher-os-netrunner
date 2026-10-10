'use strict';
const { test, expect, makeImmersion, solveCodeCombat, downloadJSON } = require('./fixtures');
const nav = (page, view) => page.locator(`.navbtn[data-view="${view}"]`);
function job(type,n) {
  const field=type==='recoleta'?'gathered':'iceT2';
  return { id:type,title:type,desc:type,type,n,contact:'doctorSudario',reward:100,xp:10,
    risk:'med',done:false,failed:false,prog:{[field]:0} };
}
test('nivel 30: tres contratos aceptados generan oportunidades suficientes en una inmersión', async ({ page,game }) => {
  // Catálogo de fixture explícito: el caso de cuotas exige estos tres trabajos,
  // pero una renovación real ya no ofrece necesariamente todos los tipos.
  const fixtureOffers=[['recoleta',6,'mamaWire'],['rompehielas',4,'doctorSudario'],['daemon',3,'night0X']].map(([type,n,contact])=>({
    id:'nivel30-'+type,title:type,desc:'Objetivo de prueba: '+n,type,n,contact,risk:'med',reward:100,xp:10
  }));
  await game.setup({player:{level:30,rep:{night0X:2}},state:{offers:fixtureOffers}});
  await nav(page,'contactos').click();
  const offers=(await game.snapshot()).state.offers;
  const selected=[['mamaWire','recoleta'],['doctorSudario','rompehielas'],['night0X','daemon']].map(([contact,type])=>offers.find(o=>o.contact===contact&&o.type===type));
  for (const offer of selected) await page.locator(`[data-action="acceptJob"][data-id="${offer.id}"]`).click();
  await nav(page,'red').click();
  await page.locator('[data-action="dipGrid"]').click();
  const {immersion,state}=await game.snapshot();
  expect(state.jobs).toHaveLength(3);
  for (const item of state.jobs) {
    const available=immersion.grid.nodes.filter(n=>item.type==='recoleta'?n.type==='data':item.type==='rompehielas'?n.type==='ice'&&n.tier>=2:n.type==='daemon').length;
    expect(available).toBeGreaterThanOrEqual(item.n);
    expect(item.n).toBeLessThanOrEqual(item.type==='recoleta'?6:item.type==='daemon'?3:4);
  }
  await nav(page,'trabajos').click();
  await expect(page.locator('#panel-scroll')).toContainText('los daemons no cuentan');
});
test('vault F01: aceptar y generar conserva el nodo sorteado al guardar, exportar/importar y recargar', async ({page,game}) => {
  const offer={id:'vault-f01',title:'EL VAULT DE KURO GATECH',desc:'Recupera el proyecto KURO en la capa 4.',
    type:'vault',contact:'doctorSudario',risk:'high',reward:100,xp:10,n:1,project:'KURO',targetDepth:4};
  await game.setup({state:{offers:[offer]}});
  await nav(page,'contactos').click();
  await page.locator('[data-action="acceptJob"][data-id="vault-f01"]').click();
  await nav(page,'red').click();
  await page.locator('[data-action="dipGrid"]').click();
  const expected=await game.snapshot(), grid=expected.immersion.grid;
  const vaults=grid.nodes.filter(n=>n.type==='vault');
  expect(vaults).toHaveLength(1);
  expect(vaults[0]).toMatchObject({layer:4,proj:'KURO',tier:3,done:false,data:0,isEcho:false});
  expect(grid.byLayer[4].some(n=>n.id===vaults[0].id)).toBe(true);
  expect(grid.nodes.find(n=>n.id===grid.entry).type).toBe('puerto');
  const reachable=new Set([grid.entry]), queue=[grid.entry];
  for (const id of queue) for (const next of grid.adj[id]) {
    expect(grid.adj[next]).toContain(id);
    if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
  }
  expect(reachable.size).toBe(grid.nodes.length);
  expect(reachable.has(vaults[0].id)).toBe(true);
  await page.keyboard.press('Control+g');
  expect((await game.snapshot()).immersion).toEqual(expected.immersion);
  await page.locator('#btn-save').click();
  expect((await game.snapshot()).saved._inImmersion).toEqual(expected.immersion);
  const download=page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const exported=await downloadJSON(await download);
  expect(exported._inImmersion).toEqual(expected.immersion);
  await page.locator('#btn-reset').click();
  await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  expect((await game.snapshot()).immersion).toBeNull();
  await game.importFile(exported,'vault-f01.json');
  await game.expectMessage('de vuelta en el grid');
  for (const reload of [false,true]) {
    if (reload) await game.reload();
    const restored=await game.snapshot();
    expect(restored.immersion).toEqual(expected.immersion);
    expect(restored.saved._inImmersion).toEqual(expected.immersion);
    const expectedPlayer=JSON.parse(JSON.stringify(expected.state.player));
    // reload() reanuda el reloj durante BIOS; solo ese tiempo legítimo cambia.
    if (reload) {
      const elapsed=(restored.state.clock-expected.state.clock+1440)%1440;
      expectedPlayer.stats.totalPlayTime+=elapsed;
    } else expect(restored.state.clock).toBe(expected.state.clock);
    expect(restored.state.player).toEqual(expectedPlayer);
    expect(restored.state.jobs).toEqual(expected.state.jobs);
    await expect(page.locator('#gridcanvas')).toBeVisible();
  }
});
test('exportar/reset/importar cuatro veces conserva datos, ICE vencido, subestación y contador', async ({page,game}) => {
  const immersion=makeImmersion();
  Object.assign(immersion.grid.nodes[2],{type:'ice',tier:2,tierName:'T2',name:'ICE DE PRUEBA'});
  Object.assign(immersion.grid.nodes[3],{type:'substation',name:'SUBESTACIÓN'});
  Object.assign(immersion.grid.nodes[4],{type:'data',data:88,name:'NODO DE DATOS'});
  const alive={...immersion.grid.nodes[2],id:'3_1',layer:3,x:680,y:350};
  immersion.grid.nodes.push(alive); immersion.grid.byLayer[3].push(alive);
  immersion.grid.adj['3_0'].push(alive.id); immersion.grid.adj[alive.id]=['3_0'];
  await game.setup({player:{sigilo:5,_gridEventCooldown:10000},state:{jobs:[job('recoleta',2),job('rompehielas',2)]},immersion});
  async function move(id,consumed=false) {
    const state=await game.snapshot();
    const index=state.immersion.grid.adj[state.immersion.current].indexOf(id);
    expect(index).toBeGreaterThanOrEqual(0);
    await page.locator(`#adjlist .adj-node[data-idx="${index}"]`).click();
    if ((await game.snapshot()).combatActive) {
      if (consumed) expect(await page.locator('#combat').evaluate(()=>COM.node.scavenger)).toBe(true);
      await solveCodeCombat(page);
    }
  }
  await move('1_0'); await move('2_0'); await move('3_0');
  await nav(page,'trabajos').click();
  await expect(page.locator('.job').filter({hasText:'rompehielas'}).locator('.prog')).toContainText('1/2');
  await nav(page,'red').click();
  const expected=await game.snapshot();
  expect(expected.immersion.grid.nodes.find(n=>n.id==='1_0')).toMatchObject({done:true,_done:true});
  expect(expected.immersion.grid.nodes.find(n=>n.id==='2_0')).toMatchObject({done:true});
  expect(expected.immersion.grid.nodes.find(n=>n.id==='3_0')).toMatchObject({_used:true});
  expect(expected.immersion.grid.nodes.find(n=>n.id==='3_1')).toMatchObject({done:false});
  for (let cycle=0;cycle<4;cycle++) {
    const promise=page.waitForEvent('download');
    await page.locator('#btn-export').click();
    const exported=await downloadJSON(await promise);
    expect(exported._inImmersion).toEqual(expected.immersion);
    await page.locator('#btn-reset').click();
    await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
    expect((await game.snapshot()).immersion).toBeNull();
    await game.importFile(exported,'ciclo.json');
    await game.expectMessage('de vuelta en el grid');
    const restored=await game.snapshot();
    expect(restored.immersion).toEqual(expected.immersion);
    expect(restored.state.player).toEqual(expected.state.player);
    expect(restored.state.jobs).toEqual(expected.state.jobs);
  }
  await game.reload();
  expect((await game.snapshot()).immersion).toEqual(expected.immersion);
  const credits=(await game.snapshot()).state.player.credits;
  await move('2_0',true); await move('1_0',true); await move('2_0',true); await move('3_0',true);
  const after=await game.snapshot();
  expect(after.immersion.data).toEqual(expected.immersion.data);
  expect(after.immersion.dataUsed).toBe(1);
  expect(after.state.jobs.map(j=>j.prog)).toEqual(expected.state.jobs.map(j=>j.prog));
  expect(after.state.player.credits).toBe(credits);
  expect(after.immersion.grid.nodes.find(n=>n.id==='3_1').done).toBe(false);
  const bad=JSON.parse(JSON.stringify(after.saved));
  bad._inImmersion.grid.nodes[1].done='false';
  await game.importFile(bad,'flags-invalidos.json');
  await game.expectMessage('archivo inválido');
  expect((await game.snapshot()).raw).toBe(after.raw);
});
