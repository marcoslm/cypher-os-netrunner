'use strict';
const {test,expect,makeImmersion}=require('./fixtures');
const confirm=page=>page.locator('#confirm-overlay');

test('intro F07B: VOLVER A INTRO guarda y continúa la partida con dificultad elegida',async({page,game})=>{
  await game.setup({state:{offers:[],jobs:[{id:'j',title:'T',desc:'T',type:'recoleta',n:1,contact:'mamaWire',reward:10,xp:1,done:false,failed:false,prog:{gathered:1}}]},player:{credits:4321}});
  await game.openSaveTools();
  await page.locator('#btn-intro').click();
  await expect(confirm(page)).toBeVisible();await expect(confirm(page)).toContainText('volver a la intro');
  await confirm(page).locator('[data-action="confirmYes"]').click();
  await expect(page.locator('#intro')).toBeVisible();await expect(page.locator('#intro-start')).toBeVisible();
  await page.locator('input[name="diff"][value="hardcore"]').check();
  // El fade de intro usa un timer real: reanudar el reloj durante la transición.
  await game.resume();
  await page.locator('#intro-start').click();
  await game.skipBoot();
  const state=await game.snapshot();
  expect(state.state.player.credits).toBe(4321);
  expect(state.state.jobs[0].prog.gathered).toBe(1);
  expect(state.state.difficulty).toBe('hardcore');
  await game.reload();await expect(page.locator('#boot')).toBeHidden();
  expect((await game.snapshot()).state.difficulty).toBe('hardcore');
  expect((await game.snapshot()).state.player.credits).toBe(4321);
});

test('intro F07B: bloqueado durante inmersión sin tocar progreso',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  const before=await game.snapshot();
  await game.openSaveTools();await page.locator('#btn-intro').click();
  await expect(confirm(page)).toBeHidden();await expect(page.locator('#intro')).toBeHidden();
  const after=await game.snapshot();
  expect(after.state.difficulty).toBe(before.state.difficulty);
  expect(after.immersion).toEqual(before.immersion);
});
