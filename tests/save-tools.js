/* F05A v2: popover-diálogo de PARTIDA anclado al botón, fuera del lateral. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
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
  console.log('\nPARTIDA / MENÚ · popover-diálogo anclado y operaciones…');
  await check('diálogo oculto y botón nombrado agrupan los cinco ids sin cambiar navegación',g=>{
    const d=g.sb.document,dialog=d.getElementById('save-tools'),toggle=d.getElementById('save-tools-toggle');
    assert.equal(dialog.getAttribute('role'),'dialog');
    assert.equal(dialog.getAttribute('aria-label'),'Opciones de partida');
    assert.equal(dialog.hidden,true);
    assert.equal(toggle.tagName,'BUTTON');assert.equal(toggle.getAttribute('aria-label'),'Opciones de partida');
    assert.equal(toggle.getAttribute('aria-haspopup'),'dialog');
    assert.equal(toggle.getAttribute('aria-controls'),'save-tools');
    assert.equal(toggle.getAttribute('aria-expanded'),'false');
    for(const id of ['btn-save','btn-export','btn-import','btn-reset','btn-intro'])
      assert.equal(d.getElementById(id).parentNode.id,'save-tools-buttons');
    const close=d.getElementById('save-tools-close');
    assert.equal(close.getAttribute('data-action'),'closeSaveTools');
    assert.equal(close.getAttribute('aria-label'),'Cerrar opciones de partida');
    /* Mismo botón de cierre que el panel de control: clase y glifo idénticos. */
    const panelClose=d.querySelector('#controls-overlay .control-close');
    assert.equal(close.className,panelClose.className);
    assert.equal(close.textContent,panelClose.textContent);
    assert.equal(d.getElementById('save-tools-buttons').contains(close),false);
    assert.equal(d.querySelectorAll('.navbtn[data-view]').length,12);
    assert.equal(g.run('VIEW_ORDER[11]'),'archivos');
  });
  await check('PARTIDA abre y cierra el diálogo; el segundo pulso y el ✕ devuelven el foco al botón',g=>{
    const d=g.sb.document,dialog=d.getElementById('save-tools'),toggle=d.getElementById('save-tools-toggle');
    g.emitElement('save-tools-toggle','click');
    assert.equal(dialog.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');
    g.emitElement('save-tools-toggle','click');
    assert.equal(dialog.hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');
    assert.equal(d.activeElement,toggle);
    g.emitElement('save-tools-toggle','click');
    g.emitElement('save-tools-close','click');
    assert.equal(dialog.hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');
    assert.equal(d.activeElement,toggle);
  });
  await check('Escape cierra el diálogo, se consume y deja el foco en PARTIDA',g=>{
    const d=g.sb.document,dialog=d.getElementById('save-tools'),toggle=d.getElementById('save-tools-toggle');
    g.emitElement('save-tools-toggle','click');
    assert.equal(g.emitDocument('keydown',{key:'Escape'}),true);
    assert.equal(dialog.hidden,true);assert.equal(d.activeElement,toggle);
    /* Sin diálogo abierto, Escape sigue llegando al juego sin consumirse aquí. */
    assert.equal(g.emitDocument('keydown',{key:'Escape'}),false);
  });
  await check('un clic fuera cierra el diálogo sin consumirlo: la acción pulsada se ejecuta',g=>{
    const d=g.sb.document,dialog=d.getElementById('save-tools');
    g.emitElement('save-tools-toggle','click');
    const nav=d.querySelector('.navbtn[data-view="registro"]');
    const evt=g.emitElement(nav,'click');
    assert.equal(evt.defaultPrevented,false);
    assert.equal(g.run('currentView'),'registro');
    assert.equal(dialog.hidden,true);
  });
  await check('Ctrl+S guarda con el diálogo cerrado y no lo abre',g=>{
    g.run('S.player.credits=1234;');
    g.emitDocument('keydown',{key:'s',ctrlKey:true});
    assert.equal(g.saved().player.credits,1234);
    assert.equal(g.sb.document.getElementById('save-tools').hidden,true);
    assert.equal(g.sb.document.getElementById('save-tools-toggle').getAttribute('aria-expanded'),'false');
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/partida guardada/);
  });
  await check('activar una opción cierra el diálogo, conserva el snapshot y devuelve el foco',g=>{
    g.run('startImmersion(4);');const expected=clone(g.run('inImmersion'));
    const d=g.sb.document,toggle=d.getElementById('save-tools-toggle');
    g.emitElement('save-tools-toggle','click');
    d.getElementById('btn-save').focus();
    g.emitElement('btn-save','click');assert.deepEqual(g.saved()._inImmersion,expected);
    assert.equal(g.run('saveToolsOpen()'),false);assert.equal(d.activeElement,toggle);
    g.emitElement('save-tools-toggle','click');
    g.emitElement('btn-export','click');const exported=JSON.parse(g.sb.__blobs.at(-1).parts.join(''));
    assert.deepEqual(exported._inImmersion,expected);
    assert.equal(Object.prototype.hasOwnProperty.call(exported,'saveTools'),false);
    assert.equal(g.run('saveToolsOpen()'),false);
    g.emitElement('save-tools-toggle','click');
    g.emitElement('btn-import','click');assert.equal(g.run('saveToolsOpen()'),false);
    g.sb.__candidate=exported;assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.deepEqual(clone(g.run('inImmersion')),expected);
  });
  await check('RESET/IMPORTAR siguen rechazados en combate y no sustituyen sesión ni guardado',g=>{
    g.run('startImmersion(4);startCombat({node:{type:"ice",tier:1,tierName:"T1",name:"TEST"},onWin:onNodeDefeated});save();');
    /* Estado obsoleto: el diálogo quedó abierto y el fondo está inerte. */
    g.run('openSaveTools()');
    const state=g.run('S'),inm=g.run('inImmersion'),raw=g.sb.localStorage.getItem('cypher_os_save_story_v1');
    g.emitElement('btn-reset','click');g.emitElement('btn-import','click');
    assert.equal(g.run('confirmOpen()'),false);assert.equal(g.run('combatActive'),true);
    assert.equal(g.run('S'),state);assert.equal(g.run('inImmersion'),inm);
    assert.equal(g.sb.localStorage.getItem('cypher_os_save_story_v1'),raw);
    /* Congelado bajo una capa activa, una operación rechazada no lo descarta. */
    assert.equal(g.run('saveToolsOpen()'),true);
    assert.equal(g.run('importGameState(nuevoEstado())'),false);
    assert.equal(g.run('S'),state);
  });
  await check('la posición se recoloca dentro del viewport y la traza solo une alineados',g=>{
    const d=g.sb.document,dialog=d.getElementById('save-tools'),toggle=d.getElementById('save-tools-toggle');
    g.emitElement('save-tools-toggle','click');
    /* Caso normal: hay sitio a la derecha y el botón cae dentro del panel. */
    toggle.__rect={left:8,top:600,width:160,height:36};
    dialog.clientWidth=260;dialog.clientHeight=240;
    g.run('positionSaveTools()');
    assert.equal(dialog.style.getPropertyValue('left'),'182px');
    assert.equal(dialog.style.getPropertyValue('top'),'472px');
    assert.equal(dialog.style.getPropertyValue('--link-y'),'146px');
    assert.equal(dialog.classList.contains('save-tools--nolink'),false);
    /* Sin sitio a la derecha: se recoloca dentro del viewport y se omite la traza. */
    toggle.__rect={left:1100,top:100,width:160,height:36};
    dialog.clientWidth=260;dialog.clientHeight=240;
    g.run('positionSaveTools()');
    const left=parseFloat(dialog.style.getPropertyValue('left'));
    const top=parseFloat(dialog.style.getPropertyValue('top'));
    assert.equal(left,1012);assert.equal(top,88);
    assert.equal(dialog.classList.contains('save-tools--nolink'),true);
    assert.ok(left>=8 && left+260<=1280-8,'el diálogo no sale por la derecha');
    assert.ok(top>=8 && top+240<=720-8,'el diálogo no sale por abajo');
  });
  console.log(`Partida/menú: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
