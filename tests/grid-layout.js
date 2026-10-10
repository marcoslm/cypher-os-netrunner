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
    assert.ok(info.contains(d.getElementById('grid-jobs')));assert.ok(info.contains(d.getElementById('adjlist')));
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
  console.log(`Grid/layout: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
