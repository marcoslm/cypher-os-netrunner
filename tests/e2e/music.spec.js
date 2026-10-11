'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { test, expect, makeImmersion, solveCodeCombat } = require('./fixtures');

// C-02: la lista de pistas se deriva del catálogo real del juego (MUSIC_TRACKS),
// no de una copia fija que pudiera quedar desincronizada. Los MP3 siguen siendo
// opcionales: solo se decodifican los presentes y los ausentes se toleran.
async function catalog(page) {
  const files = await page.evaluate(() => {
    const out = [];
    for (const scene in MUSIC_TRACKS) {
      for (const track of MUSIC_TRACKS[scene]) if (out.indexOf(track.f) < 0) out.push(track.f);
    }
    return out;
  });
  const local = f => f.replace(/^music\//, '');
  const present = files.filter(f => fs.existsSync(path.resolve(__dirname, '../../music', local(f))));
  const missing = f => !fs.existsSync(path.resolve(__dirname, '../../music', local(f)));
  return { files, present, missing, local };
}

// Optional assets never become a dependency of the public test suite.
test('música local: los MP3 del catálogo disponibles se decodifican en Edge por file://', async ({ page, game }) => {
  await game.setup();
  const { files, present } = await catalog(page);
  expect(files.length).toBeGreaterThanOrEqual(20);
  test.skip(!present.length, 'No hay MP3 locales opcionales en este checkout.');
  for (const file of present) {
    const result = await page.evaluate(file => new Promise(resolve => {
      const audio = new Audio(file);
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
  const { present, missing } = await catalog(page);
  test.skip(!present.includes('music/cyos-hot-el-muro.mp3') || !missing('music/cyos-hot-caza-abierta.mp3') || !missing('music/cyos-hot-paranoia.mp3'), 'Caso de entrega parcial: El muro presente y dos variantes pendientes.');
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
  const { present, missing } = await catalog(page);
  test.skip(present.filter(f => f.startsWith('music/cyos-ui-')).length !== 4 || ['icebreakers', 'claves-hex', 'memoria-daemon', 'escaner', 'santo-cero'].some(f => !missing('music/cyos-combat-' + f + '.mp3')), 'Caso de entrega parcial: menús presentes y combate pendiente.');
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

test('música: con catálogo disponible las escenas de calor y combate reproducen sus pistas', async ({ page, game }) => {
  const { present } = await catalog(page);
  const hasHot = present.some(f => f.indexOf('cyos-hot-') >= 0);
  const hasCombat = present.some(f => f.indexOf('cyos-combat-') >= 0);
  test.skip(!hasHot || !hasCombat, 'Caso de catálogo completo: requiere pistas de calor y combate presentes.');
  await game.setup({ immersion: makeImmersion(), player: { heat: 80 } });
  await page.locator('#h-mus').click();
  await expect.poll(() => page.evaluate(() => ({
    scene: MUSIC.scene, track: MUSIC.playing.gridHot?.t?.f, paused: MUSIC.el?.paused
  }))).toEqual(expect.objectContaining({ scene: 'gridHot', paused: false }));
  const hotTrack = await page.evaluate(() => MUSIC.playing.gridHot.t.f);
  expect(hotTrack).toMatch(/^music\/cyos-hot-/);
  await game.startCombat();
  await expect.poll(() => page.evaluate(() => ({
    scene: MUSIC.scene, track: MUSIC.playing.combat?.t?.f, paused: MUSIC.el?.paused
  }))).toEqual(expect.objectContaining({ scene: 'combat', paused: false }));
  const combatTrack = await page.evaluate(() => MUSIC.playing.combat.t.f);
  expect(combatTrack).toMatch(/^music\/cyos-combat-/);
  await solveCodeCombat(page);
});
