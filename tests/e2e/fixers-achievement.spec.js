'use strict';

const { test, expect, makeImmersion } = require('./fixtures');

const rep = { mamaWire: 5, doctorSudario: 5, night0X: 5, kairos: 5 };

test('fixers: el último trabajo celebra todos los indicadores llenos y persiste al recargar', async ({ page, game }) => {
  await game.setup({
    player: { level: 4, rep: { ...rep, kairos: 4 } },
    state: { jobs: [{ id: 'ultimo', contact: 'kairos', title: 'Último favor', desc: 'Recoge un dato.', type: 'recoleta', n: 1, reward: 100, xp: 10, prog: { gathered: 1 }, done: false, failed: false }] },
    immersion: makeImmersion({ loaded: true })
  });
  expect((await game.snapshot()).state.achievements).not.toContain('allFixers');
  await page.locator('[data-action="doSuperficie"]').click();
  expect((await game.snapshot()).saved.achievements).toContain('allFixers');
  await page.locator('[data-action="closeResume"]').click();
  await page.locator('.navbtn[data-view="contactos"]').click();
  await expect(page.locator('.contact .rep-dots')).toHaveText(['●●●●●', '●●●●●', '●●●●●', '●●●●●']);
  await page.locator('.navbtn[data-view="logros"]').click();
  await expect(page.locator('.logro.unlocked').filter({ hasText: 'TODOS LOS FIXERS RESPONDEN' })).toBeVisible();
  await game.reload();
  expect((await game.snapshot()).state.achievements.filter(id => id === 'allFixers')).toHaveLength(1);
});

test('fixers: reconoce una partida anterior con reputación máxima al cargar', async ({ page, game }) => {
  await game.setup({ player: { level: 4, rep }, state: { achievements: [] } });
  expect((await game.snapshot()).saved.achievements).toContain('allFixers');
  await page.locator('.navbtn[data-view="logros"]').click();
  await expect(page.locator('.logro.unlocked').filter({ hasText: 'TODOS LOS FIXERS RESPONDEN' })).toBeVisible();
});
