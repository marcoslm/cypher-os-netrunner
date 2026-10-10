/* F02: proyectos finitos, ofertas antiguas y contratos legacy. Node sin dependencias. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
function job(project='KURO',id='vault',extra={}) {
  return {id,title:'EL VAULT DE KURO GATECH',desc:'Recupera '+project,type:'vault',n:1,
    contact:'doctorSudario',risk:'high',reward:100,xp:10,project,targetDepth:4,
    prog:{vaulted:false},done:false,failed:false,...extra};
}
function offer(project='KURO',id='oferta',contact='doctorSudario') {
  const result=job(project,id); delete result.prog; delete result.done; delete result.failed;
  result.contact=contact; return result;
}
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();');
      await fn(g); passes++; console.log('  ✔ '+label);
    } catch(error) { fails++; console.log('  ✖ '+label+': '+error.stack); }
    finally {g.dispose();}
  }
  console.log('\nVAULTS / OFERTAS · proyectos finitos y compatibilidad…');
  await check('ofertas nuevas excluyen recuperados y reservados, sin duplicar proyectos entre fixers',g=>{
    g.run('S.player.level=4;S.player.rep.night0X=2;unlockProjectDossier("KURO");');
    g.run('S').jobs=[job('SOMNIO')];
    for(let refresh=0;refresh<24;refresh++) {
      g.run('generateOffers();');
      const vaults=g.run('S.offers').filter(o=>o.type==='vault');
      assert.equal(vaults.length,3);
      assert.equal(new Set(vaults.map(o=>o.project)).size,vaults.length);
      assert.ok(vaults.every(o=>!['KURO','SOMNIO'].includes(o.project)));
      for(const o of vaults) {
        const corp=g.run('PROYECTO_CORP')[o.project];
        if(corp) assert.equal(o.title,'EL VAULT DE '+corp);
        else assert.ok(['EL VAULT DE KURO GATECH','EL VAULT DE MONOLITH'].includes(o.title));
      }
      assert.equal(g.run('S.offers').filter(o=>o.type!=='vault').length,8);
    }
  });
  await check('con uno o cero proyectos pendientes no inventa vaults ni quita trabajos repetibles',g=>{
    const projects=Array.from(g.run('PROYECTOS'));
    g.run('S.player.level=4;S.player.rep.night0X=2;');
    for(const project of projects.slice(0,-1)) g.run(`unlockProjectDossier('${project}');`);
    g.run('generateOffers();');
    const vaults=g.run('S.offers').filter(o=>o.type==='vault');
    assert.equal(vaults.length,1); assert.equal(vaults[0].project,projects.at(-1));
    g.run(`unlockProjectDossier('${projects.at(-1)}');generateOffers();`);
    assert.equal(g.run('buildOffer("doctorSudario","vault")'),null);
    assert.equal(g.run('S.offers').filter(o=>o.type==='vault').length,0);
    assert.equal(g.run('S.offers.length'),8);
    for(const id of ['mamaWire','doctorSudario','night0X','kairos']) assert.equal(g.run('S.offers').filter(o=>o.contact===id).length,2);
    g.run('renderContactos();');
    assert.match(g.sb.document.getElementById('panel-scroll').textContent,/proyectos.*recuperados/i);
  });
  await check('vista y handler bloquean ofertas antiguas recuperadas, también antes del límite de activos',g=>{
    g.run('unlockProjectDossier("KURO");');
    const S=g.run('S'); S.offers=[offer()];
    const player=clone(S.player), jobs=clone(S.jobs);
    assert.match(g.run('offerHtml(S.offers[0],CONTACTOS_DEF[1])'),/PROYECTO RECUPERADO/);
    assert.ok(!g.run('offerHtml(S.offers[0],CONTACTOS_DEF[1])').includes('data-action="acceptJob"'));
    clickAction(g,'acceptJob',{'data-id':'oferta'});
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/ya recuperaste/);
    assert.deepEqual(clone(S.player),player); assert.deepEqual(clone(S.jobs),jobs);
    g.run('startImmersion(4);'); S.offers=[offer()];
    assert.match(g.run('jobOfferBlocked(S.offers[0])'),/ya recuperaste/);
  });
  await check('aceptación revalida proyecto reservado sin admitir duplicados por distinto id',g=>{
    const S=g.run('S'); S.jobs=[job()]; S.offers=[offer('KURO','otra','night0X')];
    assert.match(g.run('offerHtml(S.offers[0],CONTACTOS_DEF[2])'),/PROYECTO EN CURSO/);
    clickAction(g,'acceptJob',{'data-id':'otra'});
    assert.equal(S.jobs.length,1); assert.equal(S.jobs[0].prog.vaulted,false);
  });
  await check('resolver retira ofertas del mismo proyecto inmediatamente y conserva pago único al superficializar',g=>{
    const S=g.run('S'); S.jobs=[job()]; S.offers=[offer(),offer('KURO','duplicada','night0X'),offer('MIRAJE','otra')];
    g.run('startImmersion(4);');
    const n=g.run('inImmersion').grid.nodes.find(n=>n.type==='vault'); g.sb.__node=n;
    g.run('onNodeDefeated({node:window.__node});');
    assert.ok(S.intel.includes('exp_kuro')); assert.equal(S.jobs[0].prog.vaulted,true);
    assert.equal(S.jobs[0].done,false); assert.equal(S.player.credits,500);
    assert.deepEqual(S.offers.map(o=>o.project),['MIRAJE']);
    assert.equal(g.saved().offers.filter(o=>o.project==='KURO').length,0);
    const player=clone(S.player); g.run('onNodeDefeated({node:window.__node});ensureStateIntegrity();');
    assert.deepEqual(clone(S.player),player); assert.equal(S.jobs[0].done,false);
    g.run('doSuperficializar();');
    assert.equal(S.player.credits,600); assert.equal(S.player.stats.jobsCompleted,1);
    g.run('completeJob(S.jobs[0]);');
    assert.equal(S.player.credits,600); assert.equal(S.player.stats.jobsCompleted,1);
  });
  await check('legacy sin snapshot conserva recuperación propia pendiente, incluso al siguiente DIP',g=>{
    const candidate=clone(g.run('nuevoEstado()'));
    candidate._tutorialDone=true; candidate.jobs=[job('KURO','pendiente',{prog:{vaulted:true}})];
    candidate.offers=[offer()]; g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.equal(candidate.offers.length,1,'no muta el candidato importado');
    assert.equal(g.run('S.jobs[0].done'),false); assert.equal(g.run('S.player.credits'),500);
    g.run('startImmersion(4);');
    assert.equal(g.run('S.jobs[0].prog.vaulted'),true);
    assert.equal(g.run('inImmersion.grid.nodes.filter(function(n){return n.type==="vault";}).length'),0);
    g.run('doSuperficializar();');
    assert.equal(g.run('S.player.credits'),600); assert.equal(g.run('S.jobs[0].failed'),false);
  });
  await check('evidencia de snapshot legacy recupera expediente y progreso sin cambiar red ni pagar',g=>{
    g.run('S').jobs=[job()]; g.run('startImmersion(4);');
    const n=g.run('inImmersion').grid.nodes.find(n=>n.type==='vault'); n.done=true;
    g.run('save();'); const candidate=g.saved(), grid=clone(candidate._inImmersion.grid), player=clone(candidate.player);
    assert.equal(candidate.jobs[0].prog.vaulted,false); candidate.offers=[offer()]; g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.ok(g.run('S.intel').includes('exp_kuro'));
    assert.equal(g.run('S.jobs[0].prog.vaulted'),true); assert.equal(g.run('S.jobs[0].done'),false);
    assert.deepEqual(clone(g.run('inImmersion.grid')),grid);
    assert.deepEqual(clone(g.run('S.player')),player);
    assert.equal(g.run('S.offers.length'),0);
  });
  await check('legacy repetido se retira una vez sin calor, créditos, XP ni reputación extra',g=>{
    const candidate=clone(g.run('nuevoEstado()'));
    candidate._tutorialDone=true; candidate.player.heat=35;
    candidate.jobs=[job('KURO','cobrado',{done:true,prog:{vaulted:true}}),job('KURO','duplicado',{prog:{vaulted:true}})];
    candidate.offers=[offer()]; const player=clone(candidate.player); g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    const retired=g.run('S.jobs[1]');
    assert.equal(retired.done,true); assert.equal(retired.failed,true); assert.equal(retired._vaultRetired,true);
    assert.equal(retired.prog.vaulted,true,'conserva evidencia y progreso');
    assert.equal(g.run('S.player.stats.jobsFailed'),1);
    const expected=clone(player); expected.stats.jobsFailed=1; expected._unlockedSkills=[];
    assert.deepEqual(clone(g.run('S.player')),expected);
    assert.match(g.run('progText(S.jobs[1])'),/retirado/);
    g.run('ensureStateIntegrity();ensureStateIntegrity();save();afterBoot();');
    assert.equal(g.run('S.player.stats.jobsFailed'),1);
    assert.equal(g.run('S.log.filter(function(e){return e.text.indexOf("CONTRATO RECTIFICADO")===0;}).length'),1);
  });
  await check('contrato sin recuperación propia se retira si el expediente demuestra adquisición anterior',g=>{
    const S=g.run('S'); S.intel=['exp_kuro']; S.jobs=[job()];
    const before=clone(S.player); g.run('ensureStateIntegrity();');
    assert.equal(S.jobs[0]._vaultRetired,true); assert.equal(S.jobs[0].done,true);
    assert.equal(S.player.heat,before.heat); assert.equal(S.player.credits,before.credits); assert.equal(S.player.xp,before.xp);
    assert.equal(S.player.stats.jobsFailed,1);
  });
  await check('fallos sin recuperación no agotan proyectos y lore/ofertas/contadores no prueban adquisición',g=>{
    const S=g.run('S'); S.jobs=[job('KURO','fallo',{done:true,failed:true})];
    S.intel=['kuro','kuro_abandonado','vesper']; S.player.stats.jobsCompleted=99; S.player.rep.doctorSudario=5;
    S.offers=[offer()]; g.run('ensureStateIntegrity();');
    assert.equal(g.run('projectRecovered("KURO")'),false);
    assert.equal(g.run('S.offers.length'),1);
    assert.ok(g.run('buildOffer("doctorSudario","vault")'));
    S.jobs.push(job('MIRAJE','recuperado-fallido',{done:true,failed:true,prog:{vaulted:true}}));
    g.run('ensureStateIntegrity();'); assert.equal(g.run('projectRecovered("MIRAJE")'),true);
  });
  await check('nodo legacy recuperado no abre puzzle, concede XP ni deja un objetivo imposible',g=>{
    g.run('startImmersion(4);'); const inm=g.run('inImmersion');
    inm.grid.nodes.forEach(n=>{n.type='empty';}); inm.grid.nodes[0].type='puerto';
    const n=inm.grid.nodes[1]; Object.assign(n,{type:'vault',tier:3,proj:'KURO',done:false});
    g.run('unlockProjectDossier("KURO");'); const before=clone(g.run('S.player')), grid=clone(inm.grid);
    g.sb.__node=n; g.run('startVaultPuzzle(window.__node);onNodeDefeated({node:window.__node});');
    assert.equal(g.run('combatActive'),false); assert.equal(g.run('VAULT_PUZZLE'),null);
    assert.deepEqual(clone(g.run('S.player')),before); assert.deepEqual(clone(inm.grid),grid);
    assert.equal(g.run('gridCompletion(inImmersion).pending'),0);
  });
  await check('importar sin progreso y NUEVO REGISTRO no heredan vaults de la sesión ni de best',g=>{
    g.run('unlockProjectDossier("KURO");S.best.finalDone=true;');
    const candidate=clone(g.run('nuevoEstado()')); candidate._tutorialDone=true; candidate.offers=[offer()];
    g.sb.__candidate=candidate; assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.equal(g.run('projectRecovered("KURO")'),false); assert.equal(g.run('S.offers.length'),1);
    g.run('unlockProjectDossier("KURO");S.best.finalDone=true;');
    clickAction(g,'newRecord'); clickAction(g,'confirmYes');
    assert.equal(g.run('projectRecovered("KURO")'),false); assert.equal(g.run('S.best.finalDone'),true);
    assert.ok(g.run('S.offers').some(o=>o.type==='vault'));
  });
  await check('RECONEXIÓN conserva solo evidencia del checkpoint y permite reofertar lo perdido',g=>{
    g.run('S').jobs=[job()]; g.run('startImmersion(4);save();');
    const checkpoint=clone(g.saved());
    g.run('unlockProjectDossier("KURO");S.player.cpu=0;');
    g.run('S')._reconnectCheckpoint=checkpoint; clickAction(g,'reconnect');
    assert.equal(g.run('projectRecovered("KURO")'),false);
    assert.equal(g.run('S.jobs[0].failed'),true);
    g.run('S.jobs=[];startImmersion(4);');
    const n=g.run('inImmersion').grid.nodes[1]; Object.assign(n,{type:'vault',tier:3,proj:'KURO'});
    g.sb.__node=n; g.run('onNodeDefeated({node:window.__node});save();');
    const recovered=clone(g.saved());
    g.run('S.player.cpu=0;'); g.run('S')._reconnectCheckpoint=recovered; clickAction(g,'reconnect');
    assert.equal(g.run('projectRecovered("KURO")'),true);
  });
  await check('marca administrativa malformada se rechaza antes de sustituir sesión',g=>{
    g.run('save();'); const raw=g.sb.localStorage.getItem('cypher_os_save_v9'), original=g.run('S');
    for(const marker of ['true',1,true]) {
      const candidate=JSON.parse(raw); candidate.jobs=[job('KURO','dañado',{_vaultRetired:marker})];
      g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false);
      assert.equal(g.run('S'),original); assert.equal(g.sb.localStorage.getItem('cypher_os_save_v9'),raw);
    }
  });
  console.log(`Vaults/ofertas: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module) run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
