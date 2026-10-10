/* F06: aclaración del movimiento efectivo, sin modificar sus reglas. */
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
    }catch(error){fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally{g.dispose();}
  }
  const state=g=>g.sb.document.getElementById('controls-motion-state').textContent;
  const note=g=>g.sb.document.getElementById('controls-motion').textContent;
  console.log('\nMOVIMIENTO EFECTIVO · sistema, local y avisos…');
  await check('sistema reducido mantiene OFF aunque toggle local esté OFF, sin culpar a la CPU',g=>{
    g.run('_displayMotion.matches=true;onDisplayMotionChange();');
    assert.match(state(g),/OFF.*SISTEMA\/NAVEGADOR/);assert.match(note(g),/OFF local no anula/);
    assert.match(note(g),/no una medición de la CPU/);
    for(const value of [true,false]) {
      g.run(`setDeckPref('reducedMotion',${value});`);
      assert.match(state(g),/OFF.*SISTEMA\/NAVEGADOR/);
      assert.equal(g.run('decorativeMotion()'),false);
    }
    g.run('msg("prueba de estado efectivo");');
    assert.equal(g.sb.document.getElementById('msg-text').textContent,'prueba de estado efectivo');
    assert.equal(g.run('_msgTypeTimer'),null);
  });
  await check('local, animaciones OFF y modo completo muestran causas distintas',g=>{
    g.run('setDeckPref("reducedMotion",true);');assert.match(state(g),/OFF.*AJUSTE LOCAL/);
    g.run('setDeckPref("reducedMotion",false);setDeckPref("animations",false);');
    assert.match(state(g),/OFF.*ANIMACIONES DESACTIVADAS/);
    g.run('setDeckPref("animations",true);');assert.match(state(g),/ON.*AJUSTES ACTIVOS/);
    g.run('msg("escritura activa");');assert.equal(g.sb.document.getElementById('msg-text').textContent,'');
    g.advance(45);assert.equal(g.sb.document.getElementById('msg-text').textContent,'e');
  });
  await check('sin matchMedia disponible conserva fallback y no inventa reducción del sistema',g=>{
    g.run('_displayMotion=null;syncControlPanel();');assert.match(state(g),/ON/);
    assert.ok(!state(g).includes('SISTEMA/NAVEGADOR'));g.run('setDeckPref("reducedMotion",true);');
    assert.match(state(g),/AJUSTE LOCAL/);
  });
  await check('actualizar explicación o cambiar media no modifica red/jugador ni persiste diagnóstico',g=>{
    g.run('startImmersion(4);');const inm=clone(g.run('inImmersion')),player=clone(g.run('S.player'));
    g.run('syncControlPanel();syncControlPanel();_displayMotion.matches=true;onDisplayMotionChange();save();');
    assert.deepEqual(clone(g.run('inImmersion')),inm);assert.deepEqual(clone(g.run('S.player')),player);
    assert.equal(Object.prototype.hasOwnProperty.call(g.saved(),'motionStatus'),false);
    assert.equal(g.sb.document.getElementById('controls-motion-state').getAttribute('role'),'status');
  });
  console.log(`Movimiento efectivo: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
