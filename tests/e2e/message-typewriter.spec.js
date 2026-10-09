'use strict';
const {test,expect}=require('./fixtures');
const visual=page=>page.locator('#msg-text');

test('avisos: escritura real con cursor, anuncio completo y efecto de la acción inmediato',async({page,game})=>{
  await game.setup({state:{offers:[]}});
  const before=await game.snapshot();
  await page.locator('#h-snd').click();
  const text='sonidos fx/ui activados.';
  await expect(page.locator('#msg')).toHaveAccessibleName(text);
  await expect(visual(page)).toBeEmpty();
  await expect(page.locator('#msg')).toHaveClass(/msg-typing/);
  expect((await game.snapshot()).saved.snd).toBe(true);
  expect((await game.snapshot()).state.player.credits).toBe(before.state.player.credits);
  const start=await page.locator('#msg-cursor').boundingBox();
  await page.clock.runFor(45);
  await expect(visual(page)).toHaveText('s');
  const next=await page.locator('#msg-cursor').boundingBox();
  expect(next.x).toBeGreaterThan(start.x);
  await page.clock.runFor(405);
  await expect(visual(page)).toHaveText(text.slice(0,10));
  await page.screenshot({path:'test-results/message-writing.png'});
  await page.clock.runFor(6000);
  await expect(visual(page)).toHaveText(text);
  await expect(page.locator('#msg')).not.toHaveClass(/msg-typing/);
  expect(await page.locator('#msg-cursor').evaluate(el=>getComputedStyle(el).animationName)).toBe('caretBlink');
  expect(await page.evaluate(()=>_msgTypeTimer)).toBeNull();
});

test('avisos: un mensaje nuevo interrumpe el anterior sin cola ni letras mezcladas',async({page,game})=>{
  await game.setup({state:{offers:[]}});
  await page.locator('#h-snd').click();
  await page.clock.runFor(135);
  await expect(visual(page)).toHaveText('son');
  await page.locator('#h-snd').click();
  await game.expectMessage('sonidos fx/ui desactivados.');
  await expect(visual(page)).toBeEmpty();
  await page.clock.runFor(450);
  await expect(visual(page)).toHaveText('sonidos fx');
  await page.clock.runFor(6000);
  await expect(visual(page)).toHaveText('sonidos fx/ui desactivados.');
  expect((await game.snapshot()).saved.snd).toBe(false);
  expect(await page.evaluate(()=>_msgTypeTimer)).toBeNull();
});

test('avisos responsive: el cursor sigue visible con texto largo, Unicode íntegro y sin robar foco',async({page,game})=>{
  await page.setViewportSize({width:375,height:800});
  await game.setup({state:{offers:[]}});
  await game.command('x'.repeat(250));
  await page.clock.runFor(3000);
  const scrolling=await visual(page).evaluate(el=>({left:el.scrollLeft,width:el.clientWidth,content:el.scrollWidth}));
  expect(scrolling.left).toBeGreaterThan(0);
  expect(scrolling.content).toBeGreaterThan(scrolling.width);
  const cursor=await page.locator('#msg-cursor').boundingBox(),bar=await page.locator('#msgbar').boundingBox();
  expect(cursor.x).toBeGreaterThanOrEqual(bar.x);
  expect(cursor.x+cursor.width).toBeLessThanOrEqual(bar.x+bar.width);
  await expect(page.locator('#cmd')).toBeFocused();
  await page.screenshot({path:'test-results/message-writing-mobile.png'});
  const symbol='👩🏽‍💻',prefix='comando no reconocido: "';
  await game.command(symbol);
  await expect(visual(page)).toBeEmpty();
  await page.clock.runFor((prefix.length+1)*45);
  await expect(visual(page)).toHaveText(prefix+symbol);
  await page.clock.runFor(6000);
  await expect(visual(page)).toHaveText(prefix+symbol+'" — escribe AYUDA');
  expect(await visual(page).evaluate(el=>el.scrollLeft)).toBe(0);
  await expect(page.locator('#cmd')).toBeFocused();
});

test('avisos: movimiento reducido muestra todo y cancela la animación en curso',async({page,game})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await game.setup({state:{offers:[]}});
  await page.locator('#h-snd').click();
  await expect(visual(page)).toHaveText('sonidos fx/ui activados.');
  await expect(page.locator('#msg')).not.toHaveClass(/msg-typing/);
  expect(await page.evaluate(()=>_msgTypeTimer)).toBeNull();
  expect(await page.locator('#msg-cursor').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#h-snd').click();
  await expect(visual(page)).toBeEmpty();
  await page.clock.runFor(90);
  await expect(visual(page)).toHaveText('so');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.runFor(50);
  await expect(visual(page)).toHaveText('sonidos fx/ui desactivados.');
  expect(await page.evaluate(()=>_msgTypeTimer)).toBeNull();
});
