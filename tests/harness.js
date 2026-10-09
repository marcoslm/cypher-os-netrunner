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

   loadGame({timers:"virtual", seed:2077, strictDOM:true, canvas:"stub"})
   añade run/advance/ids/fire/list/dispose. El default conserva ids sintéticos;
   strictDOM devuelve null y exige canvasFactory o canvas:"stub" explícito.
   Modelo acotado: no layout, CSS, permisos ni event loop de navegador.
   Usar dispose() en finally; informa pendientes ANTES de limpiarlos.

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

/* Reloj acotado, no event loop completo: advance ejecuta callbacks síncronos;
   las microtareas de Promise siguen siendo las de Node. list nunca expone fn. */
function createClock(options = {}){
  const mode = options.mode || "real";
  if(!["real", "virtual"].includes(mode)) throw new TypeError("timer mode: " + mode);
  const perf = require("node:perf_hooks").performance;
  const origin = perf.now(), epoch = options.now ?? (mode === "virtual" ? 1700000000000 : Date.now());
  const limit = options.maxCallbacks ?? 10000, frameMs = options.frameMs ?? 16;
  if(!Number.isFinite(epoch) || !Number.isSafeInteger(limit) || limit < 1 || !Number.isFinite(frameMs) || frameMs <= 0) throw new TypeError("invalid clock options");
  const backend = options.backend || { setTimeout, clearTimeout };
  const tasks = new Map();
  let time = 0, nextId = 0, disposed = false, depth = 0, callbacks = 0, advancing = false;
  const now = () => mode === "virtual" ? time : perf.now() - origin;
  const list = () => Array.from(tasks.values(), t => ({id:t.id, type:t.type, ms:t.ms, due:t.due, interval:t.type === "interval"})).sort((a,b) => a.due-b.due || a.id-b.id);
  function cancel(id){
    const task = tasks.get(id);
    if(!task) return;
    tasks.delete(id);
    if(mode === "real") backend.clearTimeout(task.handle);
  }
  function arm(task){
    const id=task.id; /* Un callback nativo retenido no conserva fn/args tras dispose. */
    task.handle=backend.setTimeout(() => fire(id),Math.max(0,task.due-now()));
  }
  function schedule(type, fn, ms, args){
    if(disposed) throw new Error("clock disposed");
    if(typeof fn !== "function") throw new TypeError("timer callback must be a function");
    ms = Number(ms);
    if(!Number.isFinite(ms) || ms < 0) ms = 0;
    if(type === "interval") ms = Math.max(1, ms);
    const task = {id:++nextId, type, fn, args, ms, due:now()+ms};
    tasks.set(task.id, task);
    if(mode === "real") arm(task);
    return task.id;
  }
  function fire(id){
    const task = tasks.get(id);
    if(disposed || !task) return false;
    if(!depth && !advancing) callbacks = 0;
    if(++callbacks > limit) throw new RangeError("timer callback limit exceeded (" + limit + ")");
    if(mode === "real") backend.clearTimeout(task.handle);
    if(task.type === "interval"){
      task.due = now()+task.ms;
      if(mode === "real") arm(task);
    } else tasks.delete(id);
    depth++;
    try { task.fn.apply(clock.receiver, task.type === "raf" ? [now()] : task.args); }
    finally { depth--; }
    return true;
  }
  const clock = {
    mode, timeOrigin:epoch, receiver:undefined, now, dateNow:() => Math.floor(epoch+now()),
    get disposed(){ return disposed; },
    setTimeout:(fn,ms,...args) => schedule("timeout",fn,ms,args), clearTimeout:cancel,
    setInterval:(fn,ms,...args) => schedule("interval",fn,ms,args), clearInterval:cancel,
    requestAnimationFrame:fn => schedule("raf",fn,frameMs,[]), cancelAnimationFrame:cancel,
    pending:() => tasks.size, list, ids:ms => list().filter(t => ms === undefined || t.ms === ms).map(t => t.id), fire,
    advance(ms){
      if(mode !== "virtual") throw new Error("advance requires virtual timers");
      if(disposed) throw new Error("clock disposed");
      if(!Number.isFinite(ms) || ms < 0) throw new TypeError("advance requires finite nonnegative milliseconds");
      if(advancing || depth) throw new Error("advance cannot be nested");
      const target = time+ms;
      if(!Number.isFinite(target)) throw new RangeError("clock overflow");
      callbacks = 0; advancing = true;
      try {
        for(let next; (next=list()[0]) && next.due <= target;){ time=next.due; fire(next.id); }
        time=target;
        return callbacks;
      } finally { advancing=false; }
    },
    dispose(){
      const pending = list(), errors = [];
      disposed=true;
      for(const id of tasks.keys()){
        try { cancel(id); } catch(err){ errors.push(err); }
      }
      const report = {pending, pendingCount:pending.length};
      if(errors.length){ const err=new AggregateError(errors,"timer cleanup failed"); err.report=report; throw err; }
      return report;
    }
  };
  return clock;
}

function isolatedMath(seed){
  const math = Object.create(Object.prototype, Object.getOwnPropertyDescriptors(Math));
  if(seed !== undefined){
    let state = typeof seed === "number" ? seed >>> 0 : 2166136261;
    if(typeof seed !== "number") for(const c of String(seed)) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
    math.random = () => {
      let n = state = (state + 0x6D2B79F5) >>> 0;
      n = Math.imul(n ^ n >>> 15, n | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  return math;
}

function clockDate(clock){
  function HarnessDate(...args){
    if(!new.target) return new Date(clock.dateNow()).toString();
    return Reflect.construct(Date, args.length ? args : [clock.dateNow()], new.target);
  }
  HarnessDate.prototype = Object.create(Date.prototype, {constructor:{value:HarnessDate,writable:true,configurable:true}});
  Object.assign(HarnessDate, {now:clock.dateNow, parse:Date.parse, UTC:Date.UTC});
  return HarnessDate;
}

function createStorage(options = {}){
  const data = Object.create(null);
  for(const [key,value] of Object.entries(options.initial || {})) data[key]=String(value);
  function guard(method, ...args){
    let failure=storage.fail === true ? true : storage.fail?.[method];
    if(typeof failure === "function") failure=failure(...args);
    if(failure) throw failure instanceof Error ? failure : new Error("localStorage." + method + " blocked");
  }
  const storage = {
    _d:data, fail:options.fail || {},
    get length(){ guard("length"); return Object.keys(data).length; },
    key(i){ guard("key",i); return Object.keys(data)[i] ?? null; },
    getItem(k){ guard("getItem",k); return Object.hasOwn(data,String(k)) ? data[String(k)] : null; },
    setItem(k,v){ guard("setItem",k,v); data[String(k)]=String(v); },
    removeItem(k){ guard("removeItem",k); delete data[String(k)]; },
    clear(){ guard("clear"); for(const k of Object.keys(data)) delete data[k]; }
  };
  return storage;
}

class HarnessEvent {
  constructor(type, init = {}){
    Object.assign(this, {bubbles:false,cancelable:false,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,repeat:false}, init);
    for(const method of ["preventDefault","stopPropagation","stopImmediatePropagation","composedPath"]) delete this[method];
    this.type=String(type); this.target=null; this.currentTarget=null; this.eventPhase=0;
    this.defaultPrevented=false; this._stopped=false; this._immediate=false; this._passive=false; this._dispatching=false;
  }
  preventDefault(){ if(this.cancelable && !this._passive) this.defaultPrevented=true; }
  stopPropagation(){ this._stopped=true; }
  stopImmediatePropagation(){ this._immediate=true; this._stopped=true; }
  composedPath(){ return (this._path || []).slice(); }
}

/* Captura → target → burbujeo; callback+capture identifica cada listener.
   Los errores se propagan a la prueba, no se ocultan como en un navegador. */
function createEvents(){
  const targets = new Map();
  let disposed=false;
  function attach(target, parent){
    targets.set(target, new Map());
    target.__eventParent=parent;
    target.addEventListener=(type,callback,opts={}) => {
      opts=opts || {};
      if(disposed) throw new Error("events disposed");
      if(!callback) return;
      if(typeof callback !== "function" && typeof callback.handleEvent !== "function") throw new TypeError("invalid event listener");
      const capture=typeof opts === "boolean" ? opts : !!opts.capture;
      const map=targets.get(target), listeners=map.get(String(type)) || [];
      if(!listeners.some(e => e.callback===callback && e.capture===capture)) listeners.push({callback,capture,once:!!opts.once,passive:!!opts.passive});
      map.set(String(type),listeners);
    };
    target.removeEventListener=(type,callback,opts={}) => {
      opts=opts || {};
      const capture=typeof opts === "boolean" ? opts : !!opts.capture, listeners=targets.get(target)?.get(String(type));
      const index=listeners?.findIndex(e => e.callback===callback && e.capture===capture) ?? -1;
      if(index>=0) listeners.splice(index,1);
    };
    target.dispatchEvent=event => dispatch(target,event);
    return target;
  }
  function dispatch(target, event, fallback){
    if(disposed) throw new Error("events disposed");
    if(!(event instanceof HarnessEvent)) event=new HarnessEvent(event.type,event);
    if(event._dispatching) throw new Error("event is already being dispatched");
    const path=[target];
    for(let parent=target.parentNode || target.__eventParent; parent; parent=parent.parentNode || parent.__eventParent){
      if(path.includes(parent)) throw new Error("cyclic event path");
      path.push(parent);
    }
    if(fallback && !path.includes(fallback)){
      for(let parent=fallback; parent; parent=parent.__eventParent) if(!path.includes(parent)) path.push(parent);
    }
    event.target=target; event._path=path; event._stopped=false; event._immediate=false; event._dispatching=true;
    function invoke(node,capture,phase){
      event.currentTarget=node; event.eventPhase=phase;
      const listeners=targets.get(node)?.get(event.type) || [];
      for(const entry of listeners.slice()){
        if(!listeners.includes(entry)) continue;
        if(entry.capture !== capture) continue;
        if(entry.once) listeners.splice(listeners.indexOf(entry),1);
        event._passive=entry.passive;
        if(typeof entry.callback === "function") entry.callback.call(node,event);
        else entry.callback.handleEvent(event);
        event._passive=false;
        if(event._immediate) break;
      }
    }
    try {
      for(let i=path.length-1;i>0 && !event._stopped;i--) invoke(path[i],true,1);
      if(!event._stopped){
        invoke(target,true,2);
        if(!event._immediate) invoke(target,false,2);
      }
      if(event.bubbles) for(let i=1;i<path.length && !event._stopped;i++) invoke(path[i],false,3);
      return !event.defaultPrevented;
    } finally { event.currentTarget=null; event.eventPhase=0; event._dispatching=false; event._passive=false; }
  }
  return {
    attach, dispatch,
    emit(target,type,init={}){ const event=new HarnessEvent(type,{bubbles:true,cancelable:true,...init}); dispatch(init.target || target,event,target); return event; },
    listeners:target => Array.from(targets.get(target) || [], ([type,list]) => ({type,list:list.slice()})),
    dispose(){
      const listeners=Array.from(targets,([target,map]) => ({target:target.id || target.tagName || target.nodeName || "window",count:Array.from(map.values()).reduce((n,a) => n+a.length,0)})).filter(t => t.count);
      disposed=true; targets.clear(); return listeners;
    }
  };
}

/* Canvas explícito y grabable, no proxy que invente APIs. Unknown methods fallan.
   stub: 2D acotado; none: sin contexto; strict: exige options.canvasFactory. */
function canvas2D(canvas){
  const calls=[], stack=[], state={fillStyle:"#000",strokeStyle:"#000",font:"10px sans-serif",globalAlpha:1,lineWidth:1,textAlign:"start",shadowBlur:0,shadowColor:"transparent",lineDashOffset:0};
  const ctx={canvas,calls,...state};
  for(const name of ["clearRect","fillRect","strokeRect","beginPath","closePath","moveTo","lineTo","arc","fill","stroke","fillText","strokeText","setLineDash","translate","rotate","scale","setTransform"]){
    ctx[name]=(...args) => { calls.push({method:name,args}); };
  }
  ctx.measureText=text => ({width:String(text).length*(parseFloat(ctx.font.match(/([\d.]+)px/)?.[1]) || 10)*0.6});
  ctx.save=() => { stack.push(Object.fromEntries(Object.keys(state).map(k => [k,ctx[k]]))); calls.push({method:"save",args:[]}); };
  ctx.restore=() => { Object.assign(ctx,stack.pop() || {}); calls.push({method:"restore",args:[]}); };
  return ctx;
}

const VOID_TAGS = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
const escapeText = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const unescapeText = s => String(s).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_,key) => key[0]==="#" ? String.fromCodePoint(parseInt(key.slice(key[1].toLowerCase()==="x"?2:1),key[1].toLowerCase()==="x"?16:10)) : ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:"\u00a0"}[key.toLowerCase()]));
function splitSelector(selector, separator){
  const parts=[]; let part="", depth=0, quote="";
  for(const c of selector){
    if(quote){ part+=c; if(c===quote) quote=""; continue; }
    if(c==='"' || c==="'"){ quote=c; part+=c; continue; }
    if(c==="[" || c==="(") depth++;
    if(c==="]" || c===")") depth--;
    if(!depth && (separator==="," ? c==="," : /\s/.test(c))){ if(part.trim()) parts.push(part.trim()); part=""; }
    else part+=c;
  }
  if(part.trim()) parts.push(part.trim());
  return parts;
}
function matchesSimple(el, selector){
  if(!el || el.nodeType!==1) return false;
  let rest=selector, matches=true;
  rest=rest.replace(/:not\(([^()]+)\)/g,(_,s) => { if(matchesSimple(el,s)) matches=false; return ""; });
  rest=rest.replace(/:checked/g,() => { if(!el.checked) matches=false; return ""; });
  rest=rest.replace(/\[([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\]/g,(_,key,a,b,c) => {
    const wanted=a ?? b ?? c;
    if(wanted===undefined ? !el.hasAttribute(key) : el.getAttribute(key)!==wanted) matches=false;
    return "";
  });
  rest=rest.replace(/#([\w-]+)/g,(_,id) => { if(el.id!==id) matches=false; return ""; });
  rest=rest.replace(/\.([\w-]+)/g,(_,name) => { if(!el.classList.contains(name)) matches=false; return ""; });
  if(rest && !/^(?:[\w-]+|\*)$/.test(rest)) throw new SyntaxError("unsupported harness selector: " + selector);
  if(rest && rest!=="*" && el.tagName!==rest.toUpperCase()) matches=false;
  return matches;
}
function matchesSelector(el, selector){
  return splitSelector(String(selector),",").some(group => {
    const parts=splitSelector(group," ");
    if(!parts.length || !matchesSimple(el,parts.pop())) return false;
    let ancestor=el.parentNode;
    while(parts.length){
      const part=parts.pop();
      while(ancestor && !matchesSimple(ancestor,part)) ancestor=ancestor.parentNode;
      if(!ancestor) return false;
      ancestor=ancestor.parentNode;
    }
    return true;
  });
}

/* Arboles/atributos de markup simple e inerte; no scripts, layout ni CSS engine. */
function createDOM(events, options = {}){
  const elements=Object.create(null), synthetic=Object.create(null);
  const document=events.attach({nodeType:9,nodeName:"#document",title:"tests",childNodes:[]});
  function invalidate(node){ for(;node;node=node.parentNode) node._html=null; }
  function detach(node){ if(node.parentNode) node.parentNode.removeChild(node); }
  function nodeMethods(node){
    node.parentNode=null; node.ownerDocument=document; node.childNodes=[];
    Object.defineProperties(node,{
      children:{get:() => node.childNodes.filter(n => n.nodeType===1)},
      firstChild:{get:() => node.childNodes[0] || null},
      lastChild:{get:() => node.childNodes.at(-1) || null},
      parentElement:{get:() => node.parentNode?.nodeType===1 ? node.parentNode : null},
      isConnected:{get:() => document.contains(node)}
    });
    node.contains=other => node===other || node.childNodes.some(child => child.contains(other));
    node.insertBefore=(child,before) => {
      if(child===node || child.contains(node)) throw new Error("cyclic DOM tree");
      if(before && !node.childNodes.includes(before)) throw new Error("reference is not a child");
      if(child===before) return child;
      detach(child);
      node.childNodes.splice(before ? node.childNodes.indexOf(before) : node.childNodes.length,0,child);
      child.parentNode=node; invalidate(node); return child;
    };
    node.appendChild=child => node.insertBefore(child,null);
    node.removeChild=child => {
      const index=node.childNodes.indexOf(child);
      if(index<0) throw new Error("node is not a child");
      node.childNodes.splice(index,1); child.parentNode=null;
      if(child.contains(document.activeElement)) document.activeElement=document.body;
      invalidate(node); return child;
    };
    node.remove=() => detach(node);
    node.querySelectorAll=selector => {
      const found=[];
      function visit(n){ for(const child of n.children){ if(matchesSelector(child,selector)) found.push(child); visit(child); } }
      visit(node); return found;
    };
    node.querySelector=selector => node.querySelectorAll(selector)[0] || null;
    return node;
  }
  nodeMethods(document); document.ownerDocument=null;
  function textNode(text){
    return {nodeType:3,parentNode:null,ownerDocument:document,textContent:String(text),contains(other){return this===other;}};
  }
  function serialize(node){
    if(node.nodeType===3) return escapeText(node.textContent);
    const tag=node.tagName.toLowerCase(), attrs=Object.entries(node._attrs).map(([k,v]) => " " + k + '="' + escapeText(v).replace(/"/g,"&quot;") + '"').join("");
    return "<"+tag+attrs+">"+(VOID_TAGS.has(tag)?"":node.innerHTML+"</"+tag+">");
  }
  function createElement(tag){
    const el=nodeMethods(events.attach({nodeType:1,tagName:String(tag).toUpperCase(),nodeName:String(tag).toUpperCase(),style:{},_attrs:Object.create(null),_html:null,value:"",checked:false,clientWidth:0,clientHeight:0,scrollTop:0,src:"",href:"",download:""}));
    Object.defineProperties(el.style,{
      setProperty:{value:function(name,value){this[String(name)]=String(value);}},
      getPropertyValue:{value:function(name){return this[String(name)] || "";}},
      removeProperty:{value:function(name){const old=this[String(name)] || "";delete this[String(name)];return old;}}
    });
    el.setAttribute=(name,value) => {
      name=String(name).toLowerCase(); el._attrs[name]=String(value);
      if(name==="id") elements[String(value)]=el;
      if(name==="value") el.value=String(value);
      if(name==="checked") el.checked=true;
      if(name==="style") for(const decl of String(value).split(";")){
        const i=decl.indexOf(":"); if(i>0) el.style[decl.slice(0,i).trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=decl.slice(i+1).trim();
      }
      invalidate(el.parentNode);
    };
    el.getAttribute=name => el._attrs[String(name).toLowerCase()] ?? null;
    el.hasAttribute=name => Object.hasOwn(el._attrs,String(name).toLowerCase());
    el.removeAttribute=name => { delete el._attrs[String(name).toLowerCase()]; invalidate(el.parentNode); };
    for(const [property,attribute] of [["id","id"],["className","class"],["tabIndex","tabindex"],["type","type"],["name","name"]]){
      Object.defineProperty(el,property,{get:() => property==="tabIndex" ? Number(el.getAttribute(attribute) ?? -1) : el.getAttribute(attribute) || "",set:value => el.setAttribute(attribute,value)});
    }
    for(const key of ["disabled","hidden","inert"]) Object.defineProperty(el,key,{get:() => el.hasAttribute(key),set:value => value ? el.setAttribute(key,"") : el.removeAttribute(key)});
    Object.defineProperty(el,"attributes",{get:() => Object.entries(el._attrs).map(([name,value]) => ({name,value}))});
    const classNames=() => new Set(el.className.split(/\s+/).filter(Boolean));
    function classToken(name){ name=String(name); if(!name || /\s/.test(name)) throw new TypeError("invalid class token"); return name; }
    el.classList={
      add(...names){ const set=classNames(); names.map(classToken).forEach(n => set.add(n)); el.className=Array.from(set).join(" "); },
      remove(...names){ const set=classNames(); names.map(classToken).forEach(n => set.delete(n)); el.className=Array.from(set).join(" "); },
      contains:name => classNames().has(classToken(name)),
      toggle(name,force){ name=classToken(name); const on=force===undefined ? !this.contains(name) : !!force; this[on?"add":"remove"](name); return on; },
      replace(oldName,newName){ oldName=classToken(oldName);newName=classToken(newName);const set=classNames();if(!set.has(oldName)) return false;el.className=Array.from(set,n => n===oldName?newName:n).filter((n,i,a)=>a.indexOf(n)===i).join(" ");return true; },
      get length(){return classNames().size;},item:i => Array.from(classNames())[i] ?? null,
      [Symbol.iterator]:() => classNames().values(),toString:() => el.className
    };
    const dataKey=key => "data-"+String(key).replace(/[A-Z]/g,c => "-"+c.toLowerCase());
    el.dataset=new Proxy({}, {get:(_,key) => typeof key==="string" ? el.getAttribute(dataKey(key)) ?? undefined : undefined,set:(_,key,value) => {el.setAttribute(dataKey(key),value);return true;},deleteProperty:(_,key) => {el.removeAttribute(dataKey(key));return true;},ownKeys:() => Object.keys(el._attrs).filter(k => k.startsWith("data-")).map(k => k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())),getOwnPropertyDescriptor:() => ({enumerable:true,configurable:true})});
    Object.defineProperties(el,{
      innerHTML:{get:() => el._html ?? el.childNodes.map(serialize).join(""),set:html => { for(const child of el.childNodes.slice()) el.removeChild(child); parse(String(html),el); el._html=String(html); }},
      textContent:{get:() => el.childNodes.map(n => n.textContent).join(""),set:text => { for(const child of el.childNodes.slice()) el.removeChild(child); if(String(text)) el.appendChild(textNode(text)); }},
      offsetWidth:{get:() => el.clientWidth}, offsetHeight:{get:() => el.clientHeight}
    });
    el.matches=selector => matchesSelector(el,selector);
    el.closest=selector => { for(let n=el;n?.nodeType===1;n=n.parentNode) if(n.matches(selector)) return n; return null; };
    el.getBoundingClientRect=() => { const r=el.__rect || {left:0,top:0,width:parseFloat(el.style.width) || el.clientWidth,height:parseFloat(el.style.height) || el.clientHeight}; return {...r,x:r.left,y:r.top,right:r.left+r.width,bottom:r.top+r.height}; };
    el.getClientRects=() => el.hidden || el.closest(".hidden") || el.style.display==="none" ? [] : [el.getBoundingClientRect()];
    el.focus=() => {
      if(document.activeElement===el || el.disabled || (!el.isConnected && !el.__synthetic)) return;
      for(let n=el;n?.nodeType===1;n=n.parentNode) if(n.inert || n.hidden || n.classList.contains("hidden") || n.style.display==="none") return;
      const previous=document.activeElement;
      document.activeElement=el;
      if(previous){ events.emit(previous,"blur",{bubbles:false,relatedTarget:el}); events.emit(previous,"focusout",{relatedTarget:el}); }
      events.emit(el,"focus",{bubbles:false,relatedTarget:previous});
      if(document.activeElement===el) events.emit(el,"focusin",{relatedTarget:previous});
    };
    el.blur=() => { if(document.activeElement!==el) return; document.activeElement=document.body; events.emit(el,"blur",{bubbles:false,relatedTarget:document.body}); events.emit(el,"focusout",{relatedTarget:document.body}); };
    el.click=() => { if(!el.disabled) events.emit(el,"click"); };
    el.scrollIntoView=() => { el.__scrolledIntoView=true; };
    el.insertAdjacentText=(where,text) => adjacent(el,where,[textNode(text)]);
    el.insertAdjacentHTML=(where,html) => { const holder=createElement("div"); holder.innerHTML=html; adjacent(el,where,holder.childNodes.slice()); };
    if(el.tagName==="CANVAS"){
      el.width=300; el.height=150;
      el.getContext=type => {
        const mode=options.canvas || "stub";
        if(mode==="none") return null;
        if(options.canvasFactory) return options.canvasFactory(el,type);
        if(mode==="strict" || type!=="2d") throw new Error("unexpected canvas context: " + type);
        return el.__context || (el.__context=canvas2D(el));
      };
    } else el.getContext=() => { throw new Error("getContext on non-canvas " + el.tagName); };
    return el;
  }
  function adjacent(el,where,nodes){
    const parent=where==="beforebegin" || where==="afterend" ? el.parentNode : el;
    if(!parent) throw new Error("adjacent insertion needs a parent");
    let before;
    if(where==="afterbegin") before=el.firstChild;
    else if(where==="beforeend") before=null;
    else if(where==="beforebegin") before=el;
    else if(where==="afterend") before=parent.childNodes[parent.childNodes.indexOf(el)+1] || null;
    else throw new TypeError("invalid insertion position");
    for(const node of nodes) parent.insertBefore(node,before);
  }
  function parse(html,root){
    const stack=[root], tokens=html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]*>|[^<]+/g) || [];
    let skipped=null;
    for(const token of tokens){
      if(skipped){ if(token.match(/^<\/([\w-]+)/)?.[1]?.toLowerCase()===skipped) skipped=null; continue; }
      if(token.startsWith("<!")) continue;
      if(token.startsWith("</")){
        const tag=token.match(/^<\/([\w-]+)/)?.[1]?.toUpperCase();
        const i=stack.findLastIndex(n => n.tagName===tag); if(i>0) stack.length=i;
      } else if(token.startsWith("<")){
        const tag=token.match(/^<([\w-]+)/)?.[1]; if(!tag) continue;
        if(tag.toLowerCase()==="script" || tag.toLowerCase()==="style"){ skipped=tag.toLowerCase(); continue; }
        const el=root===document && tag.toLowerCase()==="html" ? document.documentElement : root===document && tag.toLowerCase()==="body" ? document.body : createElement(tag);
        const attrs=token.slice(tag.length+1).replace(/\/?>$/,"");
        for(const match of attrs.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) el.setAttribute(match[1],unescapeText(match[2] ?? match[3] ?? match[4] ?? ""));
        const parent=stack.at(-1);
        if(el!==parent && el!==document.documentElement && el!==document.body) parent.appendChild(el);
        if(!VOID_TAGS.has(tag.toLowerCase()) && !token.endsWith("/>")) stack.push(el);
      } else stack.at(-1).appendChild(textNode(unescapeText(token)));
    }
  }
  document.createElement=createElement; document.createTextNode=textNode;
  document.documentElement=createElement("html"); document.appendChild(document.documentElement);
  document.body=createElement("body"); document.documentElement.appendChild(document.body); document.activeElement=document.body;
  if(options.html) parse(options.html, /<html\b/i.test(options.html) ? document : document.body);
  document.getElementById=id => {
    id=String(id);
    if(!id) return null;
    const known=elements[id];
    if(known && known.id===id && known.isConnected) return known;
    const found=document.querySelectorAll("*").find(el => el.id===id);
    if(found){ elements[id]=found; return found; }
    if(options.strictDOM) return null;
    if(!synthetic[id]){
      const el=createElement((options.canvasIds || ["gridcanvas"]).includes(id)?"canvas":"div");
      el.id=id; el.__synthetic=true; el.__eventParent=document.body; synthetic[id]=el;
    }
    return synthetic[id];
  };
  return {document,elements,synthetic};
}

function fakeEl(tag = "div"){ return createDOM(createEvents()).document.createElement(tag); }

function audioModel(options = {}){
  const nodes=[];
  const param=() => ({value:0,calls:[],setValueAtTime(value,time){this.value=value;this.calls.push(["setValueAtTime",value,time]);},setTargetAtTime(value,time,constant){this.value=value;this.calls.push(["setTargetAtTime",value,time,constant]);},exponentialRampToValueAtTime(value,time){this.value=value;this.calls.push(["exponentialRampToValueAtTime",value,time]);}});
  function node(source=false){
    const n={source,started:false,stopped:false,disconnected:false,connections:[],gain:param(),frequency:param(),
      connect(target){this.connections.push(target);return target;},disconnect(){this.disconnected=true;this.connections=[];},start(time){this.started=true;this.startTime=time;},stop(time){this.stopped=true;this.stopTime=time;}};
    nodes.push(n); return n;
  }
  const ac={state:"running",get currentTime(){return options.clock ? options.clock.now()/1000 : 0;},sampleRate:options.sampleRate || 8,destination:{},
    resume(){this.state="running";return Promise.resolve();},createOscillator:() => node(true),createBufferSource:() => node(true),createGain:() => node(),createBiquadFilter:() => node(),
    createBuffer(channels,len,rate){ const data=Array.from({length:channels},() => new Float32Array(len)); return {length:len,sampleRate:rate,getChannelData:i => data[i]}; }};
  return {nodes,ac};
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

function createSandbox(options = {}){
  const mode=options.timers===true ? "virtual" : options.timers || "real";
  const clock=createClock({mode,now:options.now,maxCallbacks:options.maxCallbacks,frameMs:options.frameMs,backend:options.timerBackend});
  const events=createEvents(), blobs=[], urls=new Map();
  const canvas=options.canvas || (options.strictDOM ? "strict" : "stub");
  if(!["stub","strict","none"].includes(canvas)) throw new TypeError("canvas mode: " + canvas);
  const dom=createDOM(events,{...options,canvas});
  const sandbox=events.attach({
    console:options.console || console, Math:isolatedMath(options.seed), JSON, Date:clockDate(clock), RegExp, String, Number, Array, Object, Boolean, Error, Symbol,
    isNaN, parseInt, parseFloat, undefined,
    setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout,setInterval:clock.setInterval,clearInterval:clock.clearInterval,
    requestAnimationFrame:clock.requestAnimationFrame,cancelAnimationFrame:clock.cancelAnimationFrame,
    Event:HarnessEvent,KeyboardEvent:HarnessEvent,MouseEvent:HarnessEvent,
    document:dom.document,navigator:{userAgent:"cypher-os-tests"},localStorage:options.localStorage || createStorage(options.storage),
    confirm(){return true;},alert(){},prompt(){return "";},
    getComputedStyle(el){ return {paddingLeft:"0px",paddingRight:"0px",paddingTop:"0px",paddingBottom:"0px",display:el.hidden?"none":"block",...el.style}; },
    innerWidth:1280,innerHeight:720,devicePixelRatio:1,scrollTo(){},
    URL:{createObjectURL(blob){const url="blob:test-"+(urls.size+1);urls.set(url,blob);return url;},revokeObjectURL(url){urls.delete(url);}},
    Blob:function(parts,opts){this.parts=parts || [];this.opts=opts;blobs.push(this);},
    FileReader:function(){this.readAsText=() => {throw new Error("provide a FileReader fixture before importing");};},
    matchMedia(query){ return events.attach({media:query,matches:false,addListener(fn){this.addEventListener("change",fn);},removeListener(fn){this.removeEventListener("change",fn);}}); },
    performance:{now:clock.now,timeOrigin:clock.timeOrigin}
  });
  dom.document.__eventParent=sandbox; clock.receiver=sandbox;
  sandbox.Audio=function(){
    const el=dom.document.createElement("audio");
    Object.assign(el,{currentTime:0,duration:0,volume:1,paused:true,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},canPlayType(){return "";},load(){this.__loaded=true;}});
    return el;
  };
  const audio=options.audio ? options.audio.ac ? options.audio : audioModel({clock}) : null;
  if(audio) sandbox.AudioContext=function(){return audio.ac;};
  sandbox.__blobs=blobs; sandbox.__elements=dom.elements; sandbox.__dom=dom; sandbox.__events=events;
  sandbox.__clock=clock; sandbox.__audio=audio;
  sandbox.__emitElement=(id,type,init={}) => {
    const el=typeof id === "string" ? dom.document.getElementById(id) : id;
    if(!el) throw new Error("missing event target: " + id);
    return events.emit(el,type,init);
  };
  sandbox.__emitDocument=(type,init={}) => events.emit(dom.document,type,{target:dom.document.activeElement || dom.document.body,...init}).defaultPrevented;
  sandbox.__dispose=({assertNoPending=false}={}) => {
    let report;
    try { report=clock.dispose(); }
    catch(err){ report=err.report; throw err; }
    finally { const listeners=events.dispose(); if(report) report.listeners=listeners; }
    if(assertNoPending && report.pendingCount){const err=new Error("pending timers on dispose: " + report.pendingCount);err.report=report;throw err;}
    return report;
  };
  sandbox.window=sandbox; sandbox.self=sandbox; sandbox.globalThis=sandbox;
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

function clickAction(game, action, attrs = {}){
  const button=game.sandbox.document.createElement("button");
  for(const [key,value] of Object.entries({"data-action":action,...attrs})) button.setAttribute(key,value);
  /* Target inyectado para ejercitar guardias del juego, no hit-testing/inert. */
  return game.emitDocument("click",{target:button});
}

function loadGame(options = {}){
  const src=readSources(), sandbox=createSandbox({html:src.html,...options});
  const ctx=vm.createContext(sandbox);
  const run=(code,name="harness-run") => {
    if(sandbox.__clock.disposed) throw new Error("game disposed");
    return vm.runInContext(code,ctx,{filename:name});
  };
  try {
    if(options.setup) options.setup(sandbox,src);
    run(src.help,FILES.help);
    JS_FILES.forEach(f => run(src.jsFiles[f],f));
    run(INJECT,"harness-inject");
  } catch(err){
    try { sandbox.__dispose(); } catch(cleanupError){ err.cleanupError=cleanupError; }
    throw err;
  }
  const clock=sandbox.__clock;
  const game={
    T:sandbox.__T,sandbox,sb:sandbox,src,run,clock,timers:clock,audio:sandbox.__audio,
    emitElement:sandbox.__emitElement,emitDocument:sandbox.__emitDocument,
    saved:() => JSON.parse(sandbox.localStorage.getItem("cypher_os_save_v9")),
    pending:clock.pending,ids:clock.ids,fire:clock.fire,list:clock.list,advance:clock.advance,
    dispose:sandbox.__dispose
  };
  game.clickAction=(action,attrs) => clickAction(game,action,attrs);
  return game;
}

module.exports = {loadGame,game:loadGame,readSources,createSandbox,createClock,createStorage,audioModel,clickAction,fakeEl,HarnessEvent,ROOT,FILES};
