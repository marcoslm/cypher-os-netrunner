'use strict';
const { test, expect, makeImmersion, solveCodeCombat, downloadJSON } = require('./fixtures');
const nav = (page, view) => page.locator(`.navbtn[data-view="${view}"]`);
function job(type,n) {
  const field=type==='recoleta'?'gathered':'iceT2';
  return { id:type,title:type,desc:type,type,n,contact:'doctorSudario',reward:100,xp:10,
    risk:'med',done:false,failed:false,prog:{[field]:0} };
}
test('nivel 30: tres contratos aceptados generan oportunidades suficientes en una inmersión', async ({ page,game }) => {
  await game.setup({player:{level:30,rep:{night0X:2}}});
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
    await expect(page.locator('#msg')).toContainText('de vuelta en el grid');
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
  await expect(page.locator('#msg')).toContainText('archivo inválido');
  expect((await game.snapshot()).raw).toBe(after.raw);
});
