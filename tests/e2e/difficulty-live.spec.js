'use strict';
const {test,expect,makeImmersion}=require('./fixtures');
const nav=(page,view)=>page.locator(`.navbtn[data-view="${view}"]`);
const confirm=page=>page.locator('#confirm-overlay');
const current=page=>page.locator('.deck-columns-state > .deck-panel').first().locator('.row').filter({hasText:'DIFICULTAD'}).locator('.val');
async function openDifficultyMenu(page,game){
  await game.openSaveTools();await page.locator('#btn-intro').click();
  await expect(confirm(page)).toBeVisible();
  await confirm(page).locator('[data-action="confirmYes"]').click();
  await expect(page.locator('#intro')).toBeVisible();
}

test('dificultad: ESTADO informa y el cambio desde intro conserva progreso y persistencia',async({page,game})=>{
  await game.setup({state:{offers:[]},player:{credits:4321}});
  const before=await game.snapshot();
  await nav(page,'estado').click();
  await expect(current(page)).toHaveText('NORMAL');
  await expect(page.locator('[data-action="setDifficulty"]')).toHaveCount(0);
  await expect(page.locator('.panel-h').filter({hasText:/^DIFICULTAD$/})).toHaveCount(0);
  await game.openSaveTools();await page.locator('#btn-intro').click();
  await expect(confirm(page)).toBeVisible();
  await confirm(page).locator('[data-action="confirmNo"]').click();
  await expect(page.locator('#intro')).toBeHidden();
  expect((await game.snapshot()).state.difficulty).toBe('normal');
  await openDifficultyMenu(page,game);
  await expect(page.locator('input[name="diff"][value="normal"]')).toBeChecked();
  await expect(page.locator('#legendary-opt')).toBeHidden();
  await page.locator('input[name="diff"][value="hardcore"]').check();
  await game.resume();await page.locator('#intro-start').click();await game.skipBoot();
  const after=await game.snapshot();
  expect(after.state.difficulty).toBe('hardcore');expect(after.saved.difficulty).toBe('hardcore');
  expect(after.state.player.credits).toBe(before.state.player.credits);
  expect(after.state.player.xp).toBe(before.state.player.xp);
  expect(after.state.jobs).toEqual(before.state.jobs);expect(after.state.narrative).toEqual(before.state.narrative);
  await nav(page,'estado').click();await expect(current(page)).toHaveText('HARDCORE');
  await game.reload();await nav(page,'estado').click();
  await expect(current(page)).toHaveText('HARDCORE');
  await expect(page.locator('[data-action="setDifficulty"]')).toHaveCount(0);
});

test('dificultad F-04: una red restaurada conserva sus reglas aunque la intro elija otro modo',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  const before=await game.snapshot();
  expect(before.state.difficulty).toBe('normal');
  await game.reload({difficulty:'hardcore'});
  const after=await game.snapshot();
  expect(after.state.difficulty).toBe('normal');
  expect(after.immersion).not.toBeNull();
  expect(after.immersion.grid).toEqual(before.immersion.grid);
  await game.expectMessage('conserva su dificultad');
  await game.expectMessage('intro desde PARTIDA');
  await page.locator('.navbtn[data-view="estado"]').click();
  await expect(current(page)).toHaveText('NORMAL');
  await expect(page.locator('[data-action="setDifficulty"]')).toHaveCount(0);
});
test('dificultad: intro bloqueada en inmersión y LEGENDARIO requiere al Núcleo',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  await nav(page,'estado').click();
  await expect(page.locator('[data-action="setDifficulty"]')).toHaveCount(0);
  await expect(current(page)).toHaveText('NORMAL');
  const before=await game.snapshot();
  await game.openSaveTools();await page.locator('#btn-intro').click();
  await expect(confirm(page)).toBeHidden();await expect(page.locator('#intro')).toBeHidden();
  await game.expectMessage('superficializa antes de volver a la intro');
  expect((await game.snapshot()).state.difficulty).toBe('normal');
  expect((await game.snapshot()).immersion).toEqual(before.immersion);
  await game.setup({state:{offers:[]}});await openDifficultyMenu(page,game);
  await expect(page.locator('#legendary-opt')).toBeHidden();
  await game.setup({state:{offers:[],history:{finalDone:true}}});
  await openDifficultyMenu(page,game);await expect(page.locator('#legendary-opt')).toBeVisible();
  await page.locator('input[name="diff"][value="legendario"]').check();
  await game.resume();await page.locator('#intro-start').click();await game.skipBoot();
  expect((await game.snapshot()).state.difficulty).toBe('legendario');
  expect((await game.snapshot()).saved.difficulty).toBe('legendario');
  await nav(page,'estado').click();await expect(current(page)).toHaveText('LEGENDARIO');
});
