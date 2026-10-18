/* F04: estructura, tamaño y limpieza; el layout CSS real se verifica en Edge. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const hudKey='cypher_os_grid_hud_v1';
function toggleHud(g,id,open){
  const el=g.sb.document.getElementById(id);
  if(open)el.setAttribute('open','');else el.removeAttribute('open');
  g.emitElement(el,'toggle');
}
const clone=value=>JSON.parse(JSON.stringify(value));
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();__invoiceResolvedFixture();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();');
      await fn(g);passes++;console.log('  ✔ '+label);
    } catch(error) {fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally {g.dispose();}
  }
  console.log('\nGRID / LAYOUT · área navegable, tamaño y limpieza…');
  await check('canvas y tooltip comparten mapa; HUD superpuesto cerrado de fabrica con foco y estado accesibles',g=>{
    g.run('startImmersion(4);');const d=g.sb.document;
    const canvas=d.getElementById('gridcanvas'),stage=d.getElementById('grid-stage'),hud=d.getElementById('grid-overlay');
    assert.ok(stage);assert.equal(canvas.parentNode.id,'grid-map');
    assert.equal(canvas.parentNode.parentNode,stage);
    assert.equal(d.getElementById('grid-tooltip').parentNode,canvas.parentNode);
    assert.equal(hud.parentNode,stage);assert.ok(stage.contains(hud));
    assert.equal(hud.hasAttribute('hidden'),true);
    const toggle=d.getElementById('grid-controls-toggle'),before=clone(g.run('inImmersion'));
    assert.equal(toggle.getAttribute('aria-expanded'),'false');
    clickAction(g,'toggleGridControls');assert.equal(hud.hasAttribute('hidden'),false);
    assert.equal(toggle.getAttribute('aria-expanded'),'true');
    assert.equal(d.activeElement.getAttribute('data-action'),'doSuperficie');
    g.emitElement(stage,'keydown',{key:'Escape'});
    assert.equal(hud.hasAttribute('hidden'),true);assert.equal(d.activeElement,toggle);
    assert.deepEqual(clone(g.run('inImmersion')),before);
    assert.ok(hud.querySelector('[data-action="doSuperficie"]'));
    const info=d.getElementById('grid-info'),actions=d.getElementById('grid-actions');
    const body=hud.querySelector('.grid-overlay-body');
    assert.ok(body);assert.ok(body.parentNode===hud,'cuerpo desplazable dentro del marco fijo');
    assert.ok(info.parentNode===body,'información dentro del cuerpo desplazable');
    assert.ok(actions.parentNode===body,'acciones dentro del cuerpo desplazable');
    assert.ok(!info.contains(actions),'controles críticos fuera de la información desplazable');
    assert.ok(info.contains(d.getElementById('grid-jobs')));assert.ok(info.contains(d.getElementById('grid-exploration')));
    assert.ok(!info.contains(d.getElementById('adjlist')));assert.ok(!info.contains(d.getElementById('grid-current')));
    assert.equal(d.getElementById('grid-jobs').hasAttribute('open'),true);assert.equal(d.getElementById('grid-exploration').hasAttribute('open'),true);
    assert.ok(!/CALOR|DATOS|CPU/.test(d.getElementById('gridhud').textContent));
  });
  await check('resize usa solo el espacio reservado y mantiene 960×540 sin cambiar el grafo',g=>{
    g.run('startImmersion(4);');const stage=g.sb.document.getElementById('grid-stage'),canvas=g.sb.document.getElementById('gridcanvas');
    const expected=clone(g.run('inImmersion')),player=clone(g.run('S.player'));
    for(const [w,h] of [[1000,500],[300,800],[700,120],[80,40],[250,0]]) {
      stage.clientWidth=w;stage.clientHeight=h;g.run('resizeGridCanvas();');
      assert.equal(canvas.width,960);assert.equal(canvas.height,540);
      if(h) {
        const width=parseFloat(canvas.style.width),height=parseFloat(canvas.style.height);
        assert.ok(width<=w+0.01&&height<=h+0.01);assert.ok(Math.abs(width/height-960/540)<0.001);
      }
      assert.deepEqual(clone(g.run('inImmersion')),expected);assert.deepEqual(clone(g.run('S.player')),player);
    }
  });
  await check('refrescar HUD no reinicia bitmap, canvas ni controles bajo el dedo',g=>{
    g.run('startImmersion(4);');const stage=g.sb.document.getElementById('grid-stage'),canvas=g.sb.document.getElementById('gridcanvas');
    stage.clientWidth=1000;stage.clientHeight=500;g.run('resizeGridCanvas();');
    let writes=0,w=canvas.width,h=canvas.height;
    Object.defineProperty(canvas,'width',{get:()=>w,set:v=>{w=v;writes++;},configurable:true});
    Object.defineProperty(canvas,'height',{get:()=>h,set:v=>{h=v;writes++;},configurable:true});
    const neighbor=g.sb.document.querySelector('#adjlist .adj-node');
    g.run('updateGridHud();gameLoop();renderGridHud();resizeGridCanvas();');
    assert.equal(writes,0);assert.equal(g.sb.document.getElementById('gridcanvas'),canvas);
    assert.equal(g.sb.document.querySelector('#adjlist .adj-node'),neighbor);
  });
  await check('ResizeObserver se desconecta al abandonar RED, también sin inmersión',g=>{
    const observers=[];
    g.sb.ResizeObserver=function(callback){this.callback=callback;this.observe=node=>{this.node=node;};this.disconnect=()=>{this.stopped=true;};observers.push(this);};
    g.run('startImmersion(4);');assert.equal(observers.length,1);
    const observer=observers[0],stage=g.sb.document.getElementById('grid-stage');
    assert.equal(observer.node,stage);stage.clientWidth=900;stage.clientHeight=300;observer.callback();
    assert.equal(parseFloat(g.sb.document.getElementById('gridcanvas').style.height),300);
    g.run('showView("inicio");');assert.equal(observer.stopped,true);assert.equal(g.run('canvas'),null);
    observer.callback();assert.equal(g.run('canvas'),null);
    g.run('inImmersion=null;showView("red");');assert.equal(observers.length,2);
    assert.equal(g.run('gridRender'),false);g.run('showView("trabajos");');assert.equal(observers[1].stopped,true);
  });
  await check('sin ResizeObserver, toggle y actualización del HUD reajustan el canvas',g=>{
    g.run('startImmersion(4);');const stage=g.sb.document.getElementById('grid-stage'),canvas=g.sb.document.getElementById('gridcanvas');
    stage.clientWidth=900;stage.clientHeight=250;g.emitElement('grid-jobs','toggle');
    assert.equal(parseFloat(canvas.style.height),250);
    stage.clientHeight=350;g.run('updateGridHud();');assert.equal(parseFloat(canvas.style.height),350);
  });
  await check('el punto de entrada conserva coordenadas lógicas tras mover y escalar el canvas',g=>{
    g.run('startImmersion(4);');const canvas=g.sb.document.getElementById('gridcanvas');
    canvas.__rect={left:120,top:180,width:640,height:360};
    const point=g.run('gridToLogical(440,510)');
    assert.equal(point.x,480);assert.equal(point.y,495);
    canvas.__rect={left:70,top:90,width:320,height:180};
    const smaller=g.run('gridToLogical(230,255)');
    assert.equal(smaller.x,480);assert.equal(smaller.y,495);
  });
  await check('el mapa usa todo el presupuesto 16:9, sin depender de controles, trabajos ni detalles',g=>{
    g.run('startImmersion(4);');const stage=g.sb.document.getElementById('grid-stage'),canvas=g.sb.document.getElementById('gridcanvas');
    for(const [width,height] of [[1400,600],[450,900],[560,220],[240,460]]) {
      stage.clientWidth=width;stage.clientHeight=height;g.run('resizeGridCanvas();');
      const canvasWidth=canvas.style.width,canvasHeight=canvas.style.height;
      assert.equal(parseFloat(canvasWidth),Math.min(width,height*960/540));
      const before=clone(g.run('inImmersion'));
      clickAction(g,'toggleGridControls');
      g.sb.document.getElementById('grid-jobs').setAttribute('open','');
      g.sb.document.getElementById('grid-exploration').setAttribute('open','');
      g.run('updateGridHud();resizeGridCanvas();');
      assert.equal(canvas.style.height,canvasHeight);assert.equal(canvas.style.width,canvasWidth);
      assert.deepEqual(clone(g.run('inImmersion')),before);
    }
  });
  await check('indicadores del deck usan umbrales reales, CPU relativa y RAM llena sin alarma de daño',g=>{
    const d=g.sb.document;
    const noMarks=()=>{
      for(const id of ['cpu-indicator','heat-indicator','ram-indicator']){
        const el=d.getElementById(id);
        assert.equal(el.querySelector('.deck-mark'),null,'sin insignias');
        assert.ok(!/[!‼]/.test(el.textContent),'sin signos de admiración en '+id);
      }
    };
    for(const [cpu,heat,cpuState,heatState] of [[81,39,'normal','normal'],[80,40,'warning','warning'],[40,70,'critical','warning'],[39,70.1,'critical','danger'],[200,80,'normal','critical']]) {
      g.sb.__cpu=cpu;g.sb.__heat=heat;
      g.run('S.player.maxCpu=200;S.player.cpu=window.__cpu;S.player.heat=window.__heat;updateTopbar();');
      assert.equal(d.getElementById('cpu-indicator').getAttribute('data-state'),cpuState);
      assert.equal(d.getElementById('heat-indicator').getAttribute('data-state'),heatState);
      noMarks();
    }
    g.run('startImmersion(4);inImmersion.dataUsed=ramCap()-1;updateTopbar();');
    assert.equal(d.getElementById('ram-indicator').getAttribute('data-state'),'warning');noMarks();
    g.run('inImmersion.dataUsed=ramCap();updateTopbar();');
    const ram=d.getElementById('ram-indicator');
    assert.equal(ram.getAttribute('data-state'),'full');assert.match(ram.getAttribute('aria-label'),/llena/);noMarks();
    g.run('inImmersion.dataUsed=0;S.player.cpu=200;S.player.heat=0;updateTopbar();');
    for(const id of ['cpu-indicator','heat-indicator','ram-indicator']) {
      assert.equal(d.getElementById(id).getAttribute('data-state'),'normal');
    }
    noMarks();
  });
  await check('preferencia del HUD valida ambos booleanos y usa abierto ante clave dañada/storage bloqueado',()=>{
    const defaults={explorationOpen:true,jobsOpen:true};
    const cases=[...[[true,true],[true,false],[false,true],[false,false]].map(([explorationOpen,jobsOpen])=>{
      const prefs={explorationOpen,jobsOpen};return [JSON.stringify(prefs),prefs];
    }),...['{','null','[]','true','{}','{"explorationOpen":false}','{"explorationOpen":"false","jobsOpen":true}','{"explorationOpen":false,"jobsOpen":0}'].map(raw=>[raw,defaults])];
    for(const [raw,expected] of cases){
      const sample=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',storage:{initial:{[hudKey]:raw}}});
      try{assert.deepEqual(clone(sample.run('_gridHudPrefs')),expected);assert.equal(sample.sb.localStorage.getItem(hudKey),raw);}
      finally{sample.dispose();}
    }
    const sample=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',storage:{fail:{getItem:true}}});
    try{assert.deepEqual(clone(sample.run('_gridHudPrefs')),defaults);}finally{sample.dispose();}
  });
  await check('toggle conserva elecciones independientes sin alterar partida, canvas o vecinos y no escribe al abrir de fábrica',g=>{
    g.run('startImmersion(4);');const d=g.sb.document,canvas=d.getElementById('gridcanvas'),neighbor=d.querySelector('.adj-node');
    const before=clone(g.run('S')),inm=clone(g.run('inImmersion'));
    g.emitElement('grid-exploration','toggle');g.emitElement('grid-jobs','toggle');assert.equal(g.sb.localStorage.getItem(hudKey),null);
    for(const [explorationOpen,jobsOpen] of [[false,true],[false,false],[true,false],[true,true]]){
      toggleHud(g,'grid-exploration',explorationOpen);toggleHud(g,'grid-jobs',jobsOpen);
      assert.deepEqual(JSON.parse(g.sb.localStorage.getItem(hudKey)),{explorationOpen,jobsOpen});
      g.run('updateGridHud();renderGridHud();');
      assert.equal(d.getElementById('gridcanvas'),canvas);assert.equal(d.querySelector('.adj-node'),neighbor);
      assert.deepEqual(clone(g.run('S')),before);assert.deepEqual(clone(g.run('inImmersion')),inm);
    }
  });
  await check('storage de escritura bloqueado conserva HUD en memoria al salir y volver a RED',g=>{
    g.run('startImmersion(4);');g.sb.localStorage.fail.setItem=true;
    toggleHud(g,'grid-exploration',false);toggleHud(g,'grid-jobs',false);
    assert.deepEqual(clone(g.run('_gridHudPrefs')),{explorationOpen:false,jobsOpen:false});
    g.run('showView("inicio");showView("red");');
    for(const id of ['grid-exploration','grid-jobs'])assert.equal(g.sb.document.getElementById(id).hasAttribute('open'),false);
  });
  await check('salir antes del toggle pendiente captura el HUD y callbacks de elementos retirados no pisan preferencias',g=>{
    g.run('startImmersion(4);');const old=g.sb.document.getElementById('grid-exploration');
    old.removeAttribute('open');g.run('showView("inicio");showView("red");');
    assert.equal(g.sb.document.getElementById('grid-exploration').hasAttribute('open'),false);
    const raw=g.sb.localStorage.getItem(hudKey);old.setAttribute('open','');g.emitElement(old,'toggle');
    assert.equal(g.sb.localStorage.getItem(hudKey),raw);
    assert.deepEqual(clone(g.run('_gridHudPrefs')),{explorationOpen:false,jobsOpen:true});
  });
  await check('guardado/importación y nuevo registro no heredan ni reinician preferencias del HUD',g=>{
    g.run('startImmersion(4);');toggleHud(g,'grid-exploration',false);toggleHud(g,'grid-jobs',false);g.run('save();');
    assert.ok(!Object.prototype.hasOwnProperty.call(g.saved(),'gridHudPrefs'));
    assert.ok(!Object.prototype.hasOwnProperty.call(g.saved()._inImmersion,'gridHudPrefs'));
    const candidate=clone(g.saved());candidate.gridHudPrefs={explorationOpen:true,jobsOpen:true};g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.deepEqual(clone(g.run('_gridHudPrefs')),{explorationOpen:false,jobsOpen:false});
    g.run('resetDeckPrefs();restoreImmersion(null);showView("inicio");');
    clickAction(g,'newRecord');clickAction(g,'confirmYes');g.run('ACTIONS.storySkip();finishIntroBoot();ACTIONS.storyRecover();__invoiceResolvedFixture();startImmersion(4);');
    for(const id of ['grid-exploration','grid-jobs'])assert.equal(g.sb.document.getElementById(id).hasAttribute('open'),false);
    assert.deepEqual(JSON.parse(g.sb.localStorage.getItem(hudKey)),{explorationOpen:false,jobsOpen:false});
  });
  console.log(`Grid/layout: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
