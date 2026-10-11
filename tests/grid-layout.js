/* F04: estructura, tamaño y limpieza; el layout CSS real se verifica en Edge. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();');
      await fn(g);passes++;console.log('  ✔ '+label);
    } catch(error) {fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally {g.dispose();}
  }
  console.log('\nGRID / LAYOUT · área navegable, tamaño y limpieza…');
  await check('canvas y tooltip comparten mapa; HUD y controles quedan fuera del área navegable',g=>{
    g.run('startImmersion(4);');const d=g.sb.document;
    const canvas=d.getElementById('gridcanvas'),stage=d.getElementById('grid-stage'),hud=d.getElementById('grid-overlay');
    assert.ok(stage);assert.equal(canvas.parentNode.id,'grid-map');
    assert.equal(canvas.parentNode.parentNode,stage);
    assert.equal(d.getElementById('grid-tooltip').parentNode,canvas.parentNode);
    assert.equal(hud.parentNode.id,'gridwrap');assert.ok(!stage.contains(hud));
    assert.ok(hud.querySelector('[data-action="doSuperficie"]'));
    const info=d.getElementById('grid-info'),actions=d.getElementById('grid-actions');
    assert.equal(info.parentNode,hud);assert.equal(actions.parentNode,hud);
    assert.ok(!info.contains(actions),'controles críticos fuera de la información desplazable');
    assert.ok(info.contains(d.getElementById('grid-jobs')));assert.ok(info.contains(d.getElementById('grid-exploration')));
    assert.ok(!info.contains(d.getElementById('adjlist')));assert.ok(!info.contains(d.getElementById('grid-current')));
    assert.equal(d.getElementById('grid-jobs').hasAttribute('open'),false);assert.equal(d.getElementById('grid-exploration').hasAttribute('open'),false);
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
  await check('el presupuesto geométrico elige el mapa mayor, sin depender de trabajos ni detalles',g=>{
    g.run('startImmersion(4);');const wrap=g.sb.document.getElementById('gridwrap');
    for(const [w,h,font,side] of [[1400,600,16,true],[450,900,16,false],[560,220,24,true],[240,460,16,false]]) {
      g.sb.__w=w;g.sb.__h=h;g.sb.__font=font;
      const m=g.run('gridLayoutMetrics(window.__w,window.__h,window.__font,8,true,false)');
      assert.equal(m.side,side);assert.ok((side?m.sideScale:m.bottomScale)>0);
      wrap.clientWidth=w;wrap.clientHeight=h;wrap.style.fontSize=font+'px';g.run('layoutGrid();');
      assert.equal(wrap.classList.contains('grid-side'),side);
      const height=wrap.style.getPropertyValue('--grid-hud-height'),width=wrap.style.getPropertyValue('--grid-hud-width');
      const before=clone(g.run('inImmersion'));
      g.sb.document.getElementById('grid-jobs').setAttribute('open','');
      g.sb.document.getElementById('grid-exploration').setAttribute('open','');
      g.run('updateGridHud();layoutGrid();');
      assert.equal(wrap.style.getPropertyValue('--grid-hud-height'),height);assert.equal(wrap.style.getPropertyValue('--grid-hud-width'),width);
      assert.deepEqual(clone(g.run('inImmersion')),before);
    }
    const idle=g.run('gridLayoutMetrics(1400,600,16,8,false,false)');assert.equal(idle.side,false);assert.equal(idle.hudHeight,56);
    const near=g.run('gridLayoutMetrics(1000,500,16,8,true,true)');
    if(near.side) assert.ok(near.sideScale>=near.bottomScale*.98);
  });
  await check('indicadores del deck usan umbrales reales, CPU relativa y RAM llena sin alarma de daño',g=>{
    const d=g.sb.document;
    for(const [cpu,heat,cpuState,heatState] of [[81,39,'normal','normal'],[80,40,'warning','warning'],[40,70,'critical','warning'],[39,70.1,'critical','danger'],[200,80,'normal','critical']]) {
      g.sb.__cpu=cpu;g.sb.__heat=heat;
      g.run('S.player.maxCpu=200;S.player.cpu=window.__cpu;S.player.heat=window.__heat;updateTopbar();');
      assert.equal(d.getElementById('cpu-indicator').getAttribute('data-state'),cpuState);
      assert.equal(d.getElementById('heat-indicator').getAttribute('data-state'),heatState);
      assert.equal(d.getElementById('heat-indicator').querySelector('.deck-mark'),null);
      assert.ok(!/[!‼]/.test(d.getElementById('heat-indicator').textContent));
    }
    g.run('startImmersion(4);inImmersion.dataUsed=ramCap()-1;updateTopbar();');
    assert.equal(d.getElementById('ram-indicator').getAttribute('data-state'),'warning');
    g.run('inImmersion.dataUsed=ramCap();updateTopbar();');
    const ram=d.getElementById('ram-indicator');
    assert.equal(ram.getAttribute('data-state'),'full');assert.match(ram.getAttribute('aria-label'),/llena/);
    assert.equal(ram.querySelector('.deck-mark').textContent,'LLENA');
    g.run('inImmersion.dataUsed=0;S.player.cpu=200;S.player.heat=0;updateTopbar();');
    for(const id of ['cpu-indicator','heat-indicator','ram-indicator']) {
      assert.equal(d.getElementById(id).getAttribute('data-state'),'normal');
      const badge=d.getElementById(id).querySelector('.deck-mark');
      if(id==='heat-indicator')assert.equal(badge,null);
      else assert.equal(badge.textContent,'');
    }
  });
  console.log(`Grid/layout: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
