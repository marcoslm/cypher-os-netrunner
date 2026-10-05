/* Unidades del arnés, no assertions de gameplay ni sustituto de E2E/CSS. */
"use strict";
const assert = require("node:assert/strict");
const {loadGame,createSandbox,createClock,createStorage,audioModel} = require("./harness");

async function run(options = {}){
  let passes=0, fails=0;
  const resources=[];
  const keep=resource => { resources.push(resource); return resource; };
  const sandbox=opts => keep(createSandbox({timers:"virtual",strictDOM:true,...opts}));
  const game=opts => keep(loadGame({timers:"virtual",...opts}));
  async function check(label,fn){
    let error;
    try { await fn(); } catch(err){ error=err; }
    finally {
      for(const resource of resources.splice(0)){
        try { (resource.__dispose || resource.dispose)(); }
        catch(err){ if(!error) error=err; else console.error("cleanup:",err); }
      }
    }
    if(error){ fails++; console.log("  ✖ " + label + ": " + error.message); }
    else { passes++; console.log("  ✔ " + label); }
  }
  console.log("\nARNÉS · unidades de DOM/eventos, reloj y aislamiento…");

  await check("captura, target y burbujeo siguen el árbol hasta window",() => {
    const sb=sandbox({html:'<div id="parent"><button id="child">click</button></div>'});
    const doc=sb.document, parent=doc.getElementById("parent"), child=doc.getElementById("child"), calls=[];
    for(const [node,label] of [[sb,"window"],[doc,"document"],[parent,"parent"],[child,"child"]]){
      for(const capture of [true,false]) node.addEventListener("test",function(e){
        calls.push(label+":"+(capture?"capture":"bubble"));
        assert.equal(this,node); assert.equal(e.currentTarget,node); assert.equal(e.target,child);
        assert.equal(e.eventPhase,node===child?2:capture?1:3);
      },capture);
    }
    const event=new sb.Event("test",{bubbles:true});
    assert.equal(child.dispatchEvent(event),true);
    assert.deepEqual(calls,["window:capture","document:capture","parent:capture","child:capture","child:bubble","parent:bubble","document:bubble","window:bubble"]);
    assert.deepEqual(event.composedPath(),[child,parent,doc.body,doc.documentElement,doc,sb]);
    assert.equal(event.currentTarget,null); assert.equal(event.eventPhase,0);
  });

  await check("remove distingue capture y no duplica callback+capture",() => {
    const sb=sandbox(), target=sb.document.body, phases=[];
    const fn=e => phases.push(e.eventPhase);
    target.addEventListener("test",fn,true);
    target.addEventListener("test",fn,false);
    target.addEventListener("test",fn,{capture:true,once:true});
    target.removeEventListener("test",fn,false);
    target.dispatchEvent(new sb.Event("test"));
    target.dispatchEvent(new sb.Event("test"));
    assert.deepEqual(phases,[2,2],"la segunda alta no cambia once del listener existente");
    target.removeEventListener("test",fn,{capture:true});
    target.dispatchEvent(new sb.Event("test"));
    assert.deepEqual(phases,[2,2]);
  });

  await check("once se elimina antes de reentrar y admite handleEvent",() => {
    const sb=sandbox(), target=sb.document.body;
    let once=0, handled=0;
    target.addEventListener("test",() => { once++; target.dispatchEvent(new sb.Event("test")); },{once:true});
    target.addEventListener("test",{handleEvent(){handled++;}});
    target.dispatchEvent(new sb.Event("test"));
    target.dispatchEvent(new sb.Event("test"));
    assert.equal(once,1); assert.equal(handled,3);
  });

  await check("listeners quitados durante dispatch no se llaman; altas esperan",() => {
    const sb=sandbox(), target=sb.document.body, calls=[];
    const removed=() => calls.push("removed"), added=() => calls.push("added");
    target.addEventListener("test",() => {calls.push("first");target.removeEventListener("test",removed);target.addEventListener("test",added);});
    target.addEventListener("test",removed);
    target.dispatchEvent(new sb.Event("test"));
    assert.deepEqual(calls,["first"]);
    target.dispatchEvent(new sb.Event("test"));
    assert.deepEqual(calls,["first","first","added"]);
  });

  await check("stopPropagation conserva hermanos; immediate corta los restantes",() => {
    const sb=sandbox(), target=sb.document.body, calls=[];
    sb.document.addEventListener("stop",() => calls.push("document"));
    target.addEventListener("stop",e => {calls.push("capture");e.stopPropagation();},true);
    target.addEventListener("stop",() => calls.push("target"));
    target.dispatchEvent(new sb.Event("stop",{bubbles:true}));
    assert.deepEqual(calls,["capture","target"]);
    target.addEventListener("immediate",e => {calls.push("immediate");e.stopImmediatePropagation();});
    target.addEventListener("immediate",() => calls.push("unreachable"));
    target.dispatchEvent(new sb.Event("immediate",{bubbles:true}));
    assert.deepEqual(calls,["capture","target","immediate"]);
    sb.document.addEventListener("plain",() => calls.push("bubble"));
    target.dispatchEvent(new sb.Event("plain"));
    assert.equal(calls.includes("bubble"),false);
  });

  await check("cancelable/passive y helpers exponen preventDefault real",() => {
    const sb=sandbox(), target=sb.document.body;
    target.addEventListener("passive",e => e.preventDefault(),{passive:true});
    const passive=new sb.Event("passive",{cancelable:true});
    assert.equal(target.dispatchEvent(passive),true); assert.equal(passive.defaultPrevented,false);
    target.addEventListener("cancel",e => e.preventDefault());
    assert.equal(target.dispatchEvent(new sb.Event("cancel")),true);
    assert.equal(target.dispatchEvent(new sb.Event("cancel",{cancelable:true})),false);
    assert.equal(sb.__emitDocument("cancel"),true);
    assert.equal(sb.__emitElement(target,"cancel").defaultPrevented,true);
  });

  await check("errores de handlers se propagan y restablecen estado de dispatch",() => {
    const sb=sandbox(), target=sb.document.body, failure=new Error("handler failure");
    const fn=() => {throw failure;}, event=new sb.Event("test");
    target.addEventListener("test",fn);
    assert.throws(() => target.dispatchEvent(event),err => err===failure);
    assert.equal(event.currentTarget,null); assert.equal(event.eventPhase,0);
    target.removeEventListener("test",fn);
    assert.equal(target.dispatchEvent(event),true);
  });

  await check("foco emite focusin/out y blur, sin pretender layout de navegador",() => {
    const sb=sandbox({html:'<input id="a"><button id="b">B</button>'}), doc=sb.document;
    const a=doc.getElementById("a"), b=doc.getElementById("b"), calls=[];
    a.addEventListener("focus",() => calls.push("focus:a"));
    a.addEventListener("blur",() => calls.push("blur:a"));
    doc.addEventListener("focusin",e => calls.push("in:"+e.target.id),true);
    doc.addEventListener("focusout",e => {if(e.target.id) calls.push("out:"+e.target.id);});
    a.focus(); a.focus(); b.focus(); b.blur();
    assert.equal(doc.activeElement,doc.body);
    assert.deepEqual(calls,["focus:a","in:a","blur:a","out:a","in:b","out:b"]);
    b.disabled=true; b.focus(); assert.equal(doc.activeElement,doc.body);
  });

  await check("classList, atributos, dataset y selectores tienen estado observable",() => {
    const sb=sandbox({html:'<section id="wrap"><button id="b" class="a" data-action="test">B</button></section>'});
    const doc=sb.document, b=doc.getElementById("b"), wrap=doc.getElementById("wrap");
    b.classList.add("a","b"); assert.equal(b.className,"a b");
    assert.equal(b.classList.toggle("b"),false); assert.equal(b.classList.toggle("c",true),true);
    b.className="x y"; assert.equal(b.classList.contains("a"),false);
    assert.equal(b.classList.replace("x","z"),true); assert.deepEqual(Array.from(b.classList),["z","y"]);
    b.setAttribute("data-test-id",0); assert.equal(b.dataset.testId,"0");
    b.dataset.testId=""; assert.equal(b.getAttribute("data-test-id"),"");
    delete b.dataset.testId; assert.equal(b.getAttribute("data-test-id"),null);
    assert.equal(b.closest("section"),wrap); assert.equal(wrap.contains(b),true);
    assert.equal(doc.querySelector('section button[data-action="test"]'),b);
    assert.deepEqual(wrap.querySelectorAll('button:not([disabled]),input'),[b]);
    b.disabled=true; assert.deepEqual(wrap.querySelectorAll('button:not([disabled])'),[]);
    assert.throws(() => b.matches("button:hover"),/unsupported harness selector/);
  });

  await check("strict DOM no fabrica ids y descarta nodos quitados/reemplazados",() => {
    const sb=sandbox({html:'<div id="wrap"><input id="old" value="abc"></div>'}), doc=sb.document;
    assert.equal(doc.getElementById("missing"),null); assert.equal(doc.getElementById(""),null);
    const wrap=doc.getElementById("wrap"), old=doc.getElementById("old");
    assert.equal(old.value,"abc"); old.focus(); wrap.innerHTML='<button id="new">N &amp; 1</button>';
    assert.equal(doc.getElementById("old"),null); assert.equal(old.isConnected,false);
    assert.equal(doc.activeElement,doc.body); assert.equal(doc.getElementById("new").textContent,"N & 1");
    const next=doc.getElementById("new"); next.id="renamed";
    assert.equal(doc.getElementById("new"),null); assert.equal(doc.getElementById("renamed"),next);
    next.remove(); assert.equal(doc.getElementById("renamed"),null);
    assert.throws(() => sb.__emitElement("missing","click"),/missing event target/);
  });

  await check("canvas requiere modo/factory intencional; APIs no soportadas fallan",() => {
    const strict=sandbox(), el=strict.document.createElement("canvas");
    assert.throws(() => el.getContext("2d"),/unexpected canvas context/);
    assert.throws(() => strict.document.body.getContext("2d"),/non-canvas/);
    const stub=sandbox({canvas:"stub"}), canvas=stub.document.createElement("canvas"), ctx=canvas.getContext("2d");
    assert.equal(canvas.getContext("2d"),ctx); assert.equal(typeof ctx.measureText("00").width,"number");
    ctx.fillRect(1,2,3,4); assert.deepEqual(ctx.calls,[{method:"fillRect",args:[1,2,3,4]}]);
    assert.throws(() => ctx.notAnAPI(),TypeError); assert.throws(() => canvas.getContext("webgl"),/unexpected/);
    assert.equal(sandbox({canvas:"none"}).document.createElement("canvas").getContext("2d"),null);
    const context={intentional:true}, custom=sandbox({canvasFactory:() => context});
    assert.equal(custom.document.createElement("canvas").getContext("2d"),context);
  });

  await check("loadGame conserva T/sandbox/src, añade run y compatibilidad explícita",() => {
    const g=keep(loadGame());
    assert.equal(g.sandbox,g.sb); assert.equal(g.clock.mode,"real"); assert.ok(g.T && g.src.js && g.src.html);
    assert.equal(g.T.nuevoEstado().player.credits,500); assert.equal(g.run("S"),null);
    assert.ok(g.sb.document.getElementById("compat-only"));
    assert.equal(g.sb.document.getElementById("compat-only"),g.sb.document.getElementById("compat-only"));
    assert.ok(g.sb.document.getElementById("gridcanvas").getContext("2d"));
    const strict=game({strictDOM:true,canvas:"stub"});
    assert.equal(strict.sb.document.getElementById("compat-only"),null);
    assert.equal(strict.T.CMD,strict.run("CMD"));
  });

  await check("seed reproduce sorteos y Math modificado no contamina Node/otra partida",() => {
    const original=Math.random, a=game({seed:"corvo"}), b=game({seed:"corvo"}), c=game({seed:"other"});
    const draws=g => Array.from(g.run("Array.from({length:8},function(){return Math.random();})"));
    const first=draws(a); assert.deepEqual(first,draws(b)); assert.notDeepEqual(first,draws(c));
    assert.ok(first.every(n => n>=0 && n<1));
    a.run("Math.random=function(){return 0;};Math.PI=1;");
    assert.equal(Math.random,original); assert.equal(Math.PI,Math.acos(-1));
    assert.equal(a.run("Math.random()"),0); assert.notEqual(b.run("Math.random()"),0);
    assert.equal(b.run("Math.floor(2.9)"),2);
  });

  await check("advance coordina Date/performance, orden, intervalos y argumentos",() => {
    const sb=sandbox({now:2087000}), clock=sb.__clock, calls=[];
    const interval=sb.setInterval(() => calls.push(["interval",sb.Date.now(),sb.performance.now()]),5);
    const first=sb.setTimeout((a,b) => {calls.push([a+b,sb.Date.now(),sb.performance.now()]);sb.setTimeout(() => calls.push(["nested",sb.Date.now(),sb.performance.now()]),0);},10,"A","B");
    sb.setTimeout(() => {calls.push(["last",sb.Date.now(),sb.performance.now()]);sb.clearInterval(interval);},10);
    assert.equal(clock.pending(),3); assert.deepEqual(clock.ids(10),[first,first+1]);
    assert.equal(clock.advance(4),0); assert.equal(clock.advance(6),5);
    assert.deepEqual(calls,[["interval",2087005,5],["interval",2087010,10],["AB",2087010,10],["last",2087010,10],["nested",2087010,10]]);
    assert.equal(clock.pending(),0); assert.equal(new sb.Date().getTime(),2087010);
    assert.equal(new sb.Date(0).getTime(),0); assert.equal(sb.Date.UTC(1970,0,1),0);
    assert.equal(sb.Date.now(),sb.performance.timeOrigin+sb.performance.now());
    assert.equal(sb.Date(),new Date(sb.Date.now()).toString());
  });

  await check("ids/fire/list, clear cruzado y rAF son reutilizables y no exponen fn",() => {
    const sb=sandbox(), clock=sb.__clock, calls=[];
    const cancelled=sb.setTimeout(() => calls.push("cancelled"),30);
    sb.clearInterval(cancelled); assert.equal(clock.fire(cancelled),false);
    const one=sb.setTimeout(() => calls.push("one"),20), interval=sb.setInterval(() => calls.push("interval"),25);
    assert.equal(clock.fire(one),true); assert.equal(clock.fire(one),false);
    assert.equal(clock.fire(interval),true); assert.equal(clock.fire(interval),true);
    assert.ok(clock.list().every(t => !Object.hasOwn(t,"fn")));
    sb.clearTimeout(interval);
    const frame=sb.requestAnimationFrame(t => calls.push(t)); assert.deepEqual(clock.ids(16),[frame]);
    clock.advance(16); assert.deepEqual(calls,["one","interval","interval",16]);
    const extra=sb.requestAnimationFrame(() => calls.push("cancelled frame")); sb.cancelAnimationFrame(extra);
    assert.equal(clock.pending(),0);
  });

  await check("reloj protege loops y rechaza avances inválidos/reentrantes",() => {
    const sb=sandbox({maxCallbacks:5}), clock=sb.__clock;
    const loop=() => sb.setTimeout(loop,0); sb.setTimeout(loop,0);
    assert.throws(() => clock.advance(0),/callback limit/); assert.equal(clock.pending(),1);
    clock.dispose(); assert.equal(clock.pending(),0);
    const other=sandbox(), next=other.__clock;
    assert.throws(() => next.advance(-1),/nonnegative/); assert.throws(() => next.advance(Infinity),/nonnegative/);
    assert.throws(() => createClock({mode:"virtual",frameMs:Infinity}),/invalid clock options/);
    other.setTimeout(() => next.advance(0),0); assert.throws(() => next.advance(0),/cannot be nested/);
    assert.equal(next.pending(),0);
    const zero=other.setInterval(() => other.clearInterval(zero),0); assert.equal(next.advance(1),1);
  });

  await check("errores de timers no se enmascaran y quedan pendientes inspeccionables",() => {
    const sb=sandbox(), clock=sb.__clock, failure=new Error("callback failure");
    const id=sb.setTimeout(() => {throw failure;},7); let next=0;
    sb.setTimeout(() => next++,8);
    assert.throws(() => clock.advance(10),err => err===failure);
    assert.equal(clock.now(),7); assert.equal(clock.fire(id),false); assert.equal(clock.pending(),1);
    clock.advance(1); assert.equal(next,1); assert.equal(clock.pending(),0);
  });

  await check("storage conserva string vacío/proto y permite fallos por método",() => {
    const storage=createStorage({initial:{empty:""}});
    assert.equal(storage.getItem("empty"),""); assert.equal(storage.getItem("missing"),null);
    storage.setItem("__proto__","safe"); storage.setItem("n",0);
    assert.equal(storage.getItem("__proto__"),"safe"); assert.equal(storage.getItem("n"),"0");
    assert.equal(storage.length,3); assert.equal(storage.key(3),null);
    const failure=new Error("quota"); storage.fail.setItem=failure;
    assert.throws(() => storage.setItem("n",1),err => err===failure); assert.equal(storage.getItem("n"),"0");
    storage.fail.getItem=k => k==="n"; assert.throws(() => storage.getItem("n"),/getItem blocked/);
    assert.equal(storage.getItem("empty"),""); storage.fail={}; storage.removeItem("n"); storage.clear(); assert.equal(storage.length,0);
  });

  await check("fallo de storage no rompe carga, display ni sesión real del juego",() => {
    const g=game({strictDOM:true,canvas:"stub",storage:{fail:true}});
    assert.equal(g.run("load()"),null); assert.equal(g.run("_brillo"),1); assert.equal(g.run("_fsWants"),false);
    assert.doesNotThrow(() => g.run("afterBoot();save(true);setBrillo(1.2);"));
    assert.equal(g.run("S.player.credits"),500); assert.equal(g.run("_brillo"),1.2);
    assert.deepEqual(Object.keys(g.sb.localStorage._d),[]);
  });

  await check("dispose informa pendientes/listeners, limpia y bloquea callbacks futuros",() => {
    const g=game(), calls=[];
    const id=g.sb.setTimeout(() => calls.push("timeout"),50); g.sb.setInterval(() => calls.push("interval"),60);
    g.sb.document.body.addEventListener("late",() => calls.push("event"));
    const report=g.dispose();
    assert.equal(report.pendingCount,2); assert.ok(report.pending.some(t => t.id===id));
    assert.ok(report.listeners.some(t => t.target==="BODY" && t.count>0));
    assert.equal(g.pending(),0); assert.equal(g.fire(id),false);
    assert.throws(() => g.sb.setTimeout(() => {},0),/disposed/);
    assert.throws(() => g.emitDocument("late"),/disposed/); assert.throws(() => g.run("S"),/disposed/);
    assert.deepEqual(calls,[]); assert.equal(g.dispose().pendingCount,0);
    const sb=sandbox(); sb.setTimeout(() => calls.push("leak"),100);
    assert.throws(() => sb.__dispose({assertNoPending:true}),err => /pending timers/.test(err.message) && err.report.pendingCount===1);
    assert.equal(sb.__clock.pending(),0);
  });

  await check("dispose real cancela handles y un callback nativo retenido no se filtra",async () => {
    const retained=[], cleared=[];
    const backend={setTimeout(fn){const handle={fn};retained.push(handle);return handle;},clearTimeout(handle){cleared.push(handle);}};
    const sb=sandbox({timers:"real",timerBackend:backend}); let calls=0;
    const id=sb.setTimeout(() => calls++,1000); sb.setInterval(() => calls++,1000);
    const report=sb.__dispose(); assert.equal(report.pendingCount,2); assert.equal(cleared.length,2);
    retained.forEach(handle => handle.fn());
    assert.equal(calls,0); assert.equal(sb.__clock.fire(id),false); assert.equal(sb.__clock.pending(),0);
    const real=sandbox({timers:"real"}); real.setTimeout(() => calls++,1); real.__dispose();
    await new Promise(resolve => setTimeout(resolve,5));
    assert.equal(calls,0);
  });

  await check("carga fallida limpia timers reales sin ocultar el error original",() => {
    const handles=[], failure=new Error("setup failed");
    const backend={setTimeout(fn){handles.push(fn);return fn;},clearTimeout(fn){handles.splice(handles.indexOf(fn),1);}};
    assert.throws(() => loadGame({timerBackend:backend,setup(sb){sb.setTimeout(() => {},10);throw failure;}}),err => err===failure);
    assert.deepEqual(handles,[]);
    const cleanupFailure=new Error("clear failed"), retained=[];
    const broken={setTimeout(fn){retained.push(fn);return fn;},clearTimeout(){throw cleanupFailure;}};
    assert.throws(() => loadGame({timerBackend:broken,setup(sb){sb.setTimeout(() => {throw new Error("leaked");},10);throw failure;}}),err => {
      assert.equal(err,failure); assert.equal(err.cleanupError.errors[0],cleanupFailure);
      assert.equal(err.cleanupError.report.pendingCount,1); return true;
    });
    assert.doesNotThrow(() => retained.forEach(fn => fn()));
  });

  await check("audioModel compartido registra nodos/parámetros y reloj coherente",() => {
    const clock=keep(createClock({mode:"virtual"})), audio=audioModel({clock});
    const oscillator=audio.ac.createOscillator(), gain=audio.ac.createGain();
    oscillator.connect(gain); gain.gain.setValueAtTime(0.5,0); oscillator.start(); clock.advance(250);
    assert.equal(audio.ac.currentTime,0.25); assert.deepEqual(oscillator.connections,[gain]);
    assert.equal(gain.gain.value,0.5); assert.equal(oscillator.started,true);
    oscillator.stop(); oscillator.disconnect(); assert.equal(oscillator.stopped,true); assert.equal(oscillator.disconnected,true);
    const buffer=audio.ac.createBuffer(2,4,8); assert.equal(buffer.getChannelData(0).length,4);
    assert.notEqual(buffer.getChannelData(0),buffer.getChannelData(1));
    const sb=sandbox({audio:true}), media=new sb.Audio(); let ended=0;
    media.addEventListener("ended",() => ended++,{once:true});
    media.dispatchEvent(new sb.Event("ended")); media.dispatchEvent(new sb.Event("ended")); assert.equal(ended,1);
    assert.ok(sb.__audio.ac); media.play(); assert.equal(media.paused,false); media.pause(); assert.equal(media.paused,true);
  });

  console.log("Arnés: " + passes + " correctas · " + fails + " fallos");
  return options.summary ? {passes,fails,total:passes+fails} : fails;
}

if(require.main === module){
  run().then(fails => {process.exitCode=fails?1:0;},err => {console.error(err);process.exitCode=1;});
}
module.exports={run};
