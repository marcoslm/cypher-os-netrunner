/* Regresiones de gameplay/persistencia de CYPHER://OS. Sin dependencias. */
"use strict";
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { createSandbox, readSources, FILES } = require("./harness");

function game(options = {}){
  const sb = createSandbox(), src = readSources(), events = {}, elementEvents = {}, docEvents = {};
  sb.Math = Object.create(Math);
  const getElement = sb.document.getElementById;
  sb.document.getElementById = function(id){
    const el = getElement(id);
    if(!elementEvents[id]){
      elementEvents[id]={};
      el.addEventListener=(type,fn)=>{ (elementEvents[id][type] || (elementEvents[id][type]=[])).push(fn); };
      el.removeEventListener=(type,fn)=>{ elementEvents[id][type]=(elementEvents[id][type]||[]).filter(f=>f!==fn); };
      el.focus=()=>{ sb.document.activeElement=el; };
      const classes=new Set();
      el.classList={add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),
        contains:n=>classes.has(n),toggle:(n,on)=>{ if(on===undefined) on=!classes.has(n); if(on) classes.add(n); else classes.delete(n); }};
    }
    return el;
  };
  sb.document.addEventListener=(type,fn,capture)=>{ (docEvents[type] || (docEvents[type]=[])).push({fn,capture:!!capture}); };
  sb.document.removeEventListener=(type,fn)=>{ docEvents[type]=(docEvents[type]||[]).filter(e=>e.fn!==fn); };
  let timerId = 0;
  const timers = new Map();
  if(options.timers){
    sb.setTimeout = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
    sb.clearTimeout = id => timers.delete(id);
    sb.setInterval = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms, interval:true }); return id; };
    sb.clearInterval = id => timers.delete(id);
  }
  if(options.importEvents){
    const get = sb.document.getElementById;
    sb.document.getElementById = function(id){
      const el = get(id);
      if(id === "import-file") el.addEventListener = (name, handler) => { events[name] = handler; };
      return el;
    };
  }
  const ctx = vm.createContext(sb);
  vm.runInContext(src.help, ctx);
  for(const f of FILES.js) vm.runInContext(src.jsFiles[f], ctx, { filename:f });
  return {
    sb, src, events, run: code => vm.runInContext(code, ctx),
    emitElement: (id,type,event={}) => {
      const el=sb.document.getElementById(id);
      for(const fn of elementEvents[id][type] || []) fn.call(el, Object.assign({target:el},event));
    },
    emitDocument: (type,event={}) => {
      let stopped=false, immediate=false, prevented=false;
      const e=Object.assign({target:sb.document.activeElement||sb.document.body,ctrlKey:false,altKey:false,shiftKey:false,repeat:false,
        preventDefault(){prevented=true;},stopPropagation(){stopped=true;},stopImmediatePropagation(){immediate=true;stopped=true;}},event);
      for(const capture of [true,false]){
        for(const entry of (docEvents[type] || []).filter(x=>x.capture===capture)){
          entry.fn(e); if(immediate) break;
        }
        if(stopped) break;
      }
      return prevented;
    },
    saved: () => JSON.parse(sb.localStorage.getItem("cypher_os_save_v9")),
    pending: () => timers.size,
    ids: ms => Array.from(timers).filter(([, t]) => t.ms === ms).map(([id]) => id),
    fire: id => { const t = timers.get(id); if(!t) return false; if(!t.interval) timers.delete(id); t.fn(); return true; }
  };
}

function clickAction(g, action, attrs={}){
  const data=Object.assign({"data-action":action},attrs);
  const button={disabled:false,getAttribute:key=>data[key]||null,closest:selector=>selector==="[data-action]"?button:null};
  g.emitDocument("click",{target:button});
}

function audioModel(){
  const nodes=[];
  const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},exponentialRampToValueAtTime(){}});
  function node(source=false){
    const n={source,started:false,stopped:false,disconnected:false,gain:param(),frequency:param(),
      connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};
    nodes.push(n); return n;
  }
  const ac={state:"running",currentTime:0,sampleRate:8,destination:{},
    resume:()=>Promise.resolve(),createOscillator:()=>node(true),createBufferSource:()=>node(true),
    createGain:()=>node(),createBiquadFilter:()=>node(),createBuffer:(channels,len)=>({getChannelData:()=>new Float32Array(len)})};
  return {nodes,ac};
}

async function run(){
  let fails = 0, passes = 0;
  async function check(label, fn){
    try { await fn(); passes++; console.log("  ✔ " + label); }
    catch(err){ fails++; console.log("  ✖ " + label + ": " + err.message); }
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
    const g = game({importEvents:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();');
    const before = g.run("S");
    g.sb.FileReader = function(){ this.readAsText = () => this.onload({target:{result:'{"player":1}'}}); };
    const input = g.sb.document.getElementById("import-file"); input.files=[{name:"invalida.json"}];
    g.events.change.call(input, {target:input});
    assert.equal(g.run("S"), before);
    assert.doesNotThrow(() => g.run("gameLoop()"));
  });

  await check("importar partida exportada durante inmersión mantiene el grid y los datos", () => {
    const g = game({importEvents:true});
    g.run('S=nuevoEstado();ensureStateIntegrity();startImmersion(4);inImmersion.data=[{value:77}];inImmersion.dataUsed=1;save();');
    const exported = g.saved(); exported.player.credits = 8765;
    g.run('inImmersion=null;S=nuevoEstado();ensureStateIntegrity();');
    g.sb.FileReader = function(){ this.readAsText = () => this.onload({target:{result:JSON.stringify(exported)}}); };
    const input = g.sb.document.getElementById("import-file"); input.files=[{name:"grid.json"}];
    g.events.change.call(input, {target:input});
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
    g.run('S=nuevoEstado();ensureStateIntegrity();S.log=[{t:"23:48",text:"INTEL ▸ corvo"},{t:"23:49",text:"TIENDA ▸ pulso"}];renderLogEntries("corvo");ACTIONS.exportDiario();');
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
    const tree = g.sb.document.getElementById("skilltree-overlay"), handlers={};
    const first = {getAttribute: attr => attr==="data-branch"?"0":"0",addEventListener:(name,handler)=>{handlers[name]=handler;}};
    tree.querySelectorAll=()=>[first];
    g.run('renderSkillTree();');
    const native=/<button\b[^>]*class="skill-node/.test(tree.innerHTML);
    const role=/role="button"/.test(tree.innerHTML) && /tabindex="0"/.test(tree.innerHTML);
    assert.ok(native || role,"nodos enfocables y con semántica de botón");
    assert.equal(typeof handlers.click,"function");
    if(native) handlers.click.call(first);
    else {
      assert.equal(typeof handlers.keydown,"function");
      handlers.keydown.call(first,{key:"Enter",preventDefault(){}});
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
    const flat=g.sb.document.getElementById("flatline"), first=g.sb.document.getElementById("reconnect-control"), last=g.sb.document.getElementById("record-control");
    flat.querySelectorAll=()=>[first,last]; flat.contains=n=>[first,last].includes(n);
    g.run('S=nuevoEstado();ensureStateIntegrity();save();flatline();');
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
    const combat=g.sb.document.getElementById("combat"), input=g.sb.document.getElementById("codeInput"), escape=g.sb.document.getElementById("escapeBtn");
    combat.contains=n=>[input,escape].includes(n);
    combat.querySelectorAll=()=>[input,escape];
    g.run('S=nuevoEstado();ensureStateIntegrity();startCombat({node:{type:"ice",tier:1,name:"TEST"},onWin:function(){}});');
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

  console.log("Regresiones: " + passes + " correctas · " + fails + " fallos");
  return fails;
}

if(require.main === module){
  run().then(fails => { process.exitCode = fails ? 1 : 0; }, err => {
    console.error(err); process.exitCode = 1;
  });
}
module.exports = { run };
