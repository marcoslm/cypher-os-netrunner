/* Regresiones de gameplay/persistencia de CYPHER://OS. Sin dependencias. */
"use strict";
const assert = require("node:assert/strict");
const { loadGame, audioModel, clickAction } = require("./harness");

async function run(options = {}){
  let fails = 0, passes = 0;
  const games=[];
  /* Solo política de fixtures/cleanup; DOM, VM y timers viven en harness. */
  function game(opts = {}){
    const g=loadGame({timers:"virtual",strictDOM:true,canvas:"stub",seed:2077,...opts});
    games.push(g); return g;
  }
  async function check(label, fn){
    let error;
    try { await fn(); } catch(err){ error=err; }
    finally {
      for(const g of games.splice(0)){
        try { g.dispose(); } catch(err){ if(!error) error=err; else console.error("cleanup:",err); }
      }
    }
    if(error){ fails++; console.log("  ✖ " + label + ": " + error.message); }
    else { passes++; console.log("  ✔ " + label); }
  }
  console.log("\nREGRESIONES · estado, grid, combate e interfaz…");

  await check("una CARRERA válida cobra independientemente del orden de otros fracasos", () => {
    for(const reverse of [false, true]){
      const g = game();
      g.run("S=nuevoEstado();ensureStateIntegrity();S.player.heat=40;");
      const S = g.run("S");
      const failed = { type:"recoleta", n:1, prog:{gathered:0}, reward:100, xp:10, contact:"mamaWire", title:"Recolección", done:false, failed:false };
      const race = { type:"carrera", n:1, prog:{deepGathered:1}, reward:100, xp:10, contact:"mamaWire", title:"Carrera", done:false, failed:false };
      S.jobs = reverse ? [race, failed] : [failed, race];
      g.run('inImmersion={data:[],moves:1,maxDepthReached:3,combatOccurred:false};doSuperficializar();');
      assert.equal(race.done, true);
      assert.equal(race.failed, false);
      assert.equal(S.player.credits, 600);
    }
  });

  await check("SEALED NETWORK en LEGENDARIO alcanza la capa 6 y posteriores", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.history.finalDone=true;S.best.finalDone=true;S.difficulty="legendario";S._endlessSurfaces=4;ACTIONS.startEndless();');
    assert.ok(g.run("inImmersion.depth") >= 6);
    assert.ok(g.run("inImmersion.grid.maxDepth") >= 6);
  });

  await check("superficializar guarda contadores, récord endless y logros antes de avisar", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.player.stats.ghostRuns=2;S.player.stats.cleanSrf=2;S.history.endlessActive=true;S._endlessSurfaces=4;inImmersion={data:[],moves:2,maxDepthReached:6,combatOccurred:false};doSuperficializar();');
    const state = g.saved();
    assert.equal(state.player.stats.ghostRuns, 3);
    assert.equal(state.player.stats.cleanSrf, 3);
    assert.equal(state._endlessSurfaces, 5);
    assert.equal(state.best.endlessMaxDepth, 6);
    assert.ok(state.achievements.includes("ghost"));
    assert.ok(state.achievements.includes("silent"));
  });

  await check("el resumen cuenta ICE destruidos en la inmersión, no siempre cero", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();startImmersion(4);var n=inImmersion.grid.nodes[1];n.type="ice";n.tier=1;n.tierName="T1";n.name="TEST";inImmersion.combatOccurred=true;onNodeDefeated({node:n});doSuperficializar();');
    assert.match(g.sb.document.getElementById("overlay-inner").innerHTML, /Enemigos derrotados<\/span><span class="rv">1<\/span>/);
  });

  await check("FLATLINE HARDCORE queda persistido y no permite otra inmersión", () => {
    const g = game(); let overlays = 0;
    const el = g.sb.document.getElementById("flatline");
    el.classList.add = name => { if(name === "show") overlays++; };
    g.run('S=nuevoEstado();ensureStateIntegrity();S.difficulty="hardcore";save();flatline();');
    assert.equal(g.saved().player.cpu, 0);
    g.run('afterBoot();clearInterval(loopId);clearTimeout(_glitchId);');
    assert.ok(overlays >= 2, "debe reaparecer la pantalla FLATLINE tras cargar");
    g.run('ACTIONS.reconnect();ACTIONS.dipGrid();');
    assert.equal(g.run('S.player.cpu'), 0);
    assert.equal(g.run('inImmersion'), null);
  });

  await check("RECONEXIÓN recupera checkpoint y contabiliza trabajos si los fracasa", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.jobs=[{id:"uno",type:"recoleta",title:"Uno",done:false,failed:false,prog:{gathered:0}}];save();S.player.credits=987;S.player.xp=29;flatline();afterBoot();clearInterval(loopId);clearTimeout(_glitchId);ACTIONS.reconnect();clearInterval(loopId);');
    const S = g.run("S");
    assert.equal(S.player.credits, 500);
    assert.equal(S.player.xp, 0);
    assert.ok(S.player.cpu >= 45);
    if(S.jobs[0] && S.jobs[0].failed) assert.equal(S.player.stats.jobsFailed, 1);
  });

  await check("la importación inválida conserva la partida y el bucle sigue vivo", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();');
    const before = g.run("S");
    g.sb.FileReader = function(){ this.readAsText = () => this.onload({target:{result:'{"player":1}'}}); };
    const input = g.sb.document.getElementById("import-file"); input.files=[{name:"invalida.json"}];
    g.emitElement("import-file", "change", {target:input});
    assert.equal(g.run("S"), before);
    assert.doesNotThrow(() => g.run("gameLoop()"));
  });

  await check("importar partida exportada durante inmersión mantiene el grid y los datos", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();startImmersion(4);inImmersion.data=[{value:77}];inImmersion.dataUsed=1;save();');
    const exported = g.saved(); exported.player.credits = 8765;
    g.run('inImmersion=null;S=nuevoEstado();ensureStateIntegrity();');
    g.sb.FileReader = function(){ this.readAsText = () => this.onload({target:{result:JSON.stringify(exported)}}); };
    const input = g.sb.document.getElementById("import-file"); input.files=[{name:"grid.json"}];
    g.emitElement("import-file", "change", {target:input});
    g.run("clearInterval(loopId);clearTimeout(_glitchId);");
    assert.equal(g.run("S.player.credits"), 8765);
    assert.equal(g.run("inImmersion.dataUsed"), 1);
    assert.equal(g.saved()._inImmersion.dataUsed, 1);
  });

  await check("se importa un guardado con transmisiones numéricas ya vistas", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S._seenTransmissions=[0,2];window.__candidate=JSON.parse(JSON.stringify(S));S._seenTransmissions=[];');
    assert.equal(g.run('importGameState(window.__candidate)'), true);
    assert.deepEqual(Array.from(g.run('S._seenTransmissions')), [0,2]);
    g.run('clearInterval(loopId);');
  });

  await check("importación con error tardío revierte también el guardado", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();save();window.__candidate=JSON.parse(JSON.stringify(S));window.__candidate.player.credits=8765;window.__failOnce=true;updateAmbient=function(){if(window.__failOnce){window.__failOnce=false;throw Error("render tardío");}};');
    const before=g.run('S');
    assert.equal(g.run('importGameState(window.__candidate)'), false);
    assert.equal(g.run('S'), before);
    assert.equal(g.saved().player.credits, 500);
    g.run('clearInterval(loopId);');
  });

  await check("un timeout del daemon anterior no inicia el siguiente combate", () => {
    const g = game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();S.player.sigilo=10;startCombat({node:{type:"daemon",tier:3,name:"A"},onWin:function(){}});');
    const old = g.ids(3500)[0]; assert.ok(old);
    g.run('doEscape();startCombat({node:{type:"daemon",tier:3,name:"B"},onWin:function(){}});');
    g.fire(old);
    for(const id of g.ids(600)) g.fire(id);
    assert.equal(g.run("COM.memPhase"), "reveal");
  });

  await check("un cooldown de vault cancelado no altera el intento siguiente", () => {
    const g = game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();var auditVault={type:"vault",tier:3,name:"Vault",proj:"TEST"};startVaultPuzzle(auditVault);');
    const first = g.ids(3000)[0]; assert.ok(first); g.fire(first);
    g.run('vaultFail();');
    const old = g.ids(10000)[0]; assert.ok(old);
    g.run('ACTIONS.vaultCancel();startVaultPuzzle(auditVault);');
    g.fire(old);
    assert.equal(g.run("VAULT_PUZZLE.phase"), "show");
  });

  await check("el ambiente permanece en combate mientras siga activo", () => {
    const g = game();g.sb.__modes=[];
    g.run('S=nuevoEstado();ensureStateIntegrity();S.amb=true;S.mus=false;inImmersion={grid:{nodes:[]},current:"0_0"};combatActive=true;startAmbient=function(m){AMBIENT.activeMode=m;window.__modes.push(m);};for(var i=0;i<5;i++)updateAmbient();');
    assert.deepEqual(g.sb.__modes, ["combat"]);
  });

  await check("si FULL se deniega, ni preferencia ni aviso quedan activados", async () => {
    const g = game();
    g.sb.document.documentElement.requestFullscreen = () => Promise.reject(new Error("NotAllowedError"));
    g.run('S=nuevoEstado();ensureStateIntegrity();toggleFs();');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(g.run("_fsWants"), false);
    assert.notEqual(g.sb.localStorage.getItem("cypher_os_full"), "1");
    assert.equal(g.run("fsActive()"), false);
  });

  await check("EXPORTAR DIARIO respeta también la búsqueda textual", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.log=[{t:"23:48",text:"INTEL ▸ corvo"},{t:"23:49",text:"TIENDA ▸ pulso"}];renderRegistro();renderLogEntries("corvo");ACTIONS.exportDiario();');
    const text = g.sb.__blobs[0].parts.join("");
    assert.ok(text.includes("INTEL ▸ corvo"));
    assert.ok(!text.includes("TIENDA ▸ pulso"));
  });

  await check("el comando Núcleo no reasigna el jefe derrotado", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.player.level=5;S.player.rep.night0X=3;S.history.finalDone=true;CMD.nucleo();');
    assert.equal(g.run("S.nextDepth"), null);
  });

  await check("el árbol permite activar ROMPEMUROS con teclado", () => {
    const g = game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.player.skillPoints=1;');
    const tree = g.sb.document.getElementById("skilltree-overlay");
    g.run('renderSkillTree();');
    const first=tree.querySelector('.skill-node[tabindex="0"]');
    const handlers=Object.fromEntries(g.sb.__events.listeners(first).map(entry => [entry.type,entry.list[0].callback]));
    const native=/<button\b[^>]*class="skill-node/.test(tree.innerHTML);
    const role=/role="button"/.test(tree.innerHTML) && /tabindex="0"/.test(tree.innerHTML);
    assert.ok(native || role,"nodos enfocables y con semántica de botón");
    assert.equal(typeof handlers.click,"function");
    if(native) first.click();
    else {
      assert.equal(typeof handlers.keydown,"function");
      g.emitElement(first,"keydown",{key:"Enter"});
    }
    assert.ok(g.run('S.player._unlockedSkills.indexOf("rompe1")>=0'));
  });

  await check("FLATLINE bloquea terminal, compras y foco del fondo sin perder Ctrl+S", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();S.difficulty="hardcore";save();flatline();');
    const cmd=g.sb.document.getElementById("cmd");
    assert.equal(g.sb.document.getElementById("os").inert,true);
    assert.equal(g.emitDocument("keydown",{key:"k",ctrlKey:true}),true);
    assert.notEqual(g.sb.document.activeElement,cmd);
    cmd.value="tienda";
    g.emitElement("cmd","keydown",{key:"Enter"});
    clickAction(g,"buyItem",{"data-id":"repair"});
    g.run('ACTIONS.buyItem({getAttribute:function(){return "repair";}});');
    assert.equal(g.run("S.player.cpu"),0);
    assert.equal(g.run("S.player.credits"),500);
    assert.equal(g.emitDocument("keydown",{key:"s",ctrlKey:true}),true);
    assert.equal(g.saved().player.cpu,0);
    clickAction(g,"newRecord");
    assert.equal(g.run("confirmOpen()"),true);
    clickAction(g,"confirmNo");
    assert.equal(g.run("confirmOpen()"),false);
    g.run('afterBoot();');
    assert.equal(g.run("S.player.cpu"),0);
    assert.equal(g.sb.document.getElementById("os").inert,true);
  });

  await check("Tab no sale de la capa bloqueante y el foco se desbloquea al reconectar", () => {
    const g=game({timers:true});
    const flat=g.sb.document.getElementById("flatline");
    g.run('S=nuevoEstado();ensureStateIntegrity();save();flatline();');
    const first=flat.querySelector('[data-action="reconnect"]'), last=flat.querySelector('[data-action="newRecord"]');
    assert.equal(g.sb.document.activeElement,first);
    last.focus();
    assert.equal(g.emitDocument("keydown",{key:"Tab",target:last}),true);
    assert.equal(g.sb.document.activeElement,first);
    assert.equal(g.emitDocument("keydown",{key:"Tab",shiftKey:true,target:first}),true);
    assert.equal(g.sb.document.activeElement,last);
    clickAction(g,"reconnect");
    assert.equal(g.sb.document.getElementById("os").inert,false);
    assert.ok(g.run("S.player.cpu")>0);
  });

  await check("RESET e IMPORTAR se rechazan en combate y no sustituyen su estado", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();startImmersion(4);startCombat({node:{type:"ice",tier:1,name:"TEST"},onWin:onNodeDefeated});');
    const before=g.run("S"), battle=g.run("COM");
    assert.equal(g.sb.document.getElementById("os").inert,true);
    g.emitElement("btn-reset","click");
    assert.equal(g.run("confirmOpen()"),false);
    assert.equal(g.run("importGameState(nuevoEstado())"),false);
    assert.equal(g.run("S"),before);
    assert.equal(g.run("COM"),battle);
    g.run('cancelActiveCombat();');
    g.emitElement("btn-reset","click");
    clickAction(g,"confirmYes");
    assert.notEqual(g.run("S"),before);
    assert.equal(g.run("COM"),null);
    assert.equal(g.run("combatActive"),false);
    assert.equal(g.run("inImmersion"),null);
    assert.equal(g.saved()._inImmersion,null);
    assert.equal(g.sb.document.getElementById("os").inert,false);
  });

  await check("cancelar runtime invalida timers de memoria y vault sin recompensar", () => {
    for(const mode of ["memoria","vault"]){
      const g=game({timers:true});
      g.run('S=nuevoEstado();ensureStateIntegrity();');
      if(mode==="memoria")g.run('startCombat({node:{type:"daemon",tier:3,name:"TEST"},onWin:function(){S.player.credits+=1000;}});');
      else g.run('startVaultPuzzle({type:"vault",tier:3,proj:"TEST"});');
      const id=g.ids(mode==="memoria"?3500:3000)[0];assert.ok(id);
      g.run('cancelActiveCombat();');
      assert.equal(g.fire(id),false);
      assert.equal(g.run("COM"),null);
      assert.equal(g.run("VAULT_PUZZLE"),null);
      assert.equal(g.run("combatActive"),false);
      assert.equal(g.run("S.player.credits"),500);
    }
  });

  await check("VAULT no se acepta estando inmerso y vuelve a ser aceptable en la calle", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();generateOffers();startImmersion(4);');
    const offer=g.run('S.offers.filter(function(o){return o.type==="vault";})[0]');
    const html=g.run('offerHtml(S.offers.filter(function(o){return o.type==="vault";})[0],CONTACTOS_DEF[1])');
    assert.ok(!html.includes('data-action="acceptJob"'));
    clickAction(g,"acceptJob",{"data-id":offer.id,"data-contact":offer.contact});
    assert.equal(g.run("S.jobs.length"),0);
    g.run('superficializar();ACTIONS.closeResume();showView("contactos");');
    clickAction(g,"acceptJob",{"data-id":offer.id,"data-contact":offer.contact});
    assert.equal(g.run("S.jobs.length"),1);
    g.run('startImmersion(4);');
    assert.equal(g.run('inImmersion.grid.nodes.filter(function(n){return n.type==="vault";}).length'),1);
  });

  await check("NÚCLEO asignado durante inmersión persiste, se consume y genera un solo boss", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();S.player.level=5;S.player.rep.night0X=3;checkUnlocks();startImmersion(4);showView("inicio");');
    clickAction(g,"acceptNucleo");
    assert.equal(g.run("S.nextDepth"),5);
    g.run('superficializar();ACTIONS.closeResume();');
    assert.equal(g.saved().nextDepth,5);
    g.run('ACTIONS.dipGrid();');
    assert.equal(g.run("inImmersion.depth"),5);
    assert.equal(g.run('inImmersion.grid.nodes.filter(function(n){return n.boss;}).length'),1);
    assert.equal(g.run("S.nextDepth"),null);
  });

  await check("importación rechaza habilidades malformadas sin perder sesión ni guardado", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();S.player.credits=1234;save();');
    const before=g.run("S");
    for(const bad of [{},"rompe1",42,[42]]){
      g.sb.__badSkills=bad;
      assert.equal(g.run('var candidate=nuevoEstado();candidate.player._unlockedSkills=window.__badSkills;importGameState(candidate)'),false);
      assert.equal(g.run("S"),before);
      assert.equal(g.saved().player.credits,1234);
      assert.doesNotThrow(()=>g.run('renderSkillTree();'));
    }
    assert.equal(g.run('importGameState(nuevoEstado())'),true,"guardado antiguo sin skills se migra");
    assert.ok(Array.isArray(g.run('S.player._unlockedSkills')));
  });

  await check("pico de calor por tres fracasos se guarda con INTEL y logro tras enfriar", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();generateOffers();');
    const offers=g.run('S.offers.filter(function(o){return o.type!=="vault";}).slice(0,3)');
    for(const o of offers)clickAction(g,"acceptJob",{"data-id":o.id,"data-contact":o.contact});
    g.run('S.player.heat=80;S.player.stats.maxHeat=80;startImmersion(4);superficializar();ACTIONS.confirmSurf();');
    assert.equal(g.run("S.player.heat"),88);
    assert.equal(g.run("S.player.stats.maxHeat"),100);
    assert.ok(g.saved().intel.includes("ruido"));
    assert.ok(g.saved().achievements.includes("heatMaster"));
  });

  await check("ESC huye en revelación de memoria una sola vez; no huye del boss", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();Math.random=function(){return 0;};startCombat({node:{type:"daemon",tier:3,name:"TEST"},onWin:function(){}});');
    assert.equal(g.run("COM.memPhase"),"reveal");
    g.emitDocument("keydown",{key:"Escape",target:g.sb.document.body});
    assert.equal(g.run("combatActive"),false);
    assert.equal(g.run("S.player.heat"),5);
    assert.equal(g.sb.document.getElementById("os").inert,false);
    g.run('startCombat({node:{type:"nucleo",tier:4,boss:true,name:"TEST"},onWin:function(){}});');
    g.emitDocument("keydown",{key:"Escape"});
    assert.equal(g.run("combatActive"),true);
    g.run('cancelActiveCombat();');
  });

  await check("bloquear fondo del combate no roba el foco del input de claves", () => {
    const g=game({timers:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();startCombat({node:{type:"ice",tier:1,name:"TEST"},onWin:function(){}});');
    const input=g.sb.document.getElementById("codeInput");
    assert.equal(g.sb.document.activeElement,input);
    assert.equal(g.sb.document.getElementById("os").inert,true);
    g.run('cancelActiveCombat();');
  });

  await check("FX OFF guardado silencia COMENZAR y BIOS antes de cargar S", () => {
    const g=game({timers:true}), audio=audioModel();
    g.sb.AudioContext=function(){return audio.ac;};
    g.run('var bootSave=nuevoEstado();bootSave.snd=false;localStorage.setItem("cypher_os_save_v9",JSON.stringify(bootSave));');
    g.emitElement("intro-start","click");
    g.run('sound.bootLine();sound.bootEnd();');
    assert.equal(g.run("S"),null);
    assert.equal(audio.nodes.length,0);
    g.sb.localStorage.removeItem("cypher_os_save_v9");
    g.run('sound.bootLine();');
    assert.ok(audio.nodes.some(n=>n.started),"arranque nuevo conserva FX por defecto");
  });

  await check("AMB apagado detiene y desconecta todos sus nodos tras cambios de modo", () => {
    const g=game({timers:true}), audio=audioModel();
    g.sb.AudioContext=function(){return audio.ac;};
    g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;initAudio();');
    for(let i=0;i<5;i++){
      g.emitElement("h-amb","click");
      assert.equal(g.run("S.amb"),true);
      g.emitElement("h-amb","click");
      assert.equal(g.run("S.amb"),false);
    }
    assert.ok(audio.nodes.length>0);
    assert.ok(audio.nodes.filter(n=>n.source).every(n=>n.stopped));
    assert.ok(audio.nodes.every(n=>n.disconnected));
    g.run('S.amb=true;startAmbient("grid");startAmbient("combat");startAmbient("flatline");stopAmbient();');
    assert.ok(audio.nodes.filter(n=>n.source).every(n=>n.stopped));
    assert.ok(audio.nodes.every(n=>n.disconnected));
  });

  await check("QA-01: una emboscada y su huida mantienen HUD y vecinos del nodo actual", () => {
    const g=game({seed:40003});
    const click=selector=>{
      const el=g.sb.document.querySelector(selector);
      assert.ok(el, "control presente: " + selector); el.click();
    };
    click("#intro-start"); g.advance(180);
    click("#boot"); g.advance(520);
    g.run('S._tutorialDone=true;S.player.level=6;S.player.sigilo=5;');
    click('[data-action="dipGrid"]');
    for(let i=0;i<15;i++)click('.adj-node[data-idx="0"]');
    assert.equal(g.run('COM.node.scavenger'),true);
    assert.equal(g.run('inImmersion.current'),"0_0");
    assert.ok(g.sb.document.getElementById("adjlist").textContent.includes("PUERTO DE CALLE"),"HUD actualizado ya bajo la emboscada");
    click("#escapeBtn"); click("#escapeBtn"); g.advance(1000);
    assert.equal(g.run("combatActive"),false);
    assert.equal(g.run("inImmersion.current"),"0_0");
    assert.ok(g.sb.document.getElementById("adjlist").textContent.includes("PUERTO DE CALLE"));
    const neighbor=g.sb.document.querySelector('.adj-node[data-idx="1"]');
    assert.match(neighbor.textContent,/ICE T1/);
    assert.equal(g.run('currentNeighbors()[1].name'),"GRIFO");
    assert.ok(!neighbor.textContent.includes("DATOS"));
    neighbor.click();
    assert.equal(g.run("inImmersion.current"),"1_1");
    assert.equal(g.run('COM.node.name'),"GRIFO");
  });

  await check("QA-01: ganar el rastreador ante RAM llena no deja el HUD de la ruta anterior", () => {
    const g=game({seed:5});
    g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;S.player._gridEventCooldown=3;startImmersion(4);inImmersion.dataUsed=ramCap();inImmersion.data=Array.from({length:ramCap()},function(){return {value:10};});S.player.stats.data=ramCap();renderGridHud();');
    const target=g.run('currentNeighbors()[2].id');
    assert.equal(target,"1_2");
    g.sb.document.querySelector('.adj-node[data-idx="2"]').click();
    assert.equal(g.run('COM.node.scavenger'),true);
    const input=g.sb.document.getElementById("codeInput");
    input.value=g.sb.document.getElementById("codeTarget").textContent.replace(/\s/g,"").toLowerCase();
    g.emitElement("codeInput","input");
    assert.equal(g.run("combatActive"),false);
    assert.equal(g.run("inImmersion.current"),target);
    assert.ok(g.sb.document.getElementById("adjlist").textContent.includes("NODO DE DATOS"));
    assert.equal(g.run("inImmersion.dataUsed"),6);
    assert.equal(g.run("S.player.stats.data"),6);
    assert.equal(g.run('nodeById(inImmersion.current).done'),false);
    assert.equal(g.run("S.player.stats.ice"),1);
  });

  await check("QA-02: todos los contadores y speedrun rechazan tipos dañados sin sustituir estado", () => {
    const g=game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;S.player.credits=1234;save();');
    const original=g.run("S"), raw=g.sb.localStorage.getItem("cypher_os_save_v9");
    const defaults=g.run("defaultStats()");
    const fields=Object.keys(defaults).filter(key=>typeof defaults[key]==="number");
    for(const key of fields){
      for(const bad of ["dañado","0",[],{},true,NaN,Infinity]){
        const candidate=JSON.parse(raw);candidate.player.stats[key]=bad;g.sb.__candidate=candidate;
        assert.equal(g.run('importGameState(window.__candidate)'),false,key+" tipo inválido");
        assert.equal(g.run("S"),original);
        assert.equal(g.sb.localStorage.getItem("cypher_os_save_v9"),raw);
      }
    }
    for(const bad of ["true","false",1,[],{}]){
      const candidate=JSON.parse(raw);candidate.player.stats.speedrun=bad;g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false,"speedrun debe ser booleano");
      assert.equal(g.run("S"),original);
      assert.equal(g.sb.localStorage.getItem("cypher_os_save_v9"),raw);
    }
    for(const bad of ["dañado",false,[],{},NaN]){
      const candidate=JSON.parse(raw);candidate.player.stats.iceByTier[1]=bad;g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false,"tier debe ser numérico");
      assert.equal(g.run("S"),original);
    }
    g.run('showView("tienda");');
    clickAction(g,"buyItem",{"data-id":"decoy"});
    assert.equal(g.saved().player.stats.totalCreditsSpent,140);
    assert.equal(typeof g.saved().player.stats.totalCreditsSpent,"number");
    assert.equal(g.saved().player.credits,1094);
  });

  await check("QA-02: legacy ausente/null migra números y booleanos sin heredar estado local", () => {
    const g=game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;S.player.credits=9999;S.best={level:99};');
    const candidate=g.run('var legacy=nuevoEstado();legacy.snd=false;legacy.mus=false;legacy.player.stats={ice:2,speedrun:null};legacy.best={maxHeat:75,ghostRuns:2,cleanSrf:1,substationsUsed:4,totalSpent:345,speedrun:true};legacy;');
    g.sb.__candidate=candidate;
    assert.equal(g.run('importGameState(window.__candidate)'),true);
    const stats=g.saved().player.stats;
    assert.equal(stats.maxHeat,75);
    assert.equal(stats.ghostRuns,2);
    assert.equal(stats.cleanSrf,1);
    assert.equal(stats.substationsUsed,4);
    assert.equal(stats.totalCreditsSpent,345);
    assert.equal(stats.speedrun,true);
    assert.equal(stats.combatStreak,0);
    assert.equal(stats.luckyRun,0);
    assert.equal(stats.totalDamageReceived,0);
    assert.equal(g.saved().player.credits,500);
    assert.equal(g.saved().best.level,undefined);
  });

  await check("QA-02: best legacy y flags malformados no introducen corrupción al migrar", () => {
    const g=game();
    g.run('S=nuevoEstado();ensureStateIntegrity();S.snd=false;S.mus=false;save();');
    const original=g.run("S"), raw=g.sb.localStorage.getItem("cypher_os_save_v9");
    const badBest={maxHeat:"dañado",ghostRuns:[],cleanSrf:{},substationsUsed:true,totalSpent:"345",speedrun:"true",finalDone:"false"};
    for(const [key,bad] of Object.entries(badBest)){
      const candidate=JSON.parse(raw);candidate.player.stats={};candidate.best={[key]:bad};g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false,"legacy best."+key);
      assert.equal(g.run("S"),original);
      assert.equal(g.sb.localStorage.getItem("cypher_os_save_v9"),raw);
    }
    for(const key of ["snd","amb","mus"]){
      const candidate=JSON.parse(raw);candidate[key]="false";g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false,"flag "+key);
      assert.equal(g.run("S"),original);
    }
    for(const key of ["finalUnlocked","finalDone"]){
      const candidate=JSON.parse(raw);candidate.history[key]="false";g.sb.__candidate=candidate;
      assert.equal(g.run('importGameState(window.__candidate)'),false,"history."+key);
      assert.equal(g.run("S"),original);
    }
  });

  console.log("Regresiones: " + passes + " correctas · " + fails + " fallos");
  return options.summary ? {passes,fails,total:passes+fails} : fails;
}

if(require.main === module){
  run().then(fails => { process.exitCode = fails ? 1 : 0; }, err => {
    console.error(err); process.exitCode = 1;
  });
}
module.exports = { run };
