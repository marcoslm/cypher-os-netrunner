/* Reporte F-08: la decoración y los timers de sesión se limpian al volver a la intro. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
async function run(options={}){
 let passes=0,fails=0;
 async function check(label,fn){
  const g=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',seed:2093});
  try{
   g.run('S=nuevoEstado();storyFinishPrologue();storyBeginRecovery();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();document.getElementById("intro").classList.add("hidden");');
   await fn(g);passes++;console.log('  ✔ '+label);
  }catch(e){fails++;console.log('  ✖ '+label+': '+e.stack);}
  finally{g.dispose();}
 }
 function glitchTimers(g){ return g.list().filter(t=>t.type==='timeout'&&t.ms>=30000); }
 console.log('\nSESIÓN · decoración y timers limpios…');
 await check('volver a la intro detiene glitches, reloj y decoración de la sesión',g=>{
  g.run('startGlitchLoop();');
  assert.ok(glitchTimers(g).length>0,'la decoración activa programa su timer');
  g.sb.document.body.classList.add('glitch-random');
  clickAction(g,'backToIntro');clickAction(g,'confirmYes');
  assert.equal(g.run('_glitchId'),null);assert.equal(g.run('_glitchEndId'),null);
  assert.ok(!g.sb.document.body.classList.contains('glitch-random'));
  assert.equal(g.run('loopId'),null);
  assert.equal(glitchTimers(g).length,0,'sin timers de decoración huérfanos');
 });
 await check('stopGlitchLoop cancela timers y una carrera disparada no reprograma',g=>{
  g.run('startGlitchLoop();');
  const ids=[g.run('_glitchId'),g.run('_glitchEndId')];
  g.run('stopGlitchLoop();');
  assert.equal(g.run('_glitchId'),null);assert.equal(g.run('_glitchEndId'),null);
  for(const id of ids) if(id!=null) g.fire(id); /* callbacks retrasados no reviven el bucle */
  assert.equal(g.run('_glitchId'),null);
  assert.equal(glitchTimers(g).length,0);
 });
 await check('continuar tras el retorno reactiva la decoración con un solo reloj',g=>{
  clickAction(g,'backToIntro');clickAction(g,'confirmYes');
  g.run('beginIntro();');g.advance(30000);
  assert.ok(g.run('loopId')!==null,'un único reloj de sesión');
  assert.equal(g.list().filter(t=>t.type==='interval'&&t.ms===1000).length,1);
  assert.ok(g.run('_glitchId')!==null,'la decoración vuelve a programarse al continuar');
  clickAction(g,'backToIntro');clickAction(g,'confirmYes');
  assert.equal(g.run('_glitchId'),null);
 });
 console.log(`Sesión/decoración: ${passes} correctas · ${fails} fallos`);
 return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(f=>{process.exitCode=f?1:0;},e=>{console.error(e);process.exitCode=1;});
module.exports={run};
