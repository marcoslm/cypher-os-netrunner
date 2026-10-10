'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test: base, expect } = require('@playwright/test');

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

  game: async ({ page }, use) => {
    // Install before any game timer exists. CSS and all public game functions are untouched.
    await page.clock.install({ time: new Date(CLOCK_START) });
    await page.goto(GAME_URL);
    await expect(page.locator('#intro-start')).toBeVisible();
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
      async skipBoot({ skip = 'keyboard', touch = false, freeze = true } = {}) {
        await expect(page.locator('#intro')).toBeHidden();
        await expect(page.locator('#boot')).toBeVisible();
        await expect(page.locator('#boot-body .line').first()).toBeVisible();
        if (skip === 'click') {
          if (touch) await page.locator('#boot').tap();
          else await page.locator('#boot').click();
        } else {
          await page.keyboard.press('Enter');
        }
        await expect(page.locator('#boot')).toBeHidden();
        await expect(page.locator('#panel-scroll')).not.toBeEmpty();
        if (freeze) await game.freeze();
      },
      async boot(options = {}) {
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
      async startCombat({ type = 'ice', tier = 1, boss = false } = {}) {
        await game.freeze();
        // Arrange the enemy only; code entry, damage from Enter and Escape use real input.
        await page.evaluate(({ type, tier, boss }) => {
          const node = inImmersion ? nodeById(inImmersion.current) : {};
          Object.assign(node, { type, tier, boss, tierName: `T${tier}`, name: 'ENEMIGO DE PRUEBA', done: false });
          startCombat({ node, onWin: onNodeDefeated });
        }, { type, tier, boss });
        await expect(page.locator('#combat')).toBeVisible();
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
          const raw = localStorage.getItem('cypher_os_save_v9');
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
        const group = page.locator('#save-tools');
        if (!(await group.evaluate(element => element.open))) {
          if (touch) await page.locator('#save-tools-toggle').tap();
          else await page.locator('#save-tools-toggle').click();
        }
        await expect(group).toHaveAttribute('open', '');
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

async function solveCodeCombat(page) {
  // Read the displayed challenge; do not assign COM.code or replace combat functions.
  for (let phase = 0; phase < 4; phase++) {
    if (!(await page.locator('#combat').isVisible())) return;
    await expect(page.locator('#codeInput')).toBeFocused();
    const code = (await page.locator('#codeTarget').innerText()).replace(/\s/g, '').toLowerCase();
    expect(code).toMatch(/^[0-9a-f]{3,}$/);
    await page.keyboard.type(code.split('').join(' '));
  }
  await expect(page.locator('#combat')).toBeHidden();
}

async function downloadJSON(download) {
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

module.exports = { test, expect, GAME_URL, makeImmersion, jsonFile, tabTo, solveCodeCombat, downloadJSON };
