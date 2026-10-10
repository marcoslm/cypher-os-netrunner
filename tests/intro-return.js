/* F07B: volver a la intro con guardado, sin duplicar el ciclo de sesión. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();');
      // La sesión ya pasó por COMENZAR: la intro queda oculta hasta un retorno.
      g.run('var intro=document.getElementById("intro");if(intro)intro.style.display="none";');
      await fn(g);passes++;console.log('  ✔ '+label);
    }catch(error){fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally{g.dispose();}
  }
  const introVisible=g=>g.sb.document.getElementById('intro').style.display!=='none';
  const confirmOpen=g=>g.run('confirmOpen()');
  console.log('\nINTRO · retorno y continuación F07B…');
  await check('cancelar el retorno deja la partida y el bucle intactos',g=>{
    const before=clone(g.run('S'));const loop=g.run('loopId');
    clickAction(g,'backToIntro');assert.equal(confirmOpen(g),true);
    g.run('resolveConfirm(false);');
    assert.equal(introVisible(g),false);assert.equal(g.run('loopId'),loop);
    assert.deepEqual(clone(g.run('S')),before);
  });
  await check('confirmar guarda, muestra la intro y detiene el ciclo sin duplicar timers',g=>{
    g.run('S.player.credits=4321;');const before=clone(g.run('S'));
    clickAction(g,'backToIntro');g.run('resolveConfirm(true);');
    assert.equal(introVisible(g),true);assert.equal(g.run('_bootStarted'),false);
    assert.equal(g.run('loopId'),null);assert.equal(g.run('inImmersion'),null);
    assert.equal(g.run('modalOpen()'),false);
    assert.equal(g.saved().player.credits,4321);
    assert.deepEqual(clone(g.run('S.jobs')),before.jobs);
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/partida guardada/);
  });
  await check('COMENZAR tras retorno reutiliza intro→boot y continúa la partida guardada',g=>{
    g.run('S.player.credits=4321;S.jobs=[{id:"j",title:"T",desc:"T",type:"recoleta",n:1,contact:"mamaWire",reward:10,xp:1,done:false,failed:false,prog:{gathered:1}}];save();');
    clickAction(g,'backToIntro');g.run('resolveConfirm(true);');
    assert.equal(introVisible(g),true);
    // Un clic de radio real desmarca su grupo (el arnés no emula exclusividad).
    const radios=g.sb.document.querySelectorAll('input[name="diff"]');
    radios.forEach(r=>{r.checked=false;});
    const hard=g.sb.document.querySelector('input[name="diff"][value="hardcore"]');hard.checked=true;
    g.run('beginIntro();');assert.equal(g.run('_bootStarted'),true);
    assert.equal(g.run('_pendingDifficulty'),'hardcore','el radio seleccionado se lee antes del boot');
    g.advance(30000);
    assert.equal(introVisible(g),false);assert.equal(g.run('S.player.credits'),4321);
    assert.equal(g.run('S.jobs[0].prog.gathered'),1);
    assert.equal(g.run('S.difficulty'),'hardcore','la dificultad elegida en intro se aplica a la partida viva');
    assert.ok(g.run('loopId')!==null,'un único bucle reanudado');
  });
  await check('retornos repetidos no duplican bucle ni pierden progreso entre ciclos',g=>{
    for(let i=0;i<3;i++) {
      g.run('S.player.credits='+(1000+i)+';');
      clickAction(g,'backToIntro');g.run('resolveConfirm(true);');
      assert.equal(g.run('loopId'),null);
      g.run('beginIntro();');g.advance(30000);
      assert.equal(g.run('S.player.credits'),1000+i);
      assert.ok(g.run('loopId')!==null);
    }
  });
  await check('guardias: inmersión, combate y FLATLINE no vuelven a la intro',g=>{
    g.run('startImmersion(4);');const before=clone(g.run('S'));
    clickAction(g,'backToIntro');assert.equal(confirmOpen(g),false);
    assert.deepEqual(clone(g.run('S.player')),before.player);
    g.run('cancelActiveCombat();inImmersion=null;S.player.cpu=0;showFlatline();');
    clickAction(g,'backToIntro');assert.equal(confirmOpen(g),false);
    assert.equal(introVisible(g),false);
    const player=clone(g.run('S.player'));
    assert.deepEqual({...player,cpu:before.player.cpu},before.player);
  });
  console.log(`Intro: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
