/* ============================================================
   tests/harness.js — ARNÉS DE PRUEBAS de CYPHER://OS (reutilizable)
   DOM/navegador simulado + carga REAL del juego en un sandbox de Node,
   con acceso a los globals del juego para poder probar la lógica.

   Uso desde cualquier prueba:
     const { loadGame } = require("./harness");
     const { T, sandbox, src } = loadGame();   // T = internals del juego

   El juego son varios <script> clásicos con ámbito global compartido
   (cypher_os_help.js + los .js en su orden de carga); aquí se ejecutan
   en el mismo contexto de vm, igual que en el navegador.

   No forma parte del juego (el juego no depende de Node). Sin dependencias.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
/* orden de carga real (ver AGENTS.md §4): data → core → audio → grid → combat → ui */
const JS_FILES = ["cypher_os_data.js", "cypher_os_core.js", "cypher_os_audio.js",
                  "cypher_os_grid.js", "cypher_os_combat.js", "cypher_os_ui.js"];
const FILES = { help:"cypher_os_help.js", css:"cypher_os.css", html:"cypher_os.html", js:JS_FILES };

/* objeto "mágico": absorbe cualquier propiedad/método (canvas 2D, estilos…) */
function magic(){
  const fn = function(){ return proxy; };
  const proxy = new Proxy(fn, {
    get(t, p){ if(p === Symbol.toPrimitive) return function(){ return 0; }; return proxy; },
    set(){ return true; },
    apply(){ return proxy; }
  });
  return proxy;
}

function fakeEl(tag){
  return {
    tagName: tag || "div", style:{}, dataset:{}, children:[],
    innerHTML:"", textContent:"", value:"", width:0, height:0, href:"", download:"",
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){},
    insertBefore(){}, setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    focus(){}, click(){}, blur(){}, scrollIntoView(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    insertAdjacentText(){}, insertAdjacentHTML(){}, closest(){ return null; },
    getContext(){ return magic(); },
    getBoundingClientRect(){ return { left:0, top:0, width:0, height:0 }; }
  };
}

function readSources(){
  const jsFiles = {};
  JS_FILES.forEach(f => { jsFiles[f] = fs.readFileSync(path.join(ROOT, f), "utf8"); });
  return {
    js:   JS_FILES.map(f => jsFiles[f]).join("\n"),
    jsFiles,
    help: fs.readFileSync(path.join(ROOT, FILES.help), "utf8"),
    css:  fs.readFileSync(path.join(ROOT, FILES.css), "utf8"),
    html: fs.readFileSync(path.join(ROOT, FILES.html), "utf8")
  };
}

function createSandbox(){
  const elements = {};
  const blobs = [];
  const sandbox = {
    console, Math, JSON, Date, RegExp, String, Number, Array, Object, Boolean, Error, Symbol,
    isNaN, parseInt, parseFloat, undefined,
    setTimeout, clearTimeout, setInterval, clearInterval,
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){},
    document:{
      getElementById(id){ if(!elements[id]) elements[id] = fakeEl(); return elements[id]; },
      querySelector(){ return null; },
      querySelectorAll(){ return []; },
      createElement(t){ return fakeEl(t); },
      addEventListener(){}, removeEventListener(){},
      body: fakeEl("body"), documentElement: fakeEl("html"), title: "tests"
    },
    navigator:{ userAgent:"cypher-os-tests" },
    localStorage:{ _d:{}, getItem(k){ return this._d[k] || null; }, setItem(k,v){ this._d[k] = String(v); }, removeItem(k){ delete this._d[k]; } },
    confirm(){ return true; }, alert(){}, prompt(){ return ""; },
    requestAnimationFrame(){ return 0; }, cancelAnimationFrame(){},
    getComputedStyle(){ return magic(); },
    innerWidth:1280, innerHeight:720, devicePixelRatio:1, scrollTo(){},
    URL:{ createObjectURL(){ return "blob:test"; }, revokeObjectURL(){} },
    /* Blob con captura: las pruebas inspeccionan sandbox.__blobs */
    Blob: function(parts, opts){ this.parts = parts || []; this.opts = opts; blobs.push(this); },
    Audio: function(){ return { play(){}, pause(){}, cloneNode(){ return this; },
      addEventListener(){}, remove(){}, canPlayType(){ return ""; }, load(){}, volume:1 }; },
    FileReader: function(){},
    matchMedia(){ return { matches:false, addEventListener(){}, addListener(){} }; },
    performance:{ now(){ return Date.now(); } }
  };
  sandbox.__blobs = blobs;
  sandbox.__elements = elements;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

/* internals expuestos al terminar la carga (inocuo: solo se inyecta en las pruebas).
   Con ámbito global compartido basta ejecutarlo al final: ve todos los globals. */
const INJECT = `
;window.__T={getS:function(){return S;},setS:function(v){S=v;},setInm:function(v){inImmersion=v;},
 INTEL:INTEL,GRID_EVENTS:GRID_EVENTS,TICKER_FRASES:TICKER_FRASES,CONTACT_DIALOGUES:CONTACT_DIALOGUES,
 WHY_JOBS:WHY_JOBS,CMD:CMD,ACTIONS:ACTIONS,RISK_TXT:RISK_TXT,PROYECTO_CORP:PROYECTO_CORP,
 MENSAJES_DEF:MENSAJES_DEF,checkMensajes:checkMensajes,msgDef:msgDef,msgReceived:msgReceived,
 unreadMsgCount:unreadMsgCount,renderMensajes:renderMensajes,emisorLine:emisorLine,
 ACHIEVEMENTS:ACHIEVEMENTS,buzonRemitenteCompleto:buzonRemitenteCompleto,
 CORPORACIONES:CORPORACIONES,PROYECTOS:PROYECTOS,SKILL_TREE:SKILL_TREE,TIENDA_DEF:TIENDA_DEF,
 intelHint:intelHint,logCat:logCat,pickWhy:pickWhy,pickTicker:pickTicker,buildOffer:buildOffer,
 nuevoEstado:nuevoEstado,ensureStateIntegrity:ensureStateIntegrity,checkUnlocks:checkUnlocks,
 generateOffers:generateOffers,addLog:addLog,renderLogEntries:renderLogEntries,
 renderInformes:renderInformes,renderTrabajos:renderTrabajos,offerHtml:offerHtml,
 unlock:unlock,escapeHtml:escapeHtml,timeStr:timeStr,clamp:clamp,pickFresh:pickFresh};
`;

function loadGame(){
  const src = readSources();
  const sandbox = createSandbox();
  const ctx = vm.createContext(sandbox);
  const run = (code, name) => vm.runInContext(code, ctx, { filename:name });
  run(src.help, FILES.help);
  JS_FILES.forEach(f => run(src.jsFiles[f], f));
  run(INJECT, "harness-inject");
  return { T: sandbox.window.__T, sandbox, src };
}

module.exports = { loadGame, readSources, createSandbox, magic, fakeEl, ROOT, FILES };
