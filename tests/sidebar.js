/* F05B: lateral ocultable, preferencia de dispositivo y guardias. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
const key='cypher_os_layout_v1';
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
  console.log('\nLATERAL · preferencia local, foco y reflow…');
  await check('fábrica muestra lateral y botón con nombre/estado accesibles',g=>{
    assert.equal(g.run('_sidebarCollapsed'),false);
    const button=g.sb.document.getElementById('h-sidebar');assert.ok(button);
    assert.equal(button.getAttribute('aria-controls'),'sidebar');assert.equal(button.getAttribute('aria-expanded'),'true');
    assert.equal(button.getAttribute('aria-label'),'Ocultar menú lateral');
    assert.equal(g.sb.document.documentElement.classList.contains('sidebar-collapsed'),false);
  });
  await check('solo acepta booleanos de la clave local, con JSON/storage corruptos tolerados',()=>{
    for(const [value,expected] of [[{sidebarCollapsed:true},true],[{sidebarCollapsed:false},false],
      [{sidebarCollapsed:'true'},false],[{sidebarCollapsed:1},false],[null,false],[true,false],[[],false],[{},false]]) {
      const sample=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',storage:{initial:{[key]:JSON.stringify(value)}}});
      try {assert.equal(sample.run('_sidebarCollapsed'),expected);}
      finally {sample.dispose();}
    }
    for(const storage of [{initial:{[key]:'{'}},{fail:{getItem:true}}]) {
      const sample=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',storage});
      try {assert.equal(sample.run('_sidebarCollapsed'),false);}
      finally {sample.dispose();}
    }
  });
  await check('ocultar/mostrar persiste elección sin tocar jugador, contratos ni red',g=>{
    g.run('startImmersion(4);');const player=clone(g.run('S.player')),jobs=clone(g.run('S.jobs')),inm=clone(g.run('inImmersion'));
    clickAction(g,'toggleSidebar');assert.equal(g.run('_sidebarCollapsed'),true);
    assert.equal(g.sb.document.documentElement.classList.contains('sidebar-collapsed'),true);
    assert.equal(JSON.parse(g.sb.localStorage.getItem(key)).sidebarCollapsed,true);
    assert.equal(g.sb.document.getElementById('h-sidebar').getAttribute('aria-label'),'Mostrar menú lateral');
    clickAction(g,'toggleSidebar');assert.equal(g.run('_sidebarCollapsed'),false);
    assert.deepEqual(clone(g.run('S.player')),player);assert.deepEqual(clone(g.run('S.jobs')),jobs);
    assert.deepEqual(clone(g.run('inImmersion')),inm);
  });
  await check('no deja foco en un control del lateral oculto',g=>{
    const button=g.sb.document.querySelector('.navbtn[data-view="red"]');button.focus();
    g.run('setSidebarCollapsed(true);');
    assert.equal(g.sb.document.activeElement,g.sb.document.getElementById('h-sidebar'));
    assert.equal(g.sb.document.getElementById('h-sidebar').getAttribute('aria-expanded'),'false');
  });
  await check('fallo de escritura conserva elección funcional en memoria',g=>{
    g.sb.localStorage.fail.setItem=true;
    assert.doesNotThrow(()=>clickAction(g,'toggleSidebar'));
    assert.equal(g.run('_sidebarCollapsed'),true);
    assert.equal(g.sb.document.getElementById('h-sidebar').getAttribute('aria-expanded'),'false');
    clickAction(g,'toggleSidebar');assert.equal(g.run('_sidebarCollapsed'),false);
  });
  await check('importar y nuevo registro no heredan layout del archivo ni reinician la preferencia',g=>{
    clickAction(g,'toggleSidebar');g.run('save();');const candidate=clone(g.saved());
    candidate.sidebarCollapsed=false;candidate.layout={sidebarCollapsed:false};g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.equal(g.run('_sidebarCollapsed'),true);
    clickAction(g,'newRecord');clickAction(g,'confirmYes');
    assert.equal(g.run('_sidebarCollapsed'),true);assert.equal(JSON.parse(g.sb.localStorage.getItem(key)).sidebarCollapsed,true);
    assert.equal(g.run('S.player.credits'),500);
  });
  await check('combate, modal y FLATLINE bloquean el toggle pero conservan Ctrl+S',g=>{
    g.run('startImmersion(4);startCombat({node:{type:"ice",tier:1,name:"TEST"},onWin:onNodeDefeated});');
    clickAction(g,'toggleSidebar');assert.equal(g.run('_sidebarCollapsed'),false);
    g.emitDocument('keydown',{key:'s',ctrlKey:true});assert.ok(g.saved()._inImmersion);
    g.run('cancelActiveCombat();confirmModal({title:"TEST",body:"TEST",yes:"SÍ",no:"NO",onYes:function(){S.player.credits+=1;}});');
    clickAction(g,'toggleSidebar');assert.equal(g.run('_sidebarCollapsed'),false);clickAction(g,'confirmNo');
    g.run('S.player.cpu=0;showFlatline();');clickAction(g,'toggleSidebar');assert.equal(g.run('_sidebarCollapsed'),false);
  });
  await check('reset de audio/display y exportar no incluyen ni cambian el layout de dispositivo',g=>{
    clickAction(g,'toggleSidebar');g.run('resetDeckPrefs();save();');
    assert.equal(g.run('_sidebarCollapsed'),true);
    assert.equal(Object.prototype.hasOwnProperty.call(g.saved(),'sidebarCollapsed'),false);
    assert.equal(Object.prototype.hasOwnProperty.call(g.saved(),'layout'),false);
  });
  console.log(`Lateral: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
