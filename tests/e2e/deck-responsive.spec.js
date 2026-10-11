'use strict';
const {test,expect,makeImmersion}=require('./fixtures');

test.use({hasTouch:true});
for(const viewport of [{width:1024,height:600},{width:768,height:1024},{width:768,height:600}]){
  test.describe(`deck táctil ${viewport.width}x${viewport.height}`,()=>{
    test.use({viewport});
    test('intro completa sin scroll y barra en una fila sin solapamientos',async({page,game},testInfo)=>{
      await expect(page.locator('#intro-start')).toBeInViewport({ratio:1});
      await expect(page.locator('#intro-menu')).toHaveCSS('opacity','1');
      const intro=await page.locator('#intro').evaluate(el=>({scroll:el.scrollTop,overflow:el.scrollHeight-el.clientHeight}));
      expect(intro.scroll).toBe(0);expect(intro.overflow).toBeLessThanOrEqual(1);
      const cursor=await page.locator('#boot-body .line:last-child').evaluate(el=>{const s=getComputedStyle(el,'::after');return {content:s.content,color:s.color};});
      expect(cursor.content).toBe('"▌"');expect(cursor.color).toBe('rgb(77, 255, 166)');
      const colors=await page.locator('#boot-body .line').evaluateAll(els=>els.map(el=>getComputedStyle(el).color));
      expect(colors.length).toBe(11);
      await expect(page.locator('#intro-boot-status,.boot-footer')).toHaveCount(0);
      await expect(page.locator('#intro-memory-status')).toBeHidden();
      await expect(page.locator('#boot-body .line').last()).toHaveText('señal adquirida ......... ENLACE DISPONIBLE');
      await expect(page.locator('#boot-body')).toContainText('canal de datos');
      await expect(page.locator('#boot-body')).not.toContainText('alcantarilla');
      expect(colors.filter(color=>color==='rgb(77, 255, 166)').length).toBeGreaterThan(colors.length/2);
      for(const color of colors)expect(['rgb(77, 255, 166)','rgb(67, 223, 146)']).toContain(color);
      await page.screenshot({path:testInfo.outputPath('intro-tablet.png')});
      await game.setup({immersion:makeImmersion(),state:{offers:[]}}, {touch:true});
      await page.evaluate(()=>{S.player.cpu=20;S.player.heat=80;inImmersion.dataUsed=ramCap();updateTopbar();});
      const layout=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
        return {logo:rect('#topbar > .seg'),chips:['#cpu-indicator','#heat-indicator','#ram-indicator','#h-lvl'].map(rect),controls:rect('.quick-controls'),width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};
      });
      expect(layout.scroll).toBeLessThanOrEqual(layout.width);
      for(const chip of layout.chips){
        expect(chip.x).toBeGreaterThanOrEqual(layout.logo.right);
        expect(chip.right).toBeLessThanOrEqual(layout.controls.x);
        expect(chip.y).toBeLessThan(layout.logo.bottom);expect(chip.bottom).toBeGreaterThan(layout.logo.y);
      }
      const chips=layout.chips.slice(0,3);
      for(let i=1;i<chips.length;i++)expect(chips[i].x).toBeGreaterThanOrEqual(chips[i-1].right);
      await page.screenshot({path:testInfo.outputPath('bar-tablet.png')});
    });
  });
}

test('indicadores: fondos y halos comunes, etiquetas verdes y señales conservadas con efectos OFF',async({page,game},testInfo)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await game.setup({immersion:makeImmersion(),state:{offers:[]}});
  async function arrange(cpu,heat,used){await page.evaluate(({cpu,heat,used})=>{S.player.cpu=cpu;S.player.heat=heat;inImmersion.dataUsed=used;updateTopbar();},{cpu,heat,used});}
  async function check(id,state,background){
    const chip=page.locator('#'+id);
    await expect(chip).toHaveAttribute('data-state',state);
    await expect(chip).toHaveCSS('background-color',background);
    await expect(chip.locator('.deck-label')).toHaveCSS('color','rgb(77, 255, 166)');
    await expect(chip).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');
    const shadow=await chip.evaluate(el=>getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');expect(shadow).not.toContain('inset');
  }
  await arrange(100,0,0);
  for(const id of ['cpu-indicator','heat-indicator','ram-indicator']){
    const chip=page.locator('#'+id);
    await expect(chip).toHaveAttribute('data-state','normal');
    await expect(chip).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    await expect(chip).toHaveCSS('box-shadow','none');
    await expect(chip.locator('.deck-label')).toHaveCSS('color','rgb(77, 255, 166)');
  }
  await arrange(40,40,5);
  for(const id of ['cpu-indicator','heat-indicator','ram-indicator'])await check(id,'warning','rgba(255, 196, 77, 0.22)');
  await arrange(40,71,5);
  await check('heat-indicator','danger','rgba(255, 93, 106, 0.28)');
  await arrange(20,80,6);
  await check('cpu-indicator','critical','rgba(255, 93, 106, 0.28)');
  await check('heat-indicator','critical','rgba(255, 93, 106, 0.28)');
  await check('ram-indicator','full','rgba(77, 216, 255, 0.22)');
  await page.locator('#h-controls').tap();
  for(const key of ['animations','glow','crt'])await page.locator(`#controls-overlay [data-pref="${key}"]`).tap();
  await page.keyboard.press('Escape');
  for(const id of ['cpu-indicator','heat-indicator','ram-indicator']){
    const chip=page.locator('#'+id);
    await expect(chip).toHaveCSS('animation-name','none');await expect(chip).toHaveCSS('box-shadow','none');
    await expect(chip.locator('.deck-label')).toHaveCSS('color','rgb(77, 255, 166)');
    await expect(chip).toHaveCSS('background-color',id==='ram-indicator'?'rgba(77, 216, 255, 0.22)':'rgba(255, 93, 106, 0.28)');
  }
  await expect(page.locator('#ram-indicator .deck-mark')).toHaveText('LLENA');
  await page.screenshot({path:testInfo.outputPath('indicators-effects-off.png')});
});
