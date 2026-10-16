'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test: base, expect } = require('@playwright/test');
const { storyFixture } = require('../harness');

const GAME_URL = pathToFileURL(path.resolve(__dirname, '../../cypher_os.html')).href;
const MUSIC_URL = pathToFileURL(path.resolve(__dirname, '../../music') + path.sep).href;
const CLOCK_START = Date.parse('2030-01-01T00:00:00Z');

function optionalMusicFailure(url, message) {
  // Cambiar de escena/cancelar la precarga aborta peticiones MP3 legítimamente.
  // Solo estos dos estados de recursos musicales locales son tolerables.
  return url.startsWith(MUSIC_URL) && /\.mp3(?:[?#]|$)/i.test(url) &&
    /\b(?:ERR_FILE_NOT_FOUND|ERR_ABORTED)\b/.test(message);
}

// Node-side saved grid, not a replacement for the real renderer or its handlers.
function makeImmersion({ loaded = false } = {}) {
  const nodes = [
    { id: '0_0', layer: 0, x: 80, y: 270, type: 'puerto', name: 'PUERTO DE CALLE' },
    { id: '1_0', layer: 1, x: 280, y: 180, type: 'data', name: 'NODO DE DATOS', data: 77 },
    { id: '2_0', layer: 2, x: 480, y: 330, type: 'empty', name: '' },
    { id: '3_0', layer: 3, x: 680, y: 180, type: 'empty', name: '' },
    { id: '4_0', layer: 4, x: 880, y: 330, type: 'empty', name: '' }
  ].map(node => ({ tier: 0, tierName: '', data: 0, done: false, _done: false, _used: false, ...node }));
  if (loaded) nodes[1].done = nodes[1]._done = true;
  const adj = {};
  nodes.forEach((node, index) => {
    adj[node.id] = [];
    if (index > 0) adj[node.id].push(nodes[index - 1].id);
    if (index + 1 < nodes.length) adj[node.id].push(nodes[index + 1].id);
  });
  return {
    grid: { nodes, adj, byLayer: nodes.map(node => [node]), entry: nodes[0].id, maxDepth: 4 },
    depth: 4, current: nodes[loaded ? 1 : 0].id,
    dataUsed: loaded ? 1 : 0, data: loaded ? [{ value: 77 }] : [],
    maxDepthReached: 1, moves: loaded ? 1 : 0, combatOccurred: false, enemiesDefeated: 0
  };
}

function jsonFile(value, name = 'partida.json') {
  return { name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) };
}

const test = base.extend({
  progressiveBoot: [false, { option: true }],
  // The built-in page/context fixtures remain test-scoped: no shared profile or storageState.
  page: async ({ page, context }, use, testInfo) => {
    const failures = [];
    const optionalMusic = [];
    const onPageError = error => failures.push({ type: 'pageerror', message: error.stack || error.message });
    const onRequestFailed = request => {
      const message = request.failure()?.errorText || 'requestfailed';
      const entry = { type: 'requestfailed', url: request.url(), message };
      (optionalMusicFailure(entry.url, message) ? optionalMusic : failures).push(entry);
    };
    const onConsole = message => {
      if (!['warning', 'error'].includes(message.type())) return;
      const entry = { type: `console.${message.type()}`, url: message.location().url || '', message: message.text() };
      (optionalMusicFailure(entry.url, entry.message) ? optionalMusic : failures).push(entry);
    };
    const onDialog = dialog => {
      failures.push({ type: 'native-dialog', message: `${dialog.type()}: ${dialog.message()}` });
      void dialog.dismiss().catch(error => failures.push({ type: 'dialog-dismiss', message: error.message }));
    };
    const blockExternal = async route => {
      failures.push({ type: 'external-request', url: route.request().url() });
      await route.abort('blockedbyclient');
    };
    await context.route(/^https?:\/\//i, blockExternal);
    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);
    page.on('console', onConsole);
    page.on('dialog', onDialog);
    try {
      await use(page);
    } finally {
      if (failures.length || optionalMusic.length) {
        await testInfo.attach('browser-diagnostics', {
          body: Buffer.from(JSON.stringify({ failures, optionalMusic }, null, 2)),
          contentType: 'application/json'
        });
      }
      page.off('pageerror', onPageError);
      page.off('requestfailed', onRequestFailed);
      page.off('console', onConsole);
      page.off('dialog', onDialog);
      await context.unroute(/^https?:\/\//i, blockExternal);
      expect(failures, 'No JS errors, native dialogs, missing required resources or HTTP(S) dependencies').toEqual([]);
    }
  },

  game: async ({ page, progressiveBoot }, use) => {
    // Install before any game timer exists. CSS and all public game functions are untouched.
    await page.clock.install({ time: new Date(CLOCK_START) });
    await page.goto(GAME_URL);
    if (!progressiveBoot) {
      if (await page.locator('#intro-skip').isVisible()) await page.locator('#intro-skip').click();
      await expect(page.locator('#intro-start')).toBeVisible();
    }
    let paused = false;
    let pauseCount = 0;

    const game = {
      async freeze() {
        if (paused) return;
        // A future virtual instant, not a sleep: pauseAt runs pending intervals once.
        await page.clock.pauseAt(new Date(CLOCK_START + (++pauseCount * 60_000)));
        paused = true;
      },
      async resume() {
        if (!paused) return;
        await page.clock.resume();
        paused = false;
      },
      async skipBoot({ freeze = true } = {}) {
        if (await page.locator('[data-action="storySkip"]').isVisible()) await page.locator('[data-action="storySkip"]').click();
        if (await page.locator('#intro-skip').isVisible()) await page.locator('#intro-skip').click();
        if (await page.locator('[data-action="storyRecover"]').isVisible()) await page.locator('[data-action="storyRecover"]').click();
        await expect(page.locator('#intro')).toBeHidden();
        await expect(page.locator('#boot')).toBeHidden();
        await expect(page.locator('#panel-scroll')).not.toBeEmpty();
        if (freeze) await game.freeze();
      },
      async boot(options = {}) {
        if (await page.locator('#intro-skip').isVisible()) {
          if (options.touch) await page.locator('#intro-skip').tap();
          else if (options.skip === 'keyboard') {
            await page.locator('#intro-skip').focus();
            await page.keyboard.press('Enter');
          } else await page.locator('#intro-skip').click();
        }
        await expect(page.locator('#intro-start')).toBeVisible();
        if (options.difficulty) await page.locator(`input[name="diff"][value="${options.difficulty}"]`).check();
        if (options.touch) await page.locator('#intro-start').tap();
        else await page.locator('#intro-start').click();
        await game.skipBoot(options);
      },
      async reload(options = {}) {
        await game.resume();
        await page.reload();
        await game.boot(options);
      },
      async setup(options = {}, bootOptions = {}) {
        if (options.state?.history?.finalDone || options.state?.history?.finalUnlocked) {
          const catalog = await page.evaluate(() => ({ narrative: newNarrativeState(),
            chapters: STORY_CHAPTERS.map(item => item.id), files: STORY_FILES.map(item => item.id) }));
          const completed = !!options.state.history.finalDone;
          options = { ...options, state: { ...options.state,
            history: { ...options.state.history, finalUnlocked: true, finalDone: completed },
            narrative: options.state.narrative || storyFixture(catalog.narrative, catalog.chapters, catalog.files, completed ? 'resolved' : 'accepted') } };
        }
        // Seed once through the real save path. Reloads never reseed localStorage.
        // evaluate is used to arrange state only, never to run the input being tested.
        await page.evaluate(options => {
          const defaults = nuevoEstado();
          const state = options.state || {};
          const player = options.player || {};
          S = { ...defaults, snd: false, amb: false, mus: false, _tutorialDone: true, ...state };
          S.player = { ...defaults.player, ...player };
          S.player.rep = { ...defaults.player.rep, ...player.rep };
          S.player.stats = { ...defaults.player.stats, ...player.stats };
          S.player.stats.iceByTier = { ...defaults.player.stats.iceByTier, ...player.stats?.iceByTier };
          S.history = { ...defaults.history, ...state.history };
          if (!Object.prototype.hasOwnProperty.call(state, 'narrative')) {
            S.narrative.entry = 'diagnostic'; storyBeginRecovery();
            S.narrative.chapters.c01 = 'resolved'; S.narrative.chapters.c02 = 'offered';
            S.narrative.aliasAcquired = true; S.narrative.awarded = ['c01'];
            S.narrative.files.r_factura = 'readable';
          }
          // Device preferences are arranged independently from the save file.
          for (const key of ['snd', 'amb', 'mus']) _deckPrefs[key] = S[key];
          saveDeckPrefs();
          ensureStateIntegrity();
          if (!Object.prototype.hasOwnProperty.call(state, 'offers')) generateOffers();
          inImmersion = options.immersion || null;
          save();
        }, options);
        await game.resume();
        await page.reload();
        await game.boot(bootOptions);
      },
      async startCombat({ type = 'ice', tier = 1, boss = false, scavenger = false, encounter = false } = {}) {
        await game.freeze();
        // Arrange the enemy only; code entry, damage from Enter and Escape use real input.
        await page.evaluate(({ type, tier, boss, scavenger }) => {
          const node = inImmersion ? nodeById(inImmersion.current) : {};
          Object.assign(node, { type, tier, boss, scavenger, tierName: `T${tier}`, name: 'ENEMIGO DE PRUEBA', done: false });
          startCombat({ node, onWin: onNodeDefeated });
        }, { type, tier, boss, scavenger });
        await expect(page.locator('#combat')).toBeVisible();
        if (!encounter) await page.locator('#combat-enter').click();
      },
      async fatal(unsavedPlayer = {}) {
        await game.freeze();
        // Fatal damage is a fixture, not the user action under assertion.
        await page.evaluate(player => {
          Object.assign(S.player, player);
          startCombat({ node: { type: 'ice', tier: 1, tierName: 'T1', name: 'DAÑO FATAL DE PRUEBA' }, onWin: onNodeDefeated });
          applyDamageToPlayer(10_000);
        }, unsavedPlayer);
        await expect(page.locator('#flatline')).toBeVisible();
      },
      async snapshot() {
        // Read-only observations: no focus(), handlers, synthetic events or state mutations.
        return page.locator('body').evaluate(() => {
          const raw = localStorage.getItem('cypher_os_save_story_v1');
          return JSON.parse(JSON.stringify({
            state: S, raw, saved: raw ? JSON.parse(raw) : null,
            immersion: inImmersion, view: currentView, combatActive, gridRender,
            combat: COM ? { mode: COM.mode, phase: COM.phase, tier: COM.tier, memPhase: COM.memPhase, memSequence: COM.memSequence, alive: COM.alive } : null
          }));
        });
      },
      async expectMessage(text) {
        // Semantic announcement is immediate; dedicated tests advance and inspect its visual typewriter.
        const escaped=text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        await expect(page.locator('#msg')).toHaveAttribute('aria-label',new RegExp(escaped));
      },
      async command(text) {
        await page.keyboard.press('Control+k');
        await expect(page.locator('#cmd')).toBeFocused();
        await page.keyboard.type(text);
        await page.keyboard.press('Enter');
      },
      async openSidebar({ touch = false } = {}) {
        const sidebar = page.locator('#sidebar');
        if (await sidebar.isHidden()) {
          if (touch) await page.locator('#h-sidebar').tap();
          else await page.locator('#h-sidebar').click();
        }
        await expect(sidebar).toBeVisible();
      },
      async openSaveTools({ touch = false } = {}) {
        await game.openSidebar({ touch });
        const dialog = page.locator('#save-tools');
        if (!(await dialog.isVisible())) {
          if (touch) await page.locator('#save-tools-toggle').tap();
          else await page.locator('#save-tools-toggle').click();
        }
        await expect(dialog).toBeVisible();
      },
      async importFile(value, name) {
        await game.openSaveTools();
        const chooserPromise = page.waitForEvent('filechooser');
        await page.locator('#btn-import').click();
        const chooser = await chooserPromise;
        expect(await chooser.element().getAttribute('id')).toBe('import-file');
        // Native file-input backend and real FileReader, including malformed JSON.
        await chooser.element().setInputFiles(jsonFile(value, name));
      }
    };
    await use(game);
  }
});

async function tabTo(page, target, { reverse = false, limit = 40 } = {}) {
  for (let count = 0; count < limit; count++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
  }
  await expect(target, 'Reach the control using real Tab, not programmatic focus').toBeFocused();
}

async function solveRoutePhase(page) {
  const tiles = await page.locator('[data-route]').evaluateAll(elements => elements.map(element => Number(element.dataset.mask)));
  const [source, target] = (await page.locator('#routeStatus').innerText()).match(/\d+/g).map(value => Number(value)-1);
  const rotate = mask => ((mask << 1) & 15) | ((mask >> 3) & 1);
  function connected(masks) {
    if (!(masks[source] & 8) || !(masks[target] & 2)) return false;
    const queue = [source], seen = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (current === target) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      for (const [bit, back, delta] of [[1,4,-3],[2,8,1],[4,1,3],[8,2,-1]]) {
        const next = current + delta;
        if (next < 0 || next > 8 || (Math.abs(delta) === 1 && Math.floor(next/3) !== Math.floor(current/3))) continue;
        if ((masks[current] & bit) && (masks[next] & back) && !seen.has(next)) queue.push(next);
      }
    }
    return false;
  }
  function search(masks, index = 0) {
    if (index === 9) return connected(masks) ? [...masks] : null;
    const initial = masks[index];
    do {
      const solution = search(masks, index+1);
      if (solution) return solution;
      masks[index] = rotate(masks[index]);
    } while (masks[index] !== initial);
    return null;
  }
  const solution = search([...tiles]);
  expect(solution, 'The visible circuit must have a reachable solution').not.toBeNull();
  for (let index = 0; index < tiles.length; index++) {
    while (tiles[index] !== solution[index]) {
      await page.locator(`[data-route="${index}"]`).click();
      tiles[index] = rotate(tiles[index]);
    }
  }
  await page.locator('#routeSend').click();
}

async function solveCodeCombat(page) {
  // Read the displayed challenge; do not assign COM.code or replace combat functions.
  for (let phase = 0; phase < 4; phase++) {
    if (!(await page.locator('#combat').isVisible())) return;
    if (await page.locator('#combat-enter').isVisible()) await page.locator('#combat-enter').click();
    if (await page.locator('#routeBoard').isVisible()) { await solveRoutePhase(page); continue; }
    // El juego puede encadenar el efecto del nodo tras el combate (p. ej. emboscada
    // antes de un vault): la UI ya no es de claves y esta rutina termina aquí.
    const readingTrace = await page.locator('#traceReply').isVisible();
    if (!readingTrace && !(await page.locator('#codeInput').isVisible())) return;
    let code;
    if (readingTrace) {
      code = (await page.locator('#codeTarget').innerText()).match(/0x([0-9A-F]+)/)[1].toLowerCase();
      await page.locator('#traceReply').click();
    } else code = (await page.locator('#codeTarget').innerText()).replace(/\s/g, '').toLowerCase();
    await expect(page.locator('#codeInput')).toBeFocused();
    expect(code).toMatch(/^[0-9a-f]{3,}$/);
    await page.keyboard.type(code.split('').join(' '));
  }
  await expect(page.locator('#combat')).toBeHidden();
}

async function scannerState(page) {
  return page.locator('#combat').evaluate(() => ({
    active: combatActive, phase: COM?.phase, phases: COM?.phases,
    remaining: COM?.remaining, time: COM?.time, pos: _scannerPos,
    dir: _scannerDir, speed: _scannerSpeed, gaps: _scannerGaps.map(gap => ({ ...gap }))
  }));
}
async function solveScanner(page, { touch = false } = {}) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const state = await scannerState(page);
    if (!state.active) return;
    const available = state.gaps.filter(gap => !gap.hit);
    if (available.some(gap => state.pos >= gap.x && state.pos <= gap.x + gap.w)) {
      const beforeHits = state.gaps.filter(gap => gap.hit).length;
      if (touch) await page.locator('#scanZone').tap();
      else await page.locator('#scanZone').click();
      const next = await scannerState(page);
      if (next.active && next.phase === state.phase) expect(next.gaps.filter(gap => gap.hit)).toHaveLength(beforeHits + 1);
      else if (next.active) expect(next.phase).toBe(state.phase + 1);
      continue;
    }
    const centers = available.map(gap => gap.x + gap.w / 2);
    const forward = centers.filter(position => state.dir > 0 ? position > state.pos : position < state.pos);
    const target = forward.length ? (state.dir > 0 ? Math.min(...forward) : Math.max(...forward)) : (state.dir > 0 ? 95 : 0);
    const milliseconds = Math.max(32, Math.ceil(Math.abs(target - state.pos) / state.speed * 1000) + 32);
    await page.clock.runFor(milliseconds);
    const next = await scannerState(page);
    if (next.active && next.phase === state.phase) {
      const rendered = await page.locator('#scanLine').evaluate(element => parseFloat(element.style.left));
      expect(rendered).toBeCloseTo(next.pos, 4);
    }
  }
  throw new Error('Scanner solver exhausted its bounded observations');
}

async function downloadJSON(download) {
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

module.exports = { test, expect, GAME_URL, makeImmersion, jsonFile, tabTo, solveCodeCombat, solveRoutePhase, scannerState, solveScanner, downloadJSON };
