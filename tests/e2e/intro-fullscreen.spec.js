'use strict';
const {test,expect}=require('./fixtures');

test('intro F08: pantalla completa se controla desde la intro sin arrancar la partida',async({page,game})=>{
  test.skip(!await page.evaluate(()=>fsSupported()),'API no disponible en este navegador.');
  await expect(page.locator('#intro-fs')).toBeVisible();
  await expect(page.locator('#intro-fs')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#intro-start')).toBeVisible();
  await page.locator('#intro-fs').click();
  await expect(page.locator('#intro-fs')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#h-fs')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
  await expect(page.locator('#intro-fs-status')).toContainText('activada');
  // La intro sigue a la vista: el botón FULL no arranca COMENZAR.
  await expect(page.locator('#intro-start')).toBeVisible();
  await page.locator('#intro-fs').click();
  await expect(page.locator('#intro-fs')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#intro-fs-status')).toContainText('desactivada');
  await expect(page.locator('#intro-start')).toBeVisible();
  await page.locator('#intro-start').click();
  await expect(page.locator('#intro')).toBeHidden();
  await expect(page.locator('#boot')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot')).toBeHidden();
  // Tras arrancar, el indicador superior sigue funcionando.
  await page.locator('#h-fs').click();
  await expect(page.locator('#h-fs')).toHaveAttribute('aria-pressed','true');
  await page.locator('#h-fs').click();
  await expect(page.locator('#h-fs')).toHaveAttribute('aria-pressed','false');
});
