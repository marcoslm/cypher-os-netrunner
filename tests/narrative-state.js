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
    if (id === 'c06') assert.equal(game.run('storyConfirmCustody()'), true);
    assert.equal(invoke(game, 'storyResolveCase', id), true);
  };

  console.log('\nNARRATIVA F1');
  check('catalogos e inicio independientes', game => {
    assert.equal(game.run('STORY_CHAPTERS.length'), 8);
    assert.equal(game.run('STORY_FILES.length'), 16);
    assert.equal(game.run('STORY_CONVERSATIONS.length'), 23);
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
  check('F6 terminal reconoce nombres canonicos sin robo, identidad ni salida prematuros', game => {
    activate(game);
    game.run('window.lines=[];msg=function(text){window.lines.push(text);};');
    for (const name of ['VEYRA','ORVIK','Inés','NAEV','Berto','Tomás','Álex','Núcleo']) {
      game.run('CMD.quien('+JSON.stringify(name)+');');
    }
    const lines = clone(game.run('window.lines'));
    assert.equal(lines.length, 8);
    assert.ok(lines.every(line => !line.startsWith('uso:')));
    assert.ok(lines[2].includes('oficina independiente'));
    assert.ok(!lines[3].includes('Nara Beltrán'));
    assert.ok(!lines[5].includes('fuera de custodia'));
    assert.ok(lines[6].includes('todavía no ha adquirido alias'));
    assert.ok(!game.run('TRANSMISSIONS.join(" ")').includes('deck robado'));
    assert.ok(!game.run('TRANSMISSIONS.join(" ")').includes('NAEV no es una persona'));
    game.run('CMD.expediente();');
    assert.ok(game.run('document.getElementById("panel-scroll").innerHTML').includes('uso provisional'));
    assert.ok(!game.run('document.getElementById("panel-scroll").innerHTML').includes('robado'));
    resolve(game,'c01'); resolve(game,'c02');
    assert.equal(game.run('storyGrantCaseKey()'),true);
    assert.equal(game.run('storyApplyCaseKey()'),true);
    resolve(game,'c03'); resolve(game,'c04');
    assert.equal(invoke(game,'storyReadConversation','m_nara_presentacion'),true);
    resolve(game,'c05'); resolve(game,'c06');
    game.run('CMD.quien("NAEV");CMD.quien("Tomás");');
    assert.ok(game.run('window.lines[window.lines.length-2]').includes('Nara Beltrán'));
    assert.ok(game.run('window.lines[window.lines.length-1]').includes('fuera de custodia'));
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
  check('F5 custodia exige identidad confirmada antes del pago y conserva checkpoints resueltos', game => {
    activate(game);
    for (const id of ['c01','c02','c03','c04','c05']) {
      if(id==='c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      if(id==='c05') invoke(game,'storyReadConversation','m_nara_presentacion');
      resolve(game,id);
    }
    assert.equal(game.run('storyConfirmCustody()'),false);
    assert.equal(invoke(game,'storyAcceptCase','c06'),true);
    returnProof(game,'c06');
    const before=game.run('S.player.credits');
    assert.equal(invoke(game,'storyResolveCase','c06'),false);
    assert.equal(game.run('S.narrative.files.l_testimonio'),'unknown');
    assert.equal(invoke(game,'storyReadConversation','m_tomas_contacto'),false);
    const fabricated=clone(game.run('S')); fabricated.narrative.files.l_testimonio='readable';
    assert.equal(game.run('validImportState('+JSON.stringify(fabricated)+')'),false);
    assert.equal(game.run('storyConfirmCustody()'),true);
    assert.equal(game.run('storyConfirmCustody()'),false);
    assert.equal(game.run('S.player.credits'),before);
    assert.equal(game.run('validImportState(load())'),true);
    assert.equal(invoke(game,'storyResolveCase','c06'),true);
    assert.equal(game.run('S.player.credits'),before+500);
    const previous=clone(game.run('S')); previous.narrative.readConversations=previous.narrative.readConversations.filter(id=>id!=='m_tomas_contacto');
    assert.equal(game.run('validImportState('+JSON.stringify(previous)+')'),true);
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
    game.run('startCombat({node:nodeById("1_0")});');
    assert.equal(game.run('COM.mode'), 'ruta');
    assert.match(game.run('combatContext()'), /acceso de huésped/);
    assert.match(game.run('combatContext()'), /desviador/);
    assert.doesNotMatch(game.run('combatContext()'), /clave de consulta/);
    game.run('cancelActiveCombat();');
    game.run('nodeById("1_0").done=true;inImmersion.current="1_1";inImmersion.maxDepthReached=2;storyCollectProof(nodeById("1_1"));save();');
    assert.ok(game.run('load()'));
    assert.equal(game.run('load()._inImmersion.narrativePayload.chapter'), 'c01');
  });
  check('F4 objetivos propios preservan contratos y exigen su defensa', game => {
    activate(game); resolve(game, 'c01');
    for (const id of ['c02', 'c03', 'c04']) {
      if (id === 'c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      assert.equal(invoke(game, 'storyAcceptCase', id), true);
      game.run('S.jobs=[{type:"recoleta",n:3,done:false},{type:"carrera",n:2,done:false},{type:"daemon",n:2,done:false}];window.targetGrid=generateGrid(4,false);inImmersion={grid:window.targetGrid,depth:4,current:"'+id+'_proof",data:[],dataUsed:0};');
      const grid = clone(game.run('window.targetGrid'));
      assert.equal(grid.nodes.filter(node => node.type === 'data' && !node.storyChapter).length >= 3, true);
      assert.equal(grid.nodes.filter(node => node.type === 'data' && !node.storyChapter && node.layer >= 3).length >= 2, true);
      assert.equal(grid.nodes.filter(node => node.type === 'daemon').length >= 2, true);
      for (const [node, neighbors] of Object.entries(grid.adj)) for (const neighbor of neighbors) assert.ok(grid.adj[neighbor].includes(node));
      assert.equal(game.run('storyCollectProof(nodeById("'+id+'_proof"))'), false);
      game.run('nodeById("'+id+'_guard").done=true;');
      assert.equal(game.run('storyCollectProof(nodeById("'+id+'_proof"))'), true);
      assert.equal(game.run('inImmersion.dataUsed'), 1);
      game.run('inImmersion.current=inImmersion.grid.entry;');
      assert.equal(invoke(game, 'storyReturnCase', id), true);
      game.run('inImmersion=null;S.jobs=[];');
      assert.equal(invoke(game, 'storyResolveCase', id), true);
    }
  });
  check('F4 acciones reales separan indice, permiso, clave y tres entregas', game => {
    activate(game); resolve(game, 'c01');
    game.run('ensureStateIntegrity();generateOffers();activateStorySession(false);showView("trabajos");');
    const click = (action, id) => {
      const selector = '[data-action="'+action+'"]'+(id?'[data-id="'+id+'"]':'');
      const element = game.sb.document.querySelector(selector);
      assert.ok(element, selector); game.emitElement(element, 'click');
    };
    for (const id of ['c02','c03','c04']) {
      if (id === 'c03') {
        assert.equal(game.run('S.narrative.files.l_indice'), 'readable');
        assert.equal(game.run('S.narrative.files.l_casos'), 'sealed');
        assert.equal(game.run('S.narrative.keys.length'), 0);
        assert.equal(game.run('S.narrative.readConversations.indexOf("m_ines_clave")'), -1);
        click('consultStoryCase',id);
        assert.equal(game.sb.document.querySelector('[data-action="acceptStoryCase"]'), null);
        click('openStoryConversation','m_ines_clave'); click('receiveStoryKey');
        assert.equal(game.run('S.narrative.files.l_casos'), 'sealed');
        assert.equal(invoke(game,'storyAcceptCase','c03'),false);
        click('applyStoryKey');
        assert.equal(game.run('S.narrative.files.l_casos'), 'readable');
      } else click('consultStoryCase',id);
      click('acceptStoryCase',id); click('dipGrid');
      assert.equal(game.run('inImmersion.depth'), id==='c04'?3:2);
      game.run('nodeById("'+id+'_guard").done=true;inImmersion.current="'+id+'_proof";inImmersion.maxDepthReached='+ (id==='c04'?3:2)+';enterNode(nodeById(inImmersion.current));save();');
      const payload=clone(game.run('load()'));
      assert.ok(payload); assert.equal(payload._inImmersion.narrativePayload.chapter,id);
      assert.equal(game.run('importGameState('+JSON.stringify(payload)+')'), true);
      game.run('inImmersion.current=inImmersion.grid.entry;superficializar();closeOverlay();');
      const credits=game.run('S.player.credits');
      click('deliverStoryCase',id);
      assert.equal(game.run('S.player.credits'), credits+game.run('storyItem(STORY_CHAPTERS,"'+id+'").credits'));
      assert.equal(invoke(game,'storyResolveCase',id),false);
      click('closeStoryConversation');
      assert.match(game.sb.document.getElementById('panel-scroll').textContent,/HECHO/);
    }
    assert.equal(game.run('S.player.credits'),1400);
    assert.equal(game.run('S.narrative.chapters.c05'),'offered');
    assert.equal(game.sb.document.querySelector('[data-action="acceptStoryCase"][data-id="c05"]'),null);
    assert.equal(game.run('S.narrative.readConversations.indexOf("m_nara_presentacion")'),-1);
    click('consultStoryCase','c05');
    assert.equal(game.run('S.player.credits'),1400);
    assert.match(game.sb.document.getElementById('panel-scroll').textContent,/identidad pendiente/);
  });
  check('F4 reserva con tres contratos, snapshot y reintento sin prueba', game => {
    activate(game); resolve(game,'c01');
    game.run('ensureStateIntegrity();activateStorySession(false);S.jobs=[{id:"gather",type:"recoleta",n:6,prog:{gathered:0},done:false}];');
    assert.equal(invoke(game,'storyAcceptCase','c02'),false);
    game.run('S.jobs=[{id:"gather",type:"recoleta",title:"Datos",desc:"Datos",contact:"mamaWire",risk:"low",n:3,reward:90,xp:10,prog:{gathered:0},done:false,failed:false},{id:"deep",type:"carrera",title:"Profundos",desc:"Profundos",contact:"mamaWire",risk:"med",n:2,reward:90,xp:10,prog:{deepGathered:0},done:false,failed:false},{id:"guards",type:"rompehielas",title:"Defensas",desc:"Defensas",contact:"mamaWire",risk:"med",n:2,reward:90,xp:10,prog:{iceT2:0},done:false,failed:false}];');
    assert.equal(invoke(game,'storyAcceptCase','c02'),true);
    game.run('S.difficulty="legendario";startImmersion(2);');
    assert.equal(game.run('inImmersion.depth'),5);
    assert.equal(game.run('jobQuotaLimit("recoleta")'),5);
    assert.equal(game.run('jobOfferBlocked({type:"recoleta",n:6})!==""'),true);
    game.run('nodeById("c02_guard").done=true;inImmersion.current="c02_proof";inImmersion.maxDepthReached=2;enterNode(nodeById(inImmersion.current));save();');
    assert.equal(game.run('S.jobs[0].prog.gathered'),0);
    assert.equal(game.run('S.jobs[1].prog.deepGathered'),0);
    const saved=clone(game.run('load()')); assert.ok(saved);
    assert.equal(game.run('importGameState('+JSON.stringify(saved)+')'),true);
    assert.equal(game.run('inImmersion.narrativePayload.chapter'),'c02');
    game.run('S.player.cpu=0;flatline();ACTIONS.reconnect();S.jobs=[];startImmersion(2);');
    assert.equal(game.run('S.narrative.chapters.c02'),'accepted');
    assert.equal(game.run('nodeById("c02_proof").done'),false);
    assert.equal(game.run('S.narrative.files.r_indice'),'unknown');
  });
  check('F4 eventos preservan RAM de prueba y usan la capa real', game => {
    activate(game); resolve(game,'c01'); invoke(game,'storyAcceptCase','c02');
    game.run('ensureStateIntegrity();activateStorySession(false);startImmersion(2);inImmersion.data=Array.from({length:5},function(){return {value:10};});inImmersion.dataUsed=5;');
    game.run('GRID_EVENTS.filter(function(event){return event.effect.toString().indexOf("data.push")>=0;})[0].effect();');
    assert.equal(game.run('inImmersion.dataUsed'),5);
    game.run('nodeById("c02_guard").done=true;inImmersion.current="c02_proof";inImmersion.maxDepthReached=2;enterNode(nodeById(inImmersion.current));');
    assert.equal(game.run('inImmersion.narrativePayload.chapter'),'c02');
    assert.equal(game.run('inImmersion.dataUsed'),6);
    game.run('GRID_EVENTS.filter(function(event){return event.id==="corriente";})[0].effect();');
    assert.equal(game.run('inImmersion.current'),game.run('inImmersion.grid.byLayer[2][0].id'));
    assert.equal(game.run('validImportState(JSON.parse(JSON.stringify(S)))'),true);
  });
  check('F5 dos documentos, capas y defensa propia sobreviven a snapshot y reconexion', game => {
    activate(game);
    for(const id of ['c01','c02','c03','c04']){
      if(id==='c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      resolve(game,id);
    }
    assert.equal(invoke(game,'storyAcceptCase','c05'),false);
    invoke(game,'storyReadConversation','m_nara_presentacion');
    for(const id of ['c05','c06']){
      assert.equal(invoke(game,'storyAcceptCase',id),true);
      game.run('S.difficulty="legendario";ensureStateIntegrity();activateStorySession(false);startImmersion();');
      assert.equal(game.run('inImmersion.depth'),id==='c05'?4:5);
      assert.equal(game.run('inImmersion.grid.nodes.some(function(node){return node.type==="nucleo";})'),false);
      assert.equal(game.run('nodeById("'+id+'_guard").tier'),3);
      game.run('inImmersion.current="'+id+'_proof";inImmersion.maxDepthReached='+ (id==='c05'?3:4)+';');
      assert.equal(game.run('storyCollectProof(nodeById(inImmersion.current))'),false);
      game.run('nodeById("'+id+'_guard").done=true;');
      assert.equal(game.run('storyCollectProof(nodeById(inImmersion.current))'),true);
      assert.equal(game.run('inImmersion.dataUsed'),1);
      const files=id==='c05'?['r_permisos','r_actualizacion']:['r_custodia'];
      assert.deepEqual(clone(game.run('inImmersion.narrativePayload.files')),files);
      game.run('save();'); const payload=clone(game.run('load()'));
      assert.equal(game.run('importGameState('+JSON.stringify(payload)+')'),true);
      const broken=clone(payload); broken._inImmersion.narrativePayload.files=[];
      assert.equal(game.run('validImportState('+JSON.stringify(broken)+')'),false);
      game.run('S.player.cpu=0;flatline();ACTIONS.reconnect();');
      for(const file of files) assert.equal(game.run('S.narrative.files.'+file),'unknown');
      assert.equal(game.run('S.narrative.chapters.'+id),'accepted');
      game.run('startImmersion();');
      assert.equal(game.run('nodeById("'+id+'_proof").done'),false);
      game.run('inImmersion=null;'); returnProof(game,id);
      if(id==='c06') assert.equal(game.run('storyConfirmCustody()'),true);
      assert.equal(invoke(game,'storyResolveCase',id),true);
    }
  });
  check('F5 acciones escalonan identidad, revision, acogida y ofrecen c07 sin aceptarlo', game => {
    activate(game);
    for(const id of ['c01','c02','c03','c04']){
      if(id==='c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      resolve(game,id);
    }
    game.run('ensureStateIntegrity();activateStorySession(false);showView("trabajos");');
    const click=(action,id)=>{
      const selector='[data-action="'+action+'"]'+(id?'[data-id="'+id+'"]':'');
      const element=game.sb.document.querySelector(selector); assert.ok(element,selector);game.emitElement(element,'click');
    };
    for(const id of ['c05','c06']){
      click('consultStoryCase',id);click('acceptStoryCase',id);click('dipGrid');
      assert.equal(game.run('inImmersion.depth'),id==='c05'?3:4);
      game.run('nodeById("'+id+'_guard").done=true;inImmersion.current="'+id+'_proof";inImmersion.maxDepthReached='+(id==='c05'?3:4)+';enterNode(nodeById(inImmersion.current));inImmersion.current=inImmersion.grid.entry;superficializar();closeOverlay();');
      const credits=game.run('S.player.credits');
      assert.equal(game.run('S.narrative.files.l_testimonio'),'unknown');
      if(id==='c06'){
        assert.equal(game.sb.document.querySelector('[data-action="deliverStoryCase"]'),null);
        assert.equal(game.run('storyConversationAvailable(S.narrative,"m_ines_salida")'),false);
        click('confirmStoryCustody');
        assert.equal(game.run('S.player.credits'),credits);
        assert.match(game.sb.document.getElementById('panel-scroll').textContent,/revisión para salir todavía está pendiente/);
        assert.equal(game.run('validImportState(load())'),true);
        click('closeStoryConversation');
      }
      click('deliverStoryCase',id);
      assert.equal(game.run('S.player.credits'),credits+(id==='c05'?400:500));
      assert.equal(invoke(game,'storyResolveCase',id),false);
      assert.equal(game.run('storyConfirmCustody()'),false);
      click('closeStoryConversation');
    }
    assert.equal(game.run('S.narrative.readConversations.indexOf("m_berto_acogida")'),-1);
    assert.equal(game.sb.document.querySelector('[data-action="acceptStoryCase"][data-id="c07"]'),null);
    assert.ok(game.sb.document.querySelector('[data-action="consultStoryCase"][data-id="c07"]'));
    const before=game.run('S.player.credits');click('openStoryConversation','m_berto_acogida');
    assert.match(game.sb.document.getElementById('panel-scroll').textContent,/Ya está aquí/);
    assert.equal(game.run('S.player.credits'),before);
    assert.equal(game.run('validImportState(load())'),true);
  });
  check('F6 continuidad y Nucleo generado no cierran ni pagan antes de entregar', game => {
    activate(game);
    for(const id of ['c01','c02','c03','c04','c05','c06']){
      if(id==='c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      if(id==='c05') invoke(game,'storyReadConversation','m_nara_presentacion');
      resolve(game,id);
    }
    game.run('ensureStateIntegrity();activateStorySession(false);ACTIONS.startEndless();');
    assert.equal(game.run('inImmersion'),null);
    assert.equal(invoke(game,'storyAcceptCase','c08'),false);
    resolve(game,'c07');
    assert.equal(invoke(game,'storyAcceptCase','c08'),true);
    game.run('S.nextDepth=null;startImmersion();');
    assert.equal(game.run('inImmersion.depth'),5);
    assert.equal(game.run('inImmersion.grid.nodes.filter(function(node){return node.type==="nucleo";}).length'),1);
    assert.equal(game.run('nodeById("c08_proof").storyDefense'),game.run('inImmersion.grid.nodes.filter(function(node){return node.boss;})[0].id'));
    const before=game.run('S.player.credits');
    assert.equal(game.run('defeatNucleo()'),false);
    game.run('window.boss=nodeById(nodeById("c08_proof").storyDefense);onNodeDefeated({node:window.boss});onNodeDefeated({node:window.boss});save();');
    assert.equal(game.run('S.player.stats.ice'),1);
    assert.equal(game.run('S.player.credits'),before);
    assert.equal(game.run('S.history.finalDone'),false);
    assert.equal(game.run('S.best.finalDone'),undefined);
    assert.equal(game.run('S.narrative.files.r_revocacion'),'unknown');
    game.run('inImmersion.current="c08_proof";inImmersion.maxDepthReached=5;');
    assert.equal(game.run('storyCollectProof(nodeById("c08_proof"))'),true);
    game.run('save();'); const saved=clone(game.run('load()')); assert.ok(saved);
    assert.equal(game.run('importGameState('+JSON.stringify(saved)+')'),true);
    game.run('inImmersion.current=inImmersion.grid.entry;');
    assert.equal(invoke(game,'storyReturnCase','c08'),true);
    game.run('inImmersion=null;');
    assert.equal(game.run('S.history.finalDone'),false);
    assert.equal(invoke(game,'storyResolveCase','c08'),true);
    assert.equal(invoke(game,'storyResolveCase','c08'),false);
    assert.equal(game.run('S.player.credits'),before+5000);
    assert.equal(game.run('S.history.finalDone'),true);
    game.run('ACTIONS.startEndless();');
    assert.ok(game.run('inImmersion'));
    assert.equal(game.run('inImmersion.grid.nodes.some(function(node){return node.boss || node.storyChapter;})'),false);
  });
  check('F6 acciones finales escalonadas reanudan sin pago ni copia prematuros', game => {
    activate(game);
    for(const id of ['c01','c02','c03','c04','c05','c06']){
      if(id==='c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      if(id==='c05') invoke(game,'storyReadConversation','m_nara_presentacion');
      resolve(game,id);
    }
    game.run('ensureStateIntegrity();activateStorySession(false);showView("trabajos");');
    const click=(action,id)=>{const element=game.sb.document.querySelector('[data-action="'+action+'"]'+(id?'[data-id="'+id+'"]':''));assert.ok(element,action+':'+id);game.emitElement(element,'click');};
    for(const id of ['c07','c08']){
      click('consultStoryCase',id);click('acceptStoryCase',id);click('dipGrid');
      const guard=game.run('nodeById("'+id+'_proof").storyDefense');
      game.run('onNodeDefeated({node:nodeById('+JSON.stringify(guard)+')});inImmersion.current="'+id+'_proof";inImmersion.maxDepthReached='+(id==='c07'?4:5)+';enterNode(nodeById(inImmersion.current));inImmersion.current=inImmersion.grid.entry;superficializar();closeOverlay();');
      const credits=game.run('S.player.credits');click('deliverStoryCase',id);
      assert.equal(game.run('S.player.credits'),credits+(id==='c07'?750:5000));
      if(id==='c07')click('closeStoryConversation');
    }
    assert.equal(game.run('storyReadFile("r_copia_final")'),false);
    assert.equal(game.run('storyReadConversation("m_nara_final")'),false);
    const before=game.run('S.player.credits');
    for(const id of ['m_ines_final','m_nara_final','m_copia_final']){
      assert.equal(game.run('S.narrative.readConversations.indexOf('+JSON.stringify(id)+')'),-1);
      click('openStoryConversation',id);
      assert.equal(game.run('S.player.credits'),before);
      assert.equal(game.run('validImportState(load())'),true);
      const saved=clone(game.run('load()'));assert.equal(game.run('importGameState('+JSON.stringify(saved)+')'),true);
      game.run('showView("trabajos");');
    }
    assert.equal(game.run('storyReadFile("r_copia_final")'),true);
    click('goStoryProofs');
    assert.ok(game.sb.document.querySelector('[data-action="openArchive"][data-id="r_copia_final"]'));
    game.run('showView("trabajos");');
    assert.match(game.sb.document.getElementById('panel-scroll').textContent,/Investigación concluida/);
    assert.ok(!game.sb.document.getElementById('panel-scroll').textContent.includes('Tomás no ha vuelto'));
    assert.equal(game.run('S.narrative.awarded.length'),8);
    assert.equal(game.run('S.player.credits'),before);
  });
  check('F6 reconexion LEGENDARIO conserva continuidad y reintenta un unico Nucleo', game => {
    activate(game);
    for(const id of ['c01','c02','c03','c04','c05','c06','c07']){
      if(id==='c03')game.run('storyGrantCaseKey();storyApplyCaseKey();');
      if(id==='c05')invoke(game,'storyReadConversation','m_nara_presentacion');
      resolve(game,id);
    }
    invoke(game,'storyAcceptCase','c08');
    game.run('S.difficulty="legendario";S.best.finalDone=true;ensureStateIntegrity();activateStorySession(false);startImmersion();');
    assert.equal(game.run('inImmersion.depth'),5);
    const credits=game.run('S.player.credits');
    game.run('onNodeDefeated({node:nodeById(nodeById("c08_proof").storyDefense)});inImmersion.current="c08_proof";inImmersion.maxDepthReached=5;storyCollectProof(nodeById("c08_proof"));S.player.cpu=0;flatline();ACTIONS.reconnect();');
    assert.equal(game.run('S.narrative.files.r_continuidad'),'readable');
    assert.equal(game.run('S.narrative.files.r_revocacion'),'unknown');
    assert.equal(game.run('S.history.finalDone'),false);
    assert.equal(game.run('S.narrative.chapters.c08'),'accepted');
    assert.equal(game.run('S.player.credits'),credits);
    game.run('startImmersion();');
    assert.equal(game.run('inImmersion.grid.nodes.filter(function(node){return node.boss;}).length'),1);
    assert.equal(game.run('nodeById(nodeById("c08_proof").storyDefense).done'),false);
    game.run('save();');assert.ok(game.run('load()'));
  });
  check('pestanas separan casos y contratos sin lecturas ni cambios de progreso', game => {
    activate(game); resolve(game,'c01');
    game.run('ensureStateIntegrity();generateOffers();activateStorySession(false);showView("trabajos");');
    const click=(view,tab)=>{
      const element=game.sb.document.querySelector('[data-action="workSection"][data-view-name="'+view+'"][data-tab="'+tab+'"]');
      assert.ok(element); game.emitElement(element,'click');
      assert.equal(game.sb.document.activeElement.getAttribute('data-tab'),tab);
    };
    const before=clone(game.run('S.narrative'));
    assert.ok(game.sb.document.querySelector('[data-action="consultStoryCase"]'));
    click('trabajos','contracts');
    assert.ok(!game.sb.document.querySelector('[data-action="consultStoryCase"]'));
    game.run('showView("contactos");');
    assert.ok(game.sb.document.querySelector('[data-action="acceptJob"]'));
    assert.ok(!game.sb.document.querySelector('[data-action="openStoryConversation"]'));
    click('contactos','story');
    assert.ok(game.sb.document.querySelector('[data-action="openStoryConversation"]'));
    assert.ok(!game.sb.document.querySelector('[data-action="acceptJob"]'));
    click('contactos','contracts');
    assert.deepEqual(clone(game.run('S.narrative')),before);
    const offer=game.sb.document.querySelector('[data-action="acceptJob"]');
    game.emitElement(offer,'click');
    assert.equal(game.run('S.jobs.length'),1);
    assert.deepEqual(clone(game.run('S.narrative')),before);
    game.run('ACTIONS.consultStoryCase({getAttribute:function(){return "c02";}});');
    assert.equal(game.run('_workTab'),'story');
    assert.ok(game.sb.document.querySelector('[data-action="acceptStoryCase"]'));
    assert.ok(!game.sb.document.querySelector('[data-action="cancelJob"]'));
    assert.equal(game.run('S.jobs.length'),1);
    game.run('clearSessionRuntime();');
    assert.equal(game.run('_workTab'),'story');
    assert.equal(game.run('_contactsTab'),null);
  });
  check('documentos explican las pruebas sin sustituir sus registros ni abrir archivos cerrados', game => {
    activate(game); resolve(game,'c01');
    game.run('ensureStateIntegrity();activateStorySession(false);ACTIONS.openArchive({getAttribute:function(){return "r_factura";}});');
    const text=game.sb.document.getElementById('panel-scroll').textContent;
    assert.match(text,/recibi[oó] el pago/);
    assert.match(text,/23:11/); assert.match(text,/23:13/);
    assert.equal(game.run('storyReadFile("r_custodia")'),false);
    for(const id of ['c02','c03','c04','c05','c06','c07','c08']) assert.ok(game.run('STORY_CASE_DETAILS.'+id+'.purpose.length')>40);
  });
  check('regalo del deck solo al cerrar c08 y sin premio o identidad adicionales', game => {
    activate(game);
    for(const id of ['c01','c02','c03','c04','c05','c06','c07']){
      if(id==='c03') game.run('storyGrantCaseKey();storyApplyCaseKey();');
      if(id==='c05') invoke(game,'storyReadConversation','m_nara_presentacion');
      resolve(game,id);
    }
    game.run('CMD.expediente();');
    assert.match(game.sb.document.getElementById('panel-scroll').textContent,/uso provisional/);
    assert.equal(game.run('storyConversationAvailable("m_berto_final")'),false);
    resolve(game,'c08');
    assert.match(game.run('STORY_DIALOGUES.m_berto_final.text'),/Te lo regalo/);
    game.run('CMD.expediente();');
    assert.match(game.sb.document.getElementById('panel-scroll').textContent,/deck regalado por Tomás/);
    assert.ok(!game.sb.document.getElementById('panel-scroll').textContent.includes('uso provisional'));
    game.run('window.lines=[];msg=function(text){window.lines.push(text);};CMD.quien("yo");CMD.quien("Tomás");CMD.quien("Berto");');
    assert.match(game.run('window.lines.join(" ")'),/El deck es suyo/);
    const credits=game.run('S.player.credits');
    game.run('save();');
    assert.equal(game.run('importGameState('+JSON.stringify(clone(game.run('load()')))+')'),true);
    game.run('storyReadConversation("m_berto_final");storyReadConversation("m_berto_final");');
    assert.equal(game.run('S.player.credits'),credits);
    assert.equal(game.run('Object.keys(S.narrative).length'),12);
    assert.equal(game.run('S.narrative.aliasAcquired'),true);
    assert.equal(game.run('S.narrative.awarded.length'),8);
  });
  console.log(`Narrativa: ${passes} correctas, ${fails} fallos`);
  return options.summary ? { passes, fails, total: passes + fails } : fails;
}
if (require.main === module) run().then(fails => { process.exitCode = fails ? 1 : 0; }, error => { console.error(error); process.exitCode = 1; });
module.exports = { run };