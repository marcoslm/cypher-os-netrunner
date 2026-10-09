'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { test, expect, makeImmersion, solveCodeCombat } = require('./fixtures');

const localFiles = [
  'cyos-ui-cable-no-duerme.mp3', 'cyos-ui-lluvia-larga.mp3', 'cyos-ui-octava.mp3', 'cyos-ui-mercado-de-calle.mp3',
  'cyos-grid-inmersion.mp3', 'cyos-grid-el-tejido.mp3', 'cyos-grid-los-recuerdos.mp3', 'cyos-grid-ruido-blanco.mp3',
  'cyos-hot-el-muro.mp3'
];
const present = localFiles.filter(f => fs.existsSync(path.resolve(__dirname, '../../music', f)));
const missing = f => !fs.existsSync(path.resolve(__dirname, '../../music', f));

// Optional assets never become a dependency of the public test suite.
test('música local: los MP3 disponibles se decodifican en Edge por file://', async ({ page, game }) => {
  test.skip(!present.length, 'No hay MP3 locales opcionales en este checkout.');
  await game.setup();
  for (const file of present) {
    const result = await page.evaluate(file => new Promise(resolve => {
      const audio = new Audio('music/' + file);
      audio.addEventListener('loadedmetadata', () => {
        resolve({ duration: audio.duration, ready: audio.readyState });
        audio.pause(); audio.removeAttribute('src'); audio.load();
      }, { once: true });
      audio.addEventListener('error', () => resolve({ error: audio.error?.code }), { once: true });
      audio.load();
    }), file);
    expect(result, file).not.toHaveProperty('error');
    expect(result.duration, file).toBeGreaterThan(1);
    expect(result.ready, file).toBeGreaterThanOrEqual(1);
  }
});

test('música: calor alto salta pendientes, reproduce El muro y persiste MUS', async ({ page, game }) => {
  test.skip(!present.includes('cyos-hot-el-muro.mp3') || !missing('cyos-hot-caza-abierta.mp3') || !missing('cyos-hot-paranoia.mp3'), 'Caso de entrega parcial: El muro presente y dos variantes pendientes.');
  await game.setup({ immersion: makeImmersion(), player: { heat: 80 } });
  await page.evaluate(() => {
    MUSIC.bags.gridHot = [MUSIC_TRACKS.gridHot[1], MUSIC_TRACKS.gridHot[2], MUSIC_TRACKS.gridHot[0]];
  });
  await page.locator('#h-mus').click();
  await expect.poll(() => page.evaluate(() => ({
    scene: MUSIC.scene, track: MUSIC.playing.gridHot?.t?.f, paused: MUSIC.el?.paused,
    skipped: Object.keys(MUSIC.unavailable).length, ready: (MUSIC.el?.readyState || 0) >= 2
  }))).toEqual({ scene: 'gridHot', track: 'music/cyos-hot-el-muro.mp3', paused: false, skipped: 2, ready: true });
  await page.locator('#h-mus').click();
  expect(await page.evaluate(() => ({ mus: S.mus, paused: MUSIC.el.paused, scene: MUSIC.scene }))).toEqual({ mus: false, paused: true, scene: null });
  await game.reload();
  await expect(page.locator('#h-mus')).toHaveAttribute('aria-pressed', 'false');
  expect((await game.snapshot()).saved.mus).toBe(false);
});

test('música: combate sin pistas silencia menús y la victoria reanuda la calle', async ({ page, game }) => {
  test.skip(present.filter(f => f.startsWith('cyos-ui-')).length !== 4 || ['icebreakers', 'claves-hex', 'memoria-daemon', 'escaner', 'santo-cero'].some(f => !missing('cyos-combat-' + f + '.mp3')), 'Caso de entrega parcial: menús presentes y combate pendiente.');
  await game.setup();
  await page.locator('#h-mus').click();
  await expect.poll(() => page.evaluate(() => !MUSIC.el.paused && MUSIC.el.readyState >= 2)).toBe(true);
  const before = await page.evaluate(() => MUSIC.playing.ui.t.f);
  await game.startCombat();
  await expect.poll(() => page.evaluate(() => ({ scene: MUSIC.scene, track: MUSIC.playing.combat?.t, paused: MUSIC.el?.paused, skipped: Object.keys(MUSIC.unavailable).length }))).toEqual({ scene: 'combat', track: null, paused: true, skipped: 5 });
  await solveCodeCombat(page);
  await expect.poll(() => page.evaluate(() => MUSIC.scene === 'ui' && !MUSIC.el.paused && MUSIC.el.readyState >= 2)).toBe(true);
  expect(await page.evaluate(() => MUSIC.playing.ui.t.f)).toBe(before);
});
