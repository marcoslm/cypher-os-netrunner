/* Expedientes, memoria compacta y HUD. Node sin dependencias. */
'use strict';
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');
const clone = value => JSON.parse(JSON.stringify(value));
function job(type, n, progress = 0) {
  const field = { recoleta:'gathered', carrera:'deepGathered', rompehielas:'iceT2', daemon:'daemons', vault:'vaulted' }[type];
  return { id:type, title:type, desc:type, type, n, contact:'doctorSudario', reward:100, xp:10,
    done:false, failed:false, project:'VESPER', targetDepth:4, prog:{ [field]:type === 'vault' ? !!progress : progress } };
}
async function run(options = {}) {
  let passes=0, fails=0;
  async function check(label, fn) {
    const g=loadGame({ timers:'virtual', seed:2093, strictDOM:true, canvas:'stub' });
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;S._tutorialDone=true;startImmersion(4);');
      await fn(g); passes++; console.log('  ✔ '+label);
    } catch(error) { fails++; console.log('  ✖ '+label+': '+error.stack); }
    finally { g.dispose(); }
  }
  console.log('\nEXPEDIENTES / HUD · recuperación, fases, visitas y contratos…');
  await check('los ocho proyectos desbloquean su expediente una vez y antes de cobrar', g => {
    const inm=g.run('inImmersion'), S=g.run('S');
    for(const project of g.run('PROYECTOS')) {
      const n=inm.grid.nodes.find(n=>n.layer>0 && !n.done);
      Object.assign(n,{ type:'vault', tier:3, proj:project }); g.sb.__node=n;
      const before=clone(S.player);
      g.run('onNodeDefeated({node:window.__node});');
      const id=g.run('PROYECTO_EXPEDIENTE')[project];
      assert.equal(S.intel.filter(i=>i===id).length,1);
      assert.ok(g.saved().intel.includes(id));
      assert.match(g.run(`intelHint('${id}')`),new RegExp(project));
      const xp=S.player.xp, logs=S.log.length;
      g.run('onNodeDefeated({node:window.__node});');
      assert.equal(S.player.xp,xp); assert.equal(S.log.length,logs);
      assert.equal(S.player.credits,before.credits);
    }
    assert.equal(S.player.stats.daemons,0);
    assert.ok(!S.intel.includes('vesper'),'el expediente no sustituye el informe de cinco daemons');
    assert.equal(S.intel.filter(id=>id.startsWith('exp_')).length,8);
  });
  await check('fallo/cancelación de vault no entrega expediente y fragmentos no lo sortean', g => {
    g.run('var v=inImmersion.grid.nodes[1];v.type="vault";v.tier=3;v.proj="VESPER";startVaultPuzzle(v);');
    assert.ok(!g.run('S.intel').includes('exp_vesper'));
    g.advance(3000); g.run('vaultFail();ACTIONS.vaultCancel();');
    assert.ok(!g.run('S.intel').includes('exp_vesper'));
    g.run('S.intel=INTEL.filter(function(i){return i.u!=="recover_project";}).map(function(i){return i.id;});GRID_EVENTS.filter(function(e){return e.id==="fragmento";})[0].effect();');
    assert.equal(g.run('S.intel.length'),35);
  });
  await check('restauración recupera expedientes solo de vaults consumidos y mantiene idempotencia', g => {
    g.run('var v=inImmersion.grid.nodes[1];v.type="vault";v.tier=3;v.proj="VESPER";v.done=true;save();');
    const saved=g.saved(); g.sb.__candidate=saved;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.ok(g.run('S.intel').includes('exp_vesper'));
    assert.ok(!saved.intel.includes('exp_vesper'),'no muta el candidato');
    g.run('restoreImmersion(inImmersion);restoreImmersion(inImmersion);');
    assert.equal(g.run('S.intel.filter(function(id){return id==="exp_vesper";}).length'),1);
    const count=g.run('S.intel.length');
    g.run('restoreImmersion(null);'); assert.equal(g.run('S.intel.length'),count);
  });
  await check('partida antigua en la calle recupera los ocho expedientes desde contratos completados sin pagar otra vez', g => {
    const candidate=clone(g.run('nuevoEstado()'));
    candidate.snd=false; candidate.mus=false; candidate._tutorialDone=true;
    candidate.player.credits=4321; candidate.player.stats.jobsCompleted=8; candidate.player._unlockedSkills=[];
    candidate._inImmersion=null;
    candidate.jobs=Array.from(g.run('PROYECTOS'),(project,index)=>({
      ...job('vault',1,index%2),id:'legacy_'+index,project,done:true,failed:false
    }));
    const player=clone(candidate.player), jobs=clone(candidate.jobs);
    g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    const expected=Object.values(g.run('PROYECTO_EXPEDIENTE')).sort();
    assert.deepEqual(clone(g.run('S.intel')).sort(),expected);
    assert.deepEqual(clone(g.run('S.player')),player);
    assert.deepEqual(clone(g.run('S.jobs')),jobs);
    assert.equal(candidate.intel.length,0,'no se modifica el archivo importado');
    assert.equal(g.run('inImmersion'),null);
    assert.deepEqual(g.saved().intel.slice().sort(),expected);
    g.run('afterBoot();ensureStateIntegrity();ensureStateIntegrity();');
    assert.deepEqual(clone(g.run('S.intel.filter(function(id){return id.indexOf("exp_")===0;})')).sort(),expected);
    assert.equal(g.run('S.log.filter(function(e){return e.text.indexOf("INTEL ▸ EXPEDIENTE RECUPERADO")===0;}).length'),8);
    assert.deepEqual(clone(g.run('S.player')),player);
  });
  await check('migración exige recuperación demostrable, sin inferir expedientes de ofertas, fracasos o intel narrativo', g => {
    g.run('unlockProjectDossier("VESPER");');
    const candidate=clone(g.run('nuevoEstado()'));
    candidate.snd=false; candidate.mus=false; candidate._tutorialDone=true; candidate._inImmersion=null;
    candidate.intel=['vesper','kuro'];
    candidate.jobs=[
      {...job('vault',1),id:'pendiente'},
      {...job('vault',1),id:'fracasado',project:'KURO',done:true,failed:true},
      {...job('recoleta',1,1),id:'no-vault',project:'SOMNIO',done:true},
      {...job('vault',1,1),id:'desconocido',project:'NO EXISTE',done:true}
    ];
    const offer={...job('vault',1),id:'oferta',project:'MIRAJE'};
    delete offer.done; delete offer.failed; delete offer.prog; candidate.offers=[offer];
    g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.equal(g.run('S.intel.filter(function(id){return id.indexOf("exp_")===0;}).length'),0);
    assert.ok(!g.run('S.intel').includes('exp_vesper'),'no hereda un expediente de la sesión anterior');
    g.run('S.jobs[0].prog.vaulted=true;S.jobs[0].project="HALCÓN";S.jobs[1].prog.vaulted=true;S.jobs[1].project="SOMNIO";ensureStateIntegrity();save();');
    assert.ok(g.run('S.intel').includes('exp_halcon'),'recuperado aunque todavía no se cobró');
    assert.ok(g.run('S.intel').includes('exp_somnio'),'recuperado aunque el contrato terminó como fracaso');
    assert.equal(g.run('S.intel.filter(function(id){return id.indexOf("exp_")===0;}).length'),2);
  });
  await check('memoria oculta la caja de revelación y restaura cada nueva fase y fallo', g => {
    g.run('startCombat({node:{type:"daemon",tier:3,name:"TEST"},onWin:onNodeDefeated});');
    assert.ok(!g.sb.document.getElementById('memZone').classList.contains('hidden'));
    assert.ok(g.sb.document.getElementById('memInputZone').classList.contains('hidden'));
    g.advance(4100);
    assert.equal(g.run('COM.memPhase'),'input');
    assert.ok(g.sb.document.getElementById('memZone').classList.contains('hidden'));
    assert.ok(!g.sb.document.getElementById('memInputZone').classList.contains('hidden'));
    assert.equal(g.sb.document.getElementById('memSeq').textContent,'');
    assert.equal(g.sb.document.getElementById('memInputHint').textContent,'Secuencia de 5 caracteres');
    assert.equal(g.sb.document.getElementById('timerLbl').textContent,'T-'+(g.run('COM.time')/1000).toFixed(1)+'s');
    g.run('onMemHexEnter();');
    assert.equal(g.run('COM.memPhase'),'reveal');
    assert.ok(!g.sb.document.getElementById('memZone').classList.contains('hidden'));
    g.advance(4100); const inp=g.sb.document.getElementById('memInput');
    inp.value=g.run('COM.memSequence'); g.emitElement(inp,'input');
    assert.equal(g.run('COM.phase'),2);
    assert.ok(!g.sb.document.getElementById('memZone').classList.contains('hidden'));
    assert.equal(g.sb.document.getElementById('memInputHint').textContent,'Secuencia de 6 caracteres');
  });
  await check('contadores por tipo incluyen rastreadores una vez sin mezclar daemons o Núcleo', g => {
    for(const [type,tier] of [['ice',1],['ice',2],['daemon',3]]) {
      g.run(`var enemy={type:'${type}',tier:${tier},name:'TEST',tierName:'T${tier}'};onNodeDefeated({node:enemy});onNodeDefeated({node:enemy});`);
    }
    g.run('Math.random=function(){return 0;};S.player.heat=60;tryScavenger();var trackerWin=COM.ctx.onWin;cancelActiveCombat();trackerWin();trackerWin();');
    assert.deepEqual(clone(g.run('inImmersion.enemyCounts')),{ice:3,daemons:1,trackers:1,nucleo:0});
    assert.equal(g.run('inImmersion.enemiesDefeated'),4);
    g.run('recordImmersionEnemy({type:"nucleo"});');
    assert.equal(g.run('inImmersion.enemyCounts.nucleo'),1);
    assert.equal(g.run('inImmersion.enemyCounts.ice'),3);
  });
  await check('visita bajo emboscada y corriente se guarda; revisitas no suman', g => {
    g.run('tryGridEvent=function(){};tryScavenger=function(){return true;};moveToNode(inImmersion.grid.adj[inImmersion.current][0]);');
    assert.equal(g.run('inImmersion.visited.length'),2);
    assert.ok(g.saved()._inImmersion.visited.includes(g.run('inImmersion.current')));
    g.run('moveToNode(inImmersion.grid.entry);');
    assert.equal(g.run('inImmersion.visited.length'),2);
    g.run('GRID_EVENTS.filter(function(e){return e.id==="corriente";})[0].effect();');
    assert.ok(g.run('inImmersion.visited.indexOf(inImmersion.current)>=0'));
    const count=g.run('inImmersion.visited.length');
    g.run('recordImmersionVisit(inImmersion.current);'); assert.equal(g.run('inImmersion.visited.length'),count);
  });
  await check('mapas revelados no cuentan como visitas; explorado no significa agotado', g => {
    const inm=g.run('inImmersion'); inm.grid.nodes.forEach(n=>{n._revealed=true;});
    assert.equal(g.run('gridCompletion(inImmersion).visited'),1);
    inm.visited=inm.grid.nodes.map(n=>n.id);
    g.run('updateGridHud();');
    assert.equal(inm.exploredNotified,true); assert.equal(inm.exhaustedNotified,false);
    assert.match(g.sb.document.getElementById('grid-status').textContent,/GRID EXPLORADO/);
    assert.ok(g.run('gridCompletion(inImmersion).pending')>0);
  });
  await check('RAM llena, reserva y vault bloqueado son pendientes; puerto y vacío no lo son', g => {
    const inm=g.run('inImmersion');
    inm.grid.nodes.forEach(n=>{n.type='empty';n.done=false;}); inm.grid.nodes[0].type='puerto';
    inm.visited=inm.grid.nodes.map(n=>n.id);
    const target=inm.grid.nodes[1]; Object.assign(target,{type:'data',data:7});
    inm.dataUsed=6; inm.data=Array.from({length:6},()=>({value:7}));
    g.sb.__node=target; g.run('collectData(window.__node);');
    assert.equal(g.run('gridCompletion(inImmersion).exhausted'),false);
    Object.assign(target,{type:'vault',tier:3,proj:'VESPER'});
    g.run('startVaultPuzzle(window.__node);'); g.advance(3000); g.run('vaultFail();');
    assert.equal(g.run('gridCompletion(inImmersion).pending'),1);
    g.run('ACTIONS.vaultCancel();'); target.type='substation';
    assert.equal(g.run('gridCompletion(inImmersion).exhausted'),false);
    target._used=true;
    g.run('updateGridHud();updateGridHud();save();');
    assert.equal(inm.exhaustedNotified,true);
    assert.equal(g.run('S.log.filter(function(e){return e.text.indexOf("GRID AGOTADO")===0;}).length'),1);
    g.sb.__candidate=g.saved(); assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.equal(g.run('S.log.filter(function(e){return e.text.indexOf("GRID AGOTADO")===0;}).length'),1);
    assert.match(g.sb.document.getElementById('grid-status').textContent,/rastreadores aún activos/);
  });
  await check('legacy reconstruye solo evidencia y etiqueta visitas y combates como parciales', g => {
    const inm=g.run('inImmersion');
    inm.grid.nodes[1].type='ice'; inm.grid.nodes[1].tier=2; inm.grid.nodes[1].done=true;
    inm.grid.nodes[2].type='daemon'; inm.grid.nodes[2].tier=3; inm.grid.nodes[2].done=true;
    inm.enemiesDefeated=5;
    for(const k of ['visited','enemyCounts','visitsPartial','enemyCountsPartial','exploredNotified','exhaustedNotified']) delete inm[k];
    g.run('save();'); g.sb.__legacy=g.saved();
    assert.equal(g.run('importGameState(window.__legacy)'),true);
    assert.equal(g.run('inImmersion.enemiesDefeated'),5);
    assert.equal(g.run('inImmersion.visited.length'),3);
    assert.equal(g.run('inImmersion.enemyCounts.ice'),1);
    assert.equal(g.run('inImmersion.enemyCounts.daemons'),1);
    assert.equal(g.run('inImmersion.enemyCounts.trackers'),0);
    assert.equal(g.run('inImmersion.visitsPartial'),true);
    assert.equal(g.run('inImmersion.enemyCountsPartial'),true);
    assert.match(g.sb.document.getElementById('gridhud').innerHTML,/parcial/);
    const expected=clone(g.run('inImmersion')); g.run('save();'); g.sb.__legacy=g.saved();
    assert.equal(g.run('importGameState(window.__legacy)'),true);
    assert.deepEqual(clone(g.run('inImmersion')),expected);
    g.run('delete inImmersion.enemyCounts;inImmersion.enemiesDefeated=0;ensureImmersionTracking(inImmersion);save();');
    assert.equal(g.run('inImmersion.enemiesDefeated'),2,'los dos nodos vencidos prueban el mínimo real');
    assert.equal(g.run('validImportState(S)'),true,'la migración no crea un guardado que se rechace al recargar');
    g.run('delete inImmersion.enemiesDefeated;ensureImmersionTracking(inImmersion);save();');
    assert.equal(g.run('inImmersion.enemiesDefeated'),2);
    assert.equal(g.run('validImportState(S)'),true);
  });
  await check('importación rechaza visitas y contadores dañados sin sustituir ni guardar', g => {
    g.run('save();'); const state=g.run('S'), inm=g.run('inImmersion'), raw=g.sb.localStorage.getItem('cypher_os_save_v9');
    const mutations=[s=>s.visited.push('fantasma'),s=>s.visited.push(s.visited[0]),s=>s.visited='0_0',s=>s.visited=[],
      s=>s.visitsPartial='false',s=>s.exploredNotified=1,s=>s.exhaustedNotified='true',s=>s.enemyCountsPartial=0,
      s=>s.enemyCounts.ice='1',s=>s.enemyCounts.daemons=-1,s=>s.enemyCounts.nucleo=0.5,
      s=>s.enemyCounts.trackers=1,s=>s.enemyCounts.ice=1,s=>delete s.enemyCounts.daemons];
    for(const mutate of mutations){
      const candidate=JSON.parse(raw); mutate(candidate._inImmersion); g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false);
      assert.equal(g.run('S'),state); assert.equal(g.run('inImmersion'),inm);
      assert.equal(g.sb.localStorage.getItem('cypher_os_save_v9'),raw);
    }
  });
  await check('tres contratos y CARRERA usan el progreso real y reflejan calor pasivo', g => {
    g.run('S').jobs=[job('recoleta',2,2),job('carrera',2,2),job('rompehielas',2,1)];
    g.run('S.player.heat=45;updateTopbar();');
    assert.match(g.sb.document.getElementById('grid-job-items').innerHTML,/baja el calor para cobrar/);
    assert.match(g.sb.document.getElementById('grid-jobs-summary').textContent,/1\/3/);
    g.run('gameLoop();');
    assert.match(g.sb.document.getElementById('grid-jobs-summary').textContent,/2\/3/);
    assert.equal(g.run('S.jobs.filter(function(j){return j.done;}).length'),0);
    for(const type of ['vault','daemon']){
      g.run('S').jobs=[job(type,1,1)]; g.run('updateGridHud();');
      assert.match(g.sb.document.getElementById('grid-job-items').innerHTML,/objetivo alcanzado/);
    }
    g.run('S.jobs[0].title="<img src=x>";updateGridHud();');
    assert.match(g.sb.document.getElementById('grid-job-items').innerHTML,/&lt;img/);
  });
  await check('actualizar HUD conserva canvas y no renderiza RED oculta', g => {
    const canvas=g.sb.document.getElementById('gridcanvas');
    const neighbor=g.sb.document.querySelector('#adjlist .adj-node');
    g.run('renderGridHud();gameLoop();renderGridHud();');
    assert.equal(g.sb.document.getElementById('gridcanvas'),canvas);
    assert.equal(g.sb.document.querySelector('#adjlist .adj-node'),neighbor,'el reloj no reemplaza controles bajo el dedo');
    g.run('showView("trabajos");'); const html=g.sb.document.getElementById('panel-scroll').innerHTML;
    g.run('updateGridHud();gameLoop();');
    assert.equal(g.sb.document.getElementById('panel-scroll').innerHTML,html);
    assert.equal(g.run('gridRender'),false);
  });
  await check('nuevo DIP reinicia seguimiento y RESET elimina expedientes', g => {
    g.run('unlockProjectDossier("VESPER");recordImmersionEnemy({type:"ice"});inImmersion=null;startImmersion(4);');
    assert.deepEqual(clone(g.run('inImmersion.enemyCounts')),{ice:0,daemons:0,trackers:0,nucleo:0});
    assert.equal(g.run('inImmersion.visited.length'),1);
    assert.equal(g.run('inImmersion.visitsPartial'),false);
    assert.equal(g.run('inImmersion.exhaustedNotified'),false);
    g.run('S=nuevoEstado();ensureStateIntegrity();'); assert.equal(g.run('S.intel.length'),0);
  });
  console.log(`Expedientes/HUD: ${passes} correctas · ${fails} fallos`);
  return options.summary ? {passes,fails,total:passes+fails} : fails;
}
if(require.main===module) run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
