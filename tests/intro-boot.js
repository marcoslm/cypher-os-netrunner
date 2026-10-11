/* Encendido integrado: presentación sin crear ni alterar la partida. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
async function run(options={}){
 let passes=0,fails=0;
 async function check(label,fn,extra={}){
  const g=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',audio:true,seed:2093,boot:'progressive',...extra});
  try{await fn(g);passes++;console.log('  ✔ '+label);}catch(e){fails++;console.log('  ✖ '+label+': '+e.stack);}finally{g.dispose();}
 }
 const lines=g=>g.sb.document.querySelectorAll('#boot-body .line');
 console.log('\nCIBERDECK · encendido y menú unificados…');
 await check('encendido automático añade líneas en orden sin crear S ni reloj',g=>{
  assert.equal(g.run('entryMode()'),'boot');assert.equal(lines(g).length,0);
  assert.equal(g.sb.document.activeElement.id,'intro-skip');
  g.advance(320);assert.equal(lines(g).length,1);
  const first=lines(g)[0];g.advance(180);assert.equal(lines(g).length,2);assert.equal(lines(g)[0],first);
  assert.equal(g.run('S'),null);assert.equal(g.run('loopId'),null);
  assert.equal(g.audio.nodes.length,0,'sin audio ni solicitudes de autoplay antes del gesto');
 });
 await check('POST completo conserva registro y revela menú sin arrancar partida',g=>{
  g.advance(5000);assert.equal(g.run('entryMode()'),'intro');assert.equal(lines(g).length,g.run('BOOT_LINES.length'));
  assert.deepEqual(lines(g).map(n=>n.textContent),Array.from(g.run('BOOT_LINES.map(function(l){return l[0];})')));
   assert.match(lines(g)[1].textContent,/^FIRMWARE v1\.0 alpha · BUILD [1-9]\d*$/);
  assert.equal(g.sb.document.getElementById('intro-boot-status'),null);
   assert.equal(g.sb.document.querySelector('.boot-footer'),null);
   assert.equal(g.sb.document.getElementById('intro-memory-status').textContent,'');
   assert.equal(lines(g).length,11);
   assert.equal(lines(g)[10].textContent,'señal adquirida ......... ENLACE DISPONIBLE');
   assert.match(lines(g)[9].textContent,/canal de datos/);
   assert.ok(!lines(g).some(n=>/LISTO PARA INICIAR SESIÓN|alcantarilla|Esperando al operador/.test(n.textContent)));
   assert.equal(g.sb.document.getElementById('intro-power').getAttribute('role'),'status');
   assert.equal(g.sb.document.activeElement.id,'intro-start');assert.equal(g.run('_introBootTimer'),null);
  assert.equal(g.run('S'),null);assert.equal(g.saved(),null);assert.equal(g.run('loopId'),null);
 });
 await check('solo OMITIR termina el POST; clic en registro y Enter genérico no lo saltan',g=>{
  g.emitElement('boot','click');g.emitElement('intro-skip','keydown',{key:'Enter'});
  assert.equal(g.run('entryMode()'),'boot');
  g.emitElement('intro-skip','click');assert.equal(g.run('entryMode()'),'intro');
  assert.equal(g.run('S'),null);assert.equal(g.run('_introBootTimer'),null);
  g.advance(10000);assert.equal(lines(g).length,g.run('BOOT_LINES.length'));
 });
 await check('COMENZAR está protegido durante POST y después entra una sola vez',g=>{
  g.run('beginIntro();');assert.equal(g.run('S'),null);
  g.emitElement('intro-skip','click');g.emitElement('intro-start','click');
  const state=g.run('S'),clock=g.run('loopId');assert.ok(state);assert.ok(clock);
  assert.equal(g.sb.document.getElementById('intro').classList.contains('hidden'),true);
  g.emitElement('intro-start','click');assert.equal(g.run('S'),state);assert.equal(g.run('loopId'),clock);
  assert.equal(g.run('_introBootTimer'),null);
 });
 await check('movimiento reducido inicial muestra toda la información sin timer',g=>{
  assert.equal(g.run('entryMode()'),'intro');assert.equal(g.run('_introBootTimer'),null);
  assert.equal(lines(g).length,g.run('BOOT_LINES.length'));assert.equal(g.run('S'),null);
 },{storage:{initial:{cypher_os_controls_v1:JSON.stringify({reducedMotion:true})}}});
 await check('cambiar movimiento durante POST lo completa y cancela callbacks',g=>{
  g.advance(500);g.run('setDeckPref("animations",false);');
  assert.equal(g.run('entryMode()'),'intro');assert.equal(g.run('_introBootTimer'),null);
  const count=lines(g).length;g.advance(5000);assert.equal(lines(g).length,count);assert.equal(g.run('S'),null);
 });
 await check('reiniciar presentación cancela su timer previo sin duplicar líneas',g=>{
  g.advance(500);g.run('runBoot();');g.advance(5000);
  assert.equal(lines(g).length,g.run('BOOT_LINES.length'));assert.equal(g.run('_introBootTimer'),null);
 });
 console.log(`Encendido integrado: ${passes} correctas · ${fails} fallos`);
 return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(f=>{process.exitCode=f?1:0;},e=>{console.error(e);process.exitCode=1;});
module.exports={run};
