'use strict';

const { test, expect, GAME_URL, makeImmersion, jsonFile, tabTo, solveCodeCombat, downloadJSON } = require('./fixtures');

const nav = (page, view) => page.locator(`.navbtn[data-view="${view}"]`);
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const clone = value => JSON.parse(JSON.stringify(value));

function vaultOffer(id, project, corp) {
  return {
    id, contact: 'doctorSudario', title: `EL VAULT DE ${corp}`,
    desc: `Llega a la capa 2 y recupera el proyecto ${project}.`,
    type: 'vault', n: 1, reward: 500, xp: 30, risk: 'high',
    project, targetDepth: 2, why: ''
  };
}

test('intro: solo COMENZAR inicia y un gesto salta la BIOS real', async ({ page, game }) => {
  expect(page.url()).toBe(GAME_URL);
  await expect(page).toHaveTitle(/CYPHER:\/\/OS.*v9\.2\.7/);
  await page.locator('#intro .intro-tag').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('#intro')).toBeVisible();
  await expect(page.locator('#boot')).toBeHidden();
  expect((await game.snapshot()).state).toBeNull();
  await expect(page.locator('#panel-scroll')).toBeEmpty();

  await page.locator('#intro-start').click();
  await expect(page.locator('#boot')).toHaveCSS('background-color', 'rgb(1, 6, 5)');
  await game.skipBoot({ skip: 'keyboard' });
  await expect(nav(page, 'inicio')).toHaveClass(/active/);
  await expect(page.locator('#h-cpu')).toHaveText('100/100');
  await expect(page.locator('#h-cc')).toHaveText('500');
  await expect(page.locator('#cmd')).toBeFocused();
});

test('smoke: todos los paneles, terminal y compras con autosave', async ({ page, game }) => {
  await game.boot({ skip: 'click' });
  const panels = [
    ['contactos', 'CONTACTOS'], ['mensajes', 'MENSAJES'], ['trabajos', 'TRABAJOS'],
    ['tienda', 'MERCADO NEGRO'], ['estado', 'ESTADO'], ['informes', 'INFORMES'],
    ['registro', 'REGISTRO'], ['logros', 'LOGROS'], ['ayuda', 'AYUDA']
  ];
  for (const [view, title] of panels) {
    await nav(page, view).click();
    await expect(nav(page, view)).toHaveClass(/active/);
    await expect(page.locator('#panel-scroll h1.title')).toHaveText(title);
  }
  await nav(page, 'red').click();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  await expect(action(page, 'dipGrid')).toBeVisible();
  await nav(page, 'inicio').click();
  await expect(page.locator('#panel-scroll .logo')).toContainText('CYPHER');

  await nav(page, 'tienda').click();
  await page.locator('[data-action="buyItem"][data-id="ram"]').click();
  await expect(page.locator('#h-cc')).toHaveText('280');
  await expect(page.locator('#h-ram')).toHaveText('0/10');
  await page.locator('[data-action="buyItem"][data-id="breaker"]').click();
  await expect(page.locator('#h-cc')).toHaveText('20');
  await expect(page.locator('[data-action="buyItem"][data-id="ram"]')).toBeDisabled();
  const saved = (await game.snapshot()).saved;
  expect(saved.player).toMatchObject({ credits: 20, ramUp: 1, breakerUp: 1 });
  expect(saved.player.stats.totalCreditsSpent).toBe(480);
  await game.command('estado');
  await expect(page.locator('#panel-scroll h1.title')).toHaveText('ESTADO');
  await expect(page.locator('#panel-scroll')).toContainText('0/10');
  await game.command('ayuda');
  await expect(page.locator('#panel-scroll h1.title')).toHaveText('AYUDA');
});

test('HARDCORE: foco e inert, Tab, Ctrl+K/S, recarga y NUEVO REGISTRO cancelar/confirmar', async ({ page, game }) => {
  await game.setup({
    state: { difficulty: 'hardcore', best: { level: 8, credits: 8000, finalDone: true } },
    player: { level: 4, xp: 27, credits: 1234, stats: { ice: 7 } }
  });
  await game.fatal();
  const record = page.locator('#flatline [data-action="newRecord"]');
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(page.locator('#os')).toHaveAttribute('inert', '');
  await expect(page.locator('#flatline [data-action="reconnect"]')).toHaveCount(0);
  await expect(record).toBeFocused();
  for (const key of ['Tab', 'Shift+Tab', 'Control+k', 'Control+g']) {
    await page.keyboard.press(key);
    await expect(record).toBeFocused();
  }
  await page.keyboard.press('Control+s');
  await game.expectMessage('partida guardada');
  expect((await game.snapshot()).saved.player.cpu).toBe(0);

  // Selecting NORMAL on the real intro must not resurrect a dead HARDCORE save.
  await game.reload({ difficulty: 'normal' });
  await expect(page.locator('#flatline')).toContainText('MODO HARDCORE');
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(record).toBeFocused();
  expect((await game.snapshot()).state).toMatchObject({ difficulty: 'hardcore', player: { cpu: 0 } });
  expect((await game.snapshot()).immersion).toBeNull();

  await record.click();
  const yes = page.locator('#confirm-overlay [data-action="confirmYes"]');
  const no = page.locator('#confirm-overlay [data-action="confirmNo"]');
  await expect(yes).toBeFocused();
  await expect(page.locator('#flatline')).toHaveJSProperty('inert', true);
  await page.keyboard.press('Shift+Tab');
  await expect(no).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(yes).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(yes).toBeFocused();
  await page.keyboard.press('Control+s');
  expect((await game.snapshot()).saved.player.cpu).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  await expect(record).toBeFocused();
  await record.click();
  await no.click();
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  await expect(page.locator('#flatline')).toBeVisible();
  expect((await game.snapshot()).state.player.credits).toBe(1234);

  await record.click();
  await expect(yes).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  await expect(page.locator('#flatline')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  await expect(page.locator('#h-cpu')).toHaveText('100/100');
  const fresh = (await game.snapshot()).saved;
  expect(fresh.player).toMatchObject({ credits: 500, level: 1, xp: 0, skillPoints: 0, stats: { ice: 0, immerse: 0, jobsFailed: 0 } });
  expect(fresh.jobs).toEqual([]);
  expect(fresh.intel).toEqual([]);
  expect(fresh.achievements).toEqual([]);
  expect(fresh.best).toMatchObject({ level: 8, credits: 8000, finalDone: true });
  await page.keyboard.press('Control+k');
  await expect(page.locator('#cmd')).toBeFocused();
});

test('NORMAL: RECONEXIÓN restaura el snapshot vivo tras recarga y pierde la inmersión', async ({ page, game }) => {
  await game.setup({
    player: { cpu: 88, heat: 80, credits: 1234, level: 3, xp: 11, stats: { jobsFailed: 2 } },
    state: { jobs: [{ id: 'checkpoint-job', title: 'RECOLECTA EN EL GRID', desc: 'Recoge dos datos.', type: 'recoleta', contact: 'mamaWire', n: 2, risk: 'low', reward: 100, xp: 12, done: false, failed: false, prog: { gathered: 1 } }] },
    immersion: makeImmersion({ loaded: true })
  });
  await page.keyboard.press('Control+s');
  const checkpoint = (await game.snapshot()).saved;
  await game.fatal({ credits: 9876, xp: 99 });
  expect((await game.snapshot()).saved._reconnectCheckpoint.player.credits).toBe(1234);
  await game.reload();
  const reconnect = page.locator('#flatline [data-action="reconnect"]');
  const record = page.locator('#flatline [data-action="newRecord"]');
  await expect(reconnect).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(record).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(reconnect).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#flatline')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  await expect(page.locator('#h-cpu')).toHaveText('50/100');
  await expect(page.locator('#h-ram')).toHaveText('0/6');
  await expect(nav(page, 'inicio')).toHaveClass(/active/);
  const result = await game.snapshot();
  expect(result.state.player).toMatchObject({ credits: 1234, xp: 11, level: 3, heat: Math.round(checkpoint.player.heat * 0.4), stats: { jobsFailed: 3 } });
  expect(result.state.jobs[0]).toMatchObject({ done: true, failed: true });
  expect(result.immersion).toBeNull();
  expect(result.saved._inImmersion).toBeNull();
  expect(result.saved._reconnectCheckpoint).toBeUndefined();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#cmd')).toBeFocused();
});

test('combate: foco de claves, Enter daña, código real normalizado y Escape durante revelación', async ({ page, game }) => {
  await game.setup({ immersion: makeImmersion() });
  await game.startCombat();
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#escapeBtn')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#combatLog')).toContainText('fallo');
  expect((await game.snapshot()).state.player.cpu).toBe(94);
  await solveCodeCombat(page);
  await expect(page.locator('#combat')).toBeHidden();
  await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  expect((await game.snapshot()).saved.player.stats.ice).toBe(1);

  await game.startCombat({ type: 'daemon', tier: 3 });
  await expect(page.locator('#memPhase')).toHaveText('MEMORIZA LA SECUENCIA');
  await expect(page.locator('#memInput')).toBeHidden();
  await expect(page.locator('#escapeBtn')).toBeFocused();
  const before = await game.snapshot();
  await page.keyboard.press('Escape');
  const after = await game.snapshot();
  // Escape is probabilistic. Both legitimate outcomes must show exactly one attempt.
  if (after.combatActive) {
    await expect(page.locator('#combatLog')).toContainText('huida fallida');
    expect(after.state.player.cpu).toBe(before.state.player.cpu - 14);
    expect(after.state.player.stats.totalDamageReceived).toBe(before.state.player.stats.totalDamageReceived + 14);
    expect(after.combat.memPhase).toBe('reveal');
    expect(after.combat.memSequence).toBe(before.combat.memSequence);
  } else {
    await expect(page.locator('#combat')).toBeHidden();
    await expect(page.locator('#os')).toHaveJSProperty('inert', false);
    expect(after.state.player.cpu).toBe(before.state.player.cpu);
    expect(after.state.player.heat).toBe(before.state.player.heat + 5);
    expect(after.combat).toBeNull();
  }
});

test('combate: RESET/IMPORTAR del fondo no reciben input; guardia y FileReader rechazan sustitución', async ({ page, game }) => {
  await game.setup({ player: { credits: 2000 }, immersion: makeImmersion() });
  await game.startCombat();
  let chooserCount = 0;
  page.on('filechooser', () => { chooserCount++; });
  await expect(page.locator('#os')).toHaveJSProperty('inert', true);
  await expect(page.locator('#codeInput')).toBeFocused();
  for (const selector of ['#btn-reset', '#btn-import']) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    // Real pointer input at the covered location, not force:true or dispatchEvent.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('#confirm-overlay')).toBeHidden();
    await expect(page.locator('#combat')).toBeVisible();
  }
  expect(chooserCount).toBe(0);
  await expect(page.locator('#cmd')).not.toBeFocused();
  await page.locator('#codeInput').click();
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#escapeBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#codeInput')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#escapeBtn')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#escapeBtn')).toBeFocused();

  await test.step('assert separado de la guardia pública, no sustituto del input DOM', async () => {
    const guard = await page.locator('#combat').evaluate(() => {
      const previousState = S;
      const previousBattle = COM;
      const accepted = importGameState(nuevoEstado());
      return { accepted, sameState: S === previousState, sameBattle: COM === previousBattle, living: livingInteraction() };
    });
    expect(guard).toEqual({ accepted: false, sameState: true, sameBattle: true, living: false });
  });
  await page.keyboard.press('Control+s');
  await game.expectMessage('partida guardada');
  const before = await game.snapshot();
  const incoming = clone(before.saved);
  incoming.player.credits = 9000;
  // The inaccessible picker is not presented as usable: this probes the real async
  // file-input/FileReader completion path, as if a pending selection finished now.
  await page.locator('#import-file').setInputFiles(jsonFile(incoming, 'durante-combate.json'));
  await game.expectMessage('termina el combate');
  await expect(page.locator('#combat')).toBeVisible();
  await expect(page.locator('#confirm-overlay')).toBeHidden();
  const after = await game.snapshot();
  expect(after.raw).toBe(before.raw);
  expect(after.state.player.credits).toBe(2000);
  expect(after.combat).toEqual(before.combat);
});

test('árbol: Tab y Enter desbloquean, guardan y Escape cierra sin focus() artificial', async ({ page, game }) => {
  await game.setup({ player: { skillPoints: 1 } });
  await nav(page, 'estado').click();
  await action(page, 'openSkillTree').click();
  const skill = page.locator('#skilltree-overlay .skill-node[data-branch="0"][data-skill="0"]');
  await expect(skill).toHaveAttribute('role', 'button');
  await expect(skill).toHaveAttribute('aria-disabled', 'false');
  await tabTo(page, skill);
  await expect(skill).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(skill).toHaveClass(/unlocked/);
  await expect(skill).toHaveAttribute('aria-disabled', 'true');
  await expect(skill).toContainText('DESBLOQUEADO');
  const saved = (await game.snapshot()).saved;
  expect(saved.player).toMatchObject({ skillPoints: 0, breakerUp: 1, _unlockedSkills: ['rompe1'] });
  await page.keyboard.press('Escape');
  await expect(page.locator('#skilltree-overlay')).toBeHidden();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#cmd')).toBeFocused();
});

test('inmersión: recoger con input, GUARDAR/exportar, recargar y vender datos una vez', async ({ page, game }) => {
  // A real saved cooldown suppresses unrelated grid events; no random function is replaced.
  await game.setup({ player: { _gridEventCooldown: 3 }, immersion: makeImmersion() });
  await page.locator('#adjlist .adj-node[data-idx="0"]').click();
  // A legitimate random ambush remains possible: resolve it through actual code input.
  if ((await game.snapshot()).combatActive) await solveCodeCombat(page);
  await expect(page.locator('#h-ram')).toHaveText('1/6');
  await expect(page.locator('#adjlist')).toContainText('NODO DE DATOS');
  await page.locator('#btn-save').click();
  await game.expectMessage('guardada a mano');
  const saved = (await game.snapshot()).saved;
  expect(saved._inImmersion).toMatchObject({ current: '1_0', dataUsed: 1, data: [{ value: 77 }] });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('cypher_os_save.json');
  const exported = await downloadJSON(download);
  expect(exported._inImmersion).toEqual(saved._inImmersion);

  await game.reload();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  await expect(page.locator('#h-ram')).toHaveText('1/6');
  expect((await game.snapshot()).immersion).toEqual(exported._inImmersion);
  await action(page, 'doSuperficie').click();
  await expect(page.locator('#overlay')).toContainText('RESUMEN DE LA INMERSIÓN');
  await expect(page.locator('.resume-row').filter({ hasText: 'Datos recogidos' }).locator('.rv')).toHaveText('1');
  await expect(page.locator('.resume-row').filter({ hasText: 'Créditos ganados' }).locator('.rv')).toHaveText('₡77');
  await expect(page.locator('#h-cc')).toHaveText('577');
  const surface = (await game.snapshot()).saved;
  expect(surface._inImmersion).toBeNull();
  expect(surface.player.stats).toMatchObject({ data: 1, credits: 77, immerse: 1 });
  await action(page, 'closeResume').click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.keyboard.press('Control+s');
  expect((await game.snapshot()).saved.player.credits).toBe(577);
});

test('importación: picker real rechaza JSON/tipos dañados y recupera un grid válido sin herencia local', async ({ page, game }) => {
  await game.setup({ player: { credits: 1234 }, state: { best: { level: 9, finalDone: true } } });
  await page.keyboard.press('Control+s');
  const before = await game.snapshot();
  const badSkills = clone(before.saved);
  badSkills.player._unlockedSkills = [42];
  const invalid = [
    ['malformado.json', '{"player":', 'error al leer archivo'],
    ['player-invalido.json', '{"player":1}', 'archivo inválido'],
    ['skills-invalidas.json', badSkills, 'archivo inválido']
  ];
  for (const [name, value, message] of invalid) {
    await page.keyboard.press('Control+s');
    await game.expectMessage('partida guardada');
    await game.importFile(value, name);
    await game.expectMessage(message);
    const after = await game.snapshot();
    expect(after.raw).toBe(before.raw);
    expect(after.state.player.credits).toBe(1234);
    await expect(page.locator('#os')).toHaveJSProperty('inert', false);
  }
  const incoming = clone(before.saved);
  incoming.player.credits = 8765;
  incoming.player.cpu = 73;
  incoming.player.level = 2;
  incoming.player.stats.data = 1;
  incoming.player._unlockedSkills = [];
  incoming.best = { level: 2 };
  incoming._inImmersion = makeImmersion({ loaded: true });
  await game.importFile(incoming, 'grid-valido.json');
  await game.expectMessage('de vuelta en el grid');
  await expect(page.locator('#gridcanvas')).toBeVisible();
  await expect(page.locator('#h-cpu')).toHaveText('73/100');
  await expect(page.locator('#h-cc')).toHaveText('8765');
  await expect(page.locator('#h-ram')).toHaveText('1/6');
  const imported = await game.snapshot();
  expect(imported.view).toBe('red');
  // This fixture predates tracking: migrate only demonstrated visits, never regenerate its grid.
  const restored = { ...incoming._inImmersion, visited: ['0_0', '1_0'], visitsPartial: true,
    enemyCounts: { ice: 0, daemons: 0, trackers: 0, nucleo: 0 }, enemyCountsPartial: true,
    exploredNotified: false, exhaustedNotified: false };
  expect(imported.immersion).toEqual(restored);
  expect(imported.saved._inImmersion).toEqual(restored);
  expect(imported.saved.best).toEqual({ level: 2 });
  expect(imported.saved.player._unlockedSkills).toEqual([]);
});

test('vault: solo se acepta en la calle, uno activo y un objetivo en el siguiente grid', async ({ page, game }) => {
  const first = vaultOffer('vault-kuro', 'KURO', 'KURO GATECH');
  const second = vaultOffer('vault-lapida', 'LÁPIDA', 'MONOLITH');
  await game.setup({ state: { offers: [first, second] }, immersion: makeImmersion() });
  await nav(page, 'contactos').click();
  const kuro = page.locator('#offers-doctorSudario .offer').filter({ hasText: first.title });
  await expect(kuro).toContainText('ACEPTAR EN LA CALLE');
  await expect(kuro.locator('[data-action="acceptJob"]')).toHaveCount(0);
  expect((await game.snapshot()).state.jobs).toEqual([]);
  await nav(page, 'red').click();
  await action(page, 'doSuperficie').click();
  await action(page, 'closeResume').click();
  await nav(page, 'contactos').click();
  await page.locator('[data-action="acceptJob"][data-id="vault-kuro"]').click();
  expect((await game.snapshot()).saved.jobs).toHaveLength(1);
  await page.locator('[data-action="acceptJob"][data-id="vault-lapida"]').click();
  await game.expectMessage('UN contrato de vault');
  expect((await game.snapshot()).state.jobs).toHaveLength(1);
  await nav(page, 'inicio').click();
  await action(page, 'dipGrid').click();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  const vaults = (await game.snapshot()).immersion.grid.nodes.filter(node => node.type === 'vault');
  expect(vaults).toHaveLength(1);
  expect(vaults[0]).toMatchObject({ proj: 'KURO', layer: 2 });
});

test('Núcleo: asignación en una inmersión queda pendiente hasta el siguiente DIP, incluso tras recarga', async ({ page, game }) => {
  await game.setup({ player: { level: 5, rep: { night0X: 3 } }, immersion: makeImmersion() });
  const oldGrid = (await game.snapshot()).immersion;
  expect(oldGrid.depth).toBe(4);
  expect(oldGrid.grid.nodes.some(node => node.boss)).toBe(false);
  await nav(page, 'inicio').click();
  await expect(action(page, 'acceptNucleo')).toBeVisible();
  await action(page, 'acceptNucleo').click();
  expect((await game.snapshot()).saved.nextDepth).toBe(5);
  expect((await game.snapshot()).immersion.grid).toEqual(oldGrid.grid);
  await nav(page, 'red').click();
  await action(page, 'doSuperficie').click();
  await action(page, 'closeResume').click();
  expect((await game.snapshot()).saved.nextDepth).toBe(5);
  await game.reload();
  expect((await game.snapshot()).state.nextDepth).toBe(5);
  await action(page, 'dipGrid').click();
  await expect(page.locator('#gridcanvas')).toBeVisible();
  const next = await game.snapshot();
  expect(next.immersion.depth).toBe(5);
  expect(next.immersion.grid.maxDepth).toBe(5);
  expect(next.saved.nextDepth).toBeNull();
  const bosses = next.immersion.grid.nodes.filter(node => node.boss);
  expect(bosses).toHaveLength(1);
  expect(bosses[0]).toMatchObject({ type: 'nucleo', layer: 5, tier: 4 });
  const reachable = new Set([next.immersion.grid.entry]);
  const queue = [...reachable];
  while (queue.length) {
    for (const neighbor of next.immersion.grid.adj[queue.shift()] || []) {
      if (!reachable.has(neighbor)) { reachable.add(neighbor); queue.push(neighbor); }
    }
  }
  expect(reachable.has(bosses[0].id)).toBe(true);
});

test.describe('navegación táctil responsive', () => {
  test.use({ viewport: { width: 720, height: 900 }, hasTouch: true });

  test('720 y 375 px: menú colapsado, navegación y confirmación con tap', async ({ page, game }) => {
    await game.setup({}, { touch: true, skip: 'click' });
    for (const width of [720, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(nav(page, 'contactos').locator('.lbl')).toHaveCSS('display', 'none');
      for (const [view, title] of [['contactos', 'CONTACTOS'], ['tienda', 'MERCADO NEGRO'], ['estado', 'ESTADO']]) {
        await nav(page, view).tap();
        await expect(nav(page, view)).toHaveClass(/active/);
        await expect(page.locator('#panel-scroll h1.title')).toHaveText(title);
        const box = await nav(page, view).boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
    await page.locator('#btn-reset').tap();
    await expect(page.locator('#confirm-overlay')).toBeVisible();
    await page.locator('#confirm-overlay [data-action="confirmNo"]').tap();
    await expect(page.locator('#confirm-overlay')).toBeHidden();
    await expect(page.locator('#os')).toHaveJSProperty('inert', false);
    expect((await game.snapshot()).state.player.cpu).toBe(100);
  });
});
