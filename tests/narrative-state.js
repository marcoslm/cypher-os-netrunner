'use strict';
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');
const clone = value => JSON.parse(JSON.stringify(value));

async function run(options = {}) {
  let passes = 0, fails = 0;
  function check(label, action) {
    const game = loadGame({ timers: 'virtual', strictDOM: true, canvas: 'stub', seed: 2093 });
    try {
      game.run('S=nuevoEstado();');
      action(game);
      passes++;
      console.log('  OK ' + label);
    } catch (error) {
      fails++;
      console.log('  FAIL ' + label + ': ' + error.stack);
    } finally { game.dispose(); }
  }
  const activate = game => game.run('storyFinishPrologue();storyBeginRecovery();');
  const invoke = (game, name, id) => game.run(name + '(' + JSON.stringify(id) + ')');
  function returnProof(game, id) {
    game.run('inImmersion={depth:storyItem(STORY_CHAPTERS,' + JSON.stringify(id) + ').depth,grid:{nodes:[{id:"proof",storyChapter:' + JSON.stringify(id) + ',storyDefense:"guard",done:false},{id:"guard",type:"ice",done:true}]},dataUsed:0,data:[]};inImmersion.current="proof";');
    assert.equal(game.run('storyCollectProof(inImmersion.grid.nodes[0])'), true);
    game.run('inImmersion.grid.entry="port";inImmersion.current="port";');
    assert.equal(invoke(game, 'storyReturnCase', id), true);
    game.run('inImmersion=null;');
  }
  const resolve = (game, id) => {
    assert.equal(invoke(game, 'storyAcceptCase', id), true);
    returnProof(game, id);
    assert.equal(invoke(game, 'storyResolveCase', id), true);
  };

  console.log('\nNARRATIVA F1');
  check('catalogos e inicio independientes', game => {
    assert.equal(game.run('STORY_CHAPTERS.length'), 8);
    assert.equal(game.run('STORY_FILES.length'), 16);
    assert.equal(game.run('STORY_CONVERSATIONS.length'), 22);
    assert.equal(game.run('validNarrativeState(S.narrative)'), true);
    game.run('window.other=newNarrativeState();window.other.files.l_estancia="readable";');
    assert.equal(game.run('S.narrative.files.l_estancia'), 'unknown');
  });
  check('recuperacion y alias sin saltar capitulos', game => {
    assert.equal(game.run('storyBeginRecovery()'), false);
    activate(game);
    assert.equal(game.run('storyBeginRecovery()'), false);
    assert.equal(invoke(game, 'storyAcceptCase', 'c02'), false);
    assert.equal(invoke(game, 'storyAcceptCase', 'c01'), true);
    assert.equal(game.run('S.narrative.aliasAcquired'), true);
    assert.equal(game.run('validNarrativeState(S.narrative)'), true);
  });
  check('prueba exige paquete y defensa consumida', game => {
    activate(game);
    invoke(game, 'storyAcceptCase', 'c01');
    assert.equal(invoke(game, 'storyReturnCase', 'c01'), false);
    game.run('inImmersion={depth:1,current:"proof",grid:{nodes:[{id:"guard",type:"ice",done:false},{id:"proof",done:false,storyChapter:"c01",storyDefense:"guard"}]},dataUsed:0,data:[]};');
    assert.equal(game.run('storyCollectProof(inImmersion.grid.nodes[1])'), false);
    game.run('inImmersion.grid.nodes[0].done=true;');
    game.run('inImmersion.dataUsed=ramCap();');
    assert.equal(game.run('storyCollectProof(inImmersion.grid.nodes[1])'), false);
    assert.equal(game.run('inImmersion.grid.nodes[1].done'), false);
    game.run('inImmersion.dataUsed=0;');
    assert.equal(game.run('storyCollectProof(inImmersion.grid.nodes[1])'), true);
    assert.equal(game.run('inImmersion.dataUsed'), 1);
    assert.equal(game.run('inImmersion.data.length'), 0);
    assert.equal(game.run('storyReservedRam()'), 0);
    assert.equal(game.run('storyCollectProof(inImmersion.grid.nodes[1])'), false);
  });
  check('entrega paga una sola vez y persiste conjuntamente', game => {
    activate(game);
    resolve(game, 'c01');
    assert.equal(invoke(game, 'storyResolveCase', 'c01'), false);
    assert.equal(game.run('S.player.credits'), 640);
    assert.equal(game.run('S.player.stats.credits'), 140);
    assert.equal(game.run('S.player.xp'), 60);
    assert.equal(game.run('load().narrative.chapters.c01'), 'resolved');
    assert.equal(game.run('load().player.credits'), 640);
  });
  check('plantilla de factura exige defensa y retorno sin vender ni pagar', game => {
    activate(game); invoke(game, 'storyAcceptCase', 'c01');
    game.run('window.invoice=generateInvoiceGrid();inImmersion={depth:1,current:"1_1",grid:window.invoice,dataUsed:0,data:[]};');
    const grid = clone(game.run('window.invoice'));
    assert.equal(grid.nodes.length, 4);
    for (const [node, neighbors] of Object.entries(grid.adj)) {
      for (const neighbor of neighbors) assert.ok(grid.adj[neighbor].includes(node));
    }
    assert.equal(game.run('storyCollectProof(nodeById("1_1"))'), false);
    game.run('nodeById("1_0").done=true;');
    assert.equal(game.run('storyCollectProof(nodeById("1_1"))'), true);
    assert.equal(game.run('inImmersion.dataUsed+storyReservedRam()'), 1);
    assert.equal(game.run('S.player.stats.data'), 0);
    assert.equal(invoke(game, 'storyReturnCase', 'c01'), false);
    game.run('inImmersion.current=inImmersion.grid.entry;');
    assert.equal(invoke(game, 'storyReturnCase', 'c01'), true);
    assert.equal(game.run('S.player.credits'), 500);
    game.run('inImmersion=null;');
    assert.equal(invoke(game, 'storyResolveCase', 'c01'), true);
    assert.equal(invoke(game, 'storyResolveCase', 'c01'), false);
    assert.equal(game.run('S.player.credits'), 640);
  });
  check('clave por permiso, no nivel o espera', game => {
    activate(game);
    resolve(game, 'c01'); resolve(game, 'c02');
    assert.equal(invoke(game, 'storyAcceptCase', 'c03'), false);
    assert.equal(game.run('storyApplyCaseKey()'), false);
    assert.equal(game.run('storyGrantCaseKey()'), true);
    assert.equal(game.run('storyGrantCaseKey()'), true);
    assert.equal(game.run('S.narrative.keys.length'), 1);
    assert.equal(game.run('storyApplyCaseKey()'), true);
    assert.equal(game.run('storyApplyCaseKey()'), false);
    assert.equal(game.run('validNarrativeState(S.narrative)'), true);
    assert.equal(invoke(game, 'storyAcceptCase', 'c03'), true);
  });
  check('secuencias, lecturas y archivos fabricados rechazados', game => {
    activate(game);
    const baseline = clone(game.run('S'));
    const mutations = [
      value => { value.narrative.version = 2; },
      value => { value.narrative.prologuePage = 0.5; },
      value => { value.narrative.chapters.c02 = 'accepted'; },
      value => { value.narrative.files.r_revocacion = 'readable'; },
      value => { value.narrative.readFiles = ['l_casos']; },
      value => { value.narrative.readFiles = ['l_estancia', 'l_estancia']; },
      value => { value.narrative.readConversations = ['m_nara_final']; },
      value => { value.narrative.keys = ['k_casos']; },
      value => { value.narrative.awarded = ['c01']; },
      value => { value.history.finalDone = true; },
      value => { value.history.finalUnlocked = true; },
      value => { value.narrative.html = '<script>bad</script>'; }
    ];
    for (const mutate of mutations) {
      const candidate = clone(baseline);
      mutate(candidate);
      assert.equal(game.run('validImportState(' + JSON.stringify(candidate) + ')'), false);
    }
  });
  check('formato anterior y corrupcion no pisan una partida valida', game => {
    activate(game); game.run('save();');
    const old = clone(game.run('S'));
    delete old.narrative;
    assert.equal(game.run('importGameState(' + JSON.stringify(old) + ')'), false);
    assert.equal(game.run('load().narrative.entry'), 'active');
    game.run('localStorage.setItem(SAVE_KEY,"broken-json");');
    assert.equal(game.run('load()'), null);
    assert.equal(game.run('localStorage.getItem(SAVE_RECOVERY_KEY)'), 'broken-json');
  });
  check('datos antiguos no se cargan ni eliminan', game => {
    game.run('localStorage.setItem("cypher_os_save_v9","old-marker");');
    assert.equal(game.run('load()'), null);
    assert.equal(game.run('_oldSavePresent'), true);
    game.run('save();');
    assert.equal(game.run('localStorage.getItem("cypher_os_save_v9")'), 'old-marker');
    assert.equal(game.run('load().narrative.version'), 1);
  });
  check('retirada sin prueba mantiene el caso y sin castigo narrativo', game => {
    activate(game); invoke(game, 'storyAcceptCase', 'c01');
    const before = clone(game.run('S.narrative'));
    game.run('inImmersion={depth:1,current:"proof",grid:{nodes:[{id:"guard",type:"ice",done:true},{id:"proof",done:false,storyChapter:"c01",storyDefense:"guard"}]},dataUsed:0,data:[]};storyCollectProof(inImmersion.grid.nodes[1]);');
    assert.equal(invoke(game, 'storyReturnCase', 'c01'), false);
    assert.equal(game.run('storyDiscardPayload()'), true);
    game.run('inImmersion=null;');
    assert.deepEqual(clone(game.run('S.narrative')), before);
    assert.equal(invoke(game, 'storyResolveCase', 'c01'), false);
    returnProof(game, 'c01');
    assert.equal(invoke(game, 'storyResolveCase', 'c01'), true);
  });
  check('lecturas no pagan ni resuelven y paginas reanudables', game => {
    assert.equal(game.run('storyNextProloguePage()'), true);
    assert.equal(game.run('storyNextProloguePage()'), true);
    assert.equal(game.run('storyNextProloguePage()'), false);
    assert.equal(game.run('load().narrative.prologuePage'), 2);
    activate(game);
    const credits = game.run('S.player.credits');
    assert.equal(invoke(game, 'storyReadFile', 'l_estancia'), true);
    assert.equal(invoke(game, 'storyReadFile', 'l_estancia'), true);
    assert.equal(invoke(game, 'storyReadConversation', 'm_nara_final'), false);
    assert.equal(invoke(game, 'storySeeCase', 'c01'), false);
    assert.equal(game.run('S.player.credits'), credits);
    assert.equal(game.run('load().narrative.readFiles.length'), 1);
    assert.equal(game.run('S.narrative.chapters.c01'), 'offered');
  });
  check('reconexion usa economia y archivo actuales sin recuperar carga', game => {
    activate(game); resolve(game, 'c01');
    game.run('S.player.credits=777;S.player.ramUp=1;S.player.cpu=0;flatline();');
    assert.equal(game.run('load()._reconnectCheckpoint.player.credits'), 777);
    game.run('ACTIONS.reconnect();');
    assert.equal(game.run('S.player.credits'), 777);
    assert.equal(game.run('S.player.ramUp'), 1);
    assert.equal(game.run('S.narrative.files.r_factura'), 'readable');
    assert.equal(game.run('S.narrative.chapters.c02'), 'offered');
    assert.equal(game.run('inImmersion'), null);
    assert.equal(game.run('validNarrativeState(S.narrative)'), true);
  });
  check('campana completa sin grind y sin premios al importar', game => {
    assert.equal(game.run('defeatNucleo()'), false);
    activate(game);
    for (const id of ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08']) {
      if (id === 'c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      if (id === 'c05') invoke(game, 'storyReadConversation', 'm_nara_presentacion');
      resolve(game, id);
      assert.equal(game.run('validNarrativeState(S.narrative)'), true, id);
    }
    assert.equal(game.run('S.player.credits'), 8050);
    assert.equal(game.run('S.player.stats.credits'), 7550);
    assert.equal(game.run('S.narrative.awarded.length'), 8);
    assert.equal(game.run('S.history.finalDone'), true);
    assert.equal(game.run('load().player.credits'), 8050);
  });
  check('snapshot real conserva paquete y rechaza defensa o archivos fabricados', game => {
    activate(game); invoke(game, 'storyAcceptCase', 'c01');
    game.run('startImmersion(1);var proof=nodeById("1_1"),guard=nodeById("1_0");guard.done=true;inImmersion.current=proof.id;');
    assert.equal(game.run('storyCollectProof(proof)'), true);
    game.run('save();');
    const candidate = clone(game.run('load()'));
    assert.ok(candidate);
    assert.equal(candidate._inImmersion.dataUsed, 1);
    assert.equal(candidate._inImmersion.data.length, 0);
    assert.equal(game.run('importGameState(' + JSON.stringify(candidate) + ')'), true);
    assert.equal(game.run('inImmersion.narrativePayload.chapter'), 'c01');
    const mutations = [
      state => { state._inImmersion.dataUsed = 0; },
      state => { state._inImmersion.dataUsed = 2; },
      state => { state._inImmersion.narrativePayload.files.push('r_revocacion'); },
      state => { state._inImmersion.narrativePayload.reward = 99999; },
      state => { state._inImmersion.narrativePayload.chapter = 'c02'; },
      state => { state._inImmersion.grid.nodes[2].storyDefense = 'missing'; },
      state => { state._inImmersion.grid.nodes[1].done = false; }
    ];
    for (const mutate of mutations) {
      const broken = clone(candidate); mutate(broken);
      assert.equal(game.run('validImportState(' + JSON.stringify(broken) + ')'), false);
    }
    game.run('inImmersion.current=inImmersion.grid.entry;');
    assert.equal(invoke(game, 'storyReturnCase', 'c01'), true);
    game.run('inImmersion=null;');
    assert.equal(invoke(game, 'storyResolveCase', 'c01'), true);
  });
  check('acciones publicas aceptan sin lecturas y cierran la factura una vez', game => {
    activate(game); game.run('ensureStateIntegrity();generateOffers();activateStorySession(false);showView("trabajos");');
    const click = action => game.emitElement(game.sb.document.querySelector('[data-action="' + action + '"]'), 'click');
    assert.equal(game.run('S.narrative.readFiles.length'), 0);
    assert.equal(game.sb.document.querySelector('[data-action="acceptJob"]'), null);
    click('acceptInvoice');
    assert.equal(game.run('S.narrative.aliasAcquired'), true);
    assert.match(game.sb.document.getElementById('panel-scroll').textContent, /No uses las credenciales de Tomás/);
    click('closeStoryConversation');
    click('dipGrid');
    game.run('moveToNode("1_0");');
    assert.equal(game.run('COM.stage'), 'encounter');
    assert.match(game.sb.document.getElementById('combat').textContent, /acceso de huésped/);
    game.run('cancelActiveCombat();onNodeDefeated({node:nodeById("1_0")});moveToNode("1_1");');
    assert.equal(game.run('S.narrative.files.r_factura'), 'unknown');
    assert.equal(game.run('inImmersion.data.length'), 0);
    game.run('superficializar();');
    assert.notEqual(game.run('inImmersion'), null);
    game.run('moveToNode("1_0");moveToNode("0_0");superficializar();closeOverlay();');
    assert.equal(game.run('S.narrative.chapters.c01'), 'returned');
    assert.equal(game.run('S.player.credits'), 500);
    click('deliverInvoice');
    const closed = clone(game.run('S'));
    assert.equal(closed.player.credits, 640);
    assert.equal(closed.player.xp, 76);
    assert.equal(closed.narrative.chapters.c02, 'offered');
    assert.match(game.sb.document.getElementById('panel-scroll').textContent, /corte queda suspendido/);
    assert.equal(game.run('S._storyAcquired.r_factura'), game.run('S.clock'));
    assert.equal(game.run('validImportState(S)'), true);
    for (const acquired of [{ missing: 12 }, { r_factura: -1 }, { r_factura: 1440 }, { r_factura: '12' }]) {
      const broken = clone(game.run('S')); broken._storyAcquired = acquired;
      assert.equal(game.run('validImportState(' + JSON.stringify(broken) + ')'), false);
    }
    click('closeStoryConversation');
    game.run('ACTIONS.deliverInvoice();');
    assert.equal(game.run('S.player.credits'), 640);
    game.run('showView("contactos");');
    assert.ok(game.sb.document.querySelector('[data-action="acceptJob"]'));
    assert.equal(game.sb.document.querySelector('[data-action="acceptCase"]'), null);
  });
  check('retirada y reconexion de factura permiten reintentar sin premio', game => {
    activate(game); invoke(game, 'storyAcceptCase', 'c01');
    game.run('ensureStateIntegrity();activateStorySession(false);startImmersion(1);superficializar();closeOverlay();');
    assert.equal(game.run('S.narrative.chapters.c01'), 'accepted');
    assert.equal(game.run('S.player.stats.jobsFailed'), 0);
    game.run('startImmersion(1);nodeById("1_0").done=true;inImmersion.current="1_1";storyCollectProof(nodeById("1_1"));S.player.cpu=0;flatline();');
    assert.equal(game.run('S.narrative.files.r_factura'), 'unknown');
    game.run('ACTIONS.reconnect();');
    assert.equal(game.run('inImmersion'), null);
    assert.equal(game.run('S.narrative.chapters.c01'), 'accepted');
    assert.equal(game.run('S.player.credits'), 500);
    game.run('startImmersion(1);');
    assert.equal(game.run('nodeById("1_1").done'), false);
  });
  check('factura LEGENDARIO conserva profundidad, paquete y ausencia de azar', game => {
    activate(game); invoke(game, 'storyAcceptCase', 'c01');
    game.run('S.difficulty="legendario";ensureStateIntegrity();activateStorySession(false);startImmersion(1);');
    assert.equal(game.run('inImmersion.depth'), 2);
    assert.equal(game.run('nodeById("1_0").tier'), 2);
    game.run('Math.random=function(){return 0;};tryGridEvent();');
    assert.equal(game.run('tryScavenger()'), false);
    assert.equal(game.run('combatActive'), false);
    game.run('nodeById("1_0").done=true;inImmersion.current="1_1";inImmersion.maxDepthReached=2;storyCollectProof(nodeById("1_1"));save();');
    assert.ok(game.run('load()'));
    assert.equal(game.run('load()._inImmersion.narrativePayload.chapter'), 'c01');
  });
  console.log(`Narrativa: ${passes} correctas, ${fails} fallos`);
  return options.summary ? { passes, fails, total: passes + fails } : fails;
}
if (require.main === module) run().then(fails => { process.exitCode = fails ? 1 : 0; }, error => { console.error(error); process.exitCode = 1; });
module.exports = { run };