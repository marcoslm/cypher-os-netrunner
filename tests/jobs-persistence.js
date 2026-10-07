/* Cuotas finitas y restauración exacta. Suite Node sin dependencias. */
'use strict';
const assert = require('node:assert/strict');
const { loadGame, clickAction } = require('./harness');
const clone = value => JSON.parse(JSON.stringify(value));
function job(type, n, id = type) {
  const fields = { recoleta:'gathered', carrera:'deepGathered', rompehielas:'iceT2', daemon:'daemons', vault:'vaulted' };
  return { id, type, n, title:type, desc:type, contact:'doctorSudario', reward:100, xp:10,
    done:false, failed:false, prog:{ [fields[type]]:type === 'vault' ? false : 0 },
    ...(type === 'vault' ? { project:'KURO', targetDepth:4 } : {}) };
}
async function run(options = {}) {
  let passes = 0, fails = 0;
  async function check(label, fn) {
    const g = loadGame({ timers:'virtual', seed:2077, strictDOM:true, canvas:'stub' });
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;S._tutorialDone=true;');
      await fn(g); passes++; console.log('  ✔ ' + label);
    } catch (error) { fails++; console.log('  ✖ ' + label + ': ' + error.message); }
    finally { g.dispose(); }
  }
  const setJobs = (g, jobs) => { g.run('S').jobs = jobs; };
  console.log('\nTRABAJOS / PERSISTENCIA · cuotas, RAM y snapshots…');
  await check('ofertas acotadas por grid y RAM hasta nivel 100', g => {
    for (const level of [1,6,30,100]) for (const ram of [0,1,3,6]) {
      g.run(`S.player.level=${level};S.player.ramUp=${ram};`);
      for (const type of ['recoleta','datos','carrera','rompehielas','ice','daemon','vault']) {
        const offer = g.run(`buildOffer('doctorSudario','${type}')`);
        assert.ok(offer.n >= 1);
        assert.ok(offer.n <= g.run(`jobQuotaLimit('${offer.type}')`));
        assert.ok(!offer.desc.includes('undefined'));
      }
    }
  });
  await check('todas las combinaciones de tres contratos tienen objetivos alcanzables', g => {
    const types = ['recoleta','carrera','rompehielas','daemon','vault'];
    let grids = 0;
    for (const difficulty of ['normal','hardcore','legendario']) for (const finalDone of [false,true]) {
      for (const roll of [0,0.3,0.9]) for (let a=0;a<types.length;a++) for (let b=a;b<types.length;b++) for (let c=b;c<types.length;c++) {
        const selected = [types[a],types[b],types[c]];
        if (selected.filter(type => type === 'vault').length > 1) continue;
        g.run(`S=nuevoEstado();ensureStateIntegrity();S.player.level=100;S.difficulty='${difficulty}';S.history.finalDone=${finalDone};S._legendaryTierBoost=${difficulty === 'legendario'};Math.random=function(){return ${roll};};`);
        const limits = { recoleta:6,carrera:4,rompehielas:4,daemon:3,vault:1 };
        setJobs(g, selected.map((type,i) => job(type,limits[type],'job_'+i)));
        const grid = g.run('generateGrid(4,false)');
        for (const item of g.run('S.jobs')) {
          const count = grid.nodes.filter(n => item.type === 'recoleta' ? n.type === 'data' :
            item.type === 'carrera' ? n.type === 'data' && n.layer >= 3 :
            item.type === 'rompehielas' ? n.type === 'ice' && n.tier >= 2 : n.type === item.type).length;
          assert.ok(count >= item.n, `${selected}/${difficulty}/${roll}: ${item.type} ${count}/${item.n}`);
        }
        const visited = new Set([grid.entry]), queue = [grid.entry];
        for (const id of queue) for (const next of grid.adj[id]) if (!visited.has(next)) { visited.add(next); queue.push(next); }
        assert.equal(visited.size,grid.nodes.length);
        assert.ok(grid.nodes.every(n => n.type !== 'daemon' || n.layer >= 2));
        assert.equal(grid.nodes.filter(n => n.boss).length,0);
        grids++;
      }
    }
    assert.equal(grids,540);
    g.run('S.jobs=[];S.jobs.push({type:"vault",done:false,targetDepth:4,project:"KURO"});var bossGrid=generateGrid(5,true);');
    assert.equal(g.run('bossGrid.nodes.filter(function(n){return n.boss;}).length'),1);
    assert.equal(g.run('bossGrid.nodes.filter(function(n){return n.type==="vault";}).length'),1);
  });
  await check('aceptación en inmersión rechaza objetivos consumidos y RAM insuficiente', g => {
    g.run('startImmersion(4);');
    const S = g.run('S'), inm = g.run('inImmersion');
    inm.grid.nodes.forEach(n => { if (n.type === 'ice') n.done = true; });
    const offer = job('rompehielas',4,'oferta'); delete offer.prog; delete offer.done; delete offer.failed;
    S.offers = [offer];
    const gridBefore = clone(inm.grid);
    clickAction(g,'acceptJob',{'data-id':offer.id});
    assert.equal(S.jobs.length,0);
    assert.deepEqual(clone(inm.grid),gridBefore);
    assert.match(g.run('offerHtml(S.offers[0],{id:"doctorSudario"})'),/SIN CAPACIDAD/);
    const target = inm.grid.nodes.find(n => n.layer === 2);
    Object.assign(target,{type:'ice',tier:2,done:false}); offer.n = 1;
    clickAction(g,'acceptJob',{'data-id':offer.id});
    assert.equal(S.jobs.length,1);
    assert.equal(S.jobs[0].prog.iceT2,0);
    const dataOffer = { ...offer, id:'datos', type:'recoleta', n:1 };
    S.offers.push(dataOffer); inm.dataUsed = 6; inm.data = Array.from({length:6},()=>({value:1}));
    clickAction(g,'acceptJob',{'data-id':dataOffer.id});
    assert.equal(S.jobs.length,1);
  });
  await check('SEÑAL y datos superficiales no ocupan RAM reservada para contratos', g => {
    setJobs(g,[job('recoleta',6),job('carrera',4)]); g.run('startImmersion(4);');
    const inm = g.run('inImmersion'), S = g.run('S');
    for (const node of inm.grid.nodes.filter(n => n.layer === 1).slice(0,3)) {
      Object.assign(node,{type:'data',data:10}); inm.current = node.id;
      g.sb.__node = node; g.run('collectData(window.__node);');
    }
    assert.equal(inm.dataUsed,2);
    g.run('GRID_EVENTS[0].effect();');
    assert.equal(inm.dataUsed,2);
    const deep = inm.grid.nodes.filter(n => n.type === 'data' && n.layer >= 3);
    assert.ok(deep.length >= 4);
    for (const node of deep.slice(0,4)) {
      inm.current = node.id; g.sb.__node = node; g.run('collectData(window.__node);');
    }
    assert.equal(S.jobs[0].prog.gathered,6);
    assert.equal(S.jobs[1].prog.deepGathered,4);
    const before = clone(S.jobs); S.player.ramUp = 1;
    g.run('GRID_EVENTS[0].effect();');
    assert.equal(inm.dataUsed,7);
    assert.deepEqual(clone(S.jobs),before);
  });
  await check('ICE T2/T3 y rastreadores cuentan una vez; T1 y daemons no cuentan', g => {
    setJobs(g,[job('rompehielas',4),job('daemon',3)]); g.run('startImmersion(4);');
    for (const [type,tier] of [['ice',1],['daemon',3],['ice',2],['ice',3]]) {
      g.run(`var testEnemy={type:'${type}',tier:${tier},tierName:'T${tier}',name:'TEST',done:false};onNodeDefeated({node:testEnemy});onNodeDefeated({node:testEnemy});`);
    }
    assert.equal(g.run('S.jobs[0].prog.iceT2'),2);
    assert.equal(g.run('S.jobs[1].prog.daemons'),1);
    g.run('S.player.heat=60;inImmersion.current=inImmersion.grid.entry;Math.random=function(){return 0;};tryScavenger();window.__oldWin=COM.ctx.onWin;');
    for (let i=0;i<4 && g.run('combatActive');i++) {
      const input = g.sb.document.getElementById('codeInput');
      input.value = g.run('COM.code'); g.emitElement(input,'input');
    }
    assert.equal(g.run('combatActive'),false);
    assert.equal(g.run('S.jobs[0].prog.iceT2'),3);
    const stats = clone(g.run('S.player.stats'));
    g.run('window.__oldWin();');
    assert.deepEqual(clone(g.run('S.player.stats')),stats);
    assert.equal(g.run('S.jobs[0].prog.iceT2'),3);
    assert.match(g.run('progText(S.jobs[0])'),/daemons no cuentan/);
  });
  await check('un DIP activo no regenera; una red nueva no hereda progreso sin snapshot', g => {
    setJobs(g,[job('recoleta',2)]); g.run('S.jobs[0].prog.gathered=1;startImmersion(4);');
    assert.equal(g.run('S.jobs[0].prog.gathered'),0);
    g.run('S.jobs[0].prog.gathered=1;');
    const before = clone(g.run('inImmersion'));
    g.run('startImmersion(5);');
    assert.deepEqual(clone(g.run('inImmersion')),before);
    assert.equal(g.run('S.jobs[0].prog.gathered'),1);
  });
  await check('cuotas legacy se rectifican una vez conservando victorias y nodos', g => {
    setJobs(g,[job('rompehielas',4)]); g.run('startImmersion(4);S.jobs[0].n=12;S.jobs[0].prog.iceT2=2;delete S._jobQuotaVersion;');
    const inm = g.run('inImmersion');
    inm.grid.nodes.forEach(n => { if (n.type === 'ice') n.done = true; });
    const before = clone(inm);
    g.run('save();'); g.sb.__legacy=g.saved();
    assert.equal(g.run('importGameState(window.__legacy)'),true);
    assert.equal(g.sb.__legacy.jobs[0].n,12,'la migración no muta el candidato externo');
    assert.equal(g.run('S.jobs[0].n'),2);
    assert.equal(g.run('S.jobs[0].prog.iceT2'),2);
    assert.deepEqual(clone(g.run('inImmersion')),before);
    g.run('migrateJobQuotas();');
    assert.equal(g.run('S.jobs[0].n'),2);
    g.run('S.player.heat=0;doSuperficializar();');
    assert.equal(g.run('S.jobs[0].failed'),false);
    assert.equal(g.run('S.player.credits'),600);
  });
  await check('objetivo legacy vacío se retira sin pago ni calor y sin doble fracaso', g => {
    setJobs(g,[job('daemon',3)]); g.run('startImmersion(4);delete S._jobQuotaVersion;');
    g.run('inImmersion.grid.nodes.forEach(function(n){if(n.type==="daemon")n.done=true;});');
    const heat = g.run('S.player.heat'); g.run('migrateJobQuotas();migrateJobQuotas();');
    assert.equal(g.run('S.jobs[0].done'),true);
    assert.equal(g.run('S.jobs[0].failed'),true);
    assert.equal(g.run('S.player.stats.jobsFailed'),1);
    assert.equal(g.run('S.player.credits'),500);
    assert.equal(g.run('S.player.heat'),heat);
  });
  await check('cuatro ciclos exportar/reset/importar y boot conservan el grid exacto', g => {
    setJobs(g,[job('recoleta',2),job('rompehielas',4)]); g.run('startImmersion(4);');
    const inm = g.run('inImmersion');
    const data = inm.grid.nodes.find(n=>n.type==='data');
    inm.current=data.id; inm.maxDepthReached=data.layer; g.sb.__node=data; g.run('collectData(window.__node);');
    const ice = inm.grid.nodes.find(n=>n.type==='ice' && n.tier>=2);
    g.sb.__node=ice; g.run('onNodeDefeated({node:window.__node});');
    const sub = inm.grid.nodes.find(n=>!n.done && n.layer>0 && n.type!=='vault');
    Object.assign(sub,{type:'substation',tier:0,data:0,_used:false});
    g.sb.__node=sub; g.run('useSubstation(window.__node);');
    data._revealed=true; ice._hiddenMoves=2; inm.moves=12;
    const expected = clone(inm), player = clone(g.run('S.player')), jobs = clone(g.run('S.jobs'));
    for (let cycle=0;cycle<4;cycle++) {
      g.emitElement('btn-export','click');
      const exported = JSON.parse(g.sb.__blobs.at(-1).parts.join(''));
      assert.deepEqual(exported._inImmersion,expected);
      g.emitElement('btn-reset','click'); clickAction(g,'confirmYes');
      if(cycle===2) g.run('showView("red");');
      g.sb.FileReader=function(){this.readAsText=()=>this.onload({target:{result:JSON.stringify(exported)}});};
      const input=g.sb.document.getElementById('import-file'); input.files=[{name:'grid.json'}];
      g.emitElement(input,'change',{target:input});
      assert.deepEqual(clone(g.run('inImmersion')),expected);
      assert.ok(g.sb.document.querySelector('[data-action="doSuperficie"]'));
      assert.equal(g.sb.document.querySelector('[data-action="dipGrid"]'),null);
      assert.deepEqual(clone(g.run('S.player')),player);
      assert.deepEqual(clone(g.run('S.jobs')),jobs);
      for (const id of [data.id,ice.id,sub.id]) g.run(`enterNode(nodeById('${id}'));`);
      assert.equal(g.run('combatActive'),false);
      assert.deepEqual(clone(g.run('S.player')),player);
      assert.deepEqual(clone(g.run('S.jobs')),jobs);
      assert.ok(g.run('inImmersion.grid.byLayer.every(function(layer){return layer.every(function(n){return n===nodeById(n.id);});})'));
    }
    g.run('afterBoot();');
    assert.deepEqual(clone(g.run('inImmersion')),expected);
  });
  await check('importación rechaza grafos, recompensas, flags y progreso dañados sin sustituir sesión', g => {
    setJobs(g,[job('recoleta',2)]); g.run('startImmersion(4);save();');
    const raw=g.sb.localStorage.getItem('cypher_os_save_v9'), original=g.run('S'), originalInm=g.run('inImmersion');
    const corruptions = [
      s=>s._inImmersion.grid.nodes[1].id=s._inImmersion.grid.nodes[0].id,
      s=>s._inImmersion.grid.entry='fantasma', s=>s._inImmersion.current='fantasma',
      s=>s._inImmersion.grid.adj['0_0'].push('fantasma'),
      s=>s._inImmersion.grid.adj['1_0']=[],
      s=>s._inImmersion.grid.byLayer[1][0]=null,
      s=>s._inImmersion.grid.nodes[1].done='false',
      s=>s._inImmersion.grid.nodes[1].tier='2',
      s=>s._inImmersion.grid.nodes.find(n=>n.type==='data').data='dañado',
      s=>s._inImmersion.dataUsed=1,
      s=>s._inImmersion.moves=-1, s=>s._inImmersion.depth=4.5,
      s=>s._inImmersion.combatOccurred='false', s=>s._inImmersion.enemiesDefeated='0',
      s=>s.jobs[0].prog.gathered='0', s=>s.jobs[0].n='2', s=>s.jobs[0].reward='100', s=>s.jobs[0].xp=-1,
      s=>s.jobs.push(job('vault',1,'vault1'),job('vault',1,'vault2'))
    ];
    for (const corrupt of corruptions) {
      const candidate=JSON.parse(raw); corrupt(candidate); g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false);
      assert.equal(g.run('S'),original); assert.equal(g.run('inImmersion'),originalInm);
      assert.equal(g.sb.localStorage.getItem('cypher_os_save_v9'),raw);
    }
    const legacy=JSON.parse(raw);
    delete legacy._jobQuotaVersion; delete legacy._inImmersion.combatOccurred; delete legacy._inImmersion.enemiesDefeated;
    legacy._inImmersion.grid.nodes.forEach(n=>{delete n.done;delete n._done;delete n._used;});
    g.sb.__legacy=legacy;
    assert.equal(g.run('importGameState(window.__legacy)'),true,'campos opcionales legacy siguen admitidos');
    assert.equal(g.run('inImmersion.grid.nodes.length'),legacy._inImmersion.grid.nodes.length);
    const candidate=JSON.parse(raw); candidate._inImmersion.grid.nodes[1].data='dañado';
    g.sb.localStorage.setItem('cypher_os_save_v9',JSON.stringify(candidate));
    assert.equal(g.run('load()'),null);
    assert.equal(g.sb.localStorage.getItem('cypher_os_save_recovery_v9'),JSON.stringify(candidate));
  });
  console.log(`Trabajos/persistencia: ${passes} correctas · ${fails} fallos`);
  return options.summary ? { passes,fails,total:passes+fails } : fails;
}
if (require.main === module) run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
