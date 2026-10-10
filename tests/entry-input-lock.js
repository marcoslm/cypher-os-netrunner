/* Reporte F-01: intro/BIOS bloquean gameplay y conservan controles de dispositivo. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=v=>JSON.parse(JSON.stringify(v));
async function run(options={}){
 let passes=0,fails=0;
 async function check(label,fn){
  const g=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',seed:2093});
  try{await fn(g);passes++;console.log('  ✔ '+label);}
  catch(e){fails++;console.log('  ✖ '+label+': '+e.stack);}
  finally{g.dispose();}
 }
 function live(g){g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();document.getElementById("intro").style.display="none";');}
 function returnIntro(g){clickAction(g,'backToIntro');clickAction(g,'confirmYes');}
 function keys(g,target){for(const key of ['g','k','1','2','3','4','5','6','7','8','9'])assert.equal(g.emitElement(target,'keydown',{key,ctrlKey:true}).defaultPrevented,true,key);}
 function clocks(g){return g.list().filter(t=>t.type==='interval'&&t.ms===1000);}
 console.log('\nENTRADA · bloqueo de intro y BIOS…');
 await check('intro inicial consume atajos sin crear S, red ni errores',g=>{
  assert.equal(g.run('entryMode()'),'intro');assert.equal(g.run('gameInputLayer().id'),'intro');
  assert.equal(g.sb.document.getElementById('os').inert,true);
  keys(g,'intro-start');assert.equal(g.run('S'),null);assert.equal(g.run('inImmersion'),null);
  assert.equal(g.emitElement('intro-start','keydown',{key:'s',ctrlKey:true}).defaultPrevented,true);
  assert.equal(g.run('_bootStarted'),false);
 });
 await check('regresar deja fondo inerte, atajos bloqueados y Ctrl+S disponible',g=>{
  live(g);g.run('S.player.credits=4321;');returnIntro(g);
  const before=clone(g.run('S'));keys(g,'intro-start');
  assert.equal(g.run('entryMode()'),'intro');assert.equal(g.run('livingInteraction()'),false);
  assert.equal(g.sb.document.getElementById('os').inert,true);
  assert.equal(g.run('inImmersion'),null);assert.equal(g.run('gridRender'),false);
  assert.deepEqual(clone(g.run('S')),before);assert.equal(clocks(g).length,0);
  g.emitElement('intro-start','keydown',{key:'s',ctrlKey:true});assert.equal(g.saved().player.credits,4321);
 });
 await check('rutas de navegación, comandos y acciones rechazan gameplay detrás de intro',g=>{
  live(g);returnIntro(g);const before=clone(g.run('S')),view=g.run('currentView');
  g.run('showView("estado");executeCommand("dip");ACTIONS.dipGrid();');
  clickAction(g,'streetActivity',{'data-act':'0'});
  assert.equal(g.run('currentView'),view);assert.equal(g.run('inImmersion'),null);
  assert.deepEqual(clone(g.run('S')),before);
 });
 await check('panel de control en intro restaura foco sin habilitar el fondo',g=>{
  live(g);returnIntro(g);
  const b=g.sb.document.querySelector('#intro [data-action="openControls"]');b.focus();g.emitElement(b,'click');
  assert.equal(g.run('controlPanelOpen()'),true);assert.equal(g.run('gameInputLayer().id'),'controls-overlay');
  g.run('closeControlPanel();');assert.equal(g.sb.document.activeElement,b);
  assert.equal(g.run('gameInputLayer().id'),'intro');assert.equal(g.sb.document.getElementById('os').inert,true);
 });
 await check('BIOS ignora atajos Ctrl, guarda y termina solo al saltar con tecla normal',g=>{
  live(g);returnIntro(g);g.emitElement('intro-start','click');g.advance(600);
  assert.equal(g.run('entryMode()'),'boot');assert.equal(g.run('gameInputLayer().id'),'boot');
  keys(g,'boot');g.emitElement('boot','keydown',{key:'s',ctrlKey:true});
  assert.equal(g.run('entryMode()'),'boot');assert.equal(g.run('inImmersion'),null);
  g.run('openControlPanel();');assert.equal(g.run('controlPanelOpen()'),false);
  g.emitElement('boot','keydown',{key:'Enter'});g.advance(520);
  assert.equal(g.run('entryMode()'),null);assert.equal(g.sb.document.getElementById('os').inert,false);
  assert.equal(clocks(g).length,1);
 });
 await check('dos ciclos de retorno/arranque liberan foco y conservan un único reloj',g=>{
  live(g);
  for(let i=0;i<2;i++){
   returnIntro(g);assert.equal(clocks(g).length,0);
   g.emitElement('intro-start','click');g.advance(600);g.emitElement('boot','keydown',{key:'Enter'});g.advance(520);
   assert.equal(g.run('entryMode()'),null);assert.equal(clocks(g).length,1);
   assert.equal(g.sb.document.getElementById('os').inert,false);
  }
  g.run('ACTIONS.dipGrid();');assert.ok(g.run('inImmersion'));
 });
 console.log(`Entrada/bloqueo: ${passes} correctas · ${fails} fallos`);
 return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(f=>{process.exitCode=f?1:0;},e=>{console.error(e);process.exitCode=1;});
module.exports={run};
