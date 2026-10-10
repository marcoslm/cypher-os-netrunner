/* F03: cantidad variable y mínimo repetible por fixer. Node sin dependencias. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
const contacts=['mamaWire','doctorSudario','night0X','kairos'];
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();');
      await fn(g); passes++; console.log('  ✔ '+label);
    } catch(error) {fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally {g.dispose();}
  }
  function unlocked(g) {g.run('S.player.level=4;S.player.rep.night0X=2;');}
  function exhaust(g) {g.run('PROYECTOS.forEach(unlockProjectDossier);');}
  function assertMinimum(offers,maxima={mamaWire:2,doctorSudario:3,night0X:3,kairos:3}) {
    for(const contact of contacts) {
      const own=offers.filter(o=>o.contact===contact);
      assert.ok(own.length>=1&&own.length<=maxima[contact],`${contact}: ${own.length}`);
      assert.ok(own.some(o=>o.type!=='vault'),contact+': repetible garantizado');
      assert.equal(new Set(own.map(o=>o.type)).size,own.length,contact+': tipos sin repetir');
    }
    const vaults=offers.filter(o=>o.type==='vault');
    assert.equal(new Set(vaults.map(o=>o.project)).size,vaults.length,'proyectos distintos entre canales');
  }
  console.log('\nFIXERS / OFERTAS · variación, mínimos y estabilidad…');
  await check('24 semillas muestran todas las cantidades, tipos y proyectos sin romper el mínimo',()=>{
    const counts=Object.fromEntries(contacts.map(id=>[id,new Set()]));
    const types=Object.fromEntries(contacts.map(id=>[id,new Set()])),projects=new Set();
    for(let seed=1;seed<=24;seed++) {
      const sample=loadGame({timers:'virtual',seed,strictDOM:true,canvas:'stub'});
      try {
        sample.run('S=nuevoEstado();ensureStateIntegrity();S.player.level=4;S.player.rep.night0X=2;');
        for(let refresh=0;refresh<4;refresh++) {
          sample.run('generateOffers();'); const offers=sample.run('S.offers');
          assertMinimum(offers);
          for(const id of contacts) {
            const own=offers.filter(o=>o.contact===id);counts[id].add(own.length);
            for(const o of own) {types[id].add(o.type);if(o.type==='vault')projects.add(o.project);}
          }
          assert.equal(new Set(offers.map(o=>o.id)).size,offers.length);
        }
      } finally {sample.dispose();}
    }
    for(const id of contacts) assert.deepEqual([...counts[id]].sort(),id==='mamaWire'?[1,2]:[1,2,3]);
    assert.deepEqual([...types.mamaWire].sort(),['carrera','recoleta']);
    assert.deepEqual([...types.doctorSudario].sort(),['recoleta','rompehielas','vault']);
    assert.deepEqual([...types.night0X].sort(),['carrera','daemon','vault']);
    assert.deepEqual([...types.kairos].sort(),['daemon','rompehielas','vault']);
    assert.equal(projects.size,8);
  });
  await check('extremos del RNG producen mínimo y máximo reales, siempre con repetible',g=>{
    unlocked(g);
    for(const [roll,total] of [[0,4],[0.999999,11]]) {
      g.run(`Math.random=function(){return ${roll};};generateOffers();`);
      const offers=g.run('S.offers'); assert.equal(offers.length,total); assertMinimum(offers);
      for(const id of contacts) assert.equal(offers.filter(o=>o.contact===id).length,roll===0?1:(id==='mamaWire'?2:3));
    }
  });
  await check('ocho recuperados reducen el rango a uno o dos sin rellenar vaults',g=>{
    unlocked(g);exhaust(g);
    const seen=Object.fromEntries(contacts.map(id=>[id,new Set()]));
    for(let refresh=0;refresh<48;refresh++) {
      g.run('generateOffers();');const offers=g.run('S.offers');
      assertMinimum(offers,Object.fromEntries(contacts.map(id=>[id,2])));
      assert.ok(offers.every(o=>o.type!=='vault'));
      for(const id of contacts) seen[id].add(offers.filter(o=>o.contact===id).length);
    }
    for(const id of contacts) assert.deepEqual([...seen[id]].sort(),[1,2]);
  });
  await check('el último proyecto sigue pudiendo aparecer sin duplicarse y reservados nunca se reofertan',g=>{
    unlocked(g);g.run('PROYECTOS.filter(function(p){return p!=="VESPER";}).forEach(unlockProjectDossier);');
    let seen=false;
    for(let refresh=0;refresh<48;refresh++) {
      g.run('generateOffers();');const vaults=g.run('S.offers').filter(o=>o.type==='vault');
      assert.ok(vaults.length<=1);assert.ok(vaults.every(o=>o.project==='VESPER'));
      if(vaults.length) seen=true;assertMinimum(g.run('S.offers'));
    }
    assert.ok(seen,'el último proyecto no queda inaccesible');
    g.run('S.jobs=[{id:"reservado",title:"VESPER",desc:"VESPER",type:"vault",n:1,contact:"night0X",reward:100,xp:10,targetDepth:4,project:"VESPER",done:false,failed:false,prog:{vaulted:false}}];generateOffers();');
    assert.equal(g.run('S.offers.filter(function(o){return o.type==="vault";}).length'),0);
    assertMinimum(g.run('S.offers'),Object.fromEntries(contacts.map(id=>[id,2])));
  });
  await check('Kairos conserva ambos requisitos de desbloqueo antes de recibir su mínimo',g=>{
    for(const [level,rep,available] of [[3,2,false],[4,1,false],[4,2,true]]) {
      g.run(`S.player.level=${level};S.player.rep.night0X=${rep};generateOffers();`);
      const own=g.run('S.offers').filter(o=>o.contact==='kairos');
      assert.equal(own.length>0,available);
      if(available) assert.ok(own.some(o=>o.type!=='vault'));
      for(const id of contacts.slice(0,3)) assert.ok(g.run('S.offers').some(o=>o.contact===id));
    }
  });
  await check('el primer trabajo de Mama Wire conserva RECOLECTA fácil aunque varíe la cantidad',g=>{
    const counts=new Set();
    for(let refresh=0;refresh<32;refresh++) {
      g.run('generateOffers();');const own=g.run('S.offers').filter(o=>o.contact==='mamaWire');
      counts.add(own.length);assert.ok(own.some(o=>o.type==='recoleta'));
    }
    assert.deepEqual([...counts].sort(),[1,2]);
  });
  await check('visitar, exportar, importar y cargar no vuelven a sortear ofertas',g=>{
    unlocked(g);g.run('generateOffers();save();');const expected=clone(g.run('S.offers'));
    g.run('renderContactos();showView("inicio");showView("contactos");save();afterBoot();');
    assert.deepEqual(clone(g.run('S.offers')),expected);
    g.emitElement('btn-export','click');const exported=JSON.parse(g.sb.__blobs.at(-1).parts.join(''));
    assert.deepEqual(exported.offers,expected);g.sb.__candidate=exported;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    assert.deepEqual(clone(g.run('S.offers')),expected);
    assert.deepEqual(exported.offers,expected,'no modifica el candidato externo');
  });
  await check('refrescar persiste la oferta sin cambiar contrato, grafo, XP, dinero ni reputación',g=>{
    unlocked(g);g.run('generateOffers();');
    const accepted=g.run('S.offers').find(o=>o.type!=='vault');
    clickAction(g,'acceptJob',{'data-id':accepted.id});g.run('startImmersion(4);');
    const jobs=clone(g.run('S.jobs')),inm=clone(g.run('inImmersion')),player=clone(g.run('S.player'));
    const previous=clone(g.run('S.offers'));
    clickAction(g,'refreshOffers');
    assert.notDeepEqual(clone(g.run('S.offers')),previous);assertMinimum(g.run('S.offers'));
    assert.deepEqual(g.saved().offers,clone(g.run('S.offers')));
    assert.deepEqual(clone(g.run('S.jobs')),jobs);assert.deepEqual(clone(g.run('inImmersion')),inm);
    assert.deepEqual(clone(g.run('S.player')),player);
  });
  await check('catálogo sin tipos elegibles muestra estado vacío, sin ofertas decorativas ni bucles',g=>{
    exhaust(g);g.run('CONTACTOS_DEF[0].jobs=[];CONTACTOS_DEF[1].jobs=["vault"];generateOffers();renderContactos();');
    assert.equal(g.run('S.offers.filter(function(o){return o.contact==="mamaWire"||o.contact==="doctorSudario";}).length'),0);
    assert.match(g.sb.document.getElementById('offers-mamaWire').textContent,/sin ofertas ahora/);
    assert.match(g.sb.document.getElementById('offers-doctorSudario').textContent,/sin ofertas ahora/);
    assert.ok(g.run('S.offers').some(o=>o.contact==='night0X'));
  });
  await check('tras agotar vaults aún se completa reputación 5/5 con los cuatro fixers',g=>{
    unlocked(g);exhaust(g);g.run('S.player.rep={mamaWire:4,doctorSudario:4,night0X:4,kairos:4};');
    for(const contact of contacts) {
      g.run('generateOffers();');const o=g.run('S.offers').find(o=>o.contact===contact&&o.type!=='vault');
      assert.ok(o);clickAction(g,'acceptJob',{'data-id':o.id});g.run('startImmersion(4);');
      const inm=g.run('inImmersion'),j=g.run('S.jobs').find(j=>!j.done);
      const nodes=inm.grid.nodes.filter(n=>j.type==='recoleta'?n.type==='data':j.type==='carrera'?n.type==='data'&&n.layer>=3:j.type==='rompehielas'?n.type==='ice'&&n.tier>=2:n.type==='daemon');
      assert.ok(nodes.length>=j.n);
      for(const n of nodes.slice(0,j.n)) {
        inm.current=n.id;inm.maxDepthReached=Math.max(inm.maxDepthReached,n.layer);g.sb.__node=n;
        g.run('recordImmersionVisit(window.__node.id);');
        g.run(j.type==='recoleta'||j.type==='carrera'?'collectData(window.__node);':'onNodeDefeated({node:window.__node});');
      }
      g.run('doSuperficializar();');clickAction(g,'closeResume');
      assert.equal(g.run('S.player.rep')[contact],5);assert.equal(j.done,true);assert.equal(j.failed,false);
    }
    assert.ok(g.run('S.achievements').includes('allFixers'));
    assert.equal(g.run('S.player.stats.jobsCompleted'),4);
  });
  console.log(`Fixers/ofertas: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
