/* ============================================================
   CYPHER://OS  ·  cypher_os_audio.js — AUDIO Y PREFERENCIAS DE DISPLAY
   Audio WebAudio sin archivos (FX + ambiente) y música opcional por
   escenas (music/*.mp3). Brillo (LUM) y pantalla completa (FULL).
   Orden de carga de los .js (scripts clásicos sin módulos, ámbito global
   compartido; ver AGENTS.md §4):
     1/6 data → 2/6 core → 3/6 audio → 4/6 grid → 5/6 combat → 6/6 ui
   ============================================================ */
'use strict';

/* ============================================================
   4. AUDIO (WebAudio) — sin archivos, generado en tiempo real
   ============================================================ */

var AC = null;
function initAudio(){
  if(AC) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if(Ctx) AC = new Ctx();
  } catch(e){ AC=null; }
}
function resumeAudio(){ if(AC && AC.state==="suspended") AC.resume(); }
/* ganancia maestra del canal FX: con música sonando, los beeps no deben
   quedar tapados. Los volúmenes del objeto sound son relativos entre sí. */
var FX_GAIN=2.5;
function beep(freq, dur, type, vol){
  if(S && S.snd===false) return;
  if(!AC){ try{ initAudio(); }catch(e){ return; } }
  if(!AC) return;
  function _play(){
    try{
      var osc = AC.createOscillator(), g = AC.createGain();
      osc.type = type || "square"; osc.frequency.value = freq;
      var v = (vol != null ? vol : 0.06) * FX_GAIN;
      osc.connect(g); g.connect(AC.destination);
      var now = AC.currentTime;
      g.gain.setValueAtTime(v, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
      osc.start(now); osc.stop(now+dur+0.02);
    }catch(e){}
  }
  if(AC.state==="suspended") AC.resume().then(_play, _play);
  else _play();
}
var sound = {
  click:function(){ beep(660,0.05,"square",0.10); },
  type:function(){ beep(880,0.03,"square",0.07); },
  success:function(){ beep(880,0.08,"square",0.05); setTimeout(function(){beep(1320,0.1,"square",0.05);},70); },
  error:function(){ beep(160,0.18,"sawtooth",0.06); },
  buy:function(){ beep(520,0.06,"square",0.05); setTimeout(function(){beep(780,0.08,"square",0.05);},60); },
  win:function(){ [523,659,784,1047].forEach(function(f,i){ setTimeout(function(){beep(f,0.12,"square",0.05);}, i*90); }); },
  flatline:function(){ beep(300,0.25,"sawtooth",0.07); setTimeout(function(){beep(90,0.5,"sawtooth",0.08);},200); },
  cool:function(){ beep(1200,0.09,"triangle",0.08); },
  /* --- nuevos efectos de dinamismo --- */
  bootStart:function(){
    beep(220,0.15,"sawtooth",0.06);
    setTimeout(function(){beep(330,0.12,"triangle",0.05);},80);
    setTimeout(function(){beep(440,0.2,"square",0.04);},160);
    setTimeout(function(){beep(660,0.3,"triangle",0.05);},280);
  },
  bootLine:function(){ beep(900+Math.random()*200,0.03,"square",0.05); },
  bootEnd:function(){
    beep(440,0.1,"triangle",0.05);
    setTimeout(function(){beep(550,0.1,"triangle",0.05);},60);
    setTimeout(function(){beep(880,0.15,"square",0.06);},120);
    setTimeout(function(){beep(1100,0.25,"triangle",0.04);},200);
  },
  dip:function(){
    beep(600,0.12,"sine",0.05);
    setTimeout(function(){beep(400,0.15,"sine",0.04);},80);
    setTimeout(function(){beep(250,0.2,"triangle",0.05);},180);
  },
  navigate:function(){ beep(520,0.06,"triangle",0.12); },
  startCombat:function(){
    beep(200,0.1,"sawtooth",0.06);
    setTimeout(function(){beep(400,0.08,"square",0.05);},100);
    setTimeout(function(){beep(600,0.06,"sawtooth",0.05);},180);
  },
  damage:function(){
    beep(120,0.12,"sawtooth",0.07);
    setTimeout(function(){beep(80,0.15,"sawtooth",0.06);},80);
  },
  levelUp:function(){
    [523,659,784,1047,1318].forEach(function(f,i){
      setTimeout(function(){beep(f,0.15,"triangle",0.05);}, i*70);
    });
  },
  achievement:function(){
    /* fanfare de logro: más brillante y con acorde final */
    beep(880,0.09,"square",0.05);
    setTimeout(function(){beep(1108,0.09,"square",0.05);},90);
    setTimeout(function(){beep(1318,0.14,"triangle",0.05);},180);
    setTimeout(function(){beep(1760,0.25,"triangle",0.04);},270);
    setTimeout(function(){beep(1318,0.25,"triangle",0.035);},270);
    setTimeout(function(){beep(1047,0.25,"triangle",0.035);},270);
  }
};


/* ============================================================
   4b. AUDIO AMBIENTAL — drones procedural por modo
   ============================================================ */

var AMBIENT={osc1:null,osc2:null,osc3:null,gain:null,filter:null,activeMode:null,
  noiseSrc:null,noiseGain:null,noiseLfo:null,noiseLfoGain:null,
  heart:null,heartGain:null,heartLfo:null,heartLfoGain:null};

/* buffer de ruido blanco reutilizable */
var _noiseBuffer=null;
function getNoiseBuffer(){
  if(_noiseBuffer) return _noiseBuffer;
  if(!AC) return null;
  var len=AC.sampleRate*2;
  _noiseBuffer=AC.createBuffer(1,len,AC.sampleRate);
  var data=_noiseBuffer.getChannelData(0);
  for(var i=0;i<len;i++) data[i]=Math.random()*2-1;
  return _noiseBuffer;
}

function startAmbient(mode){
  /* canal de FONDO (S.amb): independiente de FX y música */
  if(!S || S.amb!==true || !AC){ stopAmbient(); return; }
  stopAmbient();
  try{
    if(AC.state==="suspended") AC.resume();
    var g=AC.createGain();
    var f=AC.createBiquadFilter();
    f.type="lowpass"; f.frequency.value=200;
    g.gain.value=0; /* fade-in desde 0 */
    f.connect(g); g.connect(AC.destination);
    var o1=AC.createOscillator(), o2=AC.createOscillator();
    o1.type="sine"; o2.type="sine";
    if(mode==="street"){
      o1.frequency.value=80; o2.frequency.value=120;
      f.frequency.value=200;
      g.gain.setTargetAtTime(0.006, AC.currentTime, 0.5);
      /* LFO 1: volumen pulsante lento */
      var lfo=AC.createOscillator();
      lfo.type="sine"; lfo.frequency.value=0.08;
      var lfoGain=AC.createGain(); lfoGain.gain.value=0.005;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      lfo.start();
      /* LFO 2: deriva sutil de frecuencia para que el drone no sea constante */
      var lfo2=AC.createOscillator();
      lfo2.type="sine"; lfo2.frequency.value=0.03;
      var lfo2Gain=AC.createGain(); lfo2Gain.gain.value=12;
      lfo2.connect(lfo2Gain); lfo2Gain.connect(o1.frequency);
      lfo2.start();
      AMBIENT.osc3=lfo; AMBIENT.gain3=lfoGain;
    } else if(mode==="grid"){
      /* más abajo, más grave: el grid respira con la profundidad (LORE §3) */
      var depth=inImmersion?inImmersion.depth:4;
      o1.frequency.value=Math.max(58,160-depth*14); o2.frequency.value=Math.max(85,240-depth*12);
      f.frequency.value=240+depth*30;
      g.gain.setTargetAtTime(0.007, AC.currentTime, 0.3);
      /* tercer oscilador pulsante (tensión) */
      var o3=AC.createOscillator();
      o3.type="sine"; o3.frequency.value=0.5;
      var g3=AC.createGain(); g3.gain.value=0.006;
      o3.connect(g3); g3.connect(f); o3.start();
      AMBIENT.osc3=o3; AMBIENT.gain3=g3;
      /* latido del cable: en silencio hasta la capa 3 (lo abre updateAmbientStress) */
      var gHeart=AC.createOscillator();
      gHeart.type="sine"; gHeart.frequency.value=58;
      var ghGain=AC.createGain(); ghGain.gain.value=0;
      gHeart.connect(ghGain); ghGain.connect(AC.destination);
      gHeart.start();
      var ghLfo=AC.createOscillator();
      ghLfo.type="sawtooth"; ghLfo.frequency.value=0.8;
      var ghLfoGain=AC.createGain(); ghLfoGain.gain.value=0.012;
      ghLfo.connect(ghLfoGain); ghLfoGain.connect(ghGain.gain);
      ghLfo.start();
      AMBIENT.heart=gHeart; AMBIENT.heartGain=ghGain;
      AMBIENT.heartLfo=ghLfo; AMBIENT.heartLfoGain=ghLfoGain;
    } else if(mode==="combat"){
      var tier=COM?COM.tier:1;
      o1.frequency.value=400+tier*60; o2.frequency.value=500+tier*40;
      f.frequency.value=500;
      g.gain.setTargetAtTime(0.006, AC.currentTime, 0.2);
      /* latido cardíaco: sinusoide grave modulada por diente de sierra */
      var heart=AC.createOscillator();
      heart.type="sine"; heart.frequency.value=62;
      var hGain=AC.createGain(); hGain.gain.value=0;
      heart.connect(hGain); hGain.connect(AC.destination);
      heart.start();
      var hLfo=AC.createOscillator();
      hLfo.type="sawtooth"; hLfo.frequency.value=1.3;
      var hLfoGain=AC.createGain(); hLfoGain.gain.value=0.030;
      hLfo.connect(hLfoGain); hLfoGain.connect(hGain.gain);
      hLfo.start();
      hGain.gain.setTargetAtTime(0.055, AC.currentTime, 0.5);
      AMBIENT.heart=heart; AMBIENT.heartGain=hGain;
      AMBIENT.heartLfo=hLfo; AMBIENT.heartLfoGain=hLfoGain;
    } else if(mode==="flatline"){
      o1.frequency.value=50; o2.frequency.value=55;
      f.frequency.value=100;
      g.gain.setTargetAtTime(0.008, AC.currentTime, 1.5);
    }
    o1.connect(f); o2.connect(f);
    o1.start(); o2.start();
    AMBIENT.osc1=o1; AMBIENT.osc2=o2; AMBIENT.gain=g; AMBIENT.filter=f;
    AMBIENT.activeMode=mode;

    /* ruido blanco de fondo — todos los modos, muy bajo */
    var nb=getNoiseBuffer();
    if(nb){
      var ns=AC.createBufferSource();
      ns.buffer=nb; ns.loop=true;
      var nF=AC.createBiquadFilter();
      nF.type="lowpass"; nF.frequency.value=900;
      var nG=AC.createGain(); nG.gain.value=0.020;
      ns.connect(nF); nF.connect(nG); nG.connect(AC.destination);
      ns.start();
      /* LFO de volumen del ruido */
      var nLfo=AC.createOscillator();
      nLfo.type="sine"; nLfo.frequency.value=0.06;
      var nLfoG=AC.createGain(); nLfoG.gain.value=0.004;
      nLfo.connect(nLfoG); nLfoG.connect(nG.gain);
      nLfo.start();
      AMBIENT.noiseSrc=ns; AMBIENT.noiseGain=nG;
      AMBIENT.noiseLfo=nLfo; AMBIENT.noiseLfoGain=nLfoG;
    }
  }catch(e){}
}
function stopAmbient(){
  try{
    if(AMBIENT.osc1){ AMBIENT.osc1.stop(); AMBIENT.osc1.disconnect(); }
    if(AMBIENT.osc2){ AMBIENT.osc2.stop(); AMBIENT.osc2.disconnect(); }
    if(AMBIENT.osc3){ AMBIENT.osc3.stop(); AMBIENT.osc3.disconnect(); }
    if(AMBIENT.gain) AMBIENT.gain.disconnect();
    if(AMBIENT.filter) AMBIENT.filter.disconnect();
    if(AMBIENT.gain3) AMBIENT.gain3.disconnect();
    if(AMBIENT.noiseSrc){ AMBIENT.noiseSrc.stop(); AMBIENT.noiseSrc.disconnect(); }
    if(AMBIENT.noiseGain) AMBIENT.noiseGain.disconnect();
    if(AMBIENT.noiseLfo){ AMBIENT.noiseLfo.stop(); AMBIENT.noiseLfo.disconnect(); }
    if(AMBIENT.noiseLfoGain) AMBIENT.noiseLfoGain.disconnect();
    if(AMBIENT.heart){ AMBIENT.heart.stop(); AMBIENT.heart.disconnect(); }
    if(AMBIENT.heartGain) AMBIENT.heartGain.disconnect();
    if(AMBIENT.heartLfo){ AMBIENT.heartLfo.stop(); AMBIENT.heartLfo.disconnect(); }
    if(AMBIENT.heartLfoGain) AMBIENT.heartLfoGain.disconnect();
  }catch(e){}
  AMBIENT.osc1=AMBIENT.osc2=AMBIENT.osc3=null;
  AMBIENT.gain=AMBIENT.filter=AMBIENT.gain3=null;
  AMBIENT.noiseSrc=AMBIENT.noiseGain=AMBIENT.noiseLfo=AMBIENT.noiseLfoGain=null;
  AMBIENT.heart=AMBIENT.heartGain=AMBIENT.heartLfo=AMBIENT.heartLfoGain=null;
  AMBIENT.activeMode=null;
}
function updateAmbient(){
  /* la música es independiente de los otros canales */
  updateMusic();
  if(!S || S.amb!==true){ stopAmbient(); return; }
  if(combatActive && AMBIENT.activeMode!=="combat") startAmbient("combat");
  else if(inImmersion && AMBIENT.activeMode!=="grid") startAmbient("grid");
  else if(!inImmersion && !combatActive && AMBIENT.activeMode!=="street") startAmbient("street");
}
/* volumen de ruido según estrés: CPU baja + calor alto → más ruido */
function updateAmbientStress(){
  if(!S || !AMBIENT.noiseGain || !AC) return;
  var cpuRatio=clamp(S.player.cpu/S.player.maxCpu,0,1);
  var heatRatio=clamp(S.player.heat/100,0,1);
  var stress=(1-cpuRatio)*0.6+heatRatio*0.4;
  var vol=0.020+stress*0.020;
  AMBIENT.noiseGain.gain.setTargetAtTime(vol, AC.currentTime, 0.8);
  /* latido más rápido con estrés */
  if(AMBIENT.heartLfo && combatActive){
    var bpm=1.2+stress*0.8;
    AMBIENT.heartLfo.frequency.setTargetAtTime(bpm, AC.currentTime, 1.0);
  }
  /* el grid respira con la profundidad: tono más grave y latido desde la capa 3 */
  if(AMBIENT.activeMode==="grid" && inImmersion && !combatActive){
    var nd=nodeById(inImmersion.current);
    var layer=nd?nd.layer:(inImmersion.maxDepthReached||1);
    var deep=clamp((layer-1)/5,0,1);
    if(AMBIENT.osc1) AMBIENT.osc1.frequency.setTargetAtTime(160-deep*95, AC.currentTime, 1.2);
    if(AMBIENT.osc2) AMBIENT.osc2.frequency.setTargetAtTime(240-deep*130, AC.currentTime, 1.2);
    if(AMBIENT.filter) AMBIENT.filter.frequency.setTargetAtTime(240+layer*28, AC.currentTime, 1.2);
    if(AMBIENT.heartGain) AMBIENT.heartGain.gain.setTargetAtTime(layer>=3?0.018+deep*0.014:0, AC.currentTime, 1.5);
    if(AMBIENT.heartLfo) AMBIENT.heartLfo.frequency.setTargetAtTime(0.7+deep*0.5+stress*0.3, AC.currentTime, 1.5);
  }
}


/* ============================================================
   4c. MÚSICA — pistas locales opcionales (music/*.mp3)
   Si faltan los archivos, el juego sigue en silencio: la música
   nunca es un recurso obligatorio. Cada escena tiene sus pistas y
   van ROTANDO (bolsa barajada + cambio al terminar cada pista).
   ============================================================ */

var MUSIC={ el:null, scene:null, bags:{}, playing:{} };

function musicEnabled(){ return !!S && S.mus!==false; }
/* escena musical actual (histéresis en el calor para no saltar de pista) */
function musicScene(){
  if(combatActive){
    if(VAULT_PUZZLE) return "vault";
    if(COM && COM.node && COM.node.boss) return "boss";
    return "combat";
  }
  if(inImmersion){
    var heat=S?S.player.heat:0;
    if(MUSIC.scene==="gridHot") return heat>=68?"gridHot":"grid";
    return heat>=72?"gridHot":"grid";
  }
  return "ui";
}
/* bolsa barajada por escena: todas las pistas suenan antes de repetir */
function musicBag(scene){
  var arr=MUSIC_TRACKS[scene];
  if(!arr||!arr.length) return null;
  if(!MUSIC.bags[scene]||!MUSIC.bags[scene].length){
    var bag=arr.slice(),i,j,tmp;
    for(i=bag.length-1;i>0;i--){ j=randInt(0,i); tmp=bag[i]; bag[i]=bag[j]; bag[j]=tmp; }
    MUSIC.bags[scene]=bag;
  }
  return MUSIC.bags[scene];
}
function musicPickTrack(scene){
  var bag=musicBag(scene); if(!bag) return null;
  var prev=MUSIC.playing[scene], t=bag.shift();
  /* evitar la última pista de la escena Y la que suena ahora mismo (puede
     compartirse entre escenas): un cambio de escena siempre cambia de música */
  var cur=MUSIC.scene && MUSIC.playing[MUSIC.scene] ? MUSIC.playing[MUSIC.scene].t : null;
  if((t===(prev&&prev.t) || t===cur) && bag.length){ bag.push(t); t=bag.shift(); }
  return t;
}
function ensureMusicEl(){
  if(MUSIC.el) return;
  MUSIC.el=new Audio();
  MUSIC.el.preload="auto";
  /* al terminar una pista, la escena sigue: rota a la siguiente */
  MUSIC.el.addEventListener("ended", function(){
    if(!MUSIC.scene) return;
    playMusicScene(MUSIC.scene, true);
  });
}
/* reproduce una escena; rotate=true rota de pista, false reanuda la actual */
function playMusicScene(scene, rotate){
  var arr=MUSIC_TRACKS[scene];
  if(!arr||!arr.length||!musicEnabled()) return;
  /* guardar la posición de la escena anterior para reanudarla luego */
  if(MUSIC.scene && MUSIC.el && MUSIC.playing[MUSIC.scene]){
    try{ MUSIC.playing[MUSIC.scene].pos=MUSIC.el.currentTime; }catch(e){}
  }
  var rec=MUSIC.playing[scene];
  if(rotate || !rec || !rec.t){ rec={t:musicPickTrack(scene), pos:0}; MUSIC.playing[scene]=rec; }
  if(!rec.t) return;
  MUSIC.scene=scene;
  ensureMusicEl();
  try{
    var el=MUSIC.el, wantPos=rec.pos||0;
    if(el.src.indexOf(rec.t.f)<0){
      el.src=rec.t.f;
      el.loop=false;
      el.addEventListener("loadedmetadata", function onMeta(){
        el.removeEventListener("loadedmetadata", onMeta);
        try{ if(wantPos>0 && wantPos<el.duration-1) el.currentTime=wantPos; }catch(e){}
      });
    } else {
      try{ if(wantPos>0 && wantPos<el.duration-1) el.currentTime=wantPos; }catch(e){}
    }
    el.volume=rec.t.v;
    var pr=el.play();
    /* autoplay bloqueado por el navegador: reintentar en el siguiente tick */
    if(pr && pr.catch) pr.catch(function(err){ if(err && err.name==="NotAllowedError") MUSIC.scene=null; });
  }catch(e){}
}
function updateMusic(){
  if(!S) return;
  if(!musicEnabled()){
    if(MUSIC.el && !MUSIC.el.paused){ try{ MUSIC.el.pause(); }catch(e){} }
    return;
  }
  /* flatline: silencio (la pantalla de game over se queda sin música) */
  if(S.player && S.player.cpu<=0) return;
  var scene=musicScene();
  if(scene===MUSIC.scene) return;
  playMusicScene(scene, false);
}
function stopMusic(){
  if(MUSIC.scene && MUSIC.el && MUSIC.playing[MUSIC.scene]){
    try{ MUSIC.playing[MUSIC.scene].pos=MUSIC.el.currentTime; }catch(e){}
  }
  if(MUSIC.el){ try{ MUSIC.el.pause(); }catch(e){} }
  MUSIC.scene=null;
}
function toggleMusic(){
  S.mus=!S.mus;
  msg("música "+(S.mus?"activada":"desactivada")+".");
  if(!S.mus) stopMusic();
  else { MUSIC.scene=null; updateMusic(); }
  updateTopbar(); save();
}


/* ============================================================
   4d. BRILLO DE PANTALLA (LUM) — preferencia de display
   Un único filter:brightness() sobre <html> escala todo el juego
   (paneles, canvas, glow, scanlines, overlays) sin tocar la paleta
   ni crear temas. El control (50-150%) es RELATIVO a la calibración
   de fábrica BRILLO_BASE (~+28% sobre el tema base, que se veía
   oscuro en algunas pantallas): LUM 100% = fábrica. Vive en su
   PROPIA clave de localStorage — no en S —: es preferencia del
   dispositivo, sobrevive a RESET/importar y se aplica ya en el
   intro/boot. Va sobre <html> y no sobre <body> para no chocar con
   las animaciones de filter de body (heat-critical / glitch-random).
   ============================================================ */
var BRILLO_KEY="cypher_os_brillo", BRILLO_BASE=1.28;
var BRILLO_MIN=0.5, BRILLO_MAX=1.5, BRILLO_STEP=0.1;
var _brillo=loadBrillo();
function loadBrillo(){
  try{
    var v=parseFloat(localStorage.getItem(BRILLO_KEY));
    if(isNaN(v)) return 1;
    return clamp(Math.round(v*10)/10, BRILLO_MIN, BRILLO_MAX);
  }catch(e){ return 1; } /* localStorage puede fallar: brillo neutro */
}
function saveBrillo(){
  try{ localStorage.setItem(BRILLO_KEY, String(_brillo)); }catch(e){ /* el juego sigue */ }
}
function applyBrillo(){
  var el=document.documentElement;
  var real=Math.round(_brillo*BRILLO_BASE*1000)/1000;
  if(el) el.style.filter = "brightness("+real+")";
  var lbl=document.getElementById("h-brillo");
  if(lbl) lbl.textContent=Math.round(_brillo*100)+"%";
}
function setBrillo(v){
  _brillo=clamp(Math.round(v*10)/10, BRILLO_MIN, BRILLO_MAX);
  saveBrillo(); applyBrillo();
}
ACTIONS.lumDown=function(){ setBrillo(_brillo-BRILLO_STEP); };
ACTIONS.lumUp=function(){ setBrillo(_brillo+BRILLO_STEP); };


/* ============================================================
   4e. PANTALLA COMPLETA (FULL) — preferencia de display
   En una tablet las barras del navegador roban espacio al juego:
   el Fullscreen API pone el deck a pantalla completa (solo el
   juego, sin chrome del navegador). Como el brillo, la preferencia
   vive en su PROPIA clave de localStorage — no en S — y sobrevive a
   RESET e importación. El navegador exige un gesto del usuario
   para entrar en pantalla completa, así que NUNCA se fuerza al
   cargar: si la última sesión quedó en pantalla completa, se
   vuelve a entrar al pulsar ▶ COMENZAR (ese clic ES el gesto).
   Si el navegador no admite pantalla completa (p. ej. iPhone), el
   botón FULL se oculta y el comando `pantalla` lo explica: nunca
   controles muertos.
   ============================================================ */
var FS_KEY="cypher_os_full";
var _fsWants=loadFsPref();
function loadFsPref(){
  try{ return localStorage.getItem(FS_KEY)==="1"; }catch(e){ return false; } /* localStorage puede fallar: sin preferencia */
}
function saveFsPref(){
  try{ localStorage.setItem(FS_KEY,_fsWants?"1":"0"); }catch(e){ /* el juego sigue */ }
}
function fsSupported(){
  var el=document.documentElement;
  return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen));
}
function fsActive(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function enterFs(){
  var el=document.documentElement;
  var req=el && (el.requestFullscreen || el.webkitRequestFullscreen);
  if(!req) return false;
  try{
    var r=req.call(el);
    if(r && typeof r.catch==="function") r.catch(function(){ /* el navegador deniega el gesto: seguimos en ventana */ });
    return true;
  }catch(e){ return false; }
}
function exitFs(){
  var req=document.exitFullscreen || document.webkitExitFullscreen;
  if(!req) return false;
  try{
    var r=req.call(document);
    if(r && typeof r.catch==="function") r.catch(function(){ /* sin cambios */ });
    return true;
  }catch(e){ return false; }
}
function setFsWants(v){
  _fsWants=!!v; saveFsPref();
}
function updateFsIndicator(){
  var b=document.getElementById("h-fs");
  if(!b) return;
  var on=fsActive();
  b.textContent="FULL: "+(on?"ON":"OFF");
  if(on) b.classList.add("fs-on"); else b.classList.remove("fs-on");
  b.setAttribute("title", on?"salir de pantalla completa":"pantalla completa · alternar");
}
function toggleFs(){
  if(!fsSupported()){
    msg("este navegador no admite pantalla completa. en tablet, añade el deck a pantalla de inicio o usa el modo kiosco del navegador.","ambar");
    return;
  }
  if(fsActive()){
    setFsWants(false);
    if(exitFs()) msg("pantalla completa desactivada.","cyan");
  } else {
    setFsWants(true);
    if(enterFs()) msg("pantalla completa activada. sales con ESC o con el botón FULL.","cyan");
    else setFsWants(false);
  }
  updateFsIndicator();
}
ACTIONS.toggleFs=function(){ toggleFs(); };
/* el navegador puede salir de pantalla completa por su cuenta (ESC, barra
   del sistema, cambio de app): sincronizar indicador y preferencia para que
   el juego arranque como se dejó */
function onFsChange(){
  setFsWants(fsActive());
  updateFsIndicator();
}
document.addEventListener("fullscreenchange", onFsChange);
document.addEventListener("webkitfullscreenchange", onFsChange);

