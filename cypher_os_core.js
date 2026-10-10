/* ============================================================
   CYPHER://OS  ·  cypher_os_core.js — ESTADO, PERSISTENCIA Y UTILIDADES
   Estado del juego (S), guardado/carga, utilidades generales y
   progresión (XP, skills, logros y resolución de contratos).
   Orden de carga de los .js (scripts clásicos sin módulos, ámbito global
   compartido; ver AGENTS.md §4):
     1/6 data → 2/6 core → 3/6 audio → 4/6 grid → 5/6 combat → 6/6 ui
   ============================================================ */
'use strict';

/* ============================================================
   2. ESTADO Y PERSISTENCIA
   ============================================================ */

/* Fuente única de estadísticas de PARTIDA. Todo lo que vive aquí se reinicia
   con NUEVO REGISTRO/RESET. Los contadores de logros están aquí (NO en S.best,
   que es el "mejor registro" persistente entre partidas). */
function defaultStats(){
  return {
    immerse:0, ice:0, daemons:0, data:0, credits:0, maxDepth:1,
    iceByTier:{1:0,2:0,3:0}, jobsCompleted:0, jobsFailed:0,
    totalCreditsSpent:0, totalDamageDealt:0, totalDamageReceived:0,
    maxCombatStreak:0, combatStreak:0, luckyRun:0, totalPlayTime:0,
    /* contadores de logros (por partida) */
    maxHeat:0, ghostRuns:0, speedrun:false, cleanSrf:0, substationsUsed:0, msgsAtNight:0, msgsVoidReplies:0
  };
}
function nuevoEstado() {
  return {
    player: {
      cpu:100, maxCpu:100, heat:0, credits:500,
      level:1, xp:0, skillPoints:0,
      hack:0, sigilo:0, nervios:0,
      ramUp:0, fwUp:0, linkUp:0, breakerUp:0,
      decoys:0, virus:0,
      rep:{mamaWire:0, doctorSudario:0, night0X:0, kairos:0},
      stats:defaultStats()
    },
    jobs:[], offers:[], intel:[], achievements:[], mensajes:[],
    history:{finalUnlocked:false, finalDone:false},
    log:[], clock:(23*60+47), nextDepth:null, snd:true, amb:false, mus:true, best:{},
    difficulty:"normal", _jobQuotaVersion:1
  };
}

var S = null;
var ACTIONS = {};

function ramCap(){ return 6 + S.player.ramUp*4; }
function fwVal(){ return 20 + S.player.fwUp*10; }
function maxCpu(){ return 100 + S.player.linkUp*20; }
function codeLenBase(tier){ return tier + 3; }
function codeLen(tier){ return Math.max(3, codeLenBase(tier) - S.player.hack - S.player.breakerUp); }
function xpParaNivel(){ return 80 + S.player.level*40; }
function isLockdown(){ return S && S.player.heat>=100; }

var _lastSaveShow=0;
/* Devuelve true si el guardado llegó al storage. Un false permite a la UI
   conservar la sesión en memoria en vez de recargar un archivo obsoleto. */
function save(showIndicator){
  try {
    S._inImmersion = inImmersion ? JSON.parse(JSON.stringify(inImmersion)) : null;
    localStorage.setItem("cypher_os_save_v9", JSON.stringify(S));
    if(showIndicator){
      var now=Date.now();
      if(now-_lastSaveShow>3000){ _lastSaveShow=now; showSaveIndicator(); }
    }
    return true;
  } catch(e){ /* puede fallar; el juego sigue en sesión */ return false; }
}
function showSaveIndicator(){
  var el=document.getElementById("save-indicador");
  if(!el) return;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  setTimeout(function(){ el.classList.remove("show"); },1500);
}
/* ---- banner llamativo (logros / subidas de nivel) ----
   Cola simple: si se desbloquean varios a la vez, se muestran en secuencia. */
var _bannerQueue=[], _bannerTimer=null;
function showBanner(kind, title, sub){
  _bannerQueue.push({kind:kind, title:title, sub:sub||""});
  if(!_bannerTimer) nextBanner();
}
function nextBanner(){
  var el=document.getElementById("banner");
  if(!el){ _bannerQueue=[]; _bannerTimer=null; return; }
  if(!_bannerQueue.length){ el.classList.remove("show"); _bannerTimer=null; return; }
  var b=_bannerQueue.shift();
  var icon=document.getElementById("banner-icon");
  var tEl=document.getElementById("banner-title");
  var sEl=document.getElementById("banner-sub");
  if(icon) icon.textContent = b.kind==="logro" ? "★" : "▲";
  if(tEl) tEl.textContent=b.title;
  if(sEl) sEl.textContent=b.sub;
  el.className="banner "+(b.kind==="logro"?"banner-logro":"banner-nivel");
  void el.offsetWidth;
  el.classList.add("show");
  _bannerTimer=setTimeout(function(){
    _bannerTimer=null;
    if(_bannerQueue.length) nextBanner();
    else el.classList.remove("show");
  },3400);
}
var _invalidSaveRecovered=false;
function load(){
  var raw=null;
  try {
    raw = localStorage.getItem("cypher_os_save_v9");
    if(!raw) return null;
    var o = JSON.parse(raw);
    if(!o || !o.player || (typeof validImportState==="function" && !validImportState(o))) throw new Error("guardado inválido");
    return o;
  } catch(e){
    /* No perder el archivo corrupto al iniciar un registro limpio. */
    if(raw){
      try{ localStorage.setItem("cypher_os_save_recovery_v9",raw); _invalidSaveRecovered=true; }catch(storageErr){}
    }
    return null;
  }
}

function updateBest(){
  var b = S.best || (S.best={});
  var p = S.player;
  function best(k,v){ if(v>(b[k]||0)) b[k]=v; }
  best("immerse", p.stats.immerse);
  best("ice", p.stats.ice);
  best("daemons", p.stats.daemons);
  best("credits", p.credits);
  best("depth", p.stats.maxDepth);
  best("level", p.level);
  save();
}

function ensureStateIntegrity(){
  if(!S.player.rep) S.player.rep={mamaWire:0,doctorSudario:0,night0X:0,kairos:0};
  if(!S.player.stats) S.player.stats=defaultStats();
  if(!S.history) S.history={finalUnlocked:false,finalDone:false};
  if(!S.best) S.best={};
  /* migración: los contadores de logros vivían en S.best (mezclados con el
     "mejor registro" persistente entre partidas). Se copian a stats UNA sola
     vez (solo si faltan): en partidas nuevas/reset los campos ya existen y
     NUNCA se re-copian desde el best conservado. */
  var st=S.player.stats;
  if(st.maxHeat==null) st.maxHeat=S.best.maxHeat||0;
  if(st.ghostRuns==null) st.ghostRuns=S.best.ghostRuns||0;
  if(st.speedrun==null) st.speedrun=S.best.speedrun===true;
  if(st.cleanSrf==null) st.cleanSrf=S.best.cleanSrf||0;
  if(st.substationsUsed==null) st.substationsUsed=S.best.substationsUsed||0;
  if(st.totalCreditsSpent==null) st.totalCreditsSpent=S.best.totalSpent||0;
  /* completar cualquier otro campo de stats ausente (guardados antiguos) */
  var dStats=defaultStats();
  for(var dk in dStats){
    if(Object.prototype.hasOwnProperty.call(dStats,dk) && st[dk]==null) st[dk]=dStats[dk];
  }
  if(S.jobs==null) S.jobs=[];
  if(S.offers==null) S.offers=[];
  if(S.intel==null) S.intel=[];
  if(S.mensajes==null) S.mensajes=[];   /* bandeja del deck (guardados antiguos) */
  if(S._msgNextAt==null) S._msgNextAt=0;
  if(S._msgOpen==null) S._msgOpen=null;
  if(S.log==null) S.log=[];
  if(S.clock==null) S.clock=23*60+47;
  if(S.nextDepth==null) S.nextDepth=null;
  if(S.snd==null) S.snd=true;   /* canal FX/UI: por defecto ON */
  if(S.amb==null) S.amb=false;  /* canal de fondo: por defecto OFF */
  if(S.mus==null) S.mus=true;   /* canal de música: por defecto ON */
  if(typeof syncDeckState==="function") syncDeckState(); /* ajustes locales, no del importado */
  if(!S._seenPanels) S._seenPanels={};
  if(!S.achievements) S.achievements=[];
  if(!S._seenTransmissions) S._seenTransmissions=[];
  if(!S.player._unlockedSkills) S.player._unlockedSkills=[];
  if(!S._activityCooldowns || S._cdVersion!==2){ S._activityCooldowns={}; S._cdVersion=2; }
  if(S._tutorialDone==null) S._tutorialDone=false;
  restoreProjectDossiersFromJobs();
  restoreProjectDossiersFromSnapshot(S._inImmersion);
  retireRecoveredVaultJobs(S._inImmersion);
  pruneRecoveredVaultOffers();
}


/* ============================================================
   3. UTILIDADES
   ============================================================ */

function rand(a,b){ return a + Math.random()*(b-a); }
function randInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
/* pickFresh: elige un elemento de un pool evitando repetir el último mostrado
   (misma clave = mismo pool). Así los mensajes de atrezzo no se vuelven monótonos. */
var _lastPicks={};
function pickFresh(key, arr){
  if(!arr || !arr.length) return null;
  if(arr.length===1) return arr[0];
  var last=_lastPicks[key], item=null, tries=0;
  do{ item=pick(arr); tries++; }while(item===last && tries<6);
  _lastPicks[key]=item;
  return item;
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
/* ticker: las frases pueden ser texto plano o {t, when} (solo suenan si when() da true) */
function pickTicker(){
  var pool=[], i, it;
  for(i=0;i<TICKER_FRASES.length;i++){
    it=TICKER_FRASES[i];
    if(typeof it==="string") pool.push(it);
    else if(it && (!it.when || it.when())) pool.push(it.t);
  }
  return pickFresh("ticker", pool.length?pool:["EL CABLE NO DUERME. SOLO PARPADEA"]);
}
function repDots(rep){ var d=""; for(var i=0;i<5;i++) d+=(i<rep?"●":"○"); return d; }
function timeStr(m){
  var h = Math.floor((m%1440)/60), mi = Math.floor(m%60);
  return String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0");
}

/* ============================================================
   12. HABILIDADES Y PROGRESIÓN
   ============================================================ */

function gainXp(n){
  S.player.xp += n;
  var need = xpParaNivel();
  while(S.player.xp >= need){
    S.player.xp -= need;
    S.player.level++; S.player.skillPoints++;
    S.player.maxCpu = maxCpu();
    S.player.cpu = Math.min(S.player.maxCpu, S.player.cpu+30);
    addLog("▲ NIVEL "+S.player.level+" ▸ +1 punto de habilidad.");
    msg("▲ NIVEL "+S.player.level+". +1 punto de habilidad. Revisa ESTADO.","magenta");
    showBanner("nivel","NIVEL "+S.player.level,"+1 punto de habilidad · revisa ESTADO");
    sound.levelUp();
    /* flash de nivel up */
    var osEl = document.getElementById("os");
    if(osEl){ osEl.classList.remove("levelup-flash"); void osEl.offsetWidth; osEl.classList.add("levelup-flash"); }
    need = xpParaNivel();
  }
  updateNotifications();
}

function checkUnlocks(){
  if(S.player.stats.immerse>=1) unlock("anatomia");
  if(S.player.stats.maxDepth>=3) unlock("capas_bajas");
  if(S.player.stats.daemons>=1) unlock("demonios");
  if(S.player.heat>=90 || (S.player.stats.maxHeat||0)>=90) unlock("ruido");
  if(S.player.level>=5) unlock("nucleo");
  if(S.history.finalDone) unlock("tras_nucleo");
  /* nuevos triggers de lore expandido */
  if(S.player.level>=2) unlock("origenes");
  if(S.player.stats.maxDepth>=4) unlock("primera_caida");
  if(S.player.level>=8) unlock("protocolo_silencio");
  if((S.player.rep.mamaWire||0)>=2) unlock("metodo_mama");
  if((S.player.rep.doctorSudario||0)>=3) unlock("diarios_doctor");
  if((S.player.rep.night0X||0)>=3) unlock("red_night0x");
  if(S.player.stats.maxDepth>=3) unlock("imperio_heliox");
  if(S.player.stats.ice>=5) unlock("monolith_muro");
  if(S.player.stats.immerse>=3) unlock("sobrevivir_calle");
  if(S.player.level>=10) unlock("ultimo_corvo");
  /* lore de LORE.md §11: registro corporativo + los proyectos de §4 */
  if(S.player.level>=2) unlock("registro2071");
  if((S.player.rep.doctorSudario||0)>=2) unlock("somnio");
  if(S.player.stats.data>=50) unlock("miraje");
  if((S.player.rep.night0X||0)>=2) unlock("eko9");
  if(S.player.stats.ice>=10) unlock("carmin");
  if(S.player.stats.immerse>=5) unlock("halcon");
  if(S.player.stats.maxDepth>=4) unlock("lapida");
  if(S.player.stats.daemons>=5) unlock("vesper");
  /* cronología narrada (LORE.md §11.3): "cómo llegamos aquí" */
  if(S.player.stats.immerse>=1) unlock("crono_tendido");
  if(S.player.level>=2) unlock("crono_despertar");
  if(S.player.stats.immerse>=3) unlock("crono_silencio");
  if(S.player.stats.maxDepth>=4) unlock("crono_primera");
  if(S.player.level>=5) unlock("crono_lluvia");
  if(S.player.level>=10) unlock("crono_parpadeo");
  if((S.player.stats.maxDepth||0)>=6) unlock("fondo_sueno");
  /* cruces bandeja → INTEL (mensajería Fase 3, CONTRACTS §19) */
  if(msgReceived("m_gracias_reparacion")) unlock("tras_nucleo");
  if(S.player.level>=5 && S.player.rep.night0X>=3 && !S.history.finalUnlocked){
    S.history.finalUnlocked = true;
    addLog("NIGHT-0X ▸ tienes una última oferta pendiente.");
  }
  updateBest();
}

function unlock(id){
  if(S.intel.indexOf(id)<0){ S.intel.push(id); addLog("INTEL ▸ "+intelTitle(id)+" desbloqueado."); updateNotifications(); }
}
function unlockProjectDossier(project){
  if(!Object.prototype.hasOwnProperty.call(PROYECTO_EXPEDIENTE,project)) return false;
  var id=PROYECTO_EXPEDIENTE[project], fresh=S.intel.indexOf(id)<0;
  unlock(id);
  pruneRecoveredVaultOffers();
  return fresh;
}
/* Los expedientes son evidencia persistente por proyecto, incluso cuando el
   historial limitado de contratos ya no conserva el trabajo que los entregó. */
function snapshotRecoveredProject(inm,project){
  return !!(inm && inm.grid && Array.isArray(inm.grid.nodes) && inm.grid.nodes.some(function(n){
    return n.type==="vault" && n.proj===project && (n.done===true || n._done===true);
  }));
}
function paidVaultProject(project){
  return S.jobs.some(function(j){ return j.type==="vault" && j.project===project && j.done===true && j.failed!==true; });
}
function projectRecovered(project){
  if(!S || !Object.prototype.hasOwnProperty.call(PROYECTO_EXPEDIENTE,project)) return false;
  return S.intel.indexOf(PROYECTO_EXPEDIENTE[project])>=0 || paidVaultProject(project) ||
    S.jobs.some(function(j){ return j.type==="vault" && j.project===project && j.prog && j.prog.vaulted===true; }) ||
    snapshotRecoveredProject(S._inImmersion,project);
}
function projectReserved(project){
  return S.jobs.some(function(j){ return j.type==="vault" && j.project===project && !j.done; });
}
function pruneRecoveredVaultOffers(){
  S.offers=S.offers.filter(function(o){ return o.type!=="vault" || !projectRecovered(o.project); });
}
function restoreProjectDossiersFromSnapshot(inm){
  if(!inm || !inm.grid || !Array.isArray(inm.grid.nodes)) return;
  for(var i=0;i<inm.grid.nodes.length;i++){
    var n=inm.grid.nodes[i];
    if(n.type==="vault" && (n.done===true || n._done===true)) unlockProjectDossier(n.proj);
  }
}
/* Compatibilidad: conservar una recuperación propia sin cobrar. Un segundo
   contrato de un proyecto ya recuperado se retira como fracaso administrativo
   una sola vez, sin pagar, penalizar calor ni alterar el snapshot. */
function retireRecoveredVaultJobs(inm){
  for(var i=0;i<S.jobs.length;i++){
    var j=S.jobs[i];
    if(j.type!=="vault" || j.done || !projectRecovered(j.project)) continue;
    if(!paidVaultProject(j.project)){
      if(j.prog.vaulted===true) continue;
      if(snapshotRecoveredProject(inm,j.project)){ j.prog.vaulted=true; continue; }
    }
    j.done=true; j.failed=true; j._vaultRetired=true;
    S.player.stats.jobsFailed=(S.player.stats.jobsFailed||0)+1;
    addLog("CONTRATO RECTIFICADO ▸ "+j.title+": proyecto ya recuperado. Retirado sin calor ni recompensa.");
  }
}
/* Tras superficializar ya no hay snapshot. Los contratos conservados sí prueban
   el proyecto: recuperación explícita o contrato de vault completado con éxito.
   No inferir nada de ofertas, reputación, contadores o informes narrativos. */
function restoreProjectDossiersFromJobs(){
  for(var i=0;i<S.jobs.length;i++){
    var j=S.jobs[i];
    if(j.type!=="vault") continue;
    if((j.prog && j.prog.vaulted===true) || (j.done===true && j.failed!==true)) unlockProjectDossier(j.project);
  }
}
/* ============================================================
   MENSAJERA — bandeja del deck (CONTRACTS §19)
   Llegada de cartas por triggers deterministas (MENSAJES_DEF.when).
   Reglas: máx. 1 carta por llamada, cada carta UNA sola vez por
   partida y separación mínima anti-spam. Sin temporizadores propios:
   se llama desde el bucle y desde eventos.
   ============================================================ */
var MSG_SPACING=45; /* minutos de juego (~45 s reales) entre carta y carta */
function msgDef(id){ for(var i=0;i<MENSAJES_DEF.length;i++) if(MENSAJES_DEF[i].id===id) return MENSAJES_DEF[i]; return null; }
function msgReceived(id){
  if(!S || !S.mensajes) return false;
  for(var i=0;i<S.mensajes.length;i++) if(S.mensajes[i].id===id) return true;
  return false;
}
function unreadMsgCount(){
  if(!S || !S.mensajes) return 0;
  var n=0;
  for(var i=0;i<S.mensajes.length;i++) if(!S.mensajes[i].leido) n++;
  return n;
}
/* logro CARTÓGRAFO DEL BUZÓN: un remitente con 3+ cartas recibidas, todas leídas */
function buzonRemitenteCompleto(){
  if(!S || !S.mensajes || S.mensajes.length<3) return false;
  var byFrom={}, i, d, f;
  for(i=0;i<S.mensajes.length;i++){
    d=msgDef(S.mensajes[i].id);
    if(!d) continue;
    if(!byFrom[d.from]) byFrom[d.from]={total:0, unread:0};
    byFrom[d.from].total++;
    if(!S.mensajes[i].leido) byFrom[d.from].unread++;
  }
  for(f in byFrom){
    if(Object.prototype.hasOwnProperty.call(byFrom,f) && byFrom[f].total>=3 && byFrom[f].unread===0) return true;
  }
  return false;
}
function checkMensajes(){
  if(!S) return;
  if(S.mensajes==null) S.mensajes=[];
  if(S._msgNextAt==null) S._msgNextAt=0;
  var now=S.player.stats.totalPlayTime||0;
  if(now<S._msgNextAt) return; /* separación anti-spam */
  for(var i=0;i<MENSAJES_DEF.length;i++){
    var d=MENSAJES_DEF[i];
    if(msgReceived(d.id)) continue; /* idempotente: una sola vez por partida */
    var ready=false;
    try{ ready=!!(d.when && d.when()); }catch(e){ ready=false; }
    if(!ready) continue;
    S.mensajes.push({ id:d.id, hora:S.clock, leido:false });
    S._msgNextAt=now+MSG_SPACING;
    addLog("MENSAJES ▸ nueva carta de "+d.from+".");
    msg("✉ MENSAJES ▸ nueva carta de "+d.from+": "+d.t+".","cyan");
    updateNotifications();
    save();
    return; /* máx. 1 carta por llamada */
  }
}

function checkAchievements(){
  if(!S) return;
  for(var i=0;i<ACHIEVEMENTS.length;i++){
    var a=ACHIEVEMENTS[i];
    if(S.achievements.indexOf(a.id)<0 && a.check()){
      S.achievements.push(a.id);
      addLog("★ LOGRO ▸ "+a.icon+" "+a.name+".");
      msg("★ LOGRO DESBLOQUEADO ▸ "+a.icon+" ¡"+a.name+"!","magenta");
      showBanner("logro", a.icon+" "+a.name, a.desc);
      sound.achievement();
      updateNotifications();
    }
  }
}
function intelTitle(id){
  for(var i=0;i<INTEL.length;i++) if(INTEL[i].id===id) return INTEL[i].t;
  return id;
}

/* ---- cuotas de una sola inmersión ----
   El nivel mejora el pago, no el tamaño finito del grid ni la RAM disponible. */
function jobQuotaLimit(type){
  switch(type){
    case "recoleta": return Math.min(6,ramCap());
    case "carrera": return Math.min(4,ramCap());
    case "rompehielas": return 4;
    case "daemon": return 3;
    case "vault": return 1;
    default: return 0;
  }
}
function newProg(type){
  switch(type){
    case "recoleta": return {gathered:0};
    case "carrera": return {deepGathered:0};
    case "rompehielas": return {iceT2:0};
    case "vault": return {vaulted:false};
    case "daemon": return {daemons:0};
    default: return {};
  }
}
function jobProgressValue(job){
  var g=job.prog;
  switch(job.type){
    case "recoleta": return g.gathered;
    case "carrera": return g.deepGathered;
    case "rompehielas": return g.iceT2;
    case "daemon": return g.daemons;
    case "vault": return g.vaulted ? 1 : 0;
    default: return 0;
  }
}
function jobObjectiveDesc(type,n){
  switch(type){
    case "recoleta": return "Recoge "+n+" nodos de datos y vuelve sano en una inmersión.";
    case "carrera": return "Recoge "+n+" datos en capas ≥3 y superficializa con calor <45 en una inmersión.";
    case "rompehielas": return "Destruye "+n+" ICE T2/T3 en una inmersión. Los daemons no cuentan.";
    case "daemon": return "Elimina "+n+" daemon(s) en una inmersión.";
    default: return "";
  }
}
/* Oportunidades restantes, nunca victorias pasadas ni emboscadas aleatorias. */
function jobTargetCount(type,inm){
  inm=inm || inImmersion;
  if(!inm || !inm.grid) return 0;
  var count=0, nodes=inm.grid.nodes;
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];
    if(n.done || n._done) continue;
    if(type==="recoleta" && n.type==="data") count++;
    if(type==="carrera" && n.type==="data" && n.layer>=3) count++;
    if(type==="rompehielas" && n.type==="ice" && n.tier>=2) count++;
    if(type==="daemon" && n.type==="daemon") count++;
    if(type==="vault" && n.type==="vault") count++;
  }
  if(type==="recoleta" || type==="carrera") count=Math.min(count,Math.max(0,ramCap()-inm.dataUsed));
  return count;
}
/* Un mismo dato profundo avanza todos los contratos de datos: usar máximos,
   no sumar cuotas. Las señales de evento no son nodos de contrato. */
function pendingJobData(deepOnly){
  var needed=0;
  for(var i=0;i<S.jobs.length;i++){
    var j=S.jobs[i];
    if(j.done || (j.type!=="carrera" && (deepOnly || j.type!=="recoleta"))) continue;
    needed=Math.max(needed,Math.max(0,j.n-jobProgressValue(j)));
  }
  return needed;
}
/* Rectificar una sola vez cuotas de versiones anteriores sin regenerar la red
   ni borrar victorias. Una asignación sin ningún objetivo posible se retira
   como fracaso administrativo: sin calor ni recompensa. */
function migrateJobQuotas(){
  if(S._jobQuotaVersion===1) return;
  var i, j, limit, next;
  for(i=0;i<S.offers.length;i++){
    j=S.offers[i]; limit=jobQuotaLimit(j.type);
    if(j.type!=="vault" && limit>0 && j.n>limit){
      j.n=limit; j.desc=jobObjectiveDesc(j.type,j.n);
    }
  }
  for(i=0;i<S.jobs.length;i++){
    j=S.jobs[i]; limit=jobQuotaLimit(j.type);
    if(j.done || j.type==="vault" || !limit) continue;
    next=Math.min(j.n,limit);
    if(inImmersion) next=Math.min(next,jobProgressValue(j)+jobTargetCount(j.type,inImmersion));
    if(next<1){
      j.done=true; j.failed=true;
      S.player.stats.jobsFailed++;
      addLog("CONTRATO RECTIFICADO ▸ "+j.title+": sin objetivos disponibles. Retirado sin calor ni recompensa.");
    } else if(next!==j.n){
      j.n=next; j.desc=jobObjectiveDesc(j.type,next);
      addLog("CONTRATO RECTIFICADO ▸ "+j.title+": objetivo ajustado a "+next+". Progreso conservado.");
    }
  }
  S._jobQuotaVersion=1;
}

/* ---- resolución de contratos ---- */
function jobComplete(job){
  if(!inImmersion) return false;
  switch(job.type){
    case "recoleta": return job.prog.gathered >= job.n;
    case "carrera": return job.prog.deepGathered >= job.n && S.player.heat < 45;
    case "rompehielas": return job.prog.iceT2 >= job.n;
    case "vault": return job.prog.vaulted===true;
    case "daemon": return job.prog.daemons >= job.n;
    default: return false;
  }
}
function completeJob(job){
  if(job.done) return;
  job.done = true;
  var p = S.player;
  var rep = p.rep[job.contact] || 0;
  var reward = Math.round(job.reward * (1 + rep*0.06));
  gainXp(job.xp);
  p.credits += reward; p.stats.credits += reward;
  p.stats.jobsCompleted=(p.stats.jobsCompleted||0)+1;
  p.rep[job.contact] = clamp(rep+1,0,5);
  if(job.contact==="doctorSudario") unlock("invierno");
  addLog("✓ TRABAJO COMPLETADO ▸ "+job.title+" · +"+reward+"₡ · +"+job.xp+" XP.");
  msg("✓ TRABAJO COMPLETADO ▸ "+job.contact+" paga "+reward+"₡ (+reputación).","verde");
  sound.win();
}
function jobProgressAll(kind){
  for(var i=0;i<S.jobs.length;i++){
    var j=S.jobs[i]; if(j.done) continue;
    var g=j.prog;
    if(kind==="gather"){
      if(j.type==="recoleta") g.gathered++;
      if(j.type==="carrera" && currentLayer()>=3) g.deepGathered++;
    }
    if(kind==="iceT2" && j.type==="rompehielas") g.iceT2++;
    if(kind==="vault" && j.type==="vault") g.vaulted=true;
    if(kind==="daemon" && j.type==="daemon") g.daemons++;
  }
}

