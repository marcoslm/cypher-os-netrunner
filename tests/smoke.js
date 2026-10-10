/* ============================================================
   tests/smoke.js — SUITE DE HUMO de CYPHER://OS
   Ejecutar desde la raíz del proyecto:  node tests/smoke.js
   Sin dependencias (solo Node). Código de salida 0 = todo bien.

   Niveles:
     3a · carga real del juego con DOM simulado
     3b · estado, registro y renders
      2 · integridad de datos y referencias cruzadas
          (INTEL ↔ pistas ↔ unlocks, ofertas ↔ por qué ↔ parejas,
           eventos/ticker/diálogos, comandos ↔ AYUDA, botones ↔ ACTIONS, CSS)
   ============================================================ */
"use strict";
const { loadGame } = require("./harness");

let passes = 0, fails = 0, warns = 0;
function ok(cond, label){
  if(cond){ passes++; console.log("  ✔ " + label); }
  else { fails++; console.log("  ✖ FALLO: " + label); }
}
function warn(cond, label){
  if(cond){ passes++; console.log("  ✔ " + label); }
  else { warns++; console.log("  ⚠ aviso: " + label); }
}

console.log("CYPHER://OS · suite de humo — " + new Date().toISOString());

/* ---------- NIVEL 3a: carga real del juego ---------- */
console.log("\nNIVEL 3a · carga del juego con DOM simulado…");
const game = loadGame();
const { T, sandbox, src } = game;
ok(!!T, "el juego carga sin excepciones y deja internals verificables");
ok(typeof sandbox.HELP_HTML === "string" && sandbox.HELP_HTML.indexOf("⓪") >= 0,
   "HELP_HTML carga y contiene ⓪ (mundo en 30 segundos)");

/* ---------- NIVEL 3b: estado y renders ---------- */
console.log("\nNIVEL 3b · estado, registro y renders…");
T.setS(T.nuevoEstado());
let S = T.getS();
T.ensureStateIntegrity();
ok(!!S && !!S.player && Array.isArray(S.log) && Array.isArray(S.intel),
   "nuevoEstado + ensureStateIntegrity sin excepciones");
T.addLog("INTEL ▸ entrada de prueba.");
T.addLog("⚠ DAEMON CUSTODIO desintegrado.");
ok(S.log.length === 2, "addLog añade entradas");
let r = true;
try { T.renderLogEntries(""); T.renderInformes(); T.renderTrabajos(); } catch(e){ r = false; console.log("    → " + e.message); }
ok(r, "renderLogEntries / renderInformes / renderTrabajos sin excepciones");
ok(T.logCat("INTEL ▸ x") === "lore" && T.logCat("ECO DEL DECK ▸ x") === "lore" &&
   T.logCat("⚠ DAEMON A.") === "combate" && T.logCat("✓ TRABAJO COMPLETADO ▸ x") === "contratos" &&
   T.logCat("TUTORIAL ▸ x") === "sistema", "logCat clasifica las familias de mensajes");
ok(T.escapeHtml("<b>&\"</b>").indexOf("<") < 0, "escapeHtml escapa el HTML");

/* exportar diario (usa Blob/URL simulados con captura) */
sandbox.__blobs.length = 0;
T.ACTIONS.exportDiario();
ok(sandbox.__blobs.length === 1, "exportDiario genera un archivo");
const diario = sandbox.__blobs.length ? sandbox.__blobs[0].parts.join("") : "";
ok(diario.indexOf("CYPHER://OS · DIARIO DE CORVO-7") === 0, "el diario exportado tiene cabecera");
ok(diario.indexOf("INTEL ▸") >= 0 && diario.indexOf("⚠ DAEMON") >= 0, "el diario incluye las entradas del registro");

/* ---------- NIVEL 3b: diálogo de confirmación del juego ---------- */
console.log("\nNIVEL 3b · diálogo de confirmación del juego…");
ok(!/(^|[^.\w$])(alert|confirm|prompt)\s*\(/m.test(src.js),
   "el juego no usa diálogos nativos del navegador (alert / confirm / prompt)");
ok(src.html.indexOf('id="confirm-overlay"') >= 0, "el HTML define #confirm-overlay");
ok(src.css.indexOf("#confirm-overlay") >= 0, "el CSS define #confirm-overlay");
/* flujo del diálogo: abrir NO ejecuta nada, CANCELAR deja la partida intacta y
   CONFIRMAR reinicia conservando el mejor registro (CONTRACTS §15) */
{
  const sBefore = T.getS();
  sBefore.best = { level: 7 };
  sBefore.player.credits = 4321;
  let threw = false;
  try {
    T.ACTIONS.newRecord();                         /* abre el diálogo */
    ok(T.getS() === sBefore, "abrir NUEVO REGISTRO no ejecuta nada hasta responder");
    T.ACTIONS.confirmNo();                         /* cancelar */
    ok(T.getS() === sBefore && T.getS().player.credits === 4321,
       "CANCELAR deja la partida intacta");
    T.ACTIONS.newRecord();
    T.ACTIONS.confirmYes();                        /* confirmar */
  } catch(e){ threw = true; console.log("    → " + e.message); }
  ok(!threw, "el flujo del diálogo se ejecuta sin excepciones (DOM simulado)");
  const sNew = T.getS();
  ok(sNew !== sBefore && sNew.player.credits === 500, "CONFIRMAR reinicia el progreso");
  ok(!!sNew.best && sNew.best.level === 7, "CONFIRMAR conserva el mejor registro (CONTRACTS §15)");
  ok(sNew.log.some(e => /NUEVO REGISTRO/.test(e.text)), "el reinicio queda anotado en el REGISTRO");
  /* sin diálogos pendientes a medias: resolver dos veces es inocuo */
  let again = false;
  try { T.ACTIONS.confirmYes(); } catch(e){ again = true; }
  ok(!again && T.getS() === sNew, "no queda ningún diálogo pendiente por resolver");
}

/* ---------- NIVEL 2: integridad de INTEL ---------- */
console.log("\nNIVEL 2 · integridad de INTEL…");
const ids = T.INTEL.map(e => e.id);
ok(T.INTEL.length === 43, "INTEL tiene 43 entradas (35 narrativas + 8 expedientes; actual: " + T.INTEL.length + ")");
ok(new Set(ids).size === ids.length, "ids de INTEL únicos");
ok(T.INTEL.every(e => e.id && e.t && e.r && e.u && e.k && e.l), "todas las entradas tienen id/t/r/u/k/l");
ok(T.INTEL.every(e => T.RISK_TXT[e.r]), "etiquetas de riesgo válidas");
ok(T.INTEL.every(e => T.intelHint(e.id) !== "desconocido"), "todas las entradas tienen pista (invariante AU18)");
const unlockCalls = Array.from(src.js.matchAll(/unlock\("([a-z0-9_]+)"\)/g)).map(m => m[1]);
const dossierMap = game.run('PROYECTO_EXPEDIENTE');
ok(T.INTEL.every(e => e.u === 'recover_project' ? dossierMap[e.project] === e.id : unlockCalls.indexOf(e.id) >= 0),
   "cada informe tiene un unlock literal o una ruta de recuperación por proyecto");

/* desbloqueo determinista: estado máximo abre todo lo que gestiona checkUnlocks */
const S2 = T.nuevoEstado(); T.setS(S2); T.ensureStateIntegrity();
S2.player.level = 10;
S2.player.stats.maxDepth = 6; S2.player.stats.immerse = 20; S2.player.stats.ice = 20;
S2.player.stats.daemons = 10; S2.player.stats.data = 100; S2.player.stats.maxHeat = 95;
S2.player.rep = { mamaWire:5, doctorSudario:5, night0X:5, kairos:5 };
S2.history.finalDone = true;
T.checkUnlocks();
const un = new Set(S2.intel);
const external = ["fixers", "invierno", "kuro", "kuro_abandonado"]; /* se abren en acciones */
const missingUnlocks = T.INTEL.filter(e => e.u !== 'recover_project' && external.indexOf(e.id) < 0 && !un.has(e.id)).map(e => e.id);
ok(missingUnlocks.length === 0, "con estado máximo, checkUnlocks abre todos los informes" +
   (missingUnlocks.length ? " → faltan: " + missingUnlocks.join(", ") : ""));

/* ---------- NIVEL 2: ofertas, por qué y parejas ---------- */
console.log("\nNIVEL 2 · ofertas de contratos…");
const jobTypes = { mamaWire:["recoleta","carrera"], doctorSudario:["datos","rompehielas","vault"],
                   night0X:["vault","daemon","carrera"], kairos:["daemon","ice","vault"] };
let allWhy = true, vaultPairOk = true, shapeOk = true;
for(const c in jobTypes){
  for(const t of jobTypes[c]){
    const o = T.buildOffer(c, t);
    if(!o || !o.title || !o.desc) shapeOk = false;
    if(!o || !o.why){ allWhy = false; console.log("    → sin por qué: " + c + "/" + t); }
    if(o && t === "vault"){
      const corpName = o.title.substring("EL VAULT DE ".length);
      const paired = T.PROYECTO_CORP[o.project];
      if(paired){ if(corpName !== paired) vaultPairOk = false; }
      else if(corpName !== "KURO GATECH" && corpName !== "MONOLITH") vaultPairOk = false;
    }
  }
}
ok(shapeOk, "buildOffer genera ofertas con título y descripción");
ok(allWhy, "todas las ofertas llevan «por qué» en la voz del contacto");
ok(vaultPairOk, "las ofertas de vault emparejan corporación↔proyecto (PROYECTO_CORP)");
ok(T.PROYECTOS.every(p => p in T.PROYECTO_CORP), "PROYECTO_CORP cubre los 8 proyectos");
let g = true;
try { T.generateOffers(); } catch(e){ g = false; console.log("    → " + e.message); }
ok(g && S2.offers.length > 0, "generateOffers completa sin excepciones (" + S2.offers.length + " ofertas)");
let oh = true;
try { const o = T.buildOffer("mamaWire","recoleta"); T.offerHtml(o, { id:"mamaWire" }); } catch(e){ oh = false; console.log("    → " + e.message); }
ok(oh, "offerHtml renderiza sin excepciones");

/* ---------- NIVEL 2: eventos, ticker, diálogos, tienda, skill tree ---------- */
console.log("\nNIVEL 2 · eventos, ticker, diálogos y catálogos…");
ok(T.GRID_EVENTS.every(e => e.id && e.name && Array.isArray(e.texts) && e.texts.length > 0 &&
   typeof e.prob === "number" && typeof e.effect === "function"), "GRID_EVENTS con forma válida");
ok(new Set(T.GRID_EVENTS.map(e => e.id)).size === T.GRID_EVENTS.length, "ids de eventos únicos");
ok(!!T.GRID_EVENTS.find(e => e.id === "eco_deck"), "existe el evento ECO DEL DECK");
ok(T.TICKER_FRASES.every(it => typeof it === "string" || (it && it.t && typeof it.when === "function")),
   "ticker: strings o {t,when} válidos");
let allStr = true;
for(let i = 0; i < 200; i++){ if(typeof T.pickTicker() !== "string") allStr = false; }
ok(allStr, "pickTicker siempre devuelve string (200 sorteos)");
const fondo = T.TICKER_FRASES.filter(it => typeof it !== "string");
S2.player.stats.maxDepth = 3;
const before = fondo.map(f => f.when());
S2.player.stats.maxDepth = 6;
const after = fondo.map(f => f.when());
ok(fondo.length === 3 && before.every(v => v === false) && after.every(v => v === true),
   "las frases del FONDO DEL SUEÑO solo suenan tras haber tocado la capa 6");
let dlgOk = true;
for(const k in T.CONTACT_DIALOGUES){
  const tiers = T.CONTACT_DIALOGUES[k];
  if(!Array.isArray(tiers) || tiers.length < 1) dlgOk = false;
  tiers.forEach(t => { if(!Array.isArray(t) || t.length < 1 || t.some(s => typeof s !== "string" || !s)) dlgOk = false; });
}
ok(dlgOk, "CONTACT_DIALOGUES: niveles y variantes de texto válidos");
ok(T.TIENDA_DEF.every(i => i.id && i.name && i.desc && i.price > 0 && i.stock >= 1 && i.kind),
   "TIENDA_DEF con forma válida");
ok(Array.isArray(T.SKILL_TREE) && T.SKILL_TREE.length > 0, "SKILL_TREE presente");

/* ---------- NIVEL 2: comandos ↔ AYUDA y botones ↔ handlers ---------- */
console.log("\nNIVEL 2 · comandos, botones y estilos…");
const cmdKeys = Object.keys(T.CMD);
const helpWords = ["red","net","dip","superficie","contactos","contact","trabajos","jobs","tienda","shop",
  "stats","estado","intel","informes","log","registro","salir","back","nucleo","sonido","snd","musica",
  "music","mus","ambiente","amb","brillo","lum","brightness","pantalla","full","fs","expediente","quien","diario",
  "ajustes","config","glosario","mundo","guardar","clear","cls","whoami","tiempo","ayuda","help","?","mensajes","buzon","mail","responder"];
const cmdsMissing = helpWords.filter(w => cmdKeys.indexOf(w) < 0);
ok(cmdsMissing.length === 0, "todos los comandos documentados en AYUDA existen en CMD" +
   (cmdsMissing.length ? " → faltan: " + cmdsMissing.join(", ") : ""));
let cmdsRun = true;
for(const k of cmdKeys){
  try { T.CMD[k]("mama wire"); } catch(e){ cmdsRun = false; console.log("    → comando falla: " + k + " → " + e.message); }
}
ok(cmdsRun, "todos los comandos ejecutan sin excepción (DOM simulado)");
const acts = new Set(Array.from((src.js + src.html + src.help).matchAll(/data-action="([a-zA-Z]+)"/g)).map(m => m[1]));
const defined = new Set(Array.from(src.js.matchAll(/ACTIONS\.([a-zA-Z]+)\s*=/g)).map(m => m[1]));
const missingActs = Array.from(acts).filter(a => !defined.has(a));
ok(missingActs.length === 0, "todo data-action tiene handler en ACTIONS" +
   (missingActs.length ? " → faltan: " + missingActs.join(", ") : ""));
["intel-k","offer-why","type-cursor","log-filters","log-chip","caretBlink","quick-btn"].forEach(c =>
  ok(src.css.indexOf(c) >= 0, "CSS define " + c));

/* ---------- NIVEL 2: mensajería (bandeja del deck) ---------- */
console.log("\nNIVEL 2 · mensajería (bandeja del deck)…");
ok(Array.isArray(T.MENSAJES_DEF) && T.MENSAJES_DEF.length === 18,
   "MENSAJES_DEF con 18 cartas (actual: " + T.MENSAJES_DEF.length + ")");
ok(new Set(T.MENSAJES_DEF.map(m => m.id)).size === T.MENSAJES_DEF.length, "ids de cartas únicos");
ok(T.MENSAJES_DEF.every(m => m.id && m.from && m.t && m.l && typeof m.when === "function" && m.emisor),
   "cartas con id/from/t/l/when/emisor");
ok(T.MENSAJES_DEF.every(m => ["valido","no-valido","enmascarado"].indexOf(m.emisor) >= 0),
   "estados de emisor válidos (la no-respuesta es ficción: quemó su ruta)");
/* llegada determinista, idempotente y anti-spam */
const S3 = T.nuevoEstado(); T.setS(S3); T.ensureStateIntegrity();
ok(Array.isArray(S3.mensajes) && S3.mensajes.length === 0,
   "nuevoEstado + ensureStateIntegrity crean la bandeja vacía (migración de guardados)");
T.checkMensajes();
ok(S3.mensajes.length === 0, "sin triggers activos no llega ninguna carta");
S3.jobs.push({ id:"x", done:false });       /* trigger: primer encargo */
T.checkMensajes();
ok(S3.mensajes.length === 1 && S3.mensajes[0].leido === false && T.unreadMsgCount() === 1,
   "el trigger entrega la primera carta (sin leer)");
T.checkMensajes();
ok(S3.mensajes.length === 1, "anti-spam: sin separación no llega otra carta");
S3.player.stats.totalPlayTime = 100;        /* supera la separación */
S3.player.stats.jobsCompleted = 5;
T.checkMensajes(); T.checkMensajes();
ok(S3.mensajes.length <= 3 && new Set(S3.mensajes.map(m => m.id)).size === S3.mensajes.length,
   "idempotente: cada carta una sola vez y máx. 1 por llamada");
S3.mensajes.forEach(mm => T.ACTIONS.openMsg({ getAttribute(k){ return k === "data-id" ? mm.id : null; } }));
ok(S3.mensajes.every(mm => mm.leido === true) && T.unreadMsgCount() === 0,
   "abrir una carta la marca como leída y vacía el contador de no leídas");
let rm = true;
try { T.renderMensajes(); } catch(e){ rm = false; console.log("    → " + e.message); }
ok(rm, "renderMensajes sin excepciones");
ok(T.emisorLine({ emisor:"valido", from:"X" }).indexOf("sin respuesta") >= 0 &&
   T.emisorLine({ emisor:"no-valido", from:"X" }).indexOf("ruta desechable") >= 0,
   "el pie de la carta explica la no-respuesta según el emisor");
/* logros del buzón (Fase 2) */
ok(Array.isArray(T.ACHIEVEMENTS) && T.ACHIEVEMENTS.length === 26,
   "ACHIEVEMENTS con 26 hazañas (actual: " + T.ACHIEVEMENTS.length + ")");
ok(new Set(T.ACHIEVEMENTS.map(a => a.id)).size === T.ACHIEVEMENTS.length, "ids de logros únicos");
ok(T.ACHIEVEMENTS.every(a => a.id && a.name && a.icon && a.desc && typeof a.check === "function"),
   "logros con id/name/icon/desc/check");
ok(!!T.ACHIEVEMENTS.find(a => a.id === "mailCartografo") && !!T.ACHIEVEMENTS.find(a => a.id === "mailMadrugada"),
   "logros del buzón presentes");
ok(!T.buzonRemitenteCompleto(), "CARTÓGRAFO exige 3+ cartas del mismo remitente");
S3.mensajes.push({ id:"m_mw_ofertas", hora:0, leido:false });
ok(!T.buzonRemitenteCompleto(), "CARTÓGRAFO exige que estén todas leídas");
T.ACTIONS.openMsg({ getAttribute(k){ return k === "data-id" ? "m_mw_ofertas" : null; } });
ok(T.buzonRemitenteCompleto(), "CARTÓGRAFO se gana al leer 3+ del mismo remitente");
const nightBefore = S3.player.stats.msgsAtNight || 0;
S3.clock = 60; /* 01:00: madrugada diegética */
S3.mensajes.push({ id:"m_sd_fracaso", hora:60, leido:false });
T.ACTIONS.openMsg({ getAttribute(k){ return k === "data-id" ? "m_sd_fracaso" : null; } });
ok((S3.player.stats.msgsAtNight || 0) === nightBefore + 1 &&
   T.ACHIEVEMENTS.find(a => a.id === "mailMadrugada").check(),
   "CORREO DE LAS 4: abrir de madrugada cuenta en stats y cumple el logro");
ok(sandbox.HELP_HTML.indexOf("26 hazañas") >= 0, "AYUDA cuadra el recuento de hazañas (26)");
/* Fase 3: respuestas binarias, informes sueltos y cruces INTEL↔bandeja */
const withReply = T.MENSAJES_DEF.filter(m => m.reply);
const docsSueltos = T.MENSAJES_DEF.filter(m => m.doc);
ok(withReply.length === 3, "3 cartas admiten respuesta binaria (actual: " + withReply.length + ")");
ok(withReply.every(m => m.reply.length === 2 && m.reply.every(o => o.label && "xp" in o && ("resp" in o))),
   "cada respuesta tiene 2 opciones con label/xp/resp");
ok(docsSueltos.length === 3 && docsSueltos.every(m => m.l.indexOf("DOCUMENTO ADJUNTO") >= 0),
   "3 informes sueltos con estética de documento (sin caja cifrada)");
S3.mensajes.push({ id:"m_n0x_presentacion", hora:0, leido:false });
T.ACTIONS.replyMsg({ getAttribute(k){ return k === "data-id" ? "m_n0x_presentacion" : (k === "data-opt" ? "0" : null); } });
const nx = S3.mensajes.find(m => m.id === "m_n0x_presentacion");
ok(nx && nx.replyTo === 0 && nx.respuesta && nx.respuesta.indexOf("RETORNO") < 0,
   "contestar a un emisor válido devuelve respuesta real (sin rebote)");
ok((S3.player.stats.msgsVoidReplies || 0) === 0,
   "responder a un emisor válido no cuenta como envío sin ruta");
S3.mensajes.push({ id:"m_gracias_reparacion", hora:0, leido:false });
T.ACTIONS.replyMsg({ getAttribute(k){ return k === "data-id" ? "m_gracias_reparacion" : (k === "data-opt" ? "0" : null); } });
const gr = S3.mensajes.find(m => m.id === "m_gracias_reparacion");
ok(gr && gr.replyTo === 0 && gr.respuesta && gr.respuesta.indexOf("RETORNO") >= 0,
   "contestar a un emisor sin ruta devuelve el envío (rebote diegético)");
ok((S3.player.stats.msgsVoidReplies || 0) === 1 &&
   T.ACHIEVEMENTS.find(a => a.id === "mailQuienFirma").check(),
   "«¿QUIÉN FIRMA?» se gana al contestar lo que no admite respuesta");
T.ACTIONS.replyMsg({ getAttribute(k){ return k === "data-id" ? "m_gracias_reparacion" : (k === "data-opt" ? "0" : null); } });
ok(S3.mensajes.find(m => m.id === "m_gracias_reparacion").replyTo === 0 &&
   (S3.player.stats.msgsVoidReplies || 0) === 1, "no se puede responder dos veces a la misma carta");
T.checkUnlocks();
ok(S3.intel.indexOf("tras_nucleo") >= 0, "cruce bandeja→INTEL: la carta desbloquea TRAS EL NÚCLEO");
ok(src.js.indexOf('["inicio","red","contactos","mensajes"') >= 0,
   "MENSAJES en VIEW_ORDER (Ctrl+4 abre la bandeja)");
ok(src.html.indexOf('data-view="mensajes"') >= 0 && src.html.indexOf("notif-mensajes") >= 0,
   "botón MENSAJES y su notif-dot presentes en el HTML");
ok(sandbox.HELP_HTML.indexOf("⑱") >= 0, "AYUDA documenta la bandeja (⑱)");

/* ---------- unidades del arnés + regresiones (mismo proceso, sin pipes) ---------- */
async function finish(){
  /* Los bucles legítimos del juego no deben mantener Node vivo. No ejecutar
     callbacks para vaciarlo: dispose conserva el informe de pendientes. */
  game.dispose();
  const harness = await require("./harness.test").run({summary:true});
  const regressions = await require("./regressions").run({summary:true});
  const jobs = await require("./jobs-persistence").run({summary:true});
  const gridIntel = await require("./grid-intel-hud").run({summary:true});
  const messages = await require("./message-typewriter").run({summary:true});
  const music = await require("./music").run({summary:true});
  const controls = await require("./controls").run({summary:true});
  const vaults = await require("./vault-offers").run({summary:true});
  const fixers = await require("./fixer-offers").run({summary:true});
  const layout = await require("./grid-layout").run({summary:true});
  const saveTools = await require("./save-tools").run({summary:true});
  const sidebar = await require("./sidebar").run({summary:true});
  const motion = await require("./motion-status").run({summary:true});
  const difficulty = await require("./difficulty-live").run({summary:true});
  const intro = await require("./intro-return").run({summary:true});
  const introFs = await require("./intro-fullscreen").run({summary:true});
  const reports = await require("./achievements-reports").run({summary:true});
  const wealth = await require("./achievements-credits").run({summary:true});
  const entry = await require("./entry-input-lock").run({summary:true});
  const totalFails = fails + harness.fails + regressions.fails + jobs.fails + gridIntel.fails + messages.fails + music.fails + controls.fails + vaults.fails + fixers.fails + layout.fails + saveTools.fails + sidebar.fails + motion.fails + difficulty.fails + intro.fails + introFs.fails + reports.fails + wealth.fails + entry.fails;
  console.log("\n================ RESUMEN ================");
  console.log("humo: " + passes + " correctas · arnés: " + harness.passes + "/" + harness.total +
    " · regresiones: " + regressions.passes + "/" + regressions.total + " · trabajos/persistencia: " + jobs.passes + "/" + jobs.total + " · expedientes/HUD: " + gridIntel.passes + "/" + gridIntel.total + " · avisos: " + messages.passes + "/" + messages.total + " · música: " + music.passes + "/" + music.total + " · controles: " + controls.passes + "/" + controls.total + " · vaults/ofertas: " + vaults.passes + "/" + vaults.total + " · fixers/ofertas: " + fixers.passes + "/" + fixers.total + " · grid/layout: " + layout.passes + "/" + layout.total + " · partida/menú: " + saveTools.passes + "/" + saveTools.total + " · lateral: " + sidebar.passes + "/" + sidebar.total + " · movimiento: " + motion.passes + "/" + motion.total + " · dificultad: " + difficulty.passes + "/" + difficulty.total + " · intro: " + intro.passes + "/" + intro.total + " · intro-fullscreen: " + introFs.passes + "/" + introFs.total + " · logros/informes: " + reports.passes + "/" + reports.total + " · logros/créditos: " + wealth.passes + "/" + wealth.total + " · entrada/bloqueo: " + entry.passes + "/" + entry.total);
  console.log("correctas: " + (passes + harness.passes + regressions.passes + jobs.passes + gridIntel.passes + messages.passes + music.passes + controls.passes + vaults.passes + fixers.passes + layout.passes + saveTools.passes + sidebar.passes + motion.passes + difficulty.passes + intro.passes + introFs.passes + reports.passes + wealth.passes + entry.passes) + " · fallos: " + totalFails + " · avisos: " + warns);
  process.exitCode = totalFails ? 1 : 0;
}
finish().catch(function(err){
  console.error("suite interrumpida:", err);
  try { game.dispose(); } catch(cleanupError){ console.error("cleanup:", cleanupError); }
  process.exitCode = 1;
});
