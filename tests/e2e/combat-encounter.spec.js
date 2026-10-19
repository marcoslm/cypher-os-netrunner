'use strict';
const {test,expect,solveCodeCombat,solveRoutePhase}=require('./fixtures');

for(const enemy of [{type:'ice',tier:1,mode:'claves'},{type:'ice',tier:3,mode:'scanner'},{type:'daemon',tier:3,mode:'memoria'},{type:'ice',tier:2,mode:'ruta'},{type:'ice',tier:2,scavenger:true,mode:'rastreo'}]){
  test('ficha permanente y pausa: '+enemy.mode,async({page,game})=>{
    await game.setup({player:{heat:60,virus:1}});
    await game.startCombat({...enemy,encounter:true});
    await expect(page.locator('#combat-enter')).toBeVisible();
    await expect(page.locator('#encounter-detail')).toHaveText(enemy.scavenger?'TE HA DETECTADO UN RASTREADOR':enemy.type==='daemon'?'HAS ENTRADO EN UN NODO DAEMON':'HAS ENTRADO EN UN NODO ICE');
    await expect(page.locator('.encounter-facts dd').nth(1)).toHaveText({claves:'CLAVES HEX',memoria:'MEMORIA HEX',scanner:'ESCÁNER',ruta:'DESVÍO',rastreo:'RASTREO'}[enemy.mode]);
    await expect(page.locator('.encounter-card')).not.toContainText(/Memoriza|Introduce|Toca la zona|daño por fallo|s por fase|El reloj/);
    await expect(page.locator('#os')).toHaveJSProperty('inert',true);
    const before=await game.snapshot();
    await page.clock.runFor(30000);
    const after=await game.snapshot();
    expect(after.state.clock).toBe(before.state.clock);
    expect(after.state.player.heat).toBe(before.state.player.heat);
    expect(after.state.player.cpu).toBe(before.state.player.cpu);
    expect(after.state.player.virus).toBe(1);
    expect(await page.evaluate(()=>combatTimer)).toBeNull();
    await page.keyboard.press('Enter');
    await expect(page.locator('#combat-enter')).toBeVisible();
    await page.keyboard.press('Tab');
    if(enemy.tier>1){
      await expect(page.locator('#combat-virus')).toBeFocused();
      await expect(page.locator('#combat-virus')).not.toBeChecked();
      await page.keyboard.press('Tab');
    }
    await expect(page.locator('#combat-enter')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#combat-enter')).toHaveCount(0);
    expect(await page.evaluate(()=>COM.stage)).toBe('combat');
    expect((await game.snapshot()).state.player.virus).toBe(1);
    if(enemy.mode==='memoria') await expect(page.locator('#memSeq')).not.toBeEmpty();
    else if(enemy.mode==='scanner') await expect(page.locator('#scanZone')).toBeVisible();
    else if(enemy.mode==='ruta') await expect(page.locator('[data-route="0"]')).toBeFocused();
    else if(enemy.mode==='rastreo') await expect(page.locator('#traceReply')).toBeFocused();
    else await expect(page.locator('#codeInput')).toBeFocused();
  });
}

test('huida inicial conserva coste y no consume virus',async({page,game})=>{
  await game.setup({player:{sigilo:10,virus:1,decoys:2}});
  await game.startCombat({type:'daemon',tier:3,encounter:true});
  await page.locator('#combat-virus').check();await page.locator('#combat-decoy').check();
  await page.locator('#escapeBtn').click();
  await expect(page.locator('#combat')).toBeHidden();
  const result=await game.snapshot();
  expect(result.state.player.heat).toBe(5);
  expect(result.state.player.virus).toBe(1);
  expect(result.state.player.decoys).toBe(2);
});

test('huida fallida inicia combate tras un único golpe',async({page,game})=>{
  await game.setup();
  await game.startCombat({encounter:true});
  await page.evaluate(()=>{Math.random=function(){return .99;};});
  const damage=await page.evaluate(()=>combatDamage());
  await page.locator('#escapeBtn').click();
  await expect(page.locator('#codeInput')).toBeFocused();
  expect((await game.snapshot()).state.player.cpu).toBe(100-damage);
  await expect(page.locator('#combatLog')).toContainText('huida fallida');
});

for(const width of [320,768]){
  test('ficha legible y botones accesibles a '+width+' px',async({page,game},testInfo)=>{
    await page.setViewportSize({width,height:600});
    await game.setup();
    await game.startCombat({type:'daemon',tier:3,encounter:true});
    const card=page.locator('.encounter-card');
    const box=await card.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(600);
    expect(await card.evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('encounter.png')});
    await page.locator('#combat-enter').click();
    await expect(page.locator('#memSeq')).not.toBeEmpty();
  });
}

test('rastreador: contexto de detección y ficha técnica, sin instrucciones',async({page,game})=>{
  await game.setup();
  await page.evaluate(()=>startCombat({node:{type:'ice',tier:2,scavenger:true,name:'RASTREADOR · PERRO'}}));
  await expect(page.locator('#encounter-detail')).toHaveText('TE HA DETECTADO UN RASTREADOR');
  await expect(page.locator('#encounter-title')).toHaveText('RASTREADOR · PERRO');
  await expect(page.locator('.encounter-facts dd').first()).toHaveText('RASTREADOR · ICE · T2');
  await expect(page.locator('.encounter-gear')).toHaveCount(0);
  await expect(page.locator('.encounter-note')).toContainText('persigue esta sesión');
  await expect(page.locator('.encounter-facts dd').nth(1)).toHaveText('RASTREO');
});

test('equipo: selección por teclado conserva reservas hasta confirmar una sola vez',async({page,game},testInfo)=>{
  await game.setup({player:{decoys:2,virus:1,breakerUp:1,fwUp:1}});
  await game.startCombat({tier:2,encounter:true});
  await expect(page.locator('.encounter-gear li')).toHaveText(['FIREWALL +10']);
  await expect(page.locator('#combat-decoy')).not.toBeChecked();
  await expect(page.locator('#combat-virus')).not.toBeChecked();
  await page.keyboard.press('Tab');await expect(page.locator('#combat-decoy')).toBeFocused();
  await page.keyboard.press('Space');await expect(page.locator('#combat-decoy')).toBeChecked();
  await page.keyboard.press('Space');await expect(page.locator('#combat-decoy')).not.toBeChecked();
  await page.keyboard.press('Space');await page.keyboard.press('Tab');
  await expect(page.locator('#combat-virus')).toBeFocused();await page.keyboard.press('Space');
  await expect(page.locator('#combat-virus')).toBeChecked();
  await page.screenshot({path:testInfo.outputPath('encounter-equipment.png')});
  expect((await game.snapshot()).state.player).toMatchObject({decoys:2,virus:1,breakerUp:1,fwUp:1});
  await page.locator('#combat-enter').click();
  expect((await game.snapshot()).state.player).toMatchObject({decoys:1,virus:0});
  expect((await game.snapshot()).saved.player).toMatchObject({decoys:1,virus:0});
  expect(await page.evaluate(()=>({phases:COM.phases,shield:COM.decoyReady}))).toEqual({phases:1,shield:true});
});

test('equipo: omite rompehielos en memoria y VIRUS sin fases reducibles',async({page,game})=>{
  await game.setup({player:{breakerUp:2,virus:1}});
  await game.startCombat({type:'daemon',tier:3,encounter:true});
  await expect(page.locator('.encounter-gear')).toHaveCount(0);
  await expect(page.locator('#combat-virus')).toBeVisible();
  await page.evaluate(()=>cancelActiveCombat());
  await game.startCombat({tier:1,encounter:true});
  await expect(page.locator('.encounter-gear li')).toHaveText(['ROMPEHIELOS +2']);
  await expect(page.locator('#combat-virus')).toHaveCount(0);
});

for(const width of [320,768,1280]){
  test('consumibles: ficha equipada y acciones alcanzables a '+width+' px',async({page,game},testInfo)=>{
    const height=width===1280?720:600;
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width,height});
    await game.setup({player:{decoys:5,virus:3,breakerUp:1,fwUp:3}});
    await game.startCombat({tier:2,scavenger:true,encounter:true});
    const card=page.locator('.encounter-card');
    const bounds=await card.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(height);
    expect(await card.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('.encounter-gear li')).toHaveText(['ROMPEHIELOS +1','FIREWALL +30']);
    await page.screenshot({path:testInfo.outputPath('consumibles-ficha.png')});
    await page.locator('#combat-decoy').check();await page.locator('#combat-virus').check();
    await page.locator('#combat-enter').scrollIntoViewIfNeeded();
    await page.screenshot({path:testInfo.outputPath('consumibles-acciones.png')});
    await expect(page.locator('#combat-enter')).toBeInViewport();
    await expect(page.locator('#escapeBtn')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.locator('#combat-enter')).toHaveCount(0);
    expect((await game.snapshot()).state.player).toMatchObject({decoys:5,virus:3});
  });
}

test('consumibles: texto ampliado mantiene opciones y foco sin desbordamiento horizontal',async({page,game})=>{
  await page.setViewportSize({width:768,height:600});
  await game.setup({player:{decoys:3,virus:2,fwUp:3}});
  await game.startCombat({type:'daemon',tier:3,encounter:true});
  await page.addStyleTag({content:'.encounter-card,.encounter-card p,.encounter-card label,.encounter-card legend,.encounter-card button,.encounter-card dd,.encounter-card dt{font-size:24px}'});
  expect(await page.locator('.encounter-card').evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Tab');await expect(page.locator('#combat-decoy')).toBeFocused();
  await page.keyboard.press('Space');await page.keyboard.press('Tab');await page.keyboard.press('Space');
  await page.keyboard.press('Tab');await expect(page.locator('#combat-enter')).toBeFocused();
  await expect(page.locator('#combat-enter')).toBeInViewport();await page.keyboard.press('Enter');
  expect((await game.snapshot()).state.player).toMatchObject({decoys:2,virus:1});
});

test('Núcleo informa que no permite huir',async({page,game})=>{
  await game.setup();
  await game.startCombat({type:'nucleo',tier:4,boss:true,encounter:true});
  await expect(page.locator('#escapeBtn')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#combat-enter')).toBeVisible();
  await page.locator('#combat-enter').click();
  await expect(page.locator('#codeInput')).toBeFocused();
});

for(const width of [320,1280]){
  test('F7: desvío por input real, avatar y layout a '+width+' px',async({page,game},testInfo)=>{
    await page.setViewportSize({width,height:720});
    await game.setup();
    await game.startCombat({tier:2,encounter:true});
    await expect(page.locator('.encounter-facts')).toContainText('DESVÍO');
    const silhouette=await page.locator('.avatar-shell').getAttribute('d');
    await page.locator('#combat-enter').click();
    await expect(page.locator('.avatar-shell')).toHaveAttribute('d',silhouette);
    await expect(page.locator('[data-route]')).toHaveCount(9);
    const first=page.locator('[data-route="0"]');
    const initial=await first.getAttribute('data-mask');
    await expect(first).toBeFocused();
    await page.keyboard.press('Space');
    expect(await first.getAttribute('data-mask')).not.toBe(initial);
    await expect(first).toBeFocused();
    await page.screenshot({path:testInfo.outputPath('desvio.png')});
    expect(await page.locator('.combat-card').evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('.combat-avatar')).toHaveCSS('width','60px');
    await expect(page.locator('.combat-avatar')).toHaveCSS('height','54px');
    await solveRoutePhase(page);
    await expect(page.locator('#enemyDamage')).toHaveText('50%');
    await expect(page.locator('.avatar-damage')).toHaveAttribute('height','36');
    await page.screenshot({path:testInfo.outputPath('desvio-damage.png')});
    await solveCodeCombat(page);
    await expect(page.locator('#combat')).toBeHidden();
    const once=(await game.snapshot()).state.player.stats.totalDamageDealt;
    await page.clock.runFor(60000);
    expect((await game.snapshot()).state.player.stats.totalDamageDealt).toBe(once);
  });
}

for(const width of [320,1280]){
test('rastreo: contexto previo y lectura/respuesta compactas a '+width+' px',async({page,game},testInfo)=>{
  await page.setViewportSize({width,height:600});
  await game.setup({player:{maxCpu:200,cpu:200}});
  await page.evaluate(()=>startCombat({node:{type:'ice',tier:2,scavenger:true,name:'RASTREADOR'}}));
  await expect(page.locator('.encounter-note')).toContainText('dirección de su rutina activa');
  const initial=(await game.snapshot()).state.player;
  await page.clock.runFor(30000);
  expect((await game.snapshot()).state.player).toEqual(initial);
  expect(await page.evaluate(()=>combatTimer)).toBeNull();
  await page.screenshot({path:testInfo.outputPath('rastreo-contexto.png')});
  await page.locator('#combat-enter').click();
  await expect(page.locator('#traceReply')).toBeFocused();
  await expect(page.locator('#codeInput')).toBeDisabled();
  await expect(page.locator('#codeInput')).toBeHidden();
  await expect(page.locator('.hex-kb')).toBeHidden();
  const code=(await page.locator('#codeTarget').innerText()).match(/0x([0-9A-F]+)/)[1];
  await expect(page.locator('#codeTarget')).toHaveText('0x'+code);
  await expect(page.locator('.trace-card')).not.toContainText(/TRAZA LOCAL|RUTINA ACTIVA|CANAL AISLADO|persigue esta sesión/);
  const fits=async()=>{
    const card=page.locator('.trace-card');
    expect(await card.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
    expect(await card.evaluate(element=>element.scrollHeight-element.clientHeight)).toBeLessThanOrEqual(1);
    const box=await card.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(600);
  };
  await fits();await page.screenshot({path:testInfo.outputPath('rastreo-lectura.png')});
  const remaining=await page.evaluate(()=>COM.remaining);
  await page.clock.runFor(300);
  expect(await page.evaluate(()=>COM.remaining)).toBe(remaining-300);
  await page.keyboard.press('Enter');
  await expect(page.locator('#codeTarget')).not.toContainText(code);
  await expect(page.locator('#traceReply')).toBeHidden();
  await expect(page.locator('#codeInput')).toBeFocused();
  await expect(page.locator('.hex-kb')).toBeVisible();
  await fits();await page.screenshot({path:testInfo.outputPath('rastreo-respuesta.png')});
  const before=(await game.snapshot()).state.player.cpu;
  await page.keyboard.press('Enter');
  expect((await game.snapshot()).state.player.cpu).toBeLessThan(before);
  await expect(page.locator('#traceReply')).toBeVisible();
  await expect(page.locator('#codeInput')).toBeDisabled();
  await expect(page.locator('.hex-kb')).toBeHidden();
  await fits();await page.screenshot({path:testInfo.outputPath('rastreo-reintento.png')});
  await solveCodeCombat(page);
  await expect(page.locator('#combat')).toBeHidden();
});
}

test('F7: timeout, huida y callbacks retirados con movimiento reducido',async({page,game})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:320,height:600});
  await game.setup({player:{maxCpu:500,cpu:500,sigilo:20}});
  await game.startCombat({tier:2});
  const cpu=(await game.snapshot()).state.player.cpu;
  const duration=await page.evaluate(()=>COM.time);
  await page.clock.runFor(duration);
  const damaged=(await game.snapshot()).state.player.cpu;
  expect(damaged).toBeLessThan(cpu);
  await expect(page.locator('[data-route="0"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#combat')).toBeHidden();
  await game.startCombat({tier:2,scavenger:true,encounter:true});
  await page.clock.runFor(60000);
  expect((await game.snapshot()).state.player.cpu).toBe(damaged);
  await expect(page.locator('#enemyDamage')).toHaveText('0%');
  await page.locator('#combat-enter').click();
  await page.clock.runFor(await page.evaluate(()=>COM.time));
  await expect(page.locator('#traceReply')).toBeFocused();
  await expect(page.locator('#codeInput')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#combat')).toBeHidden();
  const escaped=(await game.snapshot()).state.player.cpu;
  await page.clock.runFor(60000);
  expect((await game.snapshot()).state.player.cpu).toBe(escaped);
  expect(await page.evaluate(()=>combatTimer)).toBeNull();
});
