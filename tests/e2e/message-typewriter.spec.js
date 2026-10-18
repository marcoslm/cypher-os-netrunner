'use strict';
const {test,expect}=require('./fixtures');
const visual=page=>page.locator('#msg-text');

for(const width of [320,1280]){
  test(`avisos: terminal y estado con perimetro cerrado a ${width}px`,async({page,game},testInfo)=>{
    await page.setViewportSize({width,height:width===320?480:900});await game.setup({state:{offers:[]}});
    await page.locator('#h-controls').click();
    for(const preference of ['crt','glow','animations']){
      const toggle=page.locator(`#controls-overlay [data-pref="${preference}"]`);
      if(await toggle.getAttribute('aria-pressed')==='true')await toggle.click();
    }
    await page.keyboard.press('Escape');
    const frames=await page.evaluate(()=>['msgbar','term'].map(id=>{
      const element=document.getElementById(id),bounds=element.getBoundingClientRect(),style=getComputedStyle(element);
      return {id,left:bounds.left+parseFloat(style.borderLeftWidth),top:bounds.top+parseFloat(style.borderTopWidth),
        width:bounds.width-parseFloat(style.borderLeftWidth)-parseFloat(style.borderRightWidth),
        height:bounds.height-parseFloat(style.borderTopWidth)-parseFloat(style.borderBottomWidth)};
    }));
    const image=await page.screenshot({scale:'device'});
    const missing=await page.evaluate(async({encoded,frames})=>{
      const bitmap=new Image();bitmap.src='data:image/png;base64,'+encoded;await bitmap.decode();
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);
      const {data}=context.getImageData(0,0,bitmap.width,bitmap.height),scale=bitmap.width/innerWidth;
      return frames.map(frame=>{
        const {left,top,width,height}=frame,cut=6;
        const vertices=[[left+cut,top],[left+width,top],[left+width,top+height-cut],[left+width-cut,top+height],[left,top+height],[left,top+cut]];
        let gaps=0;
        for(let side=0;side<vertices.length;side++){
          const first=vertices[side],last=vertices[(side+1)%vertices.length],steps=Math.ceil(Math.hypot(last[0]-first[0],last[1]-first[1]));
          for(let step=0;step<=steps;step++){
            const expectedX=(first[0]+(last[0]-first[0])*step/steps)*scale,expectedY=(first[1]+(last[1]-first[1])*step/steps)*scale;
            let found=false;
            for(let row=Math.floor(expectedY-1.5*scale);row<=Math.ceil(expectedY+1.5*scale);row++)for(let column=Math.floor(expectedX-1.5*scale);column<=Math.ceil(expectedX+1.5*scale);column++){
              if(row<0||column<0||row>=bitmap.height||column>=bitmap.width)continue;
              const offset=(row*bitmap.width+column)*4;
              if(data[offset+1]>45&&data[offset+1]>data[offset]*1.4)found=true;
            }
            if(!found)gaps++;
          }
        }
        return {id:frame.id,gaps};
      });
    },{encoded:image.toString('base64'),frames});
    expect(missing).toEqual([{id:'msgbar',gaps:0},{id:'term',gaps:0}]);
    for(const id of ['msgbar','term']){
      const element=page.locator('#'+id);
      await expect(element).toHaveCSS('clip-path','none');
      expect(await element.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
      expect(await element.evaluate(node=>getComputedStyle(node,'::before').clipPath)).toContain('evenodd');
    }
    expect(frames[1].top).toBeGreaterThanOrEqual(frames[0].top+frames[0].height);
    await game.command('estado');await expect(page.locator('#panel-scroll h1.title')).toHaveText('ESTADO');
    await expect(page.locator('#cmd')).toBeFocused();
    await page.screenshot({path:testInfo.outputPath(`barras-cerradas-${width}.png`)});
  });
}

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
