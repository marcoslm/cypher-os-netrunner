'use strict';
const {test,expect}=require('./fixtures');
test.use({progressiveBoot:true});
async function pauseBoot(page){
 // Pausar al primer segundo virtual, antes de revelar el menú.
 await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
}
test('ciberdeck: BIOS vertical anclada, menú final y entrada directa',async({page,game},testInfo)=>{
 await pauseBoot(page);
 await expect(page.locator('#intro-start')).toBeHidden();
 await expect(page.locator('#intro-skip')).toBeFocused();
 const first=page.locator('#boot-body .line').first();await expect(first).toBeVisible();
 const anchor=await first.boundingBox();
 const count=await page.locator('#boot-body .line').count();
 await page.clock.runFor(1000);
 expect(await page.locator('#boot-body .line').count()).toBeGreaterThan(count);
 expect((await first.boundingBox()).y).toBe(anchor.y);
 await page.screenshot({path:testInfo.outputPath('deck-boot.png')});
 await page.clock.runFor(4000);
 await expect(page.locator('#intro-start')).toBeVisible();await expect(page.locator('#intro-start')).toBeFocused();
 await expect(page.locator('#boot-body .line')).toHaveCount(11);
 await expect(page.locator('#boot-body .line').nth(1)).toHaveText(/^FIRMWARE v1\.0 alpha · BUILD [1-9]\d*$/);
 expect((await first.boundingBox()).y).toBe(anchor.y);
 expect((await game.snapshot()).state).toBeNull();
 await expect(page.locator('#os')).toHaveJSProperty('inert',true);
 await expect(page.locator('#intro-menu')).toHaveCSS('opacity','1');
 await page.screenshot({path:testInfo.outputPath('deck-ready.png')});
 await page.locator('#intro-start').click();
 await expect(page.locator('#intro')).toBeHidden();await expect(page.locator('#cmd')).toBeFocused();
 expect((await game.snapshot()).state.player.credits).toBe(500);
 expect(await page.evaluate(()=>_introBootTimer)).toBeNull();
});
test('ciberdeck: atajos y clic de fondo no saltan BIOS; omitir solo abre opciones',async({page,game})=>{
 await pauseBoot(page);
 for(const key of ['Control+g','Control+k','Control+1','Control+s','Tab','Shift+Tab'])await page.keyboard.press(key);
 await expect(page.locator('#intro-skip')).toBeFocused();
 await page.locator('#boot').click();
 await expect(page.locator('#intro-start')).toBeHidden();
 await expect(page.locator('#controls-overlay')).toBeHidden();
 expect((await game.snapshot()).state).toBeNull();
 await page.locator('#intro-skip').focus();await page.keyboard.press('Enter');
 await expect(page.locator('#intro-start')).toBeVisible();
 expect((await game.snapshot()).state).toBeNull();
 await expect(page.locator('#os')).toHaveJSProperty('inert',true);
 await page.clock.runFor(5000);await expect(page.locator('#boot-body .line')).toHaveCount(11);
});
test('ciberdeck: movimiento reducido en curso termina POST sin cursor ni timers',async({page,game})=>{
 await pauseBoot(page);await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('#intro-start')).toBeVisible();
 await expect(page.locator('#boot-body .line')).toHaveCount(11);
 await expect(page.locator('html')).toHaveClass(/motion-off/);
 expect(await page.evaluate(()=>_introBootTimer)).toBeNull();expect((await game.snapshot()).state).toBeNull();
 await page.clock.runFor(5000);await expect(page.locator('#boot-body .line')).toHaveCount(11);
});
test('ciberdeck: preferencia reducida al recargar muestra menú inmediatamente',async({page,game})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 await expect(page.locator('#intro-start')).toBeVisible();await expect(page.locator('#intro-skip')).toBeHidden();
 await expect(page.locator('#boot-body .line')).toHaveCount(11);
 expect(await page.evaluate(()=>_introBootTimer)).toBeNull();expect((await game.snapshot()).state).toBeNull();
});
for(const width of [320,375,768]){
 test(`ciberdeck: ${width} px sin desbordamiento y controles accesibles`,async({page,game},testInfo)=>{
  await page.setViewportSize({width,height:667});await pauseBoot(page);
  await page.locator('#intro-skip').click();
  const overflow=await page.locator('#intro').evaluate(el=>el.scrollWidth>el.clientWidth);
  expect(overflow).toBe(false);
  await page.locator('#intro-start').scrollIntoViewIfNeeded();await expect(page.locator('#intro-start')).toBeInViewport();
  await expect(page.locator('#intro-menu')).toHaveCSS('opacity','1');
  await page.screenshot({path:testInfo.outputPath(`deck-${width}.png`)});
  await page.locator('#intro [data-action="openControls"]').click();await expect(page.locator('#controls-overlay')).toBeVisible();
  await page.keyboard.press('Escape');await page.locator('#intro-start').click();
  await expect(page.locator('#intro')).toBeHidden();expect((await game.snapshot()).state).not.toBeNull();
 });
}
