'use strict';
const {test,expect}=require('./fixtures');

for(const enemy of [{type:'ice',tier:1,mode:'claves'},{type:'ice',tier:3,mode:'scanner'},{type:'daemon',tier:3,mode:'memoria'}]){
  test('ficha permanente y pausa: '+enemy.mode,async({page,game})=>{
    await game.setup({player:{heat:60,virus:1}});
    await game.startCombat({...enemy,encounter:true});
    await expect(page.locator('#combat-enter')).toBeVisible();
    await expect(page.locator('#encounter-detail')).toHaveText(enemy.type==='daemon'?'HAS ENTRADO EN UN NODO DAEMON':'HAS ENTRADO EN UN NODO ICE');
    await expect(page.locator('.encounter-facts dd').nth(1)).toHaveText({claves:'CLAVES HEX',memoria:'MEMORIA HEX',scanner:'ESCÁNER'}[enemy.mode]);
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
    await expect(page.locator('#combat-enter')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#combat-enter')).toHaveCount(0);
    expect(await page.evaluate(()=>COM.stage)).toBe('combat');
    if(enemy.mode==='memoria') await expect(page.locator('#memSeq')).not.toBeEmpty();
    else if(enemy.mode==='scanner') await expect(page.locator('#scanZone')).toBeVisible();
    else await expect(page.locator('#codeInput')).toBeFocused();
  });
}

test('huida inicial conserva coste y no consume virus',async({page,game})=>{
  await game.setup({player:{sigilo:10,virus:1}});
  await game.startCombat({type:'daemon',tier:3,encounter:true});
  await page.locator('#escapeBtn').click();
  await expect(page.locator('#combat')).toBeHidden();
  const result=await game.snapshot();
  expect(result.state.player.heat).toBe(5);
  expect(result.state.player.virus).toBe(1);
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
  await expect(page.locator('.encounter-card p')).toHaveCount(0);
});

test('equipo: lista solo existencias útiles sin consumirlas al leer',async({page,game},testInfo)=>{
  await game.setup({player:{decoys:2,virus:1,breakerUp:1,fwUp:1}});
  await game.startCombat({tier:2,encounter:true});
  await expect(page.locator('.encounter-gear li')).toHaveText(['DECOY ×2','VIRUS ×1','ROMPEHIELOS +1','FIREWALL +10']);
  await page.screenshot({path:testInfo.outputPath('encounter-equipment.png')});
  expect((await game.snapshot()).state.player).toMatchObject({decoys:2,virus:1,breakerUp:1,fwUp:1});
  await page.locator('#combat-enter').click();
  expect((await game.snapshot()).state.player.virus).toBe(0);
});

test('equipo: omite rompehielos en memoria y VIRUS sin fases reducibles',async({page,game})=>{
  await game.setup({player:{breakerUp:2,virus:1}});
  await game.startCombat({type:'daemon',tier:3,encounter:true});
  await expect(page.locator('.encounter-gear li')).toHaveText(['VIRUS ×1']);
  await page.evaluate(()=>cancelActiveCombat());
  await game.startCombat({tier:1,encounter:true});
  await expect(page.locator('.encounter-gear li')).toHaveText(['ROMPEHIELOS +2']);
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
