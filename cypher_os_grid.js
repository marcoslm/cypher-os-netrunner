/* ============================================================
   CYPHER://OS  ·  cypher_os_grid.js — GRID / CIBERESPACIO
   Generación procedural del grid, inmersión, nodos, eventos y render
   por <canvas> (incluye superficializar y el resumen post-inmersión).
   Orden de carga de los .js (scripts clásicos sin módulos, ámbito global
   compartido; ver AGENTS.md §4):
     1/6 data → 2/6 core → 3/6 audio → 4/6 grid → 5/6 combat → 6/6 ui
   ============================================================ */
'use strict';

/* ============================================================
   7. GRID / CIBERESPACIO
   ============================================================ */

var inImmersion = null;
var combatActive = false;
var gridRender = false, gridRAF=null, gridHoverNode=null, particles=[];
var particleGrid=[], PARTICLE_CELL_W=8, PARTICLE_CELL_H=14, PARTICLE_COLS=0, PARTICLE_ROWS=0;

function randHexPair(){ return HEX[randInt(0,15)]+HEX[randInt(0,15)]; }
function spawnParticle(init){
  var col=randInt(0,PARTICLE_COLS-1);
  /* buscar una fila libre en esta columna desde abajo */
  var row=-1;
  for(var r=PARTICLE_ROWS-1;r>=0;r--){ if(!particleGrid[r][col]){ row=r; break; } }
  if(row<0) return; /* columna completa, saltar */
  particleGrid[row][col]=1;
  var maxL=randInt(1200,2400);
  var pt={ col:col, row:row, ch:randHexPair(), spd:rand(0.4,0.9),
    life: maxL, maxLife: maxL };
  if(init){
    /* distribuir verticalmente de forma uniforme al iniciar */
    pt.y=rand(0,540);
    pt.life=randInt(200,maxL);
  } else {
    pt.y=PARTICLE_ROWS*PARTICLE_CELL_H;
  }
  pt.x=col*PARTICLE_CELL_W;
  particles.push(pt);
}

// Generación procedural del grid.
// spawnBoss=true solo en la misión final: solo ahí existe ✦ EL NÚCLEO en capa 5.
function generateGrid(maxDepth, spawnBoss){
  var nodes=[], adj={}, byLayer=[];
  for(var l=0; l<=maxDepth; l++){
    var count = NODOS_CAPA[l] || 3, layer=[];
    byLayer.push(layer);
    for(var i=0;i<count;i++){
      layer.push({ id:l+"_"+i, layer:l, x:0, y:0, type:"empty", tier:0,
        data:0, name:"", proj:null, tierName:"", done:false, _used:false, _done:false });
    }
  }
  for(var k=0;k<byLayer.length;k++){ byLayer[k].forEach(function(n){ nodes.push(n); }); }
  var W=960, H=540, padX=80;
  for(var k=0;k<byLayer.length;k++){
    var L=byLayer[k], cnt=L.length, spacing=(H-100)/(cnt+1);
    for(var j=0;j<cnt;j++){
      L[j].x = padX + (k/maxDepth)*(W-2*padX) + rand(-22,22);
      L[j].y = 60 + spacing*(j+1) + rand(-14,14);
    }
  }
  function addConn(a,b){
    adj[a]=adj[a]||[]; adj[b]=adj[b]||[];
    if(adj[a].indexOf(b)<0) adj[a].push(b);
    if(adj[b].indexOf(a)<0) adj[b].push(a);
  }
  for(var m=1;m<byLayer.length;m++){
    var cur=byLayer[m], prev=byLayer[m-1];
    cur.forEach(function(n,idx){ addConn(n.id, prev[idx % prev.length].id); });
  }
  for(var q=1;q<byLayer.length;q++){
    byLayer[q].forEach(function(n){
      if(Math.random()<0.3 && q>=1){
        var nb = byLayer[q][randInt(0,byLayer[q].length-1)];
        if(nb!==n && Math.random()<0.5) addConn(n.id, nb.id);
      }
    });
  }

  var entry = byLayer[0][0];
  entry.type = "puerto"; entry.name = "PUERTO DE CALLE";

  for(var layer=1; layer<=maxDepth; layer++){
    var nodesL=byLayer[layer];
    var tierPool = (layer===1)?["T1"] :
                   (layer===2)?["T1","T1","T2"] :
                   (layer===3)?["T2","T2","T3"] :
                   (layer===4)?["T2","T3","T3"] : ["T3"];
    /* calor >= 70: subir tier pool (+1 nivel) */
    if(S && S.player.heat>=70){
      tierPool=tierPool.map(function(t){ return t==="T1"?"T2":(t==="T2"?"T3":"T3"); });
    }
    /* legendario: tier pool sube +1 nivel */
    if(S && S._legendaryTierBoost){
      tierPool=tierPool.map(function(t){ return t==="T1"?"T2":(t==="T2"?"T3":"T3"); });
    }
    nodesL.forEach(function(n){
      if(spawnBoss && layer===5 && n.id===byLayer[5][0].id){
        n.type="nucleo"; n.tier=4; n.tierName="T4"; n.name="EL NÚCLEO"; n.boss=true; return;
      }
      var r=Math.random();
      if(layer<=3 && r<0.12){ n.type="substation"; n.name="SUBESTACIÓN"; return; }
      /* post-Núcleo: más subestaciones (0.20 en lugar de 0.12) */
      if(S.history && S.history.finalDone && layer<=3 && r<0.20){ n.type="substation"; n.name="SUBESTACIÓN"; return; }
      if(layer>=2 && r<0.12+0.08*layer){ n.type="daemon"; n.tier=3; n.tierName="T3"; n.name=pick(NOM_DAEMONES); return; }
      /* post-Núcleo: nodo SEÑAL (da +30 XP) */
      if(S.history && S.history.finalDone && r<0.12+0.08*layer+0.05){
        n.type="signal"; n.data=0; n.name="SEÑAL DEL NÚCLEO"; return;
      }
      /* post-Núcleo: ECO DEL NÚCLEO (ICE T2 con +60 XP) */
      if(S.history && S.history.finalDone && layer>=2 && Math.random()<0.10){
        n.type="ice"; n.tier=2; n.tierName="T2"; n.name="ECO DEL NÚCLEO"; n.isEcho=true; return;
      }
      if(r<0.45){
        var tier = pick(tierPool);
        n.type="ice"; n.tier = (tier==="T1"?1:tier==="T2"?2:3); n.tierName=tier;
        n.name = pick(["SERPIENTE","ESPEJO","CARCELERO","GRIFO","MÁGINA","FALCÓN"]); return;
      }
      n.type="data"; n.data = 30 + layer*25 + randInt(0,40); n.name="NODO DE DATOS";
    });
  }

  // Inyectar vault activo (uno solo) en la capa objetivo del contrato.
  // Solo del contrato ACTIVO: los resueltos (done) no deben generar vaults.
  for(var v=0; v<S.jobs.length; v++){
    if(S.jobs[v].type==="vault" && !S.jobs[v].done){
      var vv=S.jobs[v];
      var vl = Math.min(vv.targetDepth || maxDepth, maxDepth);
      var target = byLayer[vl];
      if(target && target.length){
        var node = target.length>1 ? target[1] : target[0];
        node.type="vault"; node.tier=3; node.tierName="T3";
        node.name="VAULT · "+vv.project; node.proj=vv.project; node.isVault=true;
      }
      break;
    }
  }
  return { nodes:nodes, adj:adj, byLayer:byLayer, entry:entry.id, maxDepth:maxDepth };
}

function startImmersion(depth){
  if(S.player.cpu<=0){
    msg("FLATLINE ▸ CPU a cero. No puedes sumergirte.","rojo");
    return;
  }
  if(isLockdown()){
    msg("LOCKDOWN ACTIVO ▸ calor demasiado alto. espera a que baje para conectarte.","rojo");
    return;
  }
  /* la misión final (S.nextDepth===5) es la ÚNICA inmersión con boss en capa 5 */
  var finalMission = (S.nextDepth===5 && S.history.finalUnlocked && !S.history.finalDone && !S.history.endlessActive);
  depth = depth || (S.nextDepth || 4);
  if(S.nextDepth) S.nextDepth=null;
  /* legendario: +1 sin techo en SEALED NETWORK; grids normales máximo capa 5 */
  if(S && S.difficulty==="legendario"){
    depth=S.history.endlessActive ? depth+1 : Math.min(depth+1,5);
    S._legendaryTierBoost=true;
  } else {
    S._legendaryTierBoost=false;
  }
  var g = generateGrid(depth, finalMission);
  /* informantes: revelar nodos en capas 1-2 del próximo grid */
  if(S._revealNextGrid){
    for(var ri=0;ri<g.nodes.length;ri++){
      if(g.nodes[ri].layer<=2) g.nodes[ri]._revealed=true;
    }
    S._revealNextGrid=false;
    addLog("INFORMANTES ▸ nodos de capas 1-2 revelados.");
  }
  inImmersion = {
    grid:g, depth:depth, current:g.entry,
    dataUsed:0, data:[], maxDepthReached:1, moves:0, combatOccurred:false,
    enemiesDefeated:0
  };
  addLog("DIP ▸ conexión establecida (capa 0).");
  msg(pickFresh("dip", FRASES_DIP),"cyan");
  /* efecto de dip: sonido + flash */
  sound.dip();
  var osEl = document.getElementById("os");
  if(osEl){ osEl.classList.remove("dip-flash"); void osEl.offsetWidth; osEl.classList.add("dip-flash"); }
  /* limpiar gridwrap para forzar reconstrucción del HUD con botón correcto */
  var oldWrap=document.getElementById("gridwrap");
  if(oldWrap && oldWrap.parentNode) oldWrap.parentNode.removeChild(oldWrap);
  showView("red");
  startGridRender();
  save(true);
  advanceTutorial();
}

function currentNeighbors(){
  if(!inImmersion) return [];
  var adj = inImmersion.grid.adj[inImmersion.current]||[];
  return adj.map(function(id){ return nodeById(id); }).filter(Boolean);
}
function nodeById(id){
  for(var i=0;i<inImmersion.grid.nodes.length;i++){
    if(inImmersion.grid.nodes[i].id===id) return inImmersion.grid.nodes[i];
  }
  return null;
}
function knownNode(n){
  if(!inImmersion || !n) return true;
  if(n.id===inImmersion.current) return true;
  if(n._hiddenMoves>0) return false;
  if(n._revealed) return true;
  return (inImmersion.grid.adj[inImmersion.current]||[]).indexOf(n.id)>=0;
}
function currentLayer(){
  if(!inImmersion) return 0;
  var n = nodeById(inImmersion.current);
  return n ? n.layer : 0;
}

function moveToNode(id){
  if(!inImmersion || combatActive) return;
  var curAdj = inImmersion.grid.adj[inImmersion.current]||[];
  if(curAdj.indexOf(id)<0){ msg("ese nodo no está conectado al actual.","ambar"); return; }
  var n = nodeById(id);
  if(!n){ msg("nodo inalcanzable.","rojo"); return; }
  /* fx de navegación (decorativo): onda de salida + estela hacia el nodo */
  var from = nodeById(inImmersion.current);
  if(gridRender && from){
    spawnRipple(from.x, from.y, "#ff4dc4");
    spawnBeam(from.x, from.y, n.x, n.y, nodeColor(n));
  }
  var heatGain = Math.max(1, (2 + (n.layer-1)) - S.player.sigilo*0.5);
  S.player.heat = clamp(S.player.heat + heatGain, 0, 100);
  inImmersion.moves++;
  inImmersion.current = id;
  if(n.layer > inImmersion.maxDepthReached) inImmersion.maxDepthReached = n.layer;
  S.player.stats.maxDepth = Math.max(S.player.stats.maxDepth, n.layer);
  /* decrementar ocultamiento de nodos */
  for(var i=0;i<inImmersion.grid.nodes.length;i++){
    var nd=inImmersion.grid.nodes[i];
    if(nd._hiddenMoves>0) nd._hiddenMoves--;
  }
  /* calor >= 85: alarma cada 5 movimientos */
  if(S.player.heat>=85 && inImmersion.moves%5===0){
    addLog("⚠ ALARMA CORPORATIVA ▸ señal de rastreo detectada.");
    msg("ALARMA ▸ los rastreadores te localizarán pronto. ¡vuelve!","rojo");
  }
  /* regeneración pasiva: +CPU por movimiento sin combate */
  if(S.player._unlockedSkills && S.player._unlockedSkills.length){
    var regenAmt=0;
    if(S.player._unlockedSkills.indexOf("regen1")>=0) regenAmt+=2;
    if(S.player._unlockedSkills.indexOf("regen2")>=0) regenAmt+=1;
    if(S.player._unlockedSkills.indexOf("regen3")>=0) regenAmt+=1;
    if(regenAmt>0) S.player.cpu=Math.min(S.player.cpu+regenAmt, S.player.maxCpu);
  }
  /* tracking de calor máximo para logros/intel (contador de partida) */
  if(S.player.heat>(S.player.stats.maxHeat||0)) S.player.stats.maxHeat=S.player.heat;
  /* eventos aleatorios del grid */
  tryGridEvent();
  /* resolver el nodo donde estás realmente (un evento puede haberte desplazado) */
  var target = nodeById(inImmersion.current) || n;
  if(tryScavenger()) return;
  enterNode(target);
  renderGridHud();
}

/* elección de evento ponderada por la probabilidad declarada en GRID_EVENTS */
function pickGridEvent(){
  var total=0,i;
  for(i=0;i<GRID_EVENTS.length;i++) total+=GRID_EVENTS[i].prob;
  var r=Math.random()*total;
  for(i=0;i<GRID_EVENTS.length;i++){ r-=GRID_EVENTS[i].prob; if(r<=0) return GRID_EVENTS[i]; }
  return GRID_EVENTS[GRID_EVENTS.length-1];
}

function tryGridEvent(){
  if(!inImmersion) return;
  /* cooldown: mínimo 3 movimientos entre eventos */
  if(!S.player._gridEventCooldown) S.player._gridEventCooldown=0;
  if(S.player._gridEventCooldown>0){ S.player._gridEventCooldown--; }
  else {
    var chance=0.10+S.player.heat*0.002;
    if(Math.random()<chance){
      var ev=pickGridEvent();
      S.player._gridEventCooldown=3;
      msg(ev.name+" ▸ "+pickFresh("ev-"+ev.id, ev.texts),"magenta");
      addLog("EVENTO ▸ "+ev.name+".");
      ev.effect();
      return;
    }
  }
  /* transmisiones aleatorias de lore */
  if(Math.random()<0.05){
    if(!S._seenTransmissions) S._seenTransmissions=[];
    var available=[];
    for(var i=0;i<TRANSMISSIONS.length;i++){
      if(S._seenTransmissions.indexOf(i)<0) available.push(i);
    }
    if(!available.length){ S._seenTransmissions=[]; available=[0]; }
    var idx=pick(available);
    S._seenTransmissions.push(idx);
    msg("[SEÑAL INTERCEPTADA] "+TRANSMISSIONS[idx],"gris");
    addLog("SEÑAL ▸ transmisión interceptada.");
  }
}

/* Los guardados previos al contador conservan nodos vencidos, pero no
   rastreadores anteriores: recuperar los primeros sin inventar los segundos. */
function immersionEnemyCount(inm){
  if(inm.enemiesDefeated==null){
    var count=0, nodes=inm.grid && inm.grid.nodes || [];
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i];
      if(n.done && (n.type==="ice" || n.type==="daemon" || n.type==="nucleo")) count++;
    }
    inm.enemiesDefeated=count;
  }
  return inm.enemiesDefeated;
}
function recordImmersionEnemy(){
  if(inImmersion) inImmersion.enemiesDefeated=immersionEnemyCount(inImmersion)+1;
}

function tryScavenger(){
  var base = 6 + S.player.heat*0.18 - S.player.sigilo*5;
  var chance = clamp(base, 2, 40)/100;
  /* calor >= 95: rastreadores casi garantizados */
  if(S.player.heat>=95) chance*=2;
  if(Math.random()>chance) return false;
  var tier = clamp(1 + Math.floor(S.player.heat/50), 1, 3);
  addLog("⚠ RASTREADOR CORPORATIVO · huele tu trazo!");
  msg("¡RASTREADOR CORPORATIVO TE HUELE EL TRAZO! · defiéndete.","rojo");
  startCombat({
    node:{type:"ice",tier:tier,tierName:"T"+tier,name:"RASTREADOR · "+pick(["RASEDOR","RASTRERO","FALCÓN","GUÍA","PERRO"]),scavenger:true},
    onWin:function(){
      recordImmersionEnemy();
      S.player.stats.ice++;
      if(!S.player.stats.iceByTier) S.player.stats.iceByTier={1:0,2:0,3:0};
      S.player.stats.iceByTier[tier]=(S.player.stats.iceByTier[tier]||0)+1;
      if(tier>=2) jobProgressAll("iceT2");
      gainXp(tier*10+8);
      S.player.heat = clamp(S.player.heat-4,0,100);
      addLog("CONEXIÓN GANADA ▸ rastreador desmantelado. calor -4.");
      updateTopbar();
      /* la emboscada NO consume el nodo: se resuelve ahora que estás en él */
      var cur = inImmersion ? nodeById(inImmersion.current) : null;
      if(cur) enterNode(cur);
      else { msg("RASTREADOR desmantelado. sigues en el cable.","verde"); renderGridHud(); }
    }
  });
  return true;
}

function enterNode(n){
  if(n.done){ msg(pickFresh("nodo-limpio", FRASES_NODO_LIMPIO),"gris"); renderGridHud(); return; }
  if(n.type==="puerto"){ msg(pickFresh("puerto", FRASES_PUERTO),"cyan"); renderGridHud(); return; }
  if(n.type==="substation"){ useSubstation(n); return; }
  if(n.type==="data"){ collectData(n); return; }
  if(n.type==="signal"){
    n.done=true;
    gainXp(30);
    addLog("SEÑAL ▸ fragmento del Núcleo. +30 XP.");
    msg("SEÑAL ▸ fragmento del Núcleo capturado. +30 XP.","magenta");
    sound.cool(); updateTopbar(); save(); renderGridHud();
    return;
  }
  if(n.type==="ice"||n.type==="daemon"||n.type==="nucleo"){
    startCombat({ node:n, onWin: onNodeDefeated }); return;
  }
  if(n.type==="vault"){
    startVaultPuzzle(n); return;
  }
  msg(pickFresh("nodo-vacio", FRASES_NODO_VACIO),"gris"); renderGridHud();
}

function useSubstation(n){
  if(n._used){ msg(pickFresh("subest-agotada", FRASES_SUBEST_AGOTADA),"gris"); renderGridHud(); return; }
  n._used = true;
  var gain = randInt(15,45);
  S.player.credits += gain;
  S.player.heat = clamp(S.player.heat-6,0,100);
  S.player.stats.substationsUsed=(S.player.stats.substationsUsed||0)+1;
  addLog("SUBESTACIÓN ▸ +"+gain+"₡ · calor -6.");
  msg("SUBESTACIÓN ▸ +"+gain+"₡ · el calor baja 6. (agotada)","verde");
  sound.buy(); updateTopbar(); save(); renderGridHud();
}

function collectData(n){
  if(n.done || n._done){ msg("· dato ya recogido.","gris"); renderGridHud(); return; }
  if(inImmersion.dataUsed >= ramCap()){
    msg("RAM llena. superficializa para vender antes de recoger más.","ambar"); return;
  }
  n._done = true; n.done = true;
  var val = n.data;
  /* penalización de calor: datos valen menos con calor alto */
  if(S.player.heat>=50) val = Math.round(val*0.8);
  inImmersion.data.push({ value:val });
  inImmersion.dataUsed++;
  S.player.stats.data++;
  jobProgressAll("gather");
  addLog("DATOS ▸ nodo "+val+"₡ cargado ("+inImmersion.dataUsed+"/"+ramCap()+").");
  msg("DATOS ▸ "+val+"₡ cargado en RAM ("+inImmersion.dataUsed+"/"+ramCap()+").","verde");
  sound.cool(); updateTopbar(); save(); renderGridHud();
}

function onNodeDefeated(ctx){
  var n = ctx.node;
  if(n.type==="ice" || n.type==="daemon" || n.type==="nucleo") recordImmersionEnemy();
  n.done = true;
  if(n.type==="ice"){
    S.player.stats.ice++;
    if(!S.player.stats.iceByTier) S.player.stats.iceByTier={1:0,2:0,3:0};
    S.player.stats.iceByTier[n.tier]=(S.player.stats.iceByTier[n.tier]||0)+1;
    var xpGain = n.isEcho ? 60 : (8 + n.tier*8);
    gainXp(xpGain);
    if(n.tier >= 2) jobProgressAll("iceT2");
    addLog("CONEXIÓN GANADA ▸ "+n.tierName+" "+n.name+" desmantelado.");
    msg("ICE "+n.tierName+" "+n.name+" desmantelado. +XP.","verde");
  } else if(n.type==="daemon"){
    S.player.stats.daemons++; gainXp(50 + n.tier*4);
    jobProgressAll("daemon");
    unlock("demonios");
    addLog("⚠ DAEMON "+n.name+" desintegrado.");
    msg("DAEMON "+n.name+" destruido. Algo más te mira desde abajo.","rojo");
  } else if(n.type==="vault"){
    gainXp(90); jobProgressAll("vault");
    unlock("kuro"); unlock("kuro_abandonado");
    msg("VAULT "+n.proj+" recuperado. Proyecto corporativo en tus manos. Se paga al superficializar.","magenta");
  } else if(n.type==="nucleo"){ defeatNucleo(); }
  updateTopbar(); save(); renderGridHud();
}

function defeatNucleo(){
  S.player.stats.ice++;
  gainXp(600); S.player.credits += 5000; S.player.stats.credits += 5000;
  S.history.finalDone = true;
  if(!S.best) S.best={};
  S.best.finalDone = true; /* marca permanente: LEGENDARIO disponible incluso tras NUEVO REGISTRO */
  unlock("tras_nucleo");
  addLog("✦ EL NÚCLEO apagado. la ciudad entera respiró.");
  sound.win();
  showNucleoEnding(function(){
    var cur = inImmersion ? nodeById(inImmersion.current) : null;
    if(cur) cur.done=true;
    msg("el Núcleo parpadea... y tú sigues aquí. ¿seguir en el Grid?","magenta");
  });
}

function showNucleoEnding(onDone){
  overlayModal(
    '<h2 class="magenta glow">✦ EL NÚCLEO</h2>'+
    '<p>el Núcleo parpadea.</p>'+
    '<p>por un instante, la ciudad entera respira a través de ti.</p>'+
    '<p class="nucleo-quote" id="nucleo-quote"></p>'+
    '<p>¿Quién firma? La señal no responde.</p>'+
    '<p>señal estabilizada. eres leyenda en el cable.</p>'+
    '<div class="actions"><button class="btn magenta" data-action="nucleoContinue">SEGUIR EN EL GRID</button></div>'
  );
  /* el clímax se escribe solo: letra a letra, con el cursor parpadeando (M-01) */
  typeInto(document.getElementById("nucleo-quote"), "“GRACIAS POR LA REPARACIÓN”", 55);
  ACTIONS.nucleoContinue = function(){
    sound.click(); onDone && onDone();
    closeOverlay(); ACTIONS.nucleoContinue=null;
  };
}
/* máquina de escribir del epílogo: timers propios, limpiados siempre en closeOverlay */
var _typeTimers=[];
function clearType(){
  for(var i=0;i<_typeTimers.length;i++) clearTimeout(_typeTimers[i]);
  _typeTimers=[];
}
function typeInto(el, text, speed){
  if(!el) return;
  el.textContent="";
  var cursor=document.createElement("span");
  cursor.className="type-cursor"; cursor.textContent="▌";
  el.appendChild(cursor);
  var i=0;
  function step(){
    if(i<text.length){
      cursor.insertAdjacentText("beforebegin", text.charAt(i));
      i++;
      _typeTimers.push(setTimeout(step, speed));
    }
  }
  _typeTimers.push(setTimeout(step, speed));
}

/* ---- superficializar ---- */
function superficializar(){
  if(!inImmersion || combatActive) return;
  /* avisar SOLO si algún contrato activo quedaría FRACASADO al volver ahora:
     los que ya cumplan su objetivo (jobComplete) se pagan sin preguntar */
  var pending = S.jobs.filter(function(j){ return !j.done && !jobComplete(j); });
  if(pending.length > 0){
    var names = pending.map(function(j){ return j.title; }).join(" · ");
    var phrase = pending.length===1
      ? ("Aún no se cumpliría el contrato <b>"+names+"</b>")
      : ("Aún no se cumplirían los contratos <b>"+names+"</b>");
    overlayModal(
      '<h2 class="ambar">⚠ SUPERFICIALIZAR</h2>'+
      '<p>'+phrase+'.</p>'+
      '<p>Si vuelves ahora '+(pending.length===1?"quedará":"quedarán")+' como <b>FRACASADO</b> (+8 de calor por cada uno). ¿Seguro que quieres volver a la superficie?</p>'+
      '<div class="actions">'+
      '<button class="btn ambar" data-action="confirmSurf">CONFIRMAR</button>'+
      '<button class="btn" data-action="cancelSurf">CANCELAR</button>'+
      '</div>'
    );
    ACTIONS.confirmSurf = function(){
      sound.click(); closeOverlay();
      ACTIONS.confirmSurf=null; ACTIONS.cancelSurf=null;
      doSuperficializar();
    };
    ACTIONS.cancelSurf = function(){
      sound.click(); closeOverlay();
      ACTIONS.confirmSurf=null; ACTIONS.cancelSurf=null;
      msg("cancelado. sigues en el grid, corvo.","cyan");
    };
    return;
  }
  doSuperficializar();
}
function doSuperficializar(){
  var inm = inImmersion;
  if(!inm) return;
  /* capturar datos antes de limpiar */
  var dataCollected=inm.data.length;
  var moves=inm.moves;
  var maxDepth=inm.maxDepthReached;
  var heatBefore=Math.round(S.player.heat);
  var combatOccurred=inm.combatOccurred;
  var enemiesDefeated=immersionEnemyCount(inm);
  var sellTotal=0;
  for(var i=0;i<inm.data.length;i++){
    sellTotal += Math.round(inm.data[i].value * (1 + S.player.hack*0.1));
  }
  S.player.credits += sellTotal; S.player.stats.credits += sellTotal;
  if(sellTotal>0) addLog("DATOS VENDIDOS ▸ +"+sellTotal+"₡.");

  var completed=0, failed=0, carreraCompletedThisRun=false, jobResults=[];
  /* Evaluar todos contra el calor al llegar, antes de que un fracaso sume +8. */
  for(var j=0;j<S.jobs.length;j++){
    var job=S.jobs[j];
    if(!job.done) jobResults.push({job:job, complete:jobComplete(job)});
  }
  for(var j=0;j<jobResults.length;j++){
    var result=jobResults[j];
    if(!result.complete || result.job.done) continue;
    completeJob(result.job); completed++;
    if(result.job.type==="carrera") carreraCompletedThisRun=true;
  }
  for(var j=0;j<jobResults.length;j++){
    var result=jobResults[j];
    if(result.complete || result.job.done) continue;
    result.job.done=true; result.job.failed=true; failed++;
    S.player.stats.jobsFailed=(S.player.stats.jobsFailed||0)+1;
    S.player.heat=clamp(S.player.heat+8,0,100);
    addLog("✗ TRABAJO FRACASADO ▸ "+result.job.title+". calor +8.");
  }
  if(completed>0) msg(completed+" trabajo(s) completado(s). +reputación.","verde");
  else if(failed>0) msg(failed+" trabajo(s) fracasado(s). El calor sube.","ambar");
  else if(inm.data.length) msg("superficializado. +"+sellTotal+"₡ · calor -12.","verde");
  else msg(pickFresh("surf", FRASES_SURF),"cyan");

  S.player.heat = clamp(S.player.heat-12,0,100);
  S.player.cpu = clamp(S.player.cpu+8, 0, S.player.maxCpu);
  S.player.stats.immerse++;
  S.nextDepth = null;

  stopGridRender(); inImmersion=null;
  // Limitar S.jobs: conservar solo los 15 más recientes para evitar crecimiento indefinido.
  if(S.jobs.length>15){
    var activeJobs=S.jobs.filter(function(j){ return !j.done; });
    var recentDone=S.jobs.filter(function(j){ return j.done; }).slice(-15);
    S.jobs=activeJobs.concat(recentDone);
  }
  updateBest(); updateTopbar();
  showView("inicio", true);
  checkUnlocks();
  checkMensajes();
  advanceTutorial();
  /* modo endless: registrar récord antes de mostrar el resumen */
  if(S.history && S.history.endlessActive){
    if(!S._endlessSurfaces) S._endlessSurfaces=0;
    S._endlessSurfaces++;
    if(!S.best.endlessMaxDepth) S.best.endlessMaxDepth=0;
    if(inm.maxDepthReached>S.best.endlessMaxDepth) S.best.endlessMaxDepth=inm.maxDepthReached;
    S.history.endlessActive=false;
  }
  /* RESUMEN POST-INMERSIÓN */
  var heatAfter=Math.round(S.player.heat);
  var heatDiff=heatAfter-heatBefore;
  var resumeHtml=
    '<h2 class="cyan glow">RESUMEN DE LA INMERSIÓN</h2>'+
    '<div class="box">'+
    '<div class="resume-row"><span class="rk">Datos recogidos</span><span class="rv">'+dataCollected+'</span></div>'+
    '<div class="resume-row"><span class="rk">Créditos ganados</span><span class="rv">₡'+sellTotal+'</span></div>'+
    '<div class="resume-row"><span class="rk">Enemigos derrotados</span><span class="rv">'+enemiesDefeated+'</span></div>'+
    '<div class="resume-row"><span class="rk">Profundidad máxima</span><span class="rv">capa '+maxDepth+'</span></div>'+
    '<div class="resume-row"><span class="rk">Movimientos</span><span class="rv">'+moves+'</span></div>'+
    '<div class="resume-row"><span class="rk">Calor</span><span class="rv">'+heatBefore+' → '+heatAfter+' ('+(heatDiff>=0?"+":"")+heatDiff+')</span></div>'+
    '<div class="resume-row"><span class="rk">Trabajos completados</span><span class="rv">'+completed+'</span></div>'+
    '<div class="resume-row"><span class="rk">Trabajos fracasados</span><span class="rv">'+failed+'</span></div>'+
    '<div class="resume-row"><span class="rk">Combate</span><span class="rv">'+(combatOccurred?"sí":"no detectado")+'</span></div>'+
    (S.best.endlessMaxDepth?'<div class="resume-row"><span class="rk">Récord endless</span><span class="rv">capa '+S.best.endlessMaxDepth+'</span></div>':'')+
    (S.best.depth?'<div class="resume-row"><span class="rk">vs mejor inmersión</span><span class="rv">profundidad capa '+S.best.depth+'</span></div>':'')+
    '</div>'+
    '<div class="actions"><button class="btn cyan" data-action="closeResume">CONTINUAR</button></div>';
  overlayModal(resumeHtml);
  ACTIONS.closeResume=function(){
    sound.click(); closeOverlay();
    ACTIONS.closeResume=null;
  };
  /* tracks de logros (contadores de partida: se reinician con NUEVO REGISTRO) */
  if(inm && !inm.combatOccurred){
    S.player.stats.ghostRuns=(S.player.stats.ghostRuns||0)+1;
    /* SUERTUDO: máxima datos en una inmersión sin combate */
    if(inm.data.length>=5){
      if(inm.data.length>(S.player.stats.luckyRun||0)) S.player.stats.luckyRun=inm.data.length;
    }
  }
  if(inm && S.player.heat===0){
    S.player.stats.cleanSrf=(S.player.stats.cleanSrf||0)+1;
  }
  /* VELOCISTA: completar carrera con calor < 20 */
  if(carreraCompletedThisRun && heatBefore<20){
    S.player.stats.speedrun=true;
  }
  checkAchievements();
  save(true);
}


/* ============================================================
   GRID RENDER (canvas)
   ============================================================ */

var canvas=null, ctx2d=null;
/* efectos visuales del grid (decorativo): ondas, chispas y estelas de viaje */
var gridFx=[], _fxLast=0;

function renderGrid(){
  renderGridHud();
  if(inImmersion) startGridRender();
  else drawGridIdle();
}

function startGridRender(){
  if(gridRender) return;
  if(!canvas){ canvas=document.getElementById("gridcanvas"); ctx2d=canvas.getContext("2d"); }
  resizeGridCanvas();
  window.addEventListener("resize", resizeGridCanvas);
  canvas.addEventListener("click", onGridClick);
  canvas.addEventListener("mousemove", onGridHover);
  canvas.addEventListener("mouseleave", hideGridTooltip);
  canvas.addEventListener("touchstart", onGridTouch, {passive:false});
  /* grid de terminal: celdas fijas para que los caracteres no se superpongan */
  PARTICLE_CELL_H=14;
  PARTICLE_ROWS=Math.floor(540/PARTICLE_CELL_H);
  /* medir ancho real de 2 caracteres monospace */
  var testCanvas=document.getElementById("gridcanvas");
  var testCtx=testCanvas?testCanvas.getContext("2d"):null;
  if(testCtx){ testCtx.font="12px monospace"; PARTICLE_CELL_W=Math.ceil(testCtx.measureText("00").width)+5; }
  else PARTICLE_CELL_W=16;
  PARTICLE_COLS=Math.floor(960/PARTICLE_CELL_W);
  particleGrid=[];
  for(var r=0;r<PARTICLE_ROWS;r++){ particleGrid[r]=[]; for(var c=0;c<PARTICLE_COLS;c++) particleGrid[r][c]=0; }
  particles=[];
  for(var i=0;i<80;i++) spawnParticle(true);
  gridFx=[]; _fxLast=0;
  gridRender=true; loopGrid();
}
function stopGridRender(){
  gridRender=false;
  window.removeEventListener("resize", resizeGridCanvas);
  if(canvas){ canvas.removeEventListener("click", onGridClick); canvas.removeEventListener("mousemove", onGridHover); canvas.removeEventListener("mouseleave", hideGridTooltip); canvas.removeEventListener("touchstart", onGridTouch); }
  canvas=null; ctx2d=null;
  if(gridRAF) cancelAnimationFrame(gridRAF); gridRAF=null;
  particles=[]; particleGrid=[];
  gridFx=[]; _fxLast=0; gridHoverNode=null;
}
function resizeGridCanvas(){
  if(!canvas) return;
  var wrap=document.getElementById("gridwrap");
  var scrollEl=document.getElementById("panel-scroll");
  if(!wrap||!scrollEl) return;
  canvas.width=960; canvas.height=540;
  /* área real disponible en el panel de contenido (fuera de su padding).
     El HUD y los botones no restan espacio: van superpuestos al canvas. */
  var cs=window.getComputedStyle(scrollEl);
  var availW=scrollEl.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  var availH=scrollEl.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-2;
  var w=availW, h=Math.floor(w*540/960);
  /* si el alto es el límite, recortar ancho conservando el 16:9 lógico */
  if(availH>40 && h>availH){ h=availH; w=Math.floor(h*960/540); }
  if(w<120){ w=120; h=Math.floor(w*540/960); }
  canvas.style.width=w+"px"; canvas.style.height=h+"px";
  /* el HUD flotante escala con el canvas (em sobre #gridwrap) */
  wrap.style.fontSize=clamp(Math.round(h*0.0235),10,15)+"px";
  /* fuera de inmersión el bitmap se acaba de resetear: redibujar el idle */
  if(!inImmersion) drawGridIdle();
}
function drawGridIdle(){
  var c=document.getElementById("gridcanvas");
  if(!c) return;
  c.width=960; c.height=540;
  var x=c.getContext("2d"); if(!x) return;
  x.fillStyle="#020907"; x.fillRect(0,0,960,540);
  x.strokeStyle="rgba(31,92,70,0.4)"; x.lineWidth=1;
  for(var i=0;i<9;i++){ var px=80+i*((960-160)/8); x.beginPath(); x.moveTo(px,50); x.lineTo(px,490); x.stroke(); }
  for(var j=0;j<6;j++){ var py=70+j*((540-120)/5); x.beginPath(); x.moveTo(80,py); x.lineTo(880,py); x.stroke(); }
  x.textAlign="center";
  x.fillStyle="rgba(77,216,255,0.9)"; x.font="bold 32px monospace";
  x.fillText("◈ SIN SEÑAL", 480, 250);
  x.fillStyle="rgba(210,235,255,0.8)"; x.font="17px monospace";
  x.fillText("dip al grid para sumergirte en la red", 480, 292);
  x.fillStyle="rgba(255,196,77,0.85)"; x.font="15px monospace";
  x.fillText("· pulsa ◈ DIP AL GRID para conectar ·", 480, 326);
  x.textAlign="start";
}

function loopGrid(){
  if(!gridRender || !inImmersion) return;
  drawGrid(); gridRAF=requestAnimationFrame(loopGrid);
}

/* ---- FX del grid: ondas, chispas y estelas (Prioridad 3, sin timers:
   viven en el mismo rAF del grid y se purgan al detener el render) ---- */
function spawnRipple(x,y,col){
  if(gridFx.length>48) gridFx.shift();
  gridFx.push({kind:"ripple", x:x, y:y, col:col, t0:performance.now()/1000});
}
function spawnBeam(x1,y1,x2,y2,col){
  if(gridFx.length>48) gridFx.shift();
  gridFx.push({kind:"beam", x1:x1, y1:y1, x2:x2, y2:y2, col:col, t0:performance.now()/1000, dur:0.4});
}
function spawnBurst(x,y,col){
  var ps=[],i;
  for(i=0;i<12;i++){
    var a=(Math.PI*2/12)*i+rand(-0.25,0.25), sp=rand(70,170);
    ps.push({x:x, y:y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, t:0, life:rand(0.3,0.55)});
  }
  if(gridFx.length>48) gridFx.shift();
  gridFx.push({kind:"burst", col:col, parts:ps, t0:performance.now()/1000});
}
function drawGridFx(){
  if(!ctx2d) return;
  var now=performance.now()/1000;
  var dt=_fxLast?clamp(now-_fxLast,0.001,0.05):0.016;
  _fxLast=now;
  for(var i=gridFx.length-1;i>=0;i--){
    var f=gridFx[i], age=now-f.t0, p;
    if(f.kind==="ripple"){
      p=age/0.6;
      if(p>=1){ gridFx.splice(i,1); continue; }
      ctx2d.save();
      ctx2d.strokeStyle=f.col; ctx2d.globalAlpha=(1-p)*0.9;
      ctx2d.lineWidth=2.5*(1-p)+0.5;
      ctx2d.shadowColor=f.col; ctx2d.shadowBlur=12*(1-p);
      ctx2d.beginPath(); ctx2d.arc(f.x, f.y, 8+p*40, 0, Math.PI*2); ctx2d.stroke();
      ctx2d.restore();
    } else if(f.kind==="beam"){
      p=age/f.dur;
      if(p>=1){
        /* llegada: onda + chispas en el destino */
        spawnRipple(f.x2, f.y2, f.col); spawnBurst(f.x2, f.y2, f.col);
        gridFx.splice(i,1); continue;
      }
      var e=1-Math.pow(1-p,3);                 /* ease-out: la estela frena al llegar */
      var e2=Math.max(0,1-Math.pow(1-Math.max(0,p-0.3),3)); /* cola */
      var hx=f.x1+(f.x2-f.x1)*e, hy=f.y1+(f.y2-f.y1)*e;
      var tx=f.x1+(f.x2-f.x1)*e2, ty=f.y1+(f.y2-f.y1)*e2;
      ctx2d.save();
      ctx2d.strokeStyle=f.col; ctx2d.globalAlpha=0.45;
      ctx2d.lineWidth=3; ctx2d.shadowColor=f.col; ctx2d.shadowBlur=10;
      ctx2d.beginPath(); ctx2d.moveTo(tx,ty); ctx2d.lineTo(hx,hy); ctx2d.stroke();
      ctx2d.globalAlpha=1;
      ctx2d.fillStyle=f.col;
      ctx2d.beginPath(); ctx2d.arc(hx,hy,3.5,0,Math.PI*2); ctx2d.fill();
      ctx2d.restore();
    } else if(f.kind==="burst"){
      if(age>0.65){ gridFx.splice(i,1); continue; }
      ctx2d.save();
      ctx2d.strokeStyle=f.col; ctx2d.lineWidth=2;
      ctx2d.shadowColor=f.col; ctx2d.shadowBlur=6;
      for(var j=0;j<f.parts.length;j++){
        var sp=f.parts[j]; sp.t+=dt;
        if(sp.t>=sp.life) continue;
        sp.x+=sp.vx*dt; sp.y+=sp.vy*dt;
        sp.vx*=1-3*dt; sp.vy*=1-3*dt;
        ctx2d.globalAlpha=1-sp.t/sp.life;
        ctx2d.beginPath();
        ctx2d.moveTo(sp.x,sp.y);
        ctx2d.lineTo(sp.x-sp.vx*0.03, sp.y-sp.vy*0.03);
        ctx2d.stroke();
      }
      ctx2d.restore();
    } else {
      gridFx.splice(i,1);
    }
  }
}

function drawGrid(){
  var g = inImmersion.grid;
  ctx2d.clearRect(0,0,960,540);
  ctx2d.fillStyle="#020907"; ctx2d.fillRect(0,0,960,540);
  ctx2d.font="12px monospace";
  for(var i=particles.length-1;i>=0;i--){
    var pt=particles[i]; pt.y-=pt.spd; pt.life--;
    if(pt.y<-PARTICLE_CELL_H||pt.life<=0){
      /* liberar celda y reciclar */
      if(pt.row>=0&&pt.row<PARTICLE_ROWS&&pt.col>=0&&pt.col<PARTICLE_COLS)
        particleGrid[pt.row][pt.col]=0;
      particles.splice(i,1);
      spawnParticle(false);
      continue;
    }
    if(!pt.maxLife) pt.maxLife=pt.life;
    /* fade-out: los últimos 20% de vida se funde a transparente */
    var pct=pt.life/pt.maxLife;
    var alpha = pct>0.2 ? 0.12 : (pct/0.2)*0.12;
    ctx2d.fillStyle="rgba(77,255,166,"+alpha.toFixed(3)+")";
    ctx2d.fillText(pt.ch, pt.x, pt.y);
  }
  var layers=g.maxDepth+1;
  for(var l=0;l<layers;l++){
    var x=80+(l/g.maxDepth)*(960-160);
    ctx2d.strokeStyle="rgba(31,92,70,0.5)"; ctx2d.lineWidth=1;
    ctx2d.beginPath(); ctx2d.moveTo(x,0); ctx2d.lineTo(x,540); ctx2d.stroke();
    ctx2d.fillStyle = l===0?"rgba(77,216,255,0.7)":"rgba(77,255,166,0.6)";
    ctx2d.font="15px monospace"; ctx2d.textAlign="center";
    ctx2d.fillText("CAPA "+l, x, 25);
  }
  ctx2d.textAlign="start";
  var t=performance.now()/1000;
  var hoverId=gridHoverNode?gridHoverNode.id:null;
  for(var k=0;k<g.nodes.length;k++){
    var n=g.nodes[k], nbrs=g.adj[n.id]||[];
    for(var m=0;m<nbrs.length;m++){
      var nb=nodeById(nbrs[m]); if(!nb) continue;
      var bothKnown=knownNode(n)&&knownNode(nb);
      var hot=!!hoverId && (n.id===hoverId||nb.id===hoverId);
      /* aristas del nodo bajo el cursor: resaltadas con glow */
      ctx2d.strokeStyle=hot?"rgba(255,255,255,0.8)":bothKnown?"rgba(77,255,166,0.28)":"rgba(31,92,70,0.15)";
      ctx2d.lineWidth=hot?2:1.4;
      if(hot){ ctx2d.shadowColor="rgba(255,255,255,0.7)"; ctx2d.shadowBlur=6; }
      ctx2d.beginPath(); ctx2d.moveTo(n.x,n.y); ctx2d.lineTo(nb.x,nb.y); ctx2d.stroke();
      ctx2d.shadowBlur=0;
      /* flujo de datos: pulsos que recorren las aristas conocidas */
      if(bothKnown){
        ctx2d.save();
        ctx2d.setLineDash([2,16]); ctx2d.lineDashOffset=-t*60;
        ctx2d.strokeStyle=hot?"rgba(255,255,255,0.9)":"rgba(77,255,166,0.55)";
        ctx2d.lineWidth=hot?2.4:1.8;
        ctx2d.beginPath(); ctx2d.moveTo(n.x,n.y); ctx2d.lineTo(nb.x,nb.y); ctx2d.stroke();
        ctx2d.restore();
      }
    }
  }
  for(var z=0;z<g.nodes.length;z++){
    var nd=g.nodes[z];
    if(!knownNode(nd)){ drawUnknownNode(nd,t); continue; }
    drawNode(nd,t);
  }
  var cur=nodeById(inImmersion.current);
  if(cur){
    var cr=(cur.boss)?19:(cur.type==="vault"?17:14);
    var pulse=cr+6+Math.sin(t*4)*3;
    ctx2d.strokeStyle="#ff4dc4"; ctx2d.lineWidth=3;
    ctx2d.shadowColor="#ff4dc4"; ctx2d.shadowBlur=14;
    ctx2d.beginPath(); ctx2d.arc(cur.x,cur.y,pulse,0,Math.PI*2); ctx2d.stroke();
    /* satélite que gira sobre el anillo: marca la posición actual SIN
       tapar el glifo del nodo (el punto central lo cubría) */
    var oa=t*2.2;
    ctx2d.fillStyle="#ff4dc4";
    ctx2d.beginPath();
    ctx2d.arc(cur.x+Math.cos(oa)*pulse, cur.y+Math.sin(oa)*pulse, 3, 0, Math.PI*2);
    ctx2d.fill();
    ctx2d.shadowBlur=0;
  }
  /* efectos de navegación (ondas, chispas, estelas) por encima de todo */
  drawGridFx();
}
/* color y símbolo por tipo de nodo (fuente única: drawNode y los FX) */
function nodeColor(n){
  switch(n.type){
    case "puerto": return "#4dd8ff";
    case "data": return "#4dffa6";
    case "ice": return n.tier===3?"#ff5d6a":n.tier===2?"#ffc44d":"#4dffa6";
    case "daemon": return "#ff4dc4";
    case "vault": return "#ffc44d";
    case "substation": return "#4dd8ff";
    case "nucleo": return "#ff4dc4";
    case "signal": return "#ff4dc4";
    default: return n.done?"#2c5c46":"#1f5c46";
  }
}
function nodeSymbol(n){
  switch(n.type){
    case "puerto": case "data": case "ice": case "daemon":
    case "vault": case "substation": case "nucleo": case "signal":
      return SIM[n.type]||"·";
    default: return n.done?"·":SIM.empty;
  }
}
function drawUnknownNode(n,t){
  ctx2d.fillStyle="rgba(77,255,166,0.25)"; ctx2d.font="21px monospace";
  ctx2d.textAlign="center"; ctx2d.fillText("?", n.x, n.y+7); ctx2d.textAlign="start";
  if(gridHoverNode && gridHoverNode.id===n.id){
    /* anillo punteado pulsante sobre el nodo aún desconocido */
    var up=Math.sin(t*6)*0.5+0.5;
    ctx2d.save();
    ctx2d.setLineDash([4,5]); ctx2d.lineDashOffset=-t*28;
    ctx2d.strokeStyle="rgba(143,221,189,"+(0.35+0.45*up)+")";
    ctx2d.lineWidth=1.6;
    ctx2d.beginPath(); ctx2d.arc(n.x,n.y,15+up*2,0,Math.PI*2); ctx2d.stroke();
    ctx2d.restore();
  }
}
function drawNode(n,t){
  var col=nodeColor(n), sym=nodeSymbol(n);
  var hov=gridHoverNode && gridHoverNode.id===n.id;
  var r=(n.boss)?19:(n.type==="vault"?17:14);
  if(hov) r+=2;
  ctx2d.shadowColor=col; ctx2d.shadowBlur=(n.id===inImmersion.current)?16:(hov?14:8);
  ctx2d.fillStyle=col; ctx2d.beginPath(); ctx2d.arc(n.x,n.y,r,0,Math.PI*2); ctx2d.fill();
  ctx2d.shadowBlur=0;
  ctx2d.fillStyle="#030a08"; ctx2d.font=(n.boss?"bold 19px":"17px")+" monospace";
  ctx2d.textAlign="center"; ctx2d.fillText(sym, n.x, n.y+6); ctx2d.textAlign="start";
  if(hov){
    /* hover vivo: anillo exterior rotatorio y pulsante + anillo del color del nodo */
    var hp=Math.sin(t*6)*0.5+0.5;
    ctx2d.save();
    ctx2d.setLineDash([6,6]); ctx2d.lineDashOffset=-t*30;
    ctx2d.strokeStyle="rgba(255,255,255,"+(0.5+0.5*hp)+")";
    ctx2d.lineWidth=2;
    ctx2d.beginPath(); ctx2d.arc(n.x,n.y,r+6+hp*2,0,Math.PI*2); ctx2d.stroke();
    ctx2d.setLineDash([]);
    ctx2d.strokeStyle=col; ctx2d.lineWidth=1.2;
    ctx2d.beginPath(); ctx2d.arc(n.x,n.y,r+3,0,Math.PI*2); ctx2d.stroke();
    ctx2d.restore();
  }
  if((n.type==="ice"||n.type==="daemon"||n.type==="vault") && !n.done){
    ctx2d.fillStyle="rgba(255,255,255,0.75)"; ctx2d.font="15px monospace"; ctx2d.textAlign="center";
    ctx2d.fillText(n.tierName||"", n.x, n.y+r+15); ctx2d.textAlign="start";
  }
}

function gridToLogical(cx,cy){
  var rect=canvas.getBoundingClientRect();
  return { x:(cx-rect.left)*(960/rect.width), y:(cy-rect.top)*(540/rect.height) };
}
function nodeAtPoint(x,y){
  if(!inImmersion) return null;
  var g=inImmersion.grid;
  for(var i=0;i<g.nodes.length;i++){
    var n=g.nodes[i], r=(n.boss)?24:20;
    var dx=x-n.x, dy=y-n.y;
    if(dx*dx+dy*dy<=r*r) return n;
  }
  return null;
}
function onGridHover(e){
  var p=gridToLogical(e.clientX,e.clientY);
  var nd=nodeAtPoint(p.x,p.y); gridHoverNode=nd;
  canvas.style.cursor=nd?"pointer":"default";
  /* tooltip del nodo */
  var tip=document.getElementById("grid-tooltip");
  if(tip){
    if(nd && knownNode(nd)){
      var sym=SIM[nd.type]||"·";
      var txt=sym+" "+(nd.name||"");
      if(nd.tier) txt+=" · "+nd.tierName;
      if(nd.done||nd._done||nd._used) txt+=" [LIMPIO]";
      tip.textContent=txt;
      /* posición relativa al canvas */
      var rect=canvas.getBoundingClientRect();
      var cssX=e.clientX-rect.left+12;
      var cssY=e.clientY-rect.top-8;
      tip.style.left=cssX+"px";
      tip.style.top=cssY+"px";
      tip.classList.remove("hidden");
      tip.classList.add("show");
    } else {
      tip.classList.add("hidden");
      tip.classList.remove("show");
    }
  }
}
function hideGridTooltip(){
  var tip=document.getElementById("grid-tooltip");
  if(tip){ tip.classList.add("hidden"); tip.classList.remove("show"); }
}
/* acción común al pulsar un nodo (clic o táctil): moverse o dar feedback */
function gridTap(nd){
  if(!inImmersion || !nd) return;
  if(nd.id===inImmersion.current){ if(gridRender) spawnRipple(nd.x,nd.y,"#ff4dc4"); return; }
  if((inImmersion.grid.adj[inImmersion.current]||[]).indexOf(nd.id)>=0){ moveToNode(nd.id); return; }
  if(gridRender) spawnRipple(nd.x,nd.y,"#ffc44d");
  msg("ese nodo no está conectado al actual.","ambar");
}
function onGridClick(e){
  if(combatActive||!inImmersion) return;
  var p=gridToLogical(e.clientX,e.clientY);
  gridTap(nodeAtPoint(p.x,p.y));
}
/* soporte táctil: touchstart para respuesta inmediata (sin retardo de300ms) */
function onGridTouch(e){
  if(combatActive||!inImmersion) return;
  if(e.touches.length!==1) return;
  var t=e.touches[0];
  var p=gridToLogical(t.clientX,t.clientY);
  var nd=nodeAtPoint(p.x,p.y); if(!nd) return;
  e.preventDefault();
  gridTap(nd);
}

function renderGridHud(){
  var adm=document.getElementById("panel-scroll");
  if(!adm) return;
  var immersed=!!inImmersion;
  /* si gridwrap ya existe, solo actualizar datos (sin reconstruir canvas) */
  var existingWrap=document.getElementById("gridwrap");
  if(existingWrap && immersed){
    updateGridHud();
    return;
  }
  var btn = immersed
    ? '<button class="btn ambar" data-action="doSuperficie">SUPERFICIE (volver)</button><button class="btn small" id="helpToggle" data-action="toggleHelp">?</button>'
    : '<button class="btn cyan" data-action="dipGrid">◈ DIP AL GRID</button>';
  /* HUD y controles van en una capa flotante sobre el canvas: el grid
     conserva todo el alto disponible del panel */
  adm.innerHTML =
    '<div id="gridwrap">'+
      '<canvas id="gridcanvas"></canvas>'+
      '<div id="grid-tooltip" class="hidden"></div>'+
      '<div id="grid-overlay">'+
        '<div id="grid-bar">'+
          '<div id="gridhud"></div>'+
          '<div id="grid-actions">'+btn+'</div>'+
        '</div>'+
        '<div id="adjlist"></div>'+
      '</div>'+
    '</div>';
  // Re-adquirir referencia del canvas tras reconstruir el DOM.
  canvas = document.getElementById("gridcanvas");
  ctx2d = canvas ? canvas.getContext("2d") : null;
  resizeGridCanvas();
  window.addEventListener("resize", resizeGridCanvas);
  // Si el render está activo, re-adjuntar listeners al nuevo canvas.
  if(gridRender && canvas){
    canvas.removeEventListener("click", onGridClick);
    canvas.removeEventListener("mousemove", onGridHover);
    canvas.removeEventListener("mouseleave", hideGridTooltip);
    canvas.removeEventListener("touchstart", onGridTouch);
    canvas.addEventListener("click", onGridClick);
    canvas.addEventListener("mousemove", onGridHover);
    canvas.addEventListener("mouseleave", hideGridTooltip);
    canvas.addEventListener("touchstart", onGridTouch, {passive:false});
  }
  if(immersed) updateGridHud();
}
function updateGridHud(){
  var inm=inImmersion; if(!inm) return;
  var hud=document.getElementById("gridhud");
  if(hud){
    /* barra de calor visual */
    var heat=Math.round(Math.max(0,S.player.heat));
    var heatPct=clamp(heat,0,100);
    var heatCls=heat<40?"hud-bar-green":(heat<=70?"hud-bar-amber":"hud-bar-red");
    var heatBar='<div class="hud-bar '+heatCls+'"><i style="width:'+heatPct+'%"></i></div>';
    /* RAM slots visuales */
    var used=inm.dataUsed, cap=ramCap();
    var ramSlots='<span class="ram-slots">';
    for(var i=0;i<cap;i++) ramSlots+='<span class="ram-slot '+(i<used?"used":"empty")+'"></span>';
    ramSlots+='</span>';
    hud.innerHTML =
      '<div>PROFUNDIDAD <b>'+inm.maxDepthReached+'/'+inm.depth+'</b></div>'+
      '<div>MOVIMIENTOS <b>'+inm.moves+'</b></div>'+
      '<div>DATOS '+ramSlots+'</div>'+
      '<div>CALOR <b style="color:'+(heat>70?'#ff5d6a':'#ffc44d')+'">'+heat+'/100</b> '+heatBar+'</div>';
    /* clase heat-critical cuando calor > 80 */
    if(heat>80) hud.classList.add("heat-critical");
    else hud.classList.remove("heat-critical");
  }
  var adj=document.getElementById("adjlist");
  if(adj){
    var list=currentNeighbors();
    var cur=nodeById(inImmersion.current);
    var html='<b>EN EL NODO:</b> '+(cur?(SIM[cur.type]+' '+(cur.name||'')):'·')+' &nbsp; ';
    list.forEach(function(n,i){
      var s=SIM[n.type]||"·";
      var label=(n.type==="data")?("DATOS") :
        (n.type==="ice")?("ICE "+n.tierName) :
        (n.type==="daemon")?("DAEMON "+n.name) :
        (n.type==="vault")?("VAULT "+n.proj) :
        (n.type==="substation")?("SUBESTACIÓN") :
        (n.type==="nucleo")?("NÚCLEO") :
        (SIM[n.type]||"·");
      if(n.done||n._done||n._used) label+=" · LIMPIO";
      html+='<span class="adj-node" data-idx="'+i+'">'+s+' <span class="kbd">'+(i+1)+'</span> '+label+'</span>';
    });
    if(!list.length) html+='<span>(sin salidas directas)</span>';
    adj.innerHTML=html;
  }
}

ACTIONS.doSuperficie = superficializar;
ACTIONS.toggleHelp = function(){
  showView("ayuda");
};

window.addEventListener("keydown", function(e){
  if(currentView!=="red"||!inImmersion||combatActive) return;
  if(modalOpen()) return;
  if(e.ctrlKey||e.altKey||e.metaKey) return;
  /* no interceptar teclas mientras se escribe en un input (terminal, buscador…) */
  var ae=document.activeElement;
  if(ae && (ae.tagName==="INPUT"||ae.tagName==="TEXTAREA")) return;
  var k=e.key;
  if(k>="1"&&k<="9"){ var idx=parseInt(k,10)-1; var list=currentNeighbors(); if(list[idx]) moveToNode(list[idx].id); }
  if(k.toLowerCase()==="f") superficializar();
});

/* clic en nodos adyacentes del HUD — funciona en táctil y ratón */
document.addEventListener("click", function(e){
  var node=e.target.closest(".adj-node");
  if(!node || !inImmersion || combatActive) return;
  var idx=parseInt(node.getAttribute("data-idx"),10);
  var list=currentNeighbors();
  if(list[idx]) moveToNode(list[idx].id);
});

