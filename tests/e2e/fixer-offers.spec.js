'use strict';
const {test,expect,makeImmersion,downloadJSON}=require('./fixtures');
const nav=(page,view)=>page.locator(`.navbtn[data-view="${view}"]`);
const contacts=['mamaWire','doctorSudario','night0X','kairos'];
const dossierIds=['exp_kuro','exp_somnio','exp_miraje','exp_eko9','exp_carmin','exp_lapida','exp_halcon','exp_vesper'];
async function expectOfferCounts(page,offers,exhausted=false) {
  for(const contact of contacts) {
    const own=offers.filter(o=>o.contact===contact),max=exhausted||contact==='mamaWire'?2:3;
    expect(own.length).toBeGreaterThanOrEqual(1);expect(own.length).toBeLessThanOrEqual(max);
    expect(own.some(o=>o.type!=='vault')).toBe(true);
    await expect(page.locator(`#offers-${contact} .offer`)).toHaveCount(own.length);
  }
  const vaults=offers.filter(o=>o.type==='vault');
  expect(new Set(vaults.map(o=>o.project)).size).toBe(vaults.length);
}

test('fixers F03: ofertas estables entre vistas, exportar/importar y recarga; renovar solo al pulsar',async({page,game})=>{
  await game.setup({player:{level:4,rep:{night0X:2}}});
  await nav(page,'contactos').click();
  const expected=(await game.snapshot()).state.offers;
  await expectOfferCounts(page,expected);
  for(const view of ['trabajos','inicio','contactos']) await nav(page,view).click();
  expect((await game.snapshot()).state.offers).toEqual(expected);
  await game.openSaveTools();
  await page.locator('#btn-save').click();
  const download=page.waitForEvent('download');await page.locator('#btn-export').click();
  const exported=await downloadJSON(await download);expect(exported.offers).toEqual(expected);
  await game.importFile(exported,'ofertas-f03.json');await game.expectMessage('de vuelta en la calle');
  expect((await game.snapshot()).state.offers).toEqual(expected);
  await game.reload();expect((await game.snapshot()).state.offers).toEqual(expected);
  await nav(page,'contactos').click();await expectOfferCounts(page,expected);
  await page.locator('[data-action="refreshOffers"]').click();
  const renewed=(await game.snapshot()).state.offers;
  expect(renewed).not.toEqual(expected);await expectOfferCounts(page,renewed);
  expect((await game.snapshot()).saved.offers).toEqual(renewed);
});

test('fixers F03: renovar tras agotar vaults no altera el contrato activo, la red ni la economía',async({page,game})=>{
  const active={id:'recoleta-activa',title:'RECOLECTA',desc:'Recoge un dato.',type:'recoleta',n:1,
    contact:'mamaWire',risk:'low',reward:100,xp:10,done:false,failed:false,prog:{gathered:1}};
  await game.setup({player:{level:4,rep:{night0X:2}},immersion:makeImmersion({loaded:true}),
    state:{intel:dossierIds,jobs:[active]}});
  const before=await game.snapshot();
  await nav(page,'contactos').click();
  for(let refresh=0;refresh<3;refresh++) {
    await page.locator('[data-action="refreshOffers"]').click();
    const current=await game.snapshot();
    await expectOfferCounts(page,current.state.offers,true);
    expect(current.state.offers.every(o=>o.type!=='vault')).toBe(true);
    expect(current.state.jobs).toEqual(before.state.jobs);
    expect(current.state.player).toEqual(before.state.player);
    expect(current.immersion).toEqual(before.immersion);
  }
  await nav(page,'red').click();await expect(page.locator('#gridcanvas')).toBeVisible();
  expect((await game.snapshot()).immersion).toEqual(before.immersion);
});

test('fixers F03: Mama Wire conserva un contrato de aprendizaje viable en una partida nueva',async({page,game})=>{
  await game.setup();await nav(page,'contactos').click();
  const offers=(await game.snapshot()).state.offers;
  const starter=offers.find(o=>o.contact==='mamaWire'&&o.type==='recoleta');
  expect(starter).toBeDefined();expect(starter.n).toBeLessThanOrEqual(6);
  expect(offers.filter(o=>o.contact==='kairos')).toHaveLength(0);
  await page.locator(`[data-action="acceptJob"][data-id="${starter.id}"]`).click();
  await nav(page,'red').click();await page.locator('[data-action="dipGrid"]').click();
  const generated=await game.snapshot();
  expect(generated.state.jobs).toHaveLength(1);
  expect(generated.state.jobs[0]).toMatchObject({id:starter.id,type:'recoleta',n:starter.n,done:false});
  expect(generated.immersion.grid.nodes.filter(n=>n.type==='data').length).toBeGreaterThanOrEqual(starter.n);
});
