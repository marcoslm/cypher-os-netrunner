'use strict';
const {test,expect,makeImmersion,solveCodeCombat,downloadJSON}=require('./fixtures');
test.use({hasTouch:true});
function job(type) {
  const field={recoleta:'gathered',carrera:'deepGathered',rompehielas:'iceT2'}[type];
  return {id:type,title:'CONTRATO '+type+' DE PRUEBA',desc:type,type,n:1,contact:'doctorSudario',
    risk:'med',reward:100,xp:10,done:false,failed:false,prog:{[field]:0}};
}
function lowerImmersion() {
  const inm=makeImmersion();
  const lower={id:'1_low',layer:1,x:350,y:495,type:'data',name:'DATOS INFERIORES',data:75,
    tier:0,tierName:'',done:false,_done:false,_used:false};
  inm.grid.nodes.push(lower);inm.grid.byLayer[1].push(lower);
  inm.grid.adj[inm.grid.entry].push(lower.id);inm.grid.adj[lower.id]=[inm.grid.entry];
  return inm;
}
const scenarios=[
  {width:1280,height:900,jobs:0,label:'escritorio sin contratos'},
  {width:1024,height:600,jobs:3,label:'tablet horizontal'},
  {width:768,height:1024,jobs:3,label:'tablet vertical'},
  {width:375,height:700,jobs:3,label:'táctil estrecho',touch:true},
  {width:1024,height:600,jobs:3,label:'textos ampliados',font:24},
  {width:853,height:400,jobs:3,label:'viewport equivalente a zoom 150%',font:20},
  {width:640,height:360,jobs:3,label:'ventana baja',font:24}
];
async function assertLayout(page) {
  // ResizeObserver y toggle se notifican tras el cambio de layout, antes de pintar.
  // Esperar al reflow real sin llamar al resizer ni sustituir callbacks del juego.
  await expect.poll(()=>page.locator('#gridcanvas').evaluate(el=>{
    const c=el.getBoundingClientRect(),s=document.getElementById('grid-stage').getBoundingClientRect();
    return c.y>=s.y-1&&c.bottom<=s.bottom+1&&c.x>=s.x-1&&c.right<=s.right+1;
  })).toBe(true);
  const boxes=await page.locator('body').evaluate(()=>{
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const c=rect('gridcanvas'),hud=rect('grid-overlay'),panel=rect('panel-scroll');
    const nodes=inImmersion.grid.nodes.map(n=>({x:c.x+n.x*c.w/960,y:c.y+n.y*c.h/540}));
    const r=document.querySelector('[data-action="doSuperficie"]').getBoundingClientRect();
    const info=document.getElementById('grid-info'),font=parseFloat(getComputedStyle(document.getElementById('gridhud')).fontSize);
    return {c,hud,panel,nodes,infoHeight:info.clientHeight,font,surface:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}};
  });
  expect(boxes.c.w).toBeGreaterThan(0);expect(boxes.c.h).toBeGreaterThan(0);
  expect(boxes.c.w/boxes.c.h).toBeCloseTo(960/540,1);
  expect(boxes.c.bottom).toBeLessThanOrEqual(boxes.hud.y);
  expect(boxes.c.x).toBeGreaterThanOrEqual(boxes.panel.x);
  expect(boxes.c.right).toBeLessThanOrEqual(boxes.panel.right+1);
  expect(boxes.c.y).toBeGreaterThanOrEqual(boxes.panel.y);
  expect(boxes.hud.bottom).toBeLessThanOrEqual(boxes.panel.bottom+1);
  expect(boxes.surface.y).toBeGreaterThanOrEqual(boxes.hud.y);
  expect(boxes.surface.bottom).toBeLessThanOrEqual(boxes.hud.bottom);
  expect(boxes.surface.x).toBeGreaterThanOrEqual(boxes.hud.x);
  expect(boxes.surface.right).toBeLessThanOrEqual(boxes.hud.right);
  expect(boxes.infoHeight).toBeGreaterThanOrEqual(boxes.font*1.15);
  for(const n of boxes.nodes) {
    expect(n.y).toBeLessThan(boxes.hud.y);
    expect(n.x).toBeGreaterThanOrEqual(boxes.panel.x);expect(n.x).toBeLessThanOrEqual(boxes.panel.right);
    expect(n.y).toBeGreaterThanOrEqual(boxes.panel.y);expect(n.y).toBeLessThanOrEqual(boxes.panel.bottom);
  }
}
for(const scenario of scenarios) {
  test(`grid F04: ${scenario.label}, nodos libres y entrada inferior real`,async({page,game})=>{
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await game.setup({immersion:lowerImmersion(),player:{sigilo:20,_gridEventCooldown:10000},
      state:{offers:[],jobs:scenario.jobs?['recoleta','carrera','rompehielas'].map(job):[]}});
    if(scenario.font) {
      // Preferencia de texto simulada, no estilos del mapa ni handlers reemplazados.
      await page.addStyleTag({content:`#gridwrap{font-size:${scenario.font}px;}`});
    }
    const before=await game.snapshot(),canvas=await page.locator('#gridcanvas').elementHandle();
    await assertLayout(page);
    for(const open of [true,false,true]) {
      const isOpen=await page.locator('#grid-jobs').evaluate(el=>el.open);
      if(isOpen!==open) await page.locator('#grid-jobs-summary').click();
      await assertLayout(page);
      expect((await game.snapshot()).immersion).toEqual(before.immersion);
      expect((await game.snapshot()).state.jobs).toEqual(before.state.jobs);
      expect(await canvas.evaluate(el=>el===document.getElementById('gridcanvas'))).toBe(true);
    }
    await page.screenshot({path:`test-results/grid-layout-${scenario.width}-${scenario.font||16}.png`});
    const location=await page.locator('#gridcanvas').evaluate(el=>{
      const r=el.getBoundingClientRect(),n=inImmersion.grid.nodes.find(n=>n.id==='1_low');
      return {x:r.x+n.x*r.width/960,y:r.y+n.y*r.height/540};
    });
    if(scenario.touch)await page.touchscreen.tap(location.x,location.y);
    else await page.mouse.click(location.x,location.y);
    if(await page.locator('#codeInput').isVisible())await solveCodeCombat(page);
    const after=await game.snapshot();expect(after.immersion.current).toBe('1_low');
    expect(after.immersion.grid.nodes.find(n=>n.id==='1_low')).toMatchObject({done:true,_done:true});
    expect(after.immersion.dataUsed).toBe(1);
    // SUPERFICIE sigue accesible incluso si la información auxiliar se desplazó.
    const surface=page.locator('[data-action="doSuperficie"]');
    if(scenario.touch)await surface.tap();else await surface.click();
    if(scenario.jobs) {
      await expect(page.locator('[data-action="cancelSurf"]')).toBeVisible();
      await page.locator('[data-action="cancelSurf"]').click();
      expect((await game.snapshot()).immersion.current).toBe('1_low');
    } else expect((await game.snapshot()).immersion).toBeNull();
  });
}

test('grid F04: redimensionar y cambiar Fullscreen conserva grafo, contratos y tamaño lógico',async({page,game})=>{
  await game.setup({immersion:lowerImmersion(),state:{offers:[],jobs:[job('recoleta')]}});
  const expected=await game.snapshot(),canvas=await page.locator('#gridcanvas').elementHandle();
  for(const viewport of [{width:1024,height:600},{width:768,height:1024},{width:1280,height:900}]) {
    await page.setViewportSize(viewport);await assertLayout(page);
    expect((await game.snapshot()).immersion).toEqual(expected.immersion);
    expect((await game.snapshot()).state.jobs).toEqual(expected.state.jobs);
    expect(await canvas.evaluate(el=>el===document.getElementById('gridcanvas'))).toBe(true);
    expect(await page.locator('#gridcanvas').evaluate(el=>({w:el.width,h:el.height}))).toEqual({w:960,h:540});
  }
  await page.locator('#h-fs').click();await expect(page.locator('#h-fs')).toHaveAttribute('aria-pressed','true');
  await assertLayout(page);await page.locator('#h-fs').click();
  await expect(page.locator('#h-fs')).toHaveAttribute('aria-pressed','false');await assertLayout(page);
  expect((await game.snapshot()).immersion).toEqual(expected.immersion);
  const download=page.waitForEvent('download');await page.locator('#btn-export').click();
  const exported=await downloadJSON(await download);expect(exported._inImmersion).toEqual(expected.immersion);
  await game.importFile(exported,'grid-layout.json');expect((await game.snapshot()).immersion).toEqual(expected.immersion);
  await assertLayout(page);
});
