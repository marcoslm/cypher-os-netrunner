'use strict';
const {test,expect,makeImmersion}=require('./fixtures');
const nav=(page,view)=>page.locator(`.navbtn[data-view="${view}"]`);
const btn=(page,diff)=>page.locator(`#panel-scroll [data-action="setDifficulty"][data-diff="${diff}"]`);
const confirm=page=>page.locator('#confirm-overlay');

test('dificultad F07A: cambio en calle con confirmación real y persistencia',async({page,game})=>{
  await game.setup({state:{offers:[]}});
  await nav(page,'estado').click();
  await expect(btn(page,'normal')).toHaveAttribute('aria-pressed','true');
  await expect(btn(page,'legendario')).toBeDisabled();
  await btn(page,'hardcore').click();
  await expect(confirm(page)).toBeVisible();await expect(confirm(page)).toContainText('HARDCORE');
  await confirm(page).locator('[data-action="confirmNo"]').click();
  expect((await game.snapshot()).state.difficulty).toBe('normal');
  await btn(page,'hardcore').click();
  await confirm(page).locator('[data-action="confirmYes"]').click();
  expect((await game.snapshot()).state.difficulty).toBe('hardcore');
  expect((await game.snapshot()).saved.difficulty).toBe('hardcore');
  await expect(btn(page,'hardcore')).toHaveAttribute('aria-pressed','true');
  await game.reload();await nav(page,'estado').click();
  await expect(btn(page,'hardcore')).toHaveAttribute('aria-pressed','true');
});

test('dificultad F07A: bloqueada en inmersión y LEGENDARIO requiere al Núcleo',async({page,game})=>{
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  await nav(page,'estado').click();
  for(const diff of ['normal','hardcore','legendario']) await expect(btn(page,diff)).toBeDisabled();
  await expect(page.locator('#panel-scroll')).toContainText('bloqueado durante inmersión');
  expect((await game.snapshot()).state.difficulty).toBe('normal');
  await game.setup({state:{offers:[],history:{finalDone:true}}});
  await nav(page,'estado').click();
  await expect(btn(page,'legendario')).toBeEnabled();
  await btn(page,'legendario').click();
  await confirm(page).locator('[data-action="confirmYes"]').click();
  expect((await game.snapshot()).state.difficulty).toBe('legendario');
  expect((await game.snapshot()).saved.difficulty).toBe('legendario');
});
