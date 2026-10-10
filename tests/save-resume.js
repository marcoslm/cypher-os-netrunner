/* Reporte F-02: un guardado fallido nunca descarta el progreso de la sesión. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=v=>JSON.parse(JSON.stringify(v));
async function run(options={}){
 let passes=0,fails=0;
 async function check(label,fn){
  const g=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',seed:2093});
  try{
   g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();document.getElementById("intro").style.display="none";');
   await fn(g);passes++;console.log('  ✔ '+label);
  }catch(e){fails++;console.log('  ✖ '+label+': '+e.stack);}
  finally{g.dispose();}
 }
 function returnIntro(g){clickAction(g,'backToIntro');clickAction(g,'confirmYes');}
 function continueGame(g){g.run('beginIntro();');g.advance(30000);}
 console.log('\nPERSISTENCIA · guardado fallido y continuación en memoria…');
 await check('save() comunica éxito y fracaso sin romper la sesión',g=>{
  assert.equal(g.run('save()'),true);
  g.sb.localStorage.fail.setItem=true;
  assert.equal(g.run('save()'),false);
  assert.equal(g.run('S.player.credits'),500,'la partida sigue viva en memoria');
 });
 await check('guardado fallido al volver a intro conserva el progreso al continuar',g=>{
  g.run('S.player.credits=900;save();S.player.credits=4321;S.jobs=[{id:"j",title:"T",desc:"T",type:"recoleta",n:1,contact:"mamaWire",reward:10,xp:1,done:false,failed:false,prog:{gathered:1}}];');
  g.sb.localStorage.fail.setItem=true;
  returnIntro(g);
  assert.ok(g.run('_resumeAfterIntro'),'la continuación queda en memoria de runtime');
  assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/sigue viva en memoria/);
  continueGame(g);
  assert.equal(g.run('S.player.credits'),4321,'no el archivo viejo (900) ni una partida nueva (500)');
  assert.equal(g.run('S.jobs[0].prog.gathered'),1);
  assert.equal(g.run('_resumeAfterIntro'),null,'la continuación se consume una sola vez');
  assert.equal(g.list().filter(t=>t.type==='interval'&&t.ms===1000).length,1,'un único reloj');
 });
 await check('guardado correcto conserva el flujo normal y no deja continuación',g=>{
  g.run('S.player.credits=4321;');returnIntro(g);
  assert.equal(g.run('_resumeAfterIntro'),null);
  assert.equal(g.saved().player.credits,4321);
  continueGame(g);
  assert.equal(g.run('S.player.credits'),4321);
  assert.ok(g.run('S.log.some(function(e){return e.text.indexOf("partida restaurada")>=0;})'));
 });
 await check('la continuación vive solo en runtime y una recarga real usa el archivo',g=>{
  g.run('S.player.credits=900;save();S.player.credits=4321;');
  g.sb.localStorage.fail.setItem=true;returnIntro(g);
  const runtime=clone(g.run('S'));
  assert.equal(runtime._resumeAfterIntro,undefined,'no pertenece al estado de partida');
  assert.equal(g.saved().player.credits,900,'el archivo conserva lo último persistido');
  g.run('_resumeAfterIntro=null;afterBoot();'); /* recarga real: sin memoria de sesión */
  assert.equal(g.run('S.player.credits'),900,'límite físico documentado: recarga = archivo');
 });
 await check('sin archivo previo, el fallo conserva la partida nueva en memoria',g=>{
  g.sb.localStorage.removeItem('cypher_os_save_v9');
  g.run('S=nuevoEstado();ensureStateIntegrity();S.player.credits=777;');
  g.sb.localStorage.fail.setItem=true;
  returnIntro(g);continueGame(g);
  assert.equal(g.run('S.player.credits'),777);
  assert.equal(g.run('S.player.level'),1);
 });
 console.log(`Guardado/continuación: ${passes} correctas · ${fails} fallos`);
 return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(f=>{process.exitCode=f?1:0;},e=>{console.error(e);process.exitCode=1;});
module.exports={run};
