'use strict';

const { test, expect, makeImmersion, solveCodeCombat, scannerState, solveScanner, openGridControls } = require('./fixtures');
const action = (page, name) => page.locator(`[data-action="${name}"]`);

function bossImmersion() {
  const inm = makeImmersion();
  const boss = { id: '5_0', layer: 5, x: 880, y: 270, type: 'nucleo', name: 'EL NÚCLEO',
    tier: 4, tierName: 'T4', boss: true, done: false, _done: false, _used: false, data: 0 };
  const previous = inm.grid.nodes.at(-1);
  Object.assign(previous, { type: 'data', data: 0, storyChapter: 'c08', storyDefense: boss.id });
  inm.grid.nodes.push(boss);
  inm.grid.byLayer.push([boss]);
  inm.grid.adj[previous.id].push(boss.id);
  inm.grid.adj[boss.id] = [previous.id];
  inm.grid.maxDepth = inm.depth = inm.maxDepthReached = 5;
  inm.current = boss.id;
  inm.moves = 5;
  return inm;
}

async function clickCurrentNode(page) {
  const point = await page.locator('#gridcanvas').evaluate(canvas => {
    const n = nodeById(inImmersion.current), rect = canvas.getBoundingClientRect();
    return { x: rect.left + n.x / 960 * rect.width, y: rect.top + n.y / 540 * rect.height };
  });
  await page.mouse.click(point.x, point.y);
}

test('scanner: completa las tres fases con línea real, sin daño ni recompensa duplicada', async ({ page, game }) => {
  test.setTimeout(60000);
  await game.setup({ immersion: makeImmersion() });
  await game.startCombat({ type: 'ice', tier: 3 });
  await expect(page.locator('#scanZone')).toBeVisible();
  const start = await scannerState(page);
  expect(start.phases).toBe(3);
  await solveScanner(page);
  await expect(page.locator('#combat')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  const won = await game.snapshot();
  expect(won.state.player.cpu).toBe(100);
  expect(won.state.player.stats).toMatchObject({ ice: 1, iceByTier: { 3: 1 }, totalDamageDealt: 108, totalDamageReceived: 0 });
  expect(won.state.player.xp).toBe(32);
  expect(won.immersion.enemiesDefeated).toBe(1);
  await page.clock.runFor(12000);
  const later = await game.snapshot();
  expect(later.state.player.stats.ice).toBe(1);
  expect(later.state.player.xp).toBe(32);
  expect(later.state.player.cpu).toBe(100);
});

test('scanner: clic no principal se ignora, fallo y timeout dañan una vez y Ctrl+S conserva estado', async ({ page, game }) => {
  test.setTimeout(60000);
  await game.setup({ immersion: makeImmersion() });
  await game.startCombat({ type: 'ice', tier: 3 });
  await page.locator('#scanZone').click({ button: 'right' });
  expect((await game.snapshot()).state.player.cpu).toBe(100);
  expect((await scannerState(page)).gaps.some(g => g.hit)).toBe(false);
  await page.locator('#scanZone').click(); // position 0, outside every legal gap
  await expect(page.locator('#combatLog')).toContainText('fallo');
  expect((await game.snapshot()).state.player.cpu).toBe(86);
  const first = await scannerState(page);
  await page.clock.runFor(Math.ceil(first.time / 100) * 100);
  const timed = await scannerState(page);
  expect(timed.phase).toBe(1);
  expect(timed.remaining).toBeGreaterThan(0);
  expect(timed.gaps).toEqual(first.gaps);
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 72, stats: { totalDamageReceived: 28 } });
  await page.clock.runFor(400);
  expect((await game.snapshot()).state.player.cpu).toBe(72);
  await page.keyboard.press('Control+s');
  expect((await game.snapshot()).saved.player.cpu).toBe(72);
  await game.reload();
  await expect(page.locator('#combat')).toBeHidden();
  const restored = await game.snapshot();
  expect(restored.state.player).toMatchObject({ cpu: 72, xp: 0, stats: { ice: 0 } });
  expect(restored.immersion.grid.nodes.find(n => n.id === restored.immersion.current)).toMatchObject({ type: 'ice', tier: 3, done: false });
});

test('consumibles: recargar conserva reservas antes de confirmar y gasto inmediato después', async ({ page, game }) => {
  await game.setup({ player: { decoys: 3, virus: 2 }, immersion: makeImmersion() });
  await game.startCombat({ tier: 3, encounter: true });
  await page.locator('#combat-decoy').check();await page.locator('#combat-virus').check();
  await game.reload();
  expect((await game.snapshot()).state.player).toMatchObject({ decoys: 3, virus: 2 });
  await expect(page.locator('#combat')).toBeHidden();
  await game.startCombat({ tier: 3, encounter: true });
  await expect(page.locator('#combat-decoy')).not.toBeChecked();
  await expect(page.locator('#combat-virus')).not.toBeChecked();
  await page.locator('#combat-decoy').check();await page.locator('#combat-virus').check();
  await page.locator('#combat-enter').click();
  expect((await game.snapshot()).saved.player).toMatchObject({ decoys: 2, virus: 1 });
  expect((await scannerState(page)).phases).toBe(2);
  await game.reload();
  await expect(page.locator('#combat')).toBeHidden();
  expect((await game.snapshot()).state.player).toMatchObject({ decoys: 2, virus: 1 });
  await game.startCombat({ tier: 3, encounter: true });
  await expect(page.locator('#combat-decoy')).not.toBeChecked();
  await expect(page.locator('#combat-virus')).not.toBeChecked();
  await page.locator('#combat-enter').click();
  expect((await scannerState(page)).phases).toBe(3);
  await page.locator('#scanZone').click();
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 86, decoys: 2, virus: 1 });
});

test('scanner HARDCORE: daño fatal limpia rAF/timer y sigue muerto tras tiempo y recarga', async ({ page, game }) => {
  test.setTimeout(60000);
  await game.setup({ state: { difficulty: 'hardcore' }, player: { cpu: 10 }, immersion: makeImmersion() });
  await game.startCombat({ type: 'ice', tier: 3 });
  await page.locator('#scanZone').click();
  await expect(page.locator('#flatline')).toBeVisible();
  await expect(page.locator('#combat')).toBeHidden();
  expect(await page.locator('body').evaluate(() => ({ battle: COM, scanner: _scannerRAF, timer: combatTimer }))).toEqual({ battle: null, scanner: null, timer: null });
  await page.clock.runFor(20000);
  expect((await game.snapshot()).saved.player).toMatchObject({ cpu: 0, stats: { ice: 0 } });
  await game.reload({ difficulty: 'normal' });
  await expect(page.locator('#flatline')).toContainText('MODO HARDCORE');
  await expect(page.locator('#flatline [data-action="reconnect"]')).toHaveCount(0);
  expect((await game.snapshot()).state.player.cpu).toBe(0);
});

test('Núcleo F1: cuatro claves consumen defensa sin pagar ni cerrar el caso', async ({ page, game }) => {
  await game.setup({
    player: { level: 5, rep: { night0X: 3 }, stats: { maxDepth: 5 } },
    state: { history: { finalUnlocked: true } }, immersion: bossImmersion()
  });
  await game.startCombat({ type: 'nucleo', tier: 4, boss: true });
  await page.keyboard.press('Escape');
  expect((await game.snapshot()).combat).toMatchObject({ phase: 1, alive: true });
  expect((await game.snapshot()).state.player.cpu).toBe(100);
  await page.locator('#escapeBtn').click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Control+s');
  const inBattle = await game.snapshot();
  expect(inBattle.saved.history.finalDone).toBe(false);
  expect(inBattle.saved._inImmersion.grid.nodes.find(n => n.boss).done).toBe(false);
  await solveCodeCombat(page);
  await expect(page.locator('#combat')).toBeHidden();
  await expect(page.locator('#overlay')).toBeHidden();
  const victory = await game.snapshot();
  expect(victory.saved.history.finalDone).toBe(false);
  expect(victory.saved.best.finalDone).not.toBe(true);
  expect(victory.saved.narrative.chapters.c08).toBe('accepted');
  expect(victory.saved.player).toMatchObject({ credits: 500, level: 5, xp: 0, skillPoints: 0,
    stats: { ice: 1, credits: 0, totalDamageDealt: 128 } });
  expect(victory.state.intel).not.toContain('tras_nucleo');
  expect(victory.state.achievements).not.toContain('nucleoDefeated');
  await clickCurrentNode(page); // the actual consumed node, not onNodeDefeated()
  await expect(page.locator('#combat')).toBeHidden();
  expect((await game.snapshot()).state.player.credits).toBe(500);
  await page.keyboard.press('Control+s');
  await game.reload();
  await expect(page.locator('#legendary-opt')).toBeHidden(); // intro is gone after boot
  expect((await game.snapshot()).immersion.grid.nodes.find(n => n.boss).done).toBe(true);
  await clickCurrentNode(page);
  await expect(page.locator('#combat')).toBeHidden();
  expect((await game.snapshot()).state.player.credits).toBe(500);
  await openGridControls(page);await action(page, 'doSuperficie').click();
  await action(page, 'closeResume').click();
  await expect(action(page, 'startEndless')).toHaveCount(0);
  expect((await game.snapshot()).state.history.finalDone).toBe(false);
});

test.describe('scanner táctil', () => {
  test.use({ hasTouch: true, viewport: { width: 720, height: 900 } });
  test('tap acierta cada hueco una sola vez y completa el combate', async ({ page, game }) => {
    test.setTimeout(60000);
    await game.setup({ immersion: makeImmersion() });
    await game.startCombat({ type: 'ice', tier: 3 });
    await solveScanner(page, { touch: true });
    await expect(page.locator('#combat')).toBeHidden();
    expect((await game.snapshot()).state.player).toMatchObject({ cpu: 100, xp: 32,
      stats: { ice: 1, totalDamageDealt: 108, totalDamageReceived: 0 } });
  });
});
