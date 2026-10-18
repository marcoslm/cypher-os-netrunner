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
  const local = f => f.replace(/^assets\/music\//, '');
  const present = files.filter(f => fs.existsSync(path.resolve(__dirname, '../../assets/music', local(f))));
  const missing = f => !fs.existsSync(path.resolve(__dirname, '../../assets/music', local(f)));
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
  test.skip(!present.includes('assets/music/cyos-hot-el-muro.mp3') || !missing('assets/music/cyos-hot-caza-abierta.mp3') || !missing('assets/music/cyos-hot-paranoia.mp3'), 'Caso de entrega parcial: El muro presente y dos variantes pendientes.');
  await game.setup({ immersion: makeImmersion(), player: { heat: 80 } });
  await page.evaluate(() => {
    MUSIC.bags.gridHot = [MUSIC_TRACKS.gridHot[1], MUSIC_TRACKS.gridHot[2], MUSIC_TRACKS.gridHot[0]];
  });
  await page.locator('#h-mus').click();
  await expect.poll(() => page.evaluate(() => ({
    scene: MUSIC.scene, track: MUSIC.playing.gridHot?.t?.f, paused: MUSIC.el?.paused,
    skipped: Object.keys(MUSIC.unavailable).length, ready: (MUSIC.el?.readyState || 0) >= 2
  }))).toEqual({ scene: 'gridHot', track: 'assets/music/cyos-hot-el-muro.mp3', paused: false, skipped: 2, ready: true });
  await page.locator('#h-mus').click();
  expect(await page.evaluate(() => ({ mus: S.mus, paused: MUSIC.el.paused, scene: MUSIC.scene }))).toEqual({ mus: false, paused: true, scene: null });
  await game.reload();
  await expect(page.locator('#h-mus')).toHaveAttribute('aria-pressed', 'false');
  expect((await game.snapshot()).saved.mus).toBe(false);
});

test('música: combate sin pistas silencia menús y la victoria reanuda la calle', async ({ page, game }) => {
  const { present, missing } = await catalog(page);
  test.skip(present.filter(f => f.startsWith('assets/music/cyos-ui-')).length !== 4 || ['icebreakers', 'claves-hex', 'memoria-daemon', 'escaner', 'santo-cero'].some(f => !missing('assets/music/cyos-combat-' + f + '.mp3')), 'Caso de entrega parcial: menús presentes y combate pendiente.');
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
  expect(hotTrack).toMatch(/^assets\/music\/cyos-hot-/);
  await game.startCombat();
  await expect.poll(() => page.evaluate(() => ({
    scene: MUSIC.scene, track: MUSIC.playing.combat?.t?.f, paused: MUSIC.el?.paused
  }))).toEqual(expect.objectContaining({ scene: 'combat', paused: false }));
  const combatTrack = await page.evaluate(() => MUSIC.playing.combat.t.f);
  expect(combatTrack).toMatch(/^assets\/music\/cyos-combat-/);
  await solveCodeCombat(page);
});

test('música: volver a intro silencia MP3 y ambiente sin cambiar ajustes; COMENZAR reanuda', async ({ page, game }) => {
  const { present } = await catalog(page);
  test.skip(!present.some(f => f.startsWith('assets/music/cyos-ui-')), 'Requiere música local opcional de calle.');
  await game.setup({state:{offers:[]}});
  await page.locator('#h-mus').click();
  await page.locator('#h-amb').click();
  await expect.poll(() => page.evaluate(() => !MUSIC.el.paused && MUSIC.el.readyState >= 2)).toBe(true);
  const track = await page.evaluate(() => MUSIC.playing.ui.t.f);
  await game.openSaveTools();await page.locator('#btn-intro').click();
  await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
  await expect(page.locator('#intro')).toBeVisible();
  expect(await page.evaluate(() => ({paused:MUSIC.el.paused,scene:MUSIC.scene,ambient:AMBIENT.activeMode,mus:S.mus,amb:S.amb})))
    .toEqual({paused:true,scene:null,ambient:null,mus:true,amb:true});
  await page.locator('#intro [data-action="openControls"]').click();
  await page.locator('#control-musVolume').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => MUSIC.el.paused && AMBIENT.activeMode===null)).toBe(true);
  await page.locator('#intro-start').click();
  await expect.poll(() => page.evaluate(() => MUSIC.scene==='ui' && !MUSIC.el.paused && AMBIENT.activeMode==='street')).toBe(true);
  expect(await page.evaluate(() => MUSIC.playing.ui.t.f)).toBe(track);
});
