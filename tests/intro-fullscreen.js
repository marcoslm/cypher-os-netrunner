/* F08: botón de pantalla completa en la intro, sincronizado y sin arranque. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;');
      await fn(g);passes++;console.log('  ✔ '+label);
    }catch(error){fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally{g.dispose();}
  }
  const btn=g=>g.sb.document.getElementById('intro-fs');
  const status=g=>g.sb.document.getElementById('intro-fs-status');
  console.log('\nINTRO · pantalla completa F08…');
  await check('sin API el botón se oculta y la intro explica por qué',g=>{
    g.run('updateFsIndicator();');assert.ok(btn(g).classList.contains('hidden'));
    g.run('toggleFs();');
    assert.match(status(g).textContent,/no admite pantalla completa/);
    assert.equal(g.run('_bootStarted'),false);
  });
  await check('con API el estado se sincroniza y el rechazo se muestra dentro de la intro',g=>{
    const doc=g.sb.document;
    g.run('S=null;'); /* la intro existe antes de crear la partida */
    doc.documentElement.requestFullscreen=function(){ doc.fullscreenElement=null; return undefined; };
    g.run('updateFsIndicator();');
    assert.ok(!btn(g).classList.contains('hidden'));
    assert.equal(btn(g).getAttribute('aria-pressed'),'false');
    g.emitElement('intro-fs','click');g.advance(150);
    assert.match(status(g).textContent,/rechazó la pantalla completa/);
    assert.equal(btn(g).getAttribute('aria-pressed'),'false');
    doc.documentElement.requestFullscreen=function(){ doc.fullscreenElement=doc.documentElement; return undefined; };
    doc.exitFullscreen=function(){ doc.fullscreenElement=null; return undefined; };
    g.emitElement('intro-fs','click');g.advance(150);
    assert.equal(g.run('fsActive()'),true);assert.equal(btn(g).getAttribute('aria-pressed'),'true');
    assert.match(status(g).textContent,/Pantalla completa activada/);
    assert.equal(g.run('_bootStarted'),false);
    g.emitElement('intro-fs','click');g.advance(150);
    assert.equal(g.run('fsActive()'),false);assert.equal(btn(g).getAttribute('aria-pressed'),'false');
    assert.match(status(g).textContent,/desactivada/);
    assert.equal(g.run('_bootStarted'),false);
  });
  await check('el botón y el indicador superior comparten preferencia y salidas externas',g=>{
    const doc=g.sb.document;
    doc.documentElement.requestFullscreen=function(){ doc.fullscreenElement=doc.documentElement; return undefined; };
    doc.exitFullscreen=function(){ doc.fullscreenElement=null; return undefined; };
    g.run('toggleFs();');g.advance(150);
    assert.equal(g.run('_fsWants'),true);
    assert.equal(doc.getElementById('h-fs').getAttribute('aria-pressed'),'true');
    doc.fullscreenElement=null;g.run('onFsChange();');
    assert.equal(g.run('_fsWants'),false);
    assert.equal(btn(g).getAttribute('aria-pressed'),'false');
    assert.equal(doc.getElementById('h-fs').getAttribute('aria-pressed'),'false');
  });
  console.log(`Intro fullscreen: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
