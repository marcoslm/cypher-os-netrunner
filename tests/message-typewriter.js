/* Avisos: escritura visual, accesibilidad y un único timer cancelable. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
async function run(options={}){
  let passes=0,fails=0;
  async function check(label,fn){
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try{
      g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;S._tutorialDone=true;msgEl=document.getElementById("msg");');
      await fn(g);passes++;console.log('  ✔ '+label);
    }catch(error){fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally{g.dispose();}
  }
  const body=g=>g.sb.document.getElementById('msg-text');
  const container=g=>g.sb.document.getElementById('msg');
  console.log('\nAVISOS TYPEWRITER · cursor, sustitución y limpieza…');
  await check('texto progresivo a 45 ms, color conservado y anuncio accesible completo',g=>{
    g.run('msg("CABLE", "cyan");');
    assert.equal(body(g).textContent,'');
    assert.equal(container(g).getAttribute('aria-label'),'CABLE');
    assert.equal(body(g).getAttribute('aria-hidden'),'true');
    assert.equal(g.sb.document.getElementById('msg-cursor').getAttribute('aria-hidden'),'true');
    assert.ok(container(g).classList.contains('cyan'));
    assert.ok(container(g).classList.contains('msg-typing'));
    g.advance(44);assert.equal(body(g).textContent,'');
    g.advance(1);assert.equal(body(g).textContent,'C');
    g.advance(45);assert.equal(body(g).textContent,'CA');
    g.advance(135);assert.equal(body(g).textContent,'CABLE');
    assert.ok(!container(g).classList.contains('msg-typing'));
    assert.equal(g.run('_msgTypeTimer'),null);assert.equal(g.run('_msgTypeJob'),null);
  });
  await check('el nuevo aviso cancela el anterior y sus callbacks no mezclan letras ni timers',g=>{
    const callbacks=[],timer=g.sb.setTimeout;
    g.sb.setTimeout=(fn,ms)=>{callbacks.push(fn);return timer(fn,ms);};
    g.run('msg("ANTERIOR","rojo");');const old=callbacks[0];
    g.advance(90);assert.equal(body(g).textContent,'AN');
    g.run('msg("NUEVO","verde");');const active=g.run('_msgTypeTimer');
    old();assert.equal(body(g).textContent,'');assert.equal(g.run('_msgTypeTimer'),active);
    g.advance(500);old();assert.equal(body(g).textContent,'NUEVO');
    assert.equal(container(g).getAttribute('aria-label'),'NUEVO');
    assert.ok(container(g).classList.contains('verde'));
    assert.equal(g.run('_msgTypeTimer'),null);
  });
  await check('no divide acentos combinados, emojis o caracteres fuera de BMP',g=>{
    const text='A\u0301👩🏽‍💻🤝';g.sb.__text=text;
    g.run('msg(window.__text);');
    g.advance(45);assert.equal(body(g).textContent,'A\u0301');
    g.advance(45);assert.equal(body(g).textContent,'A\u0301👩🏽‍💻');
    g.advance(45);assert.equal(body(g).textContent,text);
    g.run('var oldSegmenter=Intl.Segmenter;Intl.Segmenter=undefined;msg("🤝X");Intl.Segmenter=oldSegmenter;');
    g.advance(45);assert.equal(body(g).textContent,'🤝');
    g.advance(45);assert.equal(body(g).textContent,'🤝X');
  });
  await check('los mensajes largos completan en seis segundos sin cola ni estado persistido',g=>{
    const before=JSON.stringify(g.run('S'));
    g.sb.__text='X'.repeat(1000);g.run('msg(window.__text);');
    g.advance(5999);assert.ok(body(g).textContent.length<1000);
    g.advance(1);assert.equal(body(g).textContent.length,1000);
    assert.equal(g.run('_msgTypeTimer'),null);
    assert.equal(JSON.stringify(g.run('S')),before);
    g.run('msg("");');assert.equal(body(g).textContent,'');assert.equal(g.run('_msgTypeJob'),null);
  });
  await check('movimiento reducido evita la animación y termina una escritura ya iniciada',g=>{
    g.run('_msgMotion.matches=true;msg("inmediato","ambar");');
    assert.equal(body(g).textContent,'inmediato');assert.equal(g.run('_msgTypeTimer'),null);
    assert.ok(!g.sb.document.getElementById('msgbar').classList.contains('msg-flash'));
    g.run('_msgMotion.matches=false;msg("escribiendo");');g.advance(45);
    assert.equal(body(g).textContent,'e');
    g.run('_msgMotion.matches=true;onMessageMotionChange({matches:true});');
    assert.equal(body(g).textContent,'escribiendo');assert.equal(g.run('_msgTypeTimer'),null);
  });
  await check('cambiar de partida invalida callbacks; cerrar modales no interrumpe el aviso',g=>{
    const callbacks=[],timer=g.sb.setTimeout;
    g.sb.setTimeout=(fn,ms)=>{callbacks.push(fn);return timer(fn,ms);};
    g.run('msg("partida anterior");');const old=callbacks[0];
    g.run('clearSessionRuntime();');assert.equal(g.run('_msgTypeTimer'),null);
    g.run('msg("otra partida");');old();assert.equal(body(g).textContent,'');
    g.run('closeOverlay();');g.advance(45);assert.equal(body(g).textContent,'o');
    g.advance(6000);assert.equal(body(g).textContent,'otra partida');
    g.run('afterBoot();');old();assert.notEqual(container(g).getAttribute('aria-label'),'partida anterior');
  });
  await check('texto literal sin HTML, DOM ausente protegido y reconstrucción de contenido legacy',g=>{
    g.run('msg("<img src=x> & aviso");');g.advance(6000);
    assert.equal(body(g).textContent,'<img src=x> & aviso');assert.equal(g.sb.document.querySelector('img'),null);
    g.run('msg("retirado");');body(g).remove();g.advance(45);
    assert.equal(g.run('_msgTypeTimer'),null);assert.equal(g.run('_msgTypeJob'),null);
    g.run('msg("reconstruido");');g.advance(6000);assert.equal(body(g).textContent,'reconstruido');
    container(g).remove();assert.doesNotThrow(()=>g.run('msg("sin DOM");'));
  });
  await check('ocultar o abandonar la página termina el aviso sin callbacks pendientes',g=>{
    g.run('msg("hasta luego");');g.advance(45);
    g.run('document.hidden=true;');g.emitDocument('visibilitychange');
    assert.equal(body(g).textContent,'hasta luego');assert.equal(g.run('_msgTypeTimer'),null);
    g.run('msg("en segundo plano");');assert.equal(body(g).textContent,'en segundo plano');
    assert.equal(g.run('_msgTypeTimer'),null);
    g.run('document.hidden=false;msg("al abandonar");window.dispatchEvent(new Event("pagehide"));');
    assert.equal(body(g).textContent,'al abandonar');assert.equal(g.run('_msgTypeTimer'),null);
  });
  console.log(`Avisos typewriter: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
