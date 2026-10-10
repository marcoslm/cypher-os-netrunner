/* ============================================================
   CYPHER://OS  ·  cypher_os_combat.js — COMBATE Y VAULT
   Combate en 3 modos (claves hex, memoria para daemons, scanner para
   ICE T3) y puzzle del vault.
   Orden de carga de los .js (scripts clásicos sin módulos, ámbito global
   compartido; ver AGENTS.md §4):
     1/6 data → 2/6 core → 3/6 audio → 4/6 grid → 5/6 combat → 6/6 ui
   ============================================================ */
'use strict';

/* ============================================================
   8. COMBATE (minijuego de introducción de claves)
   ============================================================ */

var COM=null; var combatTimer=null;

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
  if(S.player.virus>0 && phases>1){ S.player.virus--; phases--; addLog("PAQUETE VIRUS ▸ una fase eliminada."); }
  /* modo de combate: memoria para daemons, scanner para ICE T3, claves para el resto */
  var mode = n.type==="daemon" ? "memoria" : (n.type==="ice" && n.tier===3) ? "scanner" : "claves";
  var phaseTime=2600+tier*700+S.player.hack*500+(S.difficulty==="hardcore"?0:2000);
  /* el escáner exige varios aciertos por fase: margen de tiempo extra */
  if(mode==="scanner") phaseTime=Math.round(phaseTime*1.6);
  COM = { ctx:ctx, node:n, tier:tier, phases:phases, phase:1,
    length:codeLen(tier), time:phaseTime, remaining:0, code:"", alive:true,
    player:S.player, mode:mode,
    memSequence:"", memPhase:"" };
  document.addEventListener("keydown", onCombatKey, true);
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
  /* teclado hex virtual: 56789 DEF / 01234 ABC + borrar + enviar */
  var hexKB=buildHexKB("hexDel","hexEnter");
  el.innerHTML =
    '<div class="combat-card">'+
      '<div class="combat-title" id="ct-title"></div>'+
      '<div class="combat-sub" id="ct-sub">FASE 1/'+COM.phases+'</div>'+
      '<div class="combat-bars">'+
        '<div class="combat-bar-lbl"><span>TU CPU</span><span id="cpuPct">100%</span></div>'+
        '<div class="bar"><i id="cpuBar" style="width:100%"></i><div class="bar-txt" id="cpuTxt">100/100</div></div>'+
        '<div class="combat-bar-lbl"><span>ICE</span><span id="icePct">100%</span></div>'+
        '<div class="bar rojo"><i id="iceBar" style="width:100%"></i></div>'+
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
  if(!COM||!COM.alive) return;
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
  if(!COM||!COM.alive) return;
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
  if(inp){ inp.value=""; inp.focus(); }
  updateCombatBars();
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
  if(timerBar) timerBar.style.width=clamp(COM.remaining/COM.time*100,0,100)+"%";
  if(timerLbl) timerLbl.textContent="T-"+(COM.remaining/1000).toFixed(1)+"s";
}
function combatLoop(){
  if(!COM||!COM.alive) return;
  clearInterval(combatTimer);
  combatTimer=setInterval(function(){
    if(!COM||!COM.alive){ clearInterval(combatTimer); return; }
    COM.remaining-=100;
    if(COM.remaining<=0){ COM.remaining=0; failCombat(); }
    if(COM && COM.alive) updateCombatBars();
  },100);
}
function onCodeInput(e){
  if(!COM||!COM.alive) return;
  /* filtrar caracteres que no sean hex ni espacios */
  var clean=e.target.value.replace(/[^0-9a-fA-F\s]/g,"");
  if(clean!==e.target.value) e.target.value=clean;
  if(e.target.value.replace(/\s+/g,"").toUpperCase()===COM.code) winPhase();
  else sound.type();
}
function onCodeKey(e){
  if(!COM||!COM.alive) return;
  if(e.key==="Enter"){
    var v=e.target.value.replace(/\s+/g,"").toUpperCase();
    if(v===COM.code){ e.preventDefault(); winPhase(); }
    else { e.preventDefault(); failCombat(); }
  }
}
function winPhase(){
  if(!COM||!COM.alive) return;
  sound.success();
  /* trackear daño infligido */
  S.player.stats.totalDamageDealt=(S.player.stats.totalDamageDealt||0)+(COM.tier*8);
  setCombatLog("clave aceptada · "+COM.node.name+" recibe daño.","verde");
  COM.phase++;
  if(COM.phase>COM.phases){ winCombat(); return; }
  updateCombatBars(); newCode();
}
function failCombat(){
  if(!COM||!COM.alive) return;
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
  if(!COM||!COM.alive||COM.node.boss) return;
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
    var dmg=combatDamage(); setCombatLog("huida fallida · "+dmg+" de daño.","rojo");
    applyDamageToPlayer(dmg);
    if(COM&&COM.alive){
      updateCombatBars();
      /* en scanner/memoria: no generar nueva clave (el timer no se resetea) */
      if(COM.mode!=="scanner" && COM.mode!=="memoria") newCode();
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
    msg("ya recuperaste el proyecto "+n.proj+". Ese vault no entrega otra recompensa.","ambar"); return;
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
      '<div class="combat-title ambar">⬢ VAULT · '+vp.node.proj+'</div>'+
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
      '<div class="combat-title ambar">⬢ VAULT · '+vp.node.proj+'</div>'+
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
  e.currentTarget.style.pointerEvents="none";
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

