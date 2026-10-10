/* F05A: estructura y handlers conservados; el plegado nativo se verifica en Edge. */
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
  console.log('\nPARTIDA / MENÚ · bloque plegable y operaciones…');
  await check('details cerrado y summary nombrado agrupan los cuatro ids sin cambiar navegación',g=>{
    const d=g.sb.document,group=d.getElementById('save-tools'),toggle=d.getElementById('save-tools-toggle');
    assert.equal(group.tagName,'DETAILS');assert.equal(group.hasAttribute('open'),false);
    assert.equal(toggle.tagName,'SUMMARY');assert.equal(toggle.getAttribute('aria-label'),'Opciones de partida');
    for(const id of ['btn-save','btn-export','btn-import','btn-reset'])assert.equal(d.getElementById(id).parentNode.id,'save-tools-buttons');
    assert.equal(d.querySelectorAll('.navbtn[data-view]').length,11);
  });
  await check('Ctrl+S guarda aun con el grupo cerrado y no cambia su estado',g=>{
    g.run('S.player.credits=1234;');
    g.emitDocument('keydown',{key:'s',ctrlKey:true});
    assert.equal(g.saved().player.credits,1234);
    assert.equal(g.sb.document.getElementById('save-tools').hasAttribute('open'),false);
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/partida guardada/);
  });
  await check('guardar/exportar/importar conservan el snapshot sin incluir estado del grupo',g=>{
    g.run('startImmersion(4);');const expected=clone(g.run('inImmersion'));
    g.emitElement('btn-save','click');assert.deepEqual(g.saved()._inImmersion,expected);
    g.emitElement('btn-export','click');const exported=JSON.parse(g.sb.__blobs.at(-1).parts.join(''));
    assert.deepEqual(exported._inImmersion,expected);
    assert.equal(Object.prototype.hasOwnProperty.call(exported,'saveTools'),false);
    g.sb.__candidate=exported;assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.deepEqual(clone(g.run('inImmersion')),expected);
  });
  await check('RESET/IMPORTAR siguen rechazados en combate y no sustituyen sesión ni guardado',g=>{
    g.sb.document.getElementById('save-tools').setAttribute('open','');
    g.run('startImmersion(4);startCombat({node:{type:"ice",tier:1,tierName:"T1",name:"TEST"},onWin:onNodeDefeated});save();');
    const state=g.run('S'),inm=g.run('inImmersion'),raw=g.sb.localStorage.getItem('cypher_os_save_v9');
    g.emitElement('btn-reset','click');g.emitElement('btn-import','click');
    assert.equal(g.run('confirmOpen()'),false);assert.equal(g.run('combatActive'),true);
    assert.equal(g.run('S'),state);assert.equal(g.run('inImmersion'),inm);
    assert.equal(g.sb.localStorage.getItem('cypher_os_save_v9'),raw);
    // También comprobar la guardia pública: el grupo no cambia sus reglas.
    assert.equal(g.run('importGameState(nuevoEstado())'),false);
    assert.equal(g.run('S'),state);
  });
  console.log(`Partida/menú: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
