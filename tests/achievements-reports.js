/* F09A: COMPLETISTA exige todos los ids de informes, no solo cantidad.
   Avance de INFORMES: el punto del lateral avisa de lo que queda sin abrir, el
   índice marca NUEVO lo recién archivado y el cartel reutiliza el banner en
   versión discreta, agrupada y muda (CONTRACTS §13). */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
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
  const completionist=g=>g.run('ACHIEVEMENTS.filter(function(a){return a.id==="completionist";})[0].check()');
  console.log('\nLOGROS · informes completos F09A…');
  await check('COMPLETISTA exige los 43 ids canónicos, no una longitud cualquiera',g=>{
    const ids=g.run('INTEL.map(function(e){return e.id;})');
    assert.equal(ids.length,43);
    g.run('S').intel=ids.slice(0,42).concat(['inventado']);
    assert.equal(completionist(g),false,'43 entradas con un id falso no cuentan');
    g.run('S').intel=ids.slice(0,42);
    assert.equal(completionist(g),false);
    g.run('S').intel=ids.slice();assert.equal(completionist(g),true);
  });
  await check('ids duplicados o desconocidos no desbloquean el logro por volumen',g=>{
    const ids=g.run('INTEL.map(function(e){return e.id;})');
    g.run('S').intel=ids.slice(0,41).concat(['extra','extra','extra']);
    assert.equal(completionist(g),false);
    g.run('S').intel=ids.concat(['extra']);
    assert.equal(completionist(g),true,'los ids canónicos completos siguen siendo suficientes');
  });
  await check('checkAchievements celebra una sola vez y lo conserva al recargar',g=>{
    const ids=g.run('INTEL.map(function(e){return e.id;})');
    g.run('S').intel=ids.slice();g.run('checkAchievements();');
    assert.ok(g.run('S.achievements').includes('completionist'));
    const before=clone(g.run('S.achievements'));g.run('checkAchievements();');
    assert.deepEqual(clone(g.run('S.achievements')),before);
    g.run('save();afterBoot();');
    assert.ok(g.run('S.achievements').includes('completionist'));
    assert.deepEqual(clone(g.run('S.achievements')),before);
  });
  /* ---- aviso de INFORMES (CONTRACTS §13) ---- */
  const dotShown=g => g.sb.document.getElementById('notif-informes').classList.contains('show');
  const bannerEl=g => g.sb.document.getElementById('banner');
  const texto=g => g.sb.document.getElementById('banner-title').textContent;
  const subtitulo=g => g.sb.document.getElementById('banner-sub').textContent;
  await check('el punto de INFORMES vive mientras queden informes sin abrir',g=>{
    g.run('unlock("anatomia");');
    assert.equal(g.run('intelNuevosCount()'),1);
    assert.equal(dotShown(g),true,'un informe nuevo enciende el punto');
    g.run('showView("informes");');
    assert.equal(g.run('intelNuevosCount()'),0,'abrir INFORMES da por vistos sus informes');
    assert.equal(dotShown(g),false);
    g.run('unlock("demonios");');   /* la visita no deja el punto muerto */
    assert.equal(g.run('intelNuevosCount()'),1);
    assert.equal(dotShown(g),true,'un informe posterior vuelve a encender el punto');
    assert.deepEqual(clone(g.run('S._intelVistos')),['anatomia'],'solo se dan por vistos los abiertos');
  });
  await check('el índice marca NUEVO lo recién archivado y no lo repite tras la visita',g=>{
    g.run('unlock("anatomia");unlock("demonios");');
    g.run('showView("informes");');
    const first=g.sb.document.getElementById('panel-scroll').innerHTML;
    assert.equal((first.match(/NUEVO/g)||[]).length,2,'una marca por informe nuevo');
    assert.match(first,/2 nuevos/,'el encabezado cuenta los nuevos');
    assert.equal((first.match(/class="intel intel-nueva"/g)||[]).length,2,'solo las tarjetas nuevas se resaltan');
    g.run('renderInformes();');
    const second=g.sb.document.getElementById('panel-scroll').innerHTML;
    assert.ok(!/NUEVO/.test(second) && !/nuevos/.test(second),'sin marcas ni contador tras la visita');
    assert.ok(!/intel-nueva/.test(second),'el resaltado también desaparece tras la visita');
    assert.match(second,/2\/43 desbloqueado/,'el progreso del índice se conserva');
  });
  await check('el cartel de INFORMES agrupa la ráfaga, no suena y dura menos que un logro',g=>{
    g.run('window.__fx=0;sound.achievement=function(){window.__fx++;};sound.levelUp=function(){window.__fx++;};sound.win=function(){window.__fx++;};');
    g.run('unlock("anatomia");unlock("demonios");unlock("ruido");');
    assert.ok(bannerEl(g).classList.contains('show'));
    assert.ok(bannerEl(g).classList.contains('banner-informe'),'variante discreta, no la de logros');
    assert.ok(!bannerEl(g).classList.contains('banner-logro') && !bannerEl(g).classList.contains('banner-nivel'));
    assert.equal(texto(g),'3 INFORMES ARCHIVADOS','la ráfaga se agrupa en una sola tarjeta');
    assert.equal(subtitulo(g),'revisa INFORMES');
    assert.equal(g.sb.document.getElementById('banner-icon').textContent,'▤');
    assert.equal(g.run('window.__fx'),0,'el aviso de informes no usa el sonido de logros/niveles');
    assert.equal(g.ids(2400).length,1,'una sola ventana de tiempo');
    assert.equal(g.ids(3400).length,0,'sin la duración del cartel llamativo');
    g.advance(3000);
    assert.equal(bannerEl(g).classList.contains('show'),false,'el cartel se retira solo');
  });
  await check('un informe suelto lleva su título y no se mezcla con logros ni niveles',g=>{
    g.run('showBanner("logro","★ PRUEBA","desc");');
    g.run('unlock("anatomia");');
    assert.equal(texto(g),'★ PRUEBA','el logro conserva su tarjeta');
    g.advance(3400);
    assert.equal(texto(g),'ANATOMÍA DEL CABLE');
    assert.equal(subtitulo(g),'revisa INFORMES');
    assert.ok(bannerEl(g).classList.contains('banner-informe'));
    assert.equal(g.ids(2400).length,1);
  });
  await check('cargar una partida no anuncia informes ni finge novedad',g=>{
    /* Partida anterior al campo: ya tenía sus informes y el panel abierto.
       Los logros van concedidos para que el único cartel posible sea el de INFORMES. */
    g.run('S=nuevoEstado();ensureStateIntegrity();S._tutorialDone=true;S.player.level=10;'+
      'S.player.stats.maxDepth=6;S.player.stats.immerse=5;S.player.stats.ice=10;'+
      'S.achievements=ACHIEVEMENTS.map(function(a){return a.id;});'+
      'sinAvisoIntel(checkUnlocks);S._seenPanels={informes:true};S._intelVistos=undefined;save();');
    assert.ok(g.run('S.intel.length')>0,'la partida de partida ya traía informes');
    assert.equal(g.saved()._intelVistos,undefined,'el archivo simula una partida anterior al campo');
    g.run('afterBoot();');
    assert.equal(g.run('intelNuevosCount()'),0,'ya abiertos antes: no se marcan como nuevos');
    assert.equal(dotShown(g),false);
    assert.equal(g.run('S._intelVistos.length'),g.run('S.intel.length'),'la migración conserva lo ya visto');
    assert.equal(bannerEl(g).classList.contains('show'),false,'sin cartel al arrancar');
    g.run('clearInterval(loopId);');
  });
  await check('una partida que nunca abrió INFORMES conserva el punto al migrar',g=>{
    g.run('S=nuevoEstado();ensureStateIntegrity();S._tutorialDone=true;S.intel=["anatomia"];S._intelVistos=undefined;save();');
    assert.equal(g.saved()._intelVistos,undefined);
    g.run('afterBoot();');
    assert.equal(g.run('intelNuevosCount()'),1);
    assert.equal(dotShown(g),true,'el informe pendiente de leer sigue avisando');
    g.run('clearInterval(loopId);');
  });
  await check('importar valida _intelVistos y nunca anuncia lo archivado',g=>{
    g.run('S=nuevoEstado();ensureStateIntegrity();S._tutorialDone=true;S.intel=["anatomia"];save();');
    const candidate=clone(g.run('S'));
    g.sb.__candidate=candidate;
    candidate._intelVistos='anatomia';
    assert.equal(g.run('validImportState(window.__candidate)'),false,'texto en vez de lista');
    candidate._intelVistos=[1,2];
    assert.equal(g.run('validImportState(window.__candidate)'),false,'ids no textuales');
    candidate._intelVistos=['anatomia'];
    assert.equal(g.run('validImportState(window.__candidate)'),true);
    candidate._intelVistos=null;
    assert.equal(g.run('validImportState(window.__candidate)'),true,'ausente/null sigue migrando');
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.equal(bannerEl(g).classList.contains('show'),false,'importar no anuncia nada');
    assert.deepEqual(clone(g.run('S._intelVistos')),[],'sin panel abierto, el informe importado queda pendiente');
    assert.equal(dotShown(g),true);
    g.run('clearInterval(loopId);');
  });
  await check('el punto sobrevive al guardado y se apaga al abrir INFORMES en la sesión siguiente',g=>{
    g.run('unlock("anatomia");save();afterBoot();');
    assert.equal(g.run('intelNuevosCount()'),1);
    assert.equal(dotShown(g),true);
    g.run('showView("informes");save();afterBoot();');
    assert.equal(g.run('intelNuevosCount()'),0);
    assert.equal(dotShown(g),false);
    g.run('clearInterval(loopId);');
  });
  await check('el vault recuperado y FRAGMENTO anuncian el informe con el cartel discreto',g=>{
    g.run('msgEl=document.getElementById("msg");startImmersion(4);S.intel=[];'+
      'var n=inImmersion.grid.nodes.filter(function(x){return x.layer>0 && !x.done;})[0];'+
      'n.type="vault";n.tier=3;n.proj="KURO";window.__n=n;onNodeDefeated({node:window.__n});');
    assert.ok(g.run('S.intel').indexOf('exp_kuro')>=0,'el expediente se archiva igual');
    assert.ok(bannerEl(g).classList.contains('show'),'recuperar el vault sí anuncia');
    assert.ok(bannerEl(g).classList.contains('banner-informe'));
    assert.equal(texto(g),'3 INFORMES ARCHIVADOS','expediente e informes de KURO en una sola tarjeta');
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/Expediente disponible en INFORMES/);
    g.advance(3000);
    assert.equal(bannerEl(g).classList.contains('show'),false);
    /* FRAGMENTO: el evento cuenta el hallazgo por la línea y el cartel lo archiva */
    g.run('GRID_EVENTS.filter(function(e){return e.id==="fragmento";})[0].effect();');
    assert.ok(bannerEl(g).classList.contains('banner-informe'),'FRAGMENTO también anuncia');
    assert.equal(texto(g),g.run('intelTitle(S.intel[S.intel.length-1])'));
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/informe desbloqueado/);
    assert.ok(g.run('intelNuevosCount()')>0,'el punto avisa de todo lo archivado');
  });
  console.log(`Logros/informes: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
