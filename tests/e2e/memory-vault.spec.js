'use strict';

const { test, expect, makeImmersion } = require('./fixtures');

// These cases advance up to 75s of real game callbacks with rendering enabled.
// A slower test machine must not confuse that workload with an action timeout.
test.describe.configure({ timeout: 60000 });

const action = (page, name) => page.locator(`[data-action="${name}"]`);

function challengeImmersion(type) {
  const immersion = makeImmersion();
  const node = immersion.grid.nodes.find(node => node.id === '2_0');
  Object.assign(node, {
    type, tier: 3, tierName: 'T3', data: 0,
    name: type === 'daemon' ? 'DAEMON DE MEMORIA' : 'VAULT KURO',
    ...(type === 'vault' ? { proj: 'KURO' } : {})
  });
  immersion.current = node.id;
  immersion.moves = 2;
  immersion.maxDepthReached = 2;
  return immersion;
}

async function setupChallenge(game, type, { player = {}, state = {} } = {}) {
  await game.setup({
    player: { _gridEventCooldown: 3, ...player, stats: { maxDepth: 2, ...player.stats } },
    state: { offers: [], ...state },
    immersion: challengeImmersion(type)
  });
}

async function minigames(page) {
  // The shared snapshot exposes COM, but not its timers/phases or VAULT_PUZZLE.
  // Read-only observations: no handlers, focus changes or timer replacements.
  return page.locator('body').evaluate(() => ({
    combatActive,
    timerHandle: combatTimer !== null,
    cancelRegistered: typeof ACTIONS.vaultCancel === 'function',
    combat: COM ? {
      mode: COM.mode, tier: COM.tier, phase: COM.phase, phases: COM.phases,
      configuredPhases: COMBAT_TYPES[COM.tier].phases,
      time: COM.time, remaining: COM.remaining,
      memPhase: COM.memPhase, serial: COM.memPhaseSerial,
      scavenger: COM.node.scavenger === true
    } : null,
    vault: VAULT_PUZZLE ? {
      nodeId: VAULT_PUZZLE.node.id,
      sameNode: !!inImmersion && inImmersion.grid.nodes.some(node => node === VAULT_PUZZLE.node),
      phase: VAULT_PUZZLE.phase, locked: VAULT_PUZZLE.locked,
      picks: VAULT_PUZZLE.picks.slice(),
      revealPending: VAULT_PUZZLE.revealTimer != null,
      cooldownPending: VAULT_PUZZLE.cooldownTimer != null
    } : null
  }));
}

async function startVaultFixture(page) {
  // Only arrange the appropriate minigame at the saved target: no random route,
  // direct win/fail calls, patched functions, random seed or DOM-style changes.
  await page.evaluate(() => startVaultPuzzle(nodeById(inImmersion.current)));
  await expect(page.locator('#combat')).toBeVisible();
  expect((await minigames(page)).vault).toMatchObject({ nodeId: '2_0', sameNode: true, phase: 'show' });
}

async function memoryInput(page) {
  await expect(page.locator('#memPhase')).toHaveText('MEMORIZA LA SECUENCIA');
  await expect(page.locator('#memInput')).toBeHidden();
  const sequence = (await page.locator('#memSeq').innerText()).replace(/\s/g, '');
  const battle = (await minigames(page)).combat;
  expect(battle).toMatchObject({ mode: 'memoria', tier: 3, memPhase: 'reveal' });
  expect(sequence).toMatch(/^[0-9A-F]+$/);
  expect(sequence).toHaveLength(3 + battle.phase + Math.min(battle.tier - 1, 1));
  // T3 reveal is 3500 ms plus the actual 600 ms fade callback.
  await page.clock.runFor(4100);
  await expect(page.locator('#memZone')).toBeHidden();
  await expect(page.locator('#memSeq')).toBeEmpty();
  await expect(page.locator('#memInputHint')).toHaveText(`Secuencia de ${sequence.length} caracteres`);
  await expect(page.locator('#memInput')).toBeFocused();
  return sequence;
}

async function solveMemory(page) {
  const battle = (await minigames(page)).combat;
  const phases = battle.phases;
  // Count actual COM.phases, including a phase removed by VIRUS.
  for (let phase = battle.phase; phase <= phases; phase++) {
    await expect(page.locator('#ct-sub')).toHaveText(`MEMORIA HEX · FASE ${phase}/${phases}`);
    const sequence = await memoryInput(page);
    if (phase % 2) {
      await page.keyboard.type(sequence.toLowerCase());
    } else {
      for (const symbol of sequence) {
        await page.locator(`#combat .hex-key[data-hex="${symbol}"]`).click();
      }
    }
    if (phase < phases) {
      expect((await minigames(page)).combat).toMatchObject({ phase: phase + 1, memPhase: 'reveal' });
    }
  }
  await expect(page.locator('#combat')).toBeHidden();
  return phases;
}

async function vaultInput(page) {
  const sequence = (await page.locator('#combat .vp-sequence').innerText()).trim().split(/\s+/);
  expect(sequence.length).toBeGreaterThanOrEqual(4);
  expect(sequence.length).toBeLessThanOrEqual(6);
  expect(sequence.every(symbol => /^[0-9A-F]$/.test(symbol))).toBe(true);
  await page.clock.runFor(3000);
  await expect(page.locator('#vpOrder .vault-symbol')).toHaveCount(sequence.length);
  expect((await minigames(page)).vault).toMatchObject({ phase: 'input', locked: false, picks: [] });
  return sequence;
}

async function pickVaultSymbol(page, symbol) {
  const candidates = await page.locator('#vpOrder .vault-symbol:not(.picked)').evaluateAll(elements =>
    elements.map(element => ({ index: element.getAttribute('data-idx'), symbol: element.textContent.trim() }))
  );
  // Repeated symbols are legal: choose a distinct unpicked DOM index each time.
  const candidate = candidates.find(candidate => candidate.symbol === symbol);
  expect(candidate, `An unpicked symbol ${symbol} remains in the shuffled order`).toBeDefined();
  await page.locator(`#vpOrder .vault-symbol[data-idx="${candidate.index}"]`).click();
}

async function solveVault(page, sequence) {
  for (const symbol of sequence) await pickVaultSymbol(page, symbol);
  await expect(page.locator('#combat')).toBeHidden();
}

async function reenterChallenge(page, game) {
  let ambushXp = 0;
  let ambushDamageDealt = 0;
  let ambushes = 0;
  // Re-enter through the real HUD, rather than calling enterNode/onClick.
  // A valid saved cooldown prevents unrelated events for these two movements;
  // the game's minimum random scavenger chance remains intact.
  for (const target of ['3_0', '2_0']) {
    const before = await game.snapshot();
    const index = before.immersion.grid.adj[before.immersion.current].indexOf(target);
    expect(index).toBeGreaterThanOrEqual(0);
    await page.locator(`#adjlist .adj-node[data-idx="${index}"]`).click();
    const battle = (await minigames(page)).combat;
    if (battle?.scavenger) {
      expect(battle.mode).toBe('claves');
      // Winning a scavenger can immediately open the target minigame, so stop
      // after its actual phases, not when the shared combat overlay disappears.
      for (let phase = 0; phase < battle.phases; phase++) {
        await expect(page.locator('#codeInput')).toBeFocused();
        const code = (await page.locator('#codeTarget').innerText()).replace(/\s/g, '').toLowerCase();
        expect(code).toMatch(/^[0-9a-f]{3,}$/);
        await page.keyboard.type(code);
      }
      expect((await minigames(page)).combat?.scavenger === true).toBe(false);
      ambushes++;
      ambushXp += battle.tier * 10 + 8;
      ambushDamageDealt += battle.tier * 8 * battle.phases;
    }
    expect((await game.snapshot()).immersion.current).toBe(target);
  }
  return { ambushes, ambushXp, ambushDamageDealt };
}

function vaultJob() {
  return {
    id: 'memory-vault-kuro', contact: 'doctorSudario', title: 'EL VAULT DE KURO GATECH',
    desc: 'Llega a la capa 2 y recupera el proyecto KURO.', type: 'vault', n: 1,
    project: 'KURO', targetDepth: 2, risk: 'high', reward: 500, xp: 30, why: '',
    ts: Date.parse('2030-01-01T00:00:00Z'), prog: { vaulted: false }, done: false, failed: false
  };
}

function targetNode(immersion) {
  return immersion.grid.nodes.find(node => node.id === '2_0');
}

test('memoria T3: teclado y hex virtual resuelven todas las fases y recompensan un daemon una vez', async ({ page, game }) => {
  await setupChallenge(game, 'daemon');
  await game.startCombat({ type: 'daemon', tier: 3 });
  const battle = (await minigames(page)).combat;
  expect(battle.phases).toBe(battle.configuredPhases);
  expect(battle.phases).toBe(3);
  const phases = await solveMemory(page);
  const won = await game.snapshot();
  expect(won.state.player).toMatchObject({ cpu: 100, credits: 500, level: 1, xp: 62,
    stats: { daemons: 1, totalDamageDealt: phases * 30, totalDamageReceived: 0 } });
  expect(won.immersion.enemiesDefeated).toBe(1);
  expect(targetNode(won.saved._inImmersion)).toMatchObject({ type: 'daemon', tier: 3, done: true });
  expect(won.saved.player.stats.daemons).toBe(1);
  expect(await minigames(page)).toMatchObject({ combatActive: false, combat: null, timerHandle: false });
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);

  await page.clock.runFor(20_000);
  expect((await game.snapshot()).state.player).toMatchObject({ xp: 62, stats: { daemons: 1, totalDamageDealt: phases * 30 } });
  const ambush = await reenterChallenge(page, game);
  const revisited = await game.snapshot();
  await expect(page.locator('#combat')).toBeHidden();
  expect(revisited.state.player).toMatchObject({ cpu: 100, credits: 500, xp: 62 + ambush.ambushXp,
    stats: { daemons: 1, ice: ambush.ambushes, totalDamageDealt: phases * 30 + ambush.ambushDamageDealt } });
  expect(revisited.immersion.enemiesDefeated).toBe(1 + ambush.ambushes);
  expect(targetNode(revisited.immersion).done).toBe(true);
});

test('memoria: Enter vacío y timeout dañan lo mismo y revelan una nueva secuencia en la misma fase', async ({ page, game }) => {
  await setupChallenge(game, 'daemon');
  await game.startCombat({ type: 'daemon', tier: 3 });
  for (const [index, failure] of ['Enter', 'timeout'].entries()) {
    const before = (await minigames(page)).combat;
    await memoryInput(page);
    const input = (await minigames(page)).combat;
    expect(input.time).toBe(6700);
    if (failure === 'Enter') await page.keyboard.press('Enter');
    else await page.clock.runFor(input.remaining);
    await expect(page.locator('#combatLog')).toContainText('fallo');
    await expect(page.locator('#memPhase')).toHaveText('MEMORIZA LA SECUENCIA');
    await expect(page.locator('#memInput')).toBeHidden();
    const after = (await minigames(page)).combat;
    expect(after).toMatchObject({ phase: before.phase, phases: before.phases, memPhase: 'reveal', serial: before.serial + 1 });
    // Random sequences may legally coincide; serial proves a new phase attempt.
    expect((await page.locator('#memSeq').innerText()).replace(/\s/g, '')).toMatch(/^[0-9A-F]{5}$/);
    expect((await game.snapshot()).state.player).toMatchObject({ cpu: 100 - (index + 1) * 14,
      stats: { totalDamageReceived: (index + 1) * 14, daemons: 0 } });
  }
  await solveMemory(page);
  expect((await game.snapshot()).saved.player).toMatchObject({ cpu: 72, xp: 62,
    stats: { totalDamageReceived: 28, daemons: 1 } });
});

test('memoria: VIRUS consume una fase y DECOY absorbe solo el primer fallo antes del daño real', async ({ page, game }) => {
  await setupChallenge(game, 'daemon', { player: { virus: 1, decoys: 1 } });
  await game.startCombat({ type: 'daemon', tier: 3 });
  const battle = (await minigames(page)).combat;
  expect(battle.phases).toBe(battle.configuredPhases - 1);
  expect((await game.snapshot()).state.player).toMatchObject({ virus: 0, decoys: 1 });
  await memoryInput(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('#combatLog')).toContainText('DISCO DECOY');
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 100, virus: 0, decoys: 0,
    stats: { totalDamageReceived: 0 } });
  expect((await minigames(page)).combat).toMatchObject({ phase: 1, memPhase: 'reveal' });
  await memoryInput(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('#combatLog')).toContainText('14 de daño');
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 86, decoys: 0,
    stats: { totalDamageReceived: 14 } });
  const phases = await solveMemory(page);
  expect((await game.snapshot()).saved.player).toMatchObject({ cpu: 86, virus: 0, decoys: 0, xp: 62,
    stats: { daemons: 1, totalDamageReceived: 14, totalDamageDealt: phases * 30 } });
});

test('vault: memorizar y ordenar recupera KURO; el contrato se paga una sola vez al superficializar', async ({ page, game }) => {
  await setupChallenge(game, 'vault', { state: { jobs: [vaultJob()] } });
  await startVaultFixture(page);
  const sequence = await vaultInput(page);
  await solveVault(page, sequence);
  const recovered = await game.snapshot();
  expect(recovered.state.player).toMatchObject({ credits: 500, xp: 90, stats: { jobsCompleted: 0, credits: 0 } });
  expect(recovered.state.jobs[0]).toMatchObject({ done: false, failed: false, prog: { vaulted: true } });
  expect(targetNode(recovered.saved._inImmersion).done).toBe(true);
  expect(await minigames(page)).toMatchObject({ combatActive: false, combat: null, vault: null, timerHandle: false, cancelRegistered: false });

  await action(page, 'doSuperficie').click();
  await expect(page.locator('#overlay')).toContainText('RESUMEN DE LA INMERSIÓN');
  await expect(page.locator('.resume-row').filter({ hasText: 'Trabajos completados' }).locator('.rv')).toHaveText('1');
  const paid = (await game.snapshot()).saved;
  expect(paid.player).toMatchObject({ credits: 1000, level: 2, xp: 0, rep: { doctorSudario: 1 },
    stats: { credits: 500, jobsCompleted: 1, jobsFailed: 0, immerse: 1 } });
  expect(paid.jobs[0]).toMatchObject({ done: true, failed: false, prog: { vaulted: true } });
  expect(paid._inImmersion).toBeNull();
  await action(page, 'closeResume').click();
  await action(page, 'dipGrid').click();
  expect((await game.snapshot()).immersion.grid.nodes.filter(node => node.type === 'vault')).toEqual([]);
  await action(page, 'doSuperficie').click();
  await expect(page.locator('.resume-row').filter({ hasText: 'Trabajos completados' }).locator('.rv')).toHaveText('0');
  await action(page, 'closeResume').click();
  await page.keyboard.press('Control+s');
  expect((await game.snapshot()).saved.player).toMatchObject({ credits: 1000, level: 2, xp: 0,
    rep: { doctorSudario: 1 }, stats: { credits: 500, jobsCompleted: 1, immerse: 2 } });
});

test('vault: timeout de 15s resta 10 CPU, bloquea 10s y cancelar/reintentar no deja un cooldown viejo', async ({ page, game }) => {
  await setupChallenge(game, 'vault');
  await startVaultFixture(page);
  await vaultInput(page);
  await page.clock.runFor(14_900);
  expect((await game.snapshot()).state.player.cpu).toBe(100);
  expect((await minigames(page)).vault.locked).toBe(false);
  await page.clock.runFor(100);
  await expect(page.locator('#combatLog')).toContainText('-10 CPU');
  await expect(page.locator('#vpOrder')).toHaveClass(/vault-locked/);
  expect((await game.snapshot()).state.player.cpu).toBe(90);
  expect((await minigames(page)).vault).toMatchObject({ locked: true, picks: [], cooldownPending: true });
  const box = await page.locator('#vpOrder').boundingBox();
  expect(box).not.toBeNull();
  // Locked symbols intentionally reject a real pointer; no force-click timeout.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.clock.runFor(9900);
  expect((await game.snapshot()).state.player.cpu).toBe(90);
  expect((await minigames(page)).vault).toMatchObject({ locked: true, picks: [] });
  await page.clock.runFor(100);
  await expect(page.locator('#vpOrder')).not.toHaveClass(/vault-locked/);
  await expect(page.locator('#vpOrder .picked')).toHaveCount(0);
  expect((await minigames(page)).vault).toMatchObject({ phase: 'input', locked: false, picks: [], cooldownPending: false });
  expect((await game.snapshot()).state.player.cpu).toBe(90);

  await page.clock.runFor(15_000);
  expect((await game.snapshot()).state.player.cpu).toBe(80);
  expect((await minigames(page)).vault.locked).toBe(true);
  await page.clock.runFor(1000);
  await action(page, 'vaultCancel').click();
  await expect(page.locator('#combat')).toBeHidden();
  expect(await minigames(page)).toMatchObject({ combatActive: false, vault: null, timerHandle: false, cancelRegistered: false });
  await reenterChallenge(page, game);
  const sequence = await vaultInput(page);
  const retryCpu = (await game.snapshot()).state.player.cpu;
  await pickVaultSymbol(page, sequence[0]);
  // 3000ms reveal + 6000ms input reaches the cancelled attempt's old 10s
  // cooldown deadline. Its callback must not erase this new pick or rerender.
  await page.clock.runFor(6000);
  expect((await minigames(page)).vault).toMatchObject({ sameNode: true, phase: 'input', locked: false, picks: [sequence[0]] });
  await expect(page.locator('#vpOrder .picked')).toHaveCount(1);
  expect((await game.snapshot()).state.player.cpu).toBe(retryCpu);
  await action(page, 'vaultCancel').click();
  await page.clock.runFor(20_000);
  await expect(page.locator('#combat')).toBeHidden();
  expect((await game.snapshot()).state.player.cpu).toBe(retryCpu);
  expect(targetNode((await game.snapshot()).immersion).done).toBe(false);
  expect(await minigames(page)).toMatchObject({ combatActive: false, vault: null, timerHandle: false, cancelRegistered: false });
});

test('vault: CPU 10 muere por timeout y limpia puzzle, nodo, callbacks y guardado tras reconexión', async ({ page, game }) => {
  await setupChallenge(game, 'vault', { player: { cpu: 10 } });
  await startVaultFixture(page);
  await vaultInput(page);
  await page.clock.runFor(15_000);
  await expect(page.locator('#flatline')).toBeVisible();
  await expect(page.locator('#combat')).toBeHidden();
  const dead = await game.snapshot();
  expect(dead.state.player).toMatchObject({ cpu: 0, xp: 0, credits: 500 });
  expect(dead.saved.player.cpu).toBe(0);
  expect(dead.immersion).toBeNull();
  expect(dead.saved._inImmersion).toBeNull();
  expect(await minigames(page)).toEqual({ combatActive: false, timerHandle: false, cancelRegistered: false, combat: null, vault: null });
  await page.clock.runFor(20_000);
  await expect(page.locator('#flatline')).toBeVisible();
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 0, xp: 0, credits: 500 });
  await page.keyboard.press('Control+s');
  await game.reload();
  await expect(page.locator('#flatline')).toBeVisible();
  expect((await game.snapshot()).immersion).toBeNull();
  await page.locator('#flatline [data-action="reconnect"]').click();
  await expect(page.locator('#flatline')).toBeHidden();
  await page.clock.runFor(20_000);
  await expect(page.locator('#combat')).toBeHidden();
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 50, xp: 0, credits: 500 });
  expect((await game.snapshot()).saved._inImmersion).toBeNull();
  expect(await minigames(page)).toEqual({ combatActive: false, timerHandle: false, cancelRegistered: false, combat: null, vault: null });
});

test('vault: reveal dura 3s sin picks y cancelar en input permite reabrir el mismo nodo sin timeout anterior', async ({ page, game }) => {
  await setupChallenge(game, 'vault');
  await startVaultFixture(page);
  const sequence = (await page.locator('#combat .vp-sequence').innerText()).trim().split(/\s+/);
  await expect(page.locator('#vpOrder .vault-symbol')).toHaveCount(0);
  await expect(action(page, 'vaultCancel')).toHaveCount(0);
  await page.locator('#combat .vp-sequence').click();
  await page.keyboard.type('0');
  await page.keyboard.press('Enter');
  expect((await minigames(page)).vault).toMatchObject({ phase: 'show', picks: [], locked: false, revealPending: true });
  await page.clock.runFor(2999);
  await expect(page.locator('#combat .vp-sequence')).toBeVisible();
  await expect(page.locator('#vpOrder')).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.locator('#vpOrder .vault-symbol')).toHaveCount(sequence.length);
  await pickVaultSymbol(page, sequence[0]);
  await action(page, 'vaultCancel').click();
  await expect(page.locator('#combat')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 100, xp: 0, credits: 500 });
  expect(targetNode((await game.snapshot()).immersion).done).toBe(false);
  expect(await minigames(page)).toMatchObject({ combatActive: false, vault: null, timerHandle: false, cancelRegistered: false });

  await reenterChallenge(page, game);
  const nextSequence = await vaultInput(page);
  const retryCpu = (await game.snapshot()).state.player.cpu;
  await pickVaultSymbol(page, nextSequence[0]);
  // New input started 3s after cancellation: 12s crosses the first attempt's
  // old input timeout while leaving 3s on the new attempt's legitimate timer.
  await page.clock.runFor(12_000);
  expect((await minigames(page)).vault).toMatchObject({ sameNode: true, phase: 'input', locked: false, picks: [nextSequence[0]] });
  expect((await game.snapshot()).state.player.cpu).toBe(retryCpu);
  await expect(page.locator('#vpOrder .picked')).toHaveCount(1);
  await action(page, 'vaultCancel').click();
  await page.clock.runFor(20_000);
  await expect(page.locator('#combat')).toBeHidden();
  expect((await game.snapshot()).state.player.cpu).toBe(retryCpu);
  expect(targetNode((await game.snapshot()).immersion).done).toBe(false);
  expect((await game.snapshot()).state.player.stats.jobsCompleted).toBe(0);
});

test('memoria: Ctrl+S durante reveal guarda el grid, no COM, y tras recarga se reentra legítimamente', async ({ page, game }) => {
  await setupChallenge(game, 'daemon');
  await game.startCombat({ type: 'daemon', tier: 3 });
  await memoryInput(page);
  await page.keyboard.press('Enter');
  expect((await minigames(page)).combat.memPhase).toBe('reveal');
  await page.keyboard.press('Control+s');
  await expect(page.locator('#msg')).toContainText('partida guardada');
  const saved = (await game.snapshot()).saved;
  expect(saved.player).toMatchObject({ cpu: 86, xp: 0, stats: { daemons: 0, totalDamageReceived: 14 } });
  expect(saved._inImmersion).toMatchObject({ current: '2_0', combatOccurred: true });
  expect(targetNode(saved._inImmersion)).toMatchObject({ type: 'daemon', tier: 3, done: false });
  expect(saved.COM).toBeUndefined();
  expect(saved.VAULT_PUZZLE).toBeUndefined();
  await game.reload();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  await expect(page.locator('#combat')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  expect((await game.snapshot()).immersion).toEqual(saved._inImmersion);
  expect(await minigames(page)).toEqual({ combatActive: false, timerHandle: false, cancelRegistered: false, combat: null, vault: null });
  await page.clock.runFor(20_000);
  expect((await game.snapshot()).state.player).toMatchObject({ cpu: 86, xp: 0, stats: { daemons: 0, totalDamageReceived: 14 } });
  const ambush = await reenterChallenge(page, game);
  expect((await minigames(page)).combat).toMatchObject({ mode: 'memoria', phase: 1, memPhase: 'reveal' });
  const phases = await solveMemory(page);
  expect((await game.snapshot()).saved.player).toMatchObject({ cpu: 86, xp: 62 + ambush.ambushXp,
    stats: { daemons: 1, totalDamageReceived: 14, totalDamageDealt: phases * 30 + ambush.ambushDamageDealt } });
  expect(targetNode((await game.snapshot()).saved._inImmersion).done).toBe(true);
});
