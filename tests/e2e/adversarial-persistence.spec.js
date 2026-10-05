'use strict';

const { test, expect, downloadJSON } = require('./fixtures');

function ambushImmersion() {
  const nodes = [
    { id: '0_0', layer: 0, x: 80, y: 270, type: 'puerto', name: 'PUERTO DE CALLE' },
    { id: '1_0', layer: 1, x: 280, y: 180, type: 'substation', name: 'SUBESTACIÓN', _used: true },
    { id: '1_1', layer: 1, x: 280, y: 330, type: 'ice', name: 'GRIFO', tier: 1, tierName: 'T1' },
    { id: '1_2', layer: 1, x: 280, y: 410, type: 'ice', name: 'ESPEJO', tier: 1, tierName: 'T1' },
    { id: '2_0', layer: 2, x: 580, y: 180, type: 'data', name: 'NODO DE DATOS', data: 77 },
    { id: '2_1', layer: 2, x: 580, y: 330, type: 'data', name: 'NODO DE DATOS', data: 88 }
  ].map(n => ({ tier: 0, tierName: '', data: 0, done: false, _done: false, _used: false, ...n }));
  return {
    grid: { nodes, byLayer: [[nodes[0]], nodes.slice(1, 4), nodes.slice(4)],
      adj: { '0_0': ['1_0', '1_1', '1_2'], '1_0': ['0_0', '2_0', '2_1'],
        '1_1': ['0_0'], '1_2': ['0_0'], '2_0': ['1_0'], '2_1': ['1_0'] }, entry: '0_0', maxDepth: 2 },
    depth: 2, current: '1_0', dataUsed: 0, data: [], maxDepthReached: 1,
    moves: 1, combatOccurred: false, enemiesDefeated: 0
  };
}

test('importación adversa: rechaza un contador numérico dañado sin reemplazar la partida', async ({ page, game }, testInfo) => {
  await game.setup({ player: { credits: 1234 } });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const bad = await downloadJSON(await downloadPromise);
  bad.player.stats.totalCreditsSpent = 'dañado';
  const before = await game.snapshot();
  await game.importFile(bad, 'contador-danado.json');
  const imported = await game.snapshot();
  const message = await page.locator('#msg').innerText();
  let afterPurchase = null;
  // Diagnostic only if a damaged file was wrongly accepted. The invariant below
  // remains a rejection assertion; this test must turn green once it is fixed.
  if (imported.state.player.stats.totalCreditsSpent === 'dañado') {
    await page.locator('.navbtn[data-view="tienda"]').click();
    await page.locator('[data-action="buyItem"][data-id="decoy"]').click();
    await page.locator('.navbtn[data-view="estado"]').click();
    afterPurchase = await game.snapshot();
  }
  await testInfo.attach('counter-corruption', {
    body: Buffer.from(JSON.stringify({ message, before: before.saved.player.stats,
      imported: imported.saved.player.stats, afterPurchase: afterPurchase?.saved.player.stats }, null, 2)),
    contentType: 'application/json'
  });
  expect(message, 'Un contador no numérico debe invalidar el archivo completo').toContain('archivo inválido');
  expect(imported.raw).toBe(before.raw);
  expect(imported.state.player.stats.totalCreditsSpent).toBe(0);
});

test('rastreador: huir refresca el nodo y los vecinos del HUD antes de otra elección', async ({ page, game }, testInfo) => {
  await game.setup({
    player: { level: 6, sigilo: 5, decoys: 5, _gridEventCooldown: 3 },
    state: { offers: [] }, immersion: ambushImmersion()
  });
  await expect(page.locator('#adjlist')).toContainText('SUBESTACIÓN');
  await expect(page.locator('#adjlist .adj-node[data-idx="1"]')).toContainText('DATOS');
  // Arrange a real in-progress ambush after a movement, preserving the preceding
  // HUD as moveToNode does before tryScavenger's early return. No RNG or handler is
  // replaced. Escape and the subsequent wrong-labelled choice use native input.
  await page.evaluate(() => {
    inImmersion.current = '0_0'; inImmersion.moves++;
    startCombat({ node: { type: 'ice', tier: 1, tierName: 'T1', name: 'RASTREADOR CORPORATIVO', scavenger: true } });
  });
  await expect(page.locator('#combat')).toBeVisible();
  for (let attempt = 0; attempt < 20; attempt++) {
    if (!(await game.snapshot()).combatActive) break;
    await page.keyboard.press('Escape');
  }
  await expect(page.locator('#combat')).toBeHidden();
  await page.clock.runFor(1000); // normal frames/clock must not leave a stale HUD
  const afterEscape = await game.snapshot();
  const header = await page.locator('#adjlist').innerText();
  const visible = await page.locator('#adjlist .adj-node').allTextContents();
  const current = afterEscape.immersion.grid.nodes.find(n => n.id === afterEscape.immersion.current);
  const neighbors = afterEscape.immersion.grid.adj[current.id].map(id => afterEscape.immersion.grid.nodes.find(n => n.id === id));
  let wrongChoice = null;
  if (visible[1]?.includes('DATOS') && neighbors[1]?.type === 'ice') {
    await page.locator('#adjlist .adj-node[data-idx="1"]').click();
    const after = await game.snapshot();
    wrongChoice = { current: after.immersion.current,
      type: after.immersion.grid.nodes.find(n => n.id === after.immersion.current).type,
      combat: after.combatActive };
  }
  await testInfo.attach('stale-grid-choice', {
    body: Buffer.from(JSON.stringify({ current: current.id, currentName: current.name, header, visible,
      neighbors: neighbors.map(n => ({ id: n.id, type: n.type, name: n.name })), wrongChoice }, null, 2)),
    contentType: 'application/json'
  });
  expect(header, 'El HUD debe describir el nodo donde quedaste al escapar').toContain(current.name);
  expect(visible[1], 'El vecino ICE no debe aparecer rotulado como DATOS').toContain('ICE');
});
