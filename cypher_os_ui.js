/* ============================================================
   CYPHER://OS  ·  cypher_os_ui.js — INTERFAZ, VISTAS Y ARRANQUE
   Tutorial, boot, sistema de vistas/render, tienda, contactos y
   trabajos, ayuda, logros, informes, registro, terminal, flatline,
   botones globales, bucle de juego y arranque general.
   Orden de carga de los .js (scripts clásicos sin módulos, ámbito global
   compartido; ver AGENTS.md §4):
     1/6 data → 2/6 core → 3/6 audio → 4/6 grid → 5/6 combat → 6/6 ui
   ============================================================ */
'use strict';

/* ============================================================
   5b. TUTORIAL INTERACTIVO (primera partida)
   ============================================================ */

function startTutorial(){
  if(!S || S._tutorialDone) return;
  /* paso 1: CONTACTOS */
  msg("MAMA WIRE: Ve a CONTACTOS y acepta un trabajo.","cyan");
  addLog("TUTORIAL ▸ Mama Wire te dice: ve a CONTACTOS.");
  var btn=document.querySelector('.navbtn[data-view="contactos"]');
  if(btn) btn.classList.add("tutorial-highlight");
  S._tutorialStep=1;
}
function advanceTutorial(){
  if(!S || S._tutorialDone) return;
  if(S._tutorialStep===1){
    /* paso aceptar trabajo → RED */
    var btnC=document.querySelector('.navbtn[data-view="contactos"]');
    if(btnC) btnC.classList.remove("tutorial-highlight");
    msg("Mama Wire: Ahora baja al grid con ◈ DIP AL GRID.","cyan");
    addLog("TUTORIAL ▸ Mama Wire te dice: baja al grid.");
    var btnR=document.querySelector('.navbtn[data-view="red"]');
    if(btnR) btnR.classList.add("tutorial-highlight");
    S._tutorialStep=2;
  } else if(S._tutorialStep===2){
    /* paso entrar al grid → recoger datos */
    var btnR=document.querySelector('.navbtn[data-view="red"]');
    if(btnR) btnR.classList.remove("tutorial-highlight");
    msg("Mama Wire: Recoge un nodo de datos ◆ y vuelve con SUPERFICIE.","cyan");
    addLog("TUTORIAL ▸ Mama Wire te dice: recoge datos.");
    S._tutorialStep=3;
  } else if(S._tutorialStep===3){
    /* paso superficializar → fin */
    clearTutorialHighlights();
    msg("¡Bien hecho! Ya sabes el ciclo. Suerte, corvo.","magenta");
    addLog("TUTORIAL ▸ completado. ya sabes el ciclo.");
    S._tutorialDone=true; S._tutorialStep=0;
    sound.levelUp();
  }
}
function clearTutorialHighlights(){
  document.querySelectorAll(".tutorial-highlight").forEach(function(el){
    el.classList.remove("tutorial-highlight");
  });
}

function toggleSound(){
  /* canal FX/UI (botones, avisos, logros…) */
  S.snd=!S.snd;
  msg("sonidos fx/ui "+(S.snd?"activados":"desactivados")+".");
  updateTopbar(); save();
}
function toggleAmbient(){
  /* canal de fondo: tonos y ruido blanco constantes */
  S.amb=!S.amb;
  msg("sonido de fondo "+(S.amb?"activado":"desactivado")+".");
  if(!S.amb) stopAmbient(); else updateAmbient();
  updateTopbar(); save();
}


/* ============================================================
   5. SECUENCIA DE ARRANQUE (BOOT)
   ============================================================ */



function runBoot(onDone){
  var bootEl = document.getElementById("boot");
  var body = document.getElementById("boot-body");
  bootEl.classList.add("show");
  bootEl.style.display="flex";
  bootEl.style.opacity="1";
  body.innerHTML="";
  var idx=0, done=false, timer=null;

  function line(){
    if(done) return;
    if(idx>=BOOT_LINES.length){ bootEnd(); return; }
    var txt = BOOT_LINES[idx][0], cls = BOOT_LINES[idx][1];
    var div = document.createElement("div");
    div.className = "line "+cls;
    div.textContent = txt;
    body.appendChild(div);
    /* sonido sutil por cada línea de boot */
    sound.bootLine();
    idx++;
    if(idx>=BOOT_LINES.length){
      /* última línea ya mostrada: pausa para leerla y transición */
      sound.bootEnd();
      timer = setTimeout(bootEnd, 1200);
    } else {
      timer = setTimeout(line, cls==="sig"?440:340);
    }
  }
  function bootEnd(){
    /* efecto de glitch visual antes de salir */
    var glitchDiv = document.createElement("div");
    glitchDiv.className="boot-glitch";
    body.appendChild(glitchDiv);
    setTimeout(function(){ fadeOut(); },450);
  }
  function fadeOut(){
    if(done) return;
    done=true;
    window.removeEventListener("keydown", skipOnce);
    if(bootEl) bootEl.removeEventListener("click", skip);
    clearTimeout(timer);
    bootEl.style.transition="opacity .5s";
    bootEl.style.opacity="0";
    setTimeout(function(){
      bootEl.style.display="none";
      bootEl.style.opacity="1";
      onDone();
    }, 520);
  }
  function skip(){ if(done) return; fadeOut(); }
  function skipOnce(e){ if(e && e.repeat) return; skip(); }

  bootEl.addEventListener("click", skip);
  window.addEventListener("keydown", skipOnce);
  timer = setTimeout(line, 400);
}


/* ============================================================
   6. SISTEMA DE VISTAS / RENDER
   ============================================================ */

var msgEl = null;
var currentView = "inicio";

/* El overlay visual no basta: impedir foco/clics en la partida que tapa.
   inert cubre navegadores modernos; captura de teclado/foco sirve de respaldo. */
function gameInputLayer(){
  if(confirmOpen()) return document.getElementById("confirm-overlay");
  if(S && S.player.cpu<=0) return document.getElementById("flatline");
  if(combatActive) return document.getElementById("combat");
  return null;
}
function layerContains(layer, node){
  return !!(layer && node && (layer===node || (layer.contains && layer.contains(node))));
}
function layerControls(layer){
  if(!layer) return [];
  return Array.prototype.filter.call(layer.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]'), function(n){
    return (!n.closest || !n.closest(".hidden")) && (!n.getClientRects || n.getClientRects().length>0);
  });
}
function focusInputLayer(layer, last){
  if(!layer) return;
  var nodes=layerControls(layer), target=nodes.length ? nodes[last ? nodes.length-1 : 0] : layer;
  if(target===layer) layer.setAttribute("tabindex","-1");
  if(target.focus) target.focus();
}
function syncGameInputLock(){
  var layer=gameInputLayer(), os=document.getElementById("os");
  if(os){
    os.inert=!!layer;
    if(layer) os.setAttribute("inert",""); else os.removeAttribute("inert");
  }
  var combat=document.getElementById("combat"), flat=document.getElementById("flatline");
  if(combat) combat.inert=!!(layer && layer!==combat);
  if(flat) flat.inert=!!(layer && layer!==flat);
  if(layer && (document.activeElement===layer || !layerContains(layer, document.activeElement))) focusInputLayer(layer);
}
function livingInteraction(){ return !!(S && S.player.cpu>0 && !combatActive && !confirmOpen()); }

document.addEventListener("keydown", function(e){
  var layer=gameInputLayer();
  if(!layer) return;
  /* Guardar sigue funcionando incluso con la partida bloqueada. */
  if(e.ctrlKey && !e.altKey && e.key.toLowerCase()==="s") return;
  if(e.key==="Escape") return; /* lo resuelve el diálogo o el combate activo */
  if(e.key==="Tab"){
    var nodes=layerControls(layer), active=document.activeElement;
    if(!nodes.length || !layerContains(layer,active) ||
       (!e.shiftKey && active===nodes[nodes.length-1]) || (e.shiftKey && active===nodes[0])){
      e.preventDefault(); focusInputLayer(layer,!!e.shiftKey);
    }
  } else if(e.target && !layerContains(layer,e.target)){
    e.preventDefault(); e.stopPropagation(); focusInputLayer(layer);
  }
}, true);
document.addEventListener("focusin", function(e){
  var layer=gameInputLayer();
  if(layer && !layerContains(layer,e.target)) focusInputLayer(layer);
}, true);

function msg(text, cls){
  if(!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = "txt " + (cls||"");
  /* flash de animación al cambiar mensaje */
  var bar = document.getElementById("msgbar");
  if(bar){
    bar.classList.remove("msg-flash");
    void bar.offsetWidth;
    bar.classList.add("msg-flash");
  }
}
function addLog(text){
  if(!S) return;
  S.log.push({ t: timeStr(S.clock), text:text });
  if(S.log.length>400) S.log.shift();
}

function overlayModal(html){
  var overlay = document.getElementById("overlay");
  var inner = document.getElementById("overlay-inner");
  if(!overlay || !inner) return;
  inner.innerHTML = '<div class="modal">'+html+'</div>';
  overlay.classList.add("show");
}
function closeOverlay(){
  clearType();
  var o = document.getElementById("overlay");
  if(o) o.classList.remove("show");
}
/* ¿hay algún modal/overlay abierto? (bloquea atajos de teclado) */
function modalOpen(){
  if(confirmOpen()) return true;
  var ov=document.getElementById("overlay");
  if(ov && ov.classList.contains("show")) return true;
  var st=document.getElementById("skilltree-overlay");
  return !!(st && st.classList.contains("show"));
}

/* ---- diálogo de confirmación del juego (#confirm-overlay) ----
   Sustituye a los alert / confirm nativos del navegador: en pantalla completa
   esos diálogos quedan ocultos DETRÁS del juego y bloquean la interfaz del
   juego (en tablet o móvil sin teclado no hay forma de salir de la pantalla
   completa para verlos). El diálogo propio se ve sobre el juego —también
   sobre la pantalla de FLATLINE—, se responde con el dedo y se cancela con
   Escape o con un clic fuera. Un solo diálogo a la vez: guarda los callbacks
   pendientes hasta que se resuelve (confirmYes / confirmNo / cancelar). */
var _confirmPending=false;
var _confirmYesFn=null, _confirmNoFn=null;
function confirmModal(o){
  var ov=document.getElementById("confirm-overlay");
  if(!ov) return;
  ov.innerHTML=
    '<div class="modal">'+
    '<h2 class="'+(o.danger?"rojo":"ambar")+'">'+o.title+'</h2>'+
    '<p>'+o.body+'</p>'+
    '<div class="actions">'+
    '<button class="btn '+(o.danger?"magenta":"ambar")+'" data-action="confirmYes">'+(o.yes||"CONFIRMAR")+'</button>'+
    '<button class="btn" data-action="confirmNo">'+(o.no||"CANCELAR")+'</button>'+
    '</div></div>';
  _confirmYesFn=o.onYes||null;
  _confirmNoFn=o.onNo||null;
  _confirmPending=true;
  ov.classList.add("show");
  syncGameInputLock();
}
function confirmOpen(){ return _confirmPending; }
function resolveConfirm(yes){
  if(!_confirmPending) return;
  _confirmPending=false;
  var fn = yes ? _confirmYesFn : _confirmNoFn;
  _confirmYesFn=null; _confirmNoFn=null;
  var ov=document.getElementById("confirm-overlay");
  if(ov){ ov.classList.remove("show"); ov.innerHTML=""; }
  try{ if(fn) fn(); }finally{ syncGameInputLock(); }
}
ACTIONS.confirmYes=function(){ resolveConfirm(true); };
ACTIONS.confirmNo=function(){ resolveConfirm(false); };
/* clic en el fondo del diálogo = cancelar (salida fácil en táctil) */
var _confirmOverlay=document.getElementById("confirm-overlay");
if(_confirmOverlay) _confirmOverlay.addEventListener("click", function(e){
  if(e.target===_confirmOverlay) resolveConfirm(false);
});

function showView(v, skipLog){
  if(combatActive || (S && S.player.cpu<=0 && v!=="inicio")) return;
  currentView = v;
  if(v !== "red" && inImmersion) stopGridRender();
  document.querySelectorAll(".navbtn[data-view]").forEach(function(b){
    b.classList.toggle("active", b.getAttribute("data-view")===v);
  });
  if(!skipLog) sound.navigate();
  /* transición de fade en el panel */
  var ps = document.getElementById("panel-scroll");
  if(ps){
    /* vista RED: panel casi sin padding (el HUD del grid se superpone) */
    ps.classList.toggle("grid-mode", v==="red");
    if(v!=="red") window.removeEventListener("resize", resizeGridCanvas);
    if(!skipLog){
      ps.classList.remove("panel-fade");
      void ps.offsetWidth;
      ps.classList.add("panel-fade");
    }
  }
  (VIEWS[v] || VIEWS.inicio)();
  updateTopbar();
  updateNotifications();
  markPanelSeen(v);
  updateAmbient();
}

function updateTopbar(){
  if(!S) return;
  var p = S.player;
  var hCpu = document.getElementById("h-cpu");
  if(hCpu) hCpu.textContent = Math.round(Math.max(0,p.cpu))+"/"+p.maxCpu;
  var h = document.getElementById("h-heat"); if(h) h.textContent = Math.round(Math.max(0,p.heat));
  var c = document.getElementById("h-cc"); if(c) c.textContent = Math.floor(p.credits);
  var used = inImmersion ? inImmersion.dataUsed : 0;
  var r = document.getElementById("h-ram"); if(r) r.textContent = used+"/"+ramCap();
  var l = document.getElementById("h-lvl"); if(l) l.textContent = p.level;
  /* XP bar en topbar */
  var xpFill = document.getElementById("h-xp-fill");
  var xpLabel = document.getElementById("h-xp-label");
  if(xpFill){
    var need = xpParaNivel();
    var pct = clamp((p.xp / need)*100, 0, 100);
    xpFill.style.width = pct+"%";
  }
  if(xpLabel) xpLabel.textContent = "XP "+p.xp+"/"+xpParaNivel();
  var clk = document.getElementById("h-clock"); if(clk) clk.textContent = timeStr(S.clock);
  var snd = document.getElementById("h-snd"); if(snd) snd.textContent = "FX: " + (S.snd?"ON":"OFF");
  var amb = document.getElementById("h-amb"); if(amb) amb.textContent = "AMB: " + (S.amb===true?"ON":"OFF");
  var mus = document.getElementById("h-mus"); if(mus) mus.textContent = "MUS: " + (S.mus!==false?"ON":"OFF");
  /* pulso visual de topbar cuando el calor supera 70 */
  var topbar = document.getElementById("topbar");
  if(topbar){
    if(p.heat > 70) topbar.classList.add("heat-alert");
    else topbar.classList.remove("heat-alert");
  }
  /* visual de body cuando calor >= 80 */
  if(p.heat >= 80) document.body.classList.add("heat-critical");
  else document.body.classList.remove("heat-critical");
  /* indicador de LOCKDOWN en topbar */
  if(isLockdown()){
    var hLvl = document.getElementById("h-lvl");
    if(hLvl) hLvl.textContent = "⚠ LOCKDOWN";
  }
}

function scroller(html){
  var el = document.getElementById("panel-scroll");
  if(!el) return;
  el.innerHTML = html;
  el.scrollTop = 0;
}

/* ---- sistema de notificaciones en sidebar ---- */
function updateNotifications(){
  if(!S) return;
  if(!S._seenPanels) S._seenPanels={};
  var p = S.player;
  /* contactos: si hay ofertas nuevas y no se han visto */
  var dotContactos = document.getElementById("notif-contactos");
  if(dotContactos) dotContactos.classList.toggle("show", S.offers.length>0 && !S._seenPanels.contactos);
  /* estado: si hay skillPoints > 0 */
  var dotEstado = document.getElementById("notif-estado");
  if(dotEstado) dotEstado.classList.toggle("show", p.skillPoints>0 && !S._seenPanels.estado);
  /* informes: si hay intel recién desbloqueado */
  var dotInformes = document.getElementById("notif-informes");
  if(dotInformes) dotInformes.classList.toggle("show", S.intel.length>0 && !S._seenPanels.informes);
  /* trabajos: si hay contratos sin completar */
  var dotTrabajos = document.getElementById("notif-trabajos");
  if(dotTrabajos) dotTrabajos.classList.toggle("show", S.jobs.some(function(j){ return !j.done; }) && !S._seenPanels.trabajos);
  /* mensajes: el punto vive mientras haya cartas sin leer */
  var dotMensajes = document.getElementById("notif-mensajes");
  if(dotMensajes) dotMensajes.classList.toggle("show", unreadMsgCount()>0);
}
function markPanelSeen(view){
  if(!S) return;
  if(!S._seenPanels) S._seenPanels={};
  S._seenPanels[view]=true;
  save();
}

// Delegación global de clics: cualquier botón [data-action] se resuelve aquí.
// Un único punto de entrada: cubre las vistas (panel-scroll), los modales de
// overlay, el flatline, el núcleo y el grid. Un botón por handler.
document.addEventListener("click", function(e){
  var btn = e.target.closest("[data-action]");
  if(!btn) return;
  var a = btn.getAttribute("data-action");
  if(!S && a!=="startIntro") return;
  if(S && S.player.cpu<=0 && ["reconnect","newRecord","confirmYes","confirmNo"].indexOf(a)<0) return;
  if(combatActive && a!=="vaultCancel" && a!=="confirmYes" && a!=="confirmNo") return;
  if(confirmOpen() && a!=="confirmYes" && a!=="confirmNo") return;
  if(btn.disabled) return;
  if(ACTIONS[a]){ try{ ACTIONS[a](btn); }catch(err){ console.warn("acción",a,err); } }
  sound.click();
});

/* ---- Vistas registradas ---- */
var VIEWS = {
  inicio: renderInicio,
  red: renderGrid,
  contactos: renderContactos,
  mensajes: renderMensajes,
  trabajos: renderTrabajos,
  tienda: renderTienda,
  estado: renderEstado,
  informes: renderInformes,
  registro: renderRegistro,
  logros: renderLogros,
  ayuda: renderAyuda
};


/* ============================================================
   10. MERCADO NEGRO
   ============================================================ */

function renderTienda(){
  var p=S.player;
  var html='<h1 class="title">MERCADO NEGRO</h1>'+
    '<div class="sub">PUESTO DE MAMA WIRE · BAR-CLUB ÓCTAVA</div>'+
    '<div class="box">CRÉDITOS: <b class="verde">₡'+Math.floor(p.credits)+'</b> · la calle no da fiado.</div>'+
    '<div class="panel-h">EQUIPO</div><div class="grid2">';
  TIENDA_DEF.forEach(function(it){
    var now=stockCount(it), maxTxt=(it.kind==="upgrade")?("máx "+it.stock):("stock "+it.stock);
    var canBuy=p.credits>=it.price && now<it.stock;
    html+='<div class="shopitem">'+
      '<div><div class="name">'+it.name+'</div><div class="desc">'+it.desc+'</div>'+
      '<div class="stock muted">('+maxTxt+')</div></div>'+
      '<div class="text-right"><div class="ambar">₡'+it.price+'</div>'+
      '<button class="btn small" data-action="buyItem" data-id="'+it.id+'"'+(canBuy?"":" disabled")+'>COMPRAR</button></div></div>';
  });
  html+='</div>';
  scroller(html); updateTopbar();
  msg(pickFresh("view-tienda", FRASES_VIEWS.tienda),"cyan");
}
function stockCount(it){
  var p=S.player;
  if(it.id==="decoy") return p.decoys;
  if(it.id==="virus") return p.virus;
  if(it.id==="breaker") return p.breakerUp;
  if(it.id==="ram") return p.ramUp;
  if(it.id==="firewall") return p.fwUp;
  if(it.id==="link") return p.linkUp;
  return 0;
}

ACTIONS.buyItem = function(btn){
  if(!livingInteraction()) return;
  var id=btn.getAttribute("data-id");
  var it=null; for(var i=0;i<TIENDA_DEF.length;i++) if(TIENDA_DEF[i].id===id) it=TIENDA_DEF[i];
  if(!it) return;
  var p=S.player, now=stockCount(it);
  if(now>=it.stock){ msg("sin stock · agotado.","ambar"); return; }
  if(p.credits<it.price){ msg("CRÉDITOS INSUFICIENTES ▸ la calle no da fiado.","ambar"); return; }
  p.credits-=it.price;
  S.player.stats.totalCreditsSpent=(S.player.stats.totalCreditsSpent||0)+it.price;
  switch(it.id){
    case "decoy": p.decoys++; break;
    case "virus": p.virus++; break;
    case "breaker": p.breakerUp++; break;
    case "ram": p.ramUp++; break;
    case "firewall": p.fwUp++; break;
    case "link": p.linkUp++; p.maxCpu=maxCpu(); break;
    case "repair": p.cpu=p.maxCpu; break;
    case "cool": p.heat=clamp(p.heat-30,0,100); break;
  }
  sound.buy();
  var line={
    decoy:"DISCO DECOY AÑADIDO ▸ ahora el ICE tiene una razón más para odiarte.",
    virus:"PAQUETE VIRUS GUARDADO ▸ una menos para ti.",
    breaker:"ROMPEHIELOS INSTALADO ▸ ahora el ICE tiene una razón más para odiarte.",
    ram:"BARRA RAM +4 ▸ más espalda para cargar datos sucios.",
    firewall:"FIREWALL +10 ▸ el cable se quema en tus manos, pero tú sigues.",
    link:"LINK NEURAL +20 ▸ tu cráneo aguantará un poco más hoy.",
    repair:"PULSO REPARADOR ▸ neuronas reconectadas. CPU al máximo.",
    cool:"NÉBULA FRESCA ▸ el calor baja 30. respira, corvo."
  }[it.id];
  addLog("TIENDA ▸ compraste "+it.name+" (-"+it.price+"₡).");
  msg(line+"  ₡-"+it.price,"verde");
  save(true); renderTienda();
};


/* ============================================================
   11. CONTACTOS, REPUTACIÓN Y TRABAJOS
   ============================================================ */

function getContactDialogue(contact, rep){
  /* post-Núcleo: frases diferentes */
  if(S.history && S.history.finalDone){
    var postNucleo={
      mamaWire:[
        "El Núcleo está apagado. La calle respira diferente. ¿Qué harás con eso, corvo?",
        "Sin el ojo encima, la calle se ha vuelto más ruidosa. Y más libre."],
      doctorSudario:[
        "Lo lograste. El ojo se cerró. Pero el cable sigue soñando. ¿Y tú?",
        "Apagaste el Núcleo y la ciudad aún no se ha dado cuenta. Todavía."],
      night0X:[
        "Has destruido un imperio. Ahora eres libre... o eso dicen.",
        "El imperio ha perdido su corona. Y yo, mi propósito. Gracias, supongo."],
      kairos:[
        "El sueño terminó. Pero hay otros sueños esperando en las capas.",
        "Sin el Núcleo, el cable ha empezado a improvisar. A mí me gusta."]
    };
    if(postNucleo[contact.id]) return pickFresh("dial-"+contact.id, postNucleo[contact.id]);
  }
  /* cada nivel de reputación tiene variantes; pickFresh evita repetir la última */
  var dial = CONTACT_DIALOGUES[contact.id];
  if(dial && dial[rep]) return pickFresh("dial-"+contact.id+"-"+rep, [].concat(dial[rep]));
  return contact.frase;
}

function renderContactos(){
  var html='<h1 class="title">CONTACTOS</h1>'+
    '<div class="sub">canales cifrados · no confíes en nadie</div>';
  CONTACTOS_DEF.forEach(function(c){
    var unlocked=!c.locked || (S.player.level>=4 && S.player.rep.night0X>=2);
    var rep=S.player.rep[c.id]||0;
    var lockTxt = (c.locked && !unlocked) ? (' · BLOQUEADO ['+(c.lock||'')+']') : '';
    html+='<div class="contact'+(unlocked?"":" locked")+'">'+
      '<div class="flex-sb">'+
        '<div><b class="'+c.cls+'">'+c.name+'</b> <span class="muted">'+c.role+'</span>'+
        '<div class="muted contact-loc">'+c.loc+'</div></div>'+
        '<div class="rep-dots">'+repDots(rep)+'</div></div>'+
      '<div class="sep"></div>'+
      '<div class="muted contact-quote">“'+getContactDialogue(c, rep)+'”'+lockTxt+'</div>'+
      '<div class="offers" id="offers-'+c.id+'"></div></div>';
  });
  html+='<div class="center mt-2"><button class="btn" data-action="refreshOffers">⟳ REFRESCAR OFERTAS</button></div>';
  scroller(html);
  CONTACTOS_DEF.forEach(function(c){
    var off=document.getElementById("offers-"+c.id); if(!off) return;
    var unlocked=!c.locked || (S.player.level>=4 && S.player.rep.night0X>=2);
    if(!unlocked){ off.innerHTML='<div class="muted text-xs">contacto bloqueado.</div>'; return; }
    var list=S.offers.filter(function(o){ return o.contact===c.id; });
    if(!list.length){ off.innerHTML='<div class="muted text-xs">sin ofertas ahora.</div>'; return; }
    list.forEach(function(o){ off.innerHTML+=offerHtml(o,c); });
  });
  updateTopbar();
  msg(pickFresh("view-contactos", FRASES_VIEWS.contactos),"cyan");
}


/* ---- ofertas y trabajos (el «por qué» vive en cypher_os_data.js) ---- */

function pickWhy(contact,type){
  var alias={datos:"recoleta", ice:"rompehielas"};
  var t=alias[type]||type;
  var c=WHY_JOBS[contact];
  var list=(c&&c[t])||null;
  return list?pick(list):"";
}
function jobOfferBlocked(o){
  if(!inImmersion) return "";
  if(o.type==="vault") return "acepta el contrato de vault en la calle, antes de generar el siguiente grid.";
  if(o.n>jobTargetCount(o.type,inImmersion)) return "no quedan suficientes objetivos o RAM para este contrato en el grid actual. Acéptalo en la calle para la siguiente inmersión.";
  return "";
}
function offerHtml(o,c){
  var taken=S.jobs.some(function(j){ return j.id===o.id && !j.done; });
  var resolved=null;
  for(var i=0;i<S.jobs.length;i++){ if(S.jobs[i].id===o.id && S.jobs[i].done){ resolved=S.jobs[i]; break; } }
  var riskCls=o.risk||"ext";
  var action;
  if(taken) action='<span class="verde">✓</span>';
  else if(resolved) action=resolved.failed?'<span class="rojo">✗</span>':'<span class="verde">✓</span>';
  else if(jobOfferBlocked(o)) action='<span class="ambar text-xs">'+(o.type==="vault"?"ACEPTAR EN LA CALLE":"SIN CAPACIDAD EN ESTE GRID")+'</span>';
  else action=' <button class="btn small" data-action="acceptJob" data-id="'+o.id+'" data-contact="'+c.id+'">ACEPTAR</button>';
  return '<div class="offer"><div class="desc">'+o.title+'<div class="task-line text-xs">'+o.desc+'</div>'+
    (o.why?'<div class="offer-why">'+o.why+'</div>':'')+'</div>'+
    '<span class="tag '+riskCls+'">'+RISK_TXT[o.risk]+'</span> <span class="gris">₡'+o.reward+'</span>'+action+'</div>';
}

ACTIONS.acceptJob = function(btn){
  if(!livingInteraction()) return;
  var id=btn.getAttribute("data-id"), contact=btn.getAttribute("data-contact");
  var o=jobById(id); if(!o){ renderContactos(); return; }
  var blocked=jobOfferBlocked(o);
  if(blocked){ msg(blocked,"ambar"); return; }
  var activeCount = S.jobs.filter(function(j){ return !j.done; }).length;
  if(activeCount>=3){ msg("máximo 3 contratos activos. superficializa para limpiar.","ambar"); return; }
  if(S.jobs.some(function(j){ return j.id===id; })){ msg("ese contrato ya fue aceptado o resuelto.","ambar"); return; }
  if(o.type==="vault" && S.jobs.some(function(j){ return j.type==="vault" && !j.done; })){
    msg("solo puedes llevar UN contrato de vault activo a la vez.","ambar"); return;
  }
  var job={ id:o.id, title:o.title, desc:o.desc, type:o.type, contact:o.contact,
    risk:o.risk, reward:o.reward, xp:o.xp, n:o.n, targetDepth:o.targetDepth, project:o.project,
    why:o.why, ts:Date.now(), prog:newProg(o.type), done:false, failed:false };
  S.jobs.push(job);
  unlock("fixers");
  checkMensajes();
  addLog("✔ CONTRATO ACEPTADO ▸ "+job.title);
  msg("contrato aceptado ▸ "+job.title+". Baja al grid y complétalo.","verde");
  save(true); renderContactos(); updateTopbar(); updateNotifications();
  advanceTutorial();
};

ACTIONS.refreshOffers = function(){
  generateOffers();
  addLog("REFRESCAR ▸ nuevas ofertas en los canales.");
  msg("ofertas refrescadas. la calle siempre tiene más.","cyan");
  save(); renderContactos();
};

function jobById(id){ for(var i=0;i<S.offers.length;i++) if(S.offers[i].id===id) return S.offers[i]; return null; }
function generateOffers(){
  S.offers=[];
  CONTACTOS_DEF.forEach(function(c){
    if(c.locked && !(S.player.level>=4 && S.player.rep.night0X>=2)) return;
    var types=c.jobs;
    /* una oferta por cada tipo de trabajo del contacto */
    for(var t=0;t<types.length;t++){
      var offer=buildOffer(c.id, types[t]);
      if(offer) S.offers.push(offer);
    }
  });
}
function buildOffer(contact,type){
  var lvl=S.player.level, base=60+lvl*35;
  if(type==="datos"||type==="recoleta"){
    var n=Math.min(jobQuotaLimit("recoleta"),2+Math.floor(lvl/2)+randInt(0,2));
    return mkOffer(contact,"RECOLECTA EN EL GRID",jobObjectiveDesc("recoleta",n),"recoleta",n,Math.round(base*1.0),12,"low");
  }
  if(type==="carrera"){
    var nn=Math.min(jobQuotaLimit("carrera"),3+Math.floor(lvl/2));
    return mkOffer(contact,"CARRERA DE TRAZADO",jobObjectiveDesc("carrera",nn),"carrera",nn,Math.round(base*1.4),20,"med");
  }
  if(type==="rompehielas"){
    var nr=Math.min(jobQuotaLimit("rompehielas"),2+Math.floor(lvl/3));
    return mkOffer(contact,"ROMPEHIELOS",jobObjectiveDesc("rompehielas",nr),"rompehielas",nr,Math.round(base*1.6),22,(lvl>=3?"high":"med"));
  }
  if(type==="vault"){
    var td=Math.min(4,2+Math.floor(lvl/2));
    /* pareja canónica proyecto↔corporación (LORE.md §4): nunca un proyecto ajeno */
    var proj=pick(PROYECTOS);
    var corp=PROYECTO_CORP[proj]||pick(["KURO GATECH","MONOLITH"]); /* VESPER = consorcio */
    return mkOffer(contact,"EL VAULT DE "+corp,"Llega a la capa "+td+" y recupera el proyecto "+proj+".","vault",1,Math.round(base*2.2),30,"high",{project:proj,targetDepth:td});
  }
  if(type==="daemon"){
    var nd=Math.min(jobQuotaLimit("daemon"),1+Math.floor(lvl/3));
    return mkOffer(contact,"CAZA DE DEMONIOS",jobObjectiveDesc("daemon",nd),"daemon",nd,Math.round(base*1.9),26,(lvl>=4?"ext":"high"));
  }
  if(type==="ice"){
    var ni=Math.min(jobQuotaLimit("rompehielas"),3+Math.floor(lvl/2));
    return mkOffer(contact,"PURGA DE ICE",jobObjectiveDesc("rompehielas",ni),"rompehielas",ni,Math.round(base*1.2),16,"low");
  }
  return null;
}
function mkOffer(contact,title,desc,type,n,reward,xp,risk,extra){
  return { id:"off_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),
    contact,title,desc,type,n:n,reward:reward,xp:xp,risk:risk,
    why:pickWhy(contact,type),
    project:extra&&extra.project, targetDepth:extra&&extra.targetDepth };
}

function renderTrabajos(){
  var html='<h1 class="title">TRABAJOS</h1>'+
    '<div class="sub">contratos activos ('+S.jobs.filter(function(j){return !j.done;}).length+'/3) · se resuelven al superficializar</div>';
  if(!S.jobs.length) html+='<div class="box muted">sin contratos activos. ve a CONTACTOS y acepta uno.</div>';
  else {
    /* más recientes arriba (sello de aceptación); en guardados antiguos sin
       sello, orden inverso de aceptación */
    var list=S.jobs.map(function(j,i){ return {j:j,i:i}; });
    list.sort(function(a,b){
      var d=(b.j.ts||0)-(a.j.ts||0);
      return d!==0?d:b.i-a.i;
    });
    list.forEach(function(e){
      var j=e.j;
      var riskCls=j.risk||"ext";
      var statusTxt=j.failed?"FRACASADO":(j.done?"COMPLETADO":"EN CURSO");
      var statusCls=j.failed?"rojo":(j.done?"verde":"cyan");
      html+='<div class="job"><div class="flex-sb">'+
        '<div><b class="cyan">'+j.title+'</b> <span class="muted text-xs">'+j.contact+'</span>'+
        '<div class="task-line job-meta-sub">'+j.desc+'</div>'+
        (j.why?'<div class="offer-why">'+j.why+'</div>':'')+'</div>'+
        '<div class="text-right"><span class="tag '+riskCls+'">'+RISK_TXT[j.risk]+'</span>'+
        '<div class="'+statusCls+' job-meta-sub">'+statusTxt+'</div></div></div>'+
        '<div class="prog muted">'+progText(j)+'</div></div>';
    });
  }
  html+='<div class="sep"></div>'+
    '<div class="muted job-help-text">Todo contrato se evalúa cuando superficializas. Si lo cumples, se paga y sube tu reputación. Si no, sube el calor.</div>';
  scroller(html); updateTopbar();
  msg(pickFresh("view-trabajos", FRASES_VIEWS.trabajos),"cyan");
}
function progText(j){
  switch(j.type){
    case "recoleta": return "recogidos: "+j.prog.gathered+"/"+j.n;
    case "carrera": return "datos en cap≥3: "+j.prog.deepGathered+"/"+j.n+" · (calor <45 al volver)";
    case "rompehielas": return "ICE T2/T3 destruidos: "+j.prog.iceT2+"/"+j.n+" · los daemons no cuentan";
    case "vault": return j.prog.vaulted?"proyecto recuperado ✓":"llega a la capa "+j.targetDepth+" y recupera "+j.project;
    case "daemon": return "daemons: "+j.prog.daemons+"/"+j.n;
    default: return "";
  }
}


/* ============================================================
    13. AYUDA / CÓMO JUGAR
    ============================================================ */

function renderAyuda(){
  if(typeof HELP_HTML === 'undefined'){
    scroller('<div class="muted">ERROR: archivo de ayuda no cargado (cypher_os_help.js).</div>');
  } else {
    scroller(HELP_HTML);
  }
  updateTopbar();
  msg(pickFresh("view-ayuda", FRASES_VIEWS.ayuda),"cyan");
}


/* ============================================================
    LOGROS / ACHIEVEMENTS
    ============================================================ */

function renderLogros(){
  var html='<h1 class="title">LOGROS</h1>'+
    '<div class="sub">'+S.achievements.length+"/"+ACHIEVEMENTS.length+" desbloqueados</div>"+
    '<div class="logros-grid">';
  for(var i=0;i<ACHIEVEMENTS.length;i++){
    var a=ACHIEVEMENTS[i];
    var unlocked=S.achievements.indexOf(a.id)>=0;
    html+='<div class="logro'+(unlocked?" unlocked":" locked")+'">'+
      '<div class="logro-icon">'+a.icon+'</div>'+
      '<div class="logro-info"><div class="logro-name">'+(unlocked?a.name:"▒▒▒▒▒")+'</div>'+
      '<div class="logro-desc">'+(unlocked?a.desc:"[BLOQUEADO]")+'</div></div></div>';
  }
  html+='</div>';
  scroller(html); updateTopbar();
  msg(pickFresh("view-logros", FRASES_VIEWS.logros).replace("%n", S.achievements.length+" de "+ACHIEVEMENTS.length),"cyan");
}


/* ============================================================
    14. INFORMES / INTEL
    ============================================================ */

function renderInformes(){
  var html='<h1 class="title">INFORMES</h1>'+
    '<div class="sub">conocimiento prohibido · '+S.intel.length+"/"+INTEL.length+' desbloqueado</div>'+
    '<div class="intel-grid">';
  INTEL.forEach(function(it){
    if(has(it.id)) html+='<div class="intel"><b class="cyan">'+it.t+'</b> <span class="tag '+it.r+'">'+RISK_TXT[it.r]+'</span>'+
      (it.k?'<div class="intel-k">▸ '+it.k+'</div>':'')+
      '<div class="llore">'+it.l.replace(/\n/g,"<br>")+'</div></div>';
    else html+='<div class="intel"><b class="gris">▒▒▒▒▒ [CIFRADO]</b><div class="muted text-xs mt-1 intel-hint">desbloqueo: '+intelHint(it.id)+'</div></div>';
  });
  html+='</div>';
  scroller(html); updateTopbar();
  msg(pickFresh("view-informes", FRASES_VIEWS.informes),"cyan");
}
function has(id){ return S.intel.indexOf(id)>=0; }
function intelHint(id){
  /* la pista sale del trigger declarado en INTEL[u] (fuente única de verdad) */
  var u=null;
  for(var i=0;i<INTEL.length;i++) if(INTEL[i].id===id) u=INTEL[i].u;
  var map={ first_immerse:"primera inmersión", first_job:"primer trabajo",
    depth3:"alcanzar profundidad 3", depth4:"alcanzar profundidad 4",
    first_daemon:"primer daemon", doctor_job:"trabajo del Doctor Sudario",
    first_vault:"primer vault", heat90:"calor ≥ 90",
    level2:"nivel 2", level5:"nivel 5", level8:"nivel 8", level10:"nivel 10",
    defeat_boss:"derrotar al Núcleo", rep_mama2:"reputación con Mama Wire ≥ 2",
    rep_doctor3:"reputación con Doctor Sudario ≥ 3", rep_night3:"reputación con Night-0X ≥ 3",
    ice_t3:"destruir 5 ICE", immerse3:"3 inmersiones",
    rep_doctor2:"reputación con Doctor Sudario ≥ 2", rep_night2:"reputación con Night-0X ≥ 2",
    data50:"cargar 50 datos en total", ice10:"destruir 10 ICE",
    immerse5:"5 inmersiones", daemon5:"derrotar 5 daemons",
    depth6:"alcanzar la capa 6 (SEALED NETWORK)" };
  return map[u]||"desconocido";
}


/* ============================================================
   6b. VISTAS: INICIO / ESTADO / REGISTRO
   ============================================================ */

function renderInicio(){
  var p=S.player;
  /* caja de ambiente: frase contextual de la calle, sin repetir la anterior */
  var dir="La calle está quieta.";
  if(S.history.finalDone) dir=pickFresh("calle-fin", FRASES_CALLE_FIN);
  else if(!S.history.finalUnlocked && p.level>=5 && p.rep.night0X>=3) dir="NIGHT-0X tiene una última oferta. Revisa CONTACTOS.";
  else {
    var active=S.jobs.filter(function(j){return !j.done;});
    if(active.length){
      dir=pickFresh("dir-jobs", FRASES_DIR_CONTRATOS)+active.map(function(j){return j.title;}).join(", ")+".";
    } else {
      var calle=FRASES_CALLE.filter(function(f){ return !f.when || f.when(); });
      var dirObj=pickFresh("calle", calle);
      if(dirObj) dir=dirObj.t;
    }
  }
  var html='<div class="logo glow">CYPHER<br><small>:OS v9.2.7</small></div>'+
    '<div class="panel-h">ESTADO</div><div class="box">'+
    row2("CPU",Math.round(p.cpu)+"/"+p.maxCpu)+row2("CALOR",Math.round(p.heat)+"/100",p.heat>70?"rojo":(p.heat>40?"ambar":"verde"))+
    row2("CRÉDITOS","₡"+Math.floor(p.credits),"verde")+row2("RAM",dataUsedNow()+"/"+ramCap())+
    row2("NIVEL",p.level+" · XP "+p.xp+"/"+xpParaNivel())+
    '</div>'+
    '<div class="diriz">'+dir+'</div>'+
    '<div class="quick">'+
    '<button class="btn cyan" data-action="dipGrid">◈ DIP AL GRID</button>'+
    '<button class="btn" data-action="goContactos">⌘ CONTACTOS</button>'+
    '<button class="btn" data-action="goTienda">⛿ MERCADO NEGRO</button>'+
    '<button class="btn ambar" data-action="goTrabajos">▤ TRABAJOS</button>'+
    '</div>';
  if(S.history.finalUnlocked && !S.history.finalDone)
    html+='<div class="center mt-2"><button class="btn magenta" data-action="acceptNucleo">✦ EL NÚCLEO (profundidad 5)</button></div>';
  if(S.history.finalDone)
    html+='<div class="center mt-2"><button class="btn magenta" data-action="startEndless">◈ SEALED NETWORK</button> <span class="muted text-xs">modo supervivencia</span></div>';
  html+='<div class="panel-h">REPUTACIÓN</div><div class="box">'+repRows()+'</div>';
  /* actividades de la calle (solo cuando no hay inmersión) */
  if(!inImmersion){
    html+='<div class="panel-h">ACTIVIDADES DE LA CALLE</div><div class="box">';
    for(var ai=0;ai<STREET_ACTIVITIES.length;ai++){
      var act=STREET_ACTIVITIES[ai];
      var onCooldown=activityOnCooldown(act);
      var canAct=!onCooldown;
      if(act.id==="informantes" && S.player.credits<50) canAct=false;
      html+='<div class="row"><span class="key">'+act.icon+' '+act.name+'</span>'+
        '<span class="val"><span class="muted text-xs">'+act.desc+'</span> '+
        '<button class="btn small" data-action="streetActivity" data-act="'+ai+'"'+(canAct?"":" disabled")+'>ACTUAR</button>'+
        (onCooldown?'<span class="muted text-xs"> (cooldown)</span>':'')+
        '</span></div>';
    }
    html+='</div>';
  }
  scroller(html); addTicker(); updateTopbar();
  msg(pickFresh("inicio-msg", FRASES_INICIO),"magenta");
}
function addTicker(){
  var el=document.getElementById("panel-scroll"); if(!el) return;
  var t=document.createElement("div"); t.className="ticker";
  t.innerHTML="<b>SEÑAL:</b> "+pickTicker();
  el.appendChild(t);
}
function row2(k,v,cls){
  return '<div class="row"><span class="key">'+k+'</span><span class="val '+(cls||'')+'">'+v+'</span></div>';
}
function repRows(){
  var html="";
  CONTACTOS_DEF.forEach(function(c){
    var rep=S.player.rep[c.id]||0;
    html+='<div class="row"><span class="key"><b class="'+c.cls+'">'+c.name+'</b></span><span class="rep-dots">'+repDots(rep)+'</span></div>';
  });
  return html;
}
function dataUsedNow(){ return inImmersion?inImmersion.dataUsed:0; }
/* reloj monótono para cooldowns: S.clock da la vuelta a medianoche y no sirve */
function clockMin(){ return (S.player.stats.totalPlayTime||0); }
function activityOnCooldown(act){ return clockMin() < (S._activityCooldowns[act.id]||0); }

ACTIONS.dipGrid = function(){
  if(combatActive || (S && S.player.cpu<=0)) return;
  if(inImmersion){ showView("red"); return; }
  startImmersion(S.nextDepth || 4);
};
ACTIONS.startIntro = beginIntro;
ACTIONS.startEndless = function(){
  if(combatActive || (S && S.player.cpu<=0)) return;
  if(inImmersion){ msg("ya estás en el grid. superficializa primero.","ambar"); return; }
  if(isLockdown()){
    msg("LOCKDOWN ACTIVO ▸ calor demasiado alto. espera a que baje para conectarte.","rojo");
    return;
  }
  /* conservar una misión pendiente si no llega a comenzar la inmersión */
  var previousDepth=S.nextDepth, previousEndless=S.history.endlessActive;
  var depth=4+Math.floor((S._endlessSurfaces||0)/2);
  S.nextDepth=depth;
  S.history.endlessActive=true;
  try{ startImmersion(depth); }
  finally {
    if(!inImmersion){ S.nextDepth=previousDepth; S.history.endlessActive=previousEndless; }
  }
  if(!inImmersion) return;
  addLog("SEALED NETWORK ▸ modo supervivencia activado. Profundidad: "+depth+".");
  msg("SEALED NETWORK ▸ supervivencia. no hay contratos. sobrevive el mayor tiempo posible.","magenta");
  save();
};
ACTIONS.goContactos = function(){ showView("contactos"); };
ACTIONS.goTienda = function(){ showView("tienda"); };
ACTIONS.goTrabajos = function(){ showView("trabajos"); };
ACTIONS.openSkillTree = function(){ renderSkillTree(); };
ACTIONS.streetActivity = function(btn){
  var idx=parseInt(btn.getAttribute("data-act"));
  var act=STREET_ACTIVITIES[idx];
  if(!act) return;
  /* comprobar cooldown */
  if(activityOnCooldown(act)){ msg("aún estás en enfriamiento de "+act.name+".","ambar"); return; }
  /* comprobar recursos */
  if(act.id==="informantes" && S.player.credits<50){ msg("créditos insuficientes.","ambar"); return; }
  /* ejecutar */
  act.effect();
  /* cooldown (min de juego): 60 bar, 120 entreno, 999 informantes */
  var cdMin=act.id==="bar"?60:(act.id==="entreno"?120:999);
  S._activityCooldowns[act.id]=clockMin()+cdMin;
  save(true); renderInicio(); updateTopbar();
};

/* ---- ESTADO ---- */
function renderEstado(){
  var p=S.player;
  var html='<h1 class="title">ESTADO</h1>'+
    '<div class="sub">corvo-7 · netrunner de calle</div>'+
    '<div class="panel-h">CUERPO</div><div class="box">'+
    row2("CPU",Math.round(p.cpu)+"/"+p.maxCpu)+row2("CALOR",Math.round(p.heat)+"/100")+
    row2("FIREWALL",fwVal())+row2("RAM (slots)",dataUsedNow()+"/"+ramCap())+
    row2("CRÉDITOS","₡"+Math.floor(p.credits))+row2("NIVEL",p.level+" · XP "+p.xp+"/"+xpParaNivel())+
    '</div>'+
    '<div class="panel-h">SKILLS <span class="muted text-xs">(puntos disponibles: '+p.skillPoints+')</span></div>'+
    '<div class="box">'+
    skillRow("HACK","claves más cortas · más tiempo para romper ICE",p.hack)+
    skillRow("SIGILO","menos embuscadas · menos calor · huir más fácil",p.sigilo)+
    skillRow("NERVIOS","reduce el daño recibido",p.nervios)+
    '</div>'+
    '<div class="center"><button class="btn cyan" data-action="openSkillTree">★ VER ÁRBOL DE HABILIDADES</button></div>'+
    '<div class="panel-h">UPGRADES</div><div class="box">'+
    row2("RAM","+4 ×"+p.ramUp)+row2("FIREWALL","+10 ×"+p.fwUp)+
    row2("LINK NEURAL","+20 CPU ×"+p.linkUp)+row2("ROMPEHIELOS",-1+" longitud ×"+p.breakerUp)+
    '</div>'+
    '<div class="panel-h">INVENTARIO</div><div class="box">'+
    row2("DISCOS DECOY",p.decoys)+row2("PAQUETES VIRUS",p.virus)+
    '</div>'+
    '<div class="panel-h">REPUTACIÓN</div><div class="box">'+repRows()+'</div>'+
    '<div class="panel-h">HISTORIAL</div><div class="box">'+
    row2("INMERSIONES",p.stats.immerse)+row2("ICE DESTRUIDOS",p.stats.ice)+
    row2("DAEMONS DESTRUIDOS",p.stats.daemons)+row2("DATOS EXTRAÍDOS",p.stats.data)+
    row2("CRÉDITOS OBTENIDOS","₡"+p.stats.credits)+row2("PROFUNDIDAD MÁXIMA","capa "+p.stats.maxDepth)+
    '</div>'+
    '<div class="panel-h">ESTADÍSTICAS AVANZADAS</div><div class="box">'+
    row2("TIEMPO TOTAL",Math.floor((p.stats.totalPlayTime||0)/60)+" min")+
    row2("ICE T1/T2/T3",(p.stats.iceByTier&&p.stats.iceByTier[1]||0)+"/"+(p.stats.iceByTier&&p.stats.iceByTier[2]||0)+"/"+(p.stats.iceByTier&&p.stats.iceByTier[3]||0))+
    row2("TRABAJOS COMPLETADOS",p.stats.jobsCompleted||0)+
    row2("TRABAJOS FRACASADOS",p.stats.jobsFailed||0)+
    row2("CRÉDITOS GASTADOS","₡"+(p.stats.totalCreditsSpent||0))+
    row2("DAÑO RECIBIDO",p.stats.totalDamageReceived||0)+
    row2("DAÑO INFLIGIDO",p.stats.totalDamageDealt||0)+
    row2("RACHA MÁX. COMBATES",p.stats.maxCombatStreak||0)+
    '</div>'+
    '<div class="panel-h">MEJOR REGISTRO</div><div class="box">'+
    row2("NIVEL MÁX",S.best.level||"-")+row2("INMERSIONES",S.best.immerse||"-")+
    row2("ICE",S.best.ice||"-")+row2("DAEMONS",S.best.daemons||"-")+
    row2("CRÉDITOS","₡"+(S.best.credits||0))+row2("PROFUNDIDAD","capa "+(S.best.depth||"-"))+
    '</div>';
  scroller(html); updateTopbar();
  msg(pickFresh("view-estado", FRASES_VIEWS.estado),"cyan");
}
function skillRow(name, desc, val){
  var can=S.player.skillPoints;
  return '<div class="row"><div><span class="val">'+name+'</span> <span class="gris">×'+val+'</span><br><span class="muted text-xs">'+desc+'</span></div>'+
    '<div><button class="btn small" data-action="addSkill" data-skill="'+name+'"'+(can>0?"":" disabled")+'>+</button></div></div>';
}

ACTIONS.addSkill = function(btn){
  var sk=btn.getAttribute("data-skill");
  var key=(sk==="HACK"?"hack":sk==="SIGILO"?"sigilo":"nervios");
  if(S.player.skillPoints<=0){ msg("sin puntos de habilidad. sube de nivel.","ambar"); return; }
  if(S.player[key]>=5){ msg("skill al máximo (5).","ambar"); return; }
  S.player[key]++; S.player.skillPoints--;
  addLog("SKILL ▸ "+sk+" → "+S.player[key]);
  msg(sk+" mejorado a "+S.player[key]+".","verde");
  sound.buy(); save(true); renderEstado(); updateTopbar();
};


/* ---- árbol de habilidades: render y alta de skills (datos en cypher_os_data.js) ---- */


function isSkillUnlocked(id){
  if(!S.player._unlockedSkills) S.player._unlockedSkills=[];
  return S.player._unlockedSkills.indexOf(id)>=0;
}
function canUnlockSkill(skill){
  if(isSkillUnlocked(skill.id)) return false;
  if(S.player.skillPoints<skill.cost) return false;
  if(skill.prereq && !isSkillUnlocked(skill.prereq)) return false;
  /* solo los skills con `stat` suben atributo: respetan el máximo de 5.
     ROMPEMUROS (breakerUp) y REGENERACIÓN (pasivo) no tocan atributos. */
  if(skill.stat && S.player[skill.stat]>=5) return false;
  return true;
}
function unlockSkill(branchIdx, skillIdx){
  var branch=SKILL_TREE[branchIdx];
  var skill=branch.skills[skillIdx];
  if(!canUnlockSkill(skill)) return;
  if(!S.player._unlockedSkills) S.player._unlockedSkills=[];
  S.player._unlockedSkills.push(skill.id);
  S.player.skillPoints-=skill.cost;
  if(skill.apply) skill.apply();
  addLog("SKILL TREE ▸ desbloqueado: "+skill.name+".");
  msg("SKILL ▸ "+skill.name+" desbloqueado.","magenta");
  sound.levelUp(); save(true); renderSkillTree(); updateTopbar();
  var overlay=document.getElementById("skilltree-overlay");
  var next=overlay && (overlay.querySelector('.skill-node[tabindex="0"]') || overlay.querySelector('[data-action="closeSkillTree"]'));
  if(next) next.focus();
}

function renderSkillTree(){
  var el=document.getElementById("skilltree-overlay");
  if(!el) return;
  var html='<div class="skilltree-card">'+
    '<div class="skilltree-title">ÁRBOL DE HABILIDADES</div>'+
    '<div class="skilltree-sub">puntos disponibles: <b>'+S.player.skillPoints+'</b></div>';
  for(var b=0;b<SKILL_TREE.length;b++){
    var br=SKILL_TREE[b];
    html+='<div class="skill-branch">'+
      '<div class="skill-branch-name '+br.cls+'">'+br.branch+'</div>'+
      '<div class="skill-nodes">';
    for(var s=0;s<br.skills.length;s++){
      var sk=br.skills[s];
      var unlocked=isSkillUnlocked(sk.id);
      var available=canUnlockSkill(sk);
      var cls=unlocked?"unlocked":(available?"available":"locked");
      html+='<div class="skill-node '+cls+'" role="button" tabindex="'+(available?"0":"-1")+'" '+
        'aria-disabled="'+(available?"false":"true")+'" data-branch="'+b+'" data-skill="'+s+'">'+
        '<div class="sk-name">'+sk.name+'</div>'+
        '<div class="sk-desc">'+sk.desc+'</div>'+
        '<div class="sk-cost">'+(unlocked?"DESBLOQUEADO":("coste: "+sk.cost))+'</div></div>';
    }
    html+='</div></div>';
  }
  html+='<div class="center mt-2"><button class="btn" data-action="closeSkillTree">CERRAR</button></div>';
  html+='</div>';
  el.innerHTML=html;
  el.classList.remove("hidden");
  el.classList.add("show");
  /* solo los nodos disponibles aceptan clic, Enter o Espacio; Tab los recorre */
  var nodes=el.querySelectorAll('.skill-node[tabindex="0"]');
  for(var i=0;i<nodes.length;i++){
    nodes[i].addEventListener("click", function(){
      var b=parseInt(this.getAttribute("data-branch"),10);
      var s=parseInt(this.getAttribute("data-skill"),10);
      unlockSkill(b,s);
    });
    nodes[i].addEventListener("keydown", function(e){
      if(e.key!=="Enter" && e.key!==" " && e.key!=="Spacebar") return;
      e.preventDefault();
      var b=parseInt(this.getAttribute("data-branch"),10);
      var s=parseInt(this.getAttribute("data-skill"),10);
      unlockSkill(b,s);
    });
  }
  ACTIONS.closeSkillTree=function(){
    el.classList.remove("show");
    el.classList.add("hidden");
    ACTIONS.closeSkillTree=null;
    renderEstado();
  };
}

/* ---- MENSAJES (bandeja del deck) ---- */
/* pie de la carta según el estado del emisor (CONTRACTS §19): la no-respuesta
   es ficción (quemó su ruta), no una carencia del juego */
function emisorLine(d){
  if(d.emisor==="valido") return '▸ EMISOR: <b>'+escapeHtml(d.from)+'</b> · canal de voz · sin respuesta por aquí';
  if(d.emisor==="no-valido") return '▸ EMISOR: no válido — ruta desechable · SIN RESPUESTA POSIBLE';
  return '▸ EMISOR: ███ enmascarado · SIN RUTA DE VUELTA';
}
function renderMensajes(){
  var openId=S._msgOpen||null, m=null, def=null, i, j;
  if(openId){
    for(i=0;i<S.mensajes.length;i++) if(S.mensajes[i].id===openId){ m=S.mensajes[i]; }
    def=m?msgDef(m.id):null;
    if(!m || !def){ openId=null; S._msgOpen=null; }
  }
  var html='<h1 class="title">MENSAJES</h1>'+
    '<div class="sub">bandeja del deck · '+S.mensajes.length+' cartas · '+unreadMsgCount()+' sin leer</div>';
  if(openId){
    html+='<div class="msgcard">'+
      '<button class="btn small" data-action="closeMsg">◂ VOLVER A LA BANDEJA</button>'+
      '<div class="msg-head"><b class="cyan">'+escapeHtml(def.from)+'</b> <span class="muted text-xs">'+timeStr(m.hora)+'</span></div>'+
      '<div class="msg-subj">'+escapeHtml(def.t)+'</div>'+
      '<div class="msg-body'+(def.doc?" msgdoc":"")+'">'+escapeHtml(def.l).replace(/\n/g,"<br>")+'</div>'+
      '<div class="msg-foot muted">'+emisorLine(def)+'</div>'+
      msgReplyHtml(m, def)+
      (m.respuesta?'<div class="msg-answer">▸ '+escapeHtml(m.respuesta).replace(/\n/g,"<br>")+'</div>':'')+
      '</div>';
  } else if(!S.mensajes.length){
    html+='<div class="box muted">bandeja vacía. cuando alguien te escriba, aquí quedará: la línea inferior se olvida, las cartas no.</div>';
  } else {
    html+='<div class="msglist">';
    for(j=S.mensajes.length-1;j>=0;j--){ /* lo más reciente, arriba */
      var mm=S.mensajes[j], dd=msgDef(mm.id);
      if(!dd) continue;
      html+='<button class="msgrow'+(mm.leido?"":" unread")+'" data-action="openMsg" data-id="'+mm.id+'">'+
        '<span class="msg-from">'+escapeHtml(dd.from)+'</span>'+
        '<span class="msg-t">'+escapeHtml(dd.t)+'</span>'+
        '<span class="muted text-xs">'+timeStr(mm.hora)+'</span>'+
        (mm.leido?"":'<span class="msg-new">●</span>')+
        '</button>';
    }
    html+='</div>';
  }
  scroller(html); updateTopbar(); updateNotifications();
  msg(pickFresh("view-mensajes", FRASES_VIEWS.mensajes),"cyan");
}
ACTIONS.openMsg = function(btn){
  var id=btn?btn.getAttribute("data-id"):null;
  if(!id) return;
  S._msgOpen=id;
  for(var i=0;i<S.mensajes.length;i++) if(S.mensajes[i].id===id) S.mensajes[i].leido=true;
  /* madrugada diegética (22:00–03:00, como las frases de calle) → logro CORREO DE LAS 4 */
  if(S.clock>=1320 || S.clock<180) S.player.stats.msgsAtNight=(S.player.stats.msgsAtNight||0)+1;
  save(); checkAchievements(); renderMensajes();
};
ACTIONS.closeMsg = function(){ S._msgOpen=null; renderMensajes(); };
/* respuesta binaria (CONTRACTS §19): solo cartas con `reply`; la opción 0 es "contestar".
   En emisores sin ruta el envío se devuelve… pero contestar de todas formas cuenta
   para el logro «¿QUIÉN FIRMA?» (msgsVoidReplies). */
function msgReplyHtml(m, d){
  if(!d.reply || m.replyTo!=null) return "";
  var h='<div class="msg-reply">', r;
  for(r=0;r<d.reply.length;r++){
    h+='<button class="btn small" data-action="replyMsg" data-id="'+m.id+'" data-opt="'+r+'">'+escapeHtml(d.reply[r].label)+'</button>';
  }
  return h+'</div>';
}
ACTIONS.replyMsg = function(btn){
  var id=btn?btn.getAttribute("data-id"):null;
  var opt=btn?parseInt(btn.getAttribute("data-opt"),10):-1;
  var d=msgDef(id), m=null, o, i;
  for(i=0;i<S.mensajes.length;i++) if(S.mensajes[i].id===id) m=S.mensajes[i];
  if(!m || !d || !d.reply || !d.reply[opt] || m.replyTo!=null) return;
  o=d.reply[opt];
  m.replyTo=opt;
  m.respuesta=o.resp||"silencio guardado. hay respuestas que no necesitan ruta.";
  if(d.emisor!=="valido" && opt===0) S.player.stats.msgsVoidReplies=(S.player.stats.msgsVoidReplies||0)+1;
  if(o.xp) gainXp(o.xp);
  addLog("MENSAJES ▸ respondiste a "+d.from+".");
  msg(o.resp?"respuesta enviada. lo que vuelva de vuelta, ya veremos.":"silencio guardado. hay quien responde sin escribir.","cyan");
  save(); checkAchievements(); renderMensajes();
};

/* ---- REGISTRO ---- */
/* clasificación por prefijo (sin migrar guardados): lore / combate / contratos / sistema */
function logCat(text){
  if(/^(INTEL ▸|NIGHT-0X ▸|SEÑAL ▸|FRAGMENTO ▸|ECO DEL DECK|✦ EL NÚCLEO)/.test(text)) return "lore";
  if(/^(CONEXIÓN GANADA|⚠ DAEMON|⚠ RASTREADOR|⚠ ALARMA|HUIR|PAQUETE VIRUS)/.test(text)) return "combate";
  if(/^(✔ CONTRATO|✓ TRABAJO|✗ TRABAJO|REFRESCAR)/.test(text)) return "contratos";
  return "sistema";
}
var _logCat="todo", _logFilterText="";
function renderRegistro(){
  function chip(cat,label){
    return '<button class="log-chip'+(_logCat===cat?" active":"")+'" data-action="logFilter" data-cat="'+cat+'">'+label+'</button>';
  }
  var html='<h1 class="title">REGISTRO</h1>'+
    '<div class="sub">eventos del cable · '+S.log.length+' mensajes</div>'+
    '<div class="log-filters">'+chip("todo","todo")+chip("lore","lore")+chip("combate","combate")+
      chip("contratos","contratos")+chip("sistema","sistema")+
      '<button class="btn small" data-action="exportDiario">⤓ EXPORTAR DIARIO</button></div>'+
    '<input id="log-search" type="text" placeholder="buscar en registro..." class="log-search">'+
    '<div class="box" id="logview">';
  html+='</div>';
  scroller(html); updateTopbar();
  /* renderizar entradas DESPUÉS de insertar #logview en el DOM */
  renderLogEntries(_logFilterText);
  /* bind búsqueda (conserva el texto si se re-renderiza por filtro) */
  var searchEl=document.getElementById("log-search");
  if(searchEl){
    searchEl.value=_logFilterText;
    searchEl.addEventListener("input", function(){
      renderLogEntries(this.value);
    });
  }
}
function renderLogEntries(filter){
  var logview=document.getElementById("logview");
  if(!logview) return;
  _logFilterText=filter||"";
  var copy=S.log.slice().reverse();
  var html='';
  for(var i=0;i<copy.length;i++){
    var e=copy[i];
    if(_logCat!=="todo" && logCat(e.text)!==_logCat) continue;
    if(filter && e.text.toLowerCase().indexOf(filter.toLowerCase())<0) continue;
    html+='<div class="ev"><b>['+e.t+']</b> '+escapeHtml(e.text)+'</div>';
  }
  if(!html) html='<div class="muted">sin resultados'+(filter?' para "'+escapeHtml(filter)+'"':' en esta categoría')+'.</div>';
  logview.innerHTML=html;
}
/* filtros del REGISTRO y exportación del diario (respeta el filtro activo) */
ACTIONS.logFilter = function(btn){
  _logCat=btn.getAttribute("data-cat")||"todo";
  renderRegistro();
};
ACTIONS.exportDiario = function(){
  try{
    var lines=["CYPHER://OS · DIARIO DE CORVO-7","registro "+(_logCat==="todo"?"completo":"filtrado: "+_logCat)+" · "+S.log.length+" entradas",""];
    var copy=S.log.slice();
    for(var i=0;i<copy.length;i++){
      var e=copy[i];
      if(_logCat!=="todo" && logCat(e.text)!==_logCat) continue;
      if(_logFilterText && e.text.toLowerCase().indexOf(_logFilterText.toLowerCase())<0) continue;
      lines.push("["+e.t+"] "+e.text);
    }
    var blob=new Blob([lines.join("\n")],{type:"text/plain"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url; a.download="cypher_os_diario.txt";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    msg("diario exportado. tu historia, en texto plano.","verde");
    sound.buy();
  }catch(err){ msg("error al exportar el diario: "+err.message,"rojo"); }
};
function escapeHtml(t){
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}


/* ============================================================
   15. TERMINAL DE COMANDOS
   ============================================================ */

var CMD = {};
var CMD_HISTORY_MAX = 30, cmdHistory = [], cmdHistIdx = -1;
CMD.ayuda = function(){ showView("ayuda"); };
CMD.help = function(){ showView("ayuda"); };
CMD["?"] = function(){ showView("ayuda"); };
CMD.glosario = CMD.mundo = function(){ showView("ayuda"); msg("AYUDA ▸ el mundo en 30 segundos (⓪) y el glosario de términos (⑰).","cyan"); };
/* comandos diegéticos: el OS habla… y evade (los misterios de LORE §7 quedan sellados) */
CMD.expediente = function(){
  scroller('<h1 class="title">EXPEDIENTE</h1>'+
    '<div class="sub">archivo del deck · consulta pública</div>'+
    '<div class="box"><p>ASUNTO: CORVO-7 — netrunner de calle.</p>'+
    '<p>ORIGEN: no consta. El deck es un CORVO-7 robado; por regla local, quien lo porta lo es.</p>'+
    '<p>ESTADO: activo · nivel '+S.player.level+' · '+S.player.stats.immerse+' inmersiones · capa '+S.player.stats.maxDepth+' alcanzada.</p>'+
    '<p>OBSERVACIÓN: el deck conserva datos de portadores anteriores. No es un fallo: es un recuerdo.</p>'+
    '<p class="muted">FIN DEL ARCHIVO · hay preguntas que este archivo no responde.</p></div>');
  msg("EXPEDIENTE ▸ tu ficha, tal como la conserva el cable.","cyan");
};
CMD.quien = function(arg){
  var q=(arg||"").toLowerCase(), line;
  if(q.indexOf("mama")>=0 || q.indexOf("wire")>=0)
    line="MAMA WIRE ▸ fixer de calle desde el bar-club ÓCTAVA. Nadie recuerda su nombre anterior; eso también lo arregló ella.";
  else if(q.indexOf("sudario")>=0 || q.indexOf("doctor")>=0)
    line="DOCTOR SUDARIO ▸ netrunner retirado. Vende recuerdos. Habla del Núcleo como de un sueño y cambia de tema.";
  else if(q.indexOf("night")>=0)
    line="NIGHT-0X ▸ fixer de nivel alto. Se presenta en plural y nunca se contradice… dos veces.";
  else if(q.indexOf("kairos")>=0)
    line="KAIROS ▸ espía corporativo. O eso dice su ficha. La ficha la escribió él.";
  else if(q.indexOf("corvo")>=0 || q.indexOf("yo")>=0 || q.indexOf("7")>=0)
    line="CORVO-7 ▸ tú. El deck es robado y recuerda a quienes lo portaron antes. No es un fallo: es un recuerdo.";
  else if(q.indexOf("nucleo")>=0)
    line="EL NÚCLEO ▸ la máquina que gobierna la red desde la capa 5. Eso es todo lo que este archivo admite.";
  else line='uso: QUIEN <nombre> — prueba con mama wire, sudario, night-0x, kairos, corvo o núcleo.';
  msg(line,"cyan");
};
CMD.diario = function(){ _logCat="lore"; showView("registro"); msg("REGISTRO ▸ filtrado por lore: tu historia, sin el ruido del sistema.","cyan"); };
CMD.sonido = CMD.snd = CMD.sound = toggleSound;
CMD.ambiente = CMD.amb = CMD.ambience = toggleAmbient;
CMD.musica = CMD.music = CMD.mus = toggleMusic;
CMD.brillo = CMD.lum = CMD.brightness = function(arg){
  if(!arg){ msg("brillo de pantalla: "+Math.round(_brillo*100)+"% (fábrica = 100%, ya ~"+Math.round((BRILLO_BASE-1)*100)+"% sobre el tema base). rango 50-150%. ej.: BRILLO 120"); return; }
  var v=parseFloat(arg.replace(",","."));
  if(isNaN(v)){ msg('brillo no reconocido: "'+arg+'". usa BRILLO 50-150 (porcentaje).',"ambar"); return; }
  if(v>2) v=v/100; /* acepta tanto "120" como "1.2" */
  setBrillo(v);
  msg("brillo de pantalla al "+Math.round(_brillo*100)+"%.","cyan");
};
CMD.pantalla = CMD.full = CMD.fs = function(){ toggleFs(); };
CMD.red = CMD.net = CMD.dip = function(){ if(combatActive || (S && S.player.cpu<=0)) return; if(!inImmersion) startImmersion(S.nextDepth || 4); showView("red"); };
CMD.superficie = function(){ superficializar(); };
CMD.contactos = CMD.contact = function(){ showView("contactos"); };
CMD.jobs = CMD.trabajos = function(){ showView("trabajos"); };
CMD.tienda = CMD.shop = function(){ showView("tienda"); };
CMD.stats = CMD.estado = function(){ showView("estado"); };
CMD.intel = CMD.informes = function(){ showView("informes"); };
CMD.log = CMD.registro = function(){ showView("registro"); };
CMD.clear = CMD.cls = function(){ scroller("<div class='muted'>pantalla limpia.</div>"); };
CMD.salir = CMD.back = function(){ showView("inicio"); };
CMD.nucleo = function(){
  if(S.history.finalDone){ msg("EL NÚCLEO ya cayó. El cable sigue abierto: explora SEALED NETWORK.","cyan"); }
  else if(S.player.level<5 || S.player.rep.night0X<3){ msg("EL NÚCLEO no disponible. Necesitas nivel 5 y reputación con NIGHT-0X ≥ 3."); }
  else { S.history.finalUnlocked=true; S.nextDepth=5; addLog("NIGHT-0X ▸ misión EL NÚCLEO asignada."); msg("NIGHT-0X: baja a la capa 5 y apaga el ojo de su autor.","magenta"); save(); }
};
CMD.whoami = function(){ msg("eres CORVO-7 · netrunner de calle. El cable no duerme. Solo parpadea."); };
CMD.tiempo = function(){ msg("hora de calle: "+timeStr(S.clock)+"."); };
/* bandeja del deck (CONTRACTS §19) */
CMD.mensajes = CMD.buzon = CMD.mail = function(){ S._msgOpen=null; showView("mensajes"); };
CMD.responder = function(){ msg("la ruta de origen no admite respuesta. quizá era la idea.","cyan"); };
CMD.guardar = function(){ save(); msg("partida guardada en el cable, corvo. ✓"); };
CMD.unknown = function(cmd){ msg('comando no reconocido: "'+cmd+'" — escribe AYUDA'); };

function executeCommand(raw){
  if(!livingInteraction()) return;
  var line=raw.trim().toLowerCase();
  if(!line) return;
  /* primer token = comando; el resto de la línea viaja como argumento
     (los comandos sin argumentos la ignoran) */
  var sp=line.indexOf(" ");
  var name=sp<0?line:line.substring(0,sp);
  var rest=sp<0?"":line.substring(sp+1).trim();
  if(Object.prototype.hasOwnProperty.call(CMD,name)) try{ CMD[name](rest); }catch(e){ CMD.unknown(name); }
  else CMD.unknown(name);
  save();
}

var _cmdEl=document.getElementById("cmd");
if(_cmdEl) _cmdEl.addEventListener("keydown", function(e){
  if(e.key==="Enter"){
    var raw=this.value; this.value="";
    executeCommand(raw);
    cmdHistory.push(raw);
    if(cmdHistory.length>CMD_HISTORY_MAX) cmdHistory.shift();
    cmdHistIdx = cmdHistory.length;
  } else if(e.key==="ArrowUp"){
    if(cmdHistory.length){
      cmdHistIdx--; if(cmdHistIdx<0) cmdHistIdx=0;
      this.value = cmdHistory[cmdHistIdx] || "";
      e.preventDefault();
    }
  } else if(e.key==="ArrowDown"){
    if(cmdHistory.length){
      cmdHistIdx++; if(cmdHistIdx>=cmdHistory.length) cmdHistIdx=cmdHistory.length;
      this.value = cmdHistIdx>=cmdHistory.length ? "" : (cmdHistory[cmdHistIdx] || "");
      e.preventDefault();
    }
  }
});
var _cmdEnterEl=document.getElementById("cmd-enter");
if(_cmdEnterEl) _cmdEnterEl.addEventListener("click", function(){
  var ce=document.getElementById("cmd");
  var raw=ce?ce.value:""; if(ce) ce.value=""; executeCommand(raw);
  cmdHistory.push(raw);
  if(cmdHistory.length>CMD_HISTORY_MAX) cmdHistory.shift();
  cmdHistIdx = cmdHistory.length;
});


/* ============================================================
   16. FLATLINE / GAME OVER
   ============================================================ */

/* Desechar solo runtime; no completar enemigos ni heredar un grid anterior. */
function clearSessionRuntime(){
  cancelActiveCombat();
  stopGridRender(); inImmersion=null;
  clearInterval(loopId); loopId=null;
  closeOverlay();
  var tree=document.getElementById("skilltree-overlay");
  if(tree){ tree.classList.remove("show"); tree.classList.add("hidden"); }
  ACTIONS.closeSkillTree=null;
  clearTimeout(_bannerTimer); _bannerTimer=null; _bannerQueue=[];
  var banner=document.getElementById("banner"); if(banner) banner.classList.remove("show");
}

function flatline(){
  /* Guardar el último checkpoint ANTES de persistir la muerte. El autosave de
     FLATLINE nunca puede sustituir esta copia (vive dentro de S). */
  if(S.difficulty!=="hardcore"){
    var checkpoint=load();
    if(checkpoint && checkpoint._reconnectCheckpoint) checkpoint=checkpoint._reconnectCheckpoint;
    if(!checkpoint || !checkpoint.player || checkpoint.player.cpu<=0 || checkpoint.difficulty!==S.difficulty){
      /* localStorage bloqueado: conservar el progreso de la sesión en memoria. */
      checkpoint=JSON.parse(JSON.stringify(S));
      checkpoint.player.cpu=1;
    }
    delete checkpoint._reconnectCheckpoint;
    S._reconnectCheckpoint=checkpoint;
  } else delete S._reconnectCheckpoint;
  var p=S.player; p.cpu=0;
  clearSessionRuntime();
  sound.flatline();
  startAmbient("flatline");
  stopMusic();
  addLog("# FLATLINE · desincronización neural.");
  save();
  showFlatline();
}

function showFlatline(){
  var el=document.getElementById("flatline");
  if(!el) return;
  el.classList.add("show");
  var isHardcore=S && S.difficulty==="hardcore";
  el.innerHTML=
    '<p>desincronización neural…</p>'+
    '<p>pérdida de señal.</p>'+
    '<div class="big">F L A T L I N E D</div>'+
    '<p>CPU: '+Math.round(S.player.cpu)+' · Nivel '+S.player.level+
      ' · profundidad máx: capa '+(S.player.stats.maxDepth)+
      ' · inmersiones: '+S.player.stats.immerse+'</p>'+
    (isHardcore?'<p class="rojo">MODO HARDCORE: sin reconexión.</p>':'')+
    '<div class="actions flatline-actions">'+
    (isHardcore?'':'<button class="btn magenta" data-action="reconnect">RECONEXIÓN</button>')+
    '<button class="btn" data-action="newRecord">NUEVO REGISTRO</button>'+
    '</div>'+
    '<p class="muted flatline-hint">'+(isHardcore?'HARDCORE: debes empezar una nueva partida.':'RECONEXIÓN: recuperas la última partida, pierdes los datos de esta inmersión, CPU ~50%, calor reducido.')+'</p>';
  syncGameInputLock();
}

ACTIONS.reconnect = function(){
  /* La guardia también impide invocar el handler a mano en HARDCORE o en vida. */
  if(!S || !S.player || S.player.cpu>0 || S.difficulty==="hardcore") return;
  var checkpoint=S._reconnectCheckpoint;
  if(!checkpoint || !checkpoint.player || checkpoint.difficulty!==S.difficulty){
    /* Guardados FLATLINE antiguos: no hay copia previa, recuperar lo posible. */
    checkpoint=JSON.parse(JSON.stringify(S));
  } else checkpoint=JSON.parse(JSON.stringify(checkpoint));
  delete checkpoint._reconnectCheckpoint;
  var lostImmersion=checkpoint._inImmersion;
  clearSessionRuntime();
  S=checkpoint;
  ensureStateIntegrity();
  S._inImmersion=null;
  if(S.history.endlessActive) S.history.endlessActive=false;
  /* Si la inmersión perdida era la misión final, volver a dejarla pendiente. */
  if(!S.history.finalDone && lostImmersion && lostImmersion.grid && Array.isArray(lostImmersion.grid.nodes) &&
     lostImmersion.grid.nodes.some(function(n){ return n.boss; })) S.nextDepth=5;
  S.player.cpu=Math.round(S.player.maxCpu*0.5);
  S.player.heat=Math.round(clamp(S.player.heat*0.4,0,100));
  var failed=0;
  for(var i=0;i<S.jobs.length;i++){
    if(!S.jobs[i].done){ S.jobs[i].done=true; S.jobs[i].failed=true; failed++; }
  }
  S.player.stats.jobsFailed=(S.player.stats.jobsFailed||0)+failed;
  addLog("RECONEXIÓN ▸ inmersión cancelada, datos perdidos y "+failed+" contrato(s) fracasado(s).");
  var el=document.getElementById("flatline"); if(el) el.classList.remove("show");
  closeOverlay();
  save(); updateBest(); startClock();
  showView("inicio"); syncGameInputLock();
  msg("reconectado. sigues en el cable, corvo. pero más débil.","ambar");
};

ACTIONS.newRecord = function(){
  if(!S || combatActive) return;
  /* diálogo del juego, nunca el confirm nativo del navegador (ver confirmModal) */
  confirmModal({
    title: "⚠ NUEVO REGISTRO",
    body: "¿Nuevo registro? Se borrará <b>TODO</b> el progreso actual."+
      "<br><br>Si quieres conservar tu partida, cancela y exporta primero desde el menú lateral (EXPORTAR).",
    yes: "NUEVO REGISTRO",
    no: "CANCELAR",
    danger: true,
    onYes: function(){
      if(combatActive) return;
      var el=document.getElementById("flatline"); if(el) el.classList.remove("show");
      updateBest();
      var prevBest=S.best||{};
      clearSessionRuntime();
      S=nuevoEstado(); S.best=prevBest;
      ensureStateIntegrity(); generateOffers();
      addLog("NUEVO REGISTRO ▸ progreso reiniciado.");
      save();
      startClock(); showView("inicio"); syncGameInputLock();
      msg("nuevo registro iniciado. la calle te ve de nuevo desde cero.","cyan");
      updateTopbar();
    }
  });
};

ACTIONS.acceptNucleo = function(){
  if(!livingInteraction() || S.history.finalDone || S.player.level<5 || S.player.rep.night0X<3) return;
  S.history.finalUnlocked=true; S.nextDepth=5;
  addLog("NIGHT-0X ▸ misión EL NÚCLEO asignada. Profundidad 5.");
  msg("NIGHT-0X: baja a la capa 5 y apaga el ojo de su autor. ¿Listo?","magenta");
  save(); showView("contactos");
};


/* ============================================================
   17. BOTONES GLOBALES + BUCLE DE JUEGO
   ============================================================ */

var _btnSave=document.getElementById("btn-save");
if(_btnSave) _btnSave.addEventListener("click", function(){
  save(); msg("partida guardada a mano. ✓","verde"); sound.buy();
});
/* ---- EXPORTAR / IMPORTAR PARTIDA ---- */
var _btnExport=document.getElementById("btn-export");
if(_btnExport) _btnExport.addEventListener("click", function(){
  try {
    /* Reflejar el punto exacto de inmersión en el archivo, no la copia del
       último autosave (que podría ser anterior al último movimiento). */
    S._inImmersion=inImmersion ? JSON.parse(JSON.stringify(inImmersion)) : null;
    var data = JSON.stringify(S);
    var blob = new Blob([data], {type:"application/json"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "cypher_os_save.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    msg("partida exportada. archivo descargado.","verde");
    sound.buy();
  } catch(e){ msg("error al exportar: "+e.message,"rojo"); }
});
/* Validar ANTES de asignar S: ensureStateIntegrity migra campos opcionales de
   guardados antiguos, pero no corrige tipos incompatibles ni un player escalar. */
function importObject(v){ return !!v && typeof v==="object" && !Array.isArray(v); }
function importNumber(v){ return typeof v==="number" && isFinite(v); }
function importNatural(v){ return importNumber(v) && v>=0 && Math.floor(v)===v; }
function validImportJob(j,active){
  var types=["recoleta","carrera","rompehielas","vault","daemon"];
  if(!importObject(j) || typeof j.id!=="string" || !j.id || typeof j.title!=="string" ||
     typeof j.desc!=="string" || types.indexOf(j.type)<0 || typeof j.contact!=="string" ||
     !importNatural(j.n) || j.n<1 || !importNumber(j.reward) || j.reward<0 ||
     !importNumber(j.xp) || j.xp<0) return false;
  if(j.type==="vault" && (!importNatural(j.targetDepth) || j.targetDepth<2 || j.targetDepth>4 || typeof j.project!=="string")) return false;
  if(!active) return true;
  if(!importObject(j.prog) || typeof j.done!=="boolean" || (j.failed!=null && typeof j.failed!=="boolean")) return false;
  switch(j.type){
    case "recoleta": return importNatural(j.prog.gathered);
    case "carrera": return importNatural(j.prog.deepGathered);
    case "rompehielas": return importNatural(j.prog.iceT2);
    case "daemon": return importNatural(j.prog.daemons);
    case "vault": return typeof j.prog.vaulted==="boolean";
    default: return false;
  }
}
/* El catálogo nodes es canónico; byLayer conserva pertenencia y orden, no una
   segunda copia mutable de recompensas. Rechazar incoherencias antes de importar. */
function validImportImmersion(inm,ram){
  if(!importObject(inm) || !importObject(inm.grid)) return false;
  var g=inm.grid, byId=Object.create(null), layered=Object.create(null), i, l, n, key;
  if(!Array.isArray(g.nodes) || !g.nodes.length || !importObject(g.adj) || !Array.isArray(g.byLayer) ||
     !importNatural(g.maxDepth) || g.maxDepth<1 || g.byLayer.length!==g.maxDepth+1 ||
     !importNatural(inm.depth) || inm.depth!==g.maxDepth ||
     typeof g.entry!=="string" || typeof inm.current!=="string" ||
     !importNatural(inm.dataUsed) || !Array.isArray(inm.data) || inm.dataUsed!==inm.data.length || inm.dataUsed>ram ||
     !importNatural(inm.moves) || !importNatural(inm.maxDepthReached) || inm.maxDepthReached>inm.depth ||
     (inm.combatOccurred!=null && typeof inm.combatOccurred!=="boolean") ||
     (inm.enemiesDefeated!=null && !importNatural(inm.enemiesDefeated))) return false;
  var flags=["done","_done","_used","_revealed","boss","isEcho","isVault"];
  for(i=0;i<g.nodes.length;i++){
    n=g.nodes[i];
    if(!importObject(n) || typeof n.id!=="string" || !n.id || byId[n.id] ||
       !importNumber(n.x) || !importNumber(n.y) || !importNatural(n.layer) || n.layer>g.maxDepth ||
       typeof n.type!=="string" || !Object.prototype.hasOwnProperty.call(SIM,n.type) ||
       (n.data!=null && (!importNumber(n.data) || n.data<0)) ||
       (n.tier!=null && (!importNatural(n.tier) || n.tier>4)) ||
       (n._hiddenMoves!=null && !importNatural(n._hiddenMoves))) return false;
    if(n.type==="data" && !importNumber(n.data)) return false;
    if(n.type==="ice" && [1,2,3].indexOf(n.tier)<0) return false;
    if((n.type==="daemon" || n.type==="vault") && n.tier!==3) return false;
    if(n.type==="nucleo" && n.tier!==4) return false;
    for(var f=0;f<flags.length;f++) if(n[flags[f]]!=null && typeof n[flags[f]]!=="boolean") return false;
    if((n.name!=null && typeof n.name!=="string") || (n.tierName!=null && typeof n.tierName!=="string") ||
       (n.proj!=null && typeof n.proj!=="string")) return false;
    byId[n.id]=n;
  }
  if(!byId[g.entry] || !byId[inm.current] || inm.maxDepthReached<byId[inm.current].layer) return false;
  for(l=0;l<g.byLayer.length;l++){
    if(!Array.isArray(g.byLayer[l]) || !g.byLayer[l].length) return false;
    for(i=0;i<g.byLayer[l].length;i++){
      n=g.byLayer[l][i];
      if(!importObject(n) || typeof n.id!=="string" || !byId[n.id] || layered[n.id] || byId[n.id].layer!==l || n.layer!==l) return false;
      layered[n.id]=true;
    }
  }
  for(i=0;i<g.nodes.length;i++){
    n=g.nodes[i];
    if(!layered[n.id] || !Array.isArray(g.adj[n.id])) return false;
  }
  for(key in g.adj){
    if(!Object.prototype.hasOwnProperty.call(g.adj,key)) continue;
    if(!byId[key] || !Array.isArray(g.adj[key])) return false;
    var seen=Object.create(null), links=g.adj[key];
    for(i=0;i<links.length;i++){
      var id=links[i];
      if(typeof id!=="string" || !byId[id] || id===key || seen[id] || g.adj[id].indexOf(key)<0) return false;
      seen[id]=true;
    }
  }
  var reached=Object.create(null), queue=[g.entry]; reached[g.entry]=true;
  for(var q=0;q<queue.length;q++){
    var neighbors=g.adj[queue[q]];
    for(i=0;i<neighbors.length;i++) if(!reached[neighbors[i]]){ reached[neighbors[i]]=true; queue.push(neighbors[i]); }
  }
  if(queue.length!==g.nodes.length) return false;
  for(i=0;i<inm.data.length;i++){
    n=inm.data[i]; if(!importObject(n) || !importNumber(n.value) || n.value<0) return false;
  }
  return true;
}
/* Validar los campos conocidos desde su esquema de tipos, no desde una lista
   parcial de contadores. Los ausentes/null siguen admitiendo migración legacy. */
function importTypedFields(value, defaults){
  if(!importObject(value)) return false;
  for(var key in defaults){
    if(!Object.prototype.hasOwnProperty.call(defaults,key) || value[key]==null) continue;
    var expected=defaults[key];
    if(typeof expected==="number"){
      if(!importNumber(value[key])) return false;
    } else if(typeof expected==="boolean"){
      if(typeof value[key]!=="boolean") return false;
    } else if(importObject(expected)){
      if(!importTypedFields(value[key],expected)) return false;
    }
  }
  return true;
}
function validImportState(o){
  if(!importObject(o) || !importObject(o.player)) return false;
  var p=o.player, i, key, j;
  var nums=["cpu","maxCpu","heat","credits","level","xp","skillPoints",
    "hack","sigilo","nervios","ramUp","fwUp","linkUp","breakerUp","decoys","virus"];
  for(i=0;i<nums.length;i++) if(!importNumber(p[nums[i]])) return false;
  if(p.maxCpu<=0 || p.level<1) return false;
  if(p._unlockedSkills!=null && (!Array.isArray(p._unlockedSkills) ||
     p._unlockedSkills.some(function(id){ return typeof id!=="string"; }))) return false;
  if(p.rep!=null && !importObject(p.rep)) return false;
  if(p.rep){
    var reps=["mamaWire","doctorSudario","night0X","kairos"];
    for(i=0;i<reps.length;i++) if(p.rep[reps[i]]!=null && !importNumber(p.rep[reps[i]])) return false;
  }
  if(p.stats!=null && !importObject(p.stats)) return false;
  if(p.stats){
    if(!importTypedFields(p.stats,defaultStats())) return false;
    if(p.stats.iceByTier!=null){
      if(!importObject(p.stats.iceByTier)) return false;
      for(key in p.stats.iceByTier){
        if(Object.prototype.hasOwnProperty.call(p.stats.iceByTier,key) && !importNumber(p.stats.iceByTier[key])) return false;
      }
    }
  }
  var lists=["jobs","offers","intel","achievements","mensajes","log","_seenTransmissions"];
  for(i=0;i<lists.length;i++){
    key=lists[i]; if(o[key]!=null && !Array.isArray(o[key])) return false;
  }
  if(o.jobs){
    var activeJobs=0, activeVaults=0, ids=Object.create(null);
    for(i=0;i<o.jobs.length;i++){
      j=o.jobs[i];
      if(!validImportJob(j,true) || ids[j.id]) return false;
      ids[j.id]=true;
      if(!j.done){
        activeJobs++;
        if(j.type==="vault") activeVaults++;
        var caps={recoleta:6,carrera:4,rompehielas:4,daemon:3,vault:1};
        if(o._jobQuotaVersion===1 && j.n>caps[j.type]) return false;
      }
    }
    if(activeJobs>3 || activeVaults>1) return false;
  }
  if(o.offers){
    for(i=0;i<o.offers.length;i++) if(!validImportJob(o.offers[i],false)) return false;
  }
  if(o.log){
    for(i=0;i<o.log.length;i++){
      j=o.log[i]; if(!importObject(j) || typeof j.text!=="string" || typeof j.t!=="string") return false;
    }
  }
  if(o.mensajes){
    for(i=0;i<o.mensajes.length;i++){
      j=o.mensajes[i]; if(!importObject(j) || typeof j.id!=="string") return false;
    }
  }
  var stringLists=["intel","achievements"];
  for(i=0;i<stringLists.length;i++){
    var list=o[stringLists[i]];
    if(list && list.some(function(v){ return typeof v!=="string"; })) return false;
  }
  if(o._seenTransmissions && o._seenTransmissions.some(function(v){
    return !importNumber(v) || v<0 || Math.floor(v)!==v;
  })) return false;
  if(o.history!=null && !importTypedFields(o.history,{finalUnlocked:false,finalDone:false})) return false;
  if(o.best!=null){
    /* También comprobar los antiguos contadores de best: ensureStateIntegrity
       puede migrarlos a stats, y no debe introducir ahí valores malformados. */
    var bestTypes={immerse:0,ice:0,daemons:0,credits:0,depth:0,level:0,endlessMaxDepth:0,
      maxHeat:0,ghostRuns:0,cleanSrf:0,substationsUsed:0,totalSpent:0,
      finalDone:false,speedrun:false};
    if(!importTypedFields(o.best,bestTypes)) return false;
  }
  if(!importTypedFields(o,{snd:true,amb:false,mus:true})) return false;
  if(o._seenPanels!=null && !importObject(o._seenPanels)) return false;
  if(o._activityCooldowns!=null){
    if(!importObject(o._activityCooldowns)) return false;
    for(key in o._activityCooldowns){
      if(Object.prototype.hasOwnProperty.call(o._activityCooldowns,key) && !importNumber(o._activityCooldowns[key])) return false;
    }
  }
  if(o.clock!=null && !importNumber(o.clock)) return false;
  if(o.difficulty!=null && ["normal","hardcore","legendario"].indexOf(o.difficulty)<0) return false;
  if(o._jobQuotaVersion!=null && (!importNatural(o._jobQuotaVersion) || o._jobQuotaVersion>1)) return false;
  if(!importNatural(p.ramUp)) return false;
  if(o._inImmersion!=null && !validImportImmersion(o._inImmersion,6+p.ramUp*4)) return false;
  if(o._reconnectCheckpoint!=null){
    if(!importObject(o._reconnectCheckpoint) || o._reconnectCheckpoint._reconnectCheckpoint!=null ||
       !validImportState(o._reconnectCheckpoint)) return false;
  }
  return true;
}
function importGameState(imported){
  /* También se comprueba al resolver FileReader: pudo empezar antes del combate. */
  if(combatActive || confirmOpen()){
    msg("termina el combate o cierra la confirmación antes de importar.","ambar"); return false;
  }
  if(!validImportState(imported)){
    msg("archivo inválido: datos de partida incompletos o dañados.","rojo"); sound.error(); return false;
  }
  var previousS=S, previousImmersion=inImmersion, previousView=currentView;
  var viewChanged=false;
  try{
    /* Migración sobre el candidato aislado: ante cualquier excepción, volver al
       estado anterior sin guardar progreso local en el archivo importado. */
    S=JSON.parse(JSON.stringify(imported));
    ensureStateIntegrity();
    clearSessionRuntime();
    inImmersion=S.player.cpu<=0 ? null : restoreImmersion(S._inImmersion || null);
    if(S.player.cpu>0) migrateJobQuotas();
    if(S.player.cpu<=0){
      clearInterval(loopId);
      viewChanged=true; showView("inicio");
      stopMusic(); startAmbient("flatline"); showFlatline();
    } else {
      var flat=document.getElementById("flatline"); if(flat) flat.classList.remove("show");
      viewChanged=true; showView(inImmersion ? "red" : "inicio"); startClock();
    }
    checkAchievements();
    syncGameInputLock(); save(true);
    msg("partida importada. corvo-7 de vuelta en "+(inImmersion?"el grid":"la calle")+".","verde");
    sound.success();
    return true;
  }catch(err){
    S=previousS; inImmersion=previousImmersion;
    if(viewChanged && previousS){
      /* showView guarda al marcar el panel visto: si falló a mitad, deshacer
         también esa escritura y recuperar el panel de la partida anterior. */
      try{
        var oldFlat=document.getElementById("flatline");
        if(oldFlat) oldFlat.classList.remove("show");
        showView(previousView || "inicio");
        if(previousS.player.cpu<=0){
          clearInterval(loopId); stopMusic(); startAmbient("flatline"); showFlatline();
        } else startClock();
      }catch(restoreErr){ currentView=previousView; }
      save();
    }
    syncGameInputLock();
    msg("error al importar: "+err.message,"rojo"); sound.error();
    return false;
  }
}
var _btnImport=document.getElementById("btn-import");
if(_btnImport) _btnImport.addEventListener("click", function(){
  if(!livingInteraction()) return;
  var f=document.getElementById("import-file");
  if(f) f.click();
});
var _importFile=document.getElementById("import-file");
if(_importFile) _importFile.addEventListener("change", function(e){
  var file=e.target.files[0]; if(!file) return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try {
      importGameState(JSON.parse(ev.target.result));
    } catch(err){ msg("error al leer archivo: "+err.message,"rojo"); sound.error(); }
  };
  reader.readAsText(file);
  this.value="";
});
var _btnReset=document.getElementById("btn-reset");
if(_btnReset) _btnReset.addEventListener("click", function(){
  if(!livingInteraction()) return;
  /* diálogo del juego, nunca el confirm nativo del navegador (ver confirmModal) */
  confirmModal({
    title: "⚠ RESET",
    body: "¿Reiniciar <b>TODO</b> el progreso (incluida la partida actual)?"+
      "<br><br>Si quieres conservar tu partida, cancela y exporta primero desde el menú lateral (EXPORTAR).",
    yes: "REINICIAR",
    no: "CANCELAR",
    danger: true,
    onYes: function(){
      if(!livingInteraction()) return;
      updateBest();
      var prevBest=(S&&S.best)||{};
      clearSessionRuntime();
      S=nuevoEstado(); S.best=prevBest;
      ensureStateIntegrity(); generateOffers();
      addLog("RESET ▸ partida nueva desde cero.");
      save(); startClock();
      showView("inicio"); syncGameInputLock();
      msg("partida nueva. de nuevo en la calle, corvo.","cyan");
      updateTopbar();
    }
  });
});
var _hSnd=document.getElementById("h-snd");
if(_hSnd) _hSnd.addEventListener("click", toggleSound);
var _hAmb=document.getElementById("h-amb");
if(_hAmb) _hAmb.addEventListener("click", toggleAmbient);
var _hMus=document.getElementById("h-mus");
if(_hMus) _hMus.addEventListener("click", toggleMusic);
/* clic en el valor LUM = volver a la calibración de fábrica */
var _hBrillo=document.getElementById("h-brillo-wrap");
if(_hBrillo) _hBrillo.addEventListener("click", function(){
  setBrillo(1); msg("brillo de pantalla a la calibración de fábrica (100%).","cyan");
});
document.querySelectorAll(".navbtn[data-view]").forEach(function(b){
  b.addEventListener("click", function(){
    if(!livingInteraction()) return;
    initAudio(); resumeAudio();
    showView(b.getAttribute("data-view"));
  });
});

/* ---- efecto cyberpunk al clicar cualquier botón ---- */
document.addEventListener("pointerdown", function(e){
  var btn = e.target.closest("button");
  if(!btn || btn.disabled) return;
  /* elegir variante según el tipo de botón */
  var cls;
  if(btn.classList.contains("magenta")) cls="cyber-click-magenta";
  else if(btn.classList.contains("cyan")) cls="cyber-click-cyan";
  else if(btn.classList.contains("ambar")) cls="cyber-click-amber";
  else cls="cyber-click";
  /* quitar todas las variantes posibles y forzar reflow */
  btn.classList.remove("cyber-click","cyber-click-cyan","cyber-click-magenta","cyber-click-amber","cyber-out");
  void btn.offsetWidth;
  /* añadir la clase — mousedown para que se vea ANTES de cualquier cambio de vista */
  btn.classList.add(cls);
  /* transición de salida y limpieza */
  setTimeout(function(){
    btn.classList.add("cyber-out");
    btn.classList.remove(cls);
  },120);
  setTimeout(function(){ btn.classList.remove("cyber-out"); },450);
});

var loopId=null;
var _gameLoopTick=0;
function gameLoop(){
  if(!S || !S.player || S.player.cpu<=0) return;
  S.clock=(S.clock+1)%1440;
  S.player.stats.totalPlayTime=(S.player.stats.totalPlayTime||0)+1;
  var heatDecay=S.difficulty==="hardcore"?1/28:1/20;
  if(S.player.heat>0) S.player.heat=Math.max(0,S.player.heat-heatDecay);
  /* tracking de calor máximo para logros/intel (todas las fuentes de calor) */
  if(S.player.heat>(S.player.stats.maxHeat||0)) S.player.stats.maxHeat=S.player.heat;
  updateTopbar();
  updateAmbientStress();
  updateMusic(); /* escenas que dependen del tiempo (calor del grid) */
  /* canal 7: la canción congelada de 2087 suena de vez en cuando en la calle */
  _canal7Cd--;
  if(_canal7Cd<=0){
    if(!inImmersion && !combatActive && !modalOpen() && S.mus!==false) playCanal7();
    _canal7Cd=randInt(45,80);
  }
  var clk=document.getElementById("h-clock"); if(clk) clk.textContent=timeStr(S.clock);
  /* bandeja del deck: triggers de cartas (auto-limitado en checkMensajes) */
  checkMensajes();
  /* guardar cada 10 segundos, no cada segundo */
  _gameLoopTick++;
  if(_gameLoopTick>=10){ _gameLoopTick=0; save(); }
}

function startClock(){ clearInterval(loopId); loopId=setInterval(gameLoop,1000); }

/* canal 7: la canción que no termina de sonar desde 2087 (LORE §6).
   Guiño diegético procedural: sin archivos, vive en el canal MUS. */
var _canal7Cd=20;
var _canal7Notes=[220,261.63,329.63,293.66,261.63,220,196,174.61];
function playCanal7(){
  if(!AC || S.mus===false) return;
  try{
    resumeAudio();
    var t0=AC.currentTime+0.05, i, echo;
    for(echo=0;echo<2;echo++){
      for(i=0;i<_canal7Notes.length;i++){
        var o=AC.createOscillator(), g=AC.createGain();
        o.type="triangle";
        o.frequency.value=_canal7Notes[i]*(echo?0.5:1);
        var tt=t0+echo*0.45+i*0.38;
        g.gain.setValueAtTime(0.0001,tt);
        g.gain.exponentialRampToValueAtTime(echo?0.010:0.022,tt+0.03);
        g.gain.exponentialRampToValueAtTime(0.0001,tt+0.36);
        o.connect(g); g.connect(AC.destination);
        o.start(tt); o.stop(tt+0.4);
      }
    }
  }catch(e){}
}

/* glitch visual aleatorio: 1 cada 30-60s, solo si el canal FX está ON */
var _glitchId=null;
function startGlitchLoop(){
  clearTimeout(_glitchId);
  function scheduleGlitch(){
    _glitchId=setTimeout(function(){
      if(!S || !S.snd){ scheduleGlitch(); return; }
      document.body.classList.add("glitch-random");
      setTimeout(function(){ document.body.classList.remove("glitch-random"); },200);
      scheduleGlitch();
    }, randInt(30000,60000));
  }
  scheduleGlitch();
}

/* ---- ARRANQUE GENERAL ---- */
function afterBoot(){
  msgEl = document.getElementById("msg");
  var saved = load();
  if(saved){
    S=saved;
    if(!S.history) S.history={finalUnlocked:false,finalDone:false};
  } else {
    S=nuevoEstado();
  }
  ensureStateIntegrity();
  if(saved) addLog("partida restaurada desde el cable.");
  else {
    generateOffers(); addLog("registro nuevo · corvo-7 en la calle.");
    if(_invalidSaveRecovered) addLog("GUARDADO ▸ archivo dañado rechazado. Copia original conservada en el resguardo local cypher_os_save_recovery_v9.");
  }
  /* la dificultad elegida en el intro solo afecta a partidas VIVAS: cambiar
     el radio no puede resucitar un guardado HARDCORE tras una recarga. */
  if(_pendingDifficulty && S.player.cpu>0){
    if(_pendingDifficulty==="legendario" && !finalDoneEver()){
      _pendingDifficulty="normal"; /*legendario solo si ya se derrotó al Núcleo alguna vez*/
    }
    S.difficulty=_pendingDifficulty;
  }
  _pendingDifficulty=null;
  startGlitchLoop(); syncGameInputLock();
  if(S.player.cpu<=0){
    inImmersion=null; /* no reanudar un grid tras FLATLINE */
    save(); updateNotifications(); showView("inicio");
    stopMusic(); startAmbient("flatline"); showFlatline();
    updateLegendaryOption(); initDifficultySelect();
    return;
  }
  if(S._inImmersion && S._inImmersion.grid && S._inImmersion.grid.nodes){
    inImmersion = restoreImmersion(S._inImmersion);
    addLog("DIP ▸ inmersión restaurada (capa "+inImmersion.depth+").");
  }
  migrateJobQuotas();
  checkAchievements();
  save(); updateBest();
  startClock();
  checkUnlocks();
  checkMensajes();
  updateNotifications();
  showView(inImmersion ? "red" : "inicio");
  var c=document.getElementById("cmd"); if(c) c.focus();
  startTutorial();
  /* refrescar opciones del intro para la próxima carga */
  updateLegendaryOption();
  initDifficultySelect();
}

/* true si el Núcleo se ha derrotado alguna vez (S.best.finalDone sobrevive a NUEVO REGISTRO) */
function finalDoneEver(){
  var s = S || load();
  return !!(s && ((s.history && s.history.finalDone) || (s.best && s.best.finalDone)));
}

/* muestra la opción LEGENDARIO en el intro si el Núcleo ya fue derrotado */
function updateLegendaryOption(){
  var el=document.getElementById("legendary-opt");
  if(el) el.style.display = finalDoneEver() ? "inline" : "none";
}

/* preselecciona en el intro la dificultad del guardado (la selección siempre se aplica) */
function initDifficultySelect(){
  var s = S || load();
  var d = (s && s.difficulty) || "normal";
  var radios=document.querySelectorAll('input[name="diff"]');
  for(var i=0;i<radios.length;i++){
    radios[i].checked = (radios[i].value===d);
  }
}

var _bootStarted=false;
var _pendingDifficulty=null;
function beginIntro(){
  if(_bootStarted) return;
  _bootStarted=true;
  /* si la última sesión quedó en pantalla completa, volver a entrar AHORA:
     el clic de ▶ COMENZAR es el gesto de usuario que exige el navegador
     (sin gesto, requestFullscreen se deniega) */
  if(_fsWants && !fsActive() && fsSupported()) enterFs();
  /* leer dificultad seleccionada (S aún es null aquí; se aplica en afterBoot) */
  var diffEl=document.querySelector('input[name="diff"]:checked');
  _pendingDifficulty = diffEl ? diffEl.value : "normal";
  var startEl=document.getElementById("intro-start");
  if(startEl) startEl.removeEventListener("click", beginIntro);
  /* flash visual en la intro antes de pasar al boot. El boot (fondo opaco
     #010605, aún sin líneas) se muestra ANTES del fade: si no, al bajar la
     opacidad de la intro se veía la UI del juego por debajo durante esos ms */
  var introEl=document.getElementById("intro");
  var bootBg=document.getElementById("boot");
  if(bootBg){ bootBg.style.display="flex"; bootBg.style.opacity="1"; }
  if(introEl){
    introEl.style.transition="opacity .15s";
    introEl.style.opacity="0";
    sound.bootStart();
    setTimeout(function(){
      introEl.style.display="none";
      introEl.style.opacity="1";
      introEl.style.transition="";
      runBoot(afterBoot);
    },180);
  } else {
    runBoot(afterBoot);
  }
}

window.addEventListener("pointerdown", function first(){ initAudio(); resumeAudio(); }, {once:true});


/* ============================================================
   6b. ATAJOS DE TECLADO GLOBALES
   ============================================================ */

var VIEW_ORDER=["inicio","red","contactos","mensajes","trabajos","tienda","estado","informes","registro","logros","ayuda"];
document.addEventListener("keydown", function(e){
  /* Ctrl+S → guardar partida: capturado SIEMPRE, en cualquier contexto
     (combate, terminal, modales). Si no, el navegador roba la tecla y
     abre su diálogo "guardar página". */
  if(e.ctrlKey && !e.altKey && e.key.toLowerCase()==="s"){
    e.preventDefault();
    if(S){ save(true); msg("partida guardada. ✓","verde"); }
    return;
  }
  /* el resto de atajos Ctrl del juego se CONSUMEN siempre (Ctrl+G =
     buscar del navegador, Ctrl+1..9 = cambiar de pestaña, Ctrl+K =
     buscador), aunque su acción siga bloqueada en sus contextos */
  if(e.ctrlKey && !e.altKey){
    var ck=e.key.toLowerCase();
    if(ck==="k"||ck==="g"||(e.key>="1"&&e.key<="9")) e.preventDefault();
  }
  if(e.key==="Escape" && confirmOpen()){ resolveConfirm(false); e.preventDefault(); return; }
  if(combatActive) return;
  /* si el foco está en un input/textarea, no ejecutar atajos (excepto Ctrl+K y Escape) */
  var el=document.activeElement;
  var inInput=el && (el.tagName==="INPUT" || el.tagName==="TEXTAREA");
  /* Ctrl+K se consume siempre, pero no enfoca controles detrás de overlays. */
  if(e.ctrlKey && e.key.toLowerCase()==="k"){
    e.preventDefault();
    if(!livingInteraction() || modalOpen()) return;
    var cmd=document.getElementById("cmd"); if(cmd) cmd.focus();
    return;
  }
  /* Escape → cerrar overlay / árbol de habilidades (siempre funciona) */
  if(e.key==="Escape"){
    /* diálogo de confirmación abierto → Escape equivale a CANCELAR */
    if(confirmOpen()){ resolveConfirm(false); e.preventDefault(); return; }
    if(ACTIONS.closeSkillTree){ ACTIONS.closeSkillTree(); e.preventDefault(); return; }
    var ov=document.getElementById("overlay");
    if(ov && ov.classList.contains("show")){ closeOverlay(); e.preventDefault(); }
  }
  /* FLATLINE solo acepta guardar y el diálogo NUEVO REGISTRO; no hay DIP
     secreto por Ctrl+G aunque se cambie el radio de dificultad en el intro. */
  if(S && S.player.cpu<=0) return;
  if(inInput) return;
  /* con un modal abierto no se ejecutan atajos (evita actuar detrás del modal) */
  if(modalOpen()) return;
  /* Ctrl+1 a Ctrl+9 → cambiar vista */
  if(e.ctrlKey && e.key>="1" && e.key<="9"){
    var idx=parseInt(e.key,10)-1;
    if(VIEW_ORDER[idx]){ e.preventDefault(); showView(VIEW_ORDER[idx]); }
  }
  /* Ctrl+G → dip al grid */
  if(e.ctrlKey && e.key.toLowerCase()==="g"){
    e.preventDefault(); ACTIONS.dipGrid();
  }
});

function _initIntroHandlers(){
  if(_introHandlersReady) return;
  _introHandlersReady=true;
  var startEl=document.getElementById("intro-start");
  /* SOLO el botón ▶ COMENZAR inicia la partida (CONTRACTS §1): un clic en
     cualquier otra zona de la intro no debe arrancar el boot */
  if(startEl){ startEl.addEventListener("click", function(){ beginIntro(); }); }
  else { beginIntro(); }
}
var _introHandlersReady=false;
/* registrar handlers inmediatamente — el DOM ya está listo porque los scripts están al final de <body> */
_initIntroHandlers();
/* la opción legendario debe estar visible ANTES de que se pulse COMENZAR */
updateLegendaryOption();
initDifficultySelect();
/* el brillo guardado se aplica desde el primer instante (intro incluida) */
applyBrillo();
/* pantalla completa: indicador inicial; si el navegador no la admite, se
   oculta el botón FULL (nunca controles decorativos) */
if(!fsSupported()){
  var _fsBtn=document.getElementById("h-fs");
  if(_fsBtn) _fsBtn.classList.add("hidden");
}
updateFsIndicator();
/* también como fallback por si el DOM aún no estuviera listo (algunos navegadores) */
if(document.readyState==="loading"){
  window.addEventListener("DOMContentLoaded", _initIntroHandlers);
}

