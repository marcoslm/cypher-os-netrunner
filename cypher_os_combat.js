/* ============================================================
   CYPHER://OS  ·  cypher_os_combat.js — COMBATE Y VAULT
  Combate en cinco modos: claves, rastreo, desvío, memoria y escáner;
  familias visuales y puzzle del vault.
   Orden de carga de los .js (scripts clásicos sin módulos, ámbito global
   compartido; ver AGENTS.md §4):
     1/6 data → 2/6 core → 3/6 audio → 4/6 grid → 5/6 combat → 6/6 ui
   ============================================================ */
'use strict';

/* ============================================================
   8. COMBATE (minijuego de introducción de claves)
   ============================================================ */

var COM=null; var combatTimer=null;

function combatFamily(node){
  return node.boss || node.type==="nucleo" ? "central" : node.scavenger ? "rastreador" : node.type==="daemon" ? "daemon" : node.tier===3 ? "barrera" : node.tier===2 ? "desviador" : "archivador";
}
function combatAvatarHtml(){
  var family=combatFamily(COM.node), damage=Math.round(clamp((COM.phase-1)/COM.phases*100,0,100));
  var shapes={
    archivador:"M24 8H56L64 24V62H50V42H30V62H16V24ZM32 16V28H48V16Z",
    rastreador:"M36 6H44L50 20L70 28L62 42L49 38L56 66H44L40 48L36 66H24L31 38L18 42L10 28L30 20Z",
    barrera:"M22 8H58L70 28L60 66H44V44H36V66H20L10 28ZM30 18V30H50V18Z",
    desviador:"M10 12H30L40 24L50 12H70V30L54 38L64 64H46L40 48L34 64H16L26 38L10 30ZM30 30V38H50V30Z",
    daemon:"M16 8L32 18H48L64 8L60 32L70 48L54 66L40 54L26 66L10 48L20 32ZM30 26V36H50V26Z",
    central:"M28 4H52L58 16H70V52L56 68H46V48H34V68H24L10 52V16H22ZM28 24V34H52V24Z"
  };
  return '<div class="combat-identity" data-family="'+family+'"><svg class="combat-avatar" viewBox="0 0 80 72" aria-hidden="true" focusable="false">'+
    '<defs><clipPath id="combat-silhouette"><path d="'+shapes[family]+'" fill-rule="evenodd"/></clipPath></defs>'+
    '<path class="avatar-shell" d="'+shapes[family]+'" fill-rule="evenodd"/>'+
    '<rect class="avatar-damage" x="0" y="'+(72-damage*0.72)+'" width="80" height="'+(damage*0.72)+'" clip-path="url(#combat-silhouette)"/>'+
    '</svg><span class="avatar-caption">PROGRAMA · DAÑO RECIBIDO <b id="enemyDamage">'+damage+'%</b></span></div>';
}
function combatContext(){
  if(COM.node.scavenger) return "El rastreador persigue esta sesión. El deck ha aislado su canal: localizar la dirección de su rutina activa permitirá interrumpir el seguimiento. No recupera archivos ni paga contratos.";
  if(COM.node.type==="nucleo") return "Esta defensa protege la escritura central. Recuperar y entregar la revocación sigue siendo necesario después.";
  if(inImmersion && COM.node.id==="1_0" && inImmersion.grid.nodes.some(function(node){ return node.storyChapter==="c01"; })) return COM.mode==="ruta" ? "El acceso de huésped al historial está cerrado por un desviador. Reorientar el enlace permite consultar la factura; no modifica ni entrega su contenido." : "El archivador limita el historial con acceso de huésped. El deck obtiene una clave de consulta, pero el canal exige confirmación manual; no puede escribir directamente en él.";
  if(COM.node.type==="daemon") return "El daemon retiene un patrón de acceso. Reconstruirlo libera este nodo, no confirma el contenido de sus archivos.";
  if(COM.node.tier===3) return "La barrera filtra las ventanas del enlace. Intervenir en sus huecos libera el acceso, no verifica los documentos al otro lado.";
  if(COM.node.tier===2) return "El desviador mantiene cerrado un enlace. Reorientar sus conexiones abre el paso sin alterar el documento protegido.";
  return "El archivador solicita una clave de consulta. El deck la obtiene por lectura, pero el canal exige confirmación manual antes de abrir el acceso.";
}

/* Escape funciona también durante la revelación y con foco fuera del input.
   Captura evita que una misma pulsación llegue a otro handler de huida. */
function onCombatKey(e){
  if(e.key!=="Escape" || !combatActive || !COM || !COM.alive) return;
  if(typeof confirmOpen==="function" && confirmOpen()) return;
  e.preventDefault();
  e.stopPropagation();
  if(!e.repeat) doEscape();
}

function clearMemoriaTimers(battle){
  if(!battle || battle.mode!=="memoria") return;
  clearTimeout(battle.memRevealTimer);
  clearTimeout(battle.memFadeTimer);
  battle.memRevealTimer=null; battle.memFadeTimer=null;
}

function startCombat(ctx){
  if(combatActive || !ctx || !ctx.node || ctx.node.done || ctx.node._done) return;
  combatActive=true; resumeAudio();
  if(inImmersion) inImmersion.combatOccurred=true;
  var n=ctx.node, tier=n.tier||1, def=COMBAT_TYPES[tier]||COMBAT_TYPES[1];
  var phases=def.phases;
  var useVirus=S.player.virus>0 && phases>1;
  if(useVirus) phases--;
  /* modo de combate: memoria para daemons, scanner para ICE T3, claves para el resto */
  var mode = n.boss || n.type==="nucleo" ? "claves" : n.scavenger ? "rastreo" : n.type==="daemon" ? "memoria" : (n.type==="ice" && n.tier===3) ? "scanner" : (n.type==="ice" && n.tier===2) ? "ruta" : "claves";
  var phaseTime=2600+tier*700+S.player.hack*500+(S.difficulty==="hardcore"?0:2000);
  /* el escáner exige varios aciertos por fase: margen de tiempo extra */
  if(mode==="scanner") phaseTime=Math.round(phaseTime*1.6);
  if(mode==="ruta") phaseTime=Math.max(18000,phaseTime*3);
  COM = { ctx:ctx, node:n, tier:tier, phases:phases, phase:1,
    length:codeLen(tier), time:phaseTime, remaining:0, code:"", alive:true,
    player:S.player, mode:mode,
    memSequence:"", memPhase:"", stage:"encounter", useVirus:useVirus };
  document.addEventListener("keydown", onCombatKey, true);
  renderCombatEncounter();
  updateAmbient();
  if(typeof syncGameInputLock==="function") syncGameInputLock();
}

/* Ficha permanente: no genera retos ni consume recursos hasta entrar. */
function renderCombatEncounter(){
  var el=document.getElementById("combat");
  if(!el || !COM) return;
  var n=COM.node, boss=n.boss || n.type==="nucleo";
  var kind=boss ? "NÚCLEO" : n.scavenger ? "RASTREADOR · ICE" : n.type==="daemon" ? "DAEMON" : "ICE";
  var event=boss ? "HAS LLEGADO AL NÚCLEO" : n.scavenger ? "TE HA DETECTADO UN RASTREADOR" : n.type==="daemon" ? "HAS ENTRADO EN UN NODO DAEMON" : "HAS ENTRADO EN UN NODO ICE";
  var mode=COM.mode;
  var label=mode==="memoria" ? "MEMORIA HEX" : mode==="scanner" ? "ESCÁNER" : mode==="rastreo" ? "RASTREO" : mode==="ruta" ? "DESVÍO" : "CLAVES HEX";
  /* Solo recursos disponibles y aplicables; las habilidades no son inventario. */
  var p=S.player, gear=[];
  if(p.decoys>0) gear.push("DECOY ×"+p.decoys);
  if(COM.useVirus) gear.push("VIRUS ×"+p.virus);
  if((mode==="claves" || mode==="rastreo") && p.breakerUp>0 && COM.length<Math.max(3,codeLenBase(COM.tier)-p.hack)) gear.push("ROMPEHIELOS +"+p.breakerUp);
  if(p.fwUp>0) gear.push("FIREWALL +"+(p.fwUp*10));
  el.classList.add("show");
  el.innerHTML='<div class="combat-card encounter-card" role="dialog" aria-modal="true" aria-labelledby="encounter-title" aria-describedby="encounter-detail">'+
    '<div class="combat-sub encounter-event" id="encounter-detail">'+event+'</div>'+
    '<h2 class="combat-title" id="encounter-title">'+escapeHtml(n.name||kind)+'</h2>'+
    combatAvatarHtml()+
    '<dl class="encounter-facts"><div><dt>TIPO</dt><dd>'+kind+' · T'+COM.tier+'</dd></div>'+
    '<div><dt>COMBATE</dt><dd>'+label+'</dd></div></dl>'+
    '<p class="encounter-note">'+combatContext()+'</p>'+
    (gear.length ? '<div class="encounter-gear"><div class="encounter-label">EQUIPO DISPONIBLE</div><ul>'+gear.map(function(item){return '<li>'+item+'</li>';}).join('')+'</ul></div>' : '')+
    (boss ? '<div class="encounter-note ambar">SIN HUIDA</div>' : '')+
    '<div class="encounter-actions"><button class="btn" id="combat-enter">ENTRAR AL COMBATE</button>'+
    (boss ? '' : '<button class="btn ambar" id="escapeBtn" title="Si escapas: calor +5. Si falla: golpe y combate.">HUIR [ESC]</button>')+'</div></div>';
  document.getElementById("combat-enter").addEventListener("click", beginCombat);
  var flee=document.getElementById("escapeBtn");
  if(flee) flee.addEventListener("click",doEscape);
  /* Foco en la ficha, no en un botón: Enter repetido no acepta el encuentro. */
  var card=el.querySelector(".encounter-card");
  if(card){ card.setAttribute("tabindex","-1"); card.focus(); }
}
function beginCombat(){
  if(!COM || !COM.alive || COM.stage!=="encounter") return;
  COM.stage="combat";
  if(COM.useVirus){ S.player.virus--; COM.useVirus=false; addLog("PAQUETE VIRUS ▸ una fase eliminada."); }
  var mode=COM.mode;
  /* sonido de alarma de combate */
  sound.startCombat();
  updateAmbient();
  /* flash rojo sutil en el body */
  var bodyEl = document.body;
  if(bodyEl){ bodyEl.classList.remove("combat-flash"); void bodyEl.offsetWidth; bodyEl.classList.add("combat-flash"); }
  if(mode==="memoria"){
    renderCombatMemoria(); startMemoriaPhase();
  } else if(mode==="scanner"){
    renderCombatScanner(); COM.memPhase="input"; startScannerPhase();
  } else if(mode==="ruta"){
    renderCombatRoute(); startRoutePhase();
  } else {
    renderCombat(); newCode(); combatLoop();
  }
  if(typeof syncGameInputLock==="function") syncGameInputLock();
}
/* Teclado hex virtual compartido: layout estilo calculadora 789 EF / 456 CD / 123 AB + 0 + acciones */
function buildHexKB(delId,enterId){
  function row(keys){
    var s="",i;
    for(i=0;i<keys.length;i++){
      s+='<div class="hex-key" data-hex="'+keys[i]+'">'+keys[i]+'</div>';
    }
    return s;
  }
  return '<div class="hex-kb">'+
    '<div class="hex-kb-row">'+row("789")+'<div class="hex-kb-gap"></div>'+row("EF")+'</div>'+
    '<div class="hex-kb-row">'+row("456")+'<div class="hex-kb-gap"></div>'+row("CD")+'</div>'+
    '<div class="hex-kb-row">'+row("123")+'<div class="hex-kb-gap"></div>'+row("AB")+'</div>'+
    '<div class="hex-kb-row hex-kb-row-a">'+
      row("0")+
      '<div class="hex-key-spacer"></div>'+
      '<div class="hex-kb-gap"></div>'+
      '<div class="hex-key fn-del" id="'+delId+'">BORRAR</div>'+
      '<div class="hex-key fn-enter" id="'+enterId+'">ENVIAR</div>'+
    '</div>'+
  '</div>';
}
function renderCombat(){
  var el=document.getElementById("combat");
  el.classList.add("show");
  /* teclado hex virtual compartido: 789 EF / 456 CD / 123 AB + borrar + enviar */
  var hexKB=buildHexKB("hexDel","hexEnter");
  el.innerHTML =
    '<div class="combat-card'+(COM.mode==="rastreo"?' trace-card trace-reading':'')+'">'+
      '<div class="combat-title" id="ct-title"></div>'+
      '<div class="combat-sub" id="ct-sub">FASE 1/'+COM.phases+'</div>'+
      combatAvatarHtml()+
      '<div class="combat-bars">'+
        '<div class="combat-bar-lbl"><span>TU CPU</span><span id="cpuPct">100%</span></div>'+
        '<div class="bar"><i id="cpuBar" style="width:100%"></i><div class="bar-txt" id="cpuTxt">100/100</div></div>'+
        (COM.mode==="rastreo"?'':'<div class="combat-bar-lbl"><span>ICE</span><span id="icePct">100%</span></div>'+
        '<div class="bar rojo"><i id="iceBar" style="width:100%"></i></div>')+
      '</div>'+
      '<div class="code-box">'+
        '<div class="code-target" id="codeTarget">—</div>'+
        '<input class="code-input" id="codeInput" type="text" inputmode="none" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">'+
      '</div>'+
      hexKB+
      '<div class="combat-log" id="combatLog"></div>'+
      '<div class="timer-lbl" id="timerLbl">T-3.3s</div>'+
      '<div class="timer-bar"><i id="timerBar" style="width:100%"></i></div>'+
      '<div class="combat-help">Usa el teclado hex · ENTER para comprobar · <b>ESC</b> = HUIR</div>'+
      '<div class="center mt-2"><button class="btn ambar small" id="escapeBtn">HUIR [ESC]</button></div>'+
    '</div>';
  var inp=document.getElementById("codeInput");
  inp.focus();
  inp.addEventListener("input", onCodeInput);
  inp.addEventListener("keydown", onCodeKey);
  document.getElementById("escapeBtn").addEventListener("click", doEscape);
  /* bind teclado hex virtual */
  initHexKeyboard();
  document.getElementById("ct-title").textContent="⚠ "+(COM.node.name||"ICE")+" · T"+COM.tier;
  if(COM.mode==="rastreo"){
    var target=document.getElementById("codeTarget");
    target.insertAdjacentHTML("afterend",'<button class="btn small" id="traceReply">CERRAR LECTURA Y RESPONDER</button>');
    var battle=COM, replyButton=document.getElementById("traceReply");
    replyButton.addEventListener("click",function(){ if(COM===battle && replyButton.isConnected) traceReply(); });
    inp.setAttribute("aria-label","Dirección de la rutina rastreadora");
  }
}
/* teclado hex virtual: bind de eventos */
function initHexKeyboard(){
  var keys=document.querySelectorAll(".hex-key[data-hex]");
  for(var i=0;i<keys.length;i++){
    keys[i].addEventListener("click",onHexKeyClick);
  }
  var delBtn=document.getElementById("hexDel");
  var enterBtn=document.getElementById("hexEnter");
  if(delBtn) delBtn.addEventListener("click",onHexDel);
  if(enterBtn) enterBtn.addEventListener("click",onHexEnter);
}
function onHexKeyClick(e){
  if(!COM||!COM.alive || (COM.mode==="rastreo" && COM.traceStage!=="reply")) return;
  var ch=e.currentTarget.getAttribute("data-hex");
  var inp=document.getElementById("codeInput");
  if(!inp) return;
  /* limitar longitud a la de la clave actual */
  if(inp.value.replace(/\s+/g,"").length>=COM.code.length) return;
  inp.value+=ch;
  sound.type();
  /* auto-comprobar si la longitud coincide */
  if(inp.value.replace(/\s+/g,"").toUpperCase()===COM.code){
    inp.value=inp.value.replace(/\s+/g,"").toUpperCase();
    winPhase();
  }
}
function onHexDel(){
  if(!COM||!COM.alive) return;
  var inp=document.getElementById("codeInput");
  if(!inp||inp.value.length===0) return;
  inp.value=inp.value.slice(0,-1);
}
function onHexEnter(){
  if(!COM||!COM.alive || (COM.mode==="rastreo" && COM.traceStage!=="reply")) return;
  var inp=document.getElementById("codeInput");
  if(!inp) return;
  var v=inp.value.replace(/\s+/g,"").toUpperCase();
  if(v===COM.code) winPhase();
  else failCombat();
}
function newCode(){
  var s=""; for(var i=0;i<COM.length;i++) s+=HEX[randInt(0,15)];
  COM.code=s; COM.remaining=COM.time;
  var t=document.getElementById("codeTarget"), inp=document.getElementById("codeInput");
  if(t) t.textContent=s.split("").join(" ");
  if(COM.mode==="rastreo"){
    COM.traceStage="read";
    document.querySelector(".trace-card").classList.add("trace-reading");
    if(t) t.textContent="0x"+s;
    var reply=document.getElementById("traceReply"); if(reply){ reply.hidden=false; reply.focus(); }
  }
  if(inp){ inp.value=""; inp.disabled=COM.mode==="rastreo"; if(!inp.disabled) inp.focus(); }
  updateCombatBars();
}
function traceReply(){
  if(!COM || !COM.alive || COM.mode!=="rastreo" || COM.traceStage!=="read") return;
  COM.traceStage="reply";
  document.querySelector(".trace-card").classList.remove("trace-reading");
  document.getElementById("codeTarget").textContent="DIRECCIÓN · "+COM.code.length+" HEX";
  document.getElementById("traceReply").hidden=true;
  var input=document.getElementById("codeInput"); input.disabled=false; input.focus();
}
function updateCombatBars(){
  var cpuBar=document.getElementById("cpuBar"), cpuTxt=document.getElementById("cpuTxt");
  var cpuPct=document.getElementById("cpuPct");
  if(cpuPct) cpuPct.textContent=Math.round(clamp(COM.player.cpu/COM.player.maxCpu*100,0,100))+"%";
  var iceBar=document.getElementById("iceBar"), icePct=document.getElementById("icePct");
  var timerBar=document.getElementById("timerBar"), timerLbl=document.getElementById("timerLbl");
  if(cpuBar) cpuBar.style.width=clamp(COM.player.cpu/COM.player.maxCpu*100,0,100)+"%";
  if(cpuTxt) cpuTxt.textContent=Math.round(COM.player.cpu)+"/"+COM.player.maxCpu;
  if(iceBar) iceBar.style.width=(COM.phase<=COM.phases?100-(COM.phase-1)*(100/COM.phases):0)+"%";
  if(icePct) icePct.textContent=Math.round((COM.phases-COM.phase+1)/COM.phases*100)+"%";
  var damage=Math.round(clamp((COM.phase-1)/COM.phases*100,0,100));
  var avatar=document.querySelector(".combat-avatar .avatar-damage"), caption=document.getElementById("enemyDamage");
  if(avatar){ avatar.setAttribute("y",72-damage*0.72); avatar.setAttribute("height",damage*0.72); }
  if(caption) caption.textContent=damage+"%";
  if(timerBar) timerBar.style.width=clamp(COM.remaining/COM.time*100,0,100)+"%";
  if(timerLbl) timerLbl.textContent="T-"+(COM.remaining/1000).toFixed(1)+"s";
}
function combatLoop(){
  if(!COM||!COM.alive) return;
  clearInterval(combatTimer);
  var battle=COM, timer=setInterval(function(){
    if(COM!==battle || !battle.alive){ clearInterval(timer); return; }
    COM.remaining-=100;
    if(COM.remaining<=0){ COM.remaining=0; failCombat(); }
    if(COM && COM.alive) updateCombatBars();
  },100);
  combatTimer=timer;
}
function onCodeInput(e){
  if(!COM||!COM.alive || (COM.mode==="rastreo" && COM.traceStage!=="reply")) return;
  /* filtrar caracteres que no sean hex ni espacios */
  var clean=e.target.value.replace(/[^0-9a-fA-F\s]/g,"");
  if(clean!==e.target.value) e.target.value=clean;
  if(e.target.value.replace(/\s+/g,"").toUpperCase()===COM.code) winPhase();
  else sound.type();
}
function onCodeKey(e){
  if(!COM||!COM.alive || (COM.mode==="rastreo" && COM.traceStage!=="reply")) return;
  if(e.key==="Enter"){
    var v=e.target.value.replace(/\s+/g,"").toUpperCase();
    if(v===COM.code){ e.preventDefault(); winPhase(); }
    else { e.preventDefault(); failCombat(); }
  }
}
function winPhase(){
  if(!COM||!COM.alive||COM.stage==="encounter") return;
  sound.success();
  /* trackear daño infligido */
  S.player.stats.totalDamageDealt=(S.player.stats.totalDamageDealt||0)+(COM.tier*8);
  setCombatLog("clave aceptada · "+COM.node.name+" recibe daño.","verde");
  COM.phase++;
  if(COM.phase>COM.phases){ winCombat(); return; }
  updateCombatBars(); newCode();
}
function failCombat(){
  if(!COM||!COM.alive||COM.stage==="encounter") return;
  sound.error();
  /* resetear racha de combates */
  S.player.stats.combatStreak=0;
  var dmg=combatDamage();
  setCombatLog("fallo · recibes "+dmg+" de daño neural.","rojo");
  applyDamageToPlayer(dmg);
  if(!COM||!COM.alive) return;
  updateCombatBars();
  /* en scanner: el timer sigue vivo. si expiró, reiniciar reloj (misma fase)
     para que el intervalo no dispare daño en bucle */
  if(COM.mode==="scanner"){
    if(COM.remaining<=0) COM.remaining=COM.time;
    return;
  }
  /* en memoria: reiniciar fase con nueva secuencia */
  if(COM.mode==="memoria"){ clearInterval(combatTimer); startMemoriaPhase(); return; }
  if(COM.mode==="ruta"){ startRoutePhase(); return; }
  /* en claves: generar nueva clave (resetea timer, comportamiento original) */
  newCode();
}
function combatDamage(){
  var dmg=Math.max(4, Math.round(8+COM.tier*4 - fwVal()*0.3 - S.player.nervios*3));
  if(S && S.difficulty==="hardcore") dmg=Math.round(dmg*1.5);
  return dmg;
}
function applyDamageToPlayer(dmg){
  if(!COM||!COM.alive) return;
  if(S.player.decoys>0){
    S.player.decoys--; sound.buy();
    setCombatLog("DISCO DECOY ▸ el golpe se disolvió.","cyan");
    updateCombatBars(); return;
  }
  S.player.cpu-=dmg;
  S.player.stats.totalDamageReceived=(S.player.stats.totalDamageReceived||0)+dmg;
  /* sonido y screen shake al recibir daño */
  sound.damage();
  var combatEl = document.getElementById("combat");
  if(combatEl){ combatEl.classList.remove("shake"); void combatEl.offsetWidth; combatEl.classList.add("shake"); }
  if(S.player.cpu<=0){
    S.player.cpu=0; flatline();
    if(typeof syncGameInputLock==="function") syncGameInputLock();
    return;
  }
  updateCombatBars();
}
function setCombatLog(t,cls){ var e=document.getElementById("combatLog"); if(e){ e.textContent=t; e.className="combat-log "+(cls||""); } }

function doEscape(){
  if(!COM||!COM.alive||COM.node.boss||COM.node.type==="nucleo") return;
  var chance=55+S.player.sigilo*5;
  if(Math.random()*100<chance){
    sound.success(); COM.alive=false; clearInterval(combatTimer); closeCombat();
    combatActive=false; COM=null;
    if(typeof syncGameInputLock==="function") syncGameInputLock();
    S.player.heat=clamp(S.player.heat+5,0,100);
    recordHeatPeak();
    addLog("HUIR ▸ saliste del combate. calor +5.");
    msg("HUIR ▸ te diste de baja. El enemigo sigue esperándote. calor +5.","ambar");
    updateTopbar();
    if(inImmersion && currentView==="red") renderGridHud();
    save(); updateAmbient();
  } else {
    sound.error();
    var dmg=combatDamage(), absorbed=S.player.decoys>0;
    setCombatLog("huida fallida · "+dmg+" de daño.","rojo");
    applyDamageToPlayer(dmg);
    if(COM&&COM.alive){
      if(COM.stage==="encounter"){
        beginCombat();
        setCombatLog("huida fallida · "+(absorbed ? "DECOY absorbió el golpe" : dmg+" de daño")+". Combate iniciado.",absorbed ? "cyan" : "rojo");
        return;
      }
      updateCombatBars();
      /* en scanner/memoria: no generar nueva clave (el timer no se resetea) */
      if(COM.mode==="claves" || COM.mode==="rastreo") newCode();
    }
  }
}
function winCombat(){
  sound.win(); COM.alive=false; clearInterval(combatTimer); closeCombat();
  /* trackear racha de combates ganados */
  if(!S.player.stats.combatStreak) S.player.stats.combatStreak=0;
  S.player.stats.combatStreak++;
  if(S.player.stats.combatStreak>(S.player.stats.maxCombatStreak||0))
    S.player.stats.maxCombatStreak=S.player.stats.combatStreak;
  var onWin=COM.ctx.onWin, node=COM.node;
  /* liberar el combate ANTES del callback: el onWin puede resolver el nodo
     (entrar en otro combate, recoger datos…) */
  combatActive=false; COM=null;
  if(typeof syncGameInputLock==="function") syncGameInputLock();
  if(onWin) onWin({node:node});
  checkAchievements();
  updateAmbient();
  if(typeof syncGameInputLock==="function") syncGameInputLock();
}
function closeCombat(){
  clearInterval(combatTimer); combatTimer=null;
  clearMemoriaTimers(COM);
  clearVaultTimers(VAULT_PUZZLE);
  if(_scannerRAF) cancelAnimationFrame(_scannerRAF);
  _scannerRAF=null;
  document.removeEventListener("keydown", onCombatKey, true);
  var el=document.getElementById("combat");
  if(el){ el.classList.remove("show"); el.innerHTML=""; }
  updateMusic();
  if(typeof syncGameInputLock==="function") syncGameInputLock();
}

/* Sustituir una partida invalida el minijuego sin recompensas ni callbacks.
   Cerrar con sus objetos aún presentes permite limpiar todos sus timers. */
function cancelActiveCombat(){
  if(COM) COM.alive=false;
  closeCombat();
  COM=null; VAULT_PUZZLE=null; combatActive=false;
  ACTIONS.vaultCancel=null;
  if(typeof syncGameInputLock==="function") syncGameInputLock();
}


function rotateRoute(mask){ return ((mask<<1)&15)|((mask>>3)&1); }
function routeConnected(route){
  if(!(route.tiles[route.source]&8) || !(route.tiles[route.target]&2)) return false;
  var pending=[route.source], seen={}, steps=[{bit:1,back:4,delta:-3},{bit:2,back:8,delta:1},{bit:4,back:1,delta:3},{bit:8,back:2,delta:-1}];
  while(pending.length){
    var current=pending.shift();
    if(current===route.target) return true;
    if(seen[current]) continue;
    seen[current]=true;
    steps.forEach(function(step){
      var next=current+step.delta;
      if(next<0 || next>=9 || ((step.bit===2 || step.bit===8) && Math.floor(current/3)!==Math.floor(next/3))) return;
      if((route.tiles[current]&step.bit) && (route.tiles[next]&step.back) && !seen[next]) pending.push(next);
    });
  }
  return false;
}
function routeTileLabel(mask,index){
  var ports=[];
  [{bit:1,name:"norte"},{bit:2,name:"este"},{bit:4,name:"sur"},{bit:8,name:"oeste"}].forEach(function(port){ if(mask&port.bit) ports.push(port.name); });
  return "Conexión "+(index+1)+": "+ports.join(", ")+". Girar un cuarto de vuelta";
}
function renderCombatRoute(){
  var el=document.getElementById("combat");
  el.classList.add("show");
  el.innerHTML='<div class="combat-card" role="dialog" aria-modal="true" aria-labelledby="ct-title">'+
    '<h2 class="combat-title" id="ct-title">'+escapeHtml(COM.node.name||"DESVIADOR")+'</h2>'+
    '<div class="combat-sub" id="ct-sub"></div>'+combatAvatarHtml()+
    '<div class="combat-bar-lbl"><span>TU CPU</span><span id="cpuPct"></span></div>'+
    '<div class="bar"><i id="cpuBar"></i><div class="bar-txt" id="cpuTxt"></div></div>'+
    '<div class="route-status" id="routeStatus"></div><div class="route-board" id="routeBoard" role="group" aria-label="Conexiones del desviador"></div>'+
    '<button class="btn cyan" id="routeSend">ENRUTAR</button><div class="combat-log" id="combatLog" role="status"></div>'+
    '<div class="timer-lbl" id="timerLbl"></div><div class="timer-bar"><i id="timerBar"></i></div>'+
    '<div class="center mt-2"><button class="btn ambar small" id="escapeBtn">HUIR [ESC]</button></div></div>';
  document.getElementById("escapeBtn").addEventListener("click",doEscape);
  var battle=COM, sendButton=document.getElementById("routeSend");
  sendButton.addEventListener("click",function(){ if(COM===battle && sendButton.isConnected) submitRoute(); });
}
function startRoutePhase(){
  if(!COM || !COM.alive || COM.mode!=="ruta") return;
  var tiles=[10,10,12,6,10,9,3,10,10], flipped=Math.random()<0.5;
  if(flipped){
    tiles=tiles.slice(6).concat(tiles.slice(3,6),tiles.slice(0,3)).map(function(mask){ return (mask&10)|((mask&1)<<2)|((mask&4)>>2); });
  }
  COM.route={source:flipped?6:0,target:flipped?2:8,tiles:tiles.map(function(mask){
    var turns=randInt(0,3); while(turns--){ mask=rotateRoute(mask); } return mask;
  })};
  if(routeConnected(COM.route)) COM.route.tiles[COM.route.source]=rotateRoute(COM.route.tiles[COM.route.source]);
  document.getElementById("ct-sub").textContent="DESVÍO · FASE "+COM.phase+"/"+COM.phases;
  document.getElementById("routeStatus").textContent="ENTRADA: oeste "+(COM.route.source+1)+" → SALIDA: este "+(COM.route.target+1);
  var glyphs={3:"└",6:"┌",9:"┘",12:"┐",5:"│",10:"─"}, board=document.getElementById("routeBoard");
  board.innerHTML=COM.route.tiles.map(function(mask,index){
    return '<button class="route-tile'+(index===COM.route.source || index===COM.route.target?' route-end':'')+'" data-route="'+index+'" data-mask="'+mask+'" aria-label="'+routeTileLabel(mask,index)+'" title="'+routeTileLabel(mask,index)+'">'+glyphs[mask]+'</button>';
  }).join("");
  Array.prototype.forEach.call(board.querySelectorAll("[data-route]"),function(button){ button.addEventListener("click",function(){
    if(!COM || !COM.alive || COM.mode!=="ruta" || !button.isConnected) return;
    var index=Number(button.getAttribute("data-route")), mask=rotateRoute(COM.route.tiles[index]);
    COM.route.tiles[index]=mask;
    button.textContent=glyphs[mask]; button.setAttribute("data-mask",mask);
    button.setAttribute("aria-label",routeTileLabel(mask,index)); button.setAttribute("title",routeTileLabel(mask,index));
    sound.type();
  }); });
  COM.remaining=COM.time; updateCombatBars(); combatLoop();
  var first=board.querySelector("button"); if(first) first.focus();
}
function submitRoute(){
  if(!COM || !COM.alive || COM.mode!=="ruta" || COM.stage!=="combat") return;
  if(!routeConnected(COM.route)){ failCombat(); return; }
  sound.success();
  S.player.stats.totalDamageDealt=(S.player.stats.totalDamageDealt||0)+COM.tier*8;
  COM.phase++;
  if(COM.phase>COM.phases){ winCombat(); return; }
  setCombatLog("enlace desviado · siguiente protección.","verde");
  startRoutePhase();
}

/* ============================================================
   8b. COMBATE MEMORIA (daemons) — mostrar secuencia, repetir
   ============================================================ */

function renderCombatMemoria(){
  var el=document.getElementById("combat");
  el.classList.add("show");
  el.innerHTML=
    '<div class="combat-card">'+
      '<div class="combat-title" id="ct-title"></div>'+
      '<div class="combat-sub" id="ct-sub">MEMORIA HEX · FASE 1/'+COM.phases+'</div>'+
      combatAvatarHtml()+
      '<div class="combat-bars">'+
        '<div class="combat-bar-lbl"><span>TU CPU</span><span id="cpuPct">100%</span></div>'+
        '<div class="bar"><i id="cpuBar" style="width:100%"></i><div class="bar-txt" id="cpuTxt">100/100</div></div>'+
        '<div class="combat-bar-lbl"><span>DAEMON</span><span id="icePct">100%</span></div>'+
        '<div class="bar magenta"><i id="iceBar" style="width:100%"></i></div>'+
      '</div>'+
      '<div class="combat-memoria" id="memZone">'+
        '<div class="mem-phase" id="memPhase">MEMORIZA LA SECUENCIA</div>'+
        '<div class="mem-sequence" id="memSeq"></div>'+
      '</div>'+
      '<div id="memInputZone" class="hidden">'+
        '<div class="mem-input-hint" id="memInputHint"></div>'+
        '<div class="code-box"><input class="code-input" id="memInput" type="text" inputmode="none" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Repite la secuencia hexadecimal" aria-describedby="memInputHint" placeholder="repite la secuencia..."></div>'+
        buildHexKB("memDel","memEnter")+
        '<div class="timer-lbl" id="timerLbl">T-0.0s</div>'+
        '<div class="timer-bar"><i id="timerBar" style="width:100%"></i></div>'+
      '</div>'+
      '<div class="combat-log" id="combatLog"></div>'+
      '<div class="combat-help">Memoriza la secuencia hex y repítela. <b>ESC</b> = HUIR</div>'+
      '<div class="center mt-2"><button class="btn ambar small" id="escapeBtn">HUIR [ESC]</button></div>'+
    '</div>';
  document.getElementById("ct-title").textContent="Ω "+(COM.node.name||"DAEMON")+" · T"+COM.tier;
  document.getElementById("escapeBtn").addEventListener("click", doEscape);
  /* teclado hex para modo memoria */
  var keys=document.querySelectorAll(".hex-key[data-hex]");
  for(var i=0;i<keys.length;i++) keys[i].addEventListener("click", onMemHexKey);
  var delBtn=document.getElementById("memDel");
  var enterBtn=document.getElementById("memEnter");
  if(delBtn) delBtn.addEventListener("click", onMemHexDel);
  if(enterBtn) enterBtn.addEventListener("click", onMemHexEnter);
  var inp=document.getElementById("memInput");
  if(inp){
    /* auto-comprobar al teclear (teclado físico), como en modo claves */
    inp.addEventListener("input", function(){
      if(!COM||!COM.alive||COM.memPhase!=="input") return;
      var clean=inp.value.replace(/[^0-9a-fA-F]/g,"");
      if(clean!==inp.value) inp.value=clean;
      if(inp.value.toUpperCase()===COM.memSequence) winMemPhase();
      else sound.type();
    });
    inp.addEventListener("keydown", function(e){
      if(e.key==="Enter"){ e.preventDefault(); onMemHexEnter(); }
    });
  }
}

function startMemoriaPhase(){
  if(!COM||!COM.alive) return;
  var battle=COM;
  clearMemoriaTimers(battle);
  battle.memPhaseSerial=(battle.memPhaseSerial||0)+1;
  var phaseSerial=battle.memPhaseSerial;
  clearInterval(combatTimer);
  /* generar secuencia aleatoria: 4+phase*1 caracteres hex */
  var len=3+battle.phase+Math.min(battle.tier-1,1);
  var s=""; for(var i=0;i<len;i++) s+=HEX[randInt(0,15)];
  battle.memSequence=s; battle.memPhase="reveal";
  /* mostrar secuencia */
  var seqEl=document.getElementById("memSeq");
  var phaseEl=document.getElementById("memPhase");
  var inputZone=document.getElementById("memInputZone");
  var memZone=document.getElementById("memZone");
  if(seqEl) seqEl.textContent=s.split("").join(" ");
  if(phaseEl) phaseEl.textContent="MEMORIZA LA SECUENCIA";
  if(inputZone) inputZone.classList.add("hidden");
  if(memZone) memZone.classList.remove("hidden");
  var hint=document.getElementById("memInputHint");
  if(hint) hint.textContent="Secuencia de "+len+" caracteres";
  if(seqEl){ seqEl.classList.remove("mem-fadeout"); void seqEl.offsetWidth; }
  if(memZone){ memZone.classList.remove("mem-fadeout"); void memZone.offsetWidth; }
  /* ocultar después de 2s + tier*0.5s */
  var delay=2000+battle.tier*500;
  battle.memRevealTimer=setTimeout(function(){
    if(COM!==battle||!battle.alive||battle.memPhase!=="reveal"||battle.memPhaseSerial!==phaseSerial) return;
    battle.memRevealTimer=null;
    /* fade-out de la secuencia */
    if(seqEl) seqEl.classList.add("mem-fadeout");
    battle.memFadeTimer=setTimeout(function(){
      if(COM!==battle||!battle.alive||battle.memPhase!=="reveal"||battle.memPhaseSerial!==phaseSerial) return;
      battle.memFadeTimer=null;
      battle.memPhase="input";
      if(memZone) memZone.classList.add("hidden");
      if(seqEl) seqEl.textContent="";
      if(inputZone) inputZone.classList.remove("hidden");
      var inp=document.getElementById("memInput");
      if(inp){ inp.value=""; inp.focus(); }
      /* timer de combate */
      battle.remaining=battle.time;
      updateCombatBars();
      clearInterval(combatTimer);
      var memTimer=setInterval(function(){
        if(COM!==battle||!battle.alive||battle.memPhase!=="input"||battle.memPhaseSerial!==phaseSerial){
          clearInterval(memTimer);
          if(combatTimer===memTimer) combatTimer=null;
          return;
        }
        battle.remaining-=100;
        if(battle.remaining<=0){ battle.remaining=0; failCombat(); }
        if(COM===battle && battle.alive) updateCombatBars();
      },100);
      combatTimer=memTimer;
    },600);
  },delay);
}

function onMemHexKey(e){
  if(!COM||!COM.alive||COM.memPhase!=="input") return;
  var ch=e.currentTarget.getAttribute("data-hex");
  var inp=document.getElementById("memInput");
  if(!inp) return;
  if(inp.value.length>=COM.memSequence.length) return;
  inp.value+=ch;
  sound.type();
  /* auto-comprobar */
  if(inp.value.toUpperCase()===COM.memSequence) winMemPhase();
}
function onMemHexDel(){
  if(!COM||!COM.alive||COM.memPhase!=="input") return;
  var inp=document.getElementById("memInput");
  if(!inp||inp.value.length===0) return;
  inp.value=inp.value.slice(0,-1);
}
function onMemHexEnter(){
  if(!COM||!COM.alive||COM.memPhase!=="input") return;
  var inp=document.getElementById("memInput");
  if(!inp) return;
  var v=inp.value.toUpperCase();
  if(v===COM.memSequence) winMemPhase();
  else failCombat();
}

function winMemPhase(){
  if(!COM||!COM.alive) return;
  sound.success();
  clearInterval(combatTimer);
  /* trackear daño infligido */
  S.player.stats.totalDamageDealt=(S.player.stats.totalDamageDealt||0)+(COM.tier*10);
  setCombatLog("secuencia correcta · "+COM.node.name+" recibe daño.","verde");
  COM.phase++;
  if(COM.phase>COM.phases){ winCombat(); return; }
  updateCombatBars();
  /* actualizar sub */
  var sub=document.getElementById("ct-sub");
  if(sub) sub.textContent="MEMORIA HEX · FASE "+COM.phase+"/"+COM.phases;
  startMemoriaPhase();
}


/* ============================================================
   8c. COMBATE SCANNER (ICE T3) — línea de escaneo + gaps
   ============================================================ */

function renderCombatScanner(){
  var el=document.getElementById("combat");
  el.classList.add("show");
  el.innerHTML=
    '<div class="combat-card">'+
      '<div class="combat-title" id="ct-title"></div>'+
      '<div class="combat-sub" id="ct-sub">ESCÁNER · FASE 1/'+COM.phases+'</div>'+
      combatAvatarHtml()+
      '<div class="combat-bars">'+
        '<div class="combat-bar-lbl"><span>TU CPU</span><span id="cpuPct">100%</span></div>'+
        '<div class="bar"><i id="cpuBar" style="width:100%"></i><div class="bar-txt" id="cpuTxt">100/100</div></div>'+
        '<div class="combat-bar-lbl"><span>ICE</span><span id="icePct">100%</span></div>'+
        '<div class="bar rojo"><i id="iceBar" style="width:100%"></i></div>'+
      '</div>'+
      '<div class="combat-scanner" id="scannerZone">'+
        '<div class="scanner-zone" id="scanZone"></div>'+
        '<div class="scanner-hit" id="scanMsg">haz clic cuando la línea esté sobre un hueco</div>'+
      '</div>'+
      '<div class="combat-log" id="combatLog"></div>'+
      '<div class="timer-lbl" id="timerLbl">T-3.3s</div>'+
      '<div class="timer-bar"><i id="timerBar" style="width:100%"></i></div>'+
      '<div class="combat-help">Toca o haz clic en la zona cuando la línea pase por un hueco. <b>ESC</b> = HUIR</div>'+
      '<div class="center mt-2"><button class="btn ambar small" id="escapeBtn">HUIR [ESC]</button></div>'+
    '</div>';
  document.getElementById("ct-title").textContent="▣ "+(COM.node.name||"ICE")+" · T"+COM.tier;
  document.getElementById("escapeBtn").addEventListener("click", doEscape);
  /* pulsación en la zona de escaneo: pointerdown/touchstart dan respuesta
     inmediata (el click sintetizado en táctil llega con retardo y obligaba
     a pulsar por delante de la línea) */
  var scanZone=document.getElementById("scanZone");
  if(scanZone){
    if(window.PointerEvent) scanZone.addEventListener("pointerdown", onScannerClick);
    else {
      scanZone.addEventListener("touchstart", onScannerTouch, {passive:false});
      scanZone.addEventListener("mousedown", onScannerClick);
    }
  }
}

var _scannerGaps=[], _scannerPos=0, _scannerDir=1, _scannerSpeed=2, _scannerRAF=null, _scannerLastT=0;

function startScannerPhase(){
  if(!COM||!COM.alive) return;
  /* generar gaps: 3-4 huecos aleatorios (anchos y dentro del recorrido) */
  var gapCount=3+Math.min(COM.phase-1,1);
  _scannerGaps=[];
  for(var i=0;i<gapCount;i++){
    var w=randInt(8,12);
    _scannerGaps.push({x:randInt(4,92-w), w:w, hit:false});
  }
  _scannerPos=0; _scannerDir=1;
  /* velocidad en % de la zona por SEGUNDO (independiente del FPS).
     Sube poco con tier/fase: exigente pero acertable en todas las fases. */
  _scannerSpeed=16+(COM.tier-1)*3+(COM.phase-1)*2.5;
  /* renderizar zona */
  var zone=document.getElementById("scanZone");
  if(!zone) return;
  var html='';
  for(var j=0;j<_scannerGaps.length;j++){
    var g=_scannerGaps[j];
    html+='<div class="scanner-gap" id="sgap'+j+'" style="left:'+g.x+'%;width:'+g.w+'%"></div>';
  }
  html+='<div class="scanner-line" id="scanLine"></div>';
  zone.innerHTML=html;
  var msgEl=document.getElementById("scanMsg");
  if(msgEl) msgEl.textContent="¡HAZ CLIC AHORA!";
  /* iniciar animación: movimiento por tiempo transcurrido (delta time),
     así la línea es lineal aunque el dispositivo vaya a pocos FPS */
  if(_scannerRAF) cancelAnimationFrame(_scannerRAF);
  _scannerLastT=0;
  function animateScanner(ts){
    if(!COM||!COM.alive) return;
    if(!_scannerLastT) _scannerLastT=ts;
    var dt=(ts-_scannerLastT)/1000;
    _scannerLastT=ts;
    if(dt>0.25) dt=0.25; /* tras una parada del sistema, sin saltos bruscos */
    _scannerPos+=_scannerDir*_scannerSpeed*dt;
    if(_scannerPos>=95){ _scannerDir=-1; _scannerPos=95; }
    if(_scannerPos<=0){ _scannerDir=1; _scannerPos=0; }
    var line=document.getElementById("scanLine");
    if(line) line.style.left=_scannerPos+"%";
    _scannerRAF=requestAnimationFrame(animateScanner);
  }
  _scannerRAF=requestAnimationFrame(animateScanner);
  /* timer */
  COM.remaining=COM.time;
  clearInterval(combatTimer);
  combatTimer=setInterval(function(){
    if(!COM||!COM.alive){ clearInterval(combatTimer); return; }
    COM.remaining-=100;
    if(COM.remaining<=0){ COM.remaining=0; failCombat(); }
    if(COM && COM.alive) updateCombatBars();
  },100);
}

function onScannerClick(e){
  /* solo pulsación principal (ratón/lápiz); el táctil llega vía onScannerTouch */
  if(e && e.button!==undefined && e.button!==0) return;
  if(!COM||!COM.alive||COM.mode!=="scanner"||COM.memPhase!=="input") return;
  /* comprobar si la línea está sobre un gap (con margen de tolerancia) */
  var tol=2.5, hit=false;
  for(var i=0;i<_scannerGaps.length;i++){
    var g=_scannerGaps[i];
    if(!g.hit && _scannerPos>=g.x-tol && _scannerPos<=g.x+g.w+tol){
      hit=true; g.hit=true;
      var el=document.getElementById("sgap"+i);
      if(el) el.classList.add("hit");
      break;
    }
  }
  if(hit){
    sound.success();
    /* comprobar si todos los gaps están tocados */
    var allHit=true;
    for(var j=0;j<_scannerGaps.length;j++){ if(!_scannerGaps[j].hit){ allHit=false; break; } }
    if(allHit){
      winScannerPhase();
    } else {
      var msgEl=document.getElementById("scanMsg");
      if(msgEl){ msgEl.textContent="¡BIEN! queda(n) "+(_scannerGaps.filter(function(g){return !g.hit;}).length)+" hueco(s)."; msgEl.className="scanner-hit"; }
    }
  } else {
    sound.error();
    var msgEl=document.getElementById("scanMsg");
    if(msgEl){ msgEl.textContent="¡FALLO! la línea no está sobre un hueco."; msgEl.className="scanner-miss"; }
    /* daño por fallo */
    failCombat();
  }
}
/* táctil: touchstart da respuesta inmediata y el preventDefault evita el
   click sintetizado posterior (que contaría como un segundo intento) */
function onScannerTouch(e){
  if(e) e.preventDefault();
  onScannerClick(null);
}

function winScannerPhase(){
  if(!COM||!COM.alive) return;
  clearInterval(combatTimer);
  if(_scannerRAF) cancelAnimationFrame(_scannerRAF);
  sound.success();
  /* trackear daño infligido */
  S.player.stats.totalDamageDealt=(S.player.stats.totalDamageDealt||0)+(COM.tier*12);
  setCombatLog("escaneo completo · "+COM.node.name+" recibe daño.","verde");
  COM.phase++;
  if(COM.phase>COM.phases){ winCombat(); return; }
  updateCombatBars();
  var sub=document.getElementById("ct-sub");
  if(sub) sub.textContent="ESCÁNER · FASE "+COM.phase+"/"+COM.phases;
  startScannerPhase();
}


/* ============================================================
   8d. VAULT PUZZLE — ordenar símbolos
   ============================================================ */

var VAULT_PUZZLE=null;

function clearVaultTimers(vp){
  if(!vp) return;
  clearTimeout(vp.revealTimer);
  clearTimeout(vp.cooldownTimer);
  vp.revealTimer=null; vp.cooldownTimer=null;
}

function startVaultPuzzle(n){
  if(combatActive || !n || n.done || n._done) return;
  if(projectRecovered(n.proj)){
    msg("ya recuperaste el proyecto "+projectName(n.proj)+". Ese vault no entrega otra recompensa.","ambar"); return;
  }
  clearVaultTimers(VAULT_PUZZLE);
  combatActive=true;
  if(inImmersion) inImmersion.combatOccurred=true;
  var len=4+Math.min(Math.floor(Math.random()*3),2); /* 4-6 símbolos */
  var symbols=[];
  for(var i=0;i<len;i++) symbols.push(HEX[randInt(0,15)]);
  var shuffled=symbols.slice();
  /* Fisher-Yates shuffle */
  for(var j=shuffled.length-1;j>0;j--){
    var k=Math.floor(Math.random()*(j+1));
    var tmp=shuffled[j]; shuffled[j]=shuffled[k]; shuffled[k]=tmp;
  }
  var vp=VAULT_PUZZLE={node:n, symbols:symbols, shuffled:shuffled, phase:"show",
    picks:[], locked:false};
  renderVaultPuzzle();
  if(typeof syncGameInputLock==="function") syncGameInputLock();
  updateMusic(); /* música tensa del puzzle */
  /* mostrar orden correcto 3 segundos */
  vp.revealTimer=setTimeout(function(){
    if(VAULT_PUZZLE!==vp || vp.phase!=="show") return;
    vp.revealTimer=null;
    vp.phase="input";
    renderVaultPuzzleInput();
  },3000);
}

function renderVaultPuzzle(){
  var el=document.getElementById("combat");
  el.classList.add("show");
  var vp=VAULT_PUZZLE;
  el.innerHTML=
    '<div class="combat-card">'+
      '<div class="combat-title ambar">⬢ VAULT · '+escapeHtml(projectName(vp.node.proj))+'</div>'+
      '<div class="combat-sub">MEMORIZA EL ORDEN DE LOS SÍMBOLOS</div>'+
      '<div class="vault-puzzle">'+
        '<div class="vp-label">secuencia correcta:</div>'+
        '<div class="vp-sequence">'+vp.symbols.join(" ")+'</div>'+
        '<div class="vp-hint">memoriza el orden... restan 3 segundos</div>'+
      '</div>'+
    '</div>';
}

function renderVaultPuzzleInput(){
  var vp=VAULT_PUZZLE;
  var el=document.getElementById("combat");
  var symHtml='';
  for(var i=0;i<vp.shuffled.length;i++){
    symHtml+='<div class="vault-symbol" data-idx="'+i+'">'+vp.shuffled[i]+'</div>';
  }
  el.innerHTML=
    '<div class="combat-card">'+
      '<div class="combat-title ambar">⬢ VAULT · '+escapeHtml(projectName(vp.node.proj))+'</div>'+
      '<div class="combat-sub">HAZ CLIC EN EL ORDEN CORRECTO ('+vp.picks.length+'/'+vp.symbols.length+')</div>'+
      '<div class="vault-puzzle">'+
        '<div class="vp-label">ordena los símbolos:</div>'+
        '<div class="vp-order" id="vpOrder">'+symHtml+'</div>'+
        '<div class="vp-label">tu selección: <span id="vpPicks" class="ambar">—</span></div>'+
        '<div class="vp-hint">tiempo: 15 segundos · fallar = -10 CPU y bloqueo 10s</div>'+
      '</div>'+
      '<div class="combat-log" id="combatLog"></div>'+
      '<div class="center mt-2"><button class="btn small" data-action="vaultCancel">CANCELAR</button></div>'+
    '</div>';
  /* bind clicks */
  var symbols=el.querySelectorAll(".vault-symbol");
  for(var j=0;j<symbols.length;j++){
    symbols[j].addEventListener("click", onVaultSymbolClick);
  }
  ACTIONS.vaultCancel=function(){
    if(VAULT_PUZZLE!==vp) return;
    combatActive=false;
    closeCombat(); VAULT_PUZZLE=null;
    if(typeof syncGameInputLock==="function") syncGameInputLock();
    ACTIONS.vaultCancel=null;
    msg("cancelaste el puzzle del vault.","ambar");
    renderGridHud();
  };
  /* timer */
  var remaining=15000;
  clearInterval(combatTimer);
  var vaultTimer=setInterval(function(){
    if(VAULT_PUZZLE!==vp || vp.phase!=="input" || vp.locked){
      clearInterval(vaultTimer);
      if(combatTimer===vaultTimer) combatTimer=null;
      return;
    }
    remaining-=100;
    if(remaining<=0){
      clearInterval(vaultTimer);
      if(combatTimer===vaultTimer) combatTimer=null;
      vaultFail();
    }
  },100);
  combatTimer=vaultTimer;
  if(typeof syncGameInputLock==="function") syncGameInputLock();
}

function onVaultSymbolClick(e){
  if(!VAULT_PUZZLE||VAULT_PUZZLE.phase!=="input"||VAULT_PUZZLE.locked) return;
  var idx=parseInt(e.currentTarget.getAttribute("data-idx"));
  var vp=VAULT_PUZZLE;
  var sym=vp.shuffled[idx];
  vp.picks.push(sym);
  e.currentTarget.classList.add("picked");
  sound.type();
  /* actualizar selección */
  var picksEl=document.getElementById("vpPicks");
  if(picksEl) picksEl.textContent=vp.picks.join(" ");
  /* comprobar si coincide con el orden correcto */
  var pos=vp.picks.length-1;
  if(vp.picks[pos]!==vp.symbols[pos]){
    /* fallo */
    vaultFail();
    return;
  }
  if(vp.picks.length>=vp.symbols.length){
    /* éxito */
    clearInterval(combatTimer);
    combatActive=false;
    sound.win();
    closeCombat();
    var node=vp.node;
    VAULT_PUZZLE=null;
    if(typeof syncGameInputLock==="function") syncGameInputLock();
    ACTIONS.vaultCancel=null;
    onNodeDefeated({node:node});
  }
}

function vaultFail(){
  var vp=VAULT_PUZZLE;
  if(!vp || vp.locked) return;
  clearInterval(combatTimer);
  vp.locked=true; vp.picks=[];
  var order=document.getElementById("vpOrder");
  if(order) order.classList.add("vault-locked");
  S.player.cpu=Math.max(0,S.player.cpu-10);
  sound.error();
  setCombatLog("fallo · -10 CPU · vault bloqueado 10s.");
  if(S.player.cpu<=0){
    combatActive=false; closeCombat(); VAULT_PUZZLE=null;
    ACTIONS.vaultCancel=null;
    flatline();
    if(typeof syncGameInputLock==="function") syncGameInputLock();
    return;
  }
  /* bloquear 10 segundos */
  vp.cooldownTimer=setTimeout(function(){
    if(VAULT_PUZZLE!==vp || !vp.locked) return;
    vp.cooldownTimer=null;
    vp.locked=false;
    vp.picks=[];
    vp.phase="input";
    renderVaultPuzzleInput();
  },10000);
}

